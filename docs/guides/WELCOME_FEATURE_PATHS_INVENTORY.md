# Welcome Feature Paths - Role Inventory

This document maps the 6 core user roles to their primary capabilities, examples, accessibility spotlights, and documentation links for the Welcome screen redesign.

**Note:** As of v2.0 (January 2026), Welcome paths support role-based entry points and guided tutorial sandbox overlays. In the current UI, the only visible entry point is a single beginner-friendly “Getting Started” tutorial.

## Role Mapping (Reordered v2.0)

### 1. Beginners Start Here (Getting Started)

**Primary Goal:** Learn the interface and complete the basic workflow

**Try It Example:** `simple-box`
- Simple, beginner-friendly example
- Clear cause-and-effect with parameters
- Fast preview rendering

**Accessibility Spotlights:**
- Example files for quick demonstrations
- Preset system for saving/loading configurations
- Features Guide with comprehensive documentation
- Workflow progress indicator shows current step
- Clear visual feedback
- Focus Mode (maximize preview)
- Actions menu for Share Link / Export Params (save and share your setup)

**Documentation Links:**
- Features Guide modal (accessible via "Help" button)
- Example files in `/public/examples/`

**Tutorial Sandbox (Getting Started):** Guided walkthrough showing:
- Where Parameters, Preview, Actions, and Camera controls are (desktop + mobile)
- How to customize parameters and watch the preview update
- Using presets to save configurations
- Using Actions (share/export/compare/queue)
- Generating and downloading a file, and where to find Help

---

### 2. Advanced Makers (MOVED TO SECOND)

**Primary Goal:** Work with multi-file projects, libraries, and advanced features

**Try It Example:** `library-test`
- Demonstrates MCAD library usage
- Shows library detection and enabling
- Advanced parameter usage

**Accessibility Spotlights:**
- Library bundle support (MCAD, BOSL2, NopSCADlib, dotSCAD)
- ZIP project support with file tree display
- Source code viewer
- Multiple output formats (STL, OBJ, OFF, AMF, 3MF)
- Preset export/import for sharing
- Share Link + Export Params for reproducible configurations
- Compare view for tracking parameter changes
- Render Queue for batching multiple renders
- Parameter Search + Jump-to-Group for large models

**Documentation Links:**
- Features Guide modal → Libraries tab
- Features Guide modal → Advanced tab
- `/docs/guides/LIBRARY_TESTING_GUIDE.md`

**Tutorial Sandbox:** Guided walkthrough showing:
- Enabling OpenSCAD library bundles
- Uploading ZIP files with dependencies
- Exporting in multiple formats

---

### 3. Keyboard-Only / Switch Users (MOVED TO THIRD)

**Primary Goal:** Complete full workflow without pointer device

**Try It Example:** `cylinder`
- Multiple parameter types (sliders, dropdowns)
- Demonstrates keyboard control of all UI elements
- Preview camera controls without drag

**Accessibility Spotlights:**
- All features accessible via keyboard
- Predictable tab order following visual layout
- Modal focus trapping with Escape to close
- Camera controls with keyboard alternatives (no drag required)
- Undo/Redo with Ctrl+Z / Ctrl+Shift+Z
- Actions drawer is keyboard reachable (Compare / Queue / Share / Export Params)
- Focus Mode works without pointer input

**Documentation Links:**
- `/docs/guides/KEYGUARD_WORKFLOW_GUIDE.md` - Keyboard-first workflow
- `/docs/guides/ACCESSIBILITY_GUIDE.md` - Keyboard navigation section

**Tutorial Sandbox:** Guided walkthrough showing:
- Skip to content link
- Tab navigation through parameters
- Keyboard shortcuts (Ctrl+Z, Escape)
- Modal focus trapping behavior

---

### 4. Low Vision / High-Contrast Users (MOVED TO FOURTH)

**Primary Goal:** Customize models with high contrast, large targets, and visible focus indicators

**Try It Example:** `simple-box`
- Simple, beginner-friendly parameters
- Demonstrates clear visual hierarchy
- Good for testing contrast and focus visibility

**Accessibility Spotlights:**
- High-contrast mode toggle (HC button in header)
- Forced-colors compatibility (Windows High Contrast Mode)
- Large touch targets (44×44px minimum)
- 3px visible focus indicators
- Configurable theme (light/dark)
- Enhanced contrast preference support (`prefers-contrast: more`)

**Documentation Links:**
- `/docs/guides/ACCESSIBILITY_GUIDE.md` - Visual accessibility features
- Theme and contrast controls section

**Tutorial Sandbox:** Guided walkthrough showing:
- How to toggle high contrast mode (HC button)
- Theme switching (light/dark)
- Large touch targets and visible focus

---

### 5. Voice Input Users (MOVED TO FIFTH)

**Primary Goal:** Control app with stable, speakable command names

**Try It Example:** `simple-box`
- Clear button labels without ambiguity
- Minimal icon-only actions
- Predictable control names

**Accessibility Spotlights:**
- Unique, speakable button labels (no duplicate "Edit" or "Delete")
- Explicit text labels on all interactive elements
- Consistent help access ("Help" button in same location)
- Minimal reliance on drag gestures

**Documentation Links:**
- `/docs/guides/ACCESSIBILITY_GUIDE.md` - Voice input considerations

**Tutorial Sandbox:** Guided walkthrough showing:
- Best voice commands to use (button labels)
- How to navigate with voice ("Click Help", "Click Reset")
- All controls have unique, speakable names

---

### 6. Screen Reader / Blind Users (MOVED TO LAST)

**Primary Goal:** Upload → customize → render → download with strong status announcements

**Try It Example:** `simple-box`
- Demonstrates accessible parameter customization
- Uses descriptive parameter names and help text
- Simple, beginner-friendly example for learning the workflow

**Accessibility Spotlights:**
- Plain-language error messages with actionable guidance
- Consistent status announcements throughout workflow
- Keyboard-only operation (no mouse required)
- Logical focus order and ARIA landmarks

**Documentation Links:**
- `/docs/guides/ACCESSIBILITY_GUIDE.md` - Comprehensive accessibility features
- `/docs/guides/MANUAL_TESTING_PROCEDURES.md` - Testing with screen readers

**Tutorial Sandbox:** Guided walkthrough showing:
- Where status announcements appear (Status area)
- How to navigate with ARIA landmarks
- How to access the Features Guide (Help button)
- Location of Clear button to restart

---

### UI Orientation

UI orientation is now included inside the single beginner-friendly **Getting Started** tutorial (so there’s only one intro tour to learn).

**Research Foundation:**
- **W3C COGA**: Progressive disclosure, predictable controls, clear language
- **UDL 3.0**: Learner agency, minimize distractions, flexible paths
- **Onboarding best practices** (Shepherd.js, Driver.js): Short orientation modules (time-boxed), "aha moment" within 3-4 steps

---

## Additional Examples Available

These examples are available (not all are wired into `EXAMPLE_DEFINITIONS` yet):
- `cable-organizer` - Complex parametric design
- `wall-hook` - Practical 3D printing example
- `honeycomb-grid` - Pattern generation
- `phone-stand` - Real-world accessory
- (Already wired up) `colored-box` - Color parameter example
- (Already wired up) `multi-file-box` - Multi-file ZIP project demonstration

Consider adding these to `EXAMPLE_DEFINITIONS` if needed for additional role paths.

---

## Implementation Notes (Updated v2.0)

### Tutorial Sandbox System

As of v2.0, all role paths launch a **guided tutorial sandbox overlay** after loading the example. The tutorial system (`src/js/tutorial-sandbox.js`) provides:

- **Step-by-step walkthroughs** with 3-6 steps per path
- **Non-blocking dialog UI** with focus trap
- **Keyboard accessible** (Tab navigation, Escape to close, Back/Next buttons)
- **ARIA-compliant** (`role="dialog"`, `aria-modal="true"`, `aria-live` announcements)
- **Visual highlights** on referenced UI elements (pulsing outline)
- **Reduced motion support** (disables animations)
- **Forced-colors mode** support (Windows High Contrast)
- **Focus restoration** to trigger button on close

### Screen Reader Announcement System

Status updates use the `#statusArea` div with `role="region" aria-label="Status"`. Tutorial announcements use the existing `#srAnnouncer` div: `<div id="srAnnouncer" class="sr-only" aria-live="polite" aria-atomic="true"></div>`.

Announcement format: "[Tutorial title] started. Step 1 of [total]."

### Tutorial Content Guidelines

Each tutorial follows a consistent structure:
- **Welcome step**: Overview of what you'll learn (~2 min)
- **Feature steps**: 3-4 steps highlighting specific UI areas with `highlightSelector`
- **Completion step**: Summary and next steps

All tutorials reuse `simple-box` example except Advanced Makers (uses `library-test` to demonstrate libraries).

---

## Success Metrics

After implementation, verify:
- [ ] Each role card loads correct example
- [ ] Screen reader announces example loading
- [ ] All CTAs are keyboard accessible (tab order logical)
- [ ] Guided tours (if implemented) skip with Escape
- [ ] Focus restored after tour/modal close
- [ ] Works in forced-colors mode
- [ ] Touch targets meet 44×44px minimum
- [ ] Mobile stacking is clean and logical
