# Vercel Configuration (Legacy/Archive)

**Status**: Legacy - Preserved for rollback purposes  
**Date Archived**: 2026-01-17  
**Reason**: Migration to Cloudflare Pages as primary hosting platform

---

## Overview

This document preserves the Vercel deployment configuration that was used as the primary hosting platform prior to the Cloudflare Pages migration. The configuration remains functional and can be used as a rollback option if needed.

## Configuration File

The `vercel.json` file in the project root contains the complete Vercel configuration:

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

## Why This Configuration Works

### COOP/COEP Headers
- **Cross-Origin-Opener-Policy: same-origin** — Isolates the browsing context
- **Cross-Origin-Embedder-Policy: require-corp** — Requires all resources to be same-origin or explicitly opt-in
- **Cross-Origin-Resource-Policy: cross-origin** — Allows resources to be shared cross-origin

These headers enable `SharedArrayBuffer` which is required for OpenSCAD WASM threading support.

### SPA Routing
The rewrite rule sends all routes to `index.html`, enabling client-side routing.

---

## Rollback Instructions

If you need to rollback to Vercel hosting:

### Prerequisites
- Vercel account (free tier sufficient)
- Vercel CLI installed: `npm install -g vercel`

### Quick Rollback Steps

```bash
# 1. Login to Vercel
vercel login

# 2. Deploy to preview (test first)
vercel

# 3. If preview works, deploy to production
vercel --prod
```

### Full Deployment Steps

1. **Verify Configuration**
   ```bash
   # Ensure vercel.json exists and is valid
   cat vercel.json
   ```

2. **Build Locally**
   ```bash
   npm run build
   npm run preview  # Test at http://localhost:4173
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Verify Deployment**
   - Open deployed URL
   - Check browser console for `[Worker] OpenSCAD WASM initialized successfully`
   - Verify `window.crossOriginIsolated === true` in console
   - Test STL generation

---

## Vercel Free Tier Limits

| Resource | Limit |
|----------|-------|
| Bandwidth | 100 GB/month |
| Build Minutes | 6,000/month |
| Concurrent Builds | 1 |
| Deployments | Unlimited |

For this application's typical usage (WASM ~15-30MB initial load, cached thereafter), the free tier supports approximately 3,000-6,000 unique users per month.

---

## Comparison: Vercel vs Cloudflare Pages

| Feature | Vercel | Cloudflare Pages |
|---------|--------|------------------|
| Bandwidth (Free) | 100 GB/month | **Unlimited** |
| Build Minutes | 6,000/month | 500/month |
| Global CDN | ✅ | ✅ |
| Custom Headers | ✅ | ✅ |
| Custom Domains | ✅ | ✅ |
| Git Integration | ✅ | ✅ |
| Preview Deployments | ✅ | ✅ |

**Reason for Migration**: Cloudflare Pages offers unlimited bandwidth on the free tier, which is beneficial for a WASM application with large initial downloads.

---

## Historical Deployment URL

The original Vercel deployment was available at:
- `https://openscad-assistive-forge-gutg7h11z.vercel.app`

This URL may still be active depending on Vercel project status.

---

## Related Documentation

- [Cloudflare Pages Deployment Guide](./CLOUDFLARE_PAGES_DEPLOYMENT.md) — Current primary hosting
- [Original Vercel Deployment Guide](./DEPLOYMENT_GUIDE.md) — Detailed Vercel instructions
- [Troubleshooting](../TROUBLESHOOTING.md) — Common issues and solutions
