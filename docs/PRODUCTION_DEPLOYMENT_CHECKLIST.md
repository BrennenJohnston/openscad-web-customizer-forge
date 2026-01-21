# Production Deployment Checklist

**Version**: 1.0.0  
**Date**: January 17, 2026  
**Status**: Complete

---

## Overview

This checklist ensures a complete and verified production deployment of OpenSCAD Assistive Forge to Cloudflare Pages (or alternative hosting platform).

**Use this checklist**:
- ✅ Before first deployment
- ✅ After major configuration changes
- ✅ When troubleshooting deployment issues
- ✅ For deployment verification

---

## Pre-Deployment Validation

### 1. Local Environment Setup

- [ ] **Node.js 18+** installed
  ```bash
  node --version  # Should be v18.0.0 or higher
  ```

- [ ] **npm 8+** installed
  ```bash
  npm --version  # Should be 8.0.0 or higher
  ```

- [ ] **Git** installed and configured
  ```bash
  git --version
  git config user.name
  git config user.email
  ```

- [ ] **Project cloned** and up to date
  ```bash
  git status
  git pull origin main
  ```

### 2. Dependencies Installation

- [ ] **Dependencies installed**
  ```bash
  npm install
  ```

- [ ] **No vulnerability warnings** (or acceptable)
  ```bash
  npm audit
  ```

- [ ] **node_modules/** folder exists with contents

### 3. Local Build Test

- [ ] **Build succeeds**
  ```bash
  npm run build
  ```

- [ ] **dist/ folder created** with expected files:
  - [ ] `index.html`
  - [ ] `assets/` directory with JS/CSS bundles
  - [ ] `_headers` file
  - [ ] `_redirects` file

- [ ] **Bundle size acceptable** (~12 MB including WASM)

### 4. Local Preview Test

- [ ] **Preview server starts**
  ```bash
  npm run preview
  ```

- [ ] **Opens in browser** at http://localhost:4173

- [ ] **Page loads without errors** (check console)

- [ ] **Basic functionality works**:
  - [ ] UI renders correctly
  - [ ] Can select theme (light/dark)
  - [ ] Example models load

**Note**: Cross-origin isolation (`window.crossOriginIsolated`) may be `false` in local preview. This is expected—full testing requires deployment.

### 5. Configuration Files Verification

- [ ] **`public/_headers`** file exists and contains:
  ```
  /*
    Cross-Origin-Opener-Policy: same-origin
    Cross-Origin-Embedder-Policy: require-corp
    Cross-Origin-Resource-Policy: cross-origin
  ```

- [ ] **`public/_redirects`** file exists and contains:
  ```
  /*    /index.html   200
  ```

- [ ] **Both files copied to `dist/`** after build
  ```bash
  # Windows
  Test-Path "dist\_headers"
  Test-Path "dist\_redirects"
  
  # Mac/Linux
  ls -la dist/_headers dist/_redirects
  ```

---

## Cloudflare Pages Deployment

### 1. Account Setup

- [ ] **Cloudflare account created** at https://dash.cloudflare.com/sign-up

- [ ] **Email verified**

- [ ] **Can access Cloudflare Dashboard**

### 2. Repository Connection (Method 1: Git Integration)

- [ ] **Navigate to Workers & Pages** in Cloudflare Dashboard

- [ ] **Click Create → Pages → Connect to Git**

- [ ] **Git provider selected** (GitHub/GitLab/Bitbucket)

- [ ] **Repository authorized** in Git provider

- [ ] **Correct repository selected**

- [ ] **Build settings configured**:
  - [ ] Production branch: `main` (or your default branch)
  - [ ] Build command: `npm run build`
  - [ ] Build output directory: `dist`
  - [ ] Root directory: `/` (leave empty)
  - [ ] Node.js version: 18 or 20

- [ ] **Project created successfully**

### 3. Alternative: Wrangler CLI Deployment (Method 2)

Skip this section if using Git integration.

- [ ] **Wrangler CLI installed globally**
  ```bash
  npm install -g wrangler
  ```

- [ ] **Authenticated with Cloudflare**
  ```bash
  wrangler login
  ```

- [ ] **Project created** (first time only)
  ```bash
  wrangler pages project create openscad-customizer
  ```

- [ ] **Deployment successful**
  ```bash
  npm run build
  wrangler pages deploy dist --project-name=openscad-customizer
  ```

### 4. Initial Build Verification

- [ ] **Build started automatically** (Git) or manually (Wrangler)

- [ ] **Build logs accessible** in Cloudflare Dashboard

- [ ] **Build completed successfully** (~2-5 minutes)

- [ ] **No errors in build logs**

- [ ] **Deployment URL generated**
  - Format: `https://[random-id].[project-name].pages.dev`

---

## Post-Deployment Verification

### 1. Site Accessibility

- [ ] **Deployment URL opens** in browser

- [ ] **Page loads** without 404 or 500 errors

- [ ] **No console errors** (check browser DevTools F12)

- [ ] **Assets load** (check Network tab, all 200 status codes)

### 2. Cross-Origin Isolation Verification

**Critical: This determines if COOP/COEP headers are working.**

- [ ] **Open browser console** (F12 → Console tab)

- [ ] **Run isolation check**:
  ```javascript
  console.log('Cross-Origin Isolated:', window.crossOriginIsolated);
  ```

- [ ] **Result is `true`** ✅

  **If `false`**: Headers not applied. See [Troubleshooting](#troubleshooting) section.

### 3. HTTP Headers Verification

- [ ] **Open DevTools Network tab** (F12 → Network)

- [ ] **Refresh page**

- [ ] **Click on document request** (first item, usually HTML)

- [ ] **Check Response Headers** section:
  - [ ] `Cross-Origin-Opener-Policy: same-origin` ✅
  - [ ] `Cross-Origin-Embedder-Policy: require-corp` ✅
  - [ ] `Cross-Origin-Resource-Policy: cross-origin` ✅

### 4. WASM Initialization Verification

- [ ] **Check console for WASM messages**:
  ```
  [Worker] OpenSCAD WASM initialized successfully
  ```

- [ ] **No WASM loading errors**

- [ ] **No SharedArrayBuffer errors** (if headers are working, this won't occur)

### 5. Full Functionality Test

#### File Upload
- [ ] **Can upload `.scad` file** (try `public/examples/simple-box/simple_box.scad`)

- [ ] **Parameters detected and UI generated**

- [ ] **No errors in console**

#### Parameter Interaction
- [ ] **Sliders work** (can adjust numeric values)

- [ ] **Dropdowns work** (can select options)

- [ ] **Checkboxes work** (can toggle)

- [ ] **Text inputs work** (can type)

#### 3D Preview
- [ ] **3D preview loads** (canvas visible)

- [ ] **Model renders** (geometry visible)

- [ ] **Can rotate view** (mouse drag or touch)

- [ ] **Can zoom** (scroll wheel or pinch)

#### STL Generation
- [ ] **Click "Generate STL" or equivalent**

- [ ] **Progress indicator shows** (if present)

- [ ] **STL generates successfully** (15-60 seconds typical)

- [ ] **No console errors during generation**

#### Download
- [ ] **"Download STL" button enabled**

- [ ] **Click download**

- [ ] **File downloads** (check browser downloads)

- [ ] **File size reasonable** (>0 bytes)

- [ ] **STL can be opened** in slicer software (optional verification)

### 6. SPA Routing Verification

- [ ] **Navigate to a non-root URL** (if app has routes)

- [ ] **Refresh page** (F5 or Ctrl+R)

- [ ] **Page loads successfully** (not 404)

- [ ] **No redirect loop**

**If 404 occurs**: `_redirects` file not working. See [Troubleshooting](#troubleshooting).

### 7. Performance Check

- [ ] **Initial page load** <5 seconds (on reasonable connection)

- [ ] **WASM loads** within 10-15 seconds

- [ ] **Subsequent visits faster** (caching working)

- [ ] **No excessive memory usage** (check Task Manager/Activity Monitor)

### 8. Cross-Browser Testing (Recommended)

Test in multiple browsers to ensure compatibility:

- [ ] **Chrome/Edge (Chromium)**
  - [ ] Site loads
  - [ ] `crossOriginIsolated === true`
  - [ ] Full functionality works

- [ ] **Firefox**
  - [ ] Site loads
  - [ ] `crossOriginIsolated === true`
  - [ ] Full functionality works

- [ ] **Safari** (if available)
  - [ ] Site loads
  - [ ] `crossOriginIsolated === true`
  - [ ] Full functionality works

### 9. Mobile Testing (Optional but Recommended)

- [ ] **Site loads on mobile** (phone or responsive mode)

- [ ] **UI is usable** (buttons accessible)

- [ ] **Can upload file** (if mobile browser supports it)

- [ ] **Touch gestures work** (3D view)

**Note**: See [MOBILE_LIMITATIONS.md](MOBILE_LIMITATIONS.md) for known constraints.

---

## Optional: Custom Domain Setup

Skip this section if using default `*.pages.dev` domain.

### 1. Domain Configuration

- [ ] **Domain ownership** verified

- [ ] **Custom domain added** in Cloudflare Pages project settings

- [ ] **DNS configured**:
  - [ ] CNAME record created pointing to `[project].pages.dev`
  - OR
  - [ ] Automatic DNS (if domain on Cloudflare)

- [ ] **SSL certificate provisioned** (~5 minutes)

- [ ] **Custom domain accessible**

### 2. Custom Domain Verification

- [ ] **Site loads on custom domain**

- [ ] **HTTPS working** (green padlock)

- [ ] **Headers still present** (check Network tab)

- [ ] **`crossOriginIsolated === true`** on custom domain

---

## Troubleshooting

### Issue: `crossOriginIsolated === false`

**Symptoms**: 
- Console shows `Cross-Origin Isolated: false`
- Headers not visible in Network tab

**Solutions**:

1. **Verify `_headers` file in `dist/`**:
   ```bash
   # Windows
   Get-Content "dist\_headers"
   
   # Mac/Linux
   cat dist/_headers
   ```

2. **Check file syntax**:
   - No `.txt` extension
   - Correct format (no JSON, no YAML)
   - Paths match pattern (`/*` for all routes)

3. **Clear Cloudflare cache**:
   - Dashboard → Caching → Purge Everything
   - Wait 5 minutes
   - Hard refresh browser (Ctrl+Shift+R)

4. **Verify headers in build config**:
   - Check `vite.config.js` publicDir setting
   - Ensure `public/` directory copies to `dist/`

5. **Check Cloudflare deployment logs**:
   - Look for file copy warnings
   - Verify `_headers` mentioned in build output

### Issue: 404 on Page Refresh

**Symptoms**:
- Direct URL navigation fails
- Refreshing non-root routes shows 404

**Solutions**:

1. **Verify `_redirects` file**:
   ```bash
   # Windows
   Get-Content "dist\_redirects"
   
   # Mac/Linux
   cat dist/_redirects
   ```

2. **Check redirect rule**:
   - Must be exactly: `/*    /index.html   200`
   - Status code 200 (not 301/302)
   - Three spaces between path and target (or tab)

3. **Rebuild and redeploy**:
   ```bash
   npm run build
   wrangler pages deploy dist --project-name=[name]
   ```

### Issue: Build Fails

**Symptoms**:
- Deployment fails during build step
- Error in Cloudflare build logs

**Solutions**:

1. **Test build locally**:
   ```bash
   npm run build
   ```
   If fails locally, fix errors first.

2. **Check Node.js version**:
   - Cloudflare dashboard → Settings → Environment variables
   - Set `NODE_VERSION` to `18` or `20`

3. **Verify dependencies**:
   - All deps in `package.json` (not just devDependencies)
   - `package-lock.json` committed to repo

4. **Review build command**:
   - Should be exactly `npm run build`
   - Build output directory `dist`

### Issue: WASM Fails to Load

**Symptoms**:
- Console error: "Failed to fetch WASM"
- Worker initialization fails

**Solutions**:

1. **Check WASM file in dist**:
   ```bash
   # Look for large JS file containing WASM
   ls -lh dist/assets/
   ```
   Should see ~11 MB openscad-worker file.

2. **Verify dependency**:
   - `openscad-wasm-prebuilt` in `dependencies` (not devDependencies)
   - Version matches `package.json` (^1.2.0)

3. **Check Content-Type header**:
   - Network tab → find `.wasm` or worker file
   - Response Headers should include `Content-Type: application/wasm` or `application/javascript`

4. **Clear cache and retry**:
   - Hard refresh (Ctrl+Shift+R)
   - Clear browser cache
   - Incognito/private window

---

## Rollback Procedures

### Rollback to Previous Cloudflare Deployment

1. **Go to Cloudflare Pages project** → **Deployments** tab

2. **Find previous working deployment** in list

3. **Click `...` menu** → **Rollback to this deployment**

4. **Confirm rollback**

5. **Verify site works** after rollback

### Rollback to Vercel (Alternative Platform)

If Cloudflare has issues, fall back to Vercel:

1. **Follow [Vercel Legacy Configuration](guides/VERCEL_LEGACY_CONFIG.md)**

2. **Deploy to Vercel**:
   ```bash
   npm install -g vercel
   vercel login
   vercel --prod
   ```

3. **Update DNS** if using custom domain

---

## Post-Deployment Actions

### 1. Documentation Updates

- [ ] **Update README** with production URL

- [ ] **Update deployment guides** with lessons learned

- [ ] **Document any issues encountered** in troubleshooting guide

### 2. Monitoring Setup (Optional)

- [ ] **Set up uptime monitoring** (UptimeRobot, Pingdom, etc.)

- [ ] **Configure error tracking** (Sentry, LogRocket, etc.)

- [ ] **Enable analytics** (if desired)

### 3. Team Notification

- [ ] **Notify team** of deployment

- [ ] **Share production URL**

- [ ] **Provide access to Cloudflare project**

### 4. Version Tagging

- [ ] **Tag release in Git**:
  ```bash
  git tag -a v2.10.1 -m "Production deployment"
  git push origin v2.10.1
  ```

- [ ] **Create GitHub release** (if using GitHub)

---

## Maintenance Checklist

### Regular (Weekly/Monthly)

- [ ] **Check build minutes usage** (Cloudflare: 500/month free)

- [ ] **Review error logs** (if monitoring enabled)

- [ ] **Test site functionality** (quick smoke test)

- [ ] **Update dependencies** (npm update, test, deploy)

### As Needed

- [ ] **Update OpenSCAD WASM version** when new releases available

- [ ] **Re-run this checklist** after major changes

- [ ] **Review performance metrics** (Core Web Vitals)

---

## Success Criteria

✅ **Deployment is successful when**:

1. **Site accessible** at deployment URL
2. **`window.crossOriginIsolated === true`**
3. **All COOP/COEP headers present** in Network tab
4. **WASM initializes** without errors
5. **Full user workflow works**:
   - Upload file → Adjust parameters → Generate STL → Download
6. **Page refresh works** (no 404 on non-root routes)
7. **No console errors** during normal use

---

## Additional Resources

### Documentation

- [Cloudflare Pages Deployment Guide](guides/CLOUDFLARE_PAGES_DEPLOYMENT.md) — Detailed instructions
- [Cloudflare Configuration Validation](research/CLOUDFLARE_VALIDATION.md) — Verified setup
- [WASM Threading Analysis](research/WASM_THREADING_ANALYSIS.md) — Technical details
- [Troubleshooting Guide](TROUBLESHOOTING.md) — Common issues

### External Links

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cross-Origin Isolation Guide](https://web.dev/cross-origin-isolation-guide/)
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)

---

## Checklist Summary

**Total Checks**: 100+  
**Estimated Time**: 45-90 minutes (first deployment)  
**Difficulty**: Intermediate  
**Prerequisites**: Node.js 18+, Git, Cloudflare account

---

**Document Version**: 1.0.0  
**Last Updated**: January 17, 2026  
**Maintained By**: OpenSCAD Assistive Forge Team  
**Status**: ✅ Production Ready
