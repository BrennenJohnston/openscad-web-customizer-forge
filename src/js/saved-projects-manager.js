/**
 * Saved Projects Manager
 * Manages persistent saved projects with IndexedDB (preferred) and localStorage fallback
 * @license GPL-3.0-or-later
 */

import {
  validateSavedProject,
  validateSavedProjectsCollection,
  getValidationErrorMessage,
} from './validation-schemas.js';
import { STORAGE_LIMITS } from './validation-constants.js';

const DB_NAME = 'openscad-forge-saved-projects';
const DB_VERSION = 1;
const STORE_NAME = 'projects';
const LS_KEY = 'openscad-saved-projects';
const SCHEMA_VERSION = 1;

let db = null;
let storageType = null; // 'indexeddb' or 'localstorage'
let initPromise = null; // Track initialization promise to avoid race conditions

/**
 * Generate a simple UUID-like ID
 * @returns {string}
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Ensure the database is initialized before any operation
 * @returns {Promise<void>}
 */
async function ensureInitialized() {
  if (storageType !== null && (storageType === 'localstorage' || db !== null)) {
    return; // Already initialized
  }

  // If initialization is in progress, wait for it
  if (initPromise) {
    await initPromise;
    return;
  }

  // Re-initialize if needed
  console.warn('[Saved Projects] Re-initializing database connection');
  await initSavedProjectsDB();
}

/**
 * Initialize IndexedDB database
 * @returns {Promise<{available: boolean, type: string}>}
 */
export async function initSavedProjectsDB() {
  // If already initialized with a valid connection, return early
  if (storageType === 'indexeddb' && db !== null) {
    return { available: true, type: 'indexeddb' };
  }
  if (storageType === 'localstorage') {
    return { available: true, type: 'localstorage' };
  }

  // Check if IndexedDB is available
  if (!window.indexedDB) {
    console.warn('[Saved Projects] IndexedDB not available, falling back to localStorage');
    storageType = 'localstorage';
    return { available: true, type: 'localstorage' };
  }

  // Create and track the initialization promise
  initPromise = (async () => {
    try {
      return await new Promise((resolve, _reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          console.warn(
            '[Saved Projects] IndexedDB open failed, falling back to localStorage:',
            request.error
          );
          db = null;
          storageType = 'localstorage';
          resolve({ available: true, type: 'localstorage' });
        };

        request.onsuccess = () => {
          db = request.result;
          storageType = 'indexeddb';
          console.log('[Saved Projects] IndexedDB initialized successfully');

          // Handle connection errors (e.g., database deleted while in use)
          db.onerror = (event) => {
            console.error('[Saved Projects] IndexedDB error:', event.target.error);
          };

          // Handle version change (another tab upgraded the database)
          db.onversionchange = () => {
            console.warn('[Saved Projects] Database version changed, closing connection');
            db.close();
            db = null;
          };

          resolve({ available: true, type: 'indexeddb' });
        };

        request.onupgradeneeded = (event) => {
          console.log('[Saved Projects] Upgrading database schema');
          const database = event.target.result;

          // Create object store if it doesn't exist
          if (!database.objectStoreNames.contains(STORE_NAME)) {
            const objectStore = database.createObjectStore(STORE_NAME, {
              keyPath: 'id',
            });
            objectStore.createIndex('savedAt', 'savedAt', { unique: false });
            objectStore.createIndex('lastLoadedAt', 'lastLoadedAt', {
              unique: false,
            });
          }
        };

        request.onblocked = () => {
          console.warn('[Saved Projects] IndexedDB blocked - close other tabs and try again');
        };
      });
    } catch (error) {
      console.warn(
        '[Saved Projects] IndexedDB initialization error, falling back to localStorage:',
        error
      );
      db = null;
      storageType = 'localstorage';
      return { available: true, type: 'localstorage' };
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

/**
 * Get all saved projects from IndexedDB
 * @returns {Promise<Array>}
 */
async function getFromIndexedDB() {
  // If db connection is lost, try to reconnect
  if (!db) {
    console.warn('[Saved Projects] IndexedDB connection lost, attempting reconnect');
    await initSavedProjectsDB();

    // If still no connection after reinit, return empty
    if (!db) {
      console.warn('[Saved Projects] Could not reconnect to IndexedDB');
      return [];
    }
  }

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => {
        console.error('[Saved Projects] Error reading from IndexedDB:', request.error);
        reject(request.error);
      };

      transaction.onerror = () => {
        console.error('[Saved Projects] Transaction error:', transaction.error);
        reject(transaction.error);
      };
    } catch (error) {
      console.error('[Saved Projects] Exception reading from IndexedDB:', error);
      // Connection might be invalid, reset it
      db = null;
      reject(error);
    }
  });
}

/**
 * Save project to IndexedDB
 * @param {Object} project
 * @returns {Promise<void>}
 */
async function saveToIndexedDB(project) {
  if (!db) throw new Error('IndexedDB not initialized');

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.put(project);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete project from IndexedDB
 * @param {string} id
 * @returns {Promise<void>}
 */
async function deleteFromIndexedDB(id) {
  if (!db) throw new Error('IndexedDB not initialized');

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all projects from IndexedDB
 * @returns {Promise<void>}
 */
async function clearIndexedDB() {
  if (!db) return;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all saved projects from localStorage
 * @returns {Array}
 */
function getFromLocalStorage() {
  try {
    const data = localStorage.getItem(LS_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading saved projects from localStorage:', error);
    return [];
  }
}

/**
 * Save all projects to localStorage
 * @param {Array} projects
 */
function saveToLocalStorage(projects) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error('Error saving projects to localStorage:', error);
    throw new Error('Failed to save to localStorage. Storage may be full.');
  }
}

/**
 * List all saved projects (metadata)
 * @returns {Promise<Array>} Array of project metadata sorted by lastLoadedAt desc
 */
export async function listSavedProjects() {
  try {
    // Ensure database is initialized
    await ensureInitialized();

    let projects = [];

    if (storageType === 'indexeddb') {
      try {
        projects = await getFromIndexedDB();
        console.log(`[Saved Projects] Retrieved ${projects.length} project(s) from IndexedDB`);
      } catch (indexedDbError) {
        console.error('[Saved Projects] IndexedDB read failed, trying localStorage:', indexedDbError);
        // Fall back to localStorage if IndexedDB fails
        projects = getFromLocalStorage();
        console.log(`[Saved Projects] Fallback: Retrieved ${projects.length} project(s) from localStorage`);
      }
    } else {
      projects = getFromLocalStorage();
      console.log(`[Saved Projects] Retrieved ${projects.length} project(s) from localStorage`);
    }

    // Sort by lastLoadedAt (most recent first), then savedAt
    projects.sort((a, b) => {
      if (b.lastLoadedAt !== a.lastLoadedAt) {
        return b.lastLoadedAt - a.lastLoadedAt;
      }
      return b.savedAt - a.savedAt;
    });

    return projects;
  } catch (error) {
    console.error('[Saved Projects] Error listing saved projects:', error);
    return [];
  }
}

/**
 * Save a new project
 * @param {Object} options - Project details
 * @param {string} options.name - Display name
 * @param {string} options.originalName - Original file name
 * @param {string} options.kind - 'scad' or 'zip'
 * @param {string} options.mainFilePath - Main file path (for zip)
 * @param {string} options.content - Main file content
 * @param {Object} [options.projectFiles] - Optional: zip files map
 * @param {string} [options.notes] - Optional: user notes
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function saveProject({
  name,
  originalName,
  kind,
  mainFilePath,
  content,
  projectFiles = null,
  notes = '',
}) {
  try {
    // Ensure database is initialized
    await ensureInitialized();

    // Check project count limit
    const existingProjects = await listSavedProjects();
    if (existingProjects.length >= STORAGE_LIMITS.MAX_SAVED_PROJECTS_COUNT) {
      return {
        success: false,
        error: `Maximum saved projects limit reached (${STORAGE_LIMITS.MAX_SAVED_PROJECTS_COUNT}). Please delete some projects first.`,
      };
    }

    // Validate project size
    const contentSize = new Blob([content]).size;
    if (contentSize > STORAGE_LIMITS.MAX_SAVED_PROJECT_SIZE) {
      return {
        success: false,
        error: `Project content exceeds maximum size of ${STORAGE_LIMITS.MAX_SAVED_PROJECT_SIZE / (1024 * 1024)}MB`,
      };
    }

    // Create project record
    const now = Date.now();
    const project = {
      id: generateId(),
      schemaVersion: SCHEMA_VERSION,
      name: name || originalName,
      originalName,
      kind,
      mainFilePath,
      content,
      projectFiles: projectFiles ? JSON.stringify(projectFiles) : null,
      notes: notes || '',
      savedAt: now,
      lastLoadedAt: now,
    };

    // Validate against schema
    const valid = validateSavedProject(project);
    if (!valid) {
      const errorMsg = getValidationErrorMessage(validateSavedProject.errors);
      return {
        success: false,
        error: `Validation failed: ${errorMsg}`,
      };
    }

    // Save to storage with dual-write for redundancy
    if (storageType === 'indexeddb') {
      try {
        await saveToIndexedDB(project);
        console.log(`[Saved Projects] Project saved to IndexedDB: ${project.name}`);
      } catch (indexedDbError) {
        console.error('[Saved Projects] IndexedDB save failed:', indexedDbError);
        // Fall back to localStorage
        const projects = getFromLocalStorage();
        projects.push(project);
        saveToLocalStorage(projects);
        console.log(`[Saved Projects] Fallback: Project saved to localStorage: ${project.name}`);
      }

      // Also save to localStorage as backup (best-effort, ignore errors)
      try {
        const lsProjects = getFromLocalStorage();
        // Don't add duplicates
        if (!lsProjects.find((p) => p.id === project.id)) {
          lsProjects.push(project);
          saveToLocalStorage(lsProjects);
          console.log('[Saved Projects] Backup copy saved to localStorage');
        }
      } catch (lsError) {
        // localStorage backup failed - not critical
        console.warn('[Saved Projects] localStorage backup failed:', lsError.message);
      }
    } else {
      const projects = getFromLocalStorage();
      projects.push(project);
      saveToLocalStorage(projects);
      console.log(`[Saved Projects] Project saved to localStorage: ${project.name}`);
    }

    return { success: true, id: project.id };
  } catch (error) {
    console.error('[Saved Projects] Error saving project:', error);
    return {
      success: false,
      error: error.message || 'Failed to save project',
    };
  }
}

/**
 * Get a saved project by ID
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getProject(id) {
  try {
    // Ensure database is initialized
    await ensureInitialized();

    let project = null;

    // Try IndexedDB first
    if (storageType === 'indexeddb') {
      try {
        const projects = await getFromIndexedDB();
        project = projects.find((p) => p.id === id);
      } catch (indexedDbError) {
        console.error('[Saved Projects] IndexedDB read failed:', indexedDbError);
      }
    }

    // Fall back to localStorage if not found in IndexedDB
    if (!project) {
      const lsProjects = getFromLocalStorage();
      project = lsProjects.find((p) => p.id === id);
      if (project && storageType === 'indexeddb') {
        console.log('[Saved Projects] Project found in localStorage fallback');
      }
    }

    if (
      project &&
      project.projectFiles &&
      typeof project.projectFiles === 'string'
    ) {
      // Parse projectFiles back to object
      try {
        project.projectFiles = JSON.parse(project.projectFiles);
      } catch (e) {
        console.error('[Saved Projects] Error parsing projectFiles:', e);
        project.projectFiles = null;
      }
    }

    return project || null;
  } catch (error) {
    console.error('[Saved Projects] Error getting project:', error);
    return null;
  }
}

/**
 * Update lastLoadedAt timestamp for a project
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function touchProject(id) {
  try {
    // Ensure database is initialized
    await ensureInitialized();

    const project = await getProject(id);
    if (!project) return false;

    project.lastLoadedAt = Date.now();

    if (storageType === 'indexeddb') {
      // Re-serialize projectFiles if needed
      if (project.projectFiles && typeof project.projectFiles === 'object') {
        project.projectFiles = JSON.stringify(project.projectFiles);
      }
      try {
        await saveToIndexedDB(project);
      } catch (indexedDbError) {
        console.error('[Saved Projects] IndexedDB touch failed:', indexedDbError);
      }
    }

    // Also update localStorage (dual-write)
    const lsProjects = getFromLocalStorage();
    const index = lsProjects.findIndex((p) => p.id === id);
    if (index >= 0) {
      lsProjects[index].lastLoadedAt = project.lastLoadedAt;
      try {
        saveToLocalStorage(lsProjects);
      } catch (lsError) {
        console.warn('[Saved Projects] localStorage touch failed:', lsError.message);
      }
    }

    return true;
  } catch (error) {
    console.error('[Saved Projects] Error touching project:', error);
    return false;
  }
}

/**
 * Update project metadata (name and/or notes)
 * @param {Object} options
 * @param {string} options.id - Project ID
 * @param {string} [options.name] - New name
 * @param {string} [options.notes] - New notes
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateProject({ id, name, notes }) {
  try {
    // Ensure database is initialized
    await ensureInitialized();

    const project = await getProject(id);
    if (!project) {
      return { success: false, error: 'Project not found' };
    }

    if (name !== undefined) {
      project.name = name;
    }
    if (notes !== undefined) {
      if (notes.length > STORAGE_LIMITS.MAX_NOTES_LENGTH) {
        return {
          success: false,
          error: `Notes exceed maximum length of ${STORAGE_LIMITS.MAX_NOTES_LENGTH} characters`,
        };
      }
      project.notes = notes;
    }

    // Validate updated project
    const tempProject = { ...project };
    if (
      tempProject.projectFiles &&
      typeof tempProject.projectFiles === 'object'
    ) {
      tempProject.projectFiles = JSON.stringify(tempProject.projectFiles);
    }

    const valid = validateSavedProject(tempProject);
    if (!valid) {
      const errorMsg = getValidationErrorMessage(validateSavedProject.errors);
      return {
        success: false,
        error: `Validation failed: ${errorMsg}`,
      };
    }

    // Prepare project for storage
    const projectToSave = { ...project };
    if (projectToSave.projectFiles && typeof projectToSave.projectFiles === 'object') {
      projectToSave.projectFiles = JSON.stringify(projectToSave.projectFiles);
    }

    // Save updated project with dual-write
    if (storageType === 'indexeddb') {
      try {
        await saveToIndexedDB(projectToSave);
      } catch (indexedDbError) {
        console.error('[Saved Projects] IndexedDB update failed:', indexedDbError);
      }
    }

    // Also update localStorage (dual-write)
    const lsProjects = getFromLocalStorage();
    const index = lsProjects.findIndex((p) => p.id === id);
    if (index >= 0) {
      lsProjects[index] = projectToSave;
    } else {
      lsProjects.push(projectToSave);
    }
    try {
      saveToLocalStorage(lsProjects);
    } catch (lsError) {
      console.warn('[Saved Projects] localStorage update failed:', lsError.message);
    }

    return { success: true };
  } catch (error) {
    console.error('[Saved Projects] Error updating project:', error);
    return {
      success: false,
      error: error.message || 'Failed to update project',
    };
  }
}

/**
 * Delete a saved project
 * @param {string} id
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteProject(id) {
  try {
    // Ensure database is initialized
    await ensureInitialized();

    // Delete from both storage locations (dual-delete)
    if (storageType === 'indexeddb') {
      try {
        await deleteFromIndexedDB(id);
        console.log(`[Saved Projects] Deleted from IndexedDB: ${id}`);
      } catch (indexedDbError) {
        console.error('[Saved Projects] IndexedDB delete failed:', indexedDbError);
      }
    }

    // Also delete from localStorage
    const projects = getFromLocalStorage();
    const filtered = projects.filter((p) => p.id !== id);
    try {
      saveToLocalStorage(filtered);
      console.log(`[Saved Projects] Deleted from localStorage: ${id}`);
    } catch (lsError) {
      console.warn('[Saved Projects] localStorage delete failed:', lsError.message);
    }

    return { success: true };
  } catch (error) {
    console.error('[Saved Projects] Error deleting project:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete project',
    };
  }
}

/**
 * Get summary of saved projects (for clear cache warning)
 * @returns {Promise<{count: number, totalApproxBytes: number}>}
 */
export async function getSavedProjectsSummary() {
  try {
    const projects = await listSavedProjects();
    const count = projects.length;

    // Approximate total size
    let totalApproxBytes = 0;
    for (const project of projects) {
      totalApproxBytes += new Blob([project.content]).size;
      if (project.notes) {
        totalApproxBytes += new Blob([project.notes]).size;
      }
    }

    return { count, totalApproxBytes };
  } catch (error) {
    console.error('[Saved Projects] Error getting saved projects summary:', error);
    return { count: 0, totalApproxBytes: 0 };
  }
}

/**
 * Clear all saved projects
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function clearAllSavedProjects() {
  try {
    // Clear both storage locations
    if (storageType === 'indexeddb') {
      try {
        await clearIndexedDB();
        console.log('[Saved Projects] Cleared IndexedDB');
      } catch (indexedDbError) {
        console.error('[Saved Projects] IndexedDB clear failed:', indexedDbError);
      }
    }

    // Also clear localStorage
    try {
      localStorage.removeItem(LS_KEY);
      console.log('[Saved Projects] Cleared localStorage');
    } catch (lsError) {
      console.warn('[Saved Projects] localStorage clear failed:', lsError.message);
    }

    return { success: true };
  } catch (error) {
    console.error('[Saved Projects] Error clearing saved projects:', error);
    return {
      success: false,
      error: error.message || 'Failed to clear saved projects',
    };
  }
}

/**
 * Get storage diagnostic information (for debugging)
 * @returns {Promise<Object>}
 */
export async function getStorageDiagnostics() {
  const diagnostics = {
    storageType,
    indexedDbAvailable: !!window.indexedDB,
    indexedDbConnected: db !== null,
    localStorageAvailable: false,
    indexedDbProjectCount: 0,
    localStorageProjectCount: 0,
    timestamp: new Date().toISOString(),
  };

  // Check localStorage availability
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    diagnostics.localStorageAvailable = true;
  } catch (e) {
    diagnostics.localStorageAvailable = false;
    diagnostics.localStorageError = e.message;
  }

  // Count IndexedDB projects
  if (db) {
    try {
      const projects = await getFromIndexedDB();
      diagnostics.indexedDbProjectCount = projects.length;
    } catch (e) {
      diagnostics.indexedDbError = e.message;
    }
  }

  // Count localStorage projects
  try {
    const projects = getFromLocalStorage();
    diagnostics.localStorageProjectCount = projects.length;
  } catch (e) {
    diagnostics.localStorageReadError = e.message;
  }

  console.log('[Saved Projects] Storage diagnostics:', diagnostics);
  return diagnostics;
}
