/**
 * Auto-Preview Controller - Progressive enhancement for real-time visual feedback
 * @license GPL-3.0-or-later
 */

/**
 * Preview state constants
 */
export const PREVIEW_STATE = {
  IDLE: 'idle',           // No file loaded
  CURRENT: 'current',     // Preview matches current parameters
  PENDING: 'pending',     // Parameter changed, render scheduled
  RENDERING: 'rendering', // Preview render in progress
  STALE: 'stale',        // Preview exists but from different params
  ERROR: 'error',        // Last render failed
};

/**
 * Auto-Preview Controller
 * Manages debounced auto-rendering with caching for progressive enhancement
 */
export class AutoPreviewController {
  /**
   * Create an AutoPreviewController
   * @param {RenderController} renderController - The render controller instance
   * @param {PreviewManager} previewManager - The 3D preview manager instance
   * @param {Object} options - Configuration options
   */
  constructor(renderController, previewManager, options = {}) {
    this.renderController = renderController;
    this.previewManager = previewManager;
    
    // Configuration
    this.debounceMs = options.debounceMs ?? 1500;
    this.maxCacheSize = options.maxCacheSize ?? 10;
    this.enabled = options.enabled ?? true;
    this.previewQuality = options.previewQuality ?? null;
    
    // State
    this.state = PREVIEW_STATE.IDLE;
    this.debounceTimer = null;
    this.currentScadContent = null;
    this.currentParamHash = null;
    this.previewParamHash = null;
    this.fullRenderParamHash = null;
    this.scadVersion = 0;

    // If params change while a render is in progress, keep the latest requested params here.
    this.pendingParameters = null;
    this.pendingParamHash = null;
    
    // Cache: paramHash -> { stl, stats, timestamp }
    this.previewCache = new Map();
    
    // Full quality STL for download (separate from preview)
    this.fullQualitySTL = null;
    this.fullQualityStats = null;
    
    // Callbacks
    this.onStateChange = options.onStateChange || (() => {});
    this.onPreviewReady = options.onPreviewReady || (() => {});
    this.onProgress = options.onProgress || (() => {});
    this.onError = options.onError || (() => {});
  }

  /**
   * Simple hash function for parameter comparison
   * @param {Object} params - Parameters object
   * @returns {string} Hash string
   */
  hashParams(params) {
    return JSON.stringify(params);
  }

  /**
   * Set the current state and notify listeners
   * @param {string} newState - New state value
   * @param {Object} extra - Extra data to pass to callback
   */
  setState(newState, extra = {}) {
    const prevState = this.state;
    this.state = newState;
    this.onStateChange(newState, prevState, extra);
  }

  /**
   * Enable or disable auto-preview
   * @param {boolean} enabled - Whether auto-preview is enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled && this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Set the SCAD content (called when file is loaded)
   * @param {string} scadContent - OpenSCAD source code
   */
  setScadContent(scadContent) {
    // New file/content loaded: cancel any existing work and bump version so in-flight results are ignored.
    this.scadVersion += 1;
    this.cancelPending();
    this.currentScadContent = scadContent;
    this.clearCache();
    this.currentParamHash = null;
    this.pendingParameters = null;
    this.pendingParamHash = null;
    this.setState(PREVIEW_STATE.IDLE);
  }

  /**
   * Set preview quality preset (preview-only; full-quality export unaffected)
   * Clears preview cache because geometry can change at same parameters.
   * @param {Object|null} qualityPreset - Render quality preset (e.g. RENDER_QUALITY.PREVIEW / DRAFT / HIGH)
   */
  setPreviewQuality(qualityPreset) {
    this.previewQuality = qualityPreset;
    this.clearPreviewCache();
    if (this.currentParamHash) {
      this.setState(PREVIEW_STATE.STALE);
    }
  }

  /**
   * Called when any parameter changes
   * Triggers debounced auto-preview if enabled
   * @param {Object} parameters - Current parameter values
   */
  onParameterChange(parameters) {
    if (!this.currentScadContent) return;
    
    const paramHash = this.hashParams(parameters);
    this.currentParamHash = paramHash;
    
    // Check if preview is already current
    if (paramHash === this.previewParamHash && this.state === PREVIEW_STATE.CURRENT) {
      return;
    }
    
    // Check cache first
    if (this.previewCache.has(paramHash)) {
      this.loadCachedPreview(paramHash);
      return;
    }
    
    // Mark preview as stale if we have one
    if (this.previewParamHash && this.state === PREVIEW_STATE.CURRENT) {
      this.setState(PREVIEW_STATE.STALE);
    }
    
    // If auto-preview disabled, just mark as stale/pending
    if (!this.enabled) {
      if (this.previewParamHash) {
        this.setState(PREVIEW_STATE.STALE);
      } else {
        this.setState(PREVIEW_STATE.PENDING);
      }
      return;
    }
    
    // If a render is already in progress, don't start another one (RenderController disallows it).
    // Instead, store the latest requested params and we'll render immediately when the current render completes.
    if (this.renderController?.isBusy?.()) {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      this.pendingParameters = parameters;
      this.pendingParamHash = paramHash;
      this.setState(PREVIEW_STATE.PENDING);
      return;
    }

    // Update state to pending
    this.setState(PREVIEW_STATE.PENDING);
    
    // Cancel existing debounce
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    // Schedule new preview render
    this.debounceTimer = setTimeout(() => {
      this.renderPreview(parameters, paramHash);
    }, this.debounceMs);
  }

  /**
   * Load a cached preview
   * @param {string} paramHash - Parameter hash to load
   */
  async loadCachedPreview(paramHash) {
    const cached = this.previewCache.get(paramHash);
    if (!cached) return;
    
    try {
      await this.previewManager.loadSTL(cached.stl);
      this.previewParamHash = paramHash;
      this.setState(PREVIEW_STATE.CURRENT, { 
        cached: true, 
        stats: cached.stats 
      });
      this.onPreviewReady(cached.stl, cached.stats, true);
    } catch (error) {
      console.error('Failed to load cached preview:', error);
      // Remove from cache and try fresh render
      this.previewCache.delete(paramHash);
      this.renderPreview(JSON.parse(paramHash), paramHash);
    }
  }

  /**
   * Render preview with reduced quality
   * @param {Object} parameters - Parameter values
   * @param {string} paramHash - Parameter hash
   */
  async renderPreview(parameters, paramHash) {
    const localScadVersion = this.scadVersion;
    // Check if this render is still relevant
    if (paramHash !== this.currentParamHash) {
      console.log('[AutoPreview] Skipping stale render request');
      return;
    }
    
    this.setState(PREVIEW_STATE.RENDERING);
    
    try {
      const result = await this.renderController.renderPreview(
        this.currentScadContent,
        parameters,
        {
          ...(this.previewQuality ? { quality: this.previewQuality } : {}),
          onProgress: (percent, message) => {
            this.onProgress(percent, message, 'preview');
          },
        }
      );

      // If the file changed mid-render, ignore this result.
      if (localScadVersion !== this.scadVersion) return;
      
      // Check if still relevant after render completes
      if (paramHash !== this.currentParamHash) {
        console.log('[AutoPreview] Discarding stale render result');
        return;
      }
      
      // Cache the result
      this.addToCache(paramHash, result);
      this.previewParamHash = paramHash;
      
      // Load into 3D preview
      await this.previewManager.loadSTL(result.stl);
      
      this.setState(PREVIEW_STATE.CURRENT, { stats: result.stats });
      this.onPreviewReady(result.stl, result.stats, false);
      
    } catch (error) {
      console.error('[AutoPreview] Preview render failed:', error);

      // If the file changed mid-render, ignore this error.
      if (localScadVersion !== this.scadVersion) return;

      // Treat cancellations as non-errors (common during rapid changes / file switching).
      const msg = (error?.message || String(error)).toLowerCase();
      if (msg.includes('cancel')) {
        return;
      }
      
      // Check if still relevant
      if (paramHash !== this.currentParamHash) return;
      
      this.setState(PREVIEW_STATE.ERROR, { error: error.message });
      this.onError(error, 'preview');
    } finally {
      if (localScadVersion !== this.scadVersion) return;
      // If parameters changed during this render, immediately render the latest once we are free.
      // (OpenSCAD WASM render is blocking in the worker, so "cancel" can't interrupt mid-render.)
      if (this.pendingParamHash && this.pendingParamHash === this.currentParamHash) {
        const nextParams = this.pendingParameters;
        const nextHash = this.pendingParamHash;
        this.pendingParameters = null;
        this.pendingParamHash = null;

        // Avoid re-entrancy: render on next tick.
        setTimeout(() => {
          this.renderPreview(nextParams, nextHash);
        }, 0);
      }
    }
  }

  /**
   * Add result to cache, evicting old entries if needed
   * @param {string} paramHash - Parameter hash
   * @param {Object} result - Render result { stl, stats }
   */
  addToCache(paramHash, result) {
    // Evict oldest entries if cache is full
    while (this.previewCache.size >= this.maxCacheSize) {
      const oldestKey = this.previewCache.keys().next().value;
      this.previewCache.delete(oldestKey);
    }
    
    this.previewCache.set(paramHash, {
      stl: result.stl,
      stats: result.stats,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear the preview cache
   */
  clearCache() {
    this.previewCache.clear();
    this.previewParamHash = null;
    this.fullRenderParamHash = null;
    this.fullQualitySTL = null;
    this.fullQualityStats = null;
  }

  /**
   * Clear only preview cache (keep full-quality export cache intact)
   */
  clearPreviewCache() {
    this.previewCache.clear();
    this.previewParamHash = null;
  }

  /**
   * Render full quality for download
   * @param {Object} parameters - Parameter values
   * @returns {Promise<Object>} Render result with STL and stats
   */
  async renderFull(parameters) {
    const paramHash = this.hashParams(parameters);
    
    // Check if we already have full quality for these params
    if (paramHash === this.fullRenderParamHash && this.fullQualitySTL) {
      return {
        stl: this.fullQualitySTL,
        stats: this.fullQualityStats,
        cached: true,
      };
    }
    
    // Perform full render
    const result = await this.renderController.renderFull(
      this.currentScadContent,
      parameters,
      {
        onProgress: (percent, message) => {
          this.onProgress(percent, message, 'full');
        },
      }
    );
    
    // Store for reuse
    this.fullQualitySTL = result.stl;
    this.fullQualityStats = result.stats;
    this.fullRenderParamHash = paramHash;
    
    // Also update the preview with full quality result
    try {
      await this.previewManager.loadSTL(result.stl);
      this.previewParamHash = paramHash;
      this.addToCache(paramHash, result);
      this.setState(PREVIEW_STATE.CURRENT, { 
        stats: result.stats,
        fullQuality: true 
      });
    } catch (error) {
      console.warn('[AutoPreview] Failed to update preview with full render:', error);
    }
    
    return result;
  }

  /**
   * Check if we need a full render for the current parameters
   * @param {Object} parameters - Current parameter values
   * @returns {boolean} True if full render is needed
   */
  needsFullRender(parameters) {
    const paramHash = this.hashParams(parameters);
    return paramHash !== this.fullRenderParamHash || !this.fullQualitySTL;
  }

  /**
   * Get the current full quality STL if available and current
   * @param {Object} parameters - Current parameter values
   * @returns {Object|null} { stl, stats } or null if not available
   */
  getCurrentFullSTL(parameters) {
    const paramHash = this.hashParams(parameters);
    if (paramHash === this.fullRenderParamHash && this.fullQualitySTL) {
      return {
        stl: this.fullQualitySTL,
        stats: this.fullQualityStats,
      };
    }
    return null;
  }

  /**
   * Cancel any pending preview render
   */
  cancelPending() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    this.pendingParameters = null;
    this.pendingParamHash = null;
    
    // Cancel in-progress render
    this.renderController.cancel();
  }

  /**
   * Force an immediate preview render
   * @param {Object} parameters - Parameter values
   * @returns {Promise<boolean>} True if render was initiated, false if skipped
   */
  async forcePreview(parameters) {
    // Defensive check: ensure we have content to render
    if (!this.currentScadContent) {
      console.warn('[AutoPreview] forcePreview called but no SCAD content set');
      return false;
    }
    
    this.cancelPending();
    
    // If a render is already in progress, queue this as pending
    if (this.renderController?.isBusy?.()) {
      console.log('[AutoPreview] forcePreview: render in progress, queuing as pending');
      const paramHash = this.hashParams(parameters);
      this.pendingParameters = parameters;
      this.pendingParamHash = paramHash;
      this.currentParamHash = paramHash;
      this.setState(PREVIEW_STATE.PENDING);
      return true; // Will render when current render completes
    }
    
    const paramHash = this.hashParams(parameters);
    this.currentParamHash = paramHash;
    await this.renderPreview(parameters, paramHash);
    return true;
  }

  /**
   * Get current state information
   * @returns {Object} State info
   */
  getStateInfo() {
    return {
      state: this.state,
      enabled: this.enabled,
      hasPendingRender: !!this.debounceTimer,
      hasPreview: !!this.previewParamHash,
      hasFullSTL: !!this.fullQualitySTL,
      cacheSize: this.previewCache.size,
      isPreviewCurrent: this.currentParamHash === this.previewParamHash,
      isFullCurrent: this.currentParamHash === this.fullRenderParamHash,
    };
  }
}
