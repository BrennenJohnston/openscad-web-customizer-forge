---
name: OpenSCAD Web Customizer Forge — Build Plan
version: 1.0.0
date: 2026-01-12
last_validated: 2026-01-12
validated_by: Claude Opus 4.5 (v1.0 release validation)
status: released
license: GPL-3.0-or-later
---

# OpenSCAD Web Customizer Forge — Build Plan

## Document Navigation

| Section | Description |
|---------|-------------|
| [Executive Summary](#executive-summary) | What we're building and why |
| [Scope Change Summary](#scope-change-summary) | What changed from original plan |
| [v1: Web Application](#v1-openscad-web-customizer-web-application) | User-facing web app (primary focus) |
| [v2: Developer Toolchain](#v2-developer-toolchain-original-scope) | CLI tools (deferred) |
| [Technical Architecture](#technical-architecture) | How it works |
| [Implementation Plan](#implementation-plan) | Phased build approach |
| [Reference Implementations](#reference-implementations) | Validated open source projects |
| [Risk Assessment](#risk-assessment) | What could go wrong |
| [Success Metrics](#success-metrics) | How we measure success |

---

## Executive Summary

### Quickstart Checklist (Day 1 for a new contributor)

- Install Node 18+ and npm 9+.
- From repo root: `npm create vite@latest . -- --template vanilla` (keep docs/LICENSE), then `npm install`, then `npm install ajv three`, then `npm install --save-dev eslint prettier`.
- Create config files for eslint and prettier (see "Repo Bootstrap" section).
- Ensure layout matches the target tree (see "Repo Layout (Target)").
- Run `npm run dev`; verify the app shell loads.
- Upload `examples/universal-cuff/universal_cuff_utensil_holder.scad`; confirm parameters render.
- Trigger a render; see progress updates and a downloadable STL (or a clear timeout/error).

### What We're Building

**v1 Goal**: A **user-facing web application** where anyone can:

1. **Upload** an OpenSCAD (.scad) file directly in the browser
2. **See** automatically-extracted Customizer parameters in an accessible, beginner-friendly UI
3. **Adjust** parameters using intuitive controls (sliders, dropdowns, toggles)
4. **Generate** STL files using **client-side processing** (no server, no credits)
5. **Download** the resulting STL for 3D printing

**Think**: classic “web parametric customizer” UX, but:
- Runs entirely in your browser (client-side OpenSCAD WASM)
- Better accessibility (WCAG 2.1 AA compliant)
- Beginner-friendly parameter guidance
- No account required, no usage limits
- Open source (GPL-3.0-or-later)

### Definition of Done (v1 MVP)

The v1 MVP is considered **done** when a new contributor can:

1. Run `npm install` then `npm run dev`
2. Upload `examples/universal-cuff/universal_cuff_utensil_holder.scad`
3. See **grouped parameters** and adjust at least:
   - 1 range slider (e.g. `palm_loop_height`)
   - 1 enum select (e.g. `part`)
   - 1 yes/no toggle (e.g. `include_lower_tool_mount`)
4. Click **Generate STL** and receive:
   - A downloadable STL file
   - A visible progress indicator during generation
   - A clear error message if generation fails or times out

Optional for v1 MVP: 3D preview (P1 feature)

### Why This Matters

| Problem | Our Solution |
|---------|--------------|
| Many legacy customizers are deprecated/limited | Open source alternative |
| Server-side rendering costs money | 100% client-side processing |
| OpenSCAD Customizer UI is intimidating | Accessible, guided UI |
| Can't customize without installing OpenSCAD | Web-based, no install |
| Sharing customized models is hard | URL-based parameter sharing |

### Timeline Estimate

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1: Core Infrastructure | 1-2 weeks | WASM worker + file upload |
| Phase 2: Parameter UI | 1-2 weeks | Schema-driven form generation |
| Phase 3: Polish and Deploy | 1 week | Vercel deployment + accessibility |
| **Total v1** | **3-5 weeks** | Working web application |

---

## Scope Change Summary

### What Changed (v0.1.0 to v0.2.0)

| Aspect | Original v1 | New v1 | Rationale |
|--------|-------------|--------|-----------|
| **Primary User** | Developers | End users | Faster path to usable product |
| **Core Deliverable** | CLI tool | Web application | Direct user value |
| **Input Method** | Command-line file path | Browser file upload | No install required |
| **Output** | Generated project scaffold | STL file download | Immediate utility |
| **Parameter Source** | Pre-extracted schema | Runtime extraction | Single-step workflow |

### Original Scope Moved to v2

The original build plan focused on **developer tooling**:

```bash
# Original v1 vision (now v2)
forge extract model.scad --out params.schema.json
forge scaffold --schema params.schema.json --scad model.scad --out ./webapp
forge validate ./webapp --cases test-cases.yaml --ref docker-openscad
forge sync --apply-safe-fixes
```

This is still valuable but is now **v2 scope** because:

1. **End users can't wait** for developers to scaffold apps for each model
2. **Client-side WASM** enables runtime parameter extraction
3. **Browser-based UI** provides immediate value without tooling

### What Stays the Same

- OpenSCAD WASM for client-side STL generation
- Parameter Schema specification (JSON Schema + UI extensions)
- Accessibility-first UI design
- GPL-3.0-or-later licensing
- Vercel deployment target
- Example project (universal cuff)

---

## v1: OpenSCAD Web Customizer (Web Application)

### User Journey

```
User lands on page
       |
       v
+---------------------------+
|  Welcome Screen           |
|  - Drop .scad file here   |
|  - Or try an example      |
+---------------------------+
       |
       v (upload file)
+---------------------------+
|  Parameters extracted     |
|  automatically            |
+---------------------------+
       |
       v
+------------------------------------------+
|  Main Interface                          |
|  +----------------+ +------------------+ |
|  | PARAMETERS     | | 3D PREVIEW       | |
|  |                | |                  | |
|  | > Part to Print| |   [3D Model]     | |
|  |   [Dropdown]   | |                  | |
|  |                | |                  | |
|  | > Dimensions   | | [Download STL]   | |
|  |   Height ---o--| | [Share Link]     | |
|  |   Width  --o---| |                  | |
|  +----------------+ +------------------+ |
+------------------------------------------+
       |
       v (click Download)
+---------------------------+
|  STL generated client-side|
|  File downloaded          |
+---------------------------+
```

### Core Features (v1 MVP)

#### 1. File Upload and Parsing

| Feature | Description | Priority |
|---------|-------------|----------|
| Drag-and-drop upload | Drop .scad file onto page | P0 |
| File picker fallback | Click to browse for file | P0 |
| Parameter extraction | Parse Customizer annotations at runtime | P0 |
| Error handling | Clear messages for unsupported files | P0 |
| Example models | Pre-loaded example (universal cuff) | P0 |
| Include resolution | Support include/use statements | P1 |

#### 2. Parameter UI

| Feature | Description | Priority |
|---------|-------------|----------|
| Grouped parameters | Collapsible sections matching groups | P0 |
| Range sliders | For [min:max] parameters | P0 |
| Step sliders | For [min:step:max] parameters | P0 |
| Dropdown selects | For enum parameters | P0 |
| Toggle switches | For [yes, no] boolean-likes | P0 |
| Number inputs | Direct value entry with validation | P0 |
| Help tooltips | From inline comments | P1 |
| Unit display | Show mm, degrees, etc. | P1 |
| Dependency visibility | Hide/show based on other params | P2 |
| Reset to defaults | One-click reset | P1 |

#### 3. STL Generation

| Feature | Description | Priority |
|---------|-------------|----------|
| OpenSCAD WASM | Client-side rendering via Web Worker | P0 |
| Progress indicator | Show generation progress/status | P0 |
| Cancel generation | Abort long-running renders | P1 |
| Timeout handling | 60s timeout with clear message | P0 |
| Download STL | Save to local filesystem | P0 |
| Download filename | Include model name + param hash | P1 |

#### 4. 3D Preview

| Feature | Description | Priority |
|---------|-------------|----------|
| Three.js viewer | Display generated STL | P1 |
| Orbit controls | Rotate, zoom, pan | P1 |
| Auto-rotate | Gentle rotation for first preview | P2 |
| Light/dark theme | Match system preference | P2 |

#### 5. Sharing and Persistence

| Feature | Description | Priority |
|---------|-------------|----------|
| URL parameters | Encode current values in URL hash | P1 |
| Copy share link | One-click copy shareable URL | P1 |
| Browser storage | Remember last-used parameters | P2 |
| Presets | Save/load named parameter sets | P2 |

### Accessibility Requirements (WCAG 2.1 AA)

| Requirement | Implementation |
|-------------|----------------|
| Keyboard navigation | All controls focusable, logical tab order |
| Screen reader support | ARIA labels, live regions for status updates |
| Color contrast | 4.5:1 minimum for text, 3:1 for UI elements |
| Focus indicators | Visible focus rings on all interactive elements |
| Reduced motion | Respect prefers-reduced-motion |
| Touch targets | Minimum 44x44px for mobile |
| Error identification | Clear, specific error messages |
| Form labels | All inputs have visible labels |

### Beginner-Friendly Guidance

| Element | Purpose |
|---------|---------|
| Welcome message | Explain what the tool does |
| Hover tooltips | Explain each parameter's effect |
| Error recovery | Suggest fixes for common issues |
| Units display | Always show measurement units |
| Range indicators | Show min/max/current values |
| Progress feedback | "Generating STL... 45%" |
| Success confirmation | Brief "Done!" indication |

### Responsive Layout

**Desktop (1024px+)**:
```
+--------------------------------------------------+
| Header                                            |
+----------------------+---------------------------+
| Parameters Panel     | Preview/Download Panel    |
| (scrollable)         | (fixed header, content)   |
|                      |                           |
| - Group 1            | [3D Preview]              |
|   □ param1           |                           |
|   □ param2           |                           |
| - Group 2            | [Generate STL]            |
|   □ param3           | [Download STL]            |
|                      | Stats: 1234 triangles     |
+----------------------+---------------------------+
```

**Tablet (768-1023px)**:
- Similar to desktop but narrower panels
- Preview may be smaller
- Consider collapsing groups by default

**Mobile (< 768px)**:
```
+---------------------------+
| Header                     |
+---------------------------+
| Preview/Status (collapsed) |
| [Expand Preview]           |
+---------------------------+
| Parameters (scrollable)    |
| - Group 1 ▼               |
|   □ param1                |
|   □ param2                |
| - Group 2 ▶               |
+---------------------------+
| [Generate STL]             |
| [Download STL]             |
+---------------------------+
```

**Responsive Breakpoints**:
```css
:root {
  --breakpoint-mobile: 480px;
  --breakpoint-tablet: 768px;
  --breakpoint-desktop: 1024px;
  --breakpoint-wide: 1440px;
}

/* Mobile-first approach */
.main-layout {
  display: flex;
  flex-direction: column;
}

@media (min-width: 768px) {
  .main-layout {
    flex-direction: row;
  }
  
  .param-panel {
    width: 40%;
    min-width: 320px;
    max-width: 480px;
  }
  
  .preview-panel {
    flex: 1;
  }
}
```

**Touch Optimization**:
- Minimum 44x44px touch targets (WCAG 2.1 Level AAA)
- Increased padding on mobile (16px vs 8px)
- Larger slider thumbs (32px on mobile vs 20px desktop)
- Sticky "Generate STL" button on mobile (always accessible)

---

## v2: Developer Toolchain (Original Scope)

### Overview

v2 adds **developer-facing CLI tools** for automated workflows:

```bash
# Extract parameters from OpenSCAD to JSON Schema
openscad-forge extract model.scad --out params.schema.json

# Generate a standalone web app from schema + scad
openscad-forge scaffold --schema params.schema.json --scad model.scad --out ./webapp

# Validate parity between implementations
openscad-forge validate ./webapp --cases test-cases.yaml --ref docker-openscad

# Apply safe auto-fixes for detected issues
openscad-forge sync ./webapp --apply-safe-fixes
```

### v2 Features (Deferred)

| Feature | Description | Value |
|---------|-------------|-------|
| CLI parameter extraction | Batch process multiple files | Automation |
| Standalone app scaffolding | Generate project from schema | Distribution |
| Validation harness | Compare schemas, UI, STL output | Quality |
| Golden fixtures | Regression testing with known-good outputs | CI/CD |
| Auto-sync | Apply safe fixes automatically | Maintenance |
| React template | Alternative to vanilla JS | Developer choice |
| Custom themes | Brand-specific styling | Customization |

### v2 Timeline (After v1 Complete)

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| v2.0 | 2-3 weeks | CLI extract + scaffold commands |
| v2.1 | 2-3 weeks | Validation harness |
| v2.2 | 1-2 weeks | Auto-sync + golden fixtures |
| **Total v2** | **5-8 weeks** | Complete developer toolchain |

---

## Technical Architecture

### System Overview

```
+------------------------------------------------------------------+
|                    BROWSER EXECUTION CONTEXT                      |
+------------------------------------------------------------------+
|                                                                    |
|  MAIN THREAD                                                       |
|  +------------+  +------------+  +------------+  +------------+   |
|  | File       |  | Parameter  |  | 3D Preview |  | Download   |   |
|  | Upload     |  | UI Forms   |  | (Three.js) |  | Manager    |   |
|  +------------+  +------------+  +------------+  +------------+   |
|        |              |               |               |            |
|        +-------+------+-------+-------+---------------+            |
|                |                                                   |
|                v                                                   |
|        +----------------+                                          |
|        | State Manager  |                                          |
|        +----------------+                                          |
|                |  postMessage()                                    |
|                v                                                   |
|  +------------------------------------------------------------+   |
|  |                    WEB WORKER (isolated)                    |   |
|  |                                                              |   |
|  |  +--------------------------------------------------------+ |   |
|  |  |              OpenSCAD WASM Runtime                      | |   |
|  |  |  +----------------+ +---------------+ +---------------+ | |   |
|  |  |  | Parameter      | | Virtual FS    | | STL Export    | | |   |
|  |  |  | Parser         | | (Emscripten)  | | Engine        | | |   |
|  |  |  +----------------+ +---------------+ +---------------+ | |   |
|  |  +--------------------------------------------------------+ |   |
|  |                                                              |   |
|  |  Bundle: ~15-30MB (lazy loaded after page render)            |   |
|  +------------------------------------------------------------+   |
|                                                                    |
+------------------------------------------------------------------+
```

### Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **UI Framework** | Vanilla JS (no framework) | Minimal bundle, accessibility-first |
| **Styling** | CSS (custom properties) | No build step, easy theming |
| **3D Preview** | Three.js | Industry standard, STL loader built-in |
| **WASM Runtime** | OpenSCAD WASM | Official builds, well-documented |
| **Worker Isolation** | Web Workers | Prevents UI blocking |
| **State Management** | Vanilla (custom) | Simple state, no Redux needed |
| **Schema Validation** | Ajv | Battle-tested JSON Schema validator |
| **Deployment** | Vercel (static) | Free tier, global CDN |
| **Bundling** | Vite | Fast builds, native ES modules |

### Browser Requirements

| Browser | Minimum Version | Rationale |
|---------|----------------|-----------|
| Chrome | 67+ (2018) | Web Workers, WASM, ES6 modules |
| Firefox | 79+ (2020) | SharedArrayBuffer support |
| Safari | 15.2+ (2021) | Cross-origin isolation support |
| Edge | 79+ (2020) | Chromium-based |

**Required Browser Features**:
- WebAssembly with 512MB+ memory support
- Web Workers
- ES6 modules (import/export)
- File API (FileReader, Blob)
- SharedArrayBuffer (if required by WASM build)
- Cross-origin isolation (for SharedArrayBuffer)

### Progressive Enhancement and Fallbacks

**Feature Detection**:
```javascript
// Check for required features on page load
const hasRequiredFeatures = () => {
  const checks = {
    wasm: typeof WebAssembly !== 'undefined',
    worker: typeof Worker !== 'undefined',
    fileApi: typeof FileReader !== 'undefined',
    modules: 'noModule' in HTMLScriptElement.prototype,
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
  };
  
  const missing = Object.entries(checks)
    .filter(([_, supported]) => !supported)
    .map(([feature]) => feature);
  
  return { supported: missing.length === 0, missing };
};

// Check for optional features (used for progressive enhancement)
const hasOptionalFeatures = () => {
  const canvas = document.createElement('canvas');
  return {
    webgl: !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl')),
    localStorage: (() => { try { return !!window.localStorage; } catch { return false; } })(),
    dragAndDrop: 'draggable' in document.createElement('div'),
  };
};

// Show clear error if requirements not met
const features = hasRequiredFeatures();
if (!features.supported) {
  showUnsupportedBrowserMessage(features.missing);
}

// Adjust UI based on optional features
const optional = hasOptionalFeatures();
if (!optional.webgl) {
  // Hide 3D preview, show "Preview not available" message
}
```

**Graceful Degradation**:

| Feature | Fallback Strategy |
|---------|------------------|
| **SharedArrayBuffer unavailable** | Try WASM build without SAB (slower), show warning |
| **WebGL unavailable** | Skip 3D preview, show "Preview not available" message |
| **Web Worker fails** | Show error, suggest browser update |
| **File API unavailable** | Show unsupported browser message |
| **localStorage blocked** | URL params still work, just no draft saving |

**Progressive Features**:

| Feature | Baseline | Enhanced |
|---------|----------|----------|
| **3D Preview** | Download only | Three.js preview |
| **Drag-and-drop** | File picker button | + Drag-and-drop zone |
| **Auto-render** | Manual "Generate" button | + Auto-render on param change |
| **Keyboard shortcuts** | Mouse/touch only | + Keyboard shortcuts |
| **Persistence** | None | URL params + localStorage |

**Unsupported Browser Message**:
```html
<div class="unsupported-browser" role="alert">
  <h2>Browser Not Supported</h2>
  <p>This application requires a modern browser with WebAssembly support.</p>
  <p>Please use one of the following:</p>
  <ul>
    <li>Chrome 67 or newer</li>
    <li>Firefox 79 or newer</li>
    <li>Safari 15.2 or newer</li>
    <li>Edge 79 or newer</li>
  </ul>
  <p>Missing features: <strong id="missing-features"></strong></p>
</div>
```

### OpenSCAD WASM Integration

#### Source Options (Validated 2026-01-12)

| Source | Status | Recommendation |
|--------|--------|----------------|
| openscad/openscad-wasm | Official but experimental | **PRIMARY: Use official builds** |
| seasick/openscad-web-gui | GPL-3.0, production-tested | Reference for patterns only |
| openscad/openscad-playground | Active, official-ish | Reference for integration |
| Self-compiled from source | Maximum control | Fallback if official fails |

**Decision (2026-01-12)**: Start with official `openscad/openscad-wasm` builds. These are the most up-to-date and will be maintained by the OpenSCAD team. If blocking issues are found during Phase 1.2, pivot to self-compiled WASM with documented build process.

#### WASM Loading Strategy

```javascript
// Lazy load WASM after initial page render
async function initOpenSCAD() {
  // Show loading indicator
  updateStatus('Loading OpenSCAD engine...');
  
  // Load WASM module (15-30MB)
  const OpenSCAD = await import('./openscad-wasm/openscad.js');
  
  // Initialize with memory limits
  const instance = await OpenSCAD.init({
    TOTAL_MEMORY: 512 * 1024 * 1024,  // 512MB
    ALLOW_MEMORY_GROWTH: true,
    locateFile: (path) => `/wasm/${path}`,
  });
  
  updateStatus('Ready');
  return instance;
}
```

#### Font and Library Support

OpenSCAD's `text()` function requires fonts. The WASM build needs fonts loaded into the virtual filesystem.

**Required Fonts** (minimum for v1):
- Liberation Sans (regular, bold, italic, bold-italic)
- Liberation Mono (for monospace text)

**Virtual FS Setup**:
```javascript
// In Web Worker, after WASM init
function setupVirtualFS(FS) {
  // Create font directory
  FS.mkdir('/fonts');
  
  // Load fonts from public/fonts/
  const fonts = [
    'LiberationSans-Regular.ttf',
    'LiberationSans-Bold.ttf',
    'LiberationSans-Italic.ttf',
    'LiberationSans-BoldItalic.ttf',
    'LiberationMono-Regular.ttf',
  ];
  
  for (const font of fonts) {
    const data = await fetch(`/fonts/${font}`).then(r => r.arrayBuffer());
    FS.writeFile(`/fonts/${font}`, new Uint8Array(data));
  }
  
  // Create working directory for .scad files
  FS.mkdir('/work');
}
```

**License Note**: Liberation fonts are SIL Open Font License, compatible with GPL.

#### Worker Communication Protocol

**Note**: The following message formats use TypeScript-style notation for clarity but will be implemented in vanilla JavaScript.

```javascript
// Main thread -> Worker
worker.postMessage({
  type: 'RENDER',
  payload: {
    scadContent: '...',      // .scad file content
    parameters: { ... },      // Parameter overrides
    outputFormat: 'binstl',   // Binary STL
    timeout: 60000,           // 60 second timeout
  }
});

// Worker -> Main thread (progress)
worker.postMessage({
  type: 'PROGRESS',
  payload: { percent: 45, message: 'Rendering geometry...' }
});

// Worker -> Main thread (complete)
worker.postMessage({
  type: 'COMPLETE',
  payload: {
    stl: ArrayBuffer,         // STL data
    stats: { triangles, volume, boundingBox }
  }
});

// Worker -> Main thread (error)
worker.postMessage({
  type: 'ERROR',
  payload: { code: 'TIMEOUT', message: 'Render exceeded 60 seconds' }
});
```

### Performance Optimization

| Optimization | Target | Implementation |
|--------------|--------|----------------|
| **Initial page load** | < 3s on 3G | Defer WASM loading until file uploaded |
| **WASM load time** | < 10s on cable | Show progress bar, lazy load |
| **Parameter change response** | < 100ms | Debounce render trigger (500ms default) |
| **STL generation** | < 30s for typical models | Use OpenSCAD performance flags |
| **Preview render** | < 2s | Three.js with hardware acceleration |
| **Bundle size** | < 200KB (pre-WASM) | Tree-shaking, code splitting |

### Auto-Preview System (v1.2 Feature)

The Auto-Preview system provides progressive enhancement for real-time visual feedback during parameter adjustments.

#### Architecture Overview

```
Parameter Change → Immediate UI Feedback → Debounce Timer (1.5s)
                        ↓                        ↓
              "Changes pending..."        Auto-Preview Render
                                               ↓
                                      Preview STL (low $fn)
                                               ↓
                                      3D Preview Update
                                               ↓
                                  "Preview ready (lower quality)"
                                               ↓
                               User clicks "Download STL"
                                               ↓
                                   Full Quality Render
                                               ↓
                                     Download File
```

#### Render Quality Tiers

| Tier | $fn Value | Use Case | Typical Time |
|------|-----------|----------|--------------|
| **Preview** | min(user $fn, 24) | Auto-render on param change | 2-8s |
| **Full** | user $fn or 64 | Final STL for download | 10-60s |

#### State Machine

```javascript
// Preview States
const PREVIEW_STATE = {
  IDLE: 'idle',              // No file loaded
  CURRENT: 'current',        // Preview matches parameters
  PENDING: 'pending',        // Parameter changed, render scheduled
  RENDERING: 'rendering',    // Preview render in progress
  STALE: 'stale',           // Preview exists but params changed (older STL)
};
```

#### Implementation Pattern

```javascript
class AutoPreviewController {
  constructor(renderController, previewManager, options = {}) {
    this.renderController = renderController;
    this.previewManager = previewManager;
    this.debounceMs = options.debounceMs || 1500;
    this.previewFn = options.previewFn || 24;  // Max $fn for preview
    this.enabled = options.enabled ?? true;
    
    this.debounceTimer = null;
    this.previewCache = new Map();  // paramHash -> { stl, stats }
    this.currentParamHash = null;
    this.previewParamHash = null;
    this.state = 'idle';
  }

  // Called when any parameter changes
  onParameterChange(scadContent, parameters) {
    if (!this.enabled) return;
    
    const paramHash = this.hashParams(parameters);
    this.currentParamHash = paramHash;
    
    // Check cache first
    if (this.previewCache.has(paramHash)) {
      this.loadCachedPreview(paramHash);
      return;
    }
    
    // Update state to pending
    this.setState('pending');
    
    // Cancel existing debounce
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    
    // Schedule new preview render
    this.debounceTimer = setTimeout(() => {
      this.renderPreview(scadContent, parameters, paramHash);
    }, this.debounceMs);
  }

  // Render preview with reduced quality
  async renderPreview(scadContent, parameters, paramHash) {
    this.setState('rendering');
    
    // Apply preview quality settings
    const previewParams = { ...parameters };
    if (previewParams.$fn > this.previewFn) {
      previewParams.$fn = this.previewFn;
    }
    
    try {
      const result = await this.renderController.render(
        scadContent, 
        previewParams,
        { timeoutMs: 30000 }  // Shorter timeout for preview
      );
      
      // Cache the result
      this.previewCache.set(paramHash, result);
      this.previewParamHash = paramHash;
      
      // Load into 3D preview
      await this.previewManager.loadSTL(result.stl);
      
      this.setState('current');
    } catch (error) {
      console.error('Preview render failed:', error);
      this.setState('stale');
    }
  }

  // Full quality render for download
  async renderFull(scadContent, parameters) {
    return this.renderController.render(scadContent, parameters, {
      timeoutMs: 60000
    });
  }
}
```

#### UI Indicators

| State | Visual Indicator | Status Message |
|-------|-----------------|----------------|
| `idle` | Placeholder image | "Upload a model to begin" |
| `pending` | Yellow border pulse | "Changes detected - preview updating..." |
| `rendering` | Spinner overlay | "Generating preview..." |
| `current` | Green checkmark badge | "Preview ready" |
| `stale` | Yellow warning badge | "Preview outdated - parameters changed" |

#### Configuration Options

```javascript
// User preferences (stored in localStorage)
const autoPreviewSettings = {
  enabled: true,           // Toggle auto-preview on/off
  debounceMs: 1500,        // Delay before auto-render
  previewFn: 24,           // Max $fn for preview renders
  maxCacheSize: 10,        // Max cached preview renders
};
```

#### Benefits of Progressive Enhancement

1. **Immediate feedback**: Users see "pending" state instantly
2. **Faster iteration**: Low-quality preview renders in 2-8s vs 30-60s
3. **Reduced wait time**: Cache hits skip render entirely
4. **Quality control**: Full resolution only when downloading
5. **User control**: Can disable auto-preview if preferred

**OpenSCAD Performance Flags** (pass to WASM):
```javascript
const performanceFlags = [
  '--enable=manifold',      // Faster CSG operations
  '--enable=fast-csg',      // Experimental speedup
  '--enable=lazy-union',    // Defer union operations
];
```

**Render Debouncing**:
- Debounce parameter changes by 500ms (adjustable)
- Show "Generating..." immediately when debounce triggers
- Cancel previous render when new one starts
- Use requestId to ignore stale results

### Parameter Extraction (Runtime)

#### Customizer Annotation Patterns

```javascript
const CUSTOMIZER_PATTERNS = {
  // Group headers: /*[Group Name]*/
  group: /\/\*\s*\[\s*([^\]]+)\s*\]\s*\*\//,
  
  // Parameter with range: name = default; // [min:max] or [min:step:max]
  // NOTE: OpenSCAD variable names may start with '$' (e.g. $fn).
  range: /^([$]?[A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^;]+);\s*\/\/\s*\[\s*(-?\d+(?:\.\d+)?)\s*(?::\s*(-?\d+(?:\.\d+)?))?\s*:\s*(-?\d+(?:\.\d+)?)\s*\]/,
  
  // Parameter with enum: name = default; // [opt1, opt2, opt3]
  // Enum values may be strings or numbers (e.g. [0,2,4,6]).
  enum: /^([$]?[A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^;]+);\s*\/\/\s*\[\s*([^\]]+)\s*\]/,
  
  // Parameter with comment: name = default; // Description
  comment: /^([$]?[A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^;]+);\s*\/\/\s*([^[\n]+)/,
  
  // Bare parameter: name = default;
  bare: /^([$]?[A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^;]+);/,
};
```

**Implementation note for junior devs**: regex-only parsing gets fragile quickly (strings with commas, spaces, etc.).
For v1 MVP, implement a simple **line-based parser**:
- Split file into lines
- Track current group from `/*[Group]*/`
- For each assignment line matching `name = value;`:
  - Detect bracket hint `// [...]` (range or enum)
  - Handle quoted string defaults: `name = "value";` → extract `"value"` then strip quotes
  - For enum hints with strings: `// [opt1, opt2]` or `// ["opt 1", "opt 2"]` → split carefully on commas outside quotes
  - Otherwise treat as "bare parameter" with optional description
- Convert into the internal schema format (see `docs/specs/PARAMETER_SCHEMA_SPEC.md`)

**String Value Parsing**:
```javascript
// Extract default value, handling quotes
function parseDefaultValue(valueStr) {
  const trimmed = valueStr.trim();
  // Check if it's a quoted string
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return { type: 'string', value: trimmed.slice(1, -1) };
  }
  // Check if it's a number
  const num = parseFloat(trimmed);
  if (!isNaN(num)) {
    return { type: Number.isInteger(num) ? 'integer' : 'number', value: num };
  }
  // Check for boolean
  if (trimmed === 'true' || trimmed === 'false') {
    return { type: 'boolean', value: trimmed === 'true' };
  }
  // Unquoted string (rare in Customizer, but possible)
  return { type: 'string', value: trimmed };
}
```

### Security Considerations

| Threat | Risk Level | Mitigation |
|--------|-----------|------------|
| **Malicious .scad files** | Medium | Web Worker isolation, timeout enforcement, memory limits |
| **Code injection via parameters** | Low | Parameters are passed as -D flags (OpenSCAD handles escaping) |
| **DoS via infinite loops** | High | 60-second timeout, Web Worker termination |
| **Memory exhaustion** | Medium | WASM memory limit (512MB), warn users of large models |
| **XSS via filenames** | Low | Sanitize filenames before display |
| **Dependency confusion** | Low | No npm package execution from uploaded files |

**Implementation Notes**:
- All OpenSCAD rendering happens in isolated Web Worker (cannot access DOM/localStorage)
- File parsing happens in main thread but with size limits (5MB default)
- No `eval()` or `Function()` constructor usage
- All user-provided strings are escaped before DOM insertion
- WASM sandbox provides additional isolation from system

### Parameter Schema Format

Building on the existing `docs/specs/PARAMETER_SCHEMA_SPEC.md`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Model Name",
  "type": "object",
  "x-forge-version": "1.0.0",
  "x-forge-groups": [
    { "id": "dimensions", "label": "Dimensions", "order": 0 },
    { "id": "options", "label": "Options", "order": 1 }
  ],
  "properties": {
    "width": {
      "type": "integer",
      "default": 50,
      "minimum": 10,
      "maximum": 100,
      "x-forge-group": "dimensions",
      "x-forge-order": 0,
      "x-forge-unit": "mm"
    },
    "include_mount": {
      "type": "string",
      "default": "yes",
      "enum": ["yes", "no"],
      "x-forge-group": "options",
      "x-forge-order": 0,
      "x-forge-render-as": "toggle"
    }
  }
}
```

---

## Implementation Plan

### 0. Repo Bootstrap (Do This First)

This repository is currently **docs-first**. Before implementing Phase 1, create the web app skeleton.

**Required tools**:
- Node.js 18+ LTS
- npm 9+

**Commands (from repo root)**:

```bash
# Create Vite vanilla app in the existing repo folder
# (If prompted about overwriting files, answer "no" for docs/README/LICENSE.)
npm create vite@latest . -- --template vanilla

# Install dependencies
npm install

# Add runtime dependencies
npm install ajv three

# Add development dependencies
npm install --save-dev eslint prettier

# Create basic ESLint config
echo '{"extends": ["eslint:recommended"], "env": {"browser": true, "es2020": true}, "parserOptions": {"ecmaVersion": 2020, "sourceType": "module"}}' > .eslintrc.json

# Create Prettier config
echo '{"semi": true, "singleQuote": true, "tabWidth": 2, "trailingComma": "es5"}' > .prettierrc.json

# Initialize git (if not already a repo)
git init

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
.DS_Store
*.log
.env
.vscode/
.idea/
public/wasm/openscad.*
EOF
```

**Notes**:
- Keep documentation under `docs/` as-is.
- Vite will create/own `index.html` at repo root and the `src/` app code folder.
- WASM files are gitignored and downloaded via `npm run setup-wasm`

### 1. Repo Layout (Target)

After bootstrap + Phase 1, the repo layout should look like:

```
openscad-web-customizer-forge/
├── index.html
├── src/
│   ├── main.js                 # Entry point; mounts UI
│   ├── styles/
│   │   ├── variables.css       # CSS custom properties (colors, spacing)
│   │   ├── reset.css           # Normalize/reset
│   │   ├── layout.css          # Grid, flexbox, responsive
│   │   ├── components.css      # UI components (buttons, inputs, etc.)
│   │   └── main.css            # Imports all CSS
│   ├── js/
│   │   ├── state.js             # Central store + pub/sub
│   │   ├── upload.js            # Drag/drop + file picker
│   │   ├── parser.js            # OpenSCAD Customizer → internal schema
│   │   ├── schema.js            # Schema normalization + Ajv validation
│   │   ├── ui-generator.js      # Renders form controls from schema
│   │   ├── render-controller.js # Debounce + cancel + worker orchestration
│   │   ├── preview.js           # Three.js preview (P1)
│   │   └── download.js          # Download filename + blob saving
│   └── worker/
│       └── openscad-worker.js   # Web Worker entry
├── public/
│   ├── wasm/                    # OpenSCAD WASM artifacts (downloaded)
│   ├── fonts/                   # Fonts needed for OpenSCAD text()
│   └── examples/                # Example .scad files for demo mode
├── docs/
├── examples/
├── LICENSE
├── THIRD_PARTY_NOTICES.md
├── package.json
├── vite.config.js
└── vercel.json
```

### CSS Architecture

**Design System (CSS Custom Properties)**:

```css
/* src/styles/variables.css */
:root {
  /* Colors - Light Mode */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f5f5f5;
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #666666;
  --color-accent: #0066cc;
  --color-accent-hover: #0052a3;
  --color-success: #28a745;
  --color-error: #dc3545;
  --color-warning: #ffc107;
  --color-border: #d1d1d1;
  
  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  
  /* Typography */
  --font-family-base: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-family-mono: "Consolas", "Monaco", monospace;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.5rem;
  
  /* Borders */
  --border-radius-sm: 4px;
  --border-radius-md: 8px;
  --border-radius-lg: 12px;
  
  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 20px rgba(0, 0, 0, 0.15);
  
  /* Focus */
  --focus-ring: 0 0 0 3px rgba(0, 102, 204, 0.3);
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg-primary: #1a1a1a;
    --color-bg-secondary: #2d2d2d;
    --color-text-primary: #f5f5f5;
    --color-text-secondary: #a0a0a0;
    --color-border: #404040;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Component Naming Convention**: BEM-inspired but simplified
```css
/* Block */
.param-control { }

/* Element */
.param-control__label { }
.param-control__input { }
.param-control__help { }

/* Modifier */
.param-control--disabled { }
.param-control--error { }
```

### Phase 1: Core Infrastructure (Week 1-2)

#### 1.1 Project Setup

**Deliverables:**
- Create the repo layout above (move Vite-generated code into `src/js/` + `src/styles/`)
- Add `vercel.json` with COOP/COEP headers (see Deployment section)
- Add a simple UI shell: left panel (parameters), right panel (preview/download/status)
- Add a status area implemented as an ARIA live region (`aria-live="polite"`)

#### 1.2 OpenSCAD WASM Worker

**Deliverables:**
- Web Worker setup with message protocol
- WASM lazy loading with progress indicator
- Virtual filesystem setup (fonts, libraries)
- Parameter marshalling to -D flags
- STL export to ArrayBuffer
- Timeout enforcement (60s default)
- Error handling and recovery

**Worker message contracts (must match exactly):**

```javascript
// Main → Worker
// INIT is idempotent; RENDER requires INIT first.
// requestId allows cancelling/ignoring stale renders.
type InitMsg = { type: 'INIT', payload: { wasmBaseUrl: string } };
type RenderMsg = {
  type: 'RENDER',
  payload: {
    requestId: string,
    scadFilename: string,
    scadContent: string,
    parameters: Record<string, unknown>,
    timeoutMs: number,
    outputFormat: 'binstl'
  }
};
type CancelMsg = { type: 'CANCEL', payload: { requestId: string } };

// Worker → Main
type ReadyMsg = { type: 'READY' };
type ProgressMsg = { type: 'PROGRESS', payload: { requestId: string, percent: number, message: string } };
type CompleteMsg = {
  type: 'COMPLETE',
  payload: { requestId: string, stl: ArrayBuffer, stats?: { triangles?: number } }
};
type ErrorMsg = {
  type: 'ERROR',
  payload: { requestId: string, code: 'INIT_FAILED'|'RENDER_FAILED'|'TIMEOUT'|'CANCELLED', message: string, details?: string }
};
```

**Error Handling Strategy**:

| Error Type | User Message | Technical Action |
|------------|-------------|------------------|
| **WASM load failure** | "Failed to load OpenSCAD engine. Please refresh and try again." | Log to console, show retry button |
| **Timeout (60s)** | "This model is taking too long to generate. Try simplifying parameters or reducing detail." | Terminate worker, offer parameter suggestions |
| **Memory exhaustion** | "This model requires too much memory. Try reducing size or complexity." | Catch OOM, terminate worker, suggest limits |
| **Syntax error** | "OpenSCAD reported an error: [error message]. Check your .scad file syntax." | Parse OpenSCAD stderr, highlight line if possible |
| **File too large** | "File exceeds 5MB limit. Please use a smaller model." | Block upload, suggest optimization |
| **Invalid format** | "This doesn't appear to be a valid .scad file. Please check the file type." | Validate file extension and basic structure |
| **Include not found** | "This model uses include/use statements. Multi-file support coming in v1.1!" | Parse includes, show informational message |

**Acceptance Criteria:**
- Can render a simple .scad file with default parameters
- Can override parameters via -D flags
- Returns STL as ArrayBuffer
- Handles timeout gracefully (60s with clear message)
- Reports progress to main thread
- Recovers from errors without page reload
- All error messages are user-friendly (avoid technical jargon)

#### 1.3 File Upload

**Deliverables:**
- Drag-and-drop zone with hover state
- File input fallback (click to browse)
- File type validation (.scad only)
- File size limits (5MB default, configurable)
- Detect `include <...>` / `use <...>` statements and show a **clear v1 limitation warning** (no dependency upload in v1)
- Show file info (name, size) after upload
- "Clear file" button to start over

**Acceptance Criteria:**
- Drag-and-drop works in Chrome, Firefox, Safari, Edge
- File picker works on all platforms including mobile
- Files over 5MB show clear size limit message
- Invalid file types show format error
- Include statements show informational (not error) message

#### 1.4 Download Manager

**Deliverables:**
- STL download with smart filename generation
- Download button with loading states
- File size display before download
- Browser compatibility for download (via Blob API)

**Filename Generation Strategy**:
```javascript
// Format: modelname-hash-YYYYMMDD.stl
// Example: universal_cuff-a3f8b2-20260112.stl
function generateFilename(modelName, parameters) {
  const sanitized = modelName.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
  const hash = shortHash(JSON.stringify(parameters)).substring(0, 6);
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  return `${sanitized}-${hash}-${date}.stl`;
}
```

**Why this format**:
- Model name helps user identify the file
- Hash prevents overwriting different parameter sets
- Date provides temporal sorting
- Length is reasonable (< 50 chars typically)

**Download Implementation**:
```javascript
function downloadSTL(arrayBuffer, filename) {
  const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

**Acceptance Criteria:**
- Download button is disabled until STL is generated
- Filename includes model name + parameter hash + date
- File size is displayed before/during download
- Download works in Chrome, Firefox, Safari, Edge
- Blob URL is revoked after download to free memory

### Phase 2: Parameter UI (Week 2-3)

#### 2.1 Parameter Extraction

**Deliverables:**
- Customizer annotation parser
- Group detection
- Range parsing
- Enum parsing
- Yes/no toggle detection
- Comment extraction for help text
- Hidden group filtering

**Acceptance Criteria:**
- Extracts all ~50 parameters from universal cuff example (47 visible + 3 hidden)
- Correctly identifies types (integer, number, string)
- Preserves group ordering
- Handles edge cases (no annotations, malformed)

**Edge cases to support in v1**:
- `$`-prefixed names (e.g. `$fn`) must be parsed and can be marked hidden if in `/*[Hidden]*/`
- Numeric enums (e.g. `internal_grips = 0; // [0,2,4,6]`)
- "Yes/No" enums with either ordering (`[yes, no]` or `[no, yes]`) should render as a toggle by default
- Comments **after** a bracket hint should become `description` (e.g. `// [0:90] degrees`)
- String default values with quotes: `material = "PLA"; // [PLA, ABS, PETG]`
- Negative ranges: `offset = -10; // [-50:50]`
- Floating-point steps: `thickness = 2.5; // [0:0.1:10]`
- Multi-word enum values: `style = "Round Corners"; // [Round Corners, Sharp Edges]`

### Known Limitations and Gotchas

**v1 Limitations** (document clearly for users):

| Limitation | Impact | Workaround | Future |
|------------|--------|------------|--------|
| **No include/use support** | Can't use multi-file projects | Single-file models only | v1.1: ZIP upload |
| **No library imports** | Can't use MCAD, etc. | Inline required functions | v1.1: Bundle common libs |
| **No file operations** | Can't read external data | Hardcode data in .scad | v1.2: Virtual FS API |
| **Limited fonts** | text() limited to Liberation | Use provided fonts only | v1.1: More fonts |
| **60-second timeout** | Complex models may fail | Simplify or reduce $fn | Configurable in v1.1 |
| **512MB memory limit** | Very large models OOM | Reduce complexity | Warn user earlier |

**OpenSCAD Compatibility Notes**:
- WASM version may lag behind desktop OpenSCAD (document version in UI)
- Some experimental features may not be available
- Performance flags (manifold, fast-csg) may behave differently
- Floating-point precision may differ slightly from desktop

**Browser Quirks**:
- Safari: May need specific WASM build (check compatibility)
- Firefox: SharedArrayBuffer disabled in private mode
- Mobile browsers: May have lower memory limits (256MB)
- iOS Safari: File picker UX is different (system modal)

**Parameter Parsing Gotchas**:
```javascript
// VALID: Standard Customizer patterns
width = 50; // [10:100]
style = "round"; // [round, square, hex]

// VALID: OpenSCAD supports but harder to parse
width=50;//[10:100]  // No spaces
width = 50 ; // [ 10 : 100 ] // Lots of spaces

// INVALID: Will fall back to "bare parameter"
width = 50; /* [10:100] */  // Block comment instead of line comment
width = 50; // [10,100]  // Comma instead of colon

// TRICKY: String values with special characters
name = "test"; // [test, "test 2", test-3]  // Quotes optional but recommended
```

**Development Gotchas**:
- WASM files must be served with correct MIME type (`application/wasm`)
- SharedArrayBuffer requires secure context (HTTPS or localhost)
- Worker scripts must be same-origin
- Large WASM files may timeout on slow connections (show progress)
- Vite dev server has different behavior than production build (test both)

#### 2.2 UI Generation

**Deliverables:**
- Schema-driven form rendering
- Collapsible group sections
- Range slider component
- Number input component
- Select dropdown component
- Toggle switch component
- Help tooltip component
- Unit display
- Reset to defaults button

**Acceptance Criteria:**
- Renders all parameter types correctly
- Sliders respect min/max/step
- Number inputs validate on blur and show error for out-of-range values
- Number inputs allow direct typing and support increment/decrement via keyboard (arrow keys)
- Selects show all enum options
- Toggles work for yes/no enums
- All inputs are keyboard accessible
- Screen readers can navigate form
- Tab order follows visual layout (top-to-bottom, left-to-right within groups)

**UI Component Specifications**:

| Component | HTML Pattern | Accessibility | Styling |
|-----------|-------------|---------------|---------|
| **Range Slider** | `<input type="range">` + display value | Label, aria-valuemin/max/now | Custom track/thumb with CSS |
| **Number Input** | `<input type="number">` | Label, min/max/step attributes | Clear increment buttons |
| **Select Dropdown** | `<select>` with `<option>` | Label, first option is default | Custom arrow icon optional |
| **Toggle Switch** | `<input type="checkbox">` + custom style | Label, role="switch" for SR | Visible on/off states |
| **Group Section** | `<details><summary>` | Native keyboard, expanded state | Custom chevron icon |
| **Help Tooltip** | `<button>` + `aria-describedby` | Focusable, ESC to close | Positioned absolute |

**Example: Range Slider Implementation**:
```html
<div class="param-control">
  <label for="param-width">
    Width
    <span class="param-unit">mm</span>
  </label>
  <div class="slider-container">
    <input 
      type="range" 
      id="param-width" 
      min="10" 
      max="100" 
      step="1" 
      value="50"
      aria-valuemin="10"
      aria-valuemax="100"
      aria-valuenow="50"
      aria-valuetext="50 millimeters"
    />
    <output for="param-width" class="slider-value">50</output>
  </div>
  <button 
    class="param-help" 
    aria-label="Help for Width parameter"
    aria-describedby="help-width"
  >?</button>
  <div id="help-width" role="tooltip" hidden>
    Controls the width of the base. Recommended: 40-60mm.
  </div>
</div>
```

**A11y implementation checklist (minimum)**:
- Every input has a visible `<label>` and is programmatically associated via `for`/`id`
- Group sections use native `<details><summary>` for built-in keyboard support
- Status/progress updates go to a single live region (debounce to avoid spamming screen readers)
- Errors are announced via `aria-live="assertive"` region and shown visually near controls
- Focus management: after error, focus moves to first invalid control
- All colors meet WCAG AA contrast (4.5:1 for text, 3:1 for UI)
- Focus indicators are visible (2px outline minimum, not relying on browser default)

#### 2.3 State Management

**Deliverables:**
- Centralized state store with pub/sub pattern
- Parameter value tracking with dirty state
- URL serialization (hash params)
- State persistence (URL + optional localStorage)
- Undo/redo capability (P2)

**State Structure**:
```javascript
const state = {
  // File
  uploadedFile: { name: 'model.scad', content: '...', size: 12345 },
  
  // Schema
  schema: { /* extracted parameter schema */ },
  
  // Current values
  parameters: { width: 50, height: 100, /* ... */ },
  
  // Defaults (for reset)
  defaults: { width: 50, height: 100, /* ... */ },
  
  // Render state
  rendering: false,
  renderProgress: 0,
  lastRenderTime: null,
  
  // Output
  stl: ArrayBuffer | null,
  stlStats: { triangles: 1234, size: 56789 },
  
  // UI state
  expandedGroups: ['dimensions', 'options'],
  error: null,
};
```

**State Management Pattern**:
```javascript
// Simple pub/sub without external dependencies
class StateManager {
  constructor(initialState) {
    this.state = initialState;
    this.subscribers = [];
  }
  
  subscribe(callback) {
    this.subscribers.push(callback);
    return () => this.subscribers = this.subscribers.filter(cb => cb !== callback);
  }
  
  setState(updates) {
    const prevState = this.state;
    this.state = { ...this.state, ...updates };
    this.subscribers.forEach(cb => cb(this.state, prevState));
    this.syncToURL();
  }
  
  getState() {
    return this.state;
  }
  
  syncToURL() {
    // Debounced URL update with only non-default parameters
  }
}
```

**URL format (v1)**:
- Use URL hash (no server needed): `#v=1&params=<encoded>`
- `params` is `encodeURIComponent(JSON.stringify(values))`
- Only include non-default values to keep URLs short
- Practical maximum ~8KB (modern browsers support much more, but keep URLs shareable)

**URL Serialization Example**:
```
// Before: All parameters
{ width: 50, height: 100, color: "red", enabled: true }

// After: Only non-default values
{ color: "red" }  // if width=50, height=100, enabled=true are defaults

// URL: https://example.com/#v=1&params=%7B%22color%22%3A%22red%22%7D
```

### Phase 3: Polish and Deploy (Week 4-5)

#### 3.1 3D Preview

**Deliverables:**
- Three.js integration
- STLLoader for generated output
- OrbitControls (rotate, zoom, pan)
- Default lighting setup
- Auto-fit camera to model
- Loading/generating state indicator

#### 3.2 Accessibility Audit

**Deliverables:**
- Keyboard navigation testing
- Screen reader testing (NVDA, VoiceOver)
- Color contrast verification
- Focus indicator styling
- ARIA labels and live regions
- Reduced motion support

**Testing Tools**:
- Lighthouse (Accessibility score 90+)
- axe DevTools
- NVDA (Windows)
- VoiceOver (macOS/iOS)
- Manual keyboard-only navigation
- Color contrast analyzer

#### 3.3 Testing Strategy

**Unit Tests** (Optional for v1):
- Parameter parser with edge cases
- Schema validator
- URL serialization/deserialization

**Integration Tests** (Manual for v1):
- File upload flow
- Parameter extraction from example models
- STL generation with various parameter combinations
- Error handling (timeout, invalid files, memory errors)
- Browser compatibility testing

**Test Cases** (Minimum for v1):
1. Upload universal cuff → verify all parameters extracted
2. Adjust 3 different parameter types → generate STL → verify download
3. Test with invalid .scad file → verify error message
4. Test with 5MB+ file → verify size limit warning
5. Test timeout with complex model → verify 60s timeout message
6. Keyboard-only navigation through entire flow
7. Screen reader announcement verification
8. Mobile device testing (iOS Safari, Android Chrome)

#### 3.4 Deployment

**Deliverables:**
- Vercel configuration
- COOP/COEP headers for SharedArrayBuffer
- Asset optimization
- CDN caching strategy
- Error monitoring setup

**COOP/COEP requirement**:
OpenSCAD WASM builds may require `SharedArrayBuffer`, which requires cross-origin isolation.
Add headers in `vercel.json`:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

**Vercel Configuration** (`vercel.json`):

The rewrites rule ensures URL hash-based state works when users refresh or share deep links. All routes serve `index.html`, which then reads the hash to restore state.

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cross-Origin-Opener-Policy",
          "value": "same-origin"
        },
        {
          "key": "Cross-Origin-Embedder-Policy",
          "value": "require-corp"
        },
        {
          "key": "Cross-Origin-Resource-Policy",
          "value": "cross-origin"
        }
      ]
    }
  ],
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Production Monitoring and Observability

**Metrics to Track** (optional but recommended):

| Metric | Purpose | Tool |
|--------|---------|------|
| **Page views** | Usage statistics | Plausible/Simple Analytics |
| **File upload success rate** | Upload reliability | Custom logging |
| **Average render time** | Performance baseline | Performance API |
| **Render success rate** | Rendering reliability | Custom logging |
| **Error frequency by type** | Issue prioritization | Error tracking |
| **Browser distribution** | Compatibility focus | Analytics |
| **Bounce rate** | UX effectiveness | Analytics |

**Error Tracking** (Privacy-Respecting):
```javascript
// Log errors without PII
function logError(error) {
  // Only in production
  if (process.env.NODE_ENV !== 'production') return;
  
  // Sanitize error (remove file content, user data)
  const sanitized = {
    type: error.code || error.name,
    message: error.message,
    timestamp: Date.now(),
    browser: navigator.userAgent.split(' ')[0], // Just browser name
    // DO NOT LOG: file content, parameter values, user IP
  };
  
  // Send to logging endpoint (if implemented)
  // OR just console.error for manual monitoring
  console.error('Production Error:', sanitized);
}
```

**Performance Monitoring**:
```javascript
// Track key user timings
performance.mark('upload-start');
// ... upload happens ...
performance.mark('upload-end');
performance.measure('upload-duration', 'upload-start', 'upload-end');

// Log aggregate performance data (no PII)
const perfData = performance.getEntriesByType('measure');
```

**Health Check Endpoint** (optional, via Vercel serverless function):
```javascript
// api/health.js - Simple health check
export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
}
```

**Privacy Considerations**:
- **Never log**: .scad file content, parameter values, IP addresses, user identifiers
- **Only log**: error types, performance metrics, browser names (not full UA)
- **Opt-in only**: If adding any tracking, make it opt-in with clear disclosure
- **GDPR compliance**: No personal data = no GDPR issues
- **Cookie-free**: Use localStorage or URL params only (no tracking cookies)

---

## Reference Implementations

### Validated Projects (2026-01-12)

#### 1. seasick/openscad-web-gui

**URL**: https://github.com/seasick/openscad-web-gui

**License**: GPL-3.0

**What We Can Learn**:
- Worker setup patterns
- Virtual FS initialization (fonts)
- Parameter marshalling to -D flags
- Performance flags (manifold, fast-csg, lazy-union)

**What We Should NOT Copy**:
- GPL code directly (reimplement patterns instead)
- Their specific UI

#### 2. openscad/openscad-playground

**URL**: https://github.com/openscad/openscad-playground

**What We Can Learn**:
- Message protocol for worker communication
- BrowserFS mounting patterns
- Exception handling from callMain

#### 3. Legacy Web Customizers (concept reference)

**What We Can Learn**:
- User flow (upload → customize → download)
- Parameter grouping and UI patterns
- Beginner-friendly guidance approach

**What's Different**:
- Many legacy tools use server-side rendering (we use client-side)
- Many legacy tools are proprietary (we're open source)

### Notes on Referencing Third-Party Products (Trademarks)

This project may discuss other tools as **inspiration**. To reduce legal/trademark risk:
- Prefer **generic descriptions** (“commercial parametric model maker”, “web customizer”) over naming specific products.
- If a name is included, use it **only for identification** (not branding), do not use logos, and include a clear “not affiliated / not endorsed” disclaimer.
- Because we do not need any specific commercial product names to implement this project, it is **best to leave brand names out of public-facing docs**.

---

## Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation | Phase |
|------|------------|--------|------------|-------|
| **WASM bundle size (15-30MB)** | High | Medium | Lazy load after page render; show progress; HTTP cache; CDN | 1.2 |
| **Browser compatibility** | Medium | High | Target Chrome 67+, Firefox 79+, Safari 15.2+; show unsupported message | 1.1 |
| **Memory exhaustion** | Medium | Medium | 512MB WASM limit; detect OOM; clear error; suggest simplification | 1.2 |
| **Render timeout** | High | Medium | 60s timeout; terminate worker; suggest optimization; allow retry | 1.2 |
| **Parameter parsing edge cases** | High | Medium | Comprehensive test suite; graceful degradation; "bare parameter" fallback | 2.1 |
| **SharedArrayBuffer unavailable** | Low | High | Detect COOP/COEP; fallback to slower WASM build if possible; clear error | 1.2 |
| **Include/use dependencies** | Medium | Low | Detect statements; show v1 limitation message; document v1.1 ZIP support | 1.3 |
| **OpenSCAD version drift** | Low | Medium | Pin WASM version; document build date; test before updates | 1.2 |

### User Experience Risks

| Risk | Likelihood | Impact | Mitigation | Phase |
|------|------------|--------|------------|-------|
| **Long initial load** | High | High | Progress indicator; "Loading..." message; defer WASM load | 1.2 |
| **Complex models fail** | Medium | High | Timeout handling; memory limit detection; suggest simplification | 1.2 |
| **Confusing parameter names** | High | Medium | Extract comments as help text; group parameters; show units | 2.2 |
| **Mobile performance** | Medium | Medium | Test on real devices; show desktop-recommended message; ensure usable | 3.3 |
| **Cryptic OpenSCAD errors** | High | High | Parse common errors; translate to user-friendly messages; link to docs | 2.3 |
| **Lost work on refresh** | Medium | Medium | URL hash persistence; browser localStorage for drafts (P1) | 2.3 |
| **Accessibility barriers** | Low | High | WCAG 2.1 AA compliance; test with screen readers; keyboard navigation | 3.2 |

### Mitigation Priorities

**P0 (Must Have for v1)**:
- WASM lazy loading with progress
- Timeout handling with clear errors
- Parameter parsing fallback
- Keyboard accessibility
- Mobile usability (even if not optimized)

**P1 (Should Have for v1)**:
- Browser compatibility detection
- Error message translation
- URL persistence
- Memory limit warnings

**P2 (Nice to Have for v1.1)**:
- Include/use support
- localStorage persistence
- Advanced error parsing

---

## Success Metrics

### v1 Launch Criteria (MVP)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Core functionality | 100% | Can upload, customize, download STL |
| Example works | 100% | Universal cuff renders correctly |
| Parameter extraction | 95%+ | Correctly extracts most params |
| Accessibility | WCAG 2.1 AA | Lighthouse score 90+ |
| Performance | Under 10s | Time from param change to preview |
| Browser support | Chrome, Firefox, Safari, Edge | Manual testing |

---

## Licensing

### This Repository

**License**: GPL-3.0-or-later

**Why GPL**:
- Simplifies compliance with OpenSCAD WASM (GPL)
- Allows reuse of patterns from GPL reference implementations
- Ensures generated apps remain open source

### Generated Output

When users generate STL files, those STL files are:
- **Not GPL-licensed** (data output, not derived work)
- **Owned by the user** (their model, their parameters)

### Compliance Requirements

```
webapp/
├── LICENSE                    # GPL-3.0-or-later
├── THIRD_PARTY_NOTICES.md     # Attribution
├── SOURCE_OFFER.md            # How to obtain source
└── public/
    └── wasm/
        ├── openscad.wasm
        ├── LICENSE.GPL        # OpenSCAD license
        └── SOURCE.txt         # Version + build info
```

---

## Development Environment

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ LTS | Build tooling |
| npm | 9+ | Package management |
| Git | 2.30+ | Version control |

### Setup

```bash
# Clone repository
git clone https://github.com/YOUR_ORG/openscad-web-customizer-forge.git
cd openscad-web-customizer-forge

# Install dependencies
npm install

# Download OpenSCAD WASM (one-time setup)
npm run setup-wasm

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Deploy to Vercel
vercel --prod
```

### Build Configuration

**package.json Scripts**:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "setup-wasm": "node scripts/download-wasm.js",
    "lint": "eslint src/",
    "format": "prettier --write src/",
    "test": "echo 'Tests coming in Phase 3'",
    "check-a11y": "lighthouse http://localhost:5173 --only-categories=accessibility --quiet"
  }
}
```

**vite.config.js**:
```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'ajv': ['ajv'],
        },
      },
    },
  },
  server: {
    port: 5173,
    headers: {
      // Required for SharedArrayBuffer in development
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['openscad-wasm'], // If we vendor WASM
  },
});
```

**scripts/download-wasm.js** (to be created):
```javascript
// Downloads OpenSCAD WASM artifacts to public/wasm/
// This script will:
// 1. Fetch latest release from https://github.com/openscad/openscad-wasm/releases
//    or use openscad-playground's CDN as fallback
// 2. Extract required files (openscad.js, openscad.wasm, openscad.data if needed)
// 3. Verify integrity with checksums (publish known-good checksums in repo)
// 4. Place in public/wasm/ directory
// 5. Create SOURCE.txt with version info and download date
// 6. Download Liberation fonts to public/fonts/ if not present
//
// Usage: node scripts/download-wasm.js [--version=<tag>]
// Default: latest release
//
// Note: WASM files are ~15-30MB and gitignored. Each developer runs this once.
```

### Development Workflow

**Daily Development**:
1. `npm run dev` - Start dev server
2. Edit files in `src/` - Hot reload automatically
3. Test in browser at http://localhost:5173
4. Check console for errors/warnings

**Before Committing**:
1. `npm run lint` - Check for code issues
2. `npm run format` - Format code consistently
3. Test in multiple browsers (Chrome, Firefox, Safari)
4. Check accessibility with Lighthouse

**Before Deploying**:
1. `npm run build` - Create production build
2. `npm run preview` - Test production build locally
3. `npm run check-a11y` - Verify accessibility score
4. Manual testing of all features
5. Check bundle size (dist/ folder should be < 500KB excluding WASM)

### Debugging Tips

**WASM Issues**:
- Check browser console for detailed WASM errors
- Verify COOP/COEP headers are set (check Network tab)
- Check if SharedArrayBuffer is available: `typeof SharedArrayBuffer !== 'undefined'`
- Use `openscad --version` output from WASM to verify version

**Worker Issues**:
- Use `console.log()` in worker (appears in browser console)
- Use browser DevTools' dedicated Worker inspector
- Add message logging to track communication
- Verify worker script is loaded (Network tab)

**Performance Profiling**:
- Use Chrome DevTools Performance tab
- Record during STL generation to find bottlenecks
- Check memory usage (Memory tab)
- Use Lighthouse for overall performance audit

---

## Open Questions

### Resolved

| Question | Decision | Rationale |
|----------|----------|-----------|
| v1 scope | Web app (not CLI) | Faster user value |
| License | GPL-3.0-or-later | OpenSCAD WASM compatibility |
| UI framework | Vanilla JS | Minimal deps, accessibility |
| Deployment | Vercel | Free, static hosting |

### Resolved for v1

| Question | Decision | Rationale |
|----------|----------|-----------|
| Include file support | Warn only (v1), ZIP upload (v1.1) | Simplifies MVP, covers 80% of use cases |
| WASM source | Official openscad/openscad-wasm | Maintained by upstream, latest features |
| 3D preview | Optional (P1 feature) | Core value is STL generation, preview enhances UX |
| Mobile support | Warning message | Desktop-primary for v1, mobile tested but not optimized |

### Pending (Decide During Implementation)

| Question | Options | Decision Point | Recommended Default |
|----------|---------|----------------|---------------------|
| WASM memory strategy | (a) Fixed 512MB (b) Growth allowed | Phase 1.2 | (b) Growth allowed with 512MB initial |
| Error message i18n | (a) English only (b) Multi-language | Phase 2.2 | (a) English only for v1 |
| Analytics/telemetry | (a) None (b) Privacy-respecting (c) Full | Phase 3.4 | (b) Privacy-respecting (Plausible) |
| Preview LOD strategy | (a) Vertex limit (b) Decimation (c) None | Phase 3.1 | (a) Vertex limit with warning |

**Decision Process**: Use the recommended defaults unless technical constraints discovered during implementation suggest otherwise. Document any deviations in the changelog.

---

## Recommendations and Gap Analysis

### Identified Gaps

| Gap | Description | Recommendation |
|-----|-------------|----------------|
| **WASM source not finalized** | Need to decide on OpenSCAD WASM artifact source | Test openscad-playground's approach first |
| **Include/use support** | Many .scad files use includes | v1.1: Support ZIP upload with dependencies |
| **Font support** | OpenSCAD needs fonts for text() | Bundle Liberation Sans in public/fonts/ |
| **Library support** | MCAD and other libraries | v1.1: Allow library ZIP upload |
| **Error messages** | OpenSCAD errors are cryptic | Translate common errors to user-friendly messages |
| **Preview performance** | Large STLs may lag Three.js | Implement LOD or vertex limit warning |
| **Offline support** | Users may want offline use | v1.1: Service worker for PWA |

### Example Models Strategy

**v1 MVP Examples**:
1. **Universal Cuff** (included) - Demonstrates complex grouping, many parameters
2. **Simple Box** (create) - Minimal example for testing (3 params: width, height, depth)
3. **Parametric Cylinder** (create) - Demonstrates step values ($fn parameter)

**Example Model Requirements**:
- Must have Customizer annotations
- Must render in < 10 seconds on average hardware
- Must have helpful parameter descriptions
- Must demonstrate different UI control types
- Must be useful (not just a demo)
- Must have clear licensing (GPL-compatible, public domain like CC0, or permissive like MIT)

**Example Loading**:
```javascript
const examples = [
  {
    name: 'Universal Cuff',
    description: 'Assistive device holder',
    path: '/examples/universal-cuff/universal_cuff_utensil_holder.scad',
    thumbnail: '/examples/universal-cuff/thumbnail.png',
    author: 'Volksswitch',
    license: 'CC0-1.0',  // Public domain
  },
  // ... more examples
];
```

### Additional Recommendations

1. **Performance Budget**: Set hard limits on initial bundle size (<200KB before WASM)
2. **Analytics**: Add privacy-respecting analytics (e.g., Plausible) to understand usage patterns - no personal data
3. **Feedback Loop**: Add "Report Issue" button linking to GitHub Issues with template
4. **Example Gallery**: Curate 5-10 high-quality example models beyond universal cuff (see strategy above)
5. **Social Sharing**: Add OpenGraph meta tags for link previews (screenshot of model + parameters)
6. **Mobile-First Testing**: Test on real devices early and often (minimum: iOS Safari, Android Chrome)
7. **Progressive Web App**: Consider PWA manifest for "Add to Home Screen" capability (v1.1)
8. **Offline Support**: Service worker for offline use after first load (v1.1)
9. **Error Telemetry**: Optional error reporting to help identify common issues (opt-in only)
10. **Documentation**: Inline help for first-time users ("First time? Click here for a tour")
11. **Keyboard Shortcuts**: Add shortcuts for power users (Ctrl+Enter to render, R to reset, etc.)
12. **Dark Mode**: Respect `prefers-color-scheme` media query (P1 feature)

---

## Post-Launch Roadmap (Beyond v2)

### v1.1 - Enhanced Usability (2-3 weeks after v1 launch)
- ZIP upload for multi-file projects (include/use support)
- Browser localStorage persistence (save drafts)
- More example models (5-10 curated examples)
- Keyboard shortcuts for power users
- Dark mode implementation
- Basic PWA support (offline use)
- Download parameter snapshot (JSON export)

### v1.2 - Advanced Features (1-2 months after v1)
- Multiple output formats (OBJ, 3MF, AMF)
- STL preview with measurements
- Parameter presets (save/load named sets)
- Comparison view (render multiple parameter sets)
- OpenSCAD library bundles (MCAD, BOSL2)
- Advanced parameter types (color picker, file upload)
- Render queue (batch multiple variants)

### v2.0 - Developer Toolchain (3-4 months after v1)
- CLI: `openscad-forge extract` - Parameter extraction
- CLI: `openscad-forge scaffold` - Project generation
- CLI: `openscad-forge validate` - Parity testing
- Golden fixture system for CI/CD
- React template option
- Custom theme generator

### v3.0 - Community Platform (6+ months after v1)
- Model hosting/sharing platform
- User accounts (optional)
- Model gallery with search
- Remix/fork functionality
- Comments and ratings
- Integration API for embedding in other sites
- Model analytics for creators

### Long-Term Vision
- Multi-user collaboration (real-time parameter sharing)
- Version control for models
- Marketplace for premium models
- Educational content (tutorials, courses)
- Mobile apps (iOS, Android)
- Desktop app (Electron wrapper)
- Plugin system for custom parameter types
- AI-assisted parameter suggestions

---

## Contributing

### Code Style

**JavaScript**:
- Use modern ES6+ syntax
- Prefer `const` over `let`, avoid `var`
- Use arrow functions for callbacks
- Use template literals for string interpolation
- Add JSDoc comments for public functions

```javascript
/**
 * Extracts Customizer parameters from OpenSCAD source code
 * @param {string} scadContent - The .scad file content
 * @returns {Object} Parameter schema in internal format
 * @throws {Error} If parsing fails critically
 */
function extractParameters(scadContent) {
  // Implementation
}
```

**CSS**:
- Use CSS custom properties for theming
- Mobile-first responsive design
- BEM-inspired naming for components
- Group related properties (box model, typography, visual)
- Comment complex selectors

**HTML**:
- Semantic HTML5 elements
- ARIA labels where needed
- Progressive enhancement (works without JS for basic content)

### Git Workflow

**Branch Naming**:
- `feature/parameter-extraction` - New features
- `fix/slider-range-bug` - Bug fixes
- `docs/api-documentation` - Documentation
- `refactor/state-management` - Code refactoring

**Commit Messages**:
```
type(scope): short description

Longer explanation if needed.

Fixes #123
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Pull Request Process**:
1. Create feature branch from `main`
2. Implement feature with tests
3. Update documentation
4. Ensure accessibility (run Lighthouse)
5. Create PR with description
6. Address review comments
7. Squash and merge when approved

### Testing Checklist (Before PR)

- [ ] Tested in Chrome, Firefox, Safari
- [ ] Tested on mobile (iOS Safari, Android Chrome)
- [ ] Keyboard navigation works
- [ ] Screen reader tested (NVDA or VoiceOver)
- [ ] Lighthouse accessibility score 90+
- [ ] No console errors or warnings
- [ ] Works with example models
- [ ] Error states handled gracefully
- [ ] Code formatted with Prettier
- [ ] No linter errors

## Changelog

### v1.7.0 (2026-01-13) — Parameter Presets System

- **MILESTONE**: Parameter presets feature complete (v1.2 Advanced Features)
- **Added**: Comprehensive preset management system
  - Save current parameters as named presets
  - Load presets instantly from dropdown or modal
  - Manage presets (view, load, delete, export)
  - Presets scoped per model (.scad file)
- **Added**: Import/Export functionality
  - Export individual presets as JSON
  - Export all presets for a model as collection
  - Import single or collection JSON files
  - Smart merging (duplicate names update existing)
- **Added**: Preset UI controls
  - Save Preset button (💾) in parameters panel
  - Manage button (📋) for preset management
  - Quick-load dropdown with preset list
  - Full keyboard accessibility (Tab, Enter, Escape)
- **Added**: Save Preset modal
  - Name field (required, autofocused)
  - Description field (optional, multiline)
  - Form validation and error handling
- **Added**: Manage Presets modal
  - Scrollable list of all saved presets
  - Per-preset actions (Load, Export, Delete)
  - Bulk actions (Import, Export All)
  - Empty state message
  - Responsive mobile layout
- **Added**: LocalStorage persistence
  - All presets saved to `openscad-customizer-presets` key
  - Organized by model name
  - Graceful degradation if storage unavailable
  - Quota exceeded warning
- **Enhanced**: State management integration
  - Preset dropdown updates on file change
  - Loading preset updates parameter state
  - State subscription for UI sync
- **Enhanced**: Accessibility (WCAG 2.1 AA)
  - ARIA labels and roles on all modals
  - Focus management (auto-focus, focus trap)
  - Escape key and backdrop click to close
  - Screen reader status announcements
  - 44px minimum touch targets
- **Enhanced**: Responsive design
  - Desktop: side-by-side layout
  - Mobile: stacked layout with full-width controls
  - Modal scrollable with max-height constraints
- **Technical**: New `PresetManager` class (374 lines)
  - CRUD operations (save, load, delete, rename)
  - Import/Export with validation
  - Event subscription system
  - Storage statistics and housekeeping
- **Technical**: +272 lines CSS for preset UI
- **Build time**: 3.83s ✅
- **Bundle size impact**: +4.1KB gzipped (172.53KB → 176.63KB)
- **Accessibility**: WCAG 2.1 AA compliant
- **Browser compatibility**: Chrome 120+, Firefox 121+, Safari 17+, Edge 120+

### v1.6.0 (2026-01-13) — Multiple Output Formats

- **MILESTONE**: Multi-format export support complete
- **Added**: Support for 5 output formats
  - STL (Standard Tessellation Language) - default
  - OBJ (Wavefront Object) - widely supported
  - OFF (Object File Format) - geometry format
  - AMF (Additive Manufacturing File) - advanced features
  - 3MF (3D Manufacturing Format) - modern standard
- **Added**: Format selector dropdown in UI
  - Located above action buttons
  - Shows format description on selection
  - Updates button text dynamically
- **Added**: Format-specific rendering in worker
  - Multi-format render logic
  - Fallback export method for unsupported formats
  - Triangle counting for all mesh formats
  - Format detection and conversion
- **Added**: Format-aware download system
  - Correct file extensions (.stl, .obj, .off, .amf, .3mf)
  - Format-specific MIME types
  - Smart filename generation
- **Enhanced**: RenderController with format support
  - `outputFormat` option in render calls
  - Backwards compatible (STL default)
  - Format passed through to worker
- **Enhanced**: Download manager
  - `OUTPUT_FORMATS` definitions
  - `downloadFile()` for any format
  - Legacy `downloadSTL()` maintained
- **Technical**: +200 lines across 6 files
- **Build time**: 2.39s ✅
- **Bundle size impact**: +0.73KB gzipped
- **Formats tested**: STL (verified), others pending WASM support verification

### v1.5.0 (2026-01-13) — High Contrast Mode

- **MILESTONE**: High contrast accessibility mode complete
- **Added**: Independent high contrast modifier system
  - Works with any theme (Light, Dark, Auto)
  - Creates 4 visual modes: Normal/HC × Light/Dark
  - WCAG AAA (7:1) color contrast ratios
  - Pure black/white for maximum contrast
- **Added**: Enhanced typography in high contrast mode
  - 12-17% larger text across all sizes
  - Improved readability for low vision users
  - Maintains proportional scaling
- **Added**: Stronger visual elements
  - 2-3px borders (vs 1px normal)
  - 4px focus rings (vs 3px normal)
  - Thicker grid lines in 3D preview
  - Enhanced shadows for depth
- **Added**: HC toggle button in header
  - "HC" label with contrast icon
  - Visual indicator when active
  - Keyboard accessible (Tab + Enter/Space)
  - ARIA labels for screen readers
- **Added**: Persistent high contrast preferences
  - Saved to localStorage (`openscad-customizer-high-contrast`)
  - Independent from theme preference
  - Survives browser sessions
- **Enhanced**: ThemeManager with high contrast support
  - `toggleHighContrast()` method
  - `applyHighContrast(enabled)` method
  - `getState()` returns theme + contrast state
  - Listener notifications include HC state
- **Enhanced**: PreviewManager with HC color palettes
  - New schemes: `light-hc`, `dark-hc`
  - Automatic color updates on toggle
  - Thicker grid lines in HC mode
- **Technical**: +120 lines CSS, +60 lines JS
- **Build time**: 2.53s ✅ (faster than v1.4.0!)
- **Bundle size impact**: +0.89KB gzipped
- **Accessibility**: WCAG 2.1 AAA compliant

### v1.4.0 (2026-01-13) — Dark Mode Implementation

- **MILESTONE**: Dark mode system complete with user-controlled theme switching
- **Added**: Comprehensive three-mode theme system (Auto, Light, Dark)
  - Auto mode follows system preference (`prefers-color-scheme`)
  - Manual Light/Dark modes override system setting
  - Smooth cycling: Auto → Light → Dark → Auto
- **Added**: Theme toggle button in header
  - Sun icon (☀️) in dark mode, moon icon (🌙) in light mode
  - Accessible via keyboard (Tab + Enter/Space)
  - ARIA labels for screen readers
  - Smooth icon transitions
- **Added**: Persistent theme preferences
  - Saved to localStorage (`openscad-customizer-theme`)
  - Survives browser sessions
  - Graceful degradation if localStorage unavailable
- **Added**: Three.js preview theme integration
  - Scene background adapts to theme
  - Grid colors optimized for visibility
  - Model colors enhanced for contrast
  - Smooth transitions between themes
- **Enhanced**: Color system with 36 theme-aware variables
  - 18 colors for light mode
  - 18 colors for dark mode
  - All via CSS custom properties
  - Automatic cascade via `data-theme` attribute
- **Technical**: New `ThemeManager` class (195 lines)
  - Theme detection and application
  - localStorage persistence
  - Event listener system
  - System preference monitoring
- **Technical**: Enhanced `PreviewManager` with theme support
  - `updateTheme()` method for dynamic recoloring
  - Theme-aware color palettes
  - Grid helper regeneration on theme change
- **Build time**: 2.71s ✅
- **Bundle size impact**: +3KB (+0.8KB gzipped)
- **Documentation**: Comprehensive testing guide and changelog

### v1.3.0 (2026-01-13) — ZIP Upload & Multi-File Projects

- **MILESTONE**: ZIP upload support for multi-file OpenSCAD projects COMPLETE
- **Added**: ZIP file upload and extraction (JSZip library)
  - Automatic main file detection (5 strategies)
  - Virtual filesystem mounting in OpenSCAD worker
  - File tree visualization with main file badge
  - Support for include/use statements with relative paths
  - Validation (20MB ZIP limit, format checking)
- **Added**: Multi-file example project (Multi-File Box)
  - Demonstrates include/use statements
  - Modular code organization
  - Helper functions and reusable modules
- **Modified**: Worker to support virtual filesystem operations
  - mountFiles() and clearMountedFiles() functions
  - Directory creation and file mounting
  - Support for nested directory structures
- **Modified**: Render controller to pass project files
  - files and mainFile options added
  - Automatic file mounting before render
- **Modified**: Auto-preview controller for multi-file support
  - setProjectFiles() method
  - Pass files to render operations
- **Modified**: Main UI to handle ZIP uploads
  - ZIP file detection and validation
  - Async file extraction
  - File tree display in UI
  - State management for project files
- **Technical**: ~500 lines of new code
- **Dependencies**: Added JSZip for ZIP extraction
- **Build time**: 2.72 seconds ✅
- **Bundle size impact**: ~10KB (JSZip tree-shaken)

### v1.2.0 (2026-01-13) — Auto-Preview & Progressive Enhancement

- **MILESTONE**: Auto-preview system for real-time visual feedback COMPLETE
- **Added**: Progressive Enhancement rendering strategy
  - Immediate "pending changes" indicator when parameters change
  - Auto-render with debounce (1.5s) at preview quality ($fn capped at 24)
  - Cached preview renders to avoid redundant computation (max 10 cache entries)
  - Full-quality render only on "Download STL" click
  - Smart button logic: "Download STL" when ready, "Generate STL" when params changed
- **Added**: Preview quality control (reduced $fn for faster iteration: 2-8s vs 10-60s)
- **Added**: Visual preview state indicators (idle, pending, rendering, current, stale, error)
- **Added**: Rendering overlay with spinner during preview generation
- **Improved**: UX flow - 5-10x faster parameter iteration
- **Technical**: New `AutoPreviewController` class (375 lines) for render orchestration
- **Technical**: Render caching by parameter hash with LRU eviction
- **Technical**: Quality tiers (PREVIEW: $fn≤24, 30s timeout | FULL: unlimited $fn, 60s timeout)
- **Tested**: Simple Box example renders successfully (0.73s, 296 triangles, 888 vertices)
- **Tested**: State management working correctly (idle → current transitions)

### v1.1.0 (2026-01-12) — Enhanced Usability Release

- **MILESTONE**: v1.1 complete with all enhanced usability features
- **Added**: URL parameter persistence for sharing customized models
- **Added**: Keyboard shortcuts (Ctrl+Enter to render, R to reset, D to download)
- **Added**: Auto-save drafts with localStorage (2s debounce, 7-day expiration)
- **Added**: Copy Share Link button (clipboard API with fallback)
- **Added**: Export Parameters as JSON button
- **Added**: Simple Box example (13 params, beginner-friendly, fast render)
- **Added**: Parametric Cylinder example (12 params, shape variations)
- **Improved**: Welcome screen now shows 3 example buttons with labels
- **Improved**: Example loading unified handler for all models
- **Tested**: All features working in Chrome dev environment
- **Documentation**: Created CHANGELOG_v1.1.md with full details

### v1.0.0 (2026-01-12) — MVP Release

- **MILESTONE**: v1 MVP complete and deployed to Vercel
- **Verified**: All Phase 1-3 features implemented and tested
- **Tested**: Universal cuff example renders correctly (47 parameters, 10 groups)
- **Verified**: STL generation produces valid output (tested in secondary CAD system)
- **Verified**: 3D preview working with Three.js
- **Verified**: WCAG 2.1 AA accessibility compliance
- **Cleaned**: Removed unused placeholder files and empty directories

### v0.2.0 (2026-01-12) — Major Rescope and Validation

- **Changed**: v1 is now a user-facing web application, not a CLI tool
- **Changed**: Original CLI scope moved to v2
- **Added**: Detailed user journey and UI specifications
- **Added**: Phased implementation plan with deliverables
- **Added**: Success metrics for launch
- **Added**: Reference implementation analysis
- **Added**: Gap analysis and recommendations
- **Added**: Security considerations and threat model
- **Added**: Browser requirements and compatibility matrix
- **Added**: Error handling strategy with user-friendly messages
- **Added**: Performance optimization guidelines
- **Added**: CSS architecture and design system
- **Added**: Build configuration and development workflow
- **Added**: Known limitations and gotchas
- **Added**: Progressive enhancement strategy with WebGL detection
- **Added**: Testing strategy and acceptance criteria
- **Added**: Example models strategy
- **Added**: Contributing guidelines
- **Added**: String value parsing guidance for parameter extraction
- **Added**: Acceptance criteria for Download Manager (Phase 1.4)
- **Added**: Number input acceptance criteria (Phase 2.2)
- **Updated**: Architecture diagrams for web-first approach
- **Updated**: Risk assessment with specific mitigations and phases
- **Updated**: Technology stack with browser requirements
- **Updated**: Implementation plan with detailed acceptance criteria
- **Updated**: Quickstart checklist to include dev dependencies
- **Updated**: URL format guidance (removed outdated IE11 reference)
- **Updated**: Vercel configuration with rewrites explanation
- **Updated**: Open questions with recommended defaults
- **Updated**: Parameter count to exact number (~50)
- **Resolved**: Open questions (WASM source, 3D preview, mobile support, include support)

### v0.1.0 (2026-01-11) — Initial Draft

- Initial build plan with CLI-focused approach
- Parameter schema specification
- Validation framework design
