# OpenSCAD Web Customizer Forge

> **Customize parametric 3D models directly in your browser.** Upload any OpenSCAD Customizer-enabled `.scad` file, adjust parameters through an accessible UI, and download STL files—all without installing software or creating an account.

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)
[![OpenSCAD](https://img.shields.io/badge/OpenSCAD-WASM-orange.svg)](https://openscad.org/)
[![Accessibility](https://img.shields.io/badge/WCAG-2.1%20AA-green.svg)](https://www.w3.org/WAI/WCAG21/quickref/)
[![Version](https://img.shields.io/badge/version-1.7.0-brightgreen.svg)](CHANGELOG.md)

## 🎯 What This Does

**Think**: classic "web parametric customizer" UX, but:
- ✅ **100% client-side** — Runs entirely in your browser (no server costs)
- ✅ **No installation** — Just upload and customize
- ✅ **No account needed** — Start using immediately
- ✅ **Accessible** — WCAG 2.1 AA compliant, fully keyboard navigable
- ✅ **Dark mode** 🌗 — Comfortable viewing in any lighting
- ✅ **High contrast** ♿ — WCAG AAA (7:1) for low vision users
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

## ✨ Features

### Current Release: v1.7.0 — Parameter Presets System 🎉

The latest release brings powerful configuration management capabilities:

|| Feature | Description |
||---------|-------------|
|| 💾 **Save Presets** | Save current parameters as named configurations |
|| 📋 **Load Presets** | Quick dropdown selector or management modal |
|| 📂 **Manage Presets** | View, load, delete, export all saved presets |
|| 📤 **Import/Export** | Share presets as JSON files |
|| 🔄 **Smart Merging** | Duplicate names update existing presets |
|| 💿 **Persistence** | Presets saved per model in localStorage |

**Use Case**: Quickly switch between "Small Handle", "Large Handle", "Extra Wide" configurations without manually adjusting 20+ parameters each time!

### Complete Feature Set

#### v1.0 — Core Web Application ✅

|| Feature | Status |
||---------|--------|
|| 📁 Drag-and-drop file upload | ✅ Complete |
|| 🎛️ Auto-generated parameter UI | ✅ Complete |
|| ⚙️ Client-side STL generation (WASM) | ✅ Complete |
|| 👁️ 3D preview (Three.js) | ✅ Complete |
|| 📥 Smart filename downloads | ✅ Complete |
|| ♿ WCAG 2.1 AA accessibility | ✅ Complete |

#### v1.1 — Enhanced Usability ✅

|| Feature | Status |
||---------|--------|
|| 🔗 Shareable URL parameters | ✅ Complete |
|| 💾 Browser localStorage persistence | ✅ Complete |
|| ⌨️ Keyboard shortcuts (Ctrl+Enter, R, D) | ✅ Complete |
|| 📋 Copy Share Link button | ✅ Complete |
|| 💾 Export parameters as JSON | ✅ Complete |
|| 📚 3 example models | ✅ Complete |

#### v1.2 — Auto-Preview System ✅

|| Feature | Status |
||---------|--------|
|| 🔄 Auto-preview on parameter change | ✅ Complete |
|| ⚡ Progressive quality rendering | ✅ Complete |
|| 💾 Intelligent render caching | ✅ Complete |
|| 🎯 Visual state indicators | ✅ Complete |
|| 🎨 Smart download button logic | ✅ Complete |

#### v1.3 — Multi-File Projects ✅

|| Feature | Status |
||---------|--------|
|| 📦 ZIP upload support | ✅ Complete |
|| 📂 Virtual filesystem for include/use | ✅ Complete |
|| 🔍 Automatic main file detection | ✅ Complete |
|| 🌳 File tree visualization | ✅ Complete |

#### v1.4 — Dark Mode ✅

|| Feature | Status |
||---------|--------|
|| 🌗 Dark mode with theme toggle | ✅ Complete |
|| 🎨 Three-mode system (Auto/Light/Dark) | ✅ Complete |
|| 💾 Persistent theme preferences | ✅ Complete |
|| 🎨 Theme-aware 3D preview | ✅ Complete |

#### v1.5 — High Contrast Mode ✅

|| Feature | Status |
||---------|--------|
|| ♿ High contrast mode (WCAG AAA 7:1) | ✅ Complete |
|| 📐 Enhanced typography (12-17% larger) | ✅ Complete |
|| 🔲 Thicker borders and focus rings | ✅ Complete |
|| 🎨 Works with any theme | ✅ Complete |

#### v1.6 — Multiple Output Formats ✅

|| Feature | Status |
||---------|--------|
|| 📐 Multiple formats (STL, OBJ, OFF, AMF, 3MF) | ✅ Complete |
|| 🎛️ Format selector UI | ✅ Complete |
|| 📥 Format-specific downloads | ✅ Complete |

#### v1.7 — Parameter Presets ✅

|| Feature | Status |
||---------|--------|
|| 💾 Save/load parameter configurations | ✅ Complete |
|| 📋 Management modal | ✅ Complete |
|| 📤 Import/Export as JSON | ✅ Complete |
|| 💿 LocalStorage persistence | ✅ Complete |

### Coming Soon

#### v1.8 (Planned) — Advanced Features

|| Feature | Status |
||---------|--------|
|| 📚 Library bundles (MCAD, BOSL2) | ⏳ Planned |
|| 📏 STL preview with measurements | ⏳ Planned |
|| 🎨 Custom color themes | ⏳ Planned |
|| 📚 More example models | ⏳ Planned |

#### v2.0 (Future) — Developer Toolchain

|| Feature | Status |
||---------|--------|
|| 🛠️ CLI parameter extraction | ⏳ Planned |
|| 📦 Standalone app scaffolding | ⏳ Planned |
|| ✅ Validation harness | ⏳ Planned |

## 📋 Supported File Formats

### Single .scad Files

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

|| Annotation | Example | UI Control |
||------------|---------|------------|
|| `/*[Group Name]*/` | `/*[Dimensions]*/` | Collapsible section |
|| `// [min:max]` | `// [10:100]` | Range slider |
|| `// [min:step:max]` | `// [1:0.5:5]` | Step slider |
|| `// [opt1, opt2]` | `// [round, square]` | Dropdown |
|| `// [yes, no]` | `// [yes, no]` | Toggle switch |
|| `// Comment` | `// Wall thickness` | Help tooltip |
|| `/*[Hidden]*/` | Internal params | Not shown in UI |

### ZIP Files (Multi-File Projects)

Upload `.zip` files containing multiple `.scad` files with `include` and `use` statements:

```
my-project.zip
├── main.scad          # Main file with Customizer parameters
├── utils/
│   └── helpers.scad   # Helper functions
└── modules/
    └── parts.scad     # Reusable modules
```

## ⌨️ Keyboard Shortcuts

|| Shortcut | Action |
||----------|--------|
|| `Ctrl/Cmd + Enter` | Generate STL |
|| `R` | Reset parameters to defaults |
|| `D` | Download STL (when available) |

## 📖 Documentation

- [Build Plan](docs/BUILD_PLAN_NEW.md) — Development roadmap and architecture
- [Parameter Schema Spec](docs/specs/PARAMETER_SCHEMA_SPEC.md) — JSON Schema format
- [Test Report](TEST_REPORT.md) — Comprehensive testing results
- [Examples](examples/) — Sample OpenSCAD projects
- [Changelogs](docs/changelogs/) — Version-specific release notes
- [Guides](docs/guides/) — Testing and deployment guides

## 🏗️ Architecture

```
Browser
├── Main Thread
│   ├── File Upload Handler
│   ├── Parameter UI (auto-generated)
│   ├── 3D Preview (Three.js)
│   ├── State Manager (pub/sub)
│   ├── Theme Manager
│   ├── Preset Manager
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
- ✅ **Cross-browser** tested (Chrome, Firefox, Safari, Edge)

See [TEST_REPORT.md](TEST_REPORT.md) for detailed results.

## 📊 Project Status

**Current Version**: v1.7.0

|| Phase | Description | Status |
||-------|-------------|--------|
|| 0 | Repo bootstrap | ✅ Complete |
|| 1.1 | UI shell + layout | ✅ Complete |
|| 1.2 | WASM worker | ✅ Complete |
|| 1.3 | File upload | ✅ Complete |
|| 1.4 | Download manager | ✅ Complete |
|| 2.1 | Parameter parser | ✅ Complete |
|| 2.2 | UI generator | ✅ Complete |
|| 2.3 | State management | ✅ Complete |
|| 3.1 | 3D Preview | ✅ Complete |
|| 3.2 | Accessibility | ✅ Complete |
|| 3.4 | Deployment | ✅ Complete |
|| **v1.1** | **URL params, localStorage, shortcuts, examples** | ✅ Complete |
|| **v1.2** | **Auto-preview, progressive quality, caching** | ✅ Complete |
|| **v1.3** | **ZIP upload, multi-file projects, virtual FS** | ✅ Complete |
|| **v1.4** | **Dark mode with theme toggle** | ✅ Complete |
|| **v1.5** | **High contrast mode (WCAG AAA)** | ✅ Complete |
|| **v1.6** | **Multiple output formats** | ✅ Complete |
|| **v1.7** | **Parameter presets system** | ✅ Complete |

## ⚖️ Licensing

|| Component | License |
||-----------|---------|
|| This project | GPL-3.0-or-later |
|| OpenSCAD WASM | GPL-2.0+ |
|| Your `.scad` files | Your license |
|| Generated STL files | Your ownership |

See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## 🙏 Acknowledgments

**Built on:**
- [OpenSCAD](https://openscad.org/) — The parametric CAD engine (GPL-2.0+)
- [openscad-wasm-prebuilt](https://www.npmjs.com/package/openscad-wasm-prebuilt) — Pre-built WASM binaries
- [Three.js](https://threejs.org/) — 3D preview rendering
- [Vite](https://vitejs.dev/) — Build tooling
- [JSZip](https://stuk.github.io/jszip/) — ZIP file handling

**Reference implementations:**
- [seasick/openscad-web-gui](https://github.com/seasick/openscad-web-gui) — WASM integration patterns (GPL-3.0)
- [openscad/openscad-playground](https://github.com/openscad/openscad-playground) — Official web playground

## 🤝 Contributing

Contributions welcome! Please read the [Build Plan](docs/BUILD_PLAN_NEW.md) first to understand our architecture.

**Good first issues:**
- Add more example OpenSCAD models
- Improve error messages for common OpenSCAD errors
- Documentation improvements
- Internationalization (i18n)

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

## 🎉 What's New in v1.7.0

### Parameter Presets System

Save and manage your favorite parameter configurations!

**Key Features:**
- 💾 **Save Presets** — Name and describe your configurations
- 📋 **Quick Load** — Dropdown selector for instant access
- 📂 **Management Modal** — View all presets, load, export, or delete
- 📤 **Import/Export** — Share presets as JSON files
- 🔄 **Smart Merging** — Duplicate names update existing presets
- 💿 **Persistent** — Stored locally per model in localStorage

**Perfect for:**
- Models with many parameters (20+)
- Frequently used configurations
- Sharing configurations with others
- Quickly testing different design variations
- Building a library of proven settings

**Example Workflow:**
1. Upload "Universal Cuff" example
2. Adjust 15 parameters for large adult size
3. Click 💾 Save Preset → "Large Adult Handle"
4. Adjust for small child size
5. Save as "Small Child Handle"
6. Switch between them with one click!

See [docs/changelogs/CHANGELOG_v1.7.md](docs/changelogs/CHANGELOG_v1.7.md) for complete details.

---

<p align="center">
  <strong>No installation. No account. Just customize.</strong>
</p>

<p align="center">
  Made with ❤️ by the open-source community
</p>
