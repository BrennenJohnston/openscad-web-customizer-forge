/**
 * OpenSCAD Web Customizer - Main Entry Point
 * @license GPL-3.0-or-later
 */

import './styles/main.css';
import { extractParameters } from './js/parser.js';
import {
  renderParameterUI,
  setLimitsUnlocked,
  getAllDefaults,
} from './js/ui-generator.js';
import { stateManager, getShareableURL } from './js/state.js';
import {
  downloadSTL,
  downloadFile,
  generateFilename,
  formatFileSize,
  OUTPUT_FORMATS,
} from './js/download.js';
import {
  RenderController,
  RENDER_QUALITY,
  estimateRenderTime,
} from './js/render-controller.js';
import { PreviewManager } from './js/preview.js';
import {
  AutoPreviewController,
  PREVIEW_STATE,
} from './js/auto-preview-controller.js';
import {
  extractZipFiles,
  validateZipFile,
  createFileTree,
  getZipStats,
} from './js/zip-handler.js';
import { themeManager, initThemeToggle } from './js/theme-manager.js';
import { presetManager } from './js/preset-manager.js';
import { ComparisonController } from './js/comparison-controller.js';
import { ComparisonView } from './js/comparison-view.js';
import { libraryManager, LIBRARY_DEFINITIONS } from './js/library-manager.js';
import { RenderQueue } from './js/render-queue.js';
import Split from 'split.js';

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
let comparisonController = null;
let comparisonView = null;
let renderQueue = null;

// Sanitize URL parameters against extracted schema
function sanitizeUrlParams(extracted, urlParams) {
  const sanitized = {};
  const adjustments = {};

  for (const [key, value] of Object.entries(urlParams || {})) {
    const schema = extracted?.parameters?.[key];
    if (!schema) {
      adjustments[key] = { reason: 'unknown-param', value };
      continue;
    }

    // Enum validation
    if (Array.isArray(schema.enum)) {
      if (!schema.enum.includes(value)) {
        adjustments[key] = { reason: 'enum', value, allowed: schema.enum };
        continue;
      }
      sanitized[key] = value;
      continue;
    }

    // Numeric validation/clamping
    if (typeof value === 'number') {
      let nextValue = value;
      if (schema.minimum !== undefined && nextValue < schema.minimum) {
        adjustments[key] = {
          reason: 'min',
          value,
          minimum: schema.minimum,
          maximum: schema.maximum,
        };
        nextValue = schema.minimum;
      }
      if (schema.maximum !== undefined && nextValue > schema.maximum) {
        adjustments[key] = {
          reason: 'max',
          value,
          minimum: schema.minimum,
          maximum: schema.maximum,
        };
        nextValue = schema.maximum;
      }
      if (schema.type === 'integer') {
        nextValue = Math.round(nextValue);
      }
      sanitized[key] = nextValue;
      continue;
    }

    // Booleans and strings (non-enum) pass through
    sanitized[key] = value;
  }

  return { sanitized, adjustments };
}

// Initialize app
async function initApp() {
  console.log('OpenSCAD Web Customizer v2.9.0 (WASM Progress & Mobile)');
  console.log('Initializing...');

  // Register Service Worker for PWA support
  // In development, avoid Service Worker caching/stale assets which can break testing.
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('[PWA] Service Worker registered:', registration.scope);

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('[PWA] Update found, installing new service worker');

        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            // New version available
            console.log('[PWA] New version available');
            showUpdateNotification(registration);
          }
        });
      });

      // Check for updates periodically (every hour)
      setInterval(
        () => {
          registration.update();
        },
        60 * 60 * 1000
      );
    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  } else {
    console.log('[PWA] Service Worker disabled (dev) or not supported');
  }

  // Handle install prompt
  let deferredInstallPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('[PWA] Install prompt available');
    e.preventDefault();
    deferredInstallPrompt = e;

    // Show install button
    showInstallButton(deferredInstallPrompt);
  });

  // Handle successful installation
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully');
    deferredInstallPrompt = null;
    hideInstallButton();

    // Show success message
    const statusArea = document.getElementById('statusArea');
    if (statusArea) {
      const originalText = statusArea.textContent;
      statusArea.textContent = '✅ App installed! You can now use it offline.';
      setTimeout(() => {
        statusArea.textContent = originalText;
      }, 5000);
    }
  });

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
      contrastBtn.setAttribute(
        'aria-label',
        `High contrast mode: ${enabled ? 'ON' : 'OFF'}. Click to ${enabled ? 'disable' : 'enable'}.`
      );

      setTimeout(() => {
        const state = stateManager.getState();
        if (state.uploadedFile) {
          updateStatus('Ready');
        }
      }, 2000);
    });

    // Set initial ARIA label
    const initialState = themeManager.highContrast;
    contrastBtn.setAttribute(
      'aria-label',
      `High contrast mode: ${initialState ? 'ON' : 'OFF'}. Click to ${initialState ? 'disable' : 'enable'}.`
    );
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
          primaryActionBtn.setAttribute(
            'aria-label',
            `Generate ${formatName} file from current parameters`
          );
        } else {
          primaryActionBtn.textContent = `📥 Download ${formatName}`;
          primaryActionBtn.setAttribute(
            'aria-label',
            `Download generated ${formatName} file`
          );
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

  // Set up memory warning callback
  renderController.setMemoryWarningCallback((memoryInfo) => {
    console.warn(
      `[Memory] High usage: ${memoryInfo.usedMB}MB / ${memoryInfo.limitMB}MB (${memoryInfo.percent}%)`
    );
    showMemoryWarning(memoryInfo);
  });

  // Show WASM loading progress indicator
  const wasmLoadingOverlay = showWasmLoadingIndicator();

  try {
    await renderController.init({
      onProgress: (percent, message) => {
        console.log(`[WASM Init] ${percent}% - ${message}`);
        updateWasmLoadingProgress(wasmLoadingOverlay, percent, message);
      },
    });
    console.log('OpenSCAD WASM ready');
    hideWasmLoadingIndicator(wasmLoadingOverlay);
  } catch (error) {
    console.error('Failed to initialize OpenSCAD WASM:', error);
    hideWasmLoadingIndicator(wasmLoadingOverlay);
    alert(
      'Failed to initialize OpenSCAD engine. Some features may not work. Error: ' +
        error.message
    );
  }

  /**
   * Show WASM loading progress indicator
   * @returns {HTMLElement} The loading overlay element
   */
  function showWasmLoadingIndicator() {
    const overlay = document.createElement('div');
    overlay.id = 'wasmLoadingOverlay';
    overlay.className = 'wasm-loading-overlay';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('aria-label', 'Loading OpenSCAD engine');

    overlay.innerHTML = `
      <div class="wasm-loading-content">
        <div class="wasm-loading-spinner">
          <div class="spinner spinner-large"></div>
        </div>
        <h2 class="wasm-loading-title">Loading OpenSCAD Engine</h2>
        <p class="wasm-loading-message">Initializing...</p>
        <div class="wasm-loading-progress-container">
          <div class="wasm-loading-progress-bar">
            <div class="wasm-loading-progress-fill" style="width: 0%"></div>
          </div>
          <span class="wasm-loading-progress-text">0%</span>
        </div>
        <p class="wasm-loading-hint">This may take a moment on first load (~15-30MB download)</p>
      </div>
    `;

    document.body.appendChild(overlay);
    return overlay;
  }

  /**
   * Update WASM loading progress indicator
   * @param {HTMLElement} overlay - The loading overlay element
   * @param {number} percent - Progress percentage (-1 for indeterminate)
   * @param {string} message - Progress message
   */
  function updateWasmLoadingProgress(overlay, percent, message) {
    if (!overlay) return;

    const messageEl = overlay.querySelector('.wasm-loading-message');
    const progressFill = overlay.querySelector('.wasm-loading-progress-fill');
    const progressText = overlay.querySelector('.wasm-loading-progress-text');

    if (messageEl) messageEl.textContent = message;

    if (percent < 0) {
      // Indeterminate progress
      if (progressFill) {
        progressFill.classList.add('indeterminate');
        progressFill.style.width = '100%';
      }
      if (progressText) progressText.textContent = '';
    } else {
      if (progressFill) {
        progressFill.classList.remove('indeterminate');
        progressFill.style.width = `${percent}%`;
      }
      if (progressText) progressText.textContent = `${percent}%`;
    }
  }

  /**
   * Hide WASM loading indicator
   * @param {HTMLElement} overlay - The loading overlay element
   */
  function hideWasmLoadingIndicator(overlay) {
    if (!overlay) return;

    // Fade out animation
    overlay.classList.add('fade-out');
    setTimeout(() => {
      if (overlay.parentElement) {
        overlay.remove();
      }
    }, 300);
  }

  /**
   * Show memory usage warning notification
   * @param {Object} memoryInfo - Memory usage info from worker
   */
  function showMemoryWarning(memoryInfo) {
    // Remove any existing warning
    const existingWarning = document.getElementById('memoryWarning');
    if (existingWarning) {
      existingWarning.remove();
    }

    const warning = document.createElement('div');
    warning.id = 'memoryWarning';
    warning.className = 'memory-warning';
    warning.setAttribute('role', 'alert');
    warning.innerHTML = `
      <div class="memory-warning-content">
        <span class="memory-warning-icon">⚠️</span>
        <div class="memory-warning-text">
          <strong>High Memory Usage</strong>
          <p>Memory: ${memoryInfo.usedMB}MB / ${memoryInfo.limitMB}MB (${memoryInfo.percent}%)</p>
          <p class="memory-warning-hint">Consider simplifying your model or reducing $fn value.</p>
        </div>
        <button class="btn btn-sm btn-outline memory-warning-dismiss" aria-label="Dismiss warning">×</button>
      </div>
    `;

    document.body.appendChild(warning);

    // Handle dismiss
    warning
      .querySelector('.memory-warning-dismiss')
      .addEventListener('click', () => {
        warning.remove();
      });

    // Auto-dismiss after 15 seconds
    setTimeout(() => {
      if (warning.parentElement) {
        warning.remove();
      }
    }, 15000);
  }

  /**
   * Show render time estimate to user
   * @param {Object} estimate - Result from estimateRenderTime()
   */
  function showRenderEstimate(estimate) {
    if (!estimate || estimate.seconds < 5) return; // Only show for longer renders

    let message = `Estimated render time: ~${estimate.seconds}s`;
    if (estimate.warning) {
      message += ` ⚠️ ${estimate.warning}`;
    }
    updateStatus(message);
  }
  // Export for potential future use (avoids unused warning)
  window._showRenderEstimate = showRenderEstimate;

  // Get DOM elements
  const welcomeScreen = document.getElementById('welcomeScreen');
  const mainInterface = document.getElementById('mainInterface');
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const clearFileBtn = document.getElementById('clearFileBtn');
  const statusArea = document.getElementById('statusArea');
  const primaryActionBtn = document.getElementById('primaryActionBtn');
  const cancelRenderBtn = document.getElementById('cancelRenderBtn');
  const downloadFallbackLink = document.getElementById('downloadFallbackLink');
  const statsArea = document.getElementById('stats');
  const previewContainer = document.getElementById('previewContainer');
  const autoPreviewToggle = document.getElementById('autoPreviewToggle');
  const previewQualitySelect = document.getElementById('previewQualitySelect');
  const measurementsToggle = document.getElementById('measurementsToggle');
  const dimensionsDisplay = document.getElementById('dimensionsDisplay');
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

  // Track last generated parameters for comparison
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

  // Wire measurements toggle
  if (measurementsToggle) {
    // Initialize from localStorage (after preview manager is created)
    // The checkbox will be set when preview manager is initialized

    measurementsToggle.addEventListener('change', () => {
      const enabled = measurementsToggle.checked;
      if (previewManager) {
        previewManager.toggleMeasurements(enabled);
        updateDimensionsDisplay();
      }
      console.log(`[App] Measurements ${enabled ? 'enabled' : 'disabled'}`);
    });
  }

  /**
   * Update the dimensions display panel
   */
  function updateDimensionsDisplay() {
    if (!previewManager || !dimensionsDisplay) return;

    const dimensions = previewManager.calculateDimensions();

    if (dimensions && measurementsToggle?.checked) {
      // Show dimensions panel
      dimensionsDisplay.classList.remove('hidden');

      // Update values
      document.getElementById('dimX').textContent = `${dimensions.x} mm`;
      document.getElementById('dimY').textContent = `${dimensions.y} mm`;
      document.getElementById('dimZ').textContent = `${dimensions.z} mm`;
      document.getElementById('dimVolume').textContent =
        `${dimensions.volume.toLocaleString()} mm³`;
    } else {
      // Hide dimensions panel
      dimensionsDisplay.classList.add('hidden');
    }
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
      [PREVIEW_STATE.CURRENT]: extra.cached
        ? '✓ Preview (cached)'
        : '✓ Preview ready',
      [PREVIEW_STATE.PENDING]: '⏳ Changes pending...',
      [PREVIEW_STATE.RENDERING]: '⟳ Generating...',
      [PREVIEW_STATE.STALE]: '⚠ Preview outdated',
      [PREVIEW_STATE.ERROR]: '✗ Preview failed',
    };
    previewStateIndicator.textContent = stateMessages[state] || state;

    // Update preview container border state
    previewContainer.classList.remove(
      'preview-pending',
      'preview-stale',
      'preview-rendering',
      'preview-current',
      'preview-error'
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
      console.warn(
        '[AutoPreview] Cannot init - missing controller or preview manager'
      );
      return;
    }

    autoPreviewController = new AutoPreviewController(
      renderController,
      previewManager,
      {
        // Lower debounce to reduce perceived "delay" after slider changes.
        // Scheduling logic in AutoPreviewController avoids overlapping renders.
        debounceMs: 350,
        maxCacheSize: 10,
        enabled: autoPreviewEnabled,
        previewQuality,
        onStateChange: (newState, prevState, extra) => {
          console.log(
            `[AutoPreview] State: ${prevState} -> ${newState}`,
            extra
          );
          updatePreviewStateUI(newState, extra);
        },
        onPreviewReady: (stl, stats, cached) => {
          console.log('[AutoPreview] Preview ready, cached:', cached);
          // Update button state - preview available but may need full render for download
          updatePrimaryActionButton();
          // Update dimensions display
          updateDimensionsDisplay();
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
      }
    );

    console.log('[AutoPreview] Controller initialized');

    // Subscribe to library manager changes
    libraryManager.subscribe((action, libraryId) => {
      console.log(`[Library] ${action}: ${libraryId}`);
      // Update auto-preview controller with new library list
      if (autoPreviewController) {
        autoPreviewController.setEnabledLibraries(
          getEnabledLibrariesForRender()
        );
      }
    });
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
    const hasFullQualitySTL = autoPreviewController?.getCurrentFullSTL(
      state.parameters
    );
    const needsFullRender =
      !hasFullQualitySTL ||
      autoPreviewController?.needsFullRender(state.parameters);

    if (hasFullQualitySTL && !needsFullRender) {
      // Full quality STL is ready and matches current parameters - show Download
      primaryActionBtn.textContent = '📥 Download STL';
      primaryActionBtn.dataset.action = 'download';
      primaryActionBtn.classList.remove('btn-primary');
      primaryActionBtn.classList.add('btn-success');
      primaryActionBtn.setAttribute(
        'aria-label',
        'Download generated STL file (full quality)'
      );
      // Hide fallback since primary button is download
      downloadFallbackLink.classList.add('hidden');
    } else {
      // Need to generate (no full STL yet, or params changed)
      primaryActionBtn.textContent = 'Generate STL';
      primaryActionBtn.dataset.action = 'generate';
      primaryActionBtn.classList.remove('btn-success');
      primaryActionBtn.classList.add('btn-primary');
      primaryActionBtn.setAttribute(
        'aria-label',
        'Generate STL file from current parameters'
      );

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

  /**
   * Load embedded model from scaffolded app HTML
   * Scaffolded apps embed the schema and scad source in script tags
   * @returns {boolean} True if embedded model was loaded
   */
  function loadEmbeddedModel() {
    const schemaEl = document.getElementById('param-schema');
    const scadEl = document.getElementById('scad-source');

    // Check if both elements exist and have content
    if (!schemaEl || !scadEl) {
      return false;
    }

    const schemaText = schemaEl.textContent?.trim();
    const scadContent = scadEl.textContent?.trim();

    if (!schemaText || !scadContent) {
      return false;
    }

    try {
      // Parse the embedded schema (it's JSON)
      const schema = JSON.parse(schemaText);

      // Validate basic schema structure
      if (!schema.properties || typeof schema.properties !== 'object') {
        console.warn(
          '[Embedded] Invalid schema structure, falling back to file upload'
        );
        return false;
      }

      // Derive filename from schema or default
      const fileName =
        (schema.title || 'embedded-model')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_') + '.scad';

      console.log(`[Embedded] Loading embedded model: ${fileName}`);
      console.log(
        `[Embedded] Found ${Object.keys(schema.properties).length} parameters`
      );

      // Process the embedded content using handleFile
      handleFile({ name: fileName }, scadContent);

      return true;
    } catch (e) {
      console.warn('[Embedded] Failed to load embedded model:', e.message);
      return false;
    }
  }

  // Try to load embedded model (for scaffolded apps)
  // Only attempt if no draft was restored
  if (!draft || !stateManager.getState()?.uploadedFile) {
    const embeddedLoaded = loadEmbeddedModel();
    if (embeddedLoaded) {
      console.log('[App] Loaded embedded model from scaffolded app');
    }
  }

  // Upload size limits (configurable)
  const UPLOAD_SIZE_LIMITS = {
    SINGLE_FILE_MB: 5,
    ZIP_FILE_MB: 10,
  };

  // Update status
  function updateStatus(message) {
    statusArea.textContent = message;
    
    // Add/remove idle class for auto-hide when status is "Ready"
    if (message === 'Ready' || message === '') {
      statusArea.classList.add('idle');
    } else {
      statusArea.classList.remove('idle');
    }
  }

  /**
   * Detect include/use statements in SCAD content
   * @param {string} scadContent - OpenSCAD source code
   * @returns {Object} Detection result with hasIncludes, hasUse, and files array
   */
  function detectIncludeUse(scadContent) {
    // Match include <...> and use <...> statements
    const includePattern = /^\s*include\s*<([^>]+)>/gm;
    const usePattern = /^\s*use\s*<([^>]+)>/gm;

    const includes = [];
    const uses = [];

    let match;
    while ((match = includePattern.exec(scadContent)) !== null) {
      includes.push(match[1]);
    }

    while ((match = usePattern.exec(scadContent)) !== null) {
      uses.push(match[1]);
    }

    return {
      hasIncludes: includes.length > 0,
      hasUse: uses.length > 0,
      includes,
      uses,
      files: [...includes, ...uses],
    };
  }

  // Handle file upload (supports both .scad and .zip files)
  async function handleFile(
    file,
    content = null,
    extractedFiles = null,
    mainFilePathArg = null
  ) {
    if (!file && !content) return;

    let fileName = file ? file.name : 'example.scad';
    let fileContent = content;
    let projectFiles = extractedFiles; // Map of additional files for multi-file projects
    let mainFilePath = mainFilePathArg; // Path to main file in multi-file project (passed from ZIP extraction)

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

          console.log(
            `[ZIP] Loaded multi-file project: ${mainFile} (${stats.totalFiles} files)`
          );

          // Continue with extracted content, passing mainFilePath as 4th argument
          handleFile(null, fileContent, projectFiles, mainFilePath);
          return;
        } catch (error) {
          console.error('[ZIP] Extraction failed:', error);
          updateStatus('Failed to extract ZIP file');
          alert(error.message);
          return;
        }
      }

      // Handle single .scad files (existing logic)
      if (file.size > UPLOAD_SIZE_LIMITS.SINGLE_FILE_MB * 1024 * 1024) {
        alert(`File size exceeds ${UPLOAD_SIZE_LIMITS.SINGLE_FILE_MB}MB limit`);
        return;
      }
    }

    if (file && !content) {
      const reader = new FileReader();
      reader.onload = (e) => {
        handleFile(null, e.target.result, extractedFiles, mainFilePath);
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
      console.log(
        `Found ${paramCount} parameters in ${extracted.groups.length} groups`
      );
      const colorParamNames = Object.values(extracted.parameters)
        .filter((param) => param.uiType === 'color')
        .map((param) => param.name);

      // Store in state (including project files for multi-file support)
      stateManager.setState({
        uploadedFile: { name: fileName, content: fileContent },
        projectFiles: projectFiles || null, // Map of additional files (null for single-file projects)
        mainFilePath: mainFilePath || fileName, // Track main file path
        schema: extracted,
        parameters: {},
        defaults: {},
      });

      // Clear undo/redo history on new file upload
      stateManager.clearHistory();

      // Show main interface
      welcomeScreen.classList.add('hidden');
      mainInterface.classList.remove('hidden');

      // Detect include/use statements for single-file uploads
      let includeUseWarning = '';
      if (!projectFiles || projectFiles.size <= 1) {
        const detection = detectIncludeUse(fileContent);
        if (detection.hasIncludes || detection.hasUse) {
          const fileList = detection.files.join(', ');
          includeUseWarning = `\n⚠️ Note: This file references external files (${fileList}). For multi-file projects, upload a ZIP containing all files.`;
          console.warn(
            '[Upload] Single-file upload with include/use detected:',
            detection.files
          );
        }
      }

      // Calculate file size
      const fileSizeBytes = file ? file.size : fileContent.length;
      const fileSizeStr = formatFileSize(fileSizeBytes);

      // Update file info (preserve file tree for multi-file projects)
      const fileInfo = document.getElementById('fileInfo');
      const fileInfoSummary = document.getElementById('fileInfoSummary');
      const fileInfoDetails = document.getElementById('fileInfoDetails');
      const fileInfoTree = document.getElementById('fileInfoTree');
      
      if (fileInfo && fileInfoSummary) {
        // Always show compact summary
        const summaryText = `${fileName} (${paramCount} parameters, ${fileSizeStr})${includeUseWarning}`;
        fileInfoSummary.textContent = summaryText;
        fileInfoSummary.title = summaryText; // Full text in tooltip
        
        // Show file tree in disclosure if multi-file project
        if (projectFiles && projectFiles.size > 1 && fileInfoDetails && fileInfoTree) {
          const treeHtml = createFileTree(
            projectFiles,
            mainFilePath || fileName
          );
          fileInfoTree.innerHTML = treeHtml;
          fileInfoDetails.classList.remove('hidden');
        } else if (fileInfoDetails) {
          fileInfoDetails.classList.add('hidden');
        }
      }
      
      // Enable compact header after file is loaded
      const appHeader = document.querySelector('.app-header');
      if (appHeader) {
        appHeader.classList.add('compact');
      }

      // Show include/use warning in status if detected
      if (includeUseWarning) {
        updateStatus(`File loaded. ${includeUseWarning.trim()}`);
      }

      // Show clear file button and focus mode button
      if (clearFileBtn) {
        clearFileBtn.classList.remove('hidden');
      }
      
      const focusModeBtn = document.getElementById('focusModeBtn');
      if (focusModeBtn) {
        focusModeBtn.classList.remove('hidden');
      }

      // Handle detected libraries
      const detectedLibraries = extracted.libraries || [];
      console.log('Detected libraries:', detectedLibraries);
      stateManager.setState({
        detectedLibraries,
      });

      // Auto-enable detected libraries and show library UI
      if (detectedLibraries.length > 0) {
        const autoEnabled = libraryManager.autoEnable(fileContent);
        if (autoEnabled.length > 0) {
          console.log('Auto-enabled libraries:', autoEnabled);
          updateStatus(`Enabled ${autoEnabled.length} required libraries`);
        }
        renderLibraryUI(detectedLibraries);
      }

      // Render parameter UI
      const parametersContainer = document.getElementById(
        'parametersContainer'
      );
      const currentValues = renderParameterUI(
        extracted,
        parametersContainer,
        (values) => {
          // Record state for undo before applying change
          stateManager.recordParameterState();
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

        const { sanitized, adjustments } = sanitizeUrlParams(
          extracted,
          urlParams
        );

        // Re-render UI with URL parameters - MUST include updatePrimaryActionButton in callback!
        const updatedValues = renderParameterUI(
          extracted,
          parametersContainer,
          (values) => {
            // Record state for undo before applying change
            stateManager.recordParameterState();
            stateManager.setState({ parameters: values });
            // Clear preset selection when parameters are manually changed
            clearPresetSelection();
            // Trigger auto-preview on parameter change
            if (autoPreviewController) {
              autoPreviewController.onParameterChange(values);
            }
            // Update button state when parameters change
            updatePrimaryActionButton();
          },
          sanitized
        );

        // Ensure state matches sanitized UI values
        stateManager.setState({ parameters: updatedValues });

        if (Object.keys(adjustments).length > 0) {
          updateStatus(
            'Some URL parameters were adjusted to fit allowed ranges.'
          );
        }

        // Trigger initial auto-preview with URL params
        if (autoPreviewController) {
          autoPreviewController.onParameterChange(updatedValues);
        }

        updateStatus(
          `Ready - ${paramCount} parameters loaded (${Object.keys(urlParams).length} from URL)`
        );
      } else {
        updateStatus(`Ready - ${paramCount} parameters loaded`);
      }

      // Initialize 3D preview (lazy loads Three.js)
      if (!previewManager) {
        previewManager = new PreviewManager(previewContainer);
        await previewManager.init();

        // Sync measurements toggle with saved preference
        if (measurementsToggle) {
          measurementsToggle.checked = previewManager.measurementsEnabled;
        }

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
      if (autoPreviewController) {
        autoPreviewController.setColorParamNames(colorParamNames);
      }

      // Set the SCAD content and project files for auto-preview
      if (autoPreviewController) {
        autoPreviewController.setScadContent(fileContent);
        autoPreviewController.setProjectFiles(projectFiles, mainFilePath);
        // CRITICAL: Set enabled libraries BEFORE triggering initial preview
        const libsForRender = getEnabledLibrariesForRender();
        autoPreviewController.setEnabledLibraries(libsForRender);
        updatePreviewStateUI(PREVIEW_STATE.IDLE);

        // Trigger initial preview immediately on first load (and also for URL-param loads).
        // This makes the app feel responsive without requiring a first parameter change.
        if (autoPreviewEnabled) {
          // Use .then()/.catch() to handle errors without blocking file load completion
          autoPreviewController
            .forcePreview(stateManager.getState().parameters)
            .then((initiated) => {
              if (initiated) {
                console.log('[Init] Initial preview render started');
              } else {
                console.warn('[Init] Initial preview render was skipped');
              }
            })
            .catch((error) => {
              console.error('[Init] Initial preview render failed:', error);
              updatePreviewStateUI(PREVIEW_STATE.ERROR, {
                error: error.message,
              });
              updateStatus(`Initial preview failed: ${error.message}`);
            });
        }
      }
    } catch (error) {
      console.error('Failed to extract parameters:', error);
      updateStatus('Error: Failed to extract parameters');
      alert(
        'Failed to extract parameters from file. Please check the file format.'
      );
    }
  }

  // File input change
  fileInput.addEventListener('change', (e) => {
    handleFile(e.target.files[0]);
  });

  // Clear file button
  if (clearFileBtn) {
    clearFileBtn.addEventListener('click', () => {
      // Confirm before clearing
      if (confirm('Clear the current file and return to the welcome screen?')) {
        // Reset file input
        fileInput.value = '';

        // Clear state
        stateManager.setState({
          uploadedFile: null,
          projectFiles: null,
          mainFilePath: null,
          schema: null,
          parameters: {},
          defaults: {},
          stl: null,
          outputFormat: 'stl',
          stlStats: null,
          detectedLibraries: [],
        });

        // Clear history
        stateManager.clearHistory();

        // Hide main interface, show welcome screen
        mainInterface.classList.add('hidden');
        welcomeScreen.classList.remove('hidden');

        // Hide clear button
        clearFileBtn.classList.add('hidden');
        
        // Hide focus mode button
        const focusModeBtn = document.getElementById('focusModeBtn');
        if (focusModeBtn) {
          focusModeBtn.classList.add('hidden');
          // Exit focus mode if active
          if (mainInterface && mainInterface.classList.contains('focus-mode')) {
            mainInterface.classList.remove('focus-mode');
            focusModeBtn.setAttribute('aria-pressed', 'false');
          }
        }

        // Clear preview
        if (previewManager) {
          previewManager.clear();
        }

        // Reset status
        updateStatus('Ready');
        statsArea.textContent = '';

        // Clear file info
        const fileInfoSummary = document.getElementById('fileInfoSummary');
        const fileInfoDetails = document.getElementById('fileInfoDetails');
        if (fileInfoSummary) {
          fileInfoSummary.textContent = '';
        }
        if (fileInfoDetails) {
          fileInfoDetails.classList.add('hidden');
        }
        
        // Remove compact header
        const appHeader = document.querySelector('.app-header');
        if (appHeader) {
          appHeader.classList.remove('compact');
        }

        console.log('[App] File cleared, returned to welcome screen');
      }
    });
  }

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
  exampleButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const exampleType = button.dataset.example;

      const examples = {
        'universal-cuff': {
          path: '/examples/universal-cuff/universal_cuff_utensil_holder.scad',
          name: 'universal_cuff_utensil_holder.scad',
        },
        'simple-box': {
          path: '/examples/simple-box/simple_box.scad',
          name: 'simple_box.scad',
        },
        cylinder: {
          path: '/examples/parametric-cylinder/parametric_cylinder.scad',
          name: 'parametric_cylinder.scad',
        },
        'library-test': {
          path: '/examples/library-test/library_test.scad',
          name: 'library_test.scad',
        },
        'colored-box': {
          path: '/examples/colored-box/colored_box.scad',
          name: 'colored_box.scad',
        },
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
        alert(
          'Failed to load example file. The file may not be available in the public directory.'
        );
      }
    });
  });

  // Undo/Redo buttons
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');

  undoBtn?.addEventListener('click', () => {
    const previousParams = stateManager.undo();
    if (previousParams) {
      const state = stateManager.getState();

      // Re-render UI with undone parameters
      const parametersContainer = document.getElementById(
        'parametersContainer'
      );
      renderParameterUI(
        state.schema,
        parametersContainer,
        (values) => {
          stateManager.recordParameterState();
          stateManager.setState({ parameters: values });
          clearPresetSelection();
          if (autoPreviewController && state.uploadedFile) {
            autoPreviewController.onParameterChange(values);
          }
          updatePrimaryActionButton();
        },
        previousParams
      );

      // Trigger auto-preview with undone params
      if (autoPreviewController && state.uploadedFile) {
        autoPreviewController.onParameterChange(previousParams);
      }

      updatePrimaryActionButton();
    }
  });

  redoBtn?.addEventListener('click', () => {
    const nextParams = stateManager.redo();
    if (nextParams) {
      const state = stateManager.getState();

      // Re-render UI with redone parameters
      const parametersContainer = document.getElementById(
        'parametersContainer'
      );
      renderParameterUI(
        state.schema,
        parametersContainer,
        (values) => {
          stateManager.recordParameterState();
          stateManager.setState({ parameters: values });
          clearPresetSelection();
          if (autoPreviewController && state.uploadedFile) {
            autoPreviewController.onParameterChange(values);
          }
          updatePrimaryActionButton();
        },
        nextParams
      );

      // Trigger auto-preview with redone params
      if (autoPreviewController && state.uploadedFile) {
        autoPreviewController.onParameterChange(nextParams);
      }

      updatePrimaryActionButton();
    }
  });

  // Reset button
  const resetBtn = document.getElementById('resetBtn');
  resetBtn.addEventListener('click', () => {
    const state = stateManager.getState();
    if (state.defaults) {
      // Record current state before reset for undo
      stateManager.recordParameterState();

      stateManager.setState({ parameters: { ...state.defaults } });

      // Clear preset selection when resetting to defaults
      clearPresetSelection();

      // Re-render UI with defaults
      const parametersContainer = document.getElementById(
        'parametersContainer'
      );
      renderParameterUI(state.schema, parametersContainer, (values) => {
        stateManager.recordParameterState();
        stateManager.setState({ parameters: values });
        // Clear preset selection when parameters are manually changed
        clearPresetSelection();
        // Trigger auto-preview on parameter change
        if (autoPreviewController && state.uploadedFile) {
          autoPreviewController.onParameterChange(values);
        }
        updatePrimaryActionButton();
      });

      // Trigger auto-preview with reset params
      if (autoPreviewController && state.uploadedFile) {
        autoPreviewController.onParameterChange(state.defaults);
      }

      updateStatus('Parameters reset to defaults');
      // Update button state after reset
      updatePrimaryActionButton();
    }
  });

  // Collapsible Parameter Panel (Desktop only)
  const collapseParamPanelBtn = document.getElementById('collapseParamPanelBtn');
  const paramPanel = document.getElementById('paramPanel');
  const paramPanelBody = document.getElementById('paramPanelBody');
  
  // Declare toggleParamPanel at module scope so it can be referenced by Split.js code
  let toggleParamPanel = null;
  
  if (collapseParamPanelBtn && paramPanel && paramPanelBody) {
    // Load saved collapsed state (desktop only)
    const STORAGE_KEY_COLLAPSED = 'openscad-customizer-param-panel-collapsed';
    let isCollapsed = false;
    
    try {
      const savedState = localStorage.getItem(STORAGE_KEY_COLLAPSED);
      if (savedState === 'true' && window.innerWidth >= 768) {
        isCollapsed = true;
      }
    } catch (e) {
      console.warn('Could not access localStorage:', e);
    }
    
    // Apply initial state
    if (isCollapsed) {
      paramPanel.classList.add('collapsed');
      collapseParamPanelBtn.setAttribute('aria-expanded', 'false');
      collapseParamPanelBtn.setAttribute('aria-label', 'Expand parameters');
      collapseParamPanelBtn.title = 'Expand parameters';
    }
    
    // Toggle function (assigned to outer scope variable)
    toggleParamPanel = function() {
      // Only allow collapse on desktop (>= 768px)
      if (window.innerWidth < 768) {
        return;
      }
      
      isCollapsed = !isCollapsed;
      
      if (isCollapsed) {
        // Check if focus is inside the panel body
        const activeElement = document.activeElement;
        const isFocusInBody = paramPanelBody.contains(activeElement);
        
        // Collapse panel
        paramPanel.classList.add('collapsed');
        collapseParamPanelBtn.setAttribute('aria-expanded', 'false');
        collapseParamPanelBtn.setAttribute('aria-label', 'Expand parameters');
        collapseParamPanelBtn.title = 'Expand parameters';
        
        // If focus was inside body, move it to the toggle button
        if (isFocusInBody) {
          collapseParamPanelBtn.focus();
        }
      } else {
        // Expand panel
        paramPanel.classList.remove('collapsed');
        collapseParamPanelBtn.setAttribute('aria-expanded', 'true');
        collapseParamPanelBtn.setAttribute('aria-label', 'Collapse parameters');
        collapseParamPanelBtn.title = 'Collapse parameters';
      }
      
      // Persist state
      try {
        localStorage.setItem(STORAGE_KEY_COLLAPSED, String(isCollapsed));
      } catch (e) {
        console.warn('Could not save to localStorage:', e);
      }
      
      // Trigger preview resize after transition
      setTimeout(() => {
        if (previewManager) {
          previewManager.handleResize();
        }
      }, 300); // Match CSS transition duration
    }
    
    // Add click listener
    collapseParamPanelBtn.addEventListener('click', toggleParamPanel);
    
    // Handle window resize - reset collapsed state on mobile
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (window.innerWidth < 768 && isCollapsed) {
          // Reset to expanded on mobile
          isCollapsed = false;
          paramPanel.classList.remove('collapsed');
          collapseParamPanelBtn.setAttribute('aria-expanded', 'true');
          collapseParamPanelBtn.setAttribute('aria-label', 'Collapse parameters');
          collapseParamPanelBtn.title = 'Collapse parameters';
        }
      }, 150);
    });
  }

  // Resizable Split Panels (Desktop only)
  let splitInstance = null;
  const previewPanel = document.querySelector('.preview-panel');
  
  if (paramPanel && previewPanel && window.innerWidth >= 768) {
    const STORAGE_KEY_SPLIT = 'openscad-customizer-split-sizes';
    
    // Load saved split sizes
    let initialSizes = [40, 60]; // Default: 40% params, 60% preview
    try {
      const savedSizes = localStorage.getItem(STORAGE_KEY_SPLIT);
      if (savedSizes) {
        const parsed = JSON.parse(savedSizes);
        if (Array.isArray(parsed) && parsed.length === 2) {
          initialSizes = parsed;
        }
      }
    } catch (e) {
      console.warn('Could not load split sizes:', e);
    }
    
    const minSizes = [280, 300];

    // Initialize Split.js (only if not collapsed)
    const initSplit = function() {
      if (splitInstance || paramPanel.classList.contains('collapsed')) {
        return;
      }
      
      splitInstance = Split([paramPanel, previewPanel], {
        sizes: initialSizes,
        minSize: minSizes,
        gutterSize: 8,
        cursor: 'col-resize',
        onDrag: () => {
          // Trigger preview resize during drag (throttled by RAF)
          if (previewManager) {
            requestAnimationFrame(() => {
              previewManager.handleResize();
            });
          }
        },
        onDragEnd: (sizes) => {
          // Persist sizes
          try {
            localStorage.setItem(STORAGE_KEY_SPLIT, JSON.stringify(sizes));
          } catch (e) {
            console.warn('Could not save split sizes:', e);
          }
          
          // Final resize after drag
          if (previewManager) {
            previewManager.handleResize();
          }
        },
      });
      
      // Add keyboard accessibility to gutter
      setTimeout(() => {
        const gutter = document.querySelector('.gutter');
        if (gutter) {
          // Make gutter focusable
          gutter.setAttribute('tabindex', '0');
          gutter.setAttribute('role', 'separator');
          gutter.setAttribute('aria-orientation', 'vertical');
          gutter.setAttribute('aria-label', 'Resize panels');
          const controlIds = [paramPanel.id, previewPanel.id]
            .filter(Boolean)
            .join(' ');
          if (controlIds) {
            gutter.setAttribute('aria-controls', controlIds);
          }
          
          // Get current sizes
          const getCurrentSizes = () => {
            const paramWidth = paramPanel.offsetWidth;
            const previewWidth = previewPanel.offsetWidth;
            const totalWidth = paramWidth + previewWidth;
            return [
              (paramWidth / totalWidth) * 100,
              (previewWidth / totalWidth) * 100,
            ];
          };

          const getAriaRange = () => {
            const totalWidth = paramPanel.offsetWidth + previewPanel.offsetWidth;
            if (!totalWidth) {
              return { min: 0, max: 100 };
            }
            const minParam = Math.round((minSizes[0] / totalWidth) * 100);
            const maxParam = Math.round(
              (1 - minSizes[1] / totalWidth) * 100
            );
            return {
              min: Math.max(0, Math.min(minParam, maxParam)),
              max: Math.min(100, Math.max(minParam, maxParam)),
            };
          };
          
          // Set aria-value attributes
          const updateAriaValues = () => {
            const sizes = getCurrentSizes();
            const { min, max } = getAriaRange();
            gutter.setAttribute('aria-valuenow', Math.round(sizes[0]));
            gutter.setAttribute('aria-valuemin', String(min));
            gutter.setAttribute('aria-valuemax', String(max));
            gutter.setAttribute('aria-valuetext', `Parameters: ${Math.round(sizes[0])}%, Preview: ${Math.round(sizes[1])}%`);
          };
          
          updateAriaValues();
          
          // Keyboard navigation
          gutter.addEventListener('keydown', (e) => {
            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
              e.preventDefault();
              
              const sizes = getCurrentSizes();
              let newParamSize = sizes[0];
              const { min, max } = getAriaRange();
              
              // Calculate step size
              const smallStep = 2; // 2%
              const largeStep = 5; // 5% with Shift
              const step = e.shiftKey ? largeStep : smallStep;
              
              // Adjust size based on key
              switch (e.key) {
                case 'ArrowLeft':
                  newParamSize = Math.max(min, sizes[0] - step);
                  break;
                case 'ArrowRight':
                  newParamSize = Math.min(max, sizes[0] + step);
                  break;
                case 'Home':
                  newParamSize = min;
                  break;
                case 'End':
                  newParamSize = max;
                  break;
              }
              
              const newPreviewSize = 100 - newParamSize;
              
              // Apply new sizes
              if (splitInstance) {
                splitInstance.setSizes([newParamSize, newPreviewSize]);
                
                // Save to localStorage
                try {
                  localStorage.setItem(STORAGE_KEY_SPLIT, JSON.stringify([newParamSize, newPreviewSize]));
                } catch (err) {
                  console.warn('Could not save split sizes:', err);
                }
                
                // Update ARIA values
                updateAriaValues();
                
                // Trigger preview resize
                if (previewManager) {
                  previewManager.handleResize();
                }
              }
            }
          });
          
          // Update ARIA values after drag
          gutter.addEventListener('mouseup', updateAriaValues);
          gutter.addEventListener('touchend', updateAriaValues);
        }
      }, 100);
    }
    
    // Destroy Split.js
    const destroySplit = function() {
      if (splitInstance) {
        splitInstance.destroy();
        splitInstance = null;
      }
    }
    
    // Initialize if not collapsed
    if (!paramPanel.classList.contains('collapsed')) {
      initSplit();
    }
    
    // Re-initialize/destroy split when collapse state changes
    const originalToggleParamPanel = toggleParamPanel;
    if (typeof originalToggleParamPanel === 'function') {
      toggleParamPanel = function() {
        const wasCollapsed = paramPanel.classList.contains('collapsed');
        originalToggleParamPanel.call(this);
        
        if (wasCollapsed) {
          // Just expanded - initialize split
          setTimeout(initSplit, 350); // Wait for transition
        } else {
          // Just collapsed - destroy split
          destroySplit();
        }
      };
      
      // Re-bind the event listener
      collapseParamPanelBtn.removeEventListener('click', originalToggleParamPanel);
      collapseParamPanelBtn.addEventListener('click', toggleParamPanel);
    }
    
    // Handle window resize - destroy/reinit split on mobile
    let splitResizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(splitResizeTimeout);
      splitResizeTimeout = setTimeout(() => {
        if (window.innerWidth < 768) {
          destroySplit();
        } else if (!splitInstance && !paramPanel.classList.contains('collapsed')) {
          initSplit();
        }
      }, 150);
    });
  }

  // Focus Mode - Maximize 3D preview
  const focusModeBtn = document.getElementById('focusModeBtn');
  // mainInterface is already declared at line 484
  // comparisonView container is accessed via DOM query
  
  if (focusModeBtn && mainInterface) {
    let isFocusMode = false;
    
    // Toggle focus mode
    const toggleFocusMode = function() {
      // Don't allow focus mode when comparison view is active
      const comparisonViewEl = document.getElementById('comparisonView');
      if (comparisonViewEl && !comparisonViewEl.classList.contains('hidden')) {
        return;
      }
      
      isFocusMode = !isFocusMode;
      
      if (isFocusMode) {
        // Enter focus mode
        mainInterface.classList.add('focus-mode');
        focusModeBtn.setAttribute('aria-pressed', 'true');
        focusModeBtn.setAttribute('aria-label', 'Exit focus mode');
        focusModeBtn.title = 'Exit focus mode (Esc)';
      } else {
        // Exit focus mode
        mainInterface.classList.remove('focus-mode');
        focusModeBtn.setAttribute('aria-pressed', 'false');
        focusModeBtn.setAttribute('aria-label', 'Enter focus mode');
        focusModeBtn.title = 'Focus mode (maximize preview)';
      }
      
      // Trigger preview resize after mode change
      setTimeout(() => {
        if (previewManager) {
          previewManager.handleResize();
        }
      }, 100);
    }
    
    // Add click listener
    focusModeBtn.addEventListener('click', toggleFocusMode);
    
    // Add Escape key listener to exit focus mode
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isFocusMode) {
        // Only exit focus mode if no modals are open
        const modals = document.querySelectorAll('.modal:not(.hidden)');
        if (modals.length === 0) {
          toggleFocusMode();
        }
      }
    });
    
    // Auto-exit focus mode when comparison view is shown
    const comparisonViewEl = document.getElementById('comparisonView');
    if (comparisonViewEl) {
      // Watch for comparison view becoming visible
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class') {
            if (!comparisonViewEl.classList.contains('hidden') && isFocusMode) {
              // Exit focus mode when comparison view opens
              toggleFocusMode();
            }
          }
        });
      });
      
      observer.observe(comparisonViewEl, { attributes: true });
    }
  }

  // Primary Action Button (transforms between Generate and Download)
  primaryActionBtn.addEventListener('click', async () => {
    const action = primaryActionBtn.dataset.action;
    const state = stateManager.getState();

    if (action === 'download') {
      // Get selected output format
      const outputFormat =
        outputFormatSelect?.value || state.outputFormat || 'stl';

      // Download action - get full quality file from auto-preview controller
      const fullSTL = autoPreviewController?.getCurrentFullSTL(
        state.parameters
      );

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
      const formatName =
        OUTPUT_FORMATS[outputFormat]?.name || outputFormat.toUpperCase();

      primaryActionBtn.disabled = true;
      primaryActionBtn.textContent = `⏳ Generating ${formatName}...`;

      // Show cancel button
      cancelRenderBtn.classList.remove('hidden');

      // Disable undo/redo during rendering to prevent state mismatches
      stateManager.setHistoryEnabled(false);

      // Cancel any pending preview renders
      if (autoPreviewController) {
        autoPreviewController.cancelPending();
      }

      // Show render time estimate for complex models
      const estimate = estimateRenderTime(
        state.uploadedFile.content,
        state.parameters
      );
      if (estimate.seconds >= 5 || estimate.warning) {
        let estimateMsg = `Generating ${formatName}... (est. ~${estimate.seconds}s)`;
        if (estimate.warning) {
          console.warn('[Render] Complexity warning:', estimate.warning);
        }
        updateStatus(estimateMsg);
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
        // Pass files/mainFile/libraries for multi-file projects
        const libsForRender = getEnabledLibrariesForRender();
        result = await renderController.renderFull(
          state.uploadedFile.content,
          state.parameters,
          {
            outputFormat,
            files: state.projectFiles,
            mainFile: state.mainFilePath,
            libraries: libsForRender,
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

      const triangleInfo =
        result.stats.triangles > 0
          ? ` | Triangles: ${result.stats.triangles.toLocaleString()}`
          : '';
      statsArea.innerHTML = `<span class="stats-quality full">Full Quality ${formatName}</span> Size: ${formatFileSize(result.stats.size)}${triangleInfo} | Time: ${duration}s`;

      console.log('Full render complete:', result.stats);

      // Do NOT auto-download. User must explicitly click Download.
      updateStatus(
        `${formatName} generated successfully in ${duration}s (click Download to save)`
      );

      // Update preview state to show full quality
      updatePreviewStateUI(PREVIEW_STATE.CURRENT, {
        stats: result.stats,
        fullQuality: true,
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
      // Hide cancel button
      cancelRenderBtn.classList.add('hidden');
      // Re-enable undo/redo after rendering
      stateManager.setHistoryEnabled(true);
      // Always restore button to correct state based on current conditions
      updatePrimaryActionButton();
    }
  });

  // Cancel render button
  cancelRenderBtn.addEventListener('click', () => {
    if (renderController) {
      renderController.cancel();
      updateStatus('Generation cancelled by user');
      cancelRenderBtn.classList.add('hidden');
      primaryActionBtn.disabled = false;
      // Re-enable undo/redo after cancellation
      stateManager.setHistoryEnabled(true);
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

  // ========== RENDER QUEUE ==========

  // Initialize render queue
  renderQueue = new RenderQueue(renderController, {
    maxQueueSize: 20,
  });

  // Render Queue UI elements
  const queueBadge = document.getElementById('queueBadge');
  const addToQueueBtn = document.getElementById('addToQueueBtn');
  const viewQueueBtn = document.getElementById('viewQueueBtn');
  const queueModal = document.getElementById('renderQueueModal');
  const queueModalClose = document.getElementById('queueModalClose');
  const queueModalOverlay = document.getElementById('queueModalOverlay');
  const queueList = document.getElementById('queueList');
  const queueEmpty = document.getElementById('queueEmpty');
  const processQueueBtn = document.getElementById('processQueueBtn');
  const stopQueueBtn = document.getElementById('stopQueueBtn');
  const clearCompletedBtn = document.getElementById('clearCompletedBtn');
  const clearQueueBtn = document.getElementById('clearQueueBtn');
  const exportQueueBtn = document.getElementById('exportQueueBtn');
  const importQueueBtn = document.getElementById('importQueueBtn');
  const queueImportInput = document.getElementById('queueImportInput');
  const queueStatsTotal = document.getElementById('queueStatsTotal');
  const queueStatsQueued = document.getElementById('queueStatsQueued');
  const queueStatsRendering = document.getElementById('queueStatsRendering');
  const queueStatsComplete = document.getElementById('queueStatsComplete');
  const queueStatsError = document.getElementById('queueStatsError');

  // Update queue badge
  function updateQueueBadge() {
    const count = renderQueue.getJobCount();
    if (queueBadge) {
      queueBadge.textContent = count;
    }
  }

  // Update queue statistics
  function updateQueueStats() {
    const stats = renderQueue.getStatistics();
    if (queueStatsTotal) queueStatsTotal.textContent = stats.total;
    if (queueStatsQueued) queueStatsQueued.textContent = stats.queued;
    if (queueStatsRendering) queueStatsRendering.textContent = stats.rendering;
    if (queueStatsComplete) queueStatsComplete.textContent = stats.complete;
    if (queueStatsError) queueStatsError.textContent = stats.error;
  }

  // Render queue list UI
  function renderQueueList() {
    if (!queueList) return;

    const jobs = renderQueue.getAllJobs();

    if (jobs.length === 0) {
      queueEmpty.classList.remove('hidden');
      return;
    }

    queueEmpty.classList.add('hidden');

    // Clear existing items
    Array.from(queueList.children).forEach((child) => {
      if (!child.classList.contains('queue-empty')) {
        child.remove();
      }
    });

    // Render each job
    jobs.forEach((job) => {
      const jobElement = createQueueJobElement(job);
      queueList.appendChild(jobElement);
    });

    updateQueueStats();
  }

  // Create a queue job element
  function createQueueJobElement(job) {
    const div = document.createElement('div');
    div.className = `queue-item queue-item-${job.state}`;
    div.setAttribute('role', 'listitem');
    div.dataset.jobId = job.id;

    const stateIcon =
      {
        queued: '⏳',
        rendering: '⚙️',
        complete: '✅',
        error: '❌',
        cancelled: '⏹️',
      }[job.state] || '❓';

    const formatName =
      OUTPUT_FORMATS[job.outputFormat]?.name || job.outputFormat.toUpperCase();

    div.innerHTML = `
      <div class="queue-item-header">
        <span class="queue-item-icon">${stateIcon}</span>
        <span class="queue-item-name" contenteditable="${job.state === 'queued' ? 'true' : 'false'}" data-job-id="${job.id}">${job.name}</span>
        <span class="queue-item-format">${formatName}</span>
        <span class="queue-item-state">${job.state}</span>
      </div>
      <div class="queue-item-body">
        ${job.error ? `<div class="queue-item-error">${job.error}</div>` : ''}
        ${job.renderTime ? `<div class="queue-item-time">Render time: ${(job.renderTime / 1000).toFixed(1)}s</div>` : ''}
        ${job.result?.stats?.triangles ? `<div class="queue-item-stats">${job.result.stats.triangles.toLocaleString()} triangles</div>` : ''}
      </div>
      <div class="queue-item-actions">
        ${job.state === 'complete' ? `<button class="btn btn-sm btn-primary" data-action="download" data-job-id="${job.id}" aria-label="Download ${job.name}">📥 Download</button>` : ''}
        ${job.state === 'queued' ? `<button class="btn btn-sm btn-outline" data-action="edit" data-job-id="${job.id}" aria-label="Edit ${job.name} parameters">✏️ Edit</button>` : ''}
        ${job.state === 'queued' ? `<button class="btn btn-sm btn-outline" data-action="cancel" data-job-id="${job.id}" aria-label="Cancel ${job.name}">⏹️ Cancel</button>` : ''}
        ${job.state !== 'rendering' ? `<button class="btn btn-sm btn-outline" data-action="remove" data-job-id="${job.id}" aria-label="Remove ${job.name}">🗑️ Remove</button>` : ''}
      </div>
    `;

    return div;
  }

  // Subscribe to queue changes
  renderQueue.subscribe((event, data) => {
    updateQueueBadge();

    if (queueModal && !queueModal.classList.contains('hidden')) {
      renderQueueList();
    }

    // Handle processing events
    if (event === 'processing-start') {
      if (processQueueBtn) {
        processQueueBtn.classList.add('hidden');
      }
      if (stopQueueBtn) {
        stopQueueBtn.classList.remove('hidden');
      }
    } else if (
      event === 'processing-complete' ||
      event === 'processing-stopped'
    ) {
      if (processQueueBtn) {
        processQueueBtn.classList.remove('hidden');
      }
      if (stopQueueBtn) {
        stopQueueBtn.classList.add('hidden');
      }

      if (event === 'processing-complete') {
        updateStatus(
          `Queue processing complete: ${data.completed} succeeded, ${data.failed} failed`
        );
      }
    }
  });

  // Add to Queue button
  addToQueueBtn?.addEventListener('click', () => {
    const state = stateManager.getState();

    if (!state.uploadedFile) {
      alert('No file uploaded yet');
      return;
    }

    if (renderQueue.isAtMaxCapacity()) {
      alert('Queue is full (maximum 20 jobs)');
      return;
    }

    // Get current output format
    const outputFormat = outputFormatSelect?.value || 'stl';
    const count = renderQueue.getJobCount() + 1;
    const jobName = `Job ${count}`;

    // Set project for queue
    const libsForRender = getEnabledLibrariesForRender();
    renderQueue.setProject(
      state.uploadedFile.content,
      state.projectFiles,
      state.mainFilePath,
      libsForRender
    );

    // Add job
    const jobId = renderQueue.addJob(jobName, state.parameters, outputFormat);
    console.log(`Added job ${jobId} to queue`);

    updateStatus(`Added "${jobName}" to render queue`);
  });

  // View Queue button
  viewQueueBtn?.addEventListener('click', () => {
    if (queueModal) {
      queueModal.classList.remove('hidden');
      renderQueueList();
    }
  });

  // Close modal handlers
  queueModalClose?.addEventListener('click', () => {
    if (queueModal) {
      queueModal.classList.add('hidden');
    }
  });

  queueModalOverlay?.addEventListener('click', () => {
    if (queueModal) {
      queueModal.classList.add('hidden');
    }
  });

  // Process Queue button
  processQueueBtn?.addEventListener('click', async () => {
    try {
      await renderQueue.processQueue();
    } catch (error) {
      console.error('Queue processing error:', error);
      updateStatus(`Queue processing error: ${error.message}`);
    }
  });

  // Stop Queue button
  stopQueueBtn?.addEventListener('click', () => {
    renderQueue.stopProcessing();
    updateStatus('Queue processing stopped');
  });

  // Clear Completed button
  clearCompletedBtn?.addEventListener('click', () => {
    renderQueue.clearCompleted();
    renderQueueList();
    updateStatus('Cleared completed jobs');
  });

  // Clear All button
  clearQueueBtn?.addEventListener('click', () => {
    if (renderQueue.isQueueProcessing()) {
      alert('Cannot clear queue while processing');
      return;
    }

    if (renderQueue.getJobCount() === 0) {
      return;
    }

    if (confirm('Are you sure you want to clear all jobs from the queue?')) {
      renderQueue.clearAll();
      renderQueueList();
      updateStatus('Cleared all jobs');
    }
  });

  // Export Queue button
  exportQueueBtn?.addEventListener('click', () => {
    const data = renderQueue.exportQueue();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `render-queue-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    updateStatus('Exported queue to JSON');
  });

  // Import Queue button
  importQueueBtn?.addEventListener('click', () => {
    queueImportInput?.click();
  });

  // Queue import handler
  queueImportInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      renderQueue.importQueue(data);
      renderQueueList();
      updateStatus('Imported queue from JSON');
    } catch (error) {
      console.error('Queue import error:', error);
      alert('Failed to import queue: ' + error.message);
    }

    // Clear file input
    queueImportInput.value = '';
  });

  // Queue item action handlers (event delegation)
  queueList?.addEventListener('click', async (e) => {
    const button = e.target.closest('button[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    const jobId = button.dataset.jobId;
    const job = renderQueue.getJob(jobId);

    if (!job) return;

    switch (action) {
      case 'download':
        if (job.result?.data) {
          const state = stateManager.getState();
          const filename = generateFilename(
            `${state.uploadedFile.name.replace('.scad', '')}-${job.name}`,
            job.parameters,
            job.outputFormat
          );
          downloadFile(job.result.data, filename, job.outputFormat);
          updateStatus(`Downloaded: ${filename}`);
        }
        break;

      case 'edit': {
        // Close modal and load job parameters
        queueModal.classList.add('hidden');
        stateManager.setState({ parameters: { ...job.parameters } });

        // Re-render parameter UI
        const editState = stateManager.getState();
        if (editState.schema) {
          const parametersContainer = document.getElementById(
            'parametersContainer'
          );
          renderParameterUI(editState.schema, parametersContainer, (values) => {
            stateManager.setState({ parameters: values });
            if (autoPreviewController && editState.uploadedFile) {
              autoPreviewController.onParameterChange(values);
            }
            updatePrimaryActionButton();
          });
        }

        updateStatus(`Editing ${job.name} parameters`);
        break;
      }

      case 'cancel':
        renderQueue.cancelJob(jobId);
        renderQueueList();
        break;

      case 'remove':
        try {
          renderQueue.removeJob(jobId);
          renderQueueList();
        } catch (error) {
          alert(error.message);
        }
        break;
    }
  });

  // Job name editing (contenteditable)
  queueList?.addEventListener(
    'blur',
    (e) => {
      if (
        e.target.classList.contains('queue-item-name') &&
        e.target.hasAttribute('contenteditable')
      ) {
        const jobId = e.target.dataset.jobId;
        const newName = e.target.textContent.trim();

        if (newName) {
          renderQueue.renameJob(jobId, newName);
        } else {
          // Restore original name if empty
          const job = renderQueue.getJob(jobId);
          e.target.textContent = job.name;
        }
      }
    },
    true
  );

  // ========== COMPARISON MODE ==========

  // Initialize comparison controller
  comparisonController = new ComparisonController(
    stateManager,
    renderController,
    {
      maxVariants: 4,
    }
  );

  const comparisonViewContainer = document.getElementById('comparisonView');
  comparisonView = new ComparisonView(
    comparisonViewContainer,
    comparisonController,
    {
      theme: themeManager.getActiveTheme(),
      highContrast: themeManager.highContrast,
    }
  );

  // Listen to theme changes and update comparison view
  themeManager.addListener((_themePref, activeTheme, highContrast) => {
    if (comparisonView) {
      comparisonView.updateTheme(activeTheme, highContrast);
    }
  });

  // Add to Comparison button
  const addToComparisonBtn = document.getElementById('addToComparisonBtn');
  addToComparisonBtn?.addEventListener('click', () => {
    const state = stateManager.getState();

    if (!state.uploadedFile) {
      alert('No file uploaded yet');
      return;
    }

    // Check if at max capacity - if so, just enter comparison mode without adding
    if (comparisonController.isAtMaxCapacity()) {
      enterComparisonMode();
      updateStatus('Entered comparison mode (at max variants)');
      return;
    }

    // Generate variant name
    const count = comparisonController.getVariantCount() + 1;
    const variantName = `Variant ${count}`;

    // Add variant
    const variantId = comparisonController.addVariant(
      variantName,
      state.parameters
    );
    console.log(`Added variant ${variantId}:`, variantName);

    // Switch to comparison mode
    enterComparisonMode();

    updateStatus(`Added "${variantName}" to comparison`);
  });

  // Comparison mode event listeners
  window.addEventListener('comparison:add-variant', (e) => {
    const state = stateManager.getState();
    if (!state.uploadedFile) return;

    const count = comparisonController.getVariantCount() + 1;
    const providedName = e?.detail?.variantName;
    const variantName =
      typeof providedName === 'string' && providedName.trim()
        ? providedName.trim()
        : `Variant ${count}`;

    comparisonController.addVariant(variantName, state.parameters);

    updateStatus(`Added "${variantName}" to comparison`);
  });

  window.addEventListener('comparison:exit', () => {
    exitComparisonMode();
  });

  window.addEventListener('comparison:download-variant', (e) => {
    const { variant } = e.detail;
    if (variant && variant.stl) {
      const state = stateManager.getState();
      const filename = generateFilename(
        `${state.uploadedFile.name.replace('.scad', '')}-${variant.name}`,
        variant.parameters
      );

      // Get selected output format
      const format = outputFormatSelect ? outputFormatSelect.value : 'stl';
      downloadFile(variant.stl, filename, format);
      updateStatus(`Downloaded: ${filename}`);
    }
  });

  window.addEventListener('comparison:edit-variant', (e) => {
    const { variantId } = e.detail;
    const variant = comparisonController.getVariant(variantId);

    if (variant) {
      // Exit comparison mode and load variant parameters
      exitComparisonMode();
      stateManager.setState({ parameters: { ...variant.parameters } });

      // Re-render parameter UI
      const state = stateManager.getState();
      if (state.schema) {
        renderParameterUI(state.schema, state.parameters);
      }

      updateStatus(`Editing ${variant.name}`);
    }
  });

  function enterComparisonMode() {
    const state = stateManager.getState();
    stateManager.setState({ comparisonMode: true });

    // Set project content for comparison controller
    const libsForRender = getEnabledLibrariesForRender();
    comparisonController.setProject(
      state.uploadedFile.content,
      state.projectFiles,
      state.mainFilePath,
      libsForRender
    );

    // Hide main interface, show comparison view
    mainInterface.classList.add('hidden');
    comparisonViewContainer.classList.remove('hidden');

    // Initialize comparison view
    comparisonView.init();

    console.log('[Comparison] Entered comparison mode');
  }

  function exitComparisonMode() {
    stateManager.setState({ comparisonMode: false });

    // Show main interface, hide comparison view
    mainInterface.classList.remove('hidden');
    comparisonViewContainer.classList.add('hidden');

    // Optionally clear variants or keep them
    // comparisonController.clearAll();

    console.log('[Comparison] Exited comparison mode');
    updateStatus('Exited comparison mode');
  }

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
      presetSelect.innerHTML =
        '<option value="">-- No model loaded --</option>';
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
      const description = modal
        .querySelector('#presetDescription')
        .value.trim();

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

    const presetsHTML =
      presets.length === 0
        ? '<div class="preset-empty">No presets saved for this model</div>'
        : presets
            .map(
              (preset) => `
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
        `
            )
            .join('');

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
          const parametersContainer = document.getElementById(
            'parametersContainer'
          );
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
            preset.parameters // Pass preset values as initial values
          );

          // Trigger auto-preview with new parameters
          if (autoPreviewController) {
            autoPreviewController.onParameterChange(preset.parameters);
          }
          updatePrimaryActionButton();

          // Track the currently loaded preset and update dropdown to show it
          stateManager.setState({
            currentPresetId: presetId,
            currentPresetName: preset.name,
          });
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
              alert(
                `Imported ${result.imported} preset(s)${result.skipped > 0 ? ` (${result.skipped} skipped)` : ''}`
              );
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
      const parametersContainer = document.getElementById(
        'parametersContainer'
      );
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
        preset.parameters // Pass preset values as initial values
      );

      // Trigger auto-preview with new parameters
      if (autoPreviewController) {
        autoPreviewController.onParameterChange(preset.parameters);
      }
      updatePrimaryActionButton();

      // Track the currently loaded preset (for showing name in dropdown)
      stateManager.setState({
        currentPresetId: presetId,
        currentPresetName: preset.name,
      });
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
  presetManager.subscribe((action, _preset, _modelName) => {
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

  // ========== ADVANCED MENU ==========

  // View Source Button
  const viewSourceBtn = document.getElementById('viewSourceBtn');
  const copySourceBtn = document.getElementById('copySourceBtn');
  const sourceViewerModal = document.getElementById('sourceViewerModal');
  const sourceViewerClose = document.getElementById('sourceViewerClose');
  const sourceViewerOverlay = document.getElementById('sourceViewerOverlay');
  const sourceViewerContent = document.getElementById('sourceViewerContent');
  const sourceViewerCopy = document.getElementById('sourceViewerCopy');
  const sourceViewerInfo = document.getElementById('sourceViewerInfo');

  viewSourceBtn?.addEventListener('click', () => {
    const state = stateManager.getState();
    if (!state.uploadedFile) {
      alert('No file uploaded');
      return;
    }

    // Show modal
    sourceViewerModal.classList.remove('hidden');
    sourceViewerContent.value = state.uploadedFile.content;

    // Show file info
    const lineCount = state.uploadedFile.content.split('\n').length;
    const charCount = state.uploadedFile.content.length;
    sourceViewerInfo.innerHTML = `
      <span>📄 ${state.uploadedFile.name}</span>
      <span>📏 ${lineCount.toLocaleString()} lines</span>
      <span>📊 ${charCount.toLocaleString()} characters</span>
    `;

    // Focus textarea for accessibility
    setTimeout(() => sourceViewerContent.focus(), 100);
  });

  copySourceBtn?.addEventListener('click', async () => {
    const state = stateManager.getState();
    if (!state.uploadedFile) {
      alert('No file uploaded');
      return;
    }

    try {
      await navigator.clipboard.writeText(state.uploadedFile.content);
      copySourceBtn.textContent = '✅ Copied!';
      updateStatus('Source code copied to clipboard');
      setTimeout(() => {
        copySourceBtn.textContent = '📋 Copy Source';
      }, 2000);
    } catch (error) {
      console.error('Failed to copy source:', error);
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = state.uploadedFile.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      copySourceBtn.textContent = '✅ Copied!';
      setTimeout(() => {
        copySourceBtn.textContent = '📋 Copy Source';
      }, 2000);
    }
  });

  // Source viewer modal close handlers
  sourceViewerClose?.addEventListener('click', () => {
    sourceViewerModal.classList.add('hidden');
  });

  sourceViewerOverlay?.addEventListener('click', () => {
    sourceViewerModal.classList.add('hidden');
  });

  sourceViewerCopy?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(sourceViewerContent.value);
      sourceViewerCopy.textContent = '✅ Copied!';
      setTimeout(() => {
        sourceViewerCopy.textContent = '📋 Copy';
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  });

  // Unlock Limits Toggle
  const unlockLimitsToggle = document.getElementById('unlockLimitsToggle');
  unlockLimitsToggle?.addEventListener('change', (e) => {
    const unlocked = e.target.checked;
    setLimitsUnlocked(unlocked);

    if (unlocked) {
      updateStatus(
        '⚠️ Parameter limits unlocked - values outside normal range allowed'
      );
    } else {
      updateStatus('Parameter limits restored to defaults');
    }
  });

  // Reset All Button (in Advanced Menu)
  const resetAllBtn = document.getElementById('resetAllBtn');
  resetAllBtn?.addEventListener('click', () => {
    // Same as main reset button
    resetBtn?.click();
  });

  // Reset Group Button
  const resetGroupBtn = document.getElementById('resetGroupBtn');
  const resetGroupSelector = document.getElementById('resetGroupSelector');
  const resetGroupSelect = document.getElementById('resetGroupSelect');
  const confirmResetGroupBtn = document.getElementById('confirmResetGroupBtn');

  resetGroupBtn?.addEventListener('click', () => {
    const state = stateManager.getState();
    if (!state.schema || !state.schema.groups) {
      alert('No model loaded');
      return;
    }

    // Populate group selector
    resetGroupSelect.innerHTML = '';
    state.schema.groups.forEach((group) => {
      const option = document.createElement('option');
      option.value = group.id;
      option.textContent = group.label;
      resetGroupSelect.appendChild(option);
    });

    // Show selector
    resetGroupSelector.classList.remove('hidden');
  });

  confirmResetGroupBtn?.addEventListener('click', () => {
    const state = stateManager.getState();
    const groupId = resetGroupSelect.value;

    if (!groupId || !state.schema) return;

    // Record state for undo
    stateManager.recordParameterState();

    // Find parameters in this group and reset them
    const defaults = getAllDefaults();
    const newParams = { ...state.parameters };
    let resetCount = 0;

    Object.values(state.schema.parameters).forEach((param) => {
      if (param.group === groupId && defaults[param.name] !== undefined) {
        newParams[param.name] = defaults[param.name];
        resetCount++;
      }
    });

    stateManager.setState({ parameters: newParams });

    // Re-render UI
    const parametersContainer = document.getElementById('parametersContainer');
    renderParameterUI(
      state.schema,
      parametersContainer,
      (values) => {
        stateManager.recordParameterState();
        stateManager.setState({ parameters: values });
        clearPresetSelection();
        if (autoPreviewController && state.uploadedFile) {
          autoPreviewController.onParameterChange(values);
        }
        updatePrimaryActionButton();
      },
      newParams
    );

    // Trigger auto-preview
    if (autoPreviewController && state.uploadedFile) {
      autoPreviewController.onParameterChange(newParams);
    }

    // Hide selector and update status
    resetGroupSelector.classList.add('hidden');
    const groupLabel =
      state.schema.groups.find((g) => g.id === groupId)?.label || groupId;
    updateStatus(
      `Reset ${resetCount} parameters in "${groupLabel}" to defaults`
    );
    updatePrimaryActionButton();
  });

  // View Params JSON Button
  const viewParamsJsonBtn = document.getElementById('viewParamsJsonBtn');
  const paramsJsonModal = document.getElementById('paramsJsonModal');
  const paramsJsonClose = document.getElementById('paramsJsonClose');
  const paramsJsonOverlay = document.getElementById('paramsJsonOverlay');
  const paramsJsonContent = document.getElementById('paramsJsonContent');
  const paramsJsonCopy = document.getElementById('paramsJsonCopy');

  viewParamsJsonBtn?.addEventListener('click', () => {
    const state = stateManager.getState();
    if (!state.uploadedFile) {
      alert('No file uploaded');
      return;
    }

    // Format parameters as JSON
    const json = JSON.stringify(state.parameters, null, 2);
    paramsJsonContent.value = json;
    paramsJsonModal.classList.remove('hidden');

    // Focus textarea for accessibility
    setTimeout(() => paramsJsonContent.focus(), 100);
  });

  paramsJsonClose?.addEventListener('click', () => {
    paramsJsonModal.classList.add('hidden');
  });

  paramsJsonOverlay?.addEventListener('click', () => {
    paramsJsonModal.classList.add('hidden');
  });

  paramsJsonCopy?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(paramsJsonContent.value);
      paramsJsonCopy.textContent = '✅ Copied!';
      updateStatus('Parameters JSON copied to clipboard');
      setTimeout(() => {
        paramsJsonCopy.textContent = '📋 Copy';
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  });

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!sourceViewerModal.classList.contains('hidden')) {
        sourceViewerModal.classList.add('hidden');
      }
      if (!paramsJsonModal.classList.contains('hidden')) {
        paramsJsonModal.classList.add('hidden');
      }
    }
  });

  // ========== END ADVANCED MENU ==========

  // Global keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    const state = stateManager.getState();

    // Ctrl/Cmd + Z: Undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      if (state.uploadedFile && stateManager.canUndo()) {
        e.preventDefault();
        undoBtn?.click();
      }
    }

    // Ctrl/Cmd + Shift + Z: Redo (also Ctrl/Cmd + Y)
    if (
      (e.ctrlKey || e.metaKey) &&
      ((e.key === 'z' && e.shiftKey) || e.key === 'y')
    ) {
      if (state.uploadedFile && stateManager.canRedo()) {
        e.preventDefault();
        redoBtn?.click();
      }
    }

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
      if (
        target.tagName !== 'INPUT' &&
        target.tagName !== 'TEXTAREA' &&
        target.tagName !== 'SELECT'
      ) {
        if (state.uploadedFile) {
          e.preventDefault();
          resetBtn.click();
        }
      }
    }

    // D key: Download STL (when button is in download mode)
    if (e.key === 'd' && !e.ctrlKey && !e.metaKey) {
      const target = e.target;
      if (
        target.tagName !== 'INPUT' &&
        target.tagName !== 'TEXTAREA' &&
        target.tagName !== 'SELECT'
      ) {
        if (state.stl && primaryActionBtn.dataset.action === 'download') {
          e.preventDefault();
          primaryActionBtn.click();
        }
      }
    }

    // G key: Generate STL (when button is in generate mode)
    if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
      const target = e.target;
      if (
        target.tagName !== 'INPUT' &&
        target.tagName !== 'TEXTAREA' &&
        target.tagName !== 'SELECT'
      ) {
        if (
          state.uploadedFile &&
          primaryActionBtn.dataset.action === 'generate' &&
          !primaryActionBtn.disabled
        ) {
          e.preventDefault();
          primaryActionBtn.click();
        }
      }
    }
  });

  updateStatus('Ready - Upload a file to begin');
}

// PWA Install Button Helper
function showInstallButton(deferredPrompt) {
  // Check if install button already exists
  let installBtn = document.getElementById('pwaInstallBtn');

  if (!installBtn) {
    // Create install button
    installBtn = document.createElement('button');
    installBtn.id = 'pwaInstallBtn';
    installBtn.className = 'btn btn-outline pwa-install-btn';
    installBtn.innerHTML = '📲 Install App';
    installBtn.setAttribute('aria-label', 'Install this app for offline use');
    installBtn.setAttribute('title', 'Install for offline use');

    // Add to header controls
    const headerControls = document.querySelector('.header-controls');
    if (headerControls) {
      headerControls.insertBefore(installBtn, headerControls.firstChild);
    }
  }

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      console.warn('[PWA] Install prompt not available');
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User response to install prompt: ${outcome}`);

    if (outcome === 'accepted') {
      console.log('[PWA] User accepted the install prompt');
    } else {
      console.log('[PWA] User dismissed the install prompt');
    }

    // Clear the prompt (can only be used once)
    deferredPrompt = null;
  });
}

function hideInstallButton() {
  const installBtn = document.getElementById('pwaInstallBtn');
  if (installBtn) {
    installBtn.remove();
  }
}

// PWA Update Notification Helper
function showUpdateNotification(registration) {
  // Create update notification
  const notification = document.createElement('div');
  notification.className = 'pwa-update-notification';
  notification.setAttribute('role', 'alert');
  notification.innerHTML = `
    <div class="pwa-update-content">
      <span class="pwa-update-icon">🔄</span>
      <div class="pwa-update-text">
        <strong>Update Available</strong>
        <p>A new version of the app is ready to install.</p>
      </div>
      <div class="pwa-update-actions">
        <button class="btn btn-sm btn-primary" id="pwaUpdateBtn">Update Now</button>
        <button class="btn btn-sm btn-outline" id="pwaUpdateDismiss">Later</button>
      </div>
    </div>
  `;

  document.body.appendChild(notification);

  // Handle update button
  const updateBtn = notification.querySelector('#pwaUpdateBtn');
  updateBtn.addEventListener('click', () => {
    const waiting = registration.waiting;
    if (waiting) {
      // Tell the service worker to skip waiting
      waiting.postMessage({ type: 'SKIP_WAITING' });

      // Reload the page when the new service worker takes control
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  });

  // Handle dismiss button
  const dismissBtn = notification.querySelector('#pwaUpdateDismiss');
  dismissBtn.addEventListener('click', () => {
    notification.remove();
  });

  // Auto-dismiss after 30 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 30000);
}

// Library UI Rendering
function renderLibraryUI(detectedLibraries) {
  const libraryControls = document.getElementById('libraryControls');
  const libraryList = document.getElementById('libraryList');
  const libraryBadge = document.getElementById('libraryBadge');

  if (!libraryControls || !libraryList || !libraryBadge) {
    console.warn('Library UI elements not found');
    return;
  }

  // Show library controls
  libraryControls.classList.remove('hidden');

  // Update badge count
  libraryBadge.textContent = libraryManager.getEnabled().length;

  // Clear existing list
  libraryList.innerHTML = '';

  // Get all libraries
  const allLibraries = Object.values(LIBRARY_DEFINITIONS);

  // Render library checkboxes
  allLibraries.forEach((lib) => {
    const isDetected = detectedLibraries.includes(lib.id);
    const isEnabled = libraryManager.isEnabled(lib.id);

    const libraryItem = document.createElement('label');
    libraryItem.className = 'library-item';
    if (isDetected) {
      libraryItem.classList.add('library-detected');
    }

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `library-${lib.id}`;
    checkbox.checked = isEnabled;
    checkbox.setAttribute('data-library-id', lib.id);

    const icon = document.createElement('span');
    icon.className = 'library-icon';
    icon.textContent = lib.icon;
    icon.setAttribute('aria-hidden', 'true');

    const info = document.createElement('span');
    info.className = 'library-info';

    const name = document.createElement('strong');
    name.className = 'library-name';
    name.textContent = lib.name;
    if (isDetected) {
      const badge = document.createElement('span');
      badge.className = 'library-required-badge';
      badge.textContent = 'required';
      badge.setAttribute('aria-label', 'Required by this model');
      name.appendChild(badge);
    }

    const desc = document.createElement('span');
    desc.className = 'library-description';
    desc.textContent = lib.description;

    info.appendChild(name);
    info.appendChild(desc);

    libraryItem.appendChild(checkbox);
    libraryItem.appendChild(icon);
    libraryItem.appendChild(info);

    libraryList.appendChild(libraryItem);

    // Add event listener
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        libraryManager.enable(lib.id);
      } else {
        libraryManager.disable(lib.id);
      }
      libraryBadge.textContent = libraryManager.getEnabled().length;
      // Update status area with library toggle feedback
      const statusArea = document.getElementById('statusArea');
      if (statusArea) {
        statusArea.textContent = `${lib.name} ${checkbox.checked ? 'enabled' : 'disabled'}`;
      }
    });
  });

  // Add library help button handler
  const libraryHelpBtn = document.getElementById('libraryHelpBtn');
  if (libraryHelpBtn) {
    libraryHelpBtn.addEventListener('click', () => {
      alert(
        'OpenSCAD Libraries\n\n' +
          'Libraries provide reusable components and functions for your models.\n\n' +
          'Common libraries:\n' +
          '• MCAD: Mechanical components (gears, screws, bearings)\n' +
          '• BOSL2: Advanced geometry and attachments\n' +
          '• NopSCADlib: 3D printer parts library\n' +
          '• dotSCAD: Artistic patterns and designs\n\n' +
          'Enable libraries that your model uses with include/use statements.\n' +
          'Required libraries are auto-detected and marked.'
      );
    });
  }
}

// Update auto-preview to include libraries
function getEnabledLibrariesForRender() {
  const paths = libraryManager.getMountPaths();
  return paths;
}

// Expose key managers to window for testing and debugging
if (typeof window !== 'undefined') {
  window.stateManager = stateManager;
  window.presetManager = presetManager;
  window.themeManager = themeManager;
  window.libraryManager = libraryManager;
}

// Start the app
initApp();
