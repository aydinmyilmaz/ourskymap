# Moon Visual Settings

Reference for the moon phase rendering pipeline in `lib/poster.ts`.

## Rendering Layers (bottom to top)

1. **Backdrop circle** — solid black circle behind the moon image
   - `moonBackdropOpacity = 0.97` (fixed)

2. **Base texture** — moon image at reduced opacity (shows surface detail everywhere)
   - opacity = `moonVisual.baseTextureOpacity`

3. **Lit mask layer** — moon image at full opacity, masked to only the illuminated area
   - Uses `moonLitMask` (SVG `<mask>`) with the illuminated path

4. **Shadow linear gradient** — darkens the shadow side with a directional gradient
   - opacity = `moonVisual.shadowLinearOpacity`
   - Blurred with `moonSoftBlurSigma`

5. **Shade radial gradient** — subtle depth/curvature shading
   - opacity = `moonVisual.shadeRadialOpacity`

## Terminator Softness

The boundary between the lit and dark sides (terminator) is softened with a Gaussian blur filter applied inside the SVG mask:

```
moonTerminatorBlur stdDeviation = moonR * 0.025
```

This creates a gradual transition instead of a hard edge. Increase the multiplier for softer transitions, decrease for sharper.

## Shadow Blur

The linear shadow overlay is blurred to avoid hard edges:

```
moonSoftBlurSigma = max(1.5, moonR * 0.018 * blurScale)
```

## Moon Image Oversize

Moon images are rendered at 103% of the clip radius (`moonR * 1.03`) to hide any PNG background artifacts at the edges.

## Phase-Dependent Visual Profile

`buildMoonVisualProfile(phaseDeg)` computes per-phase values based on `darkness = 1 - illumination`:

| Parameter            | Formula                              | Min   | Max   |
|----------------------|--------------------------------------|-------|-------|
| `backdropOpacity`    | `0.28 + darkness * 0.42`             | 0.26  | 0.72  |
| `baseTextureOpacity` | `0.52 - darkness * 0.34`             | 0.16  | 0.56  |
| `shadowLinearOpacity`| `0.22 + darkness * 0.48`             | 0.22  | 0.72  |
| `shadeRadialOpacity` | `0.18 + darkness * 0.38`             | 0.18  | 0.58  |
| `blurScale`          | `1.0 + darkness * 0.80`              | 0.90  | 1.80  |

Note: These profile values are used when `showMoonPhase` is true. When false (companion photo mode), hardcoded defaults are used.

## Moon Image Assets

- `public/moon_gold.png` — default (gold ink preset)
- `public/moon_silver.png` — silver ink preset

Selected via `poster.inkPreset` field (`'gold'` | `'silver'`).

## Fixed Overrides (applied after profile)

| Setting              | Value  | Note                                    |
|----------------------|--------|-----------------------------------------|
| `moonBackdropOpacity`| 0.97   | Always near-opaque black behind moon    |

## Key Constants

- Terminator blur: `moonR * 0.025`
- Image oversize: `moonR * 1.03`
- Shadow blur base: `moonR * 0.018`
