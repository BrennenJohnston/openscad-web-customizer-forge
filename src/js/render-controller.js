/**
 * Render Controller - Orchestrates OpenSCAD WASM rendering
 * @license GPL-3.0-or-later
 */

export class RenderController {
  constructor() {
    this.worker = null;
    this.requestId = 0;
    this.currentRequest = null;
    this.ready = false;
    this.initPromise = null;
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
   * Render OpenSCAD to STL
   * @param {string} scadContent - OpenSCAD source code
   * @param {Object} parameters - Parameter overrides
   * @param {Object} options - Render options
   * @param {number} options.timeoutMs - Timeout in milliseconds
   * @param {Function} options.onProgress - Progress callback
   * @returns {Promise<Object>} Render result with STL data and stats
   */
  async render(scadContent, parameters = {}, options = {}) {
    if (!this.ready) {
      throw new Error('Worker not ready. Call init() first.');
    }

    if (this.currentRequest) {
      throw new Error('Render already in progress. Cancel first.');
    }

    const requestId = `render-${++this.requestId}`;
    const timeoutMs = options.timeoutMs || 60000;

    return new Promise((resolve, reject) => {
      this.currentRequest = {
        id: requestId,
        resolve,
        reject,
        onProgress: options.onProgress,
      };

      this.worker.postMessage({
        type: 'RENDER',
        payload: {
          requestId,
          scadContent,
          parameters,
          timeoutMs,
          outputFormat: 'binstl',
        },
      });
    });
  }

  /**
   * Cancel current render
   */
  cancel() {
    if (this.currentRequest) {
      this.worker.postMessage({
        type: 'CANCEL',
        payload: { requestId: this.currentRequest.id },
      });
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
