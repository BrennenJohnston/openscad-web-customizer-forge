# Changelog - v1.1.0 Enhanced Usability

**Release Date**: 2026-01-12  
**Status**: ✅ Complete

---

## What's New in v1.1

### 🔗 URL Parameter Persistence
- **Share customized models** with others via URL
- Parameters are automatically encoded in URL hash (e.g., `#v=1&params=...`)
- Only non-default values are included to keep URLs short
- URL updates are debounced (1 second) to avoid excessive history entries
- Parameters are automatically restored when visiting a shared link

**Usage**: Adjust parameters → URL updates automatically → Share the URL

### ⌨️ Keyboard Shortcuts
Power user features for faster workflow:
- **Ctrl/Cmd + Enter**: Generate STL
- **R**: Reset parameters to defaults
- **D**: Download STL (when available)

Shortcuts are context-aware and won't trigger when typing in input fields.

### 💾 Auto-Save Drafts (localStorage)
- Parameters are **automatically saved** to browser localStorage (2-second debounce)
- Drafts are restored on page reload with a confirmation prompt
- Includes file content and parameter state
- Drafts expire after 7 days
- Works offline once a model is loaded

**Benefits**: Never lose your work when accidentally closing the tab!

### 📋 Copy Share Link Button
- One-click button to copy shareable URL to clipboard
- Uses modern Clipboard API (with fallback for older browsers)
- Visual feedback ("✅ Copied!") when successful
- Only includes non-default parameters in the URL

### 💾 Export Parameters (JSON)
- Download current parameter values as JSON file
- Format: `model-name-params.json`
- Includes metadata (version, timestamp, model name)
- Useful for:
  - Documenting your customizations
  - Version control
  - Batch processing (future CLI tool)

### 📚 Additional Example Models
Three examples now available:

1. **Universal Cuff (Complex)** - 47 parameters, 10 groups
   - Demonstrates complex grouping and many parameter types
   - Real-world assistive device model

2. **Simple Box (Beginner)** - 13 parameters, 3 groups
   - Perfect for learning OpenSCAD customizer
   - Features: dimensions, wall thickness, lid, ventilation, corner radius
   - Fast render time (~5-10 seconds)

3. **Parametric Cylinder** - 12 parameters, 4 groups
   - Demonstrates shape variations (cylinder, cone, tube, tapered tube)
   - Base and cap options
   - Good for learning parameter-driven design

---

## Technical Details

### URL Parameter Format
```
#v=1&params=<encoded-json>
```

Example:
```
#v=1&params=%7B%22width%22%3A60%2C%22height%22%3A40%7D
```

Decoded: `{"width":60,"height":40}`

### localStorage Schema
```json
{
  "version": "1.0.0",
  "timestamp": 1705075200000,
  "fileName": "model.scad",
  "fileContent": "...",
  "parameters": { ... },
  "defaults": { ... }
}
```

### JSON Export Format
```json
{
  "version": "1.0.0",
  "model": "simple_box.scad",
  "timestamp": "2026-01-12T10:30:00.000Z",
  "parameters": {
    "width": 60,
    "height": 40,
    ...
  }
}
```

---

## Files Modified

### Core Changes
- `src/js/state.js` - Added URL serialization, localStorage persistence
- `src/main.js` - Integrated URL/localStorage loading, keyboard shortcuts, share/export handlers
- `index.html` - Added share/export buttons, multiple example buttons

### Styling
- `src/styles/components.css` - Added example-buttons layout

### New Files
- `public/examples/simple-box/simple_box.scad` - Beginner-friendly box example
- `public/examples/parametric-cylinder/parametric_cylinder.scad` - Cylinder variations

---

## User-Facing Changes

### Welcome Screen
- Now shows **3 example buttons** instead of 1
- Examples are labeled by complexity (Beginner, Complex)
- Better visual organization with responsive layout

### Actions Panel
- **New**: "📋 Copy Share Link" button
- **New**: "💾 Export Params (JSON)" button
- Existing: "Generate STL" and "Download STL" buttons

### Startup Experience
- If a saved draft exists, user is prompted to restore it
- Draft includes timestamp and filename for context
- User can decline and clear the draft

---

## Performance Impact

### URL Sync
- Debounced to 1 second (prevents excessive updates)
- Uses `history.replaceState` (no page reload)
- Minimal performance impact

### localStorage Saves
- Debounced to 2 seconds
- Gracefully handles quota exceeded errors
- Feature detection prevents errors in private browsing

### Example Models
- Simple Box: ~5-10 seconds render time
- Parametric Cylinder: ~3-8 seconds render time
- Universal Cuff: ~13-44 seconds render time (varies)

---

## Accessibility

All new features maintain **WCAG 2.1 AA** compliance:
- Keyboard shortcuts don't interfere with screen readers
- New buttons have descriptive `aria-label` attributes
- Visual feedback for copy action is also announced
- No keyboard traps introduced

---

## Browser Compatibility

### URL Parameters
- ✅ All modern browsers (Chrome 67+, Firefox 79+, Safari 15.2+)

### Clipboard API
- ✅ Chrome 63+, Firefox 53+, Safari 13.1+
- Fallback: `prompt()` for older browsers

### localStorage
- ✅ All modern browsers
- Graceful degradation: Feature detection prevents errors
- Private browsing: Feature disabled, no errors

---

## Known Limitations

1. **URL Length**: Browser limits typically ~2MB, practical limit ~8KB for sharing
2. **localStorage Quota**: Typically 5-10MB per origin (more than enough for parameters)
3. **Drafts**: Only 1 draft saved at a time (last-used model)
4. **Keyboard Shortcuts**: May conflict with browser extensions (rare)

---

## Migration Notes

No breaking changes. v1.0 users can upgrade seamlessly:
- Existing functionality unchanged
- New features are opt-in (use them if you want)
- No database migrations needed (client-side only)

---

## Testing Checklist

- ✅ URL parameters encode/decode correctly
- ✅ URL updates on parameter change (debounced)
- ✅ Shared URLs restore parameters correctly
- ✅ localStorage saves after file upload
- ✅ Draft restore prompt appears on reload
- ✅ Keyboard shortcuts work (Ctrl+Enter, R, D)
- ✅ Shortcuts don't trigger in input fields
- ✅ Copy Share Link button copies to clipboard
- ✅ Export JSON downloads correct file
- ✅ All 3 example models load and render
- ✅ No linter errors
- ✅ No console errors
- ✅ Accessibility maintained (keyboard navigation, ARIA labels)

---

## Future Enhancements (v1.2+)

Potential additions based on user feedback:
- Multiple draft slots (save/load named drafts)
- Import parameters from JSON file
- QR code for sharing (mobile-friendly)
- Keyboard shortcut customization
- More example models (community contributions)

---

## Credits

- URL serialization pattern: Standard JSON + base64 encoding
- localStorage pattern: Best practices from MDN
- Keyboard shortcuts: Common conventions (Ctrl+Enter, etc.)
- Example models: Original designs (CC0 Public Domain)

---

**v1.1.0 Status**: ✅ **COMPLETE AND TESTED**

All features implemented, tested, and ready for production deployment.
