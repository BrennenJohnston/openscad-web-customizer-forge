/**
 * Download Manager - STL file download
 * @license GPL-3.0-or-later
 */

/**
 * Generate a short hash from a string
 * @param {string} str - String to hash
 * @returns {string} Short hash (6 chars)
 */
function shortHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36).substring(0, 6);
}

/**
 * Generate filename for STL download
 * @param {string} modelName - Name of the model
 * @param {Object} parameters - Parameter values
 * @returns {string} Filename
 */
export function generateFilename(modelName, parameters) {
  const sanitized = modelName
    .replace(/\.scad$/, '')
    .replace(/[^a-z0-9_-]/gi, '_')
    .toLowerCase();
  const hash = shortHash(JSON.stringify(parameters));
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  return `${sanitized}-${hash}-${date}.stl`;
}

/**
 * Download STL file
 * @param {ArrayBuffer} arrayBuffer - STL data
 * @param {string} filename - Filename
 */
export function downloadSTL(arrayBuffer, filename) {
  const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
