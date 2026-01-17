# Changelog v2.10.0 — Enhanced Accessibility & Layout

**Release Date**: 2026-01-17

## Overview

Version 2.10.0 focuses on improving accessibility and user experience through enhanced UI controls, better keyboard navigation, and responsive layout improvements. This release makes the application more usable for all users, especially those using assistive technologies or keyboard-only navigation.

---

## Added

### Collapsible Parameter Panel (Desktop)

- **Panel Collapse Button**: New collapse/expand button in parameter panel header
  - Icon-based button with clear visual indicators
  - Smooth 300ms transition animation (respects `prefers-reduced-motion`)
  - Collapsed state shows vertical text and minimal width (48px)
  - Desktop-only feature (≥768px width)
  - Persistent state saved to localStorage
  - Automatic expansion on mobile viewports

- **Accessibility Features**:
  - `aria-expanded` attribute reflects current state
  - `aria-controls` links button to panel body
  - Dynamic `aria-label` updates ("Collapse parameters" / "Expand parameters")
  - Focus management: moves focus to toggle button when collapsing with focus inside
  - Keyboard accessible with Enter/Space keys

### Resizable Split Panels (Desktop)

- **Split.js Integration**: Drag-to-resize panels with visual gutter
  - 8px wide gutter with grip indicator
  - Minimum sizes: 280px (params), 300px (preview)
  - Default split: 40% parameters, 60% preview
  - Persistent sizing saved to localStorage
  - Real-time preview resize during drag
  - Disabled when parameter panel is collapsed

- **Keyboard Accessibility**:
  - Gutter is focusable with `tabindex="0"`
  - Arrow key navigation to resize (Left/Right: ±5%, Shift+Arrow: ±10%)
  - Home/End keys for min/max sizes
  - `role="separator"` with `aria-orientation="vertical"`
  - `aria-controls` references both panels
  - Visual focus indicator with accent color

### Focus Mode

- **Maximize Preview Button**: New button to enter focus mode
  - Appears after file is loaded
  - Icon-based button with expand/compress visual
  - `aria-pressed` attribute reflects state
  - Hides parameter panel to maximize preview area
  - Keyboard shortcut: `F` key
  - Exits automatically when file is cleared

### Compact Header

- **Auto-Compact Mode**: Header becomes more compact after file load
  - Reduces vertical space usage
  - Improves content-to-chrome ratio
  - Smooth transition animation
  - Resets to full size on file clear

### Improved File Info Display

- **Collapsible File Tree**: File information now uses disclosure pattern
  - Summary shows: filename, parameter count, file size
  - Details section shows file tree for multi-file projects
  - Uses native `<details>` element for accessibility
  - Reduces visual clutter for single-file projects
  - Full text available in tooltip

### Auto-Hide Status Bar

- **Idle State**: Status bar auto-hides when showing "Ready"
  - Adds `idle` class for CSS-based auto-hide
  - Reduces visual noise when no action is occurring
  - Immediately visible when status changes
  - Maintains accessibility with `aria-live="polite"`

### Collapsible UI Sections

- **Preset Controls**: Now uses `<details>` element
  - Collapsed by default on desktop
  - Reduces initial visual complexity
  - Native browser disclosure widget
  - Accessible with keyboard (Enter/Space to toggle)
  - Icon indicator (💾) in summary

- **Preview Settings**: Moved to collapsible disclosure
  - Collapsed by default to reduce clutter
  - Settings icon (⚙️) in summary
  - Groups auto-preview, measurements, and quality settings
  - Maintains all functionality when collapsed

### Output Format Selector Relocation

- **Moved to Parameter Panel**: Output format selector relocated from preview panel
  - Better logical grouping with input parameters
  - Reduces preview panel clutter
  - Maintains accessibility with proper labels
  - Format info text with `aria-live="polite"`

### Compact Actions Bar

- **Reduced Padding**: Actions bar now more space-efficient
  - Smaller button padding (xs/sm instead of md)
  - Tighter gap spacing between buttons
  - More content visible without scrolling
  - Maintains touch target sizes (44×44px minimum)

### Actions Dropdown Menu

- **"More" Actions Menu**: Secondary actions moved to dropdown
  - Uses `<details>` element for native dropdown
  - Contains: Add to Queue, View Queue, Share Link, Export Params
  - Reduces visual complexity in actions bar
  - Keyboard accessible
  - Auto-closes on action selection

---

## Improved

### Keyboard Navigation

- **Enhanced Focus Management**:
  - Focus moves intelligently when collapsing panels
  - All interactive elements properly focusable
  - Clear focus indicators throughout
  - Skip-to-content link for screen readers

### Screen Reader Support

- **ARIA Enhancements**:
  - Proper `role` attributes on custom controls
  - Dynamic `aria-label` updates reflect state changes
  - `aria-controls` links controls to their targets
  - `aria-pressed` for toggle buttons
  - `aria-expanded` for collapsible sections
  - `aria-live` regions for status updates

### Responsive Design

- **Mobile Optimization**:
  - Desktop-only features properly disabled on mobile
  - No collapse/resize on viewports <768px
  - Automatic state reset on viewport resize
  - Touch-friendly target sizes maintained

### Performance

- **Smooth Animations**:
  - RequestAnimationFrame for drag operations
  - Throttled resize events
  - Respects `prefers-reduced-motion`
  - Optimized preview resize during panel adjustments

---

## Fixed

- **Focus Trapping**: Fixed focus management when collapsing panels with active focus
- **Resize Handling**: Preview now properly resizes during split panel drag
- **Mobile Layout**: Desktop features no longer interfere with mobile layout
- **State Persistence**: Panel sizes and collapsed state properly saved/restored

---

## Technical Details

### New Dependencies

- **split.js** (v1.6.5): Resizable split panels with drag functionality

### Modified Files

- `src/main.js`: +459 lines (collapsible panel, split panels, focus mode)
- `src/styles/layout.css`: +325 lines (split panel styles, responsive improvements)
- `src/styles/components.css`: +210 lines (compact controls, dropdown menu)
- `index.html`: +158 lines (restructured layout, new controls)
- `src/js/render-controller.js`: +60 lines (focus mode integration)
- `src/js/preview.js`: +13 lines (resize handling)
- `src/worker/openscad-worker.js`: +156 lines (worker improvements)

### Bundle Impact

- Main bundle: +~8KB (gzipped)
- Split.js library: +2KB (gzipped)
- Total impact: +~10KB gzipped

### Accessibility Compliance

- **WCAG 2.1 AA**: Maintained compliance
- **Keyboard Navigation**: Full keyboard support for all new features
- **Screen Readers**: Proper ARIA labels and live regions
- **Focus Management**: Intelligent focus handling
- **Touch Targets**: Minimum 44×44px maintained
- **Color Contrast**: All new UI meets contrast requirements
- **Reduced Motion**: Respects user preferences

### LocalStorage Keys

- `openscad-customizer-param-panel-collapsed`: Panel collapsed state
- `openscad-customizer-split-sizes`: Split panel sizes array

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `F` | Toggle focus mode |
| `Left/Right Arrow` | Resize split panels (±5%) |
| `Shift + Left/Right` | Resize split panels (±10%) |
| `Home` | Minimize parameter panel |
| `End` | Maximize parameter panel |
| `Enter/Space` | Toggle disclosure widgets |

---

## Migration Notes

### For Users

- **New Layout**: The interface now supports resizable panels on desktop
- **Collapsed State**: Parameter panel can be collapsed to maximize preview
- **Focus Mode**: Press `F` or click the focus button to hide parameters
- **Settings**: Some settings are now in collapsible sections (collapsed by default)

### For Developers

- **Split.js**: New dependency added, run `npm install` to update
- **LocalStorage**: Two new keys used for state persistence
- **CSS Classes**: New classes added for collapsed/focus states
- **Event Handling**: New resize and drag event handlers

---

## Testing

- ✅ Unit tests: All passing (602 tests)
- ✅ E2E tests: All passing (42 tests)
- ✅ Keyboard navigation: Fully tested
- ✅ Screen reader: NVDA/JAWS compatible
- ✅ Mobile responsive: Tested on multiple viewports
- ✅ Cross-browser: Chrome, Firefox, Safari, Edge

---

## Known Issues

None identified in this release.

---

## Upgrade Instructions

```bash
# Update dependencies
npm install

# Run tests
npm run test:all

# Build for production
npm run build
```

---

## Contributors

- Enhanced accessibility features
- Improved responsive layout
- Better keyboard navigation
- Optimized space usage

---

## Next Steps

Future improvements may include:
- Customizable keyboard shortcuts
- More granular panel size presets
- Vertical split option for ultrawide displays
- Panel layout profiles (beginner, advanced, minimal)

---

**Full Changelog**: [CHANGELOG.md](../../CHANGELOG.md)
