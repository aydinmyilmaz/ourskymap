# Design Mode Switcher Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Custom Design / Template Design mode switcher to the sidebar so each workflow has its own "Upload Photos" card, with template mode supporting parallel slot processing via a single "Process All" button.

**Architecture:** Add `designMode` and `slotFiles` state to `app/image/page.tsx`. Update `slotStates` type to include `'queued'`. Conditionally render the correct upload card and hide/show Frame People based on mode. Replace immediate-fire slot processing with a queue-then-batch approach using `Promise.allSettled`. Add CSS for the mode switcher tabs and queued state.

**Tech Stack:** Next.js 14 App Router, TypeScript, React 18, styled-jsx, no new dependencies

---

### Task 1: Add `designMode` and `slotFiles` state; update `SlotState` type

**Files:**
- Modify: `app/image/page.tsx`

**Step 1: Update the `slotStates` type from inline union to a named alias, and add `'queued'`**

Find (line ~450):
```ts
  const [slotStates, setSlotStates] = useState<Record<number, 'idle' | 'processing' | 'done'>>({});
```

Replace with:
```ts
  const [slotStates, setSlotStates] = useState<Record<number, 'idle' | 'queued' | 'processing' | 'done'>>({});
```

**Step 2: Add `designMode` and `slotFiles` state directly after `templateTextIds`**

Find:
```ts
  const [templateTextIds, setTemplateTextIds] = useState<string[]>([]);
```

Add after:
```ts
  const [designMode, setDesignMode] = useState<'custom' | 'template'>('custom');
  const [slotFiles, setSlotFiles] = useState<Record<number, File>>({});
```

**Step 3: Verify TypeScript**

```bash
cd /Users/aydin/Desktop/apps/space_map && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

**Step 4: Commit**

```bash
cd /Users/aydin/Desktop/apps/space_map && git add app/image/page.tsx && git commit -m "feat: add designMode, slotFiles state; expand SlotState to include queued"
```

---

### Task 2: Update `handleSlotUpload` to read from `slotFiles` and update clear logic

**Files:**
- Modify: `app/image/page.tsx`

**Step 1: Update `handleSlotUpload` signature and body**

Find the entire function (it starts with `const handleSlotUpload = useCallback(`). Replace the full function with:

```ts
  const handleSlotUpload = useCallback(
    async (slotIndex: number) => {
      if (!activeTemplate) return;
      const slot = activeTemplate.slots[slotIndex];
      if (!slot) return;
      const file = slotFiles[slotIndex];
      if (!file) return;

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
    [activeTemplate, slotLayerIds, slotFiles]
  );
```

Note: removed the `file: File` parameter — it now reads from `slotFiles[slotIndex]`. Also added `slotFiles` to the dependency array.

**Step 2: Add `handleProcessAllSlots` function directly after `handleSlotUpload`**

```ts
  const handleProcessAllSlots = useCallback(async () => {
    if (!activeTemplate) return;
    const queuedIndices = activeTemplate.slots
      .map((s) => s.index)
      .filter((i) => (slotStates[i] ?? 'idle') === 'queued');
    await Promise.allSettled(queuedIndices.map((i) => handleSlotUpload(i)));
  }, [activeTemplate, slotStates, handleSlotUpload]);
```

**Step 3: Update "Clear Slots" logic in the badge ✕ and Remove Background button to also clear `slotFiles`**

Find (badge ✕ — there are two places with `setSlotStates({});`). In both the badge ✕ onClick and the "Remove Background Image" onClick, add `setSlotFiles({});` alongside the other clears.

Badge ✕ onClick: find:
```ts
                      setSlotStates({});
                      setSlotLayerIds({});
                      setTemplateTextIds([]);
                    }}
                  >
                    ✕
```

Replace with:
```ts
                      setSlotStates({});
                      setSlotLayerIds({});
                      setSlotFiles({});
                      setTemplateTextIds([]);
                    }}
                  >
                    ✕
```

Remove Background button onClick: find:
```ts
                      setSlotStates({});
                      setSlotLayerIds({});
                      setTemplateTextIds([]);
                    }}
```

(This is inside the Remove Background Image button — the one that follows `setActiveTemplate(null);` and `setBackgroundImageUrl('');`)

Replace with:
```ts
                      setSlotStates({});
                      setSlotLayerIds({});
                      setSlotFiles({});
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
cd /Users/aydin/Desktop/apps/space_map && git add app/image/page.tsx && git commit -m "feat: update handleSlotUpload to read slotFiles; add handleProcessAllSlots"
```

---

### Task 3: Add mode switcher tabs JSX + update Upload Photos card for Custom mode

**Files:**
- Modify: `app/image/page.tsx`

**Step 1: Add the mode switcher above the first panelBlock**

The sidebar panel contains all the `<section className="panelBlock">` elements. Find the very first one:

```tsx
            <section className="panelBlock">
              <div className="panelTitleRow">
                <h3>Upload Photos</h3>
```

Insert this BEFORE it:

```tsx
            <div className="modeSwitcher">
              <button
                type="button"
                className={`modeTab${designMode === 'custom' ? ' active' : ''}`}
                onClick={() => setDesignMode('custom')}
              >
                Custom Design
              </button>
              <button
                type="button"
                className={`modeTab${designMode === 'template' ? ' active' : ''}`}
                onClick={() => setDesignMode('template')}
              >
                Template Design
              </button>
            </div>

```

**Step 2: Wrap the Custom Design Upload Photos card in a `designMode === 'custom'` conditional**

Find the opening of the Upload Photos panelBlock:
```tsx
            <section className="panelBlock">
              <div className="panelTitleRow">
                <h3>Upload Photos</h3>
                <span>
                  {photos.length}/{MAX_UPLOAD_PHOTOS}
                </span>
              </div>
```

Replace with:
```tsx
            {designMode === 'custom' && (
            <section className="panelBlock">
              <div className="panelTitleRow">
                <h3>Upload Photos</h3>
                <span>
                  {photos.length}/{MAX_UPLOAD_PHOTOS}
                </span>
              </div>
```

Then find the closing `</section>` of that card — it comes just before the `{activeTemplate && (` Template Slots block. That line looks like:

```tsx
            </section>

            {activeTemplate && (
```

Replace the `</section>` with:
```tsx
            </section>
            )}

            {activeTemplate && (
```

**Step 3: Verify TypeScript**

```bash
cd /Users/aydin/Desktop/apps/space_map && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

**Step 4: Commit**

```bash
cd /Users/aydin/Desktop/apps/space_map && git add app/image/page.tsx && git commit -m "feat: add mode switcher tabs; wrap custom Upload Photos in designMode guard"
```

---

### Task 4: Replace Template Slots card with Template Design "Upload Photos" card

**Files:**
- Modify: `app/image/page.tsx`

**Step 1: Replace the Template Slots card entirely**

Find the entire template slots section (starts with `{activeTemplate && (` and ends at the matching `)}` before the Frame People section). Replace:

```tsx
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
```

With:

```tsx
            {designMode === 'template' && (
              <section className="panelBlock">
                <div className="panelTitleRow">
                  <h3>Upload Photos</h3>
                  <span>{Object.values(slotStates).filter((s) => s === 'done').length}/{activeTemplate ? activeTemplate.slots.length : 0}</span>
                </div>
                <div className="buttonRow">
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
                        setLayers((prev) => prev.filter((l) => !Object.values(slotLayerIds).includes(l.id)));
                        setTextLayers((prev) => prev.filter((l) => !templateTextIds.includes(l.id)));
                        setSlotStates({});
                        setSlotLayerIds({});
                        setSlotFiles({});
                        setTemplateTextIds([]);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
                {activeTemplate && (
                  <div className="slotList">
                    {activeTemplate.slots.map((slot) => {
                      const label = slot.index === 0 ? 'Center' : `#${slot.index}`;
                      const state = slotStates[slot.index] ?? 'idle';
                      const queuedFile = slotFiles[slot.index];
                      return (
                        <div key={slot.index} className="slotRow">
                          <span className="slotLabel">{label}</span>
                          <label className={`slotFileBtn${state === 'processing' ? ' disabled' : ''}`}>
                            <input
                              type="file"
                              accept="image/*"
                              className="hiddenInput"
                              disabled={state === 'processing'}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setSlotFiles((prev) => ({ ...prev, [slot.index]: file }));
                                  setSlotStates((prev) => ({ ...prev, [slot.index]: 'queued' }));
                                }
                                e.currentTarget.value = '';
                              }}
                            />
                            {state === 'processing' ? 'Uploading…' : state === 'done' ? 'Replace' : 'Choose File'}
                          </label>
                          <span className="slotStatus">
                            {state === 'processing' && <span className="slotSpinner" aria-hidden="true" />}
                            {state === 'done' && <span className="slotDone" aria-label="Done">✓</span>}
                            {state === 'queued' && <span className="slotQueued" aria-label="Queued">…</span>}
                            {state === 'idle' && <span className="slotEmpty" aria-hidden="true">○</span>}
                          </span>
                        </div>
                      );
                    })}
                    {queuedCount > 0 && (
                      <button
                        type="button"
                        className="primaryBtn"
                        disabled={processingCount > 0}
                        onClick={() => void handleProcessAllSlots()}
                      >
                        {processingCount > 0
                          ? `Processing ${doneCount}/${activeTemplate.slots.length}…`
                          : `Process All (${queuedCount})`}
                      </button>
                    )}
                  </div>
                )}
                {Object.keys(slotStates).length > 0 && (
                  <button
                    type="button"
                    className="ghostBtn"
                    onClick={() => {
                      setLayers((prev) => prev.filter((l) => !Object.values(slotLayerIds).includes(l.id)));
                      setSlotStates({});
                      setSlotLayerIds({});
                      setSlotFiles({});
                    }}
                  >
                    Clear Slots
                  </button>
                )}
              </section>
            )}
```

**Step 2: Add the derived counts as `useMemo` values after the existing `useMemo` blocks**

Find the block of `useMemo` calls near the top of the component (around line 535–580). After the last one (look for `remainingPeopleSlots`), add:

```ts
  const queuedCount = useMemo(
    () => Object.values(slotStates).filter((s) => s === 'queued').length,
    [slotStates]
  );
  const processingCount = useMemo(
    () => Object.values(slotStates).filter((s) => s === 'processing').length,
    [slotStates]
  );
  const doneCount = useMemo(
    () => Object.values(slotStates).filter((s) => s === 'done').length,
    [slotStates]
  );
```

**Step 3: Verify TypeScript**

```bash
cd /Users/aydin/Desktop/apps/space_map && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

**Step 4: Commit**

```bash
cd /Users/aydin/Desktop/apps/space_map && git add app/image/page.tsx && git commit -m "feat: replace Template Slots card with Template Design Upload Photos card; parallel Process All"
```

---

### Task 5: Hide Frame People card in template mode

**Files:**
- Modify: `app/image/page.tsx`

**Step 1: Wrap the Frame People panelBlock in a `designMode === 'custom'` guard**

Find:
```tsx
            <section className="panelBlock">
              <div className="panelTitleRow">
                <h3>Frame People</h3>
```

Replace with:
```tsx
            {designMode === 'custom' && (
            <section className="panelBlock">
              <div className="panelTitleRow">
                <h3>Frame People</h3>
```

Then find the closing `</section>` of the Frame People card. It comes just before the Background Settings card:

```tsx
            </section>

            <section className="panelBlock">
              <div className="panelTitleRow">
                <h3>Background Settings</h3>
```

Replace with:
```tsx
            </section>
            )}

            <section className="panelBlock">
              <div className="panelTitleRow">
                <h3>Background Settings</h3>
```

**Step 2: Verify TypeScript**

```bash
cd /Users/aydin/Desktop/apps/space_map && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

**Step 3: Commit**

```bash
cd /Users/aydin/Desktop/apps/space_map && git add app/image/page.tsx && git commit -m "feat: hide Frame People card in template design mode"
```

---

### Task 6: Add CSS for mode switcher tabs and queued slot state

**Files:**
- Modify: `app/image/page.tsx` — the `<style jsx>` block

**Step 1: Add CSS before the closing `` `}</style> ``**

Find:
```css
        @keyframes slotSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
```

Replace with:
```css
        @keyframes slotSpin {
          to { transform: rotate(360deg); }
        }

        /* ── Mode switcher ── */
        .modeSwitcher {
          display: flex;
          gap: 0;
          margin-bottom: 12px;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          background: #f1f5f9;
        }

        .modeTab {
          flex: 1;
          padding: 8px 0;
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }

        .modeTab.active {
          background: #fff;
          color: #0f172a;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        .modeTab:hover:not(.active) {
          background: #e2e8f0;
        }

        /* ── Queued slot state ── */
        .slotQueued {
          color: #f59e0b;
          font-size: 14px;
          font-weight: 700;
          line-height: 1;
        }

        .slotFileBtn.disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
cd /Users/aydin/Desktop/apps/space_map && git add app/image/page.tsx && git commit -m "feat: add CSS for mode switcher tabs and queued slot state"
```

---

### Task 7: Push branch

**Step 1: Push**

```bash
cd /Users/aydin/Desktop/apps/space_map && git push
```

Expected: branch updates on remote.
