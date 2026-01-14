/**
 * OpenSCAD Web Customizer - Main Entry Point
 * @license GPL-3.0-or-later
 */

import './styles/main.css';
import { extractParameters } from './js/parser.js';
import { renderParameterUI } from './js/ui-generator.js';
import { stateManager, getShareableURL } from './js/state.js';
import { downloadSTL, downloadFile, generateFilename, formatFileSize, OUTPUT_FORMATS } from './js/download.js';
import { RenderController, RENDER_QUALITY } from './js/render-controller.js';
import { PreviewManager } from './js/preview.js';
import { AutoPreviewController, PREVIEW_STATE } from './js/auto-preview-controller.js';
import { extractZipFiles, validateZipFile, createFileTree, getZipStats } from './js/zip-handler.js';
import { themeManager, initThemeToggle } from './js/theme-manager.js';
import { presetManager } from './js/preset-manager.js';

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
  console.log('OpenSCAD Web Customizer v1.7.0 (Parameter Presets)');
  console.log('Initializing...');

  // Initialize theme (before any UI rendering)
  themeManager.init();
  
  // Initialize theme toggle button
  initThemeToggle('themeToggle', (theme, activeTheme, message) => {
    console.log(`[App] ${message}`);
    // Optional: Show brief toast notification
    updateStatus(message);
    setTimeout(() => {
      const state = stateManager.getState();
      if (state.uploadedFile) {
        updateStatus('Ready');
      }
    }, 2000);
  });

  // Initialize high contrast toggle button
  const contrastBtn = document.getElementById('contrastToggle');
  if (contrastBtn) {
    contrastBtn.addEventListener('click', () => {
      const enabled = themeManager.toggleHighContrast();
      const message = enabled ? 'High Contrast: ON' : 'High Contrast: OFF';
      console.log(`[App] ${message}`);
      updateStatus(message);
      
      // Update ARIA label
      contrastBtn.setAttribute('aria-label', `High contrast mode: ${enabled ? 'ON' : 'OFF'}. Click to ${enabled ? 'disable' : 'enable'}.`);
      
      setTimeout(() => {
        const state = stateManager.getState();
        if (state.uploadedFile) {
          updateStatus('Ready');
        }
      }, 2000);
    });
    
    // Set initial ARIA label
    const initialState = themeManager.highContrast;
    contrastBtn.setAttribute('aria-label', `High contrast mode: ${initialState ? 'ON' : 'OFF'}. Click to ${initialState ? 'disable' : 'enable'}.`);
  }

  // Declare format selector elements
  const outputFormatSelect = document.getElementById('outputFormat');
  const formatInfo = document.getElementById('formatInfo');

  // Initialize output format selector
  if (outputFormatSelect && formatInfo) {
    outputFormatSelect.addEventListener('change', () => {
      const format = outputFormatSelect.value;
      const formatDef = OUTPUT_FORMATS[format];
      
      if (formatDef) {
        formatInfo.textContent = formatDef.description;
        
        // Update button text
        const formatName = formatDef.name;
        if (primaryActionBtn.dataset.action === 'generate') {
          primaryActionBtn.textContent = `Generate ${formatName}`;
          primaryActionBtn.setAttribute('aria-label', `Generate ${formatName} file from current parameters`);
        } else {
          primaryActionBtn.textContent = `📥 Download ${formatName}`;
          primaryActionBtn.setAttribute('aria-label', `Download generated ${formatName} file`);
        }
      }
    });
    
    // Set initial format info
    const initialFormat = outputFormatSelect.value;
    formatInfo.textContent = OUTPUT_FORMATS[initialFormat]?.description || '';
  }

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
  const autoPreviewToggle = document.getElementById('autoPreviewToggle');
  const previewQualitySelect = document.getElementById('previewQualitySelect');
  // Note: outputFormatSelect and formatInfo already declared above
  
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
  let previewQuality = RENDER_QUALITY.PREVIEW;

  const getSelectedPreviewQuality = () => {
    const value = previewQualitySelect?.value || 'balanced';
    switch (value) {
      case 'fast':
        return RENDER_QUALITY.DRAFT;
      case 'fidelity':
        // Prefer model defaults (no forced tessellation).
        return null;
      case 'balanced':
      default:
        return RENDER_QUALITY.PREVIEW;
    }
  };

  // Wire preview settings UI
  if (autoPreviewToggle) {
    autoPreviewToggle.checked = autoPreviewEnabled;
    autoPreviewToggle.addEventListener('change', () => {
      autoPreviewEnabled = autoPreviewToggle.checked;
      if (autoPreviewController) {
        autoPreviewController.setEnabled(autoPreviewEnabled);
      }
    });
  }

  if (previewQualitySelect) {
    previewQuality = getSelectedPreviewQuality();
    previewQualitySelect.addEventListener('change', () => {
      previewQuality = getSelectedPreviewQuality();
      if (autoPreviewController) {
        autoPreviewController.setPreviewQuality(previewQuality);
        const state = stateManager.getState();
        if (state?.uploadedFile) {
          autoPreviewController.onParameterChange(state.parameters);
        }
      }
    });
  }
  
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
      // Lower debounce to reduce perceived "delay" after slider changes.
      // Scheduling logic in AutoPreviewController avoids overlapping renders.
      debounceMs: 350,
      maxCacheSize: 10,
      enabled: autoPreviewEnabled,
      previewQuality,
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

  // Handle file upload (supports both .scad and .zip files)
  async function handleFile(file, content = null, extractedFiles = null) {
    if (!file && !content) return;

    let fileName = file ? file.name : 'example.scad';
    let fileContent = content;
    let projectFiles = extractedFiles; // Map of additional files for multi-file projects
    let mainFilePath = null; // Path to main file in multi-file project

    if (file) {
      const isZip = file.name.toLowerCase().endsWith('.zip');
      const isScad = file.name.toLowerCase().endsWith('.scad');
      
      if (!isZip && !isScad) {
        alert('Please upload a .scad or .zip file');
        return;
      }

      // Handle ZIP files
      if (isZip) {
        const validation = validateZipFile(file);
        if (!validation.valid) {
          alert(validation.error);
          return;
        }
        
        try {
          updateStatus('Extracting ZIP file...');
          const { files, mainFile } = await extractZipFiles(file);
          
          // Get statistics
          const stats = getZipStats(files);
          console.log('[ZIP] Statistics:', stats);
          
          // Show file tree
          const fileTreeHtml = createFileTree(files, mainFile);
          const infoArea = document.getElementById('fileInfo');
          if (infoArea) {
            infoArea.innerHTML = `${file.name} → ${mainFile}<br>${fileTreeHtml}`;
          }
          
          // Get main file content
          fileContent = files.get(mainFile);
          fileName = mainFile;
          mainFilePath = mainFile;
          
          // Store all files except the main one (main is passed as scadContent)
          projectFiles = new Map(files);
          // Note: We keep the main file in projectFiles for include/use resolution
          
          console.log(`[ZIP] Loaded multi-file project: ${mainFile} (${stats.totalFiles} files)`);
          
          // Continue with extracted content
          handleFile(null, fileContent, projectFiles);
          return;
        } catch (error) {
          console.error('[ZIP] Extraction failed:', error);
          updateStatus('Failed to extract ZIP file');
          alert(error.message);
          return;
        }
      }

      // Handle single .scad files (existing logic)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit');
        return;
      }
    }

    if (file && !content) {
      const reader = new FileReader();
      reader.onload = (e) => {
        handleFile(null, e.target.result, extractedFiles);
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

      // Store in state (including project files for multi-file support)
      stateManager.setState({
        uploadedFile: { name: fileName, content: fileContent },
        projectFiles: projectFiles || null, // Map of additional files (null for single-file projects)
        mainFilePath: mainFilePath || fileName, // Track main file path
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
          // Clear preset selection when parameters are manually changed
          clearPresetSelection();
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
            // Clear preset selection when parameters are manually changed
            clearPresetSelection();
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
        
        // Listen for theme changes and update preview
        themeManager.addListener((theme, activeTheme, highContrast) => {
          if (previewManager) {
            previewManager.updateTheme(activeTheme, highContrast);
          }
        });
        
        // Add preview state indicator and rendering overlay to container
        previewContainer.style.position = 'relative';
        previewContainer.appendChild(previewStateIndicator);
        previewContainer.appendChild(renderingOverlay);
      }
      
      // Initialize or update AutoPreviewController
      if (!autoPreviewController) {
        initAutoPreviewController();
      }
      
      // Set the SCAD content and project files for auto-preview
      if (autoPreviewController) {
        autoPreviewController.setScadContent(fileContent);
        autoPreviewController.setProjectFiles(projectFiles, mainFilePath);
        updatePreviewStateUI(PREVIEW_STATE.IDLE);
        
        // Trigger initial preview immediately on first load (and also for URL-param loads).
        // This makes the app feel responsive without requiring a first parameter change.
        if (autoPreviewEnabled) {
          // Use .then()/.catch() to handle errors without blocking file load completion
          autoPreviewController.forcePreview(stateManager.getState().parameters)
            .then((initiated) => {
              if (initiated) {
                console.log('[Init] Initial preview render started');
              } else {
                console.warn('[Init] Initial preview render was skipped');
              }
            })
            .catch((error) => {
              console.error('[Init] Initial preview render failed:', error);
              updatePreviewStateUI(PREVIEW_STATE.ERROR, { error: error.message });
              updateStatus(`Initial preview failed: ${error.message}`);
            });
        }
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
      
      // Clear preset selection when resetting to defaults
      clearPresetSelection();
      
      // Re-render UI with defaults
      const parametersContainer = document.getElementById('parametersContainer');
      renderParameterUI(
        state.schema,
        parametersContainer,
        (values) => {
          stateManager.setState({ parameters: values });
          // Clear preset selection when parameters are manually changed
          clearPresetSelection();
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
      // Get selected output format
      const outputFormat = outputFormatSelect?.value || state.outputFormat || 'stl';
      
      // Download action - get full quality file from auto-preview controller
      const fullSTL = autoPreviewController?.getCurrentFullSTL(state.parameters);
      
      if (fullSTL && outputFormat === 'stl') {
        // Use cached full quality STL
        const filename = generateFilename(
          state.uploadedFile.name,
          state.parameters,
          outputFormat
        );
        downloadFile(fullSTL.stl, filename, outputFormat);
        updateStatus(`Downloaded: ${filename}`);
        return;
      }
      
      // Fallback to state.stl
      if (!state.stl) {
        alert('No file generated yet');
        return;
      }

      const filename = generateFilename(
        state.uploadedFile.name,
        state.parameters,
        outputFormat
      );

      downloadFile(state.stl, filename, outputFormat);
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
      // Get selected output format
      const outputFormat = outputFormatSelect?.value || 'stl';
      const formatName = OUTPUT_FORMATS[outputFormat]?.name || outputFormat.toUpperCase();
      
      primaryActionBtn.disabled = true;
      primaryActionBtn.textContent = `⏳ Generating ${formatName}...`;
      
      // Cancel any pending preview renders
      if (autoPreviewController) {
        autoPreviewController.cancelPending();
      }

      const startTime = Date.now();
      
      let result;
      
      // Use auto-preview controller for full render if available (STL only for now)
      if (autoPreviewController && outputFormat === 'stl') {
        result = await autoPreviewController.renderFull(state.parameters);
        
        if (result.cached) {
          console.log('[Download] Using cached full quality render');
        }
      } else {
        // Direct render with specified format
        result = await renderController.renderFull(
          state.uploadedFile.content,
          state.parameters,
          {
            outputFormat,
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
        stl: result.data || result.stl,
        outputFormat: result.format || outputFormat,
        stlStats: result.stats,
        lastRenderTime: duration,
      });

      updateStatus(`Full quality ${formatName} generated in ${duration}s`);
      
      const triangleInfo = result.stats.triangles > 0 
        ? ` | Triangles: ${result.stats.triangles.toLocaleString()}` 
        : '';
      statsArea.innerHTML = `<span class="stats-quality full">Full Quality ${formatName}</span> Size: ${formatFileSize(result.stats.size)}${triangleInfo} | Time: ${duration}s`;

      console.log('Full render complete:', result.stats);

      // Do NOT auto-download. User must explicitly click Download.
      updateStatus(`${formatName} generated successfully in ${duration}s (click Download to save)`);
      
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

  // ========== PRESET SYSTEM ==========
  
  // Clear preset selection when parameters are manually changed
  // Track if we're currently loading a preset (to avoid clearing during load)
  let isLoadingPreset = false;
  
  function clearPresetSelection() {
    // Don't clear if we're in the middle of loading a preset
    if (isLoadingPreset) {
      return;
    }
    
    const state = stateManager.getState();
    if (state.currentPresetId) {
      stateManager.setState({ currentPresetId: null, currentPresetName: null });
      const presetSelect = document.getElementById('presetSelect');
      if (presetSelect) {
        presetSelect.value = '';
      }
    }
  }
  
  // Update preset dropdown based on current model
  function updatePresetDropdown() {
    const state = stateManager.getState();
    const presetSelect = document.getElementById('presetSelect');
    
    if (!state.uploadedFile) {
      presetSelect.disabled = true;
      presetSelect.innerHTML = '<option value="">-- No model loaded --</option>';
      return;
    }
    
    const modelName = state.uploadedFile.name;
    const presets = presetManager.getPresetsForModel(modelName);
    
    // Clear and rebuild dropdown
    presetSelect.innerHTML = '<option value="">-- Select Preset --</option>';
    
    if (presets.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = '-- No presets saved --';
      option.disabled = true;
      presetSelect.appendChild(option);
    } else {
      presets.forEach((preset) => {
        const option = document.createElement('option');
        option.value = preset.id;
        option.textContent = preset.name;
        presetSelect.appendChild(option);
      });
    }
    
    presetSelect.disabled = false;
  }
  
  // Show save preset modal
  function showSavePresetModal() {
    const state = stateManager.getState();
    
    if (!state.uploadedFile) {
      alert('No model loaded');
      return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'preset-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'savePresetTitle');
    modal.setAttribute('aria-modal', 'true');
    
    modal.innerHTML = `
      <div class="preset-modal-content">
        <div class="preset-modal-header">
          <h3 id="savePresetTitle" class="preset-modal-title">Save Preset</h3>
          <button class="preset-modal-close" aria-label="Close dialog" data-action="close">&times;</button>
        </div>
        <form class="preset-form" id="savePresetForm">
          <div class="preset-form-group">
            <label for="presetName" class="preset-form-label">Preset Name *</label>
            <input 
              type="text" 
              id="presetName" 
              class="preset-form-input" 
              placeholder="e.g., Large Handle"
              required
              autofocus
            />
            <span class="preset-form-hint">Give this preset a descriptive name</span>
          </div>
          <div class="preset-form-group">
            <label for="presetDescription" class="preset-form-label">Description (Optional)</label>
            <textarea 
              id="presetDescription" 
              class="preset-form-textarea" 
              placeholder="Optional description of this configuration..."
            ></textarea>
          </div>
          <div class="preset-form-actions">
            <button type="button" class="btn btn-secondary" data-action="close">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Preset</button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Focus first input
    setTimeout(() => {
      modal.querySelector('#presetName').focus();
    }, 100);
    
    // Handle form submission
    const form = modal.querySelector('#savePresetForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const name = modal.querySelector('#presetName').value.trim();
      const description = modal.querySelector('#presetDescription').value.trim();
      
      if (!name) {
        alert('Please enter a preset name');
        return;
      }
      
      try {
        presetManager.savePreset(
          state.uploadedFile.name,
          name,
          state.parameters,
          { description }
        );
        
        updateStatus(`Preset "${name}" saved`);
        updatePresetDropdown();
        document.body.removeChild(modal);
      } catch (error) {
        alert(`Failed to save preset: ${error.message}`);
      }
    });
    
    // Handle close buttons
    modal.querySelectorAll('[data-action="close"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    });
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
    
    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }
  
  // Show manage presets modal
  function showManagePresetsModal() {
    const state = stateManager.getState();
    
    if (!state.uploadedFile) {
      alert('No model loaded');
      return;
    }
    
    const modelName = state.uploadedFile.name;
    const presets = presetManager.getPresetsForModel(modelName);
    
    const modal = document.createElement('div');
    modal.className = 'preset-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'managePresetsTitle');
    modal.setAttribute('aria-modal', 'true');
    
    const formatDate = (timestamp) => {
      return new Date(timestamp).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    };
    
    const presetsHTML = presets.length === 0
      ? '<div class="preset-empty">No presets saved for this model</div>'
      : presets.map((preset) => `
          <div class="preset-item" data-preset-id="${preset.id}">
            <div class="preset-item-info">
              <h4 class="preset-item-name">${preset.name}</h4>
              <p class="preset-item-meta">
                ${preset.description || 'No description'} • 
                Created ${formatDate(preset.created)}
              </p>
            </div>
            <div class="preset-item-actions">
              <button class="btn btn-sm btn-primary" data-action="load" data-preset-id="${preset.id}" aria-label="Load preset ${preset.name}">
                Load
              </button>
              <button class="btn btn-sm btn-secondary" data-action="export" data-preset-id="${preset.id}" aria-label="Export preset ${preset.name}">
                Export
              </button>
              <button class="btn btn-sm btn-outline" data-action="delete" data-preset-id="${preset.id}" aria-label="Delete preset ${preset.name}">
                Delete
              </button>
            </div>
          </div>
        `).join('');
    
    modal.innerHTML = `
      <div class="preset-modal-content">
        <div class="preset-modal-header">
          <h3 id="managePresetsTitle" class="preset-modal-title">Manage Presets</h3>
          <button class="preset-modal-close" aria-label="Close dialog" data-action="close">&times;</button>
        </div>
        <div class="preset-list">
          ${presetsHTML}
        </div>
        <div class="preset-modal-footer">
          <button class="btn btn-secondary" data-action="import">Import Preset</button>
          <button class="btn btn-secondary" data-action="export-all">Export All</button>
          <button class="btn btn-outline" data-action="close">Close</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle actions
    modal.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      
      const action = btn.dataset.action;
      const presetId = btn.dataset.presetId;
      
      if (action === 'close') {
        document.body.removeChild(modal);
      } else if (action === 'load') {
        const preset = presetManager.loadPreset(modelName, presetId);
        if (preset) {
          // Set flag to prevent clearPresetSelection during load
          isLoadingPreset = true;
          
          const state = stateManager.getState();
          stateManager.setState({ parameters: { ...preset.parameters } });
          
          // Re-render UI with preset parameters (FIX: UI wasn't updating before)
          const parametersContainer = document.getElementById('parametersContainer');
          renderParameterUI(
            state.schema,
            parametersContainer,
            (values) => {
              stateManager.setState({ parameters: values });
              // Clear preset selection when parameters are manually changed
              clearPresetSelection();
              if (autoPreviewController) {
                autoPreviewController.onParameterChange(values);
              }
              updatePrimaryActionButton();
            },
            preset.parameters  // Pass preset values as initial values
          );
          
          // Trigger auto-preview with new parameters
          if (autoPreviewController) {
            autoPreviewController.onParameterChange(preset.parameters);
          }
          updatePrimaryActionButton();
          
          // Track the currently loaded preset and update dropdown to show it
          stateManager.setState({ currentPresetId: presetId, currentPresetName: preset.name });
          const presetSelect = document.getElementById('presetSelect');
          if (presetSelect) {
            presetSelect.value = presetId;
          }
          
          // Clear the loading flag
          isLoadingPreset = false;
          
          updateStatus(`Loaded preset: ${preset.name}`);
          document.body.removeChild(modal);
        }
      } else if (action === 'delete') {
        if (confirm('Are you sure you want to delete this preset?')) {
          presetManager.deletePreset(modelName, presetId);
          updatePresetDropdown();
          // Refresh the modal
          document.body.removeChild(modal);
          showManagePresetsModal();
        }
      } else if (action === 'export') {
        const json = presetManager.exportPreset(modelName, presetId);
        if (json) {
          const preset = presetManager.loadPreset(modelName, presetId);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `preset-${preset.name.toLowerCase().replace(/\s+/g, '-')}.json`;
          a.click();
          URL.revokeObjectURL(url);
          updateStatus(`Exported preset: ${preset.name}`);
        }
      } else if (action === 'export-all') {
        const json = presetManager.exportAllPresets(modelName);
        if (json) {
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${modelName.replace('.scad', '')}-presets.json`;
          a.click();
          URL.revokeObjectURL(url);
          updateStatus('Exported all presets');
        } else {
          alert('No presets to export');
        }
      } else if (action === 'import') {
        // Create file input for import
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          
          try {
            const text = await file.text();
            const result = presetManager.importPreset(text);
            
            if (result.success) {
              alert(`Imported ${result.imported} preset(s)${result.skipped > 0 ? ` (${result.skipped} skipped)` : ''}`);
              updatePresetDropdown();
              // Refresh the modal
              document.body.removeChild(modal);
              showManagePresetsModal();
            } else {
              alert(`Import failed: ${result.error}`);
            }
          } catch (error) {
            alert(`Failed to import preset: ${error.message}`);
          }
        };
        input.click();
      }
    });
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
    
    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }
  
  // Preset button handlers
  const savePresetBtn = document.getElementById('savePresetBtn');
  const managePresetsBtn = document.getElementById('managePresetsBtn');
  const presetSelect = document.getElementById('presetSelect');
  
  savePresetBtn.addEventListener('click', showSavePresetModal);
  managePresetsBtn.addEventListener('click', showManagePresetsModal);
  
  // Handle preset selection
  presetSelect.addEventListener('change', (e) => {
    const presetId = e.target.value;
    if (!presetId) return;
    
    const state = stateManager.getState();
    const preset = presetManager.loadPreset(state.uploadedFile.name, presetId);
    
    if (preset) {
      // Set flag to prevent clearPresetSelection during load
      isLoadingPreset = true;
      
      stateManager.setState({ parameters: { ...preset.parameters } });
      
      // Re-render UI with preset parameters (FIX: UI wasn't updating before)
      const parametersContainer = document.getElementById('parametersContainer');
      renderParameterUI(
        state.schema,
        parametersContainer,
        (values) => {
          stateManager.setState({ parameters: values });
          // Clear preset selection when parameters are manually changed
          clearPresetSelection();
          if (autoPreviewController) {
            autoPreviewController.onParameterChange(values);
          }
          updatePrimaryActionButton();
        },
        preset.parameters  // Pass preset values as initial values
      );
      
      // Trigger auto-preview with new parameters
      if (autoPreviewController) {
        autoPreviewController.onParameterChange(preset.parameters);
      }
      updatePrimaryActionButton();
      
      // Track the currently loaded preset (for showing name in dropdown)
      stateManager.setState({ currentPresetId: presetId, currentPresetName: preset.name });
      // Ensure the dropdown displays the selected preset name (native <select> label)
      // (If the dropdown was rebuilt elsewhere, re-assert selection here.)
      const presetSelectEl = document.getElementById('presetSelect');
      if (presetSelectEl) {
        presetSelectEl.value = presetId;
      }
      
      // Clear the loading flag
      isLoadingPreset = false;
      
      updateStatus(`Loaded preset: ${preset.name}`);
      
      // Keep showing the preset name in dropdown (don't reset)
      // The dropdown will reset when parameters change (handled in onChange callback)
    }
  });
  
  // Subscribe to preset changes
  presetManager.subscribe((action, preset, modelName) => {
    // Update dropdown only when the preset LIST changes.
    // IMPORTANT: presetManager emits a 'load' event too; rebuilding the <select> on 'load'
    // resets selection back to "-- Select Preset --" (confirmed by logs: updatePresetDropdown exit newValue="").
    if (action === 'load') {
      return;
    }

    updatePresetDropdown();
  });
  
  // Initialize preset dropdown after file upload
  stateManager.subscribe((state, prevState) => {
    if (state.uploadedFile && !prevState.uploadedFile) {
      updatePresetDropdown();
    }
  });

  // ========== END PRESET SYSTEM ==========

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
