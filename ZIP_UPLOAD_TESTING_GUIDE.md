# ZIP Upload Feature - Testing Guide

**Version**: v1.3.0  
**Date**: 2026-01-13  
**Status**: Ready for Manual Testing

---

## ✅ Pre-Testing Verification

### Application Status
- ✅ Dev server running on http://localhost:5176
- ✅ Simple Box example loads successfully
- ✅ Parameters display correctly (10 parameters, 3 groups)
- ✅ UI is responsive and functional
- ✅ Build successful (2.72s, no errors)

---

## 🧪 Test Plan

### Test 1: Basic ZIP Upload

**Objective**: Verify ZIP file upload and extraction works

**Steps**:
1. Navigate to http://localhost:5176
2. Click on the upload zone or drag-and-drop
3. Select `public/examples/multi-file-box.zip`
4. **Expected Result**:
   - ZIP file is accepted
   - File tree displays showing:
     ```
     📦 ZIP Contents (5 files)
     📄 main.scad [main]
     📄 utils/helpers.scad
     📄 modules/lid.scad
     ```
   - Main file (main.scad) is highlighted with [main] badge
   - Status shows "Ready - X parameters loaded"

**Pass Criteria**:
- ✅ ZIP uploads without errors
- ✅ File tree displays correctly
- ✅ Main file is correctly identified
- ✅ All files are listed

---

### Test 2: Parameter Extraction from Main File

**Objective**: Verify parameters are extracted from the main file in ZIP

**Steps**:
1. After uploading multi-file-box.zip
2. Check the parameters panel
3. **Expected Parameters**:
   - **Dimensions** group:
     - width (20-100, default 50)
     - height (10-80, default 30)
     - depth (20-100, default 40)
   - **Features** group:
     - include_lid (yes/no toggle, default yes)
     - wall_thickness (1-5, step 0.5, default 2)
   - **Advanced** group:
     - $fn (8-64, default 32)

**Pass Criteria**:
- ✅ All parameters extracted correctly
- ✅ Groups are organized properly
- ✅ Default values are correct
- ✅ Control types match (sliders, toggles)

---

### Test 3: Include/Use Statement Resolution

**Objective**: Verify include/use statements work with virtual filesystem

**Steps**:
1. With multi-file-box.zip loaded
2. Adjust some parameters (e.g., width=60, height=40)
3. Click "Generate STL"
4. **Expected Result**:
   - Status shows "Mounting X files..."
   - Render proceeds without errors
   - STL generates successfully
   - No "file not found" errors in console

**Pass Criteria**:
- ✅ Files are mounted successfully
- ✅ Include statements resolve (`include <utils/helpers.scad>`)
- ✅ Use statements resolve (`use <modules/lid.scad>`)
- ✅ STL generates without errors
- ✅ Preview displays the model

---

### Test 4: Auto-Preview with Multi-File Project

**Objective**: Verify auto-preview works with ZIP projects

**Steps**:
1. With multi-file-box.zip loaded
2. Ensure auto-preview is enabled (checkbox checked)
3. Adjust a parameter slider (e.g., width)
4. Wait 1.5 seconds
5. **Expected Result**:
   - Status changes to "Changes detected..."
   - After debounce: "Generating preview..."
   - Files are mounted automatically
   - Preview renders successfully
   - 3D preview updates

**Pass Criteria**:
- ✅ Auto-preview triggers after parameter change
- ✅ Virtual filesystem mounting works during auto-preview
- ✅ Preview renders without errors
- ✅ 3D view updates correctly

---

### Test 5: Main File Detection Strategies

**Objective**: Test various ZIP structures to verify main file detection

**Test Cases**:

#### 5a: Explicit main.scad
```
test-explicit.zip
├── main.scad          ✓ Should be detected
└── helper.scad
```

#### 5b: Name contains "main"
```
test-named.zip
├── my-main-file.scad  ✓ Should be detected
└── helper.scad
```

#### 5c: Root directory preference
```
test-root.zip
├── model.scad         ✓ Should be detected (only root file)
└── lib/
    └── helper.scad
```

#### 5d: Customizer annotations
```
test-annotations.zip
├── simple.scad        (no annotations)
└── parametric.scad    ✓ Should be detected (has /*[Group]*/)
```

**Pass Criteria**:
- ✅ Each strategy correctly identifies the main file
- ✅ Main file badge appears on correct file
- ✅ Parameters are extracted from the main file

---

### Test 6: Error Handling

**Objective**: Verify error messages are clear and helpful

**Test Cases**:

#### 6a: File too large
- Create a ZIP > 20MB
- **Expected**: "ZIP file exceeds 20MB limit (XX.X MB)"

#### 6b: Invalid file format
- Try to upload a .jpg or .pdf file
- **Expected**: "File must have .zip extension"

#### 6c: ZIP with no .scad files
- Create ZIP with only .txt files
- **Expected**: "No .scad files found in ZIP archive"

#### 6d: Corrupted ZIP
- Upload a corrupted/invalid ZIP file
- **Expected**: "Failed to extract ZIP file: [error details]"

**Pass Criteria**:
- ✅ All error cases show user-friendly messages
- ✅ No cryptic error codes or stack traces
- ✅ User can recover (upload different file)

---

### Test 7: File Tree Visualization

**Objective**: Verify file tree display is correct and helpful

**Steps**:
1. Upload multi-file-box.zip
2. Inspect the file tree display
3. **Check for**:
   - Header shows "📦 ZIP Contents (X files)"
   - Files are listed with correct icons (📄 for .scad, 📎 for others)
   - Main file has [main] badge
   - Tree is scrollable if many files
   - Nested directories show correct paths

**Pass Criteria**:
- ✅ File tree renders correctly
- ✅ Main file badge is prominent
- ✅ Paths are displayed correctly
- ✅ Tree is readable and styled consistently

---

### Test 8: Cross-Browser Compatibility

**Objective**: Verify ZIP upload works across browsers

**Browsers to Test**:
- ✅ Chrome/Edge (Chromium) - Primary development browser
- ⏳ Firefox - Test JSZip compatibility
- ⏳ Safari - Test on macOS/iOS
- ⏳ Mobile browsers - iOS Safari, Android Chrome

**Steps** (for each browser):
1. Open http://localhost:5176
2. Upload multi-file-box.zip
3. Verify file extraction
4. Generate STL
5. Check console for errors

**Pass Criteria**:
- ✅ ZIP uploads work in all tested browsers
- ✅ No browser-specific errors
- ✅ Performance is acceptable (< 2s extraction)

---

## 📋 Test Results Template

```markdown
## Test Results

**Date**: YYYY-MM-DD
**Tester**: [Name]
**Browser**: [Browser Name + Version]
**OS**: [Operating System]

### Test 1: Basic ZIP Upload
- [ ] Pass / [ ] Fail
- Notes:

### Test 2: Parameter Extraction
- [ ] Pass / [ ] Fail
- Notes:

### Test 3: Include/Use Resolution
- [ ] Pass / [ ] Fail
- Notes:

### Test 4: Auto-Preview
- [ ] Pass / [ ] Fail
- Notes:

### Test 5: Main File Detection
- [ ] Pass / [ ] Fail
- Notes:

### Test 6: Error Handling
- [ ] Pass / [ ] Fail
- Notes:

### Test 7: File Tree Visualization
- [ ] Pass / [ ] Fail
- Notes:

### Test 8: Cross-Browser Compatibility
- [ ] Pass / [ ] Fail
- Notes:

### Overall Result
- [ ] All tests passed
- [ ] Some tests failed (see notes)
- [ ] Ready for production: [ ] Yes / [ ] No

### Issues Found
1. [Issue description]
2. [Issue description]

### Recommendations
1. [Recommendation]
2. [Recommendation]
```

---

## 🐛 Known Issues to Watch For

### Potential Issues
1. **Path resolution**: Windows vs Unix path separators
2. **Memory limits**: Very large ZIP files may cause OOM
3. **Encoding**: Non-ASCII filenames may cause issues
4. **Nested includes**: Deeply nested include chains may fail

### Debug Steps
If something fails:
1. Open browser console (F12)
2. Check for JavaScript errors
3. Look for messages starting with `[ZIP]`, `[Worker FS]`, or `[AutoPreview]`
4. Verify file paths in the error messages
5. Check terminal for build/server errors

---

## 🎯 Success Criteria

The ZIP upload feature is ready for production when:
- ✅ All 8 test cases pass
- ✅ No console errors during normal operation
- ✅ Error handling provides clear user guidance
- ✅ Performance is acceptable (< 2s upload + extraction)
- ✅ Cross-browser testing complete (at least Chrome + Firefox)
- ✅ Documentation is complete and accurate

---

## 📞 Quick Reference

### File Locations
- **ZIP Example**: `public/examples/multi-file-box.zip`
- **ZIP Handler**: `src/js/zip-handler.js`
- **Worker FS**: `src/worker/openscad-worker.js` (lines 23-91)
- **Main UI**: `src/main.js` (lines 323-423)

### Console Commands for Debugging
```javascript
// In browser console:

// Check if JSZip is loaded
console.log(typeof JSZip);  // Should not be "undefined"

// Check mounted files (in worker context)
// This would need to be logged from worker

// Check state
// This would show in console logs during upload
```

### File Sizes
- Single .scad limit: 5MB
- ZIP file limit: 20MB
- Multi-file-box.zip: ~2KB (very small, good for testing)

---

## 🚀 Next Steps After Testing

1. **If all tests pass**:
   - Update test results in this document
   - Build production bundle: `npm run build`
   - Deploy to Vercel: `vercel --prod`
   - Verify in production environment

2. **If tests fail**:
   - Document issues in test results
   - Create GitHub issues for bugs
   - Fix issues and re-test
   - Update code as needed

3. **After deployment**:
   - Update README with production URL
   - Announce v1.3.0 release
   - Gather user feedback
   - Plan v1.4 features

---

**Happy Testing!** 🎉

For questions or issues, refer to:
- `CHANGELOG_v1.3.md` - Feature details
- `V1.3_COMPLETION_SUMMARY.md` - Implementation summary
- `docs/BUILD_PLAN_NEW.md` - Architecture and design
