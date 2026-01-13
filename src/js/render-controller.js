/**
 * Render Controller - Orchestrates OpenSCAD WASM rendering
 * @license GPL-3.0-or-later
 */

/**
 * Render quality presets
 */
export const RENDER_QUALITY = {
  DRAFT: {
    name: 'draft',
    maxFn: 16,        // Force a lower $fn for faster interactive preview
    forceFn: true,
    minFa: 12,        // Increase $fa (min angle) to reduce tessellation
    minFs: 2,         // Increase $fs (min size) to reduce tessellation
    timeoutMs: 20000, // Shorter timeout for draft preview
  },
  PREVIEW: {
    name: 'preview',
    maxFn: 24,        // Cap $fn at 24 for faster preview
    forceFn: false,   // Don't force $fn unless the model/user already sets it
    minFa: null,
    minFs: null,
    timeoutMs: 30000, // 30 second timeout for preview
  },
  HIGH: {
    name: 'high',
    maxFn: 64,        // Higher cap for smoother preview (can be slower)
    forceFn: false,
    minFa: null,
    minFs: null,
    timeoutMs: 45000,
  },
  FULL: {
    name: 'full',
    maxFn: null,      // No cap, use model's $fn
    forceFn: false,
    minFa: null,
    minFs: null,
    timeoutMs: 60000, // 60 second timeout for full render
  },
};

export class RenderController {
  constructor() {
    this.worker = null;
    this.requestId = 0;
    this.currentRequest = null;
    this.ready = false;
    this.initPromise = null;
  }

  /**
   * Whether a render is currently in progress.
   * (Note: OpenSCAD WASM renderToStl is blocking inside the worker, so we can't truly interrupt it mid-render.)
   * @returns {boolean}
   */
  isBusy() {
    return !!this.currentRequest;
  }

  /**
   * Initialize the Web Worker
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      try {
        // Create worker
        this.worker = new Worker(
          new URL('../worker/openscad-worker.js', import.meta.url),
          { type: 'module' }
        );

        // Set up message handler
        this.worker.onmessage = (e) => {
          this.handleMessage(e.data);
        };

        this.worker.onerror = (error) => {
          console.error('[RenderController] Worker error:', error);
          reject(error);
        };

        // Send init message
        this.worker.postMessage({ type: 'INIT' });

        // Set up ready handler
        this.readyResolve = resolve;
        this.readyReject = reject;

        // Timeout for initialization
        setTimeout(() => {
          if (!this.ready) {
            reject(new Error('Worker initialization timeout'));
          }
        }, 30000); // 30 second timeout for init
      } catch (error) {
        console.error('[RenderController] Failed to create worker:', error);
        reject(error);
      }
    });

    return this.initPromise;
  }

  /**
   * Restart the worker (workaround for OpenSCAD WASM state corruption between renders)
   * @returns {Promise<void>}
   */
  async restart() {
    this.terminate();
    this.initPromise = null;
    this.ready = false;
    await this.init();
  }

  /**
   * Handle messages from worker
   * @param {Object} message - Message from worker
   */
  handleMessage(message) {
    const { type, payload } = message;

    switch (type) {
      case 'READY':
        this.ready = true;
        console.log('[RenderController] Worker ready');
        if (this.readyResolve) {
          this.readyResolve();
        }
        break;

      case 'PROGRESS':
        if (this.currentRequest && this.currentRequest.onProgress) {
          this.currentRequest.onProgress(payload.percent, payload.message);
        }
        break;

      case 'COMPLETE':
        if (this.currentRequest && payload.requestId === this.currentRequest.id) {
          this.currentRequest.resolve(payload);
          this.currentRequest = null;
        }
        break;

      case 'ERROR':
        if (this.currentRequest && payload.requestId === this.currentRequest.id) {
          this.currentRequest.reject(new Error(payload.message));
          this.currentRequest = null;
        } else if (payload.requestId === 'init' && this.readyReject) {
          this.readyReject(new Error(payload.message));
        }
        break;

      default:
        console.warn('[RenderController] Unknown message type:', type);
    }
  }

  /**
   * Apply quality settings to parameters
   * @param {Object} parameters - Original parameters
   * @param {Object} quality - Quality preset (RENDER_QUALITY.PREVIEW or RENDER_QUALITY.FULL)
   * @returns {Object} Parameters with quality adjustments
   */
  applyQualitySettings(parameters, quality) {
    const adjusted = { ...parameters };
    
    // Cap $fn if quality has a maxFn limit
    if (quality.maxFn !== null && adjusted.$fn !== undefined) {
      adjusted.$fn = Math.min(adjusted.$fn, quality.maxFn);
    }
    
    // Optionally force $fn even if the model didn't set it (useful for draft/fast previews)
    if (quality.maxFn !== null && adjusted.$fn === undefined && quality.forceFn) {
      adjusted.$fn = quality.maxFn;
    }

    // $fa: smaller = smoother, larger = faster. For faster preview, enforce a minimum $fa.
    if (quality.minFa !== null && quality.minFa !== undefined) {
      if (adjusted.$fa === undefined) {
        adjusted.$fa = quality.minFa;
      } else {
        adjusted.$fa = Math.max(adjusted.$fa, quality.minFa);
      }
    }

    // $fs: smaller = smoother, larger = faster. For faster preview, enforce a minimum $fs.
    if (quality.minFs !== null && quality.minFs !== undefined) {
      if (adjusted.$fs === undefined) {
        adjusted.$fs = quality.minFs;
      } else {
        adjusted.$fs = Math.max(adjusted.$fs, quality.minFs);
      }
    }
    
    return adjusted;
  }

  /**
   * Render OpenSCAD to STL
   * @param {string} scadContent - OpenSCAD source code
   * @param {Object} parameters - Parameter overrides
   * @param {Object} options - Render options
   * @param {number} options.timeoutMs - Timeout in milliseconds
   * @param {Function} options.onProgress - Progress callback
   * @param {Object} options.quality - Quality preset (optional, defaults to FULL)
   * @param {Map<string, string>} options.files - Additional files for multi-file projects
   * @param {string} options.mainFile - Main file path (for multi-file projects)
   * @returns {Promise<Object>} Render result with STL data and stats
   */
  async render(scadContent, parameters = {}, options = {}) {
    const quality = options.quality || RENDER_QUALITY.FULL;
    const adjustedParams = this.applyQualitySettings(parameters, quality);
    const timeoutMs = options.timeoutMs || quality.timeoutMs;

    const shouldRetryOnce = (err) => {
      const msg = err?.message || String(err);
      // Pattern we see in logs: "Failed to render model: 1101176" (numeric code, no stack)
      return /^Failed to render model:\s*\d+/.test(msg);
    };

    const renderOnce = async () => {
      if (!this.ready) {
        throw new Error('Worker not ready. Call init() first.');
      }

      if (this.currentRequest) {
        throw new Error('Render already in progress. Cancel first.');
      }

      const requestId = `render-${++this.requestId}`;

      return new Promise((resolve, reject) => {
        this.currentRequest = {
          id: requestId,
          resolve,
          reject,
          onProgress: options.onProgress,
        };

        // Convert Map to plain object if files are provided
        const filesObject = options.files ? Object.fromEntries(options.files) : undefined;
        
        this.worker.postMessage({
          type: 'RENDER',
          payload: {
            requestId,
            scadContent,
            parameters: adjustedParams,
            timeoutMs,
            outputFormat: 'binstl',
            files: filesObject,
            mainFile: options.mainFile,
          },
        });
      });
    };

    try {
      return await renderOnce();
    } catch (err) {
      if (!shouldRetryOnce(err)) {
        throw err;
      }
      await this.restart();
      return await renderOnce();
    }
  }

  /**
   * Render preview with reduced quality for faster feedback
   * @param {string} scadContent - OpenSCAD source code
   * @param {Object} parameters - Parameter overrides
   * @param {Object} options - Render options
   * @returns {Promise<Object>} Render result with STL data and stats
   */
  async renderPreview(scadContent, parameters = {}, options = {}) {
    const previewQuality = options.quality || RENDER_QUALITY.PREVIEW;
    return this.render(scadContent, parameters, {
      ...options,
      quality: previewQuality,
    });
  }

  /**
   * Render full quality for final export
   * @param {string} scadContent - OpenSCAD source code
   * @param {Object} parameters - Parameter overrides
   * @param {Object} options - Render options
   * @returns {Promise<Object>} Render result with STL data and stats
   */
  async renderFull(scadContent, parameters = {}, options = {}) {
    return this.render(scadContent, parameters, {
      ...options,
      quality: RENDER_QUALITY.FULL,
    });
  }

  /**
   * Cancel current render
   */
  cancel() {
    if (this.currentRequest) {
      const { id, reject } = this.currentRequest;
      this.worker.postMessage({
        type: 'CANCEL',
        payload: { requestId: id },
      });
      // Worker-side OpenSCAD render is blocking; we can't truly interrupt it mid-render.
      // But we must settle the promise to avoid leaks / hung awaits.
      reject(new Error('Render cancelled'));
      this.currentRequest = null;
    }
  }

  /**
   * Terminate the worker
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.ready = false;
      this.currentRequest = null;
    }
  }
}
