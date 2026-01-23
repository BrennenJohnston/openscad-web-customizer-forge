# UI Testing Guide v1.11.1 — Button Visibility Improvements

**Version**: v1.11.1  
**Date**: 2026-01-14  
**Focus**: Verify action buttons remain visible across all viewports and devices

## Overview

v1.11.1 introduces significant UI improvements for button visibility, particularly addressing issues where action buttons were scrolling off-screen on various devices and viewport sizes.

## Key Changes to Test

### 1. Sticky Action Buttons
- Actions bar (`Generate STL`, `Add to Comparison`, `Share Link`, `Export Params`) should be sticky at the bottom of the preview panel
- Buttons should NOT scroll off-screen when scrolling within the preview content
- Buttons should have a subtle shadow to indicate sticky positioning

### 2. Dynamic Viewport Height
- On mobile browsers, the layout should properly account for the browser chrome (address bar, toolbar)
- Page should not have awkward scrolling when the address bar shows/hides
- Content should fill the visible viewport properly

### 3. Safe Area Insets
- On notched devices (iPhone X+, etc.), content should not overlap with the notch
- Bottom safe area should be respected for action buttons
- Modal dialogs should respect all safe areas

### 4. Mobile Action Buttons
- On viewports < 768px, buttons should wrap into multiple rows
- Primary action button (Generate STL) should be full-width
- Buttons should have compact padding for better fit
- Text should remain readable (smaller but legible)

## Test Scenarios

### Desktop Testing (>= 768px)

| Test | Expected Result | Status |
|------|-----------------|--------|
| Load example (Simple Box) | Parameters and preview panels side-by-side | ☐ |
| Action buttons visible | All 4 buttons visible without scrolling | ☐ |
| Scroll preview content | Actions stay visible at bottom | ☐ |
| Resize window (narrow) | Layout transitions to stacked at 768px | ☐ |
| Resize window (wide) | Layout maintains side-by-side | ☐ |

### Mobile Testing (< 768px)

| Test | Expected Result | Status |
|------|-----------------|--------|
| Load on mobile viewport | Stacked layout, panels full-width | ☐ |
| Action buttons visible | All buttons visible, wrapped layout | ☐ |
| Generate STL button | Full-width, prominent | ☐ |
| Scroll preview area | Actions remain sticky at bottom | ☐ |
| Address bar hide/show | No layout jumping | ☐ |

### Device-Specific Tests

#### iPhone (notched)
| Test | Expected Result | Status |
|------|-----------------|--------|
| Safe area top | Header respects notch | ☐ |
| Safe area bottom | Actions clear home indicator | ☐ |
| Landscape orientation | Safe areas on sides respected | ☐ |

#### Android
| Test | Expected Result | Status |
|------|-----------------|--------|
| Chrome browser | Address bar transition smooth | ☐ |
| Samsung Browser | Layout behaves correctly | ☐ |
| Landscape orientation | Actions remain visible | ☐ |

### Dark Mode Testing

| Test | Expected Result | Status |
|------|-----------------|--------|
| Scrollbar visibility | Scrollbars visible in dark mode | ☐ |
| Scrollbar contrast | Adequate contrast against dark background | ☐ |
| Action bar shadow | Shadow visible in dark mode | ☐ |

### High Contrast Mode

| Test | Expected Result | Status |
|------|-----------------|--------|
| Action bar border | Thicker border (3px) | ☐ |
| Button visibility | Clear button boundaries | ☐ |
| Focus indicators | Prominent focus rings | ☐ |

## Browser Matrix

| Browser | Desktop | Mobile | Status |
|---------|---------|--------|--------|
| Chrome 120+ | ☐ | ☐ | |
| Firefox 121+ | ☐ | ☐ | |
| Safari 17+ | ☐ | ☐ | |
| Edge 120+ | ☐ | ☐ | |

## Accessibility Testing

| Test | Expected Result | Status |
|------|-----------------|--------|
| Tab navigation | Can tab to all action buttons | ☐ |
| Enter/Space | Buttons activate on key press | ☐ |
| Screen reader | Buttons announced correctly | ☐ |
| Focus visible | Clear focus indicators | ☐ |
| Touch targets | >= 44x44px on all buttons | ☐ |

## Regression Testing

Verify these existing features still work:

| Feature | Status |
|---------|--------|
| Example loading (all 5 examples) | ☐ |
| Parameter sliders | ☐ |
| Preset save/load | ☐ |
| 3D preview rendering | ☐ |
| STL generation | ☐ |
| Download functionality | ☐ |
| Share link copying | ☐ |
| Export params (JSON) | ☐ |
| Color picker (v1.11) | ☐ |
| File upload (v1.11) | ☐ |

## Known Issues

None currently identified.

## Testing Tools

- **Chrome DevTools**: Device Mode for mobile testing
- **Firefox**: Responsive Design Mode
- **Safari**: Web Inspector + iOS Simulator
- **BrowserStack**: Cross-browser testing (optional)
- **Lighthouse**: Accessibility audit

## How to Run

1. Start dev server: `npm run dev`
2. Open `http://localhost:5173/` in browser
3. Load an example (Simple Box recommended)
4. Test button visibility and scrolling behavior
5. Test on mobile viewports using browser dev tools
6. If available, test on actual devices

## Report Format

When reporting issues, include:
- Browser + version
- Viewport size (e.g., 375x667)
- Steps to reproduce
- Expected vs actual behavior
- Screenshot if applicable

## Sign-off

| Tester | Date | Browser | Mobile | Status |
|--------|------|---------|--------|--------|
| | | | | |

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-14
