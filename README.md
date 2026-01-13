# OpenSCAD Web Customizer Forge

> **Customize parametric 3D models directly in your browser.** Upload any OpenSCAD Customizer-enabled `.scad` file, adjust parameters through an accessible UI, and download STL files—all without installing software or creating an account.

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)
[![OpenSCAD](https://img.shields.io/badge/OpenSCAD-WASM-orange.svg)](https://openscad.org/)
[![Accessibility](https://img.shields.io/badge/WCAG-2.1%20AA-green.svg)](https://www.w3.org/WAI/WCAG21/quickref/)

## 🎯 What This Does

**Think**: classic "web parametric customizer" UX, but:
- ✅ **100% client-side** — Runs entirely in your browser (no server costs)
- ✅ **No installation** — Just upload and customize
- ✅ **No account needed** — Start using immediately
- ✅ **Accessible** — WCAG 2.1 AA compliant, fully keyboard navigable
- ✅ **Open source** — GPL-3.0-or-later

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HOW IT WORKS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   1. UPLOAD         2. CUSTOMIZE           3. DOWNLOAD                       │
│                                                                              │
│   📁 Drop your      🎛️  Adjust sliders,    📥 Get your STL                   │
│   .scad file        dropdowns, toggles     ready for 3D printing             │
│                     for each parameter                                       │
│                                                                              │
│   Parameters are    Real-time 3D preview   Share via URL                     │
│   auto-detected     shows your changes     with customizations               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🚀 Try It Now

**[🔗 Live Demo](https://openscad-web-customizer-forge-gutg7h11z.vercel.app)**

Or run locally:

```bash
git clone https://github.com/YOUR_ORG/openscad-web-customizer-forge.git
cd openscad-web-customizer-forge
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

## 📋 Supported File Format

Your `.scad` file should include **OpenSCAD Customizer annotations**:

```scad
/*[Dimensions]*/
width = 50;       // [10:100]
height = 30;      // [10:80]
shape = "round";  // [round, square, hexagon]

/*[Options]*/
hollow = "yes";   // [yes, no]
wall_thickness = 2; // [1:0.5:5]

/*[Hidden]*/
$fn = 100;
```

**Supported annotation types:**

| Annotation | Example | UI Control |
|------------|---------|------------|
| `/*[Group Name]*/` | `/*[Dimensions]*/` | Collapsible section |
| `// [min:max]` | `// [10:100]` | Range slider |
| `// [min:step:max]` | `// [1:0.5:5]` | Step slider |
| `// [opt1, opt2]` | `// [round, square]` | Dropdown |
| `// [yes, no]` | `// [yes, no]` | Toggle switch |
| `// Comment` | `// Wall thickness` | Help tooltip |
| `/*[Hidden]*/` | Internal params | Not shown in UI |

## ✨ Features

### v1.0 (Current) — Web Application ✅

| Feature | Status |
|---------|--------|
| 📁 Drag-and-drop file upload | ✅ Complete |
| 🎛️ Auto-generated parameter UI | ✅ Complete |
| ⚙️ Client-side STL generation (WASM) | ✅ Complete |
| 👁️ 3D preview (Three.js) | ✅ Complete |
| 📥 Smart filename downloads | ✅ Complete |
| ♿ WCAG 2.1 AA accessibility | ✅ Complete |
| 🌙 Dark mode support | ✅ Complete |

### v1.1 — Enhanced Usability ✅

| Feature | Status |
|---------|--------|
| 🔗 Shareable URL parameters | ✅ Complete |
| 💾 Browser localStorage persistence | ✅ Complete |
| ⌨️ Keyboard shortcuts (Ctrl+Enter, R, D) | ✅ Complete |
| 📋 Copy Share Link button | ✅ Complete |
| 💾 Export parameters as JSON | ✅ Complete |
| 📚 3 example models (Simple Box, Cylinder, Universal Cuff) | ✅ Complete |

### v1.2 (Current) — Auto-Preview & Progressive Enhancement ✅

| Feature | Status |
|---------|--------|
| 🔄 Auto-preview on parameter change | ✅ Complete |
| ⚡ Progressive quality (fast preview, full download) | ✅ Complete |
| 💾 Intelligent render caching | ✅ Complete |
| 🎯 Visual state indicators (pending, rendering, current) | ✅ Complete |
| 🎨 Smart download button logic | ✅ Complete |

### v1.3 (Planned) — Advanced Features

| Feature | Status |
|---------|--------|
| 📦 ZIP upload for multi-file projects | ⏳ Planned |
| 📐 Multiple output formats (OBJ, 3MF) | ⏳ Planned |
| 💾 Parameter presets (save/load sets) | ⏳ Planned |
| 📚 More example models | ⏳ Planned |

### v2.0 (Future) — Developer Toolchain

| Feature | Status |
|---------|--------|
| 🛠️ CLI parameter extraction | ⏳ Planned |
| 📦 Standalone app scaffolding | ⏳ Planned |
| ✅ Validation harness | ⏳ Planned |
| 🔄 Auto-sync and fixes | ⏳ Planned |

## 📖 Documentation

- [Build Plan](docs/BUILD_PLAN_NEW.md) — Development roadmap and architecture
- [Parameter Schema Spec](docs/specs/PARAMETER_SCHEMA_SPEC.md) — JSON Schema format
- [Progress Report](PROGRESS.md) — Detailed development status
- [Test Report](TEST_REPORT.md) — Comprehensive testing results
- [Examples](examples/) — Sample OpenSCAD projects

## 🏗️ Architecture

```
Browser
├── Main Thread
│   ├── File Upload Handler
│   ├── Parameter UI (auto-generated)
│   ├── 3D Preview (Three.js)
│   ├── State Manager (pub/sub)
│   └── Download Manager
│
└── Web Worker (isolated)
    └── OpenSCAD WASM Runtime
        ├── Parameter Parser
        └── STL Export Engine
```

**Key architectural decisions:**
- **Client-side only** — No backend server required
- **Web Worker isolation** — WASM runs in worker to keep UI responsive
- **Lazy loading** — WASM bundle loads on demand
- **Vanilla JS** — No framework dependencies, accessibility-first
- **NPM package** — Uses `openscad-wasm-prebuilt` for easy setup

## 🧪 Testing

The application has been comprehensively tested:

- ✅ **47 parameters** extracted from universal cuff example
- ✅ **10 parameter groups** correctly identified
- ✅ **STL generation** working (13-44s render time)
- ✅ **3D preview** with orbit controls
- ✅ **Full keyboard navigation**
- ✅ **WCAG 2.1 AA** accessibility compliance

See [TEST_REPORT.md](TEST_REPORT.md) for detailed results.

## ⚖️ Licensing

| Component | License |
|-----------|---------|
| This project | GPL-3.0-or-later |
| OpenSCAD WASM | GPL-2.0+ |
| Your `.scad` files | Your license |
| Generated STL files | Your ownership |

See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## 🙏 Acknowledgments

**Built on:**
- [OpenSCAD](https://openscad.org/) — The parametric CAD engine (GPL-2.0+)
- [openscad-wasm-prebuilt](https://www.npmjs.com/package/openscad-wasm-prebuilt) — Pre-built WASM binaries
- [Three.js](https://threejs.org/) — 3D preview rendering
- [Vite](https://vitejs.dev/) — Build tooling

**Reference implementations:**
- [seasick/openscad-web-gui](https://github.com/seasick/openscad-web-gui) — WASM integration patterns (GPL-3.0)
- [openscad/openscad-playground](https://github.com/openscad/openscad-playground) — Official web playground

## 🤝 Contributing

Contributions welcome! Please read the [Build Plan](docs/BUILD_PLAN_NEW.md) first to understand our architecture.

**Good first issues:**
- Add more example OpenSCAD models
- Improve error messages for common OpenSCAD errors
- Documentation improvements
- Add keyboard shortcuts

### Development Setup

```bash
# Clone and install
git clone https://github.com/YOUR_ORG/openscad-web-customizer-forge.git
cd openscad-web-customizer-forge
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📊 Project Status

**Current Version**: v1.2.0

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Repo bootstrap | ✅ Complete |
| 1.1 | UI shell + layout | ✅ Complete |
| 1.2 | WASM worker | ✅ Complete |
| 1.3 | File upload | ✅ Complete |
| 1.4 | Download manager | ✅ Complete |
| 2.1 | Parameter parser | ✅ Complete |
| 2.2 | UI generator | ✅ Complete |
| 2.3 | State management | ✅ Complete |
| 3.1 | 3D Preview | ✅ Complete |
| 3.2 | Accessibility | ✅ Complete |
| 3.4 | Deployment | ✅ Complete |
| **v1.1** | **URL params, localStorage, shortcuts, examples** | ✅ Complete |
| **v1.2** | **Auto-preview, progressive quality, caching** | ✅ Complete |

**v1.2: Auto-Preview & Progressive Enhancement — COMPLETE** 🎉

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Enter` | Generate STL |
| `R` | Reset parameters to defaults |
| `D` | Download STL (when available) |

## 🔄 Auto-Preview System (New in v1.2)

v1.2 introduces **automatic preview rendering** for dramatically faster parameter iteration:

### How It Works

1. **Adjust Parameters** — Change any slider, dropdown, or input
2. **Automatic Debounce** — System waits 1.5 seconds for you to finish adjusting
3. **Fast Preview Render** — Generates preview quality STL (2-8 seconds)
4. **3D Preview Updates** — See your changes immediately
5. **Full Quality on Download** — Click download to generate final high-quality STL

### Key Features

| Feature | Benefit |
|---------|---------|
| **Progressive Quality** | Preview renders use reduced detail ($fn ≤ 24) for 5-10x faster feedback |
| **Intelligent Caching** | Previously rendered parameter sets load instantly from cache |
| **Visual State Indicators** | Clear status showing pending, rendering, current, or stale preview |
| **Smart Download Button** | Automatically generates full quality STL only when needed |
| **Zero Extra Clicks** | No need to click "Generate" after every parameter change |

### Visual States

- 🟡 **Pending** — "Changes detected - preview updating..." (1.5s debounce)
- 🔵 **Rendering** — "Generating preview..." (2-8s for preview quality)
- 🟢 **Current** — "Preview ready" (preview matches current parameters)
- 🟠 **Stale** — "Preview outdated" (parameters changed since last render)
- ⚪ **Cache Hit** — Instant load (< 1s) when returning to previous parameters

### Performance Comparison

| Action | v1.1 (Manual) | v1.2 (Auto-Preview) | Improvement |
|--------|---------------|---------------------|-------------|
| **Parameter Change** | Click "Generate" → Wait 30s | Wait 1.5s → Preview in 5s | **5-10x faster** |
| **Repeated Values** | Re-render every time (30s) | Cache hit (< 1s) | **30x faster** |
| **Download STL** | Already rendered | Full quality render (30s) | Same quality |

### Example Workflow

```
1. Load "Simple Box" example
2. Adjust Width slider from 50 → 60
   → Status: "Changes detected..." (yellow)
   → After 1.5s: "Generating preview..." (blue)
   → After 5s: "Preview ready" (green) ✅
   
3. Adjust Height slider from 30 → 40
   → Status: "Changes detected..." (yellow)
   → After 1.5s: "Generating preview..." (blue)
   → After 5s: "Preview ready" (green) ✅
   
4. Change Width back to 50
   → Status: "Preview ready" (green) — instant cache hit! ⚡
   
5. Click "Download STL"
   → Status: "Generating full quality STL..." (blue)
   → After 15s: "Download ready" ✅
   → Click again: Downloads immediately (no re-render)
```

### Configuration

Auto-preview is enabled by default. Settings UI coming in v1.3:
- Debounce delay (default: 1.5s)
- Preview quality ($fn cap, default: 24)
- Cache size (default: 10 parameter sets)
- Enable/disable toggle

---

<p align="center">
  <strong>No installation. No account. Just customize.</strong>
</p>
