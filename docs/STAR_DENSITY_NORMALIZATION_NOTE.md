# Star Density Normalization Note

## Problem

Even when `RenderParams` are identical, star density can look different across poster sizes/layouts.

## Why this happens

`RenderParams` control astronomical filtering and drawing behavior, but final perceived density is also affected by poster geometry and scaling.

Main factors:
- Different `chartDiameter` per size preset
- Different page margins and text region allocations
- Different chart center/radius placement for special layouts (especially moon-phase)
- Same star set rendered into different visual area, causing denser/sparser perception

In short: same sky data + same render params, but different viewport and scale mapping.

## Current technical location

- UI params: `app/ourskymap/page.tsx`
- Poster geometry and scale mapping: `lib/poster.ts`

## Future options

1. Size-based compensation (quick)
- Apply small per-size adjustments to:
  - `magnitudeLimit`
  - `starSizeGamma`
  - `starAlpha`

2. Normalized density coefficient (recommended)
- Compute a density normalization factor from effective chart area.
- Apply that factor before drawing stars so perceived density remains consistent across sizes.

3. Advanced calibration (optional)
- Build a visual calibration table from A/B snapshots for each size and palette.
- Lock per-size correction constants from that calibration.

## Recommendation

Use option 2 as default strategy, and keep option 1 as a temporary fallback during tuning.
