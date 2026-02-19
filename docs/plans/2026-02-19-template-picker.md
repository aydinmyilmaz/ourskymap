# Template Picker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Use a Template" flow to Image Studio where customers pick a predefined design (background + slot positions), then extracted people are auto-placed into the template's slots in order.

**Architecture:** Static template data lives in `lib/templates.ts`. A modal opens from a button in the Upload Photos card. On extract, if a template is active, new layers are repositioned to the template's slots instead of the default grid. Three files touched total.

**Tech Stack:** Next.js 14 App Router, TypeScript, React 18, styled-jsx, no new dependencies

---

### Task 1: Create `lib/templates.ts` with types and one sample template

**Files:**
- Create: `lib/templates.ts`

**Step 1: Create the file with this exact content**

```ts
export type TemplateSlot = {
  index: number;  // 0-based; maps to the Nth extracted person in order
  x: number;      // canvas x in design units (0–620)
  y: number;      // canvas y in design units (0–780)
  scale: number;  // initial scale, e.g. 0.8
  zIndex: number; // stacking order (higher = in front)
};

export type DesignTemplate = {
  id: string;
  name: string;
  thumbnail: string;    // path relative to /public, e.g. /templates/custom-lightning-thumb.jpg
  backgroundUrl: string; // path relative to /public, e.g. /templates/custom-lightning-bg.jpg
  slots: TemplateSlot[];
};

// Add new templates here. Assets go in /public/templates/.
export const DESIGN_TEMPLATES: DesignTemplate[] = [
  {
    id: 'custom-lightning-5',
    name: 'Custom Lightning (5-person)',
    thumbnail: '/templates/custom-lightning-thumb.jpg',
    backgroundUrl: '/templates/custom-lightning-bg.jpg',
    slots: [
      // Center (largest, front)
      { index: 0, x: 310, y: 480, scale: 1.0, zIndex: 5 },
      // #1 top-left
      { index: 1, x: 150, y: 390, scale: 0.75, zIndex: 4 },
      // #2 top-right
      { index: 2, x: 470, y: 390, scale: 0.75, zIndex: 3 },
      // #3 bottom-left
      { index: 3, x: 120, y: 580, scale: 0.65, zIndex: 2 },
      // #4 bottom-right
      { index: 4, x: 500, y: 580, scale: 0.65, zIndex: 1 },
    ],
  },
];
```

**Step 2: Create the public templates folder**

```bash
mkdir -p /Users/aydin/Desktop/apps/space_map/public/templates
```

Add a `.gitkeep` so the folder is tracked:

```bash
touch /Users/aydin/Desktop/apps/space_map/public/templates/.gitkeep
```

**Step 3: Verify TypeScript**

```bash
cd /Users/aydin/Desktop/apps/space_map && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

**Step 4: Commit**

```bash
cd /Users/aydin/Desktop/apps/space_map && git add lib/templates.ts public/templates/.gitkeep && git commit -m "feat: add DesignTemplate type and sample template data"
```

---

### Task 2: Add template state + modal open/close to `app/image/page.tsx`

**Files:**
- Modify: `app/image/page.tsx`

**Step 1: Add the import at the top of the file (after the existing React import)**

Find the line:
```ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
```

Add directly below it:
```ts
import { DESIGN_TEMPLATES } from '@/lib/templates';
import type { DesignTemplate } from '@/lib/templates';
```

**Step 2: Add two new state variables**

Find:
```ts
  const [healthChecking, setHealthChecking] = useState(false);
```

Add directly after it:
```ts
  const [activeTemplate, setActiveTemplate] = useState<DesignTemplate | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
```

**Step 3: Verify TypeScript**

```bash
cd /Users/aydin/Desktop/apps/space_map && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

**Step 4: Commit**

```bash
cd /Users/aydin/Desktop/apps/space_map && git add app/image/page.tsx && git commit -m "feat: add activeTemplate and templateModalOpen state"
```

---

### Task 3: Add "Use a Template" button + active template badge to Upload Photos card

**Files:**
- Modify: `app/image/page.tsx`

**Step 1: Find the Upload Photos button row and add the template button below it**

Find this exact block:
```tsx
              <div className="buttonRow">
                <button
                  type="button"
                  className="primaryBtn"
                  disabled={remainingPhotoSlots <= 0}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {remainingPhotoSlots > 0 ? 'Add Photos' : 'Max Photos Reached'}
                </button>
              </div>
              <p className="hint">Maximum {MAX_UPLOAD_PHOTOS} photos. Draw person frames in next card.</p>
```

Replace with:
```tsx
              <div className="buttonRow">
                <button
                  type="button"
                  className="primaryBtn"
                  disabled={remainingPhotoSlots <= 0}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {remainingPhotoSlots > 0 ? 'Add Photos' : 'Max Photos Reached'}
                </button>
                <button
                  type="button"
                  className="ghostBtn"
                  onClick={() => setTemplateModalOpen(true)}
                >
                  Use a Template
                </button>
              </div>
              {activeTemplate && (
                <div className="templateActiveBadge">
                  <span>🎨 {activeTemplate.name}</span>
                  <button
                    type="button"
                    className="templateBadgeClear"
                    aria-label="Clear template"
                    onClick={() => {
                      setActiveTemplate(null);
                      setBackgroundImageUrl('');
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
              <p className="hint">Maximum {MAX_UPLOAD_PHOTOS} photos. Draw person frames in next card.</p>
```

**Step 2: Verify TypeScript**

```bash
cd /Users/aydin/Desktop/apps/space_map && npx tsc --noEmit 2>&1 | head -20
```

**Step 3: Commit**

```bash
cd /Users/aydin/Desktop/apps/space_map && git add app/image/page.tsx && git commit -m "feat: add Use a Template button and active template badge to Upload Photos card"
```

---

### Task 4: Add template picker modal JSX

**Files:**
- Modify: `app/image/page.tsx`

**Step 1: Find the closing `</div>` of the root `.designRoot` div and insert the modal before it**

Find (near the bottom of the JSX, just before `<style jsx>`):
```tsx
      <style jsx>{`
```

Insert directly before it:
```tsx
      {templateModalOpen && (
        <div
          className="templateModalBackdrop"
          onClick={() => setTemplateModalOpen(false)}
        >
          <div
            className="templateModal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="templateModalHeader">
              <h2>Choose a Template</h2>
              <button
                type="button"
                className="templateModalClose"
                aria-label="Close"
                onClick={() => setTemplateModalOpen(false)}
              >
                ✕
              </button>
            </div>
            {DESIGN_TEMPLATES.length === 0 ? (
              <p className="templateModalEmpty">No templates available yet.</p>
            ) : (
              <div className="templateGrid">
                {DESIGN_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className={`templateCard${activeTemplate?.id === template.id ? ' active' : ''}`}
                    onClick={() => {
                      setActiveTemplate(template);
                      setBackgroundImageUrl(template.backgroundUrl);
                      setTemplateModalOpen(false);
                    }}
                  >
                    <div className="templateThumb">
                      <img src={template.thumbnail} alt={template.name} />
                    </div>
                    <span className="templateCardName">{template.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

```

**Step 2: Verify TypeScript**

```bash
cd /Users/aydin/Desktop/apps/space_map && npx tsc --noEmit 2>&1 | head -20
```

**Step 3: Commit**

```bash
cd /Users/aydin/Desktop/apps/space_map && git add app/image/page.tsx && git commit -m "feat: add template picker modal JSX"
```

---

### Task 5: Auto-place extracted people into template slots

**Files:**
- Modify: `app/image/page.tsx`

**Step 1: Find the layer insertion in `processSelections` and add slot positioning**

Find this exact block (around line 1096):
```ts
      if (newLayers.length > 0) {
        setLayers((prev) => [...prev, ...newLayers]);
        setActiveLayerId(newLayers[newLayers.length - 1]?.id ?? null);
      }
```

Replace with:
```ts
      if (newLayers.length > 0) {
        // If a template is active, place layers into template slots in order.
        // Layers beyond the slot count keep their default grid positions.
        const existingCount = layers.length; // how many layers existed before this batch
        const positionedLayers = newLayers.map((layer, batchIndex) => {
          const slotIndex = existingCount + batchIndex;
          const slot = activeTemplate?.slots[slotIndex];
          if (!slot) return layer;
          return { ...layer, x: slot.x, y: slot.y, scale: slot.scale };
        });
        setLayers((prev) => [...prev, ...positionedLayers]);
        setActiveLayerId(positionedLayers[positionedLayers.length - 1]?.id ?? null);
      }
```

**Step 2: Also clear template when "Remove Background Image" is clicked**

Find:
```tsx
                    onClick={() => setBackgroundImageUrl('')}
                  >
                    Remove Background Image
```

The `onClick` for this button currently only calls `setBackgroundImageUrl('')`. Find that button's `onClick` prop and replace it:

```tsx
                    onClick={() => { setBackgroundImageUrl(''); setActiveTemplate(null); }}
```

Note: there are two places `setBackgroundImageUrl('')` is called in the Background Settings card (one for the upload input change handler that clears it, and one for the Remove button). Only patch the **Remove Background Image** button's onClick.

**Step 3: Verify TypeScript**

```bash
cd /Users/aydin/Desktop/apps/space_map && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

**Step 4: Commit**

```bash
cd /Users/aydin/Desktop/apps/space_map && git add app/image/page.tsx && git commit -m "feat: auto-place extracted people into template slots on processSelections"
```

---

### Task 6: Add CSS for modal and badge

**Files:**
- Modify: `app/image/page.tsx` — the `<style jsx>` block

**Step 1: Find the end of the styled-jsx block and add before the closing backtick**

Find the very last CSS rule before the closing `` `}</style> `` (which should be the `@media (max-width: 800px)` block closing brace). Add these styles after that closing brace and before `` `}</style> ``:

```css
        /* ── Template picker ── */
        .templateActiveBadge {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 8px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          font-size: 12px;
          font-weight: 600;
          color: #1d4ed8;
        }

        .templateBadgeClear {
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 13px;
          color: #1d4ed8;
          opacity: 0.6;
          padding: 0 2px;
          line-height: 1;
        }

        .templateBadgeClear:hover {
          opacity: 1;
        }

        .templateModalBackdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(10, 15, 30, 0.72);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .templateModal {
          background: #fff;
          border-radius: 18px;
          width: min(860px, 100%);
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 24px 64px rgba(0,0,0,0.35);
        }

        .templateModalHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          border-bottom: 1px solid #e5e7eb;
          flex-shrink: 0;
        }

        .templateModalHeader h2 {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .templateModalClose {
          background: transparent;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #6b7280;
          padding: 4px 8px;
          border-radius: 6px;
          line-height: 1;
        }

        .templateModalClose:hover {
          background: #f3f4f6;
          color: #111827;
        }

        .templateModalEmpty {
          padding: 48px 24px;
          text-align: center;
          color: #9ca3af;
          font-size: 14px;
        }

        .templateGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
          padding: 20px 24px 24px;
          overflow-y: auto;
        }

        .templateCard {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          background: #f9fafb;
          padding: 10px;
          cursor: pointer;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .templateCard:hover {
          border-color: #93c5fd;
          box-shadow: 0 4px 12px rgba(59,130,246,0.15);
        }

        .templateCard.active {
          border-color: #2563eb;
          background: #eff6ff;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.2);
        }

        .templateThumb {
          width: 100%;
          aspect-ratio: 620 / 780;
          border-radius: 8px;
          overflow: hidden;
          background: #e5e7eb;
        }

        .templateThumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .templateCardName {
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          text-align: center;
          line-height: 1.3;
        }
```

**Step 2: Verify TypeScript**

```bash
cd /Users/aydin/Desktop/apps/space_map && npx tsc --noEmit 2>&1 | head -20
```

**Step 3: Commit**

```bash
cd /Users/aydin/Desktop/apps/space_map && git add app/image/page.tsx && git commit -m "feat: add CSS for template picker modal and active template badge"
```

---

### Task 7: Commit monitoring documentation

**Files:**
- Already exists: `docs/plans/2026-02-19-template-picker-design.md`
- Already exists: `docs/plans/2026-02-19-template-picker.md`

**Step 1: Verify both docs are committed**

```bash
cd /Users/aydin/Desktop/apps/space_map && git log --oneline -8
```

Expected: see the design doc and this plan in recent commits.

Both should already be committed from the brainstorming session. No action needed if they appear.
