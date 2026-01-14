# 🌗 Dark Mode Testing Guide

**Version**: 1.4.0  
**Date**: 2026-01-13  
**Status**: Ready for Testing

---

## 🎯 Quick Start

### Prerequisites
- Development server running on http://localhost:5173
- Modern browser (Chrome, Firefox, Edge, or Safari)
- 5-10 minutes for basic testing

### Start Testing
```bash
# If dev server not running:
npm run dev

# Open in browser:
# http://localhost:5173
```

---

## ✅ Basic Functionality Tests

### Test 1: Theme Toggle Button Visibility
**Expected**: Theme button visible in header (top-right corner)

1. Open http://localhost:5173
2. Look for button with sun/moon icon in header
3. **Pass**: Button is visible and styled
4. **Fail**: Button missing or not styled

**Visual Check**:
- Button has rounded background
- Icon is centered
- Hover effect changes opacity
- Button is aligned with header content

---

### Test 2: Theme Cycling
**Expected**: Clicking cycles Auto → Light → Dark → Auto

1. Click theme button (top-right)
2. Observe status message: "Theme: Light"
3. Click again → "Theme: Dark"
4. Click again → "Theme: Auto (follows system)"
5. Click again → "Theme: Light" (cycle repeats)

**Pass Criteria**:
- Status message appears briefly
- Visual theme changes immediately
- No console errors
- Smooth transitions (no flash)

---

### Test 3: Visual Changes
**Expected**: UI colors change dramatically between light/dark

#### Light Mode Visual Checklist
- [ ] Background is white/light gray
- [ ] Text is dark (near-black)
- [ ] Header is blue
- [ ] Buttons have light styling
- [ ] Upload zone is light
- [ ] 3D preview has light gray background

#### Dark Mode Visual Checklist
- [ ] Background is dark gray/black
- [ ] Text is white/light gray
- [ ] Header is darker blue
- [ ] Buttons have dark styling
- [ ] Upload zone is dark
- [ ] 3D preview has dark background

**Visual Comparison**:
```
Light Mode           Dark Mode
─────────────────    ─────────────────
☀️ (sun visible)     🌙 (moon visible)
White BG             Dark BG
Dark text            Light text
Blue accent          Bright blue accent
```

---

### Test 4: Persistence
**Expected**: Theme choice survives page reload

1. Set theme to **Dark** mode
2. Reload page (F5 or Ctrl+R)
3. **Pass**: Page loads in dark mode
4. **Fail**: Page loads in different mode

**Advanced Test**:
1. Set to **Light** mode
2. Reload → Should stay light
3. Set to **Auto**
4. Reload → Should stay auto (follow system)

---

### Test 5: localStorage Check
**Expected**: Theme saved to browser storage

1. Set theme to **Dark**
2. Open DevTools (F12)
3. Go to **Application** tab (Chrome) or **Storage** (Firefox)
4. Find **localStorage**
5. Look for key: `openscad-customizer-theme`
6. **Pass**: Value is `"dark"`

**Values Check**:
- Auto mode: `"auto"`
- Light mode: `"light"`
- Dark mode: `"dark"`

---

## 🎨 Three.js Preview Tests

### Test 6: Preview Color Changes
**Expected**: 3D preview updates with theme

1. Load example model (Simple Box)
2. Wait for preview to render
3. Note preview colors:
   - Background color
   - Grid color
   - Model color
4. Toggle theme to Dark
5. **Pass**: All three colors change
6. **Fail**: Colors don't change or only some change

**Color Verification**:

#### Light Mode Preview
- Background: Light gray (`#f5f5f5`)
- Grid: Medium gray
- Model: Blue (`#2196f3`)

#### Dark Mode Preview
- Background: Dark gray (`#1a1a1a`)
- Grid: Dark gray (subtle)
- Model: Bright blue (`#4d9fff`)

---

### Test 7: Preview Visibility
**Expected**: Grid and model visible in both themes

1. Load Simple Box example
2. Generate preview
3. Switch to **Light** mode
4. **Check**: Grid visible, model has good contrast
5. Switch to **Dark** mode
6. **Check**: Grid visible, model has good contrast

**Visibility Score**:
- 5/5: Grid and model clearly visible
- 3/5: Some elements hard to see
- 1/5: Grid or model nearly invisible (fail)

---

## ⌨️ Accessibility Tests

### Test 8: Keyboard Navigation
**Expected**: Theme toggle works with keyboard

1. Reload page
2. Press **Tab** repeatedly until theme button focused
3. Visual check: Focus ring visible around button
4. Press **Enter** or **Space**
5. **Pass**: Theme changes
6. **Fail**: No change or focus not visible

**Focus Order**:
1. Skip link
2. Upload zone
3. Example buttons
4. Theme toggle button (should be early)

---

### Test 9: Screen Reader Support (Optional)
**Expected**: Theme button has descriptive label

1. Enable screen reader (NVDA on Windows, VoiceOver on Mac)
2. Navigate to theme button
3. **Pass**: Announces "Current theme: [mode]. Click to cycle themes."
4. Click button
5. **Pass**: Status area announces new theme

**Screen Reader Test** (if available):
- Button role announced correctly
- Label is descriptive
- Theme change announced in status area

---

### Test 10: Color Contrast
**Expected**: All text meets WCAG AA (4.5:1)

**Manual Check**:
1. Set to **Light** mode
2. Check text on background (should be easy to read)
3. Set to **Dark** mode
4. Check text on background (should be easy to read)

**Automated Check**:
1. Open DevTools → Lighthouse
2. Run Accessibility audit
3. **Pass**: Score 90+ (no contrast failures)

---

## 🌐 Cross-Browser Tests

### Test 11: Chrome/Edge (Chromium)
**Expected**: Full support

1. Open in Chrome or Edge
2. Run Tests 1-10
3. **Pass**: All tests pass
4. **Note any issues**: _________________

**Chrome-Specific**:
- [ ] Theme toggle button renders
- [ ] localStorage works
- [ ] Preview colors update
- [ ] No console errors

---

### Test 12: Firefox
**Expected**: Full support

1. Open in Firefox
2. Run Tests 1-10
3. **Pass**: All tests pass
4. **Note any issues**: _________________

**Firefox-Specific**:
- [ ] Theme toggle button renders
- [ ] localStorage works
- [ ] Preview colors update
- [ ] No console errors

---

### Test 13: Safari (macOS/iOS)
**Expected**: Full support

1. Open in Safari
2. Run Tests 1-10
3. **Pass**: All tests pass
4. **Note any issues**: _________________

**Safari-Specific**:
- [ ] Theme toggle button renders
- [ ] localStorage works
- [ ] Preview colors update
- [ ] No console errors

---

## 🔄 System Preference Tests

### Test 14: Auto Mode (System Light)
**Expected**: App follows system when in Auto

**Setup**: Set system to Light mode
1. Set app theme to **Auto**
2. **Pass**: App shows light theme
3. Open DevTools Console
4. Check for: `[Theme] Applied: auto`

---

### Test 15: Auto Mode (System Dark)
**Expected**: App follows system when in Auto

**Setup**: Set system to Dark mode
1. Set app theme to **Auto**
2. **Pass**: App shows dark theme
3. Verify status: "Theme: Auto (follows system)"

**How to Change System Preference**:
- **Windows 11**: Settings → Personalization → Colors → Choose your mode
- **macOS**: System Settings → Appearance → Light/Dark
- **Linux (GNOME)**: Settings → Appearance → Style

---

### Test 16: Auto Mode (Live System Change)
**Expected**: App updates when system changes (in Auto mode)

1. Set app to **Auto** mode
2. Change system preference (Light → Dark or Dark → Light)
3. **Pass**: App updates immediately without reload
4. **Fail**: Requires page reload

**Note**: This only works in Auto mode. Manual Light/Dark overrides ignore system.

---

## 📱 Responsive Tests

### Test 17: Mobile Viewport
**Expected**: Theme button usable on small screens

1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select iPhone or Android device
4. **Check**: Theme button visible and clickable
5. **Check**: Minimum 44x44px touch target

**Mobile Visual Check**:
- Button doesn't overlap text
- Button size appropriate
- Easy to tap without zooming

---

### Test 18: Tablet Viewport
**Expected**: Theme button well-positioned

1. Set viewport to iPad or tablet size
2. **Check**: Header layout works
3. **Check**: Theme button accessible
4. Click theme button
5. **Pass**: Theme changes smoothly

---

## 🐛 Edge Case Tests

### Test 19: localStorage Disabled
**Expected**: Graceful degradation to Auto mode

**Setup**: Disable localStorage
1. DevTools → Application → Storage → Clear site data
2. Set "Block" for storage
3. Reload page
4. **Expected**: App starts in Auto mode
5. Change theme → **Expected**: Works but doesn't persist

**Fallback Behavior**:
- Theme switching still works
- Reverts to Auto on reload
- No JavaScript errors

---

### Test 20: Rapid Clicking
**Expected**: No performance issues or glitches

1. Click theme button rapidly 10+ times
2. **Pass**: App handles gracefully
3. **Check**: No lag, no errors
4. **Check**: Theme settles to last click

---

### Test 21: Theme During Render
**Expected**: Theme switch during STL generation works

1. Load Simple Box
2. Click **Generate STL**
3. While rendering, toggle theme
4. **Pass**: Theme changes immediately
5. **Pass**: Render completes successfully
6. **Pass**: Preview shows new theme colors

---

## 📊 Performance Tests

### Test 22: Theme Switch Speed
**Expected**: < 100ms for complete theme change

1. Open DevTools → Performance
2. Start recording
3. Click theme button
4. Stop recording
5. **Check**: Total time < 100ms
6. **Check**: No layout thrashing

**Performance Checklist**:
- [ ] No visible lag
- [ ] Smooth transitions
- [ ] 60fps maintained
- [ ] No console warnings

---

### Test 23: Bundle Size Impact
**Expected**: Minimal size increase

**Check Build Output**:
```bash
npm run build
```

**Compare v1.3.0 → v1.4.0**:
- CSS: +2KB (acceptable)
- JS: +1KB (theme-manager.js)
- Total: +3KB uncompressed

**Gzipped Impact**:
- CSS: +0.5KB
- JS: +0.3KB

**Pass**: < 5KB total increase

---

## ✅ Test Report Template

### Overall Results

**Date**: ___________  
**Tester**: ___________  
**Browser**: ___________  
**OS**: ___________

#### Basic Tests (1-5)
- [ ] Test 1: Button Visibility
- [ ] Test 2: Theme Cycling
- [ ] Test 3: Visual Changes
- [ ] Test 4: Persistence
- [ ] Test 5: localStorage

#### Preview Tests (6-7)
- [ ] Test 6: Color Changes
- [ ] Test 7: Visibility

#### Accessibility (8-10)
- [ ] Test 8: Keyboard Navigation
- [ ] Test 9: Screen Reader (optional)
- [ ] Test 10: Color Contrast

#### Cross-Browser (11-13)
- [ ] Test 11: Chrome/Edge
- [ ] Test 12: Firefox
- [ ] Test 13: Safari

#### System Preference (14-16)
- [ ] Test 14: Auto (Light)
- [ ] Test 15: Auto (Dark)
- [ ] Test 16: Live Change

#### Responsive (17-18)
- [ ] Test 17: Mobile
- [ ] Test 18: Tablet

#### Edge Cases (19-21)
- [ ] Test 19: localStorage Disabled
- [ ] Test 20: Rapid Clicking
- [ ] Test 21: During Render

#### Performance (22-23)
- [ ] Test 22: Switch Speed
- [ ] Test 23: Bundle Size

### Issues Found

| Test # | Issue Description | Severity | Status |
|--------|------------------|----------|--------|
|        |                  |          |        |

### Overall Assessment

**Status**: ☐ Pass  ☐ Pass with Issues  ☐ Fail

**Notes**:
___________________________________________
___________________________________________

---

## 🚀 Production Checklist

Before deploying v1.4.0 to production:

- [ ] All P0 tests pass (1-5, 6-7, 8, 10)
- [ ] At least 2 browsers tested (Chrome + Firefox minimum)
- [ ] No blocking bugs found
- [ ] Lighthouse accessibility score 90+
- [ ] Bundle size acceptable (< 5KB increase)
- [ ] Documentation complete (CHANGELOG_v1.4.md)
- [ ] Build successful (`npm run build`)
- [ ] Production preview tested (`npm run preview`)

**Ready for Deployment**: ☐ Yes  ☐ No

---

## 📞 Support

### Debugging Tips
1. **Console Logs**: Look for `[Theme]` messages
2. **DevTools**: Check localStorage key
3. **CSS Variables**: Inspect `--color-*` values
4. **Preview**: Check `data-theme` attribute on `<html>`

### Common Issues

**Theme doesn't persist**:
- Check localStorage enabled
- Check for console errors
- Try incognito mode (clean state)

**Preview colors don't change**:
- Check browser console for errors
- Verify Three.js loaded
- Try reloading page

**Button not visible**:
- Check browser zoom level (reset to 100%)
- Check CSS loaded (Network tab)
- Try clearing cache (Shift+F5)

### Getting Help
- Read: `CHANGELOG_v1.4.md`
- Check: Browser console for errors
- Test: In Chrome (most likely to work)
- Report: GitHub Issues with screenshots

---

**Happy Testing!** 🎉

Test thoroughly, report issues, and help make v1.4.0 production-ready! 🚀
