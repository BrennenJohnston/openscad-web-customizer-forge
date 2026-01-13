# Changelog

All notable changes to OpenSCAD Web Customizer Forge are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-01-13

### 🎯 Auto-Preview & Progressive Enhancement

Major UX improvement: real-time visual feedback as users adjust parameters.

### Added
- **Auto-Preview System**: Parameters trigger preview render after 1.5s debounce
- **Progressive Quality Rendering**: Fast preview ($fn ≤ 24) for iteration, full quality for download
- **Intelligent Render Caching**: LRU cache (max 10 entries) prevents redundant renders
- **Visual State Indicators**: 6 states (idle, pending, rendering, current, stale, error)
- **Smart Download Logic**: Reuses full quality STL when available
- **Rendering Overlay**: Spinner overlay during preview generation

### Changed
- Primary action button now shows "Download STL" when ready, "Generate STL" when params changed
- Render controller now supports quality presets (PREVIEW, FULL)
- 5-10x faster parameter iteration (2-8s preview vs 10-60s full render)

### Technical
- New `AutoPreviewController` class (375 lines) in `src/js/auto-preview-controller.js`
- Quality tiers: PREVIEW ($fn≤24, 30s timeout) | FULL (unlimited $fn, 60s timeout)
- Render caching by parameter hash with LRU eviction

---

## [1.1.0] - 2026-01-12

### 🔗 Enhanced Usability

Features for sharing, persistence, and power users.

### Added
- **URL Parameter Persistence**: Share customized models via URL hash
- **Auto-Save Drafts**: localStorage persistence with 7-day expiration
- **Keyboard Shortcuts**: Ctrl+Enter (render), R (reset), D (download)
- **Copy Share Link Button**: One-click clipboard copy with visual feedback
- **Export Parameters as JSON**: Download current parameters with metadata
- **Simple Box Example**: 10 parameters, 3 groups, beginner-friendly
- **Parametric Cylinder Example**: 12 parameters, 4 groups, shape variations

### Changed
- Welcome screen now shows 3 example buttons with labels
- URL updates are debounced (1 second) to avoid excessive history entries
- Keyboard shortcuts are context-aware (won't trigger in input fields)

---

## [1.0.0] - 2026-01-12

### 🎉 Initial Release - MVP Complete

Full-featured web application for customizing OpenSCAD models.

### Added
- **File Upload**: Drag-and-drop and file picker for .scad files
- **Parameter Extraction**: Automatic parsing of Customizer annotations
- **UI Generation**: Schema-driven form rendering (sliders, dropdowns, toggles)
- **STL Generation**: Client-side rendering via OpenSCAD WASM
- **3D Preview**: Three.js viewer with orbit controls
- **Smart Downloads**: Filename includes model name + parameter hash + date
- **Accessibility**: WCAG 2.1 AA compliant, full keyboard navigation
- **Dark Mode**: Respects system preference
- **Responsive Design**: Mobile-friendly layout
- **Universal Cuff Example**: 47 parameters, 10 groups, real-world model

### Technical
- Vanilla JavaScript (no framework dependencies)
- Web Worker isolation for WASM rendering
- Lazy loading of WASM bundle (~11MB)
- CSS custom properties for theming
- Vercel deployment with COOP/COEP headers

---

## Version History Summary

| Version | Date | Highlights |
|---------|------|------------|
| **1.2.0** | 2026-01-13 | Auto-preview, progressive quality, caching |
| **1.1.0** | 2026-01-12 | URL params, localStorage, keyboard shortcuts |
| **1.0.0** | 2026-01-12 | MVP release, WASM rendering, 3D preview |

---

## Upgrade Notes

### From 1.1.0 to 1.2.0
- No breaking changes
- Auto-preview is enabled by default
- Preview quality may differ slightly from full quality (lower $fn)
- Cached previews are stored in memory (cleared on page reload)

### From 1.0.0 to 1.1.0
- No breaking changes
- URL hash format: `#v=1&params=<encoded>`
- localStorage key: `openscad-customizer-draft`
- Keyboard shortcuts may conflict with browser shortcuts

---

For detailed release notes, see:
- [v1.2.0 Release Notes](CHANGELOG_v1.2.md)
- [v1.1.0 Release Notes](CHANGELOG_v1.1.md)
