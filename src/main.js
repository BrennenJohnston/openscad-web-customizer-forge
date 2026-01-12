/**
 * OpenSCAD Web Customizer - Main Entry Point
 * @license GPL-3.0-or-later
 */

import './styles/main.css';
import { extractParameters } from './js/parser.js';
import { renderParameterUI } from './js/ui-generator.js';
import { stateManager } from './js/state.js';
import { downloadSTL, generateFilename, formatFileSize } from './js/download.js';
import { RenderController } from './js/render-controller.js';
import { PreviewManager } from './js/preview.js';

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

// Global render controller and preview manager
let renderController = null;
let previewManager = null;

// Initialize app
async function initApp() {
  console.log('OpenSCAD Web Customizer v1.0.0');
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
  const generateBtn = document.getElementById('generateBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const statsArea = document.getElementById('stats');
  const previewContainer = document.getElementById('previewContainer');

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
        }
      );

      // Store default values
      stateManager.setState({
        parameters: currentValues,
        defaults: { ...currentValues },
      });

      updateStatus(`Ready - ${paramCount} parameters loaded`);
      
      // Initialize 3D preview
      if (!previewManager) {
        previewManager = new PreviewManager(previewContainer);
        previewManager.init();
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

  // Load example
  loadExampleBtn.addEventListener('click', async () => {
    try {
      updateStatus('Loading example...');
      const response = await fetch('/examples/universal-cuff/universal_cuff_utensil_holder.scad');
      if (!response.ok) throw new Error('Failed to fetch example');
      
      const content = await response.text();
      console.log('Example loaded:', content.length, 'bytes');
      
      // Treat as uploaded file
      handleFile(
        { name: 'universal_cuff_utensil_holder.scad' },
        content
      );
    } catch (error) {
      console.error('Failed to load example:', error);
      updateStatus('Error loading example');
      alert('Failed to load example file. The file may not be available in the public directory.');
    }
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
        }
      );
      
      updateStatus('Parameters reset to defaults');
    }
  });

  // Generate STL button
  generateBtn.addEventListener('click', async () => {
    const state = stateManager.getState();
    
    if (!state.uploadedFile) {
      alert('No file uploaded');
      return;
    }

    if (!renderController) {
      alert('OpenSCAD engine not initialized');
      return;
    }

    try {
      generateBtn.disabled = true;
      downloadBtn.disabled = true;
      statsArea.textContent = '';

      const startTime = Date.now();

      // Render with progress updates
      const result = await renderController.render(
        state.uploadedFile.content,
        state.parameters,
        {
          timeoutMs: 60000,
          onProgress: (percent, message) => {
            // Handle indeterminate progress (percent = -1)
            if (percent < 0) {
              updateStatus(message);
            } else {
              updateStatus(`${message} (${Math.round(percent)}%)`);
            }
          },
        }
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      stateManager.setState({
        stl: result.stl,
        stlStats: result.stats,
        lastRenderTime: duration,
      });

      updateStatus(`STL generated successfully in ${duration}s`);
      statsArea.textContent = `Size: ${formatFileSize(result.stats.size)} | Triangles: ${result.stats.triangles.toLocaleString()} | Time: ${duration}s`;
      downloadBtn.disabled = false;

      console.log('Render complete:', result.stats);
      
      // Load STL into 3D preview
      if (previewManager) {
        updateStatus('Loading 3D preview...');
        try {
          await previewManager.loadSTL(result.stl);
          updateStatus(`Ready - Preview loaded (${duration}s render time)`);
        } catch (previewError) {
          console.error('Failed to load preview:', previewError);
          updateStatus(`STL generated in ${duration}s (preview unavailable)`);
        }
      }
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
      generateBtn.disabled = false;
    }
  });

  // Download STL button
  downloadBtn.addEventListener('click', () => {
    const state = stateManager.getState();
    
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
  });

  updateStatus('Ready - Upload a file to begin');
}

// Start the app
initApp();
