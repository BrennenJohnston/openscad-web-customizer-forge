/**
 * Ajv validation schemas for runtime boundary validation
 * @license GPL-3.0-or-later
 */

import Ajv from 'ajv';
import {
  FILE_SIZE_LIMITS,
  URL_PARAM_LIMITS,
  STORAGE_LIMITS,
} from './validation-constants.js';

// Initialize Ajv with options
const ajv = new Ajv({
  allErrors: true, // Collect all errors, not just first
  coerceTypes: true, // Auto-convert types (important for URL params)
  removeAdditional: false, // Keep extra properties
  useDefaults: true, // Apply default values from schema
  allowUnionTypes: true, // Allow "type: [..]" without strict warnings
});

/**
 * File upload validation schema
 */
const fileUploadSchema = {
  type: 'object',
  required: ['name', 'size'],
  properties: {
    name: { type: 'string', minLength: 1 },
    size: { type: 'number', minimum: 0 },
  },
  anyOf: [
    {
      properties: {
        name: { type: 'string', pattern: '\\.scad$' },
        size: { type: 'number', maximum: FILE_SIZE_LIMITS.SCAD_FILE },
      },
    },
    {
      properties: {
        name: { type: 'string', pattern: '\\.zip$' },
        size: { type: 'number', maximum: FILE_SIZE_LIMITS.ZIP_FILE },
      },
    },
  ],
};

/**
 * URL parameter validation schema (for model parameters from hash)
 * This validates individual parameter values, not the URL structure itself
 * Note: URL params are always strings, so we validate as string type
 */
const urlParamValueSchema = {
  type: 'string',
  maxLength: URL_PARAM_LIMITS.MAX_STRING_LENGTH,
};

/**
 * localStorage draft state validation schema
 */
const draftStateSchema = {
  type: 'object',
  required: ['fileName', 'fileContent'],
  properties: {
    fileName: { type: 'string', minLength: 1, maxLength: 255 },
    fileContent: { type: 'string', maxLength: STORAGE_LIMITS.MAX_DRAFT_SIZE },
    parameters: { type: 'object', default: {} },
    defaults: { type: 'object', default: {} },
    version: { type: ['number', 'string'], default: 1 },
    timestamp: { type: 'number', default: 0 },
  },
};

/**
 * localStorage preset validation schema
 */
const presetSchema = {
  type: 'object',
  required: ['name', 'parameters'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    parameters: { type: 'object' },
    version: { type: 'number', default: 1 },
    timestamp: { type: 'number', default: 0 },
  },
};

/**
 * localStorage presets collection validation schema
 */
const presetsCollectionSchema = {
  type: 'array',
  items: presetSchema,
  maxItems: STORAGE_LIMITS.MAX_PRESETS_COUNT,
};

/**
 * localStorage library enablement map validation schema
 */
const libraryMapSchema = {
  type: 'object',
  patternProperties: {
    '^[a-zA-Z0-9_-]+$': { type: 'boolean' },
  },
  additionalProperties: false,
};

// Compile validators
export const validateFileUpload = ajv.compile(fileUploadSchema);
export const validateUrlParamValue = ajv.compile(urlParamValueSchema);
export const validateDraftState = ajv.compile(draftStateSchema);
export const validatePreset = ajv.compile(presetSchema);
export const validatePresetsCollection = ajv.compile(presetsCollectionSchema);
export const validateLibraryMap = ajv.compile(libraryMapSchema);

/**
 * Validate URL params object (all values)
 * @param {Object} params - Parameter object to validate
 * @returns {{valid: boolean, sanitized: Object, errors: Array}}
 */
export function validateUrlParams(params) {
  if (!params || typeof params !== 'object') {
    return {
      valid: false,
      sanitized: {},
      errors: ['params must be an object'],
    };
  }

  const sanitized = {};
  const errors = [];

  for (const [key, value] of Object.entries(params)) {
    const valid = validateUrlParamValue(value);
    if (valid) {
      sanitized[key] = value;
    } else {
      errors.push(
        `Invalid value for parameter '${key}': ${JSON.stringify(value)}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    sanitized,
    errors,
  };
}

/**
 * Get user-friendly error messages from Ajv errors
 * @param {Array} errors - Ajv errors array
 * @returns {string}
 */
export function getValidationErrorMessage(errors) {
  if (!errors || errors.length === 0) return 'Validation failed';

  const messages = errors.map((err) => {
    const path = err.instancePath || err.dataPath || 'data';
    const message = err.message || 'invalid';
    return `${path}: ${message}`;
  });

  return messages.join('; ');
}
