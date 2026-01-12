/**
 * State Management - Simple pub/sub pattern
 * @license GPL-3.0-or-later
 */

class StateManager {
  constructor(initialState) {
    this.state = initialState;
    this.subscribers = [];
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  setState(updates) {
    const prevState = this.state;
    this.state = { ...this.state, ...updates };
    this.subscribers.forEach((cb) => cb(this.state, prevState));
    this.syncToURL();
  }

  getState() {
    return this.state;
  }

  syncToURL() {
    // Debounced URL update with only non-default parameters
    // TODO: Implement URL serialization in Phase 2.3
  }
}

// Initial state
const initialState = {
  uploadedFile: null,
  schema: null,
  parameters: {},
  defaults: {},
  rendering: false,
  renderProgress: 0,
  lastRenderTime: null,
  stl: null,
  stlStats: null,
  expandedGroups: [],
  error: null,
};

export const stateManager = new StateManager(initialState);
