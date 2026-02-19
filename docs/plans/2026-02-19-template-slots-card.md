# Template Slots Card Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When a template is active, show a "Template Slots" sidebar card where uploading a photo auto-runs background removal and places the extracted person directly into that slot's canvas position — no box-drawing needed.

**Architecture:** Add `textSlots` to `DesignTemplate` in `lib/templates.ts`. Add two new state variables (`slotStates`, `slotLayerIds`) and a new `handleSlotUpload` function to `app/image/page.tsx`. Insert a new "Template Slots" `panelBlock` card between the Upload Photos and Frame People cards. Pre-populate text layers when a template activates. Expand the clear-template logic to also remove slot layers and template text layers. Add CSS for the slot rows and a spinner animation.

**Tech Stack:** Next.js 14 App Router, TypeScript, React 18, styled-jsx, no new dependencies

---

### Task 1: Add `textSlots` to `lib/templates.ts`

**Files:**
- Modify: `lib/templates.ts`

**Step 1: Add `TextStyleKey` and `TextSlot` types, and `textSlots` field**

Replace the entire file with:

```ts
export type TemplateSlot = {
  index: number;
  x: number;
  y: number;
  scale: number;
  zIndex: number;
};

export type TextStyleKey =
  | 'varsity'
  | 'impact'
  | 'elegant'
  | 'script'
  | 'classic'
  | 'chrome-3d'
  | 'emboss-3d'
  | 'neon-script';

export type TextSlot = {
  index: number;
  x: number;
  y: number;
  fontSize: number;
  styleKey: TextStyleKey;
  color: string;
  text: string;
};

export type DesignTemplate = {
  id: string;
  name: string;
  thumbnail: string;
  backgroundUrl: string;
  slots: TemplateSlot[];
  textSlots: TextSlot[];
};

// Add new templates here. Assets go in /public/templates/.
export const DESIGN_TEMPLATES: DesignTemplate[] = [
  {
    id: 'custom-lightning-5',
    name: 'Custom Lightning (5-person)',
    thumbnail: '/templates/custom-lightning-thumb.jpg',
    backgroundUrl: '/templates/custom-lightning-bg.jpg',
    slots: [
      { index: 0, x: 310, y: 480, scale: 1.0, zIndex: 5 },
      { index: 1, x: 150, y: 390, scale: 0.75, zIndex: 4 },
      { index: 2, x: 470, y: 390, scale: 0.75, zIndex: 3 },
      { index: 3, x: 120, y: 580, scale: 0.65, zIndex: 2 },
      { index: 4, x: 500, y: 580, scale: 0.65, zIndex: 1 },
    ],
    textSlots: [
      { index: 0, x: 310, y: 80,  fontSize: 96, styleKey: 'chrome-3d', color: '#ff6ec7', text: 'CUSTOM' },
      { index: 1, x: 310, y: 720, fontSize: 36, styleKey: 'varsity',   color: '#ffffff', text: 'Your Text Here' },
    ],
  },
];
```

**Step 2: Verify TypeScript**

```bash
cd /Users/aydin/Desktop/apps/space_map && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

**Step 3: Commit**

```bash
cd /Users/aydin/Desktop/apps/space_map && git add lib/templates.ts && git commit -m "feat: add TextSlot type and textSlots to DesignTemplate"
```

---

### Task 2: Add slot state variables and update imports in `app/image/page.tsx`

**Files:**
- Modify: `app/image/page.tsx`

**Step 1: Expand the template import to also bring in `TextSlot`**

Find:
```ts
import { DESIGN_TEMPLATES } from '../../lib/templates';
import type { DesignTemplate } from '../../lib/templates';
```

Replace with:
```ts
import { DESIGN_TEMPLATES } from '../../lib/templates';
import type { DesignTemplate, TextSlot } from '../../lib/templates';
```

**Step 2: Add two new state variables after the existing template state**

Find:
```ts
  const [activeTemplate, setActiveTemplate] = useState<DesignTemplate | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
```

Add directly after:
```ts
  const [slotStates, setSlotStates] = useState<Record<number, 'idle' | 'processing' | 'done'>>({});
  const [slotLayerIds, setSlotLayerIds] = useState<Record<number, string>>({});
  const [templateTextIds, setTemplateTextIds] = useState<string[]>([]);
```

**Step 3: Verify TypeScript**

```bash
cd /Users/aydin/Desktop/apps/space_map && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors. (The `TextSlot` import is unused for now — that's fine, TypeScript won't error on an unused type import with `skipLibCheck: true` and `isolatedModules`.)

**Step 4: Commit**

```bash
cd /Users/aydin/Desktop/apps/space_map && git add app/image/page.tsx && git commit -m "feat: add slotStates, slotLayerIds, templateTextIds state"
```

---

### Task 3: Pre-populate text layers when template activates, and expand clear logic

**Files:**
- Modify: `app/image/page.tsx`

**Step 1: Update the template picker modal's onClick to also pre-create text layers**

Find (in the template picker modal JSX):
```tsx
                    onClick={() => {
                      setActiveTemplate(template);
                      setBackgroundImageUrl(template.backgroundUrl);
                      setTemplateModalOpen(false);
                    }}
```

Replace with:
```tsx
                    onClick={() => {
                      setActiveTemplate(template);
                      setBackgroundImageUrl(template.backgroundUrl);
                      setTemplateModalOpen(false);
                      // Pre-populate text layers from template textSlots
                      const newTextLayers = template.textSlots.map((slot) => ({
                        id: createId('text'),
                        text: slot.text,
                        x: slot.x,
                        y: slot.y,
                        fontSize: slot.fontSize,
                        rotationDeg: 0,
                        color: slot.color,
                        styleKey: slot.styleKey as TextStyleKey,
                      }));
                      setTextLayers((prev) => [...prev, ...newTextLayers]);
                      setTemplateTextIds(newTextLayers.map((l) => l.id));
                      setSlotStates({});
                      setSlotLayerIds({});
                    }}
```

Note: `TextStyleKey` is already defined locally in `page.tsx` at lines 19-27. The cast `as TextStyleKey` is needed because templates.ts has its own copy of the type.

**Step 2: Expand the badge ✕ clear logic**

Find:
```tsx
                    onClick={() => {
                      setActiveTemplate(null);
                      setBackgroundImageUrl('');
                    }}
```

Replace with:
```tsx
                    onClick={() => {
                      setActiveTemplate(null);
                      setBackgroundImageUrl('');
                      setLayers((prev) => prev.filter((l) => !Object.values(slotLayerIds).includes(l.id)));
                      setTextLayers((prev) => prev.filter((l) => !templateTextIds.includes(l.id)));
                      setSlotStates({});
                      setSlotLayerIds({});
                      setTemplateTextIds([]);
                    }}
```

**Step 3: Expand the "Remove Background Image" button clear logic**

Find:
```tsx
                    onClick={() => { setBackgroundImageUrl(''); setActiveTemplate(null); }}
```

Replace with:
```tsx
                    onClick={() => {
                      setBackgroundImageUrl('');
                      setActiveTemplate(null);
                      setLayers((prev) => prev.filter((l) => !Object.values(slotLayerIds).includes(l.id)));
                      setTextLayers((prev) => prev.filter((l) => !templateTextIds.includes(l.id)));
                      setSlotStates({});
                      setSlotLayerIds({});
                      setTemplateTextIds([]);
                    }}
```

**Step 4: Verify TypeScript**

```bash
cd /Users/aydin/Desktop/apps/space_map && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

**Step 5: Commit**

```bash
cd /Users/aydin/Desktop/apps/space_map && git add app/image/page.tsx && git commit -m "feat: pre-populate text layers on template activate; expand clear logic"
```

---

### Task 4: Add `handleSlotUpload` function

**Files:**
- Modify: `app/image/page.tsx`

**Step 1: Insert the function after the `processSelections` function**

Find the closing of `processSelections` (look for the line after `}, [layers.length, photos]);`):

```ts
}, [layers.length, photos]);
```

Add directly after it:

```ts
  const handleSlotUpload = useCallback(
    async (slotIndex: number, file: File) => {
      if (!activeTemplate) return;
      const slot = activeTemplate.slots[slotIndex];
      if (!slot) return;

      setSlotStates((prev) => ({ ...prev, [slotIndex]: 'processing' }));

      // If this slot already has a layer, remove it
      setLayers((prev) => {
        const oldId = slotLayerIds[slotIndex];
        return oldId ? prev.filter((l) => l.id !== oldId) : prev;
      });

      let objectUrl: string | null = null;
      try {
        objectUrl = URL.createObjectURL(file);
        const meta = await loadImageMeta(objectUrl);

        // Full-image selection (entire photo = one person)
        const selection: SelectionRect = {
          id: createId('sel'),
          x: 0, y: 0, w: 1, h: 1,
          status: 'pending',
        };

        const cropped = await cropSelectionToDataUrl({
          src: objectUrl,
          selection,
        });

        const res = await fetch('/api/image/remove-bg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageDataUrl: cropped }),
        });

        if (!res.ok) {
          throw new Error((await res.text()) || 'Background removal failed.');
        }

        const payload = (await res.json()) as { imageUrl?: string };
        if (!payload?.imageUrl) throw new Error('No image output returned.');

        const resultMeta = await loadImageMeta(payload.imageUrl);
        const baseWidth = 180;
        const baseHeight = Math.max(90, Math.round((resultMeta.height / Math.max(1, resultMeta.width)) * baseWidth));

        const layerId = createId('person');
        const newLayer: PersonLayer = {
          id: layerId,
          name: `Slot ${slotIndex === 0 ? 'Center' : `#${slotIndex}`}`,
          src: payload.imageUrl,
          x: slot.x,
          y: slot.y,
          width: baseWidth,
          height: baseHeight,
          scale: slot.scale,
          rotationDeg: 0,
          flipX: false,
          cropTopPct: 0,
          cropLeftPct: 0,
          cropRightPct: 0,
        };

        setLayers((prev) => [...prev, newLayer]);
        setActiveLayerId(layerId);
        setSlotLayerIds((prev) => ({ ...prev, [slotIndex]: layerId }));
        setSlotStates((prev) => ({ ...prev, [slotIndex]: 'done' }));
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Upload failed';
        setProcessError(`Slot ${slotIndex === 0 ? 'Center' : `#${slotIndex}`}: ${message}`);
        setSlotStates((prev) => ({ ...prev, [slotIndex]: 'idle' }));
      } finally {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      }
    },
    [activeTemplate, slotLayerIds]
  );
```

Note: `SelectionRect`, `PersonLayer`, `cropSelectionToDataUrl`, `loadImageMeta`, `createId` are all already defined/imported in the file.

**Step 2: Verify TypeScript**

```bash
cd /Users/aydin/Desktop/apps/space_map && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

**Step 3: Commit**

```bash
cd /Users/aydin/Desktop/apps/space_map && git add app/image/page.tsx && git commit -m "feat: add handleSlotUpload function for template slot upload + extraction"
```

---

### Task 5: Insert the Template Slots card JSX

**Files:**
- Modify: `app/image/page.tsx`

**Step 1: Find the insertion point**

The new card goes between the Upload Photos `</section>` and the Frame People `<section>`. Find this exact boundary:

```tsx
            </section>

            <section className="panelBlock">
              <div className="panelTitleRow">
                <h3>Frame People</h3>
```

**Step 2: Insert the Template Slots card between them**

Replace the boundary found above with:

```tsx
            </section>

            {activeTemplate && (
              <section className="panelBlock">
                <div className="panelTitleRow">
                  <h3>Template Slots</h3>
                  <span>{Object.values(slotStates).filter((s) => s === 'done').length}/{activeTemplate.slots.length}</span>
                </div>
                <div className="slotList">
                  {activeTemplate.slots.map((slot) => {
                    const label = slot.index === 0 ? 'Center' : `#${slot.index}`;
                    const state = slotStates[slot.index] ?? 'idle';
                    return (
                      <div key={slot.index} className="slotRow">
                        <span className="slotLabel">{label}</span>
                        <label className="slotFileBtn">
                          <input
                            type="file"
                            accept="image/*"
                            className="hiddenInput"
                            disabled={state === 'processing'}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void handleSlotUpload(slot.index, file);
                              e.currentTarget.value = '';
                            }}
                          />
                          {state === 'processing' ? 'Uploading…' : state === 'done' ? 'Replace' : 'Choose File'}
                        </label>
                        <span className="slotStatus">
                          {state === 'processing' && <span className="slotSpinner" aria-hidden="true" />}
                          {state === 'done' && <span className="slotDone" aria-label="Done">✓</span>}
                          {state === 'idle' && <span className="slotEmpty" aria-hidden="true">○</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {Object.keys(slotStates).length > 0 && (
                  <button
                    type="button"
                    className="ghostBtn"
                    onClick={() => {
                      setLayers((prev) => prev.filter((l) => !Object.values(slotLayerIds).includes(l.id)));
                      setSlotStates({});
                      setSlotLayerIds({});
                    }}
                  >
                    Clear Slots
                  </button>
                )}
              </section>
            )}

            <section className="panelBlock">
              <div className="panelTitleRow">
                <h3>Frame People</h3>
```

**Step 3: Verify TypeScript**

```bash
cd /Users/aydin/Desktop/apps/space_map && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

**Step 4: Commit**

```bash
cd /Users/aydin/Desktop/apps/space_map && git add app/image/page.tsx && git commit -m "feat: add Template Slots sidebar card JSX"
```

---

### Task 6: Add CSS for slot rows and spinner animation

**Files:**
- Modify: `app/image/page.tsx` — the `<style jsx>` block

**Step 1: Add new CSS after the last `.templateCardName` block and before the closing `` `}</style> ``**

Find:
```css
        .templateCardName {
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          text-align: center;
          line-height: 1.3;
        }
      `}</style>
```

Replace with:
```css
        .templateCardName {
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          text-align: center;
          line-height: 1.3;
        }

        /* ── Template Slots card ── */
        .slotList {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .slotRow {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .slotLabel {
          width: 52px;
          font-size: 11px;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          flex-shrink: 0;
        }

        .slotFileBtn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 5px 10px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          font-size: 12px;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          transition: background 0.12s, border-color 0.12s;
          white-space: nowrap;
          overflow: hidden;
        }

        .slotFileBtn:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
        }

        .slotFileBtn input[type="file"] {
          display: none;
        }

        .slotStatus {
          width: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .slotEmpty {
          color: #cbd5e1;
          font-size: 14px;
          line-height: 1;
        }

        .slotDone {
          color: #16a34a;
          font-size: 14px;
          font-weight: 700;
          line-height: 1;
        }

        .slotSpinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: slotSpin 0.7s linear infinite;
        }

        @keyframes slotSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
```

**Step 2: Verify TypeScript**

```bash
cd /Users/aydin/Desktop/apps/space_map && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

**Step 3: Commit**

```bash
cd /Users/aydin/Desktop/apps/space_map && git add app/image/page.tsx && git commit -m "feat: add CSS for Template Slots card rows and spinner"
```

---

### Task 7: Push branch

**Step 1: Push**

```bash
cd /Users/aydin/Desktop/apps/space_map && git push
```

Expected: branch updates on remote.
