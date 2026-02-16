# Fly.io Texture Render Update (2026-02-16)

## Scope
This document summarizes the texture-render migration, stability fixes, Fly.io worker setup, and test/dev toggles added for the sky map export flow.

## Product Context
- App: `ourskymap` poster generator
- Output: downloadable `SVG + PNG + PDF` zip per order/coupon flow
- Modes:
  - `flat` line/text
  - `texture` line/text (gold/silver)

## Original Problems
- Texture-enabled exports caused very high resource usage when attempted in local/browser-heavy paths.
- Preview vs export behavior diverged.
- Download output occasionally showed visual artifacts (tile seam striping).
- Need to keep checkout/export stable in Vercel production.

## Final Architecture
- Live preview on designer page stays `flat` for stability.
- Texture rendering is applied during export on server worker (Fly.io).
- Vercel app calls Fly worker endpoint for heavy render/composite operations.
- If texture worker path fails, system can fallback to flat export path.

## Implemented Changes

### 1) Texture Composite Pipeline (Worker)
- Endpoint: `app/api/render-export/route.ts`
- Flow:
  1. Render `baseSvg` (flat poster)
  2. Render `maskSvg` (ink-only white mask)
  3. Process texture image (contrast/brightness/saturation/sharpen)
  4. Apply mask (`dest-in`)
  5. Blend masked texture onto base
- Added response telemetry headers:
  - `X-Render-Peak-Rss-Mb`
  - `X-Render-Time-Ms`
  - `X-Render-Rss-Trace`

### 2) Export Orchestration via Fly Worker
- Endpoint: `app/api/redeem-coupon/route.ts`
- Added remote render call to Fly worker with shared secret.
- Sends composite payload (`baseSvg`, `maskSvg`, `textureBase64`) for texture exports.
- Keeps order/coupon flow in server path.

### 3) Visual Artifact Fix (Seam)
- Removed repeat tiling approach for texture canvas.
- Current method uses single processed texture scaled to output, then masked/blended.
- Eliminated central dark seam artifact seen in texture output.

### 4) UI/Flow Updates
- `ourskymap` editor has explicit `Ink Finish` selector: `Flat | Texture`.
- Checkout confirm popup now displays selected `Ink Finish`.
- Added temporary developer test toggle in checkout for flat exports:
  - `Developer Test: Flat Export Engine`
  - `Server` (normal coupon/order flow)
  - `Browser (Test)` (client-side test download; does not redeem coupon)

## Fly.io App
- App name: `space-map-render-worker`
- Host: `space-map-render-worker.fly.dev`
- Deployment model: Machines
- Render endpoint: `/api/render-export`
- Auth: `RENDER_SHARED_SECRET` header (`x-render-secret`)

## Environment Variables

### Vercel-side relevant
- `FLY_RENDER_URL`
- `RENDER_SHARED_SECRET`
- `FLY_RENDER_TIMEOUT_MS`
- `EXPORT_TEXTURE_MAX_DIM`
- `EXPORT_TEXTURE_JPEG_QUALITY`

### Fly worker-side relevant
- `EXPORT_MAX_PIXELS`
- `EXPORT_TEXTURE_MAX_PIXELS`
- `EXPORT_TEXTURE_TILE_SCALE`
- `EXPORT_TEXTURE_CONTRAST`
- `EXPORT_TEXTURE_BRIGHTNESS`
- `EXPORT_TEXTURE_SATURATION`
- `EXPORT_TEXTURE_SHARPEN_SIGMA`
- `EXPORT_TEXTURE_BLEND`

## Texture Asset Cleanup (Done)
Active textures in use:
- `public/textures/gold_texture_2500.jpg`
- `public/textures/silver_texture_2500.jpg`

Unused texture variants were moved to local archive:
- `archive/textures/2026-02-16/`

Archive is excluded from git by `.gitignore`.

## Current Operational Notes
- Preview remains flat to protect browser performance.
- Texture is generated during export path on Fly worker.
- Browser full texture export is not default and should not be used for production heavy sizes.
- Temporary checkout browser-export toggle is for developer testing only.

## Next Cleanup Suggestion
- Gate/hide developer test toggle with an env flag before production hardening.
