# Deployment (Cloudflare Pages)

This app is a static Vite site, but it needs cross-origin isolation headers so OpenSCAD WASM can use `SharedArrayBuffer`.

## Build

```bash
npm install
npm run build
```

Output is `dist/`.

## Required headers / redirects

These are committed in `public/` so Vite copies them into `dist/`.

`public/_headers`:

```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Resource-Policy: cross-origin
```

`public/_redirects`:

```
/*    /index.html   200
```

## Deploy (Git integration)

Cloudflare Pages settings:

- Build command: `npm run build`
- Build output directory: `dist`
- Node: 18+ (18 or 20 is fine)

## Sanity checks after deploy

In a browser console:

```js
window.crossOriginIsolated
```

It should be `true`. If it’s `false`, the `_headers` file isn’t being applied.

Also verify:

- You can load an example, tweak a parameter, and the preview updates.
- You can generate and download an STL.
- Service worker registers (optional, but expected for the PWA bits).

## Troubleshooting

- `window.crossOriginIsolated === false`: open DevTools → Network → click the main document → confirm `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` are present.
- Page refresh 404s on non-root URLs: confirm `_redirects` made it to `dist/` and is being applied.

