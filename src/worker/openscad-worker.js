/**
 * OpenSCAD WASM Web Worker
 * @license GPL-3.0-or-later
 */

import { createOpenSCAD } from 'openscad-wasm-prebuilt';

// Worker state
let openscadInstance = null;
let initialized = false;
let currentRenderTimeout = null;

/**
 * Escape a string for use in a RegExp
 * @param {string} s
 * @returns {string}
 */
function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Initialize OpenSCAD WASM
 */
async function initWASM() {
  try {
    self.postMessage({
      type: 'PROGRESS',
      payload: { requestId: 'init', percent: 0, message: 'Loading OpenSCAD engine...' },
    });

    // Initialize OpenSCAD WASM
    openscadInstance = await createOpenSCAD();
    initialized = true;

    self.postMessage({
      type: 'READY',
    });

    console.log('[Worker] OpenSCAD WASM initialized successfully');
  } catch (error) {
    console.error('[Worker] Failed to initialize OpenSCAD:', error);
    self.postMessage({
      type: 'ERROR',
      payload: {
        requestId: 'init',
        code: 'INIT_FAILED',
        message: 'Failed to initialize OpenSCAD engine',
        details: error.message,
      },
    });
  }
}

/**
 * Convert parameters to OpenSCAD variable assignments
 * @param {Object} parameters - Parameter key-value pairs
 * @returns {string} OpenSCAD variable assignments
 */
function parametersToScad(parameters) {
  if (!parameters || Object.keys(parameters).length === 0) {
    return '';
  }

  const assignments = Object.entries(parameters).map(([key, value]) => {
    // Handle different value types
    if (typeof value === 'string') {
      // Escape quotes in strings
      const escaped = value.replace(/"/g, '\\"');
      return `${key} = "${escaped}";`;
    } else if (typeof value === 'number') {
      return `${key} = ${value};`;
    } else if (typeof value === 'boolean') {
      return `${key} = ${value};`;
    } else {
      return `${key} = ${JSON.stringify(value)};`;
    }
  });

  return assignments.join('\n') + '\n\n';
}

/**
 * Apply parameter overrides by replacing existing assignments when possible.
 * This avoids the "assigned but overwritten" issue when prepending overrides.
 *
 * @param {string} scadContent
 * @param {Object} parameters
 * @returns {{scad: string, replacedKeys: string[], prependedKeys: string[]}}
 */
function applyOverrides(scadContent, parameters) {
  if (!parameters || Object.keys(parameters).length === 0) {
    return { scad: scadContent, replacedKeys: [], prependedKeys: [] };
  }

  let updated = scadContent;
  const replacedKeys = [];
  const prependedKeys = [];

  const formatValue = (value) => {
    if (typeof value === 'string') {
      const escaped = value.replace(/"/g, '\\"');
      return `"${escaped}"`;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return JSON.stringify(value);
  };

  for (const [key, value] of Object.entries(parameters)) {
    const keyRe = escapeRegExp(key);
    const assignmentValue = formatValue(value);
    const lineRe = new RegExp(
      `^(\\s*)(${keyRe})\\s*=\\s*[^;]*;([ \\t]*\\/\\/.*)?$`,
      'm'
    );

    if (lineRe.test(updated)) {
      updated = updated.replace(lineRe, `$1$2 = ${assignmentValue};$3`);
      replacedKeys.push(key);
    } else {
      prependedKeys.push(key);
    }
  }

  if (prependedKeys.length > 0) {
    const prependParams = {};
    for (const k of prependedKeys) prependParams[k] = parameters[k];
    updated = parametersToScad(prependParams) + updated;
  }

  return { scad: updated, replacedKeys, prependedKeys };
}

/**
 * Render OpenSCAD to STL
 */
async function render(payload) {
  const { requestId, scadContent, parameters, timeoutMs } = payload;

  try {
    self.postMessage({
      type: 'PROGRESS',
      payload: { requestId, percent: 10, message: 'Preparing model...' },
    });

    // Apply parameter overrides (replace-in-file when possible)
    const applied = applyOverrides(scadContent, parameters);
    const fullScadContent = applied.scad;

    console.log('[Worker] Rendering with parameters:', parameters);

    self.postMessage({
      type: 'PROGRESS',
      payload: { requestId, percent: 30, message: 'Compiling OpenSCAD...' },
    });

    // Set up timeout
    const timeoutPromise = new Promise((_, reject) => {
      currentRenderTimeout = setTimeout(() => {
        reject(new Error('Render timeout exceeded'));
      }, timeoutMs || 60000);
    });

    // Render to STL
    const renderPromise = (async () => {
      // Note: renderToStl is a blocking call - we can't get intermediate progress
      // Use indeterminate progress messaging
      self.postMessage({
        type: 'PROGRESS',
        payload: { requestId, percent: -1, message: 'Rendering model (this may take a while)...' },
      });

      const stlData = await openscadInstance.renderToStl(fullScadContent);

      self.postMessage({
        type: 'PROGRESS',
        payload: { requestId, percent: 95, message: 'Processing STL output...' },
      });

      return stlData;
    })();

    // Race between render and timeout
    const stlData = await Promise.race([renderPromise, timeoutPromise]);

    // Clear timeout
    if (currentRenderTimeout) {
      clearTimeout(currentRenderTimeout);
      currentRenderTimeout = null;
    }

    // Detect STL format and convert to ArrayBuffer
    let stlBuffer;
    let triangleCount = 0;
    let isAsciiStl = false;

    if (stlData instanceof ArrayBuffer) {
      stlBuffer = stlData;
    } else if (typeof stlData === 'string') {
      // ASCII STL format (starts with "solid")
      isAsciiStl = true;
      const encoder = new TextEncoder();
      stlBuffer = encoder.encode(stlData).buffer;
      // Count triangles in ASCII STL by counting "facet normal" occurrences
      triangleCount = (stlData.match(/facet normal/g) || []).length;
    } else if (stlData instanceof Uint8Array) {
      stlBuffer = stlData.buffer;
    } else {
      throw new Error('Unknown STL data format');
    }

    // For binary STL, read triangle count from header
    if (!isAsciiStl && stlBuffer.byteLength > 84) {
      const view = new DataView(stlBuffer);
      triangleCount = view.getUint32(80, true);
    }

    self.postMessage({
      type: 'COMPLETE',
      payload: {
        requestId,
        stl: stlBuffer,
        stats: {
          triangles: triangleCount,
          size: stlBuffer.byteLength,
        },
      },
    }, [stlBuffer]); // Transfer ownership of ArrayBuffer

    console.log('[Worker] Render complete:', triangleCount, 'triangles');
  } catch (error) {
    // Clear timeout on error
    if (currentRenderTimeout) {
      clearTimeout(currentRenderTimeout);
      currentRenderTimeout = null;
    }

    console.error('[Worker] Render failed:', error);

    // Handle both Error objects and raw error codes
    const errorMessage = error?.message || String(error);
    const isTimeout = errorMessage.includes('timeout');
    self.postMessage({
      type: 'ERROR',
      payload: {
        requestId,
        code: isTimeout ? 'TIMEOUT' : 'RENDER_FAILED',
        message: isTimeout 
          ? 'Render exceeded time limit. Try simplifying the model or reducing $fn value.'
          : 'Failed to render model: ' + errorMessage,
        details: error?.stack || String(error),
      },
    });
  }
}

/**
 * Cancel current render
 */
function cancelRender(requestId) {
  if (currentRenderTimeout) {
    clearTimeout(currentRenderTimeout);
    currentRenderTimeout = null;
    
    self.postMessage({
      type: 'ERROR',
      payload: {
        requestId,
        code: 'CANCELLED',
        message: 'Render cancelled by user',
      },
    });
  }
}

// Message handler
self.onmessage = async (e) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'INIT':
      await initWASM();
      break;

    case 'RENDER':
      if (!initialized) {
        self.postMessage({
          type: 'ERROR',
          payload: {
            requestId: payload.requestId,
            code: 'RENDER_FAILED',
            message: 'Worker not initialized. Please wait for initialization to complete.',
          },
        });
        return;
      }
      await render(payload);
      break;

    case 'CANCEL':
      cancelRender(payload.requestId);
      break;

    default:
      console.warn('[Worker] Unknown message type:', type);
  }
};
