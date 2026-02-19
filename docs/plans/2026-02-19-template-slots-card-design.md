# Template Slots Card — Design Doc

**Date:** 2026-02-19
**Status:** Approved

---

## Goal

Replace the Frame People workflow for template users. When a template is active, a "Template Slots" card appears in the sidebar. Each slot has its own upload button. Uploading a photo immediately triggers background removal (reusing the existing Replicate pipeline) and places the extracted person into that slot's canvas position. Full drag/zoom/rotate/flip remains available on the canvas.

---

## Architecture

### Files touched

| File | Change |
|------|--------|
| `lib/templates.ts` | Add `textSlots` array to `DesignTemplate`; update sample template |
| `app/image/page.tsx` | Template Slots card JSX + upload handler + text pre-population + clear logic |

No new dependencies. No new files beyond the design doc and plan.

---

## Data Model Changes

### `lib/templates.ts`

Add `TextSlot` type and `textSlots` field:

```ts
export type TextSlot = {
  index: number;       // 0-based; maps to the Nth pre-created text layer
  x: number;
  y: number;
  fontSize: number;
  styleKey: TextStyleKey;  // imported from page.tsx — move to templates.ts or duplicate literals
  color: string;
  text: string;        // default text content
};

export type DesignTemplate = {
  id: string;
  name: string;
  thumbnail: string;
  backgroundUrl: string;
  slots: TemplateSlot[];
  textSlots: TextSlot[];  // NEW
};
```

`TextStyleKey` is defined in `page.tsx`. To avoid a circular import, duplicate the union type literal in `templates.ts`:
```ts
export type TextStyleKey = 'varsity' | 'impact' | 'elegant' | 'script' | 'classic' | 'chrome-3d' | 'emboss-3d' | 'neon-script';
```

### Sample template `custom-lightning-5` text slots

```ts
textSlots: [
  { index: 0, x: 310, y: 80,  fontSize: 96, styleKey: 'chrome-3d', color: '#ff6ec7', text: 'CUSTOM' },
  { index: 1, x: 310, y: 720, fontSize: 36, styleKey: 'varsity',   color: '#ffffff', text: 'Your Text Here' },
],
```

---

## Sidebar Card — Template Slots

### Visibility

Rendered only when `activeTemplate !== null`, inserted **after** the Upload Photos card and **before** the Frame People card.

### Card structure

```
┌─────────────────────────────────┐
│ Template Slots          0 / 5   │
├─────────────────────────────────┤
│ [CENTER]  [Choose File]  ○      │
│ [#1]      [Choose File]  ○      │
│ [#2]      [Choose File]  ○      │
│ [#3]      [Choose File]  ○      │
│ [#4]      [Choose File]  ○      │
│                  [Clear All]    │
└─────────────────────────────────┘
```

Slot labels: index 0 → "Center", index 1–N → `#N`.

Status icons:
- `○` empty (gray)
- spinner — processing
- `✓` filled (green) + 32×32 thumbnail

### State

```ts
// Per-slot processing state
const [slotStates, setSlotStates] = useState<Record<number, 'idle' | 'processing' | 'done'>>({});
// Map slotIndex → layerId so we can replace on re-upload
const [slotLayerIds, setSlotLayerIds] = useState<Record<number, string>>({});
```

---

## Upload → Extract → Place Flow

1. User picks a file for slot `i`
2. Call the existing single-photo upload handler (reuse `uploadPhoto` logic to get a photo object)
3. Create a full-canvas selection rect (entire image = one person) for that photo
4. Call the existing `processSelections` extraction logic for that single selection
5. On success, override `x/y/scale` from `activeTemplate.slots[i]`; apply `zIndex` from slot
6. If slot `i` already had a layer (re-upload), remove the old layer first
7. Update `slotStates[i] = 'done'` and `slotLayerIds[i] = newLayer.id`

"Full-canvas selection rect" means `{ x: 0, y: 0, width: 1, height: 1 }` in relative coords — exactly one selection covering the whole photo, so the extracted person is the whole subject.

---

## Text Pre-population

When `setActiveTemplate(template)` is called (user picks a template):
- Create `TextLayer` objects from `template.textSlots`
- Append them to `textLayers` state
- These are fully editable via the existing Text Designer card

When template is cleared (✕ badge or Remove Background Image):
- Remove only the text layers that were created by the template (tracked by ID)
- Remove all slot person layers (tracked via `slotLayerIds`)
- Reset `slotStates` and `slotLayerIds`

---

## Canvas Behaviour

- Background: `backgroundImageUrl` set from `template.backgroundUrl` (already implemented)
- Person layers: standard `PersonLayer` objects — drag, pinch-zoom, rotate, flip all work unchanged
- Text layers: standard `TextLayer` objects — drag, edit, style all work unchanged
- `zIndex` from slot applied at layer creation

---

## Clear Logic

Clearing a template removes:
1. All layers in `slotLayerIds` values
2. All text layers created from `textSlots` (tracked by IDs stored at activation time)
3. `backgroundImageUrl` set to `''`
4. `activeTemplate` set to `null`
5. `slotStates` and `slotLayerIds` reset to `{}`

---

## CSS

New classes needed (added to the `<style jsx>` block):
- `.templateSlotsCard` — grid layout for slot rows
- `.slotRow` — flex row: label + button + status
- `.slotLabel` — fixed-width label chip
- `.slotStatus` — status icon area (spinner / checkmark / empty dot)
- `.slotThumb` — 32×32 thumbnail
- `.slotSpinner` — CSS keyframe spinner (reuse existing spinner pattern if any)

---

## Out of Scope

- Template thumbnail images (`.gitkeep` placeholder already committed; real assets added later)
- More than one template (data-driven, adding templates is just adding entries to `DESIGN_TEMPLATES`)
- Mobile-specific layout changes
