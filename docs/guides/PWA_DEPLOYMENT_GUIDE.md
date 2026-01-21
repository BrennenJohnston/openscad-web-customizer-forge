# PWA Deployment Guide - v1.9.0

**Document**: Progressive Web App Deployment Guide  
**Version**: 1.9.0  
**Last Updated**: 2026-01-14  
**Status**: Production Ready (pending icons)

---

## 📋 Pre-Deployment Checklist

### Critical (P0) - Must Complete
- [ ] **Generate app icons** (8 sizes: 16, 32, 72, 96, 128, 144, 192, 512px)
- [ ] **Place icons** in `/public/icons/` directory
- [ ] **Test build** locally (`npm run build`)
- [ ] **Verify manifest** (`/manifest.json` accessible)
- [ ] **Test service worker** (DevTools > Application > Service Workers)

### Recommended (P1) - Should Complete
- [ ] Capture screenshots (desktop 1280x720, mobile 750x1334)
- [ ] Place screenshots in `/public/screenshots/`
- [ ] Test install on real iOS device
- [ ] Test install on real Android device
- [ ] Run Lighthouse audit (verify PWA: 100/100)

### Optional (P2) - Nice to Have
- [ ] Create app promotional materials
- [ ] Document offline capabilities for users
- [ ] Create video demo of install process
- [ ] Set up analytics for install tracking

---

## 🎨 Step 1: Generate App Icons

### Option A: RealFaviconGenerator (Recommended)

1. **Create base icon** (512x512px minimum)
   - Use OpenSCAD-related symbol
   - Background: App theme color (#0066cc) or white
   - Format: PNG or SVG

2. **Visit** [RealFaviconGenerator](https://realfavicongenerator.net/)

3. **Upload** your base icon

4. **Configure settings**:
   - iOS: Enable, choose design
   - Android: Enable, choose theme (#0066cc)
   - Windows: Enable, tile color (#0066cc)
   - Safari Pinned Tab: Enable

5. **Generate** and download package

6. **Extract** files to `/public/icons/`:
   ```
   public/icons/
     ├── icon-16x16.png
     ├── icon-32x32.png
     ├── icon-72x72.png
     ├── icon-96x96.png
     ├── icon-128x128.png
     ├── icon-144x144.png
     ├── icon-152x152.png
     ├── icon-192x192.png
     ├── icon-384x384.png
     └── icon-512x512.png
   ```

### Option B: PWA Asset Generator

```bash
# Install tool globally
npm install -g @pwa/asset-generator

# Generate icons from base image
pwa-asset-generator logo.svg ./public/icons \
  --icon-only \
  --path-override /icons \
  --background "#0066cc"

# Generates all required sizes automatically
```

### Option C: ImageMagick (Quick Placeholder)

```bash
# Requires ImageMagick installed
for size in 16 32 72 96 128 144 152 192 384 512; do
  convert -size ${size}x${size} xc:#0066cc \
    -gravity center -pointsize $((size/3)) -fill white \
    -annotate +0+0 "OS" \
    public/icons/icon-${size}x${size}.png
done
```

---

## 📸 Step 2: Capture Screenshots (Optional)

### Desktop Screenshot (1280x720)

1. **Open app** in Chrome (desktop)
2. **Press F12** (DevTools)
3. **Toggle device toolbar** (Ctrl+Shift+M)
4. **Set dimensions**: 1280x720
5. **Capture screenshot**: DevTools menu > Capture screenshot
6. **Save as**: `public/screenshots/desktop.png`

### Mobile Screenshot (750x1334)

1. **Open app** in Chrome (desktop)
2. **Press F12** (DevTools)
3. **Toggle device toolbar** (Ctrl+Shift+M)
4. **Select device**: iPhone X or custom (750x1334)
5. **Capture screenshot**: DevTools menu > Capture screenshot
6. **Save as**: `public/screenshots/mobile.png`

---

## 🔨 Step 3: Build & Test Locally

### Build Production Bundle

```bash
# Clean previous builds (optional)
rm -rf dist/

# Build for production
npm run build

# Expected output:
# ✓ built in ~3s
# dist/index.html                    12.09 kB │ gzip:   3.10 kB
# dist/assets/index-*.css            30.96 kB │ gzip:   5.37 kB
# dist/assets/index-*.js            180.31 kB │ gzip:  55.35 kB
# dist/assets/three-*.js            469.44 kB │ gzip: 119.25 kB
# dist/assets/openscad-worker-*.js   10.98 MB │ (WASM)
```

### Test Production Build

```bash
# Serve production build locally
npm run preview

# Expected output:
# Local: http://localhost:4173
```

### Verify PWA Functionality

1. **Open** http://localhost:4173 in Chrome

2. **Check manifest**:
   - Open DevTools > Application > Manifest
   - Verify all fields populated
   - Check icons are loading (not 404)

3. **Check service worker**:
   - Open DevTools > Application > Service Workers
   - Verify `sw.js` is registered and activated
   - Click "Update" to force registration

4. **Test offline mode**:
   - Open DevTools > Network
   - Set throttling to "Offline"
   - Reload page (should still work)
   - Upload file, generate STL (should work)

5. **Test install prompt** (Chrome):
   - Look for install icon (⊕) in address bar
   - Click the icon
   - Verify native install dialog appears
   - Install app
   - Verify app opens in standalone window

### Run Lighthouse Audit

```bash
# Option 1: Chrome DevTools
# DevTools > Lighthouse > Analyze page load

# Option 2: Command line
lighthouse http://localhost:4173 --view

# Expected scores:
# PWA: 100/100 ✅
# Accessibility: 100/100 ✅
# Best Practices: 100/100 ✅
# Performance: 95+ ✅
```

---

## 🚀 Step 4: Deploy to Vercel

### Initial Deployment

```bash
# Login to Vercel (if first time)
vercel login

# Deploy to production
vercel --prod

# Expected output:
# Deployed to production
# https://your-app.vercel.app
```

### Verify Deployment

1. **Visit production URL** (from Vercel output)

2. **Verify HTTPS**: URL should use `https://` (required for PWA)

3. **Test headers** (DevTools > Network):
   - `Cross-Origin-Opener-Policy: same-origin` ✅
   - `Cross-Origin-Embedder-Policy: require-corp` ✅

4. **Test service worker**:
   - DevTools > Application > Service Workers
   - Should show "Activated and is running"

5. **Test manifest**:
   - DevTools > Application > Manifest
   - All fields should be populated
   - Icons should load (check Network tab)

### Post-Deployment Checks

```bash
# Run Lighthouse on production
lighthouse https://your-app.vercel.app --view

# Check all PWA criteria met
# - Installable: ✅
# - Fast and reliable: ✅
# - Works offline: ✅
```

---

## 📱 Step 5: Test on Real Devices

### iOS (Safari)

1. **Open** production URL in Safari
2. **Tap Share** button (⎙)
3. **Scroll down**, tap "Add to Home Screen"
4. **Tap "Add"**
5. **Find app** on home screen
6. **Open app** (should be full-screen)
7. **Test offline**:
   - Enable Airplane Mode
   - Open app (should still work)
   - Upload file, generate STL
8. **Disable Airplane Mode**

### Android (Chrome)

1. **Open** production URL in Chrome
2. **Tap** menu (⋮) > "Add to Home Screen" or "Install app"
3. **Tap "Install"** in the prompt
4. **Find app** in app drawer
5. **Open app** (should be standalone)
6. **Test offline**:
   - Enable Airplane Mode
   - Open app (should still work)
   - Upload file, generate STL
7. **Disable Airplane Mode**

### Desktop (Chrome/Edge)

1. **Open** production URL
2. **Click** install icon (⊕) in address bar
3. **OR**: Menu (⋮) > "Install OpenSCAD Assistive Forge"
4. **Click "Install"**
5. **App opens** in standalone window
6. **Find app** in Start Menu/Applications
7. **Test offline**:
   - Disconnect internet
   - Open app (should work)
   - Upload file, generate STL
8. **Reconnect internet**

---

## 🔄 Step 6: Monitor & Maintain

### Monitor Installation

**Vercel Analytics** (if enabled):
- Track page views
- Monitor error rates
- Check performance metrics

**Browser DevTools** (during development):
- Check console for errors
- Monitor service worker updates
- Verify cache size (< 50MB recommended)

### Update Process

When deploying a new version:

1. **Update version** in:
   - `package.json` → `"version": "1.9.1"`
   - `public/sw.js` → `CACHE_VERSION = 'v1.9.1'`
   - `public/manifest.json` → Update if metadata changed

2. **Build and deploy**:
   ```bash
   npm run build
   vercel --prod
   ```

3. **Verify update handling**:
   - Open app in browser (with old version cached)
   - Wait ~1 minute (auto-check)
   - Check console for "[PWA] New version available" message
   - Reload page to activate new version
   - Updates happen silently in background

4. **Clear old caches** (automatic):
   - Service worker removes old cache versions
   - Check DevTools > Application > Cache Storage
   - Only new version cache should remain

### Troubleshooting

**Browser install prompt not appearing**:
- Check icons are accessible (no 404s)
- Verify manifest is valid (DevTools > Application > Manifest)
- Check PWA criteria (Lighthouse audit)
- Try different browser (Chrome/Edge have best support)
- Ensure HTTPS is enabled (localhost is OK)

**Offline mode not working**:
- Check service worker is activated (DevTools)
- Verify cache strategy is correct (`sw.js`)
- Check COOP/COEP headers (Network tab)
- Clear cache and try again

**Updates not applying**:
- Check service worker is checking for updates
- Verify new version deployed (check Network tab)
- Force update: DevTools > Application > Service Workers > Update
- Check console for "[PWA]" log messages
- Updates activate on next page reload

---

## 📝 Deployment Verification Checklist

### After Deployment ✅

- [ ] Production URL accessible via HTTPS
- [ ] Service worker registered and activated
- [ ] PWA manifest accessible (`/manifest.json`)
- [ ] All icons loading (check Network tab, no 404s)
- [ ] Browser install prompt available (Chrome/Edge address bar icon)
- [ ] App can be installed on desktop
- [ ] App can be installed on mobile (iOS/Android)
- [ ] Offline mode works (uploads, STL generation)
- [ ] Update handling functional (check console logs)
- [ ] Lighthouse PWA score: 100/100
- [ ] Lighthouse Accessibility: 100/100
- [ ] No console errors on load

---

## 🎯 Success Criteria

Your PWA deployment is successful when:

✅ **Lighthouse PWA Score**: 100/100  
✅ **Install prompt appears** on supported browsers  
✅ **App installs** successfully on mobile & desktop  
✅ **Offline mode works** completely (all features functional)  
✅ **Update notifications** appear and work  
✅ **No console errors** in production  
✅ **Performance**: < 3s initial load, < 1s subsequent loads  

---

## 📚 Additional Resources

### PWA Documentation
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Workbox (Service Worker Library)](https://developers.google.com/web/tools/workbox)
- [PWA Badge Criteria](https://web.dev/install-criteria/)

### Testing Tools
- [Lighthouse CLI](https://github.com/GoogleChrome/lighthouse)
- [PWA Builder](https://www.pwabuilder.com/)
- [Manifest Validator](https://manifest-validator.appspot.com/)

### Icon Tools
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [PWA Asset Generator](https://www.npmjs.com/package/@pwa/asset-generator)
- [Maskable.app](https://maskable.app/) (test maskable icons)

---

## 🐛 Common Issues & Solutions

### Issue: "Browser install prompt not showing"

**Solution**:
1. Verify all icons exist and are accessible
2. Check manifest is valid (use Manifest Validator)
3. Ensure HTTPS is enabled (localhost is OK)
4. Try in Chrome/Edge (best PWA support)
5. Check Lighthouse audit for issues
6. Look for install icon (⊕) in address bar or browser menu

### Issue: "Offline mode not working"

**Solution**:
1. Check service worker is activated
2. Verify COOP/COEP headers are set
3. Check browser cache settings (not disabled)
4. Clear cache and reload: DevTools > Application > Clear storage
5. Check sw.js cache strategies are correct

### Issue: "Icons showing as broken"

**Solution**:
1. Verify icon paths in manifest.json
2. Check icons directory structure matches manifest
3. Verify icons are served with correct MIME type (image/png)
4. Try generating icons with different tool
5. Check Vercel deployment includes icons directory

### Issue: "Updates not applying"

**Solution**:
1. Check service worker update check interval (default: 1 hour)
2. Force update: DevTools > Service Workers > Update
3. Verify new version is deployed (check sw.js version)
4. Check console for "[PWA] New version available" message
5. Reload page to activate new version
6. Clear cache if issue persists

---

## 🎉 Deployment Complete!

Once all checklist items are complete, your PWA is **LIVE and READY**! 

Users can now:
- 📲 Install your app on any device
- 🔌 Use it completely offline
- ⚡ Experience instant load times
- 🔄 Receive automatic updates

**Next Steps**:
1. Share the app with your community
2. Monitor usage and feedback
3. Plan next features (v1.10)
4. Keep PWA updated with new versions

---

**Status**: ✅ Deployment Guide Complete  
**Version**: 1.9.0  
**Last Updated**: 2026-01-14

---

*Built with ❤️ for the open-source 3D printing community*
