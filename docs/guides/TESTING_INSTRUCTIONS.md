# Testing Instructions - Getting Started Tutorial (Merged Intro Tour)

## Overview

This document provides testing instructions for the single beginner-friendly **Getting Started** tutorial. This merged tour replaces the old “Beginners Start Here” + “UI Orientation” split and is intended to be the one comprehensive intro to the UI and core workflow.

## Changes Summary

1. **Single intro tutorial**: merged into `tutorial-sandbox.js` as tutorial id `intro`
2. **Welcome screen**: the beginner “Start Tutorial” button launches `intro` (no separate UI Orientation CTA)
3. **Viewport-aware spotlights**: highlights use comma-separated selectors so the tour works across:
   - Desktop browsers
   - Mobile browsers (portrait)
   - Mobile browsers (landscape / wider layouts)

## Manual Testing Required

### Test 1: Spotlight selectors (Desktop, viewport ≥768px)

**Goal:** Verify that desktop-specific controls are highlighted and reachable.

**Steps:**
1. Open the app in a desktop browser (viewport ≥768px)
2. Click **Start Tutorial** on the “Beginners Start Here” card
3. Go to **“Open and close Parameters”** (Step 3)
4. **Expected:** `#collapseParamPanelBtn` is highlighted (desktop panel collapse control)
5. Go to **“Actions menu”** (Step 8)
6. **Expected:** `#actionsDrawerToggle` is highlighted
7. Go to **“Camera controls”** (Step 9)
8. **Expected:** `#cameraPanelToggle` is highlighted (desktop camera panel)

**Pass Criteria:**
- Desktop controls are highlighted correctly
- No overlap/positioning glitches
- Tutorial panel positions near highlighted elements

---

### Test 2: Spotlight selectors (Mobile portrait, viewport <768px)

**Goal:** Verify that mobile-specific controls are highlighted and usable.

**Steps:**
1. Open the app in a mobile browser (or DevTools) with a portrait viewport <768px (example: 375×667)
2. Click **Start Tutorial** on the “Beginners Start Here” card
3. Go to **“Open and close Parameters”** (Step 3)
4. **Expected:** `#mobileDrawerToggle` (Params) is highlighted when the panel is closed
5. Go to **“Camera controls”** (Step 9)
6. **Expected:** `#cameraDrawerToggle` is highlighted (mobile camera drawer)

**Pass Criteria:**
- Mobile controls are highlighted correctly
- Tutorial panel remains usable on small screens
- No horizontal scrolling or clipped tutorial UI

---

### Test 3: Mobile landscape (phone landscape / wide viewport)

**Goal:** Verify the tour still highlights the correct UI for a landscape phone layout.

**Steps:**
1. Use a “phone landscape” viewport (example: 812×375)
2. Start the Getting Started tutorial from the Welcome screen
3. Go to **“Open and close Parameters”** (Step 3)
4. **Expected:** The spotlight highlights whichever control is actually visible for that layout:
   - If the app switches to the wide/desktop layout, highlight `#collapseParamPanelBtn`
   - If it remains in mobile layout, highlight `#mobileDrawerToggle` / `#drawerCloseBtn` as appropriate

**Pass Criteria:**
- Spotlight chooses the correct visible control
- No off-screen panel placement (tutorial panel stays within viewport bounds)

---

### Test 4: Keyboard navigation

**Goal:** Verify the tutorial is fully keyboard accessible.

**Steps:**
1. Start the Getting Started tutorial with keyboard (Tab to the button, Enter/Space)
2. Verify focus starts inside the tutorial panel
3. Use <kbd>Tab</kbd> to move between Back/Next buttons
4. Use <kbd>ArrowRight</kbd> / <kbd>ArrowLeft</kbd> to move steps
5. Press <kbd>Esc</kbd> to exit

**Pass Criteria:**
- All tutorial controls are keyboard accessible
- Escape exits the tutorial
- Focus returns to the trigger button on exit

---

### Test 5: Screen reader announcements

**Goal:** Verify announcements and “step gated” actions are clear.

**Steps (NVDA/JAWS/VoiceOver):**
1. Start Getting Started
2. **Expected announcement:** “Getting Started started. Step 1 of …”
3. Advance to a gated step (e.g. “Adjust a parameter” / “Generate and download your file”)
4. Attempt Next before completing the action
5. **Expected:** announcement that the action must be completed, and Next remains disabled
6. Complete the action and verify: “Action completed. Next enabled.”

---

### Test 6: High contrast + forced colors

**Goal:** Verify tutorial UI remains visible and readable in accessibility modes.

**Steps:**
1. Toggle **High Contrast** (HC) in the header
2. Start Getting Started and verify the panel and highlights remain legible
3. (Windows) Enable a Contrast Theme / forced-colors mode, reload, and repeat

**Pass Criteria:**
- Tutorial panel and buttons remain visible
- Highlighted targets are clearly distinguished
- Focus indicators are visible

---

### Test 7: Mobile Tutorial UX - Compact Content & Popover

**Goal:** Verify compact tutorial content and keyboard shortcuts icon-only popover work correctly on mobile/zoomed viewports.

**Steps:**
1. Open the app on mobile (or DevTools: 375×667)
2. Start the Getting Started tutorial
3. **Expected:**
   - Tutorial panel fits within viewport with no overflow
   - Content may switch to compact version (shorter text, collapsible "What you'll learn")
4. Pinch-to-zoom to ~150% scale
5. **Expected:**
   - Tutorial panel remains visible and readable
   - Content auto-switches to compact version at high zoom levels
6. Navigate to Camera controls (Step 9) and locate the keyboard shortcuts help
7. **Expected:**
   - Shows as icon-only button on narrow/short viewports
   - Clicking toggles a popover with the shortcut list
   - Popover appears above/below the icon (not cut off)

**Pass Criteria:**
- Tutorial content adapts to viewport size and zoom level
- Keyboard shortcuts help displays as icon-only popover on mobile
- No clipped content or horizontal scrolling

---

### Test 8: Mobile Drawer - Interaction Guard

**Goal:** Verify accidental drawer closes are prevented during parameter interaction.

**Steps:**
1. Open the app on mobile (or DevTools: 375×667)
2. Load a sample file to see parameters
3. Tap the mobile drawer toggle to open Parameters
4. **Expected:** Drawer opens with backdrop visible
5. Tap inside a parameter input field and drag finger to the backdrop area
6. **Expected:** Drawer stays open (drag from inside to backdrop is protected)
7. Release finger on backdrop
8. **Expected:** Drawer stays open (pointerdown started inside drawer)
9. Wait 300ms+, then tap directly on the backdrop (not dragging from inside)
10. **Expected:** Drawer closes (intentional backdrop tap works)

**Pass Criteria:**
- Accidental drags from inside drawer to backdrop do not close the drawer
- Intentional backdrop taps still close the drawer after the guard timeout
- ESC key still closes the drawer

---

### Test 9: Spotlight Resync on Drawer Toggle

**Goal:** Verify spotlight repositions correctly when the mobile drawer opens/closes during a tutorial step.

**Steps:**
1. Open the app on mobile (or DevTools: 375×667)
2. Start the Getting Started tutorial
3. Navigate to **"Open and close Parameters"** (Step 3)
4. **Expected:** Spotlight highlights the drawer toggle button
5. Tap the toggle to open the drawer
6. **Expected:** After animation, spotlight repositions to highlight the close button (or appropriate visible target)
7. Tap close button to close the drawer
8. **Expected:** Spotlight repositions back to the toggle button

**Pass Criteria:**
- Spotlight follows the visible target after drawer state changes
- No stale/mispositioned spotlight cutouts
- Smooth transition with appropriate debounce

---

## Automated Testing (Future Enhancement)

Consider adding Playwright tests for:
- Selector visibility on different viewport sizes
- Tutorial navigation flow
- Focus restoration on exit
- ARIA announcements (via accessibility snapshot)

---

## Success Criteria Summary

✅ Getting Started tutorial covers both UI orientation + basic workflow  
✅ Selectors highlight correctly on desktop, mobile portrait, and mobile landscape  
✅ Keyboard navigation works for all tutorials  
✅ Screen reader announcements are clear and timely  
✅ High contrast mode support is maintained  
✅ Focus restoration works on tutorial exit

---

## Related Documentation

- [Welcome Screen Feature Paths](docs/guides/WELCOME_SCREEN_FEATURE_PATHS.md)
- [Welcome Feature Paths Inventory](docs/WELCOME_FEATURE_PATHS_INVENTORY.md)
- [Tutorial Design Research](docs/research/TUTORIAL_DESIGN_RESEARCH.md)
- [Accessibility Guide](docs/guides/ACCESSIBILITY_GUIDE.md)
