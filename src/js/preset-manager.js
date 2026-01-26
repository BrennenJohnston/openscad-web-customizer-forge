/**
 * Preset Manager - Save and load parameter presets
 * @license GPL-3.0-or-later
 */

// Import validation at module level
let validatePresetsCollectionFn = null;
(async () => {
  const { validatePresetsCollection } = await import('./validation-schemas.js');
  validatePresetsCollectionFn = validatePresetsCollection;
})();

/**
 * PresetManager handles saving, loading, and managing parameter presets
 */
export class PresetManager {
  constructor() {
    this.storageKey = 'openscad-customizer-presets';
    this.presets = this.loadAllPresets();
    this.listeners = [];
  }

  /**
   * Get all presets for the current model
   * @param {string} modelName - Name of the model
   * @returns {Array} Array of presets for this model
   */
  getPresetsForModel(modelName) {
    if (!modelName) return [];
    return this.presets[modelName] || [];
  }

  /**
   * Save a new preset
   * @param {string} modelName - Name of the model
   * @param {string} presetName - Name for the preset
   * @param {Object} parameters - Parameter values to save
   * @param {Object} options - Optional metadata (description, etc.)
   * @returns {Object} The saved preset
   */
  savePreset(modelName, presetName, parameters, options = {}) {
    if (!modelName || !presetName || !parameters) {
      throw new Error('Model name, preset name, and parameters are required');
    }

    // Sanitize preset name
    const sanitized = presetName.trim();
    if (!sanitized) {
      throw new Error('Preset name cannot be empty');
    }

    // Initialize model presets if needed
    if (!this.presets[modelName]) {
      this.presets[modelName] = [];
    }

    // Check for duplicate name
    const existingIndex = this.presets[modelName].findIndex(
      (p) => p.name === sanitized
    );

    const preset = {
      id:
        existingIndex >= 0
          ? this.presets[modelName][existingIndex].id
          : this.generateId(),
      name: sanitized,
      parameters: { ...parameters },
      description: options.description || '',
      created:
        existingIndex >= 0
          ? this.presets[modelName][existingIndex].created
          : Date.now(),
      modified: Date.now(),
    };

    // Replace existing or add new
    if (existingIndex >= 0) {
      this.presets[modelName][existingIndex] = preset;
      console.log(`Updated preset: ${sanitized}`);
    } else {
      this.presets[modelName].push(preset);
      console.log(`Saved preset: ${sanitized}`);
    }

    this.persist();
    this.notifyListeners('save', preset, modelName);
    return preset;
  }

  /**
   * Load a preset by ID
   * @param {string} modelName - Name of the model
   * @param {string} presetId - ID of the preset
   * @returns {Object|null} The preset or null if not found
   */
  loadPreset(modelName, presetId) {
    if (!modelName || !presetId) return null;

    const modelPresets = this.presets[modelName];
    if (!modelPresets) return null;

    const preset = modelPresets.find((p) => p.id === presetId);
    if (preset) {
      console.log(`Loaded preset: ${preset.name}`);
      this.notifyListeners('load', preset, modelName);
    }
    return preset;
  }

  /**
   * Delete a preset
   * @param {string} modelName - Name of the model
   * @param {string} presetId - ID of the preset to delete
   * @returns {boolean} True if deleted successfully
   */
  deletePreset(modelName, presetId) {
    if (!modelName || !presetId) return false;

    const modelPresets = this.presets[modelName];
    if (!modelPresets) return false;

    const index = modelPresets.findIndex((p) => p.id === presetId);
    if (index < 0) return false;

    const deleted = modelPresets.splice(index, 1)[0];

    // Clean up empty model entries
    if (modelPresets.length === 0) {
      delete this.presets[modelName];
    }

    this.persist();
    console.log(`Deleted preset: ${deleted.name}`);
    this.notifyListeners('delete', deleted, modelName);
    return true;
  }

  /**
   * Rename a preset
   * @param {string} modelName - Name of the model
   * @param {string} presetId - ID of the preset
   * @param {string} newName - New name for the preset
   * @returns {boolean} True if renamed successfully
   */
  renamePreset(modelName, presetId, newName) {
    const preset = this.loadPreset(modelName, presetId);
    if (!preset) return false;

    const sanitized = newName.trim();
    if (!sanitized) return false;

    // Check for duplicate name
    const modelPresets = this.presets[modelName];
    const duplicate = modelPresets.find(
      (p) => p.id !== presetId && p.name === sanitized
    );
    if (duplicate) {
      throw new Error('A preset with this name already exists');
    }

    preset.name = sanitized;
    preset.modified = Date.now();
    this.persist();
    this.notifyListeners('rename', preset, modelName);
    return true;
  }

  /**
   * Export preset as JSON
   * @param {string} modelName - Name of the model
   * @param {string} presetId - ID of the preset
   * @returns {string} JSON string
   */
  exportPreset(modelName, presetId) {
    const preset = this.loadPreset(modelName, presetId);
    if (!preset) return null;

    const exportData = {
      version: '1.0.0',
      type: 'openscad-preset',
      modelName,
      preset: {
        name: preset.name,
        description: preset.description,
        parameters: preset.parameters,
        created: preset.created,
      },
      exported: Date.now(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export all presets for a model
   * @param {string} modelName - Name of the model
   * @returns {string} JSON string
   */
  exportAllPresets(modelName) {
    const presets = this.getPresetsForModel(modelName);
    if (!presets || presets.length === 0) return null;

    const exportData = {
      version: '1.0.0',
      type: 'openscad-presets-collection',
      modelName,
      presets: presets.map((p) => ({
        name: p.name,
        description: p.description,
        parameters: p.parameters,
        created: p.created,
      })),
      exported: Date.now(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import preset from JSON
   * @param {string} json - JSON string
   * @returns {Object} Import result with status and details
   */
  importPreset(json) {
    try {
      const data = JSON.parse(json);

      // Validate format
      if (!data.version || !data.type || !data.modelName) {
        throw new Error('Invalid preset file format');
      }

      let imported = 0;
      let skipped = 0;
      const results = [];

      if (data.type === 'openscad-preset') {
        // Single preset import
        const result = this.savePreset(
          data.modelName,
          data.preset.name,
          data.preset.parameters,
          { description: data.preset.description }
        );
        imported = 1;
        results.push(result);
      } else if (data.type === 'openscad-presets-collection') {
        // Multiple presets import
        for (const preset of data.presets) {
          try {
            const result = this.savePreset(
              data.modelName,
              preset.name,
              preset.parameters,
              { description: preset.description }
            );
            imported++;
            results.push(result);
          } catch (error) {
            console.warn(`Skipped preset ${preset.name}:`, error.message);
            skipped++;
          }
        }
      } else {
        throw new Error('Unknown preset file type');
      }

      return {
        success: true,
        imported,
        skipped,
        modelName: data.modelName,
        presets: results,
      };
    } catch (error) {
      console.error('Failed to import preset:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Load all presets from localStorage
   * @returns {Object} All presets organized by model name
   */
  loadAllPresets() {
    if (!this.isStorageAvailable()) {
      return {};
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return {};

      const data = JSON.parse(stored);

      // Validate presets collections with Ajv (if available)
      if (validatePresetsCollectionFn) {
        const validatedData = {};

        for (const [modelName, presets] of Object.entries(data)) {
          const isValid = validatePresetsCollectionFn(presets);
          if (isValid) {
            validatedData[modelName] = presets;
          } else {
            console.warn(
              `[LocalStorage] Invalid presets for model '${modelName}', skipping:`,
              validatePresetsCollectionFn.errors
            );
          }
        }

        console.log(
          `Loaded ${Object.keys(validatedData).length} model preset collections`
        );
        return validatedData;
      }

      // Fallback if validation not yet loaded
      console.log(
        `Loaded ${Object.keys(data).length} model preset collections (validation pending)`
      );
      return data;
    } catch (error) {
      console.error('Failed to load presets from localStorage:', error);
      return {};
    }
  }

  /**
   * Persist presets to localStorage
   */
  persist() {
    if (!this.isStorageAvailable()) {
      console.warn('localStorage not available, presets not saved');
      return;
    }

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.presets));
      console.log('Presets saved to localStorage');
    } catch (error) {
      console.error('Failed to save presets to localStorage:', error);
      if (error.name === 'QuotaExceededError') {
        alert('Storage quota exceeded. Some presets may not be saved.');
      }
    }
  }

  /**
   * Clear all presets (dangerous!)
   * @param {string} modelName - Optional: clear only for specific model
   */
  clearPresets(modelName = null) {
    if (modelName) {
      delete this.presets[modelName];
      console.log(`Cleared presets for model: ${modelName}`);
    } else {
      this.presets = {};
      console.log('Cleared all presets');
    }
    this.persist();
    this.notifyListeners('clear', null, modelName);
  }

  /**
   * Subscribe to preset changes
   * @param {Function} callback - Called with (action, preset, modelName)
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Notify all listeners of changes
   */
  notifyListeners(action, preset, modelName) {
    this.listeners.forEach((callback) => {
      try {
        callback(action, preset, modelName);
      } catch (error) {
        console.error('Preset listener error:', error);
      }
    });
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if localStorage is available
   */
  isStorageAvailable() {
    try {
      const test = '__preset_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get statistics about presets
   * @returns {Object} Statistics
   */
  getStats() {
    const modelCount = Object.keys(this.presets).length;
    let totalPresets = 0;
    for (const modelName in this.presets) {
      totalPresets += this.presets[modelName].length;
    }
    return {
      modelCount,
      totalPresets,
      models: Object.keys(this.presets),
    };
  }
}

// Create singleton instance
export const presetManager = new PresetManager();
