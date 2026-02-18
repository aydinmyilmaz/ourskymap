# Companion Mode Rework — Design Document

**Date:** 2025-02-18
**Branch:** `skymap-companion-rework` (from `skymap-font-chart-scale`)
**Status:** Approved

---

## Problem

Currently, companion mode is implemented as two special hardcoded sizes (`moon-phase`, `sky-photo`), each locked to a 24×18" canvas. Users cannot choose any other poster size for companion mode. This also makes the architecture fragile: adding new sizes doesn't automatically give them companion support.

---

## Goal

- Allow ALL standard poster sizes to work in companion mode
- When a portrait size (H > W) is used in companion mode, swap W↔H so the long edge is horizontal — two circles fit better side by side
- Make the companion type system extensible for future types (image companions, etc.)
- UI labels are user-facing only — internal code keeps `companion`/`moon-phase`/`sky-photo` terminology

---

## UI Changes

### Poster Type Selector (sidebar top)

Replace the current `<select>` with two prominent buttons:

```
[ Standard Star Map         ]   ← button, selectable
[ Star Map with Moon Phase  ]   ← button, selectable
```

When "Standard Star Map" is active → show `SINGLE_SIZE_PRESETS` in size dropdown
When "Star Map with Moon Phase" is active → show all standard sizes (same list), companion subtype selector appears below

### Companion Subtype Selector (appears when companion active)

```
Companion Type: [ Moon Phase ▼ ]   (future: Photo, etc.)
```

This maps to `showMoonPhase` / `showCompanionPhoto` flags in `PosterParams`.

### Size Dropdown (companion mode)

Shows ALL standard sizes. Label indicates landscape canvas where applicable:
```
16 x 20  →  rendered as  20 x 16  (landscape)
18 x 24  →  rendered as  24 x 18  (landscape)
12 x 12  →  12 x 12  (square, no change)
```

---

## Architecture Changes

### `DesignSize` type (`lib/types.ts` + `app/ourskymap/page.tsx`)

**Remove:** `'moon-phase'`, `'sky-photo'`
**All companion mode** uses regular sizes (`'16x20'`, `'18x24'`, etc.) + `showMoonPhase` / `showCompanionPhoto` flags.

### `SIZE_PRESETS` (`app/ourskymap/page.tsx`)

**Remove:** `moon-phase` and `sky-photo` entries
`COMPANION_SIZE_PRESETS` → same as `SINGLE_SIZE_PRESETS` (all standard sizes)
`DEFAULT_COMPANION_SIZE` → `'16x20'`

### Canvas Landscape Swap (`lib/poster.ts`)

When `showCompanionCircle === true` and `H > W`:
```typescript
// Swap W and H for landscape companion layout
const [W, H] = showCompanionCircle && originalH > originalW
  ? [originalH, originalW]
  : [originalW, originalH];
```

This ensures that portrait sizes (11×14, 16×20, 18×24) render on landscape canvas in companion mode, giving the two circles maximum horizontal space.

Square sizes (12×12, 20×20) are unchanged.

### `getPosterLayout()` (`lib/poster.ts`)

Returns original portrait dimensions. The swap happens **after** `getPosterLayout()` is called, inside the main render function.

### `defaultPosterBySize` (`app/ourskymap/page.tsx`)

**Remove:** `moon-phase` and `sky-photo` entries.
Their styling (fonts, ring widths, etc.) was already identical to `16x20` — these are now covered by the standard entries.

---

## Extensibility

New companion types can be added by:
1. Adding a new boolean flag to `PosterParams` (`showCompanionX?: boolean`)
2. Adding a new option to the companion subtype selector UI
3. Handling the new flag in `poster.ts` rendering

No new `DesignSize` entries needed for new companion types.

---

## Sizing Formulas in Companion Mode

The existing `poster-layout-spec` formulas apply to the **landscape canvas**:
- Font: `H_px/1440 × ref` — uses the (swapped) landscape H
- Chart: `W_inches/16 × 12.8"` — uses the (swapped) landscape W
- Ring: `W_px/1152 × ref` — uses the (swapped) landscape W

For `16x20` companion: canvas becomes `20×16` → `W=1440, H=1152` → fonts/chart scale from these.

**Note:** `page.tsx` defaults (`defaultPosterBySize`) use the original portrait size key. The layout engine receives those defaults and then applies the landscape swap. So `defaultPosterBySize['16x20']` is used for both single and companion 16×20.

---

## Files to Change

| File | Change |
|------|--------|
| `lib/types.ts` | Remove `moon-phase`, `sky-photo` from `PosterParams.size` union |
| `lib/poster.ts` | Add W↔H landscape swap when companion + portrait |
| `app/ourskymap/page.tsx` | Remove companion size entries, add 2-button selector, add subtype selector |

---

## Out of Scope

- Multi-companion (3+ circles) — future feature
- Per-size companion defaults (fonts/rings already scale from size key)
- Photo companion UI changes beyond subtype selector
