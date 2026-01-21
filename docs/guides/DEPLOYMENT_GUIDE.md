# Vercel Deployment Guide - OpenSCAD Assistive Forge

**Version**: 1.0.0  
**Date**: 2026-01-12  
**Status**: Ready for deployment

---

## Prerequisites

### 1. Vercel Account
- [ ] Create account at https://vercel.com (free tier is sufficient)
- [ ] Verify email address
- [ ] Optional: Connect GitHub account for automatic deployments

### 2. Vercel CLI (Recommended)
```bash
npm install -g vercel
```

### 3. Git Repository (Optional but Recommended)
```bash
# Ensure all changes are committed
git status
git add -A
git commit -m "chore: prepare for v1.0.0 production deployment"
```

---

## Pre-Deployment Checklist

### ✅ Verify Configuration Files

1. **Check `package.json`** - Ensure correct scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

2. **Check `vercel.json`** - Verify headers are set:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cross-Origin-Opener-Policy",
          "value": "same-origin"
        },
        {
          "key": "Cross-Origin-Embedder-Policy",
          "value": "require-corp"
        },
        {
          "key": "Cross-Origin-Resource-Policy",
          "value": "cross-origin"
        }
      ]
    }
  ],
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

3. **Check `vite.config.js`** - Verify build settings:
```javascript
export default defineConfig({
  base: '/',
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
  }
});
```

### ✅ Test Production Build Locally

**IMPORTANT**: Test the production build BEFORE deploying to catch any issues.

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

Expected output:
```
✓ built in [time]
dist/index.html                   [size]
dist/assets/index-[hash].css      [size]
dist/assets/index-[hash].js       [size]

  VITE v5.4.21  ready in [time] ms

  ➜  Local:   http://localhost:4173/
```

**Test the preview**:
1. Navigate to http://localhost:4173/
2. Load universal cuff example
3. Adjust a parameter
4. Generate STL (verify it completes)
5. Check 3D preview loads
6. Download STL
7. Test keyboard navigation

If all tests pass, you're ready to deploy!

---

## Deployment Steps

### Method 1: Vercel CLI (Recommended)

#### Step 1: Login to Vercel
```bash
vercel login
```
- Follow the prompts to authenticate
- Check your email for verification code

#### Step 2: Deploy to Preview (Test First)
```bash
# From project root
vercel
```

The CLI will ask you:
- **Set up and deploy?** → `Y`
- **Which scope?** → Select your account
- **Link to existing project?** → `N` (first deployment)
- **What's your project's name?** → `openscad-web-customizer` (or your preference)
- **In which directory is your code located?** → `./` (current directory)
- **Want to override settings?** → `N` (use detected settings)

Vercel will:
1. Detect it's a Vite project
2. Build your application
3. Deploy to a preview URL
4. Provide a URL like: `https://openscad-web-customizer-[hash].vercel.app`

#### Step 3: Test Preview Deployment
Open the preview URL and test:
- [ ] Application loads
- [ ] Load universal cuff example
- [ ] Parameters display
- [ ] Generate STL works
- [ ] 3D preview loads
- [ ] Download works
- [ ] No console errors

#### Step 4: Deploy to Production
If preview tests pass:
```bash
vercel --prod
```

This deploys to your production domain:
- `https://openscad-web-customizer.vercel.app` (or custom domain)

---

### Method 2: Vercel Dashboard (Alternative)

#### Step 1: Push to GitHub (if not already)
```bash
# Create GitHub repository first, then:
git remote add origin https://github.com/YOUR_USERNAME/openscad-assistive-forge.git
git push -u origin main
```

#### Step 2: Import Project in Vercel
1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

#### Step 3: Deploy
- Click "Deploy"
- Wait for build to complete (~2-3 minutes)
- Vercel will provide deployment URL

#### Step 4: Test Production
- Open the provided URL
- Run through all test cases
- Verify everything works

---

## Post-Deployment Verification

### Critical Tests After Deployment

1. **COOP/COEP Headers**
   - Open DevTools → Network tab
   - Refresh page
   - Check response headers for index.html:
     - `Cross-Origin-Opener-Policy: same-origin` ✓
     - `Cross-Origin-Embedder-Policy: require-corp` ✓
   - If missing, SharedArrayBuffer won't work (WASM may fail)

2. **WASM Loading**
   - Check console for: `[Worker] OpenSCAD WASM initialized successfully`
   - Should happen within 1-2 seconds

3. **STL Generation**
   - Load example
   - Click Generate STL
   - Wait for completion (~15-50 seconds)
   - Verify no timeout errors

4. **3D Preview**
   - After STL generation
   - Check model appears in preview
   - Test orbit controls (drag to rotate)

5. **Download**
   - Click Download STL
   - Verify file downloads with format: `[model]-[hash]-[date].stl`

---

## Vercel Configuration Details

### Build Settings

If Vercel doesn't auto-detect correctly, manually set:

```
Build Command:        npm run build
Output Directory:     dist
Install Command:      npm install
Development Command:  npm run dev
Node.js Version:      18.x (or 20.x)
```

### Environment Variables

**None required for v1.0.0!** The application is 100% client-side.

For future versions with analytics:
```
PLAUSIBLE_DOMAIN=your-domain.vercel.app
```

### Custom Domain (Optional)

After deployment, you can add a custom domain:
1. Go to Project Settings → Domains
2. Add domain: `openscad-customizer.yourdomain.com`
3. Follow DNS configuration instructions
4. Wait for DNS propagation (~5-60 minutes)

---

## Troubleshooting

### Issue: SharedArrayBuffer not available

**Symptoms**: 
- Console error about SharedArrayBuffer
- WASM fails to initialize

**Solution**:
1. Verify `vercel.json` has correct headers
2. Check headers in Network tab
3. If missing, redeploy with `vercel --prod --force`

### Issue: 404 on page refresh

**Symptoms**:
- Direct URL navigation fails
- Refresh returns 404

**Solution**:
- Verify `vercel.json` has rewrites section:
  ```json
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
  ```

### Issue: WASM files not loading

**Symptoms**:
- Console error: "Failed to fetch WASM"
- Worker initialization fails

**Solution**:
- Check node_modules includes `openscad-wasm-prebuilt`
- Verify build output includes WASM in vendor chunks
- Check Network tab for 404s on WASM files

### Issue: Build fails

**Symptoms**:
- Vercel build logs show errors
- Deployment fails

**Solutions**:
1. **Test locally first**: `npm run build` should succeed
2. **Check Node version**: Vercel should use Node 18+
3. **Clear cache**: Add `--force` flag to vercel command
4. **Check dependencies**: Ensure all are in `package.json`

### Issue: Application loads but doesn't render

**Symptoms**:
- Page loads but UI is broken
- Console shows module errors

**Solution**:
- Check browser compatibility (Chrome 67+, Firefox 79+, Safari 15.2+)
- Verify CORS headers are set
- Check console for specific error messages

---

## Performance Optimization (Post-Deployment)

### Vercel Edge Network
Vercel automatically provides:
- ✅ Global CDN (files cached worldwide)
- ✅ Automatic compression (gzip/brotli)
- ✅ HTTP/2 and HTTP/3 support
- ✅ Smart caching headers

### Cache Configuration

Vercel automatically caches:
- **Static assets** (CSS, JS): 1 year (immutable)
- **WASM files**: 1 year (versioned in node_modules)
- **HTML**: No cache (always fresh)

No additional configuration needed!

### Expected Performance

After deployment:
- **Initial load (global)**: 1-3s (including CDN)
- **Subsequent loads**: < 500ms (cached)
- **WASM initialization**: ~1-2s (first time)
- **STL generation**: 13-50s (same as local)

---

## Monitoring (Optional)

### Vercel Analytics (Free Tier)

Enable in Vercel dashboard:
1. Go to Project → Analytics
2. Enable Web Analytics
3. No code changes needed

Provides:
- Page views
- Performance metrics (Web Vitals)
- Geographic distribution
- Device/browser breakdown

### Error Monitoring (Optional)

For production error tracking, consider:
- **Sentry** (free tier available)
- **LogRocket** (session replay)
- **Console logging** (basic, free)

For v1.0.0, console logging is sufficient.

---

## Security Considerations

### Vercel Security Features (Built-in)

- ✅ **HTTPS by default** - All deployments are HTTPS
- ✅ **DDoS protection** - Included on all plans
- ✅ **SSL certificates** - Auto-generated and renewed
- ✅ **Edge caching** - Reduces origin load

### Application Security

Already implemented:
- ✅ COOP/COEP headers for WASM security
- ✅ Web Worker isolation
- ✅ No server-side code (100% client-side)
- ✅ Input sanitization (file size limits, type validation)
- ✅ Timeout enforcement (prevents DoS)

---

## Cost Estimate

### Vercel Free Tier Limits

- **Bandwidth**: 100GB/month
- **Build time**: 6,000 minutes/month
- **Concurrent builds**: 1
- **Deployments**: Unlimited

### Expected Usage (v1.0.0)

**Per user session**:
- Page load: ~1MB (HTML + JS + CSS)
- WASM load: ~15-30MB (one-time, cached)
- Example file: ~30KB
- STL download: ~500KB average

**Bandwidth calculation**:
- 100 users/month: ~3GB
- 1,000 users/month: ~30GB
- 3,000 users/month: ~90GB (within free tier)

**Recommendation**: Free tier is sufficient for initial launch. Upgrade to Pro ($20/month) if traffic exceeds limits.

---

## Deployment Checklist

### Before Deployment
- [ ] All tests passing (verified ✅)
- [ ] Production build succeeds (`npm run build`)
- [ ] Preview works locally (`npm run preview`)
- [ ] Git repository is clean (all changes committed)
- [ ] `vercel.json` has correct headers
- [ ] `package.json` has correct scripts
- [ ] README updated with usage instructions

### During Deployment
- [ ] Login to Vercel (`vercel login`)
- [ ] Deploy to preview first (`vercel`)
- [ ] Test preview URL thoroughly
- [ ] Deploy to production (`vercel --prod`)

### After Deployment
- [ ] Test production URL
- [ ] Verify COOP/COEP headers
- [ ] Test STL generation end-to-end
- [ ] Test on mobile device
- [ ] Share URL with trusted testers
- [ ] Monitor console for errors (first 24 hours)

---

## Quick Reference Commands

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Test production build locally
npm run build && npm run preview

# Deploy to preview (test environment)
vercel

# Deploy to production
vercel --prod

# View deployment logs
vercel logs [deployment-url]

# List all deployments
vercel ls

# Remove a deployment
vercel rm [deployment-url]
```

---

## Expected Deployment Output

### Successful Deployment
```
🔍  Inspect: https://vercel.com/[username]/[project]/[deployment-id]
✅  Production: https://openscad-web-customizer.vercel.app [copied]
📝  Deployed to production. Run `vercel --prod` to overwrite later deployments.
```

### Build Logs (Successful)
```
Running build command: npm run build
> vite build

✓ building for production...
✓ [X] modules transformed
✓ built in [time]s

dist/index.html                           [size] kB
dist/assets/index-[hash].js              [size] kB
dist/assets/index-[hash].css              [size] kB
dist/assets/three-[hash].js              [size] kB
dist/assets/openscad-wasm-[hash].js      [size] kB

Build Completed
```

---

## Post-Deployment URLs

After deployment, you'll have:

1. **Production URL**: `https://[project-name].vercel.app`
2. **Preview URLs**: `https://[project-name]-[hash].vercel.app` (for each deployment)
3. **Vercel Dashboard**: `https://vercel.com/[username]/[project-name]`

---

## Testing Your Deployment

### Manual Test Checklist

Visit your production URL and verify:

1. **Page Load**
   - [ ] Page loads without errors
   - [ ] No 404s in Network tab
   - [ ] Console shows "OpenSCAD Assistive Forge v3.1.0"
   - [ ] Console shows "[Worker] OpenSCAD WASM initialized successfully"

2. **File Upload**
   - [ ] Click "Load Universal Cuff Example"
   - [ ] Parameters display (47 parameters)
   - [ ] Groups are collapsible
   - [ ] UI is responsive

3. **STL Generation**
   - [ ] Click "Generate STL"
   - [ ] Progress messages appear
   - [ ] Completes within 60 seconds
   - [ ] Stats display (triangles, file size, time)

4. **3D Preview**
   - [ ] Model appears in preview area
   - [ ] Can rotate with mouse drag
   - [ ] Can zoom with scroll wheel
   - [ ] Can pan with right-click drag

5. **Download**
   - [ ] Click "Download STL"
   - [ ] File downloads
   - [ ] Filename format: `[model]-[hash]-[date].stl`

6. **Accessibility**
   - [ ] Tab key navigates through controls
   - [ ] Focus indicators visible
   - [ ] Skip link works

7. **Mobile** (if available)
   - [ ] Load on mobile device
   - [ ] Touch controls work
   - [ ] Layout is usable
   - [ ] Generate STL works

### Automated Test (Browser Console)

Run this in the browser console on production:

```javascript
// Verify required features
console.log('WebAssembly:', typeof WebAssembly !== 'undefined' ? '✓' : '✗');
console.log('Worker:', typeof Worker !== 'undefined' ? '✓' : '✗');
console.log('FileReader:', typeof FileReader !== 'undefined' ? '✓' : '✗');
console.log('SharedArrayBuffer:', typeof SharedArrayBuffer !== 'undefined' ? '✓' : '✗');

// Check COOP/COEP headers (should enable SharedArrayBuffer)
fetch(window.location.href).then(r => {
  console.log('COOP:', r.headers.get('Cross-Origin-Opener-Policy'));
  console.log('COEP:', r.headers.get('Cross-Origin-Embedder-Policy'));
});
```

Expected output:
```
WebAssembly: ✓
Worker: ✓
FileReader: ✓
SharedArrayBuffer: ✓
COOP: same-origin
COEP: require-corp
```

---

## Rollback Plan

If deployment has critical issues:

```bash
# List all deployments
vercel ls

# Promote previous deployment to production
vercel promote [previous-deployment-url]

# Or rollback via dashboard:
# 1. Go to Vercel dashboard
# 2. Select project
# 3. Go to Deployments
# 4. Find previous working deployment
# 5. Click "..." → "Promote to Production"
```

---

## Common Issues and Solutions

### Issue: Build succeeds but site is blank

**Cause**: Base path misconfiguration

**Solution**:
```javascript
// vite.config.js
export default defineConfig({
  base: '/', // Should be '/' not '/dist/'
});
```

### Issue: WASM fails to load on Vercel

**Cause**: Incorrect MIME type or CORS

**Solution**:
- Vercel should handle this automatically
- Check Network tab for failed requests
- Verify `openscad-wasm-prebuilt` is in dependencies (not devDependencies)

### Issue: Application works locally but not on Vercel

**Cause**: Environment differences

**Solutions**:
1. Check Node version matches (18+)
2. Verify all imports use relative paths
3. Check case sensitivity (Vercel is case-sensitive)
4. Test with `npm run build && npm run preview` locally

### Issue: Headers not applied

**Cause**: `vercel.json` not recognized

**Solutions**:
1. Verify `vercel.json` is in project root
2. Check JSON syntax is valid
3. Redeploy with `--force` flag
4. Check Vercel dashboard → Settings → Headers

---

## Next Steps After Deployment

### Immediate (First 24 Hours)
1. **Monitor**: Check Vercel dashboard for errors
2. **Test**: Verify on multiple devices/browsers
3. **Share**: Get feedback from trusted users
4. **Document**: Add deployment URL to README

### Short-term (First Week)
1. **Analytics**: Review Vercel Analytics data
2. **Feedback**: Collect user reports
3. **Fixes**: Address any reported issues
4. **Documentation**: Add FAQ based on questions

### Medium-term (First Month)
1. **Performance**: Review Core Web Vitals
2. **Optimization**: Address any bottlenecks
3. **Features**: Plan v1.1 based on feedback
4. **Community**: Share with OpenSCAD community

---

## Success Criteria

Your deployment is successful when:

- ✅ Application loads without errors
- ✅ WASM initializes successfully
- ✅ STL generation works end-to-end
- ✅ 3D preview displays models
- ✅ Download produces valid STL files
- ✅ Keyboard navigation works
- ✅ No critical console errors
- ✅ Performance is acceptable (< 3s initial load)

---

## Support Resources

### Vercel Documentation
- Getting Started: https://vercel.com/docs/getting-started-with-vercel
- Configuration: https://vercel.com/docs/project-configuration
- Troubleshooting: https://vercel.com/docs/troubleshooting

### Project Resources
- Build Plan: `docs/BUILD_PLAN_NEW.md`
- Progress Report: `PROGRESS.md`
- Test Report: `TEST_REPORT.md`
- GitHub Issues: (create repository issues)

---

## Maintenance

### Redeploying After Changes

```bash
# Make your changes
git add -A
git commit -m "fix: describe your changes"

# Test locally
npm run build && npm run preview

# Deploy to preview
vercel

# If tests pass, deploy to production
vercel --prod
```

### Automatic Deployments (GitHub Integration)

If you connected GitHub:
- **Every push to main** → Automatic production deployment
- **Every pull request** → Automatic preview deployment
- **Merge to main** → Automatic production update

---

## Final Pre-Deployment Check

Run through this checklist ONE MORE TIME before deploying:

- [ ] `npm run build` succeeds without errors
- [ ] `npm run preview` works and all features functional
- [ ] No console errors in production preview
- [ ] All files committed to git
- [ ] `vercel.json` has correct headers
- [ ] `package.json` has correct build command
- [ ] README is updated (optional but recommended)

**If all boxes are checked**: ✅ **YOU'RE READY TO DEPLOY!**

---

**Status**: ✅ Ready for deployment  
**Confidence Level**: High (all tests passing)  
**Estimated Deployment Time**: 5-10 minutes  
**Risk Level**: Low (can rollback easily)

🚀 **LET'S GO!**
