# OpenSCAD Web Customizer Forge

> **Customize parametric 3D models directly in your browser.** Upload any OpenSCAD Customizer-enabled `.scad` file, adjust parameters through an accessible UI, and download STL files—all without installing software or creating an account.

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)
[![OpenSCAD](https://img.shields.io/badge/OpenSCAD-WASM-orange.svg)](https://openscad.org/)

## 🎯 What This Does

**Think**: classic “web parametric customizer” UX, but:
- ✅ **100% client-side** — Runs entirely in your browser (no server costs)
- ✅ **No installation** — Just upload and customize
- ✅ **No account needed** — Start using immediately
- ✅ **Accessible** — WCAG 2.1 AA compliant, keyboard navigable
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
│   Parameters are    Real-time preview      Share via URL                     │
│   auto-detected     shows your changes     (optional)                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🚀 Try It Now

**[🔗 Live Demo](https://openscad-web-customizer-forge.vercel.app)** *(coming soon)*

Or run locally:

```bash
git clone https://github.com/YOUR_ORG/openscad-web-customizer-forge.git
cd openscad-web-customizer-forge
npm install
npm run dev
```

## 📋 Supported File Format

Your `.scad` file should include **OpenSCAD Customizer annotations**:

```scad
/*[Dimensions]*/
width = 50;       // [10:100]
height = 30;      // [10:80]
shape = "round";  // [round, square, hexagon]

/*[Options]*/
hollow = true;    // Create hollow version
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
| `/*[Hidden]*/` | Internal params | Not shown |

## ✨ Features

### v1 (Current Focus) — Web Application

| Feature | Status |
|---------|--------|
| 📁 Drag-and-drop file upload | 🔄 In Progress |
| 🎛️ Auto-generated parameter UI | 🔄 In Progress |
| ⚙️ Client-side STL generation (WASM) | 🔄 In Progress |
| 👁️ 3D preview (Three.js) | ⏳ Planned |
| 🔗 Shareable URL parameters | ⏳ Planned |
| ♿ WCAG 2.1 AA accessibility | ⏳ Planned |

### v2 (Future) — Developer Toolchain

| Feature | Status |
|---------|--------|
| 🛠️ CLI parameter extraction | ⏳ Planned |
| 📦 Standalone app scaffolding | ⏳ Planned |
| ✅ Validation harness | ⏳ Planned |
| 🔄 Auto-sync and fixes | ⏳ Planned |

## 📖 Documentation

- [Build Plan](docs/BUILD_PLAN.md) — Development roadmap and architecture
- [Parameter Schema Spec](docs/specs/PARAMETER_SCHEMA_SPEC.md) — JSON Schema format
- [Examples](examples/) — Sample OpenSCAD projects

## 🏗️ Architecture

```
Browser
├── Main Thread
│   ├── File Upload Handler
│   ├── Parameter UI (auto-generated)
│   ├── 3D Preview (Three.js)
│   └── Download Manager
│
└── Web Worker (isolated)
    └── OpenSCAD WASM Runtime
        ├── Parameter Parser
        ├── Virtual Filesystem
        └── STL Export Engine
```

**Key architectural decisions:**
- **Client-side only** — No backend server required
- **Web Worker isolation** — WASM runs in worker to keep UI responsive
- **Lazy loading** — 15-30MB WASM bundle loads on demand
- **Vanilla JS** — No framework dependencies, accessibility-first

## ⚖️ Licensing

| Component | License |
|-----------|---------|
| This project | GPL-3.0-or-later |
| OpenSCAD WASM | GPL-2.0+ |
| Your `.scad` files | Your license |
| Generated STL files | Your ownership |

See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## 🙏 Acknowledgments

**Inspired by:**
- The broader ecosystem of web-based parametric model customizers
- [braille-card-and-cylinder-stl-generator](https://github.com/BrennenJohnston/braille-card-and-cylinder-stl-generator) — Validation patterns

**Built on:**
- [OpenSCAD](https://openscad.org/) — The parametric CAD engine (GPL-2.0+)
- [seasick/openscad-web-gui](https://github.com/seasick/openscad-web-gui) — WASM integration patterns (GPL-3.0)
- [openscad/openscad-playground](https://github.com/openscad/openscad-playground) — Official web playground

## 🤝 Contributing

Contributions welcome! Please read the [Build Plan](docs/BUILD_PLAN.md) first to understand our phased approach.

**Good first issues:**
- Improve accessibility (ARIA labels, keyboard navigation)
- Add example OpenSCAD models
- Improve error messages
- Documentation improvements

## 📊 Project Status

**Current Phase**: Phase 1 — Core Infrastructure

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | WASM worker + file upload | 🔄 In Progress |
| 2 | Parameter UI generation | ⏳ Pending |
| 3 | Polish + accessibility + deploy | ⏳ Pending |

---

<p align="center">
  <strong>No installation. No account. Just customize.</strong>
</p>
