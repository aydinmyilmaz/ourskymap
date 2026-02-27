# Image Studio Technical Documentation

This document describes the `image` endpoint so development can continue quickly later with clear onboarding.

Related docs:
- `docs/IMAGE_TEXT_CURVE_TECHNICAL_2026-02-27.md`

## 1. Scope and Routes

### UI Route
- `app/image/page.tsx`
- Client-side poster designer for:
  - Uploading source photos
  - Framing people (selection rectangles)
  - Background removal + extraction
  - Layer arrangement (z-order)
  - Text styling and placement
  - Poster background color/image setup

### API Route
- `app/api/image/remove-bg/route.ts`
- Server-side adapter for Replicate background removal model.

## 2. Environment Requirements

Required server variable:
- `REPLICATE_API_TOKEN`

Configured model:
- `851-labs/background-remover:a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc`

If token is missing, API returns `500` with clear message.

## 3. Core Limits (Current Product Rules)

Defined in `app/image/page.tsx`:
- Max upload photos: `5`
- Max total selected/placed people: `8`
- Max text layers: `5`
- Min selection size: `0.04` (normalized canvas ratio)
- Poster canvas: `620 x 780`

## 4. End-to-End User Flow

1. User uploads up to 5 images (`Upload Photos`).
2. User draws person frames on active photo (`Frame People`).
3. User clicks `Extract Selected People`.
4. For each pending selection:
   - Crop selection on client canvas as `imageDataUrl`
   - Send to `/api/image/remove-bg`
   - Receive transparent PNG URL from Replicate output
   - Add as draggable person layer on poster
5. User arranges layers, adjusts scale/rotation/crop.
6. User adds up to 5 text layers, selects style/color/size/rotation, drags text.
7. User customizes background color/image.
8. Checkout button is UI placeholder for next integration step.

## 5. API Contract (`/api/image/remove-bg`)

### Request JSON
At least one is required:
- `imageDataUrl` (preferred in current flow)
- `imageUrl`

Example:
```json
{
  "imageDataUrl": "data:image/png;base64,..."
}
```

### Validation
- `imageDataUrl` must match base64 image data URL format.
- `imageDataUrl` max length: `15_000_000` characters.
- `imageUrl` must be `http`/`https`.

### Response JSON
```json
{
  "imageUrl": "https://replicate.delivery/..."
}
```

### Error behavior
- `400`: input validation errors
- `500`: missing token or unexpected failures
- `502`: Replicate output URL not resolvable

## 6. Frontend Data Model

### UploadedPhoto
- Image metadata + per-photo `selections[]`

### SelectionRect
- Normalized rectangle (`x,y,w,h`)
- Status machine:
  - `pending`
  - `processing`
  - `done`
  - `error`

### PersonLayer
- Extracted transparent image on poster
- Position + transform + crop fields:
  - `scale`, `rotationDeg`
  - `cropTopPct`, `cropLeftPct`, `cropRightPct`

### TextLayer
- Text content and visual controls:
  - `styleKey`, `color`, `fontSize`, `rotationDeg`, position

## 7. Interaction and Layer Logic

### Selection interactions
- Draw on empty area
- Move/resize pending/error selections
- `done` and `processing` selections are locked

### Anti-double-frame stabilization
- Draft selection is tracked with `draftRef`
- Selection append is finalized once on pointer-up

### Anti-duplicate processing safeguard
- Batch key (`photoId:selectionId`) is generated
- Same batch retrigger is blocked for ~2.5 seconds
- Prevents accidental immediate re-processing of unchanged selections

### Z-order controls
Person layers support:
- `To Front`
- `To Back`
- `Forward`
- `Backward`

## 8. Text System (Current)

- Up to 5 text layers
- Drag on poster
- Rotation: `0..360`
- Font styles include classic + 3D-like presets:
  - `varsity`, `impact`, `elegant`, `script`, `classic`
  - `chrome-3d`, `emboss-3d`, `neon-script`
- Font presets shown visually in cards
- Text color panel mirrors background color UX:
  - Explore/Compact
  - swatches
  - HEX input + Apply

## 9. Background System (Current)

- Preset swatches (15 colors)
- Explore/Compact view
- Color picker + HEX input + Apply
- Optional background image upload/remove
- If background image exists, it visually overrides plain color

## 10. Layout and UX Structure

- Main page fixed to viewport (`100vh`), no body-level scroll
- Left: poster preview area
- Right: wider sidebar (controls), scrollable independently
- Footer area in sidebar contains `Checkout`

## 11. File Map (Where to Work)

Primary files for this feature:
- `app/image/page.tsx`
- `app/api/image/remove-bg/route.ts`
- `docs/IMAGE_STUDIO_TECHNICAL.md` (this doc)

Rule for this module:
- Keep changes isolated to Image Studio files unless explicitly requested.

## 12. Current Gaps / Next Steps

1. Checkout integration is placeholder only.
2. Optional future: richer text effects (stroke/gradient/warp).
3. Optional future: export pipeline (PNG/PDF with print-safe DPI).
4. Optional future: persistent saves (drafts per user/order).

## 13. Quick Restart Checklist

When resuming development:
1. Confirm branch: `feature/image-processing`
2. Verify env: `REPLICATE_API_TOKEN` present
3. Run:
   - `npm install`
   - `npm run dev`
4. Open: `http://localhost:3000/image`
5. Smoke test:
   - Upload 1-2 photos
   - Draw selections
   - Extract people
   - Move/scale/rotate/crop person layer
   - Add text layer and test style/color/rotation
   - Change background color/image
