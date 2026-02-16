# OurSkyMap Label and MoonPhase Update - 2026-02-16

## 1) Scope
This note documents the OurSkyMap rendering updates completed on February 16, 2026.
It covers:
- Sky label collision/readability improvements.
- Moon companion phase rendering evaluation and implemented solution.
- Silver moon asset routing and fallback behavior.
- Practical tuning guidance for future developers.

Related code files:
- `lib/geometry.ts`
- `lib/poster.ts`
- `app/ourskymap/page.tsx`
- `lib/types.ts`

Related commit already pushed:
- `7a1d280` (`Improve skymap label placement and readability`)

## 2) Label Rendering Changes (Sky Map)

### 2.1 Smart label placement
A new label placement strategy was introduced to reduce overlap.

Key additions:
- `RenderParams` now includes:
  - `labelPlacementStrategy` (`none | smart`)
  - `labelCollisionPadding`
  - `labelMaxShift`
  - `maxConstellationLabels`
  - `maxStarLabels`

Implementation summary:
- Candidate labels are generated with priority.
- Multiple offsets are tested around each anchor.
- First non-overlapping valid position is selected.
- If no valid position is found, the label is skipped.

### 2.2 Constellation anchor refinement
Constellation label anchors are no longer pure centroid-only.
If centroid falls into sparse area, anchor is pulled toward nearest star cluster.
This reduces cases where a constellation label appears visually detached.

### 2.3 Obstacle-aware placement
Labels now avoid important bodies:
- Planets, Sun, Moon (highest priority obstacles)
- Large stars
- Large emphasized vertex points

Tuning constants are intentionally grouped at top of `lib/geometry.ts` under:
- `LABEL OBSTACLE TUNING (OurSkyMap)`

Current values:
- `BIG_STAR_OBSTACLE_MIN_R = 1.7`
- `BIG_VERTEX_OBSTACLE_MIN_R = 3.0`
- `STAR_OBSTACLE_PAD = 1.4`
- `PLANET_OBSTACLE_PAD = 3.2`

The same block also contains `Initial/Optimal` reference values for quick rollback.

### 2.4 Label readability layering
Map labels were given halo stroke (`paint-order="stroke"`) in poster rendering so text remains readable over lines/stars.

## 3) Moon Phase Problem Evaluation

Observed product issue:
- Moon dark side looked too light for many phases.
- Visual behavior did not vary enough across dates/years.

Astronomy reality:
- Moon phase is not tied to calendar day number.
- Same day in different months/years can have different phase.
- Synodic cycle is about 29.53 days.

Old rendering behavior (before this update):
- A simple branch around low illumination was used.
- Effective result was close to a 2-profile model (low vs non-low) for shadow tuning.
- This was too coarse for product expectations.

## 4) Implemented Moon Companion Solution

### 4.1 30-bucket phase quantization
A deterministic 30-step phase model is now used.

Core idea:
- `phaseStep = 360 / 30 = 12 deg`
- `phaseIndex = floor((normalizedPhase + 6) / 12) % 30`

Output:
- Stable `phaseIndex`
- Quantized phase angle
- Reduced phase angle (`0..180`)
- Waxing/waning direction

### 4.2 Phase-driven visual profile
Shadow profile is now computed from phase-derived illumination:
- `illumination = 0.5 * (1 - cos(phaseDeg))`
- `darkness = 1 - illumination`

Then these values are derived dynamically:
- `backdropOpacity`
- `baseTextureOpacity`
- `shadowLinearOpacity`
- `shadeRadialOpacity`
- `blurScale`

Important design choice:
- `baseTextureOpacity` now decreases as darkness increases, so dark hemisphere becomes meaningfully darker.

### 4.3 Stronger dark-side tuning
To match stronger art direction, additional hardening was applied:
- `shadowLinearOpacity` max increased to `0.58`.
- Radial gradient terminal stop increased to `0.70`.
- Linear/radial gradient stop values were strengthened.

Result:
- More pronounced dark hemisphere.
- Better half/gibbous contrast.

## 5) Silver Moon Image Routing + Fallback

### 5.1 Ink-aware moon image selection
In `app/ourskymap/page.tsx`:
- If selected ink is silver, request uses `moonPhaseImageUrl = '/moon_silver.png'`.
- Otherwise it uses `'/moon.png'`.

### 5.2 Safe fallback if silver asset is missing
In `lib/poster.ts`:
- A helper resolves preferred public asset path.
- If preferred file is missing, renderer falls back to `'/moon.png'`.

So missing `public/moon_silver.png` no longer breaks rendering.

## 6) NASA Data Option (Evaluation)

Possible source:
- NASA SVS Dial-A-Moon API (hourly lunar imagery/metadata endpoint).

Feasibility:
- Technically possible to fetch by datetime and use NASA frame/texture.

Tradeoffs:
- External dependency (availability, latency, rate limiting).
- Date range/coverage constraints.
- More moving parts in render/export flow.

Recommended architecture (if pursued):
- Keep current local deterministic model as primary.
- Add optional NASA-assisted mode with server-side cache.
- Fallback to local model on network/API issues.

## 7) Practical Tuning Guide

If moon dark side is still too light:
1. Increase `shadowLinearOpacity` upper clamp.
2. Increase radial gradient final stop opacity.
3. Decrease `baseTextureOpacity` lower/curve for darker phases.

If label placement feels too aggressive:
1. Increase `BIG_STAR_OBSTACLE_MIN_R` or `BIG_VERTEX_OBSTACLE_MIN_R`.
2. Decrease `PLANET_OBSTACLE_PAD` only if needed.
3. Reduce `labelCollisionPadding` and/or increase `labelMaxShift`.

## 8) Next Action Items
- Add `public/moon_silver.png` when design asset is ready.
- Optional: expose moon shadow tuning as admin-only config.
- Optional: add image regression tests for moon companion at representative phases.
