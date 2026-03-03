# Template Picker for Image Studio — Design

**Date:** 2026-02-19
**Branch:** feature/image-endpoint-tshirt-studio

## Goal

Allow customers to pick a predefined design template (background image + fixed slot positions) from inside the Image Studio. Extracted people are auto-placed into template slots in order. Existing free-form flow is unchanged.

## Architecture

### New file: `lib/templates.ts`

Static TypeScript module exporting all available templates. No database or API needed — adding a template means editing this file and dropping assets in `/public/templates/`.

```ts
export type TemplateSlot = {
  index: number;       // slot order: 0 = center, 1 = #1, 2 = #2 …
  x: number;           // canvas x (0–620)
  y: number;           // canvas y (0–780)
  scale: number;       // initial scale e.g. 0.8
  zIndex: number;      // stacking order
};

export type DesignTemplate = {
  id: string;
  name: string;
  thumbnail: string;   // /public/templates/<file>
  backgroundUrl: string;
  slots: TemplateSlot[];
};

export const DESIGN_TEMPLATES: DesignTemplate[] = [
  // populated with real templates as assets become available
];
```

### New folder: `/public/templates/`

Stores template background images and thumbnails (JPEG/PNG). Served statically.

### Modified file: `app/image/page.tsx`

#### New state
```ts
const [activeTemplate, setActiveTemplate] = useState<DesignTemplate | null>(null);
const [templateModalOpen, setTemplateModalOpen] = useState(false);
```

#### UI additions

1. **"Use a Template" button** — secondary ghost button in the Upload Photos `panelBlock`, below the "Add Photos" button.
2. **Template picker modal** — full-screen overlay, dark semi-transparent backdrop, grid of template cards (thumbnail + name). Clicking a card: sets `backgroundImageUrl` to template background, sets `activeTemplate`, closes modal.
3. **"Template active" badge** — dismissible pill in the Upload Photos card showing the active template name with a ✕ to clear (`setActiveTemplate(null)`, clears `backgroundImageUrl`).

#### Auto-placement hook

After `processSelections()` creates `newLayers`, if `activeTemplate` is non-null, iterate the new layers and apply slot positions in order:

```ts
if (activeTemplate) {
  newLayers.forEach((layer, i) => {
    const slot = activeTemplate.slots[i];
    if (slot) {
      layer.x = slot.x;
      layer.y = slot.y;
      layer.scale = slot.scale;
      // zIndex handled by layer stack position
    }
    // no slot → default grid position (existing behaviour)
  });
}
```

#### Clear template on background removal

When "Remove Background Image" is clicked, also call `setActiveTemplate(null)`.

## Files touched

| File | Change |
|---|---|
| `lib/templates.ts` | **Create** — template type + data array |
| `public/templates/` | **Create folder** — placeholder for assets |
| `app/image/page.tsx` | **Modify** — new state, modal JSX, button, auto-placement logic |

## What doesn't change

- Upload Photos, Frame People, Extract + Arrange flows
- Manual drag / rotate / zoom / mirror on layers
- Free-form mode (no template selected)
- All existing CSS classes and layout

## Out of scope

- Fetching template assets from a CDN or CMS
- Per-template text layer presets
- Admin UI for managing templates
