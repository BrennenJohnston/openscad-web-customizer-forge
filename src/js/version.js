/**
 * Version and build information
 * Values are injected at build time by Vite
 * @license GPL-3.0-or-later
 */

/* global __APP_VERSION__, __BUILD_TIME__, __COMMIT_SHA__ */

/**
 * Application version from package.json
 * @type {string}
 */
export const APP_VERSION =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0-dev';

/**
 * Build timestamp (ISO 8601)
 * @type {string}
 */
export const BUILD_TIME =
  typeof __BUILD_TIME__ !== 'undefined'
    ? __BUILD_TIME__
    : new Date().toISOString();

/**
 * Git commit SHA (short or 'local' for dev builds)
 * @type {string}
 */
export const COMMIT_SHA =
  typeof __COMMIT_SHA__ !== 'undefined' ? __COMMIT_SHA__ : 'local';

/**
 * Get formatted version string for display
 * @returns {string} e.g., "v4.0.0" or "v4.0.0 (abc1234)"
 */
export function getVersionString() {
  const base = `v${APP_VERSION}`;
  if (COMMIT_SHA && COMMIT_SHA !== 'local') {
    return `${base} (${COMMIT_SHA.slice(0, 7)})`;
  }
  return base;
}

/**
 * Get build info object
 * @returns {{version: string, buildTime: string, commitSha: string}}
 */
export function getBuildInfo() {
  return {
    version: APP_VERSION,
    buildTime: BUILD_TIME,
    commitSha: COMMIT_SHA,
  };
}

/**
 * Check if this is a development build
 * @returns {boolean}
 */
export function isDevBuild() {
  return COMMIT_SHA === 'local' || APP_VERSION.includes('-dev');
}

/**
 * Log version info to console (for debugging)
 */
export function logVersionInfo() {
  console.log(
    `%cOpenSCAD Assistive Forge ${getVersionString()}`,
    'font-weight: bold; color: #4a9eff;'
  );
  console.log(`Build time: ${BUILD_TIME}`);
  if (isDevBuild()) {
    console.log('%cDevelopment build', 'color: orange;');
  }
}
