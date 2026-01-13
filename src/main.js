/**
 * OpenSCAD Web Customizer - Main Entry Point
 * @license GPL-3.0-or-later
 */

import './styles/main.css';
import { extractParameters } from './js/parser.js';
import { renderParameterUI } from './js/ui-generator.js';
import { stateManager, getShareableURL } from './js/state.js';
import { downloadSTL, generateFilename, formatFileSize } from './js/download.js';
import { RenderController } from './js/render-controller.js';
import { PreviewManager } from './js/preview.js';
import { AutoPreviewController, PREVIEW_STATE } from './js/auto-preview-controller.js';

// Feature detection
function checkBrowserSupport() {
  const checks = {
    wasm: typeof WebAssembly !== 'undefined',
    worker: typeof Worker !== 'undefined',
    fileApi: typeof FileReader !== 'undefined',
    modules: 'noModule' in HTMLScriptElement.prototype,
  };

  const missing = Object.entries(checks)
    .filter(([_, supported]) => !supported)
    .map(([feature]) => feature);

  return { supported: missing.length === 0, missing };
}

// Show unsupported browser message
function showUnsupportedBrowser(missing) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="unsupported-browser" role="alert" style="padding: 2rem; max-width: 600px; margin: 2rem auto;">
      <h2>Browser Not Supported</h2>
      <p>This application requires a modern browser with WebAssembly support.</p>
      <p>Please use one of the following:</p>
      <ul>
        <li>Chrome 67 or newer</li>
        <li>Firefox 79 or newer</li>
        <li>Safari 15.2 or newer</li>
        <li>Edge 79 or newer</li>
      </ul>
      <p><strong>Missing features:</strong> ${missing.join(', ')}</p>
    </div>
  `;
}

// Global render controller, preview manager, and auto-preview controller
let renderController = null;
let previewManager = null;
let autoPreviewController = null;

// Initialize app
async function initApp() {
  console.log('OpenSCAD Web Customizer v1.2.0 (Auto-Preview)');
  console.log('Initializing...');

  // Check browser support
  const support = checkBrowserSupport();
  if (!support.supported) {
    showUnsupportedBrowser(support.missing);
    return;
  }

  // Initialize render controller
  console.log('Initializing OpenSCAD WASM...');
  renderController = new RenderController();
  
  try {
    await renderController.init();
    console.log('OpenSCAD WASM ready');
  } catch (error) {
    console.error('Failed to initialize OpenSCAD WASM:', error);
    alert('Failed to initialize OpenSCAD engine. Some features may not work. Error: ' + error.message);
  }

  // Get DOM elements
  const welcomeScreen = document.getElementById('welcomeScreen');
  const mainInterface = document.getElementById('mainInterface');
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const loadExampleBtn = document.getElementById('loadExampleBtn');
  const statusArea = document.getElementById('statusArea');
  const primaryActionBtn = document.getElementById('primaryActionBtn');
  const downloadFallbackLink = document.getElementById('downloadFallbackLink');
  const statsArea = document.getElementById('stats');
  const previewContainer = document.getElementById('previewContainer');
  
  // Create preview state indicator element
  const previewStateIndicator = document.createElement('div');
  previewStateIndicator.className = 'preview-state-indicator state-idle';
  previewStateIndicator.textContent = 'No preview';
  previewStateIndicator.setAttribute('aria-live', 'polite');
  
  // Create rendering overlay
  const renderingOverlay = document.createElement('div');
  renderingOverlay.className = 'preview-rendering-overlay';
  renderingOverlay.innerHTML = `
    <div class="spinner spinner-large"></div>
    <span class="rendering-text">Generating preview...</span>
  `;
  
  // Track if parameters have changed since last STL generation
  let parametersChangedSinceGeneration = true; // Start true since no STL exists yet
  let lastGeneratedParamsHash = null;
  
  // Auto-preview enabled by default
  let autoPreviewEnabled = true;
  
  /**
   * Simple hash function for parameter comparison
   */
  function hashParams(params) {
    return JSON.stringify(params);
  }
  
  /**
   * Update preview state UI indicator
   * @param {string} state - PREVIEW_STATE value
   * @param {Object} extra - Extra data (stats, etc.)
   */
  function updatePreviewStateUI(state, extra = {}) {
    // Update indicator badge
    previewStateIndicator.className = `preview-state-indicator state-${state}`;
    
    // Update indicator text
    const stateMessages = {
      [PREVIEW_STATE.IDLE]: 'No preview',
      [PREVIEW_STATE.CURRENT]: extra.cached ? '✓ Preview (cached)' : '✓ Preview ready',
      [PREVIEW_STATE.PENDING]: '⏳ Changes pending...',
      [PREVIEW_STATE.RENDERING]: '⟳ Generating...',
      [PREVIEW_STATE.STALE]: '⚠ Preview outdated',
      [PREVIEW_STATE.ERROR]: '✗ Preview failed',
    };
    previewStateIndicator.textContent = stateMessages[state] || state;
    
    // Update preview container border state
    previewContainer.classList.remove(
      'preview-pending', 'preview-stale', 'preview-rendering', 
      'preview-current', 'preview-error'
    );
    previewContainer.classList.add(`preview-${state}`);
    
    // Show/hide rendering overlay
    if (state === PREVIEW_STATE.RENDERING) {
      renderingOverlay.classList.add('visible');
    } else {
      renderingOverlay.classList.remove('visible');
    }
    
    // Update stats if provided
    if (extra.stats && state === PREVIEW_STATE.CURRENT) {
      const qualityLabel = extra.fullQuality 
        ? '<span class="stats-quality full">Full Quality</span>'
        : '<span class="stats-quality preview">Preview Quality</span>';
      statsArea.innerHTML = `${qualityLabel} Size: ${formatFileSize(extra.stats.size)} | Triangles: ${extra.stats.triangles.toLocaleString()}`;
    }
  }
  
  /**
   * Initialize or reinitialize the AutoPreviewController
   */
  function initAutoPreviewController() {
    if (!renderController || !previewManager) {
      console.warn('[AutoPreview] Cannot init - missing controller or preview manager');
      return;
    }
    
    autoPreviewController = new AutoPreviewController(renderController, previewManager, {
      debounceMs: 1500,
      maxCacheSize: 10,
      enabled: autoPreviewEnabled,
      onStateChange: (newState, prevState, extra) => {
        console.log(`[AutoPreview] State: ${prevState} -> ${newState}`, extra);
        updatePreviewStateUI(newState, extra);
      },
      onPreviewReady: (stl, stats, cached) => {
        console.log('[AutoPreview] Preview ready, cached:', cached);
        // Update button state - preview available but may need full render for download
        updatePrimaryActionButton();
      },
      onProgress: (percent, message, type) => {
        if (type === 'preview') {
          if (percent < 0) {
            updateStatus(`Preview: ${message}`);
          } else {
            updateStatus(`Preview: ${message} (${Math.round(percent)}%)`);
          }
        } else {
          // Full render progress
          if (percent < 0) {
            updateStatus(message);
          } else {
            updateStatus(`${message} (${Math.round(percent)}%)`);
          }
        }
      },
      onError: (error, type) => {
        if (type === 'preview') {
          console.error('[AutoPreview] Preview error:', error);
          updateStatus(`Preview failed: ${error.message}`);
        }
      },
    });
    
    console.log('[AutoPreview] Controller initialized');
  }
  
  /**
   * Update the primary action button based on current state
   * With auto-preview, the button has three states:
   * - "Download STL" when full-quality STL is ready for current params
   * - "Generate & Download" when we have a preview but need full render
   * - "Generate STL" when no preview exists yet
   * Also shows/hides the fallback download link
   */
  function updatePrimaryActionButton() {
    const state = stateManager.getState();
    const hasLegacySTL = !!state.stl;
    const currentParamsHash = hashParams(state.parameters);
    const paramsChanged = currentParamsHash !== lastGeneratedParamsHash;
    
    // Check auto-preview controller state
    const hasFullQualitySTL = autoPreviewController?.getCurrentFullSTL(state.parameters);
    const needsFullRender = !hasFullQualitySTL || autoPreviewController?.needsFullRender(state.parameters);
    const autoPreviewState = autoPreviewController?.getStateInfo();

    if (hasFullQualitySTL && !needsFullRender) {
      // Full quality STL is ready and matches current parameters - show Download
      primaryActionBtn.textContent = '📥 Download STL';
      primaryActionBtn.dataset.action = 'download';
      primaryActionBtn.classList.remove('btn-primary');
      primaryActionBtn.classList.add('btn-success');
      primaryActionBtn.setAttribute('aria-label', 'Download generated STL file (full quality)');
      // Hide fallback since primary button is download
      downloadFallbackLink.classList.add('hidden');
    } else {
      // Need to generate (no full STL yet, or params changed)
      primaryActionBtn.textContent = 'Generate STL';
      primaryActionBtn.dataset.action = 'generate';
      primaryActionBtn.classList.remove('btn-success');
      primaryActionBtn.classList.add('btn-primary');
      primaryActionBtn.setAttribute('aria-label', 'Generate STL file from current parameters');
      
      // Show fallback download link if STL exists but params changed
      if (hasLegacySTL && paramsChanged) {
        downloadFallbackLink.classList.remove('hidden');
      } else {
        downloadFallbackLink.classList.add('hidden');
      }
    }
  }

  // Check for saved draft
  const draft = stateManager.loadFromLocalStorage();
  if (draft) {
    const shouldRestore = confirm(
      `Found a saved draft of "${draft.fileName}" from ${new Date(draft.timestamp).toLocaleString()}.\n\nWould you like to restore it?`
    );
    
    if (shouldRestore) {
      console.log('Restoring draft...');
      // Treat draft as uploaded file
      handleFile({ name: draft.fileName }, draft.fileContent);
      updateStatus('Draft restored');
    } else {
      stateManager.clearLocalStorage();
    }
  }

  // Update status
  function updateStatus(message) {
    statusArea.textContent = message;
  }

  // Handle file upload
  function handleFile(file, content = null) {
    if (!file && !content) return;

    let fileName = file ? file.name : 'example.scad';
    let fileContent = content;

    if (file) {
      if (!file.name.endsWith('.scad')) {
        alert('Please upload a .scad file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit');
        return;
      }
    }

    if (file && !content) {
      const reader = new FileReader();
      reader.onload = (e) => {
        handleFile(null, e.target.result);
      };
      reader.readAsText(file);
      return;
    }

    console.log('File loaded:', fileName, fileContent.length, 'bytes');

    // Extract parameters
    updateStatus('Extracting parameters...');
    try {
      const extracted = extractParameters(fileContent);
      console.log('Extracted parameters:', extracted);

      const paramCount = Object.keys(extracted.parameters).length;
      console.log(`Found ${paramCount} parameters in ${extracted.groups.length} groups`);

      // Store in state
      stateManager.setState({
        uploadedFile: { name: fileName, content: fileContent },
        schema: extracted,
        parameters: {},
        defaults: {},
      });

      // Show main interface
      welcomeScreen.classList.add('hidden');
      mainInterface.classList.remove('hidden');

      // Update file info
      document.getElementById('fileInfo').textContent = `${fileName} (${paramCount} parameters)`;

      // Render parameter UI
      const parametersContainer = document.getElementById('parametersContainer');
      const currentValues = renderParameterUI(
        extracted,
        parametersContainer,
        (values) => {
          stateManager.setState({ parameters: values });
          // Trigger auto-preview on parameter change
          if (autoPreviewController) {
            autoPreviewController.onParameterChange(values);
          }
          // Update button state when parameters change
          updatePrimaryActionButton();
        }
      );

      // Store default values
      stateManager.setState({
        parameters: currentValues,
        defaults: { ...currentValues },
      });

      // Load URL parameters if present (after defaults are set)
      const urlParams = stateManager.loadFromURL();
      if (urlParams && Object.keys(urlParams).length > 0) {
        console.log('Loaded parameters from URL:', urlParams);
        
        // Re-render UI with URL parameters - MUST include updatePrimaryActionButton in callback!
        const updatedValues = renderParameterUI(
          extracted,
          parametersContainer,
          (values) => {
            stateManager.setState({ parameters: values });
            // Trigger auto-preview on parameter change
            if (autoPreviewController) {
              autoPreviewController.onParameterChange(values);
            }
            // Update button state when parameters change
            updatePrimaryActionButton();
          }
        );
        
        // Trigger initial auto-preview with URL params
        if (autoPreviewController) {
          autoPreviewController.onParameterChange(stateManager.getState().parameters);
        }
        
        updateStatus(`Ready - ${paramCount} parameters loaded (${Object.keys(urlParams).length} from URL)`);
      } else {
        updateStatus(`Ready - ${paramCount} parameters loaded`);
      }
      
      // Initialize 3D preview
      if (!previewManager) {
        previewManager = new PreviewManager(previewContainer);
        previewManager.init();
        
        // Add preview state indicator and rendering overlay to container
        previewContainer.style.position = 'relative';
        previewContainer.appendChild(previewStateIndicator);
        previewContainer.appendChild(renderingOverlay);
      }
      
      // Initialize or update AutoPreviewController
      if (!autoPreviewController) {
        initAutoPreviewController();
      }
      
      // Set the SCAD content for auto-preview
      if (autoPreviewController) {
        autoPreviewController.setScadContent(fileContent);
        updatePreviewStateUI(PREVIEW_STATE.IDLE);
      }
    } catch (error) {
      console.error('Failed to extract parameters:', error);
      updateStatus('Error: Failed to extract parameters');
      alert('Failed to extract parameters from file. Please check the file format.');
    }
  }

  // File input change
  fileInput.addEventListener('change', (e) => {
    handleFile(e.target.files[0]);
  });

  // Drag and drop
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('drag-over');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    handleFile(e.dataTransfer.files[0]);
  });

  // Click to upload
  uploadZone.addEventListener('click', () => {
    fileInput.click();
  });
  
  // Keyboard support for upload zone
  uploadZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  // Load examples - unified handler
  const exampleButtons = document.querySelectorAll('[data-example]');
  exampleButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const exampleType = button.dataset.example;
      
      const examples = {
        'universal-cuff': {
          path: '/examples/universal-cuff/universal_cuff_utensil_holder.scad',
          name: 'universal_cuff_utensil_holder.scad'
        },
        'simple-box': {
          path: '/examples/simple-box/simple_box.scad',
          name: 'simple_box.scad'
        },
        'cylinder': {
          path: '/examples/parametric-cylinder/parametric_cylinder.scad',
          name: 'parametric_cylinder.scad'
        }
      };
      
      const example = examples[exampleType];
      if (!example) {
        console.error('Unknown example type:', exampleType);
        return;
      }
      
      try {
        updateStatus('Loading example...');
        const response = await fetch(example.path);
        if (!response.ok) throw new Error('Failed to fetch example');
        
        const content = await response.text();
        console.log('Example loaded:', example.name, content.length, 'bytes');
        
        // Treat as uploaded file
        handleFile({ name: example.name }, content);
      } catch (error) {
        console.error('Failed to load example:', error);
        updateStatus('Error loading example');
        alert('Failed to load example file. The file may not be available in the public directory.');
      }
    });
  });

  // Reset button
  const resetBtn = document.getElementById('resetBtn');
  resetBtn.addEventListener('click', () => {
    const state = stateManager.getState();
    if (state.defaults) {
      stateManager.setState({ parameters: { ...state.defaults } });
      
      // Re-render UI with defaults
      const parametersContainer = document.getElementById('parametersContainer');
      renderParameterUI(
        state.schema,
        parametersContainer,
        (values) => {
          stateManager.setState({ parameters: values });
          // Trigger auto-preview on parameter change
          if (autoPreviewController && state.uploadedFile) {
            autoPreviewController.onParameterChange(values);
          }
          updatePrimaryActionButton();
        }
      );
      
      // Trigger auto-preview with reset params
      if (autoPreviewController && state.uploadedFile) {
        autoPreviewController.onParameterChange(state.defaults);
      }
      
      updateStatus('Parameters reset to defaults');
      // Update button state after reset
      updatePrimaryActionButton();
    }
  });

  // Primary Action Button (transforms between Generate and Download)
  primaryActionBtn.addEventListener('click', async () => {
    const action = primaryActionBtn.dataset.action;
    const state = stateManager.getState();

    if (action === 'download') {
      // Download action - get full quality STL from auto-preview controller
      const fullSTL = autoPreviewController?.getCurrentFullSTL(state.parameters);
      
      if (fullSTL) {
        // Use cached full quality STL
        const filename = generateFilename(
          state.uploadedFile.name,
          state.parameters
        );
        downloadSTL(fullSTL.stl, filename);
        updateStatus(`Downloaded: ${filename}`);
        return;
      }
      
      // Fallback to legacy state.stl
      if (!state.stl) {
        alert('No STL generated yet');
        return;
      }

      const filename = generateFilename(
        state.uploadedFile.name,
        state.parameters
      );

      downloadSTL(state.stl, filename);
      updateStatus(`Downloaded: ${filename}`);
      return;
    }
    
    // Generate action - perform full quality render for download
    if (!state.uploadedFile) {
      alert('No file uploaded');
      return;
    }

    if (!renderController) {
      alert('OpenSCAD engine not initialized');
      return;
    }

    try {
      primaryActionBtn.disabled = true;
      primaryActionBtn.textContent = '⏳ Generating...';
      
      // Cancel any pending preview renders
      if (autoPreviewController) {
        autoPreviewController.cancelPending();
      }

      const startTime = Date.now();
      
      let result;
      
      // Use auto-preview controller for full render if available
      if (autoPreviewController) {
        result = await autoPreviewController.renderFull(state.parameters);
        
        if (result.cached) {
          console.log('[Download] Using cached full quality render');
        }
      } else {
        // Fallback to direct render
        result = await renderController.renderFull(
          state.uploadedFile.content,
          state.parameters,
          {
            onProgress: (percent, message) => {
              if (percent < 0) {
                updateStatus(message);
              } else {
                updateStatus(`${message} (${Math.round(percent)}%)`);
              }
            },
          }
        );
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      // Store the hash of parameters used for this generation
      lastGeneratedParamsHash = hashParams(state.parameters);

      stateManager.setState({
        stl: result.stl,
        stlStats: result.stats,
        lastRenderTime: duration,
      });

      updateStatus(`Full quality STL generated in ${duration}s`);
      statsArea.innerHTML = `<span class="stats-quality full">Full Quality</span> Size: ${formatFileSize(result.stats.size)} | Triangles: ${result.stats.triangles.toLocaleString()} | Time: ${duration}s`;

      console.log('Full render complete:', result.stats);

      // Do NOT auto-download. User must explicitly click Download.
      updateStatus(`STL generated successfully in ${duration}s (click Download STL to save)`);
      
      // Update preview state to show full quality
      updatePreviewStateUI(PREVIEW_STATE.CURRENT, { 
        stats: result.stats, 
        fullQuality: true 
      });
      
    } catch (error) {
      console.error('Generation failed:', error);
      updateStatus('Error: ' + error.message);
      
      // Show user-friendly error message
      let userMessage = 'Failed to generate STL:\n\n';
      if (error.message.includes('timeout')) {
        userMessage += 'The model is taking too long to render.\n\nTry:\n';
        userMessage += '• Simplifying the model\n';
        userMessage += '• Reducing $fn value\n';
        userMessage += '• Decreasing parameter values';
      } else if (error.message.includes('syntax')) {
        userMessage += 'OpenSCAD syntax error in the model.\n\n';
        userMessage += 'Check the .scad file for errors.';
      } else {
        userMessage += error.message;
      }
      
      alert(userMessage);
    } finally {
      primaryActionBtn.disabled = false;
      // Always restore button to correct state based on current conditions
      updatePrimaryActionButton();
    }
  });

  // Fallback download link (for when parameters changed but old STL still exists)
  downloadFallbackLink.addEventListener('click', (e) => {
    e.preventDefault();
    const state = stateManager.getState();

    if (!state.stl) {
      return;
    }

    const filename = generateFilename(
      state.uploadedFile.name,
      state.parameters
    );

    downloadSTL(state.stl, filename);
    updateStatus(`Downloaded (previous STL): ${filename}`);
  });

  // Copy Share Link button
  const shareBtn = document.getElementById('shareBtn');
  shareBtn.addEventListener('click', async () => {
    const state = stateManager.getState();
    
    if (!state.uploadedFile) {
      alert('No file uploaded yet');
      return;
    }

    // Get only non-default parameters for sharing
    const nonDefaultParams = {};
    for (const [key, value] of Object.entries(state.parameters)) {
      if (state.defaults[key] !== value) {
        nonDefaultParams[key] = value;
      }
    }

    const shareUrl = getShareableURL(nonDefaultParams);
    
    try {
      // Try modern clipboard API
      await navigator.clipboard.writeText(shareUrl);
      updateStatus('Share link copied to clipboard!');
      
      // Visual feedback
      shareBtn.textContent = '✅ Copied!';
      setTimeout(() => {
        shareBtn.textContent = '📋 Copy Share Link';
      }, 2000);
    } catch (error) {
      // Fallback for older browsers
      console.error('Failed to copy to clipboard:', error);
      
      // Show URL in a prompt as fallback
      prompt('Copy this link to share:', shareUrl);
      updateStatus('Share link ready');
    }
  });

  // Export Parameters as JSON button
  const exportParamsBtn = document.getElementById('exportParamsBtn');
  exportParamsBtn.addEventListener('click', () => {
    const state = stateManager.getState();
    
    if (!state.uploadedFile) {
      alert('No file uploaded yet');
      return;
    }

    // Create JSON snapshot
    const snapshot = {
      version: '1.0.0',
      model: state.uploadedFile.name,
      timestamp: new Date().toISOString(),
      parameters: state.parameters,
    };

    const json = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.uploadedFile.name.replace('.scad', '')}-params.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    updateStatus(`Parameters exported to JSON`);
  });

  // Global keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    const state = stateManager.getState();
    
    // Ctrl/Cmd + Enter: Trigger primary action (generate or download)
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (state.uploadedFile && !primaryActionBtn.disabled) {
        e.preventDefault();
        primaryActionBtn.click();
      }
    }
    
    // R key: Reset parameters (when not in input field)
    if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
      const target = e.target;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && target.tagName !== 'SELECT') {
        if (state.uploadedFile) {
          e.preventDefault();
          resetBtn.click();
        }
      }
    }
    
    // D key: Download STL (when button is in download mode)
    if (e.key === 'd' && !e.ctrlKey && !e.metaKey) {
      const target = e.target;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && target.tagName !== 'SELECT') {
        if (state.stl && primaryActionBtn.dataset.action === 'download') {
          e.preventDefault();
          primaryActionBtn.click();
        }
      }
    }
    
    // G key: Generate STL (when button is in generate mode)
    if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
      const target = e.target;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && target.tagName !== 'SELECT') {
        if (state.uploadedFile && primaryActionBtn.dataset.action === 'generate' && !primaryActionBtn.disabled) {
          e.preventDefault();
          primaryActionBtn.click();
        }
      }
    }
  });

  updateStatus('Ready - Upload a file to begin');
}

// Start the app
initApp();
