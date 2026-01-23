# Cloudflare Pages Deployment Guide

**Version**: 1.0.0  
**Date**: 2026-01-17  
**Status**: Primary hosting platform

---

## Overview

Cloudflare Pages is the recommended hosting platform for OpenSCAD Assistive Forge. It provides:

- **Unlimited bandwidth** on the free tier
- **Global CDN** for fast asset delivery worldwide
- **Custom headers support** via `_headers` file (required for WASM)
- **Automatic HTTPS** and custom domain support
- **Git integration** for automatic deployments

---

## Prerequisites

### 1. Cloudflare Account
- Create a free account at https://dash.cloudflare.com/sign-up
- No credit card required

### 2. Git Repository
- Push your code to GitHub, GitLab, or Bitbucket
- Cloudflare Pages integrates directly with these providers

### 3. Local Testing
```bash
# Verify build works locally
npm run build
npm run preview
# Open http://localhost:4173 and test functionality
```

---

## Configuration Files

The project includes two Cloudflare Pages configuration files in `public/`:

### `_headers` — HTTP Response Headers

```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Resource-Policy: cross-origin
```

These headers enable `SharedArrayBuffer` for WASM threading support.

### `_redirects` — SPA Routing

```
/*    /index.html   200
```

This ensures all routes serve `index.html` for client-side routing.

---

## Deployment Methods

### Method 1: Git Integration (Recommended)

This method automatically deploys when you push to your repository.

#### Step 1: Connect Repository

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages**
2. Click **Create** → **Pages** → **Connect to Git**
3. Select your Git provider (GitHub, GitLab, or Bitbucket)
4. Authorize Cloudflare to access your repository
5. Select the `openscad-assistive-forge` repository

#### Step 2: Configure Build Settings

| Setting | Value |
|---------|-------|
| **Production branch** | `main` |
| **Framework preset** | None (or Vite if available) |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | `/` (leave empty) |
| **Node.js version** | 18 or 20 |

#### Step 3: Deploy

1. Click **Save and Deploy**
2. Wait for build to complete (~2-3 minutes)
3. Cloudflare provides a URL: `https://[project-name].pages.dev`

#### Automatic Deployments

After initial setup:
- **Push to `main`** → Automatic production deployment
- **Push to other branches** → Automatic preview deployment
- **Pull requests** → Preview deployment with unique URL

---

### Method 2: Wrangler CLI (Direct Upload)

Use this for manual deployments or CI/CD pipelines.

#### Step 1: Install Wrangler

```bash
npm install -g wrangler
```

#### Step 2: Authenticate

```bash
wrangler login
```

#### Step 3: Create Project (First Time Only)

```bash
wrangler pages project create openscad-customizer
```

#### Step 4: Build and Deploy

```bash
# Build the project
npm run build

# Deploy to production
wrangler pages deploy dist --project-name=openscad-customizer

# Or deploy to preview
wrangler pages deploy dist --project-name=openscad-customizer --branch=preview
```

---

## Post-Deployment Verification

### 1. Check Cross-Origin Isolation

Open browser DevTools console and run:

```javascript
console.log('Cross-Origin Isolated:', window.crossOriginIsolated);
// Should output: Cross-Origin Isolated: true
```

### 2. Verify Headers

In DevTools → Network tab:
1. Refresh the page
2. Click on the main document request
3. Check Response Headers:
   - `Cross-Origin-Opener-Policy: same-origin` ✓
   - `Cross-Origin-Embedder-Policy: require-corp` ✓

### 3. Test WASM Initialization

Check console for:
```
[Worker] OpenSCAD WASM initialized successfully
```

### 4. Full Functionality Test

- [ ] Load an example model
- [ ] Adjust parameters
- [ ] Generate STL (should complete in 15-60 seconds)
- [ ] Download STL file
- [ ] Test 3D preview rotation/zoom

---

## Custom Domain Setup

### Step 1: Add Domain

1. Go to your Pages project → **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `customizer.yourdomain.com`)

### Step 2: Configure DNS

#### If domain is on Cloudflare:
- DNS records are added automatically
- Wait for SSL certificate provisioning (~5 minutes)

#### If domain is elsewhere:
Add a CNAME record:
```
Type: CNAME
Name: customizer (or your subdomain)
Target: [project-name].pages.dev
```

Wait for DNS propagation (5-60 minutes).

---

## Environment Variables

No environment variables are required for the base application (100% client-side).

If you need to add variables for future features:
1. Go to Pages project → **Settings** → **Environment variables**
2. Add variables for Production and/or Preview environments

---

## Build Configuration

### Node.js Version

Set in the Cloudflare dashboard or via `package.json`:

```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Build Command Customization

The default build command is `npm run build`. To customize:
1. Go to project **Settings** → **Builds & deployments**
2. Modify **Build command**

---

## Troubleshooting

### Issue: SharedArrayBuffer Not Available

**Symptoms**: 
- Console error about SharedArrayBuffer
- `window.crossOriginIsolated === false`

**Solutions**:
1. Verify `_headers` file is in `public/` directory
2. Check that `_headers` is included in `dist/` after build
3. Verify headers in Network tab
4. Clear Cloudflare cache: Dashboard → **Caching** → **Purge Everything**

### Issue: 404 on Page Refresh

**Symptoms**: 
- Direct URL navigation returns 404
- Refreshing non-root pages fails

**Solutions**:
1. Verify `_redirects` file is in `public/` directory
2. Check that `_redirects` is included in `dist/` after build
3. Ensure the redirect rule is: `/*    /index.html   200`

### Issue: Build Fails

**Symptoms**:
- Deployment fails during build step

**Solutions**:
1. Test build locally: `npm run build`
2. Check Node.js version (should be 18+)
3. Review build logs in Cloudflare dashboard
4. Ensure all dependencies are in `package.json`

### Issue: WASM Files Not Loading

**Symptoms**:
- Console error: "Failed to fetch WASM"
- Worker initialization fails

**Solutions**:
1. Check that WASM files have correct MIME type in headers
2. Verify `openscad-wasm-prebuilt` is in `dependencies` (not `devDependencies`)
3. Check Network tab for 404s on `.wasm` files

---

## Free Tier Limits

| Resource | Limit |
|----------|-------|
| **Bandwidth** | Unlimited |
| **Build minutes** | 500/month |
| **Concurrent builds** | 1 |
| **Sites** | Unlimited |
| **Custom domains** | Unlimited |
| **Preview deployments** | Unlimited |

For this application, the 500 build minutes/month is sufficient for typical development workflows (~100+ deployments/month).

---

## Comparison with Other Platforms

| Feature | Cloudflare Pages | Vercel | Netlify |
|---------|------------------|--------|---------|
| **Bandwidth (Free)** | **Unlimited** | 100 GB | 100 GB |
| **Build Minutes** | 500/mo | 6,000/mo | 300/mo |
| **Custom Headers** | ✅ | ✅ | ✅ |
| **Global CDN** | ✅ | ✅ | ✅ |
| **Git Integration** | ✅ | ✅ | ✅ |

**Why Cloudflare Pages**: Unlimited bandwidth is crucial for WASM applications with large initial downloads (~15-30MB).

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=openscad-customizer
```

Required secrets:
- `CLOUDFLARE_API_TOKEN` — Create at Cloudflare Dashboard → My Profile → API Tokens
- `CLOUDFLARE_ACCOUNT_ID` — Found in Cloudflare Dashboard URL or Account Home

---

## Rollback

### To Previous Deployment

1. Go to Pages project → **Deployments**
2. Find the previous working deployment
3. Click **...** → **Rollback to this deployment**

### To Vercel (Alternative Platform)

See [Vercel Legacy Configuration](../archive/VERCEL_LEGACY_CONFIG.md) for rollback instructions (archived).

---

## Quick Reference Commands

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create new Pages project
wrangler pages project create [project-name]

# Deploy to production
npm run build && wrangler pages deploy dist --project-name=[project-name]

# Deploy to preview branch
npm run build && wrangler pages deploy dist --project-name=[project-name] --branch=preview

# List deployments
wrangler pages deployment list --project-name=[project-name]
```

---

## Related Documentation

- [Vercel Legacy Configuration](../archive/VERCEL_LEGACY_CONFIG.md) — Rollback option (archived)
- [Troubleshooting](../TROUBLESHOOTING.md) — Common issues
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/) — Official documentation
