# Companion Mode Rework Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow all standard poster sizes to work in companion (Moon Phase) mode, with automatic landscape canvas swap for portrait sizes.

**Architecture:** Remove `moon-phase`/`sky-photo` as special DesignSize keys. Companion mode is now activated by a `posterType` state variable (`'single'` | `'companion'`). Portrait sizes swap W↔H in `poster.ts` when companion is active. UI gets two toggle buttons instead of a dropdown for poster type.

**Tech Stack:** TypeScript, Next.js (React), SVG generation in `lib/poster.ts`

---

## Context: How Companion Mode Works Today

**`app/ourskymap/page.tsx`** (the UI):
- `DesignSize` (line 16) includes `'moon-phase'` and `'sky-photo'` as special size keys
- When user picks these sizes → `isMoonPhase`/`isSkyPhoto` flags are set (lines 931-933)
- These flags become `showMoonPhase`/`showCompanionPhoto` in `PosterParams` (lines 978-980)

**`lib/poster.ts`** (the renderer):
- `showCompanionCircle = showMoonPhase || showCompanionPhoto` (line 411)
- When `showCompanionCircle`: W=24×72, H=18×72 hardcoded (lines 467-474)
- Companion layout positions two circles side by side (lines 512-541)

**`lib/types.ts`**:
- `PosterParams.size` does NOT include `moon-phase`/`sky-photo` (already clean)

---

## Task 1: Add `posterType` state + companion subtype state in page.tsx

**Files:**
- Modify: `app/ourskymap/page.tsx` lines 16-54

Replace `DesignSize` companion keys and `COMPANION_SIZE_SET` with a clean separation:

**Step 1: Update `DesignSize` type — remove companion keys**

Find line 16:
```typescript
// BEFORE:
type DesignSize = 'us-letter' | 'a4' | '11x14' | 'a3' | '12x12' | '12x16' | '16x20' | 'a2' | '18x24' | '20x20' | 'a1' | '24x32' | 'moon-phase' | 'sky-photo';

// AFTER:
type DesignSize = 'us-letter' | 'a4' | '11x14' | 'a3' | '12x12' | '12x16' | '16x20' | 'a2' | '18x24' | '20x20' | 'a1' | '24x32';
type CompanionSubtype = 'moon-phase' | 'sky-photo';
```

**Step 2: Update SIZE_PRESETS — remove companion entries**

Find lines 42-43:
```typescript
// REMOVE these two lines:
{ key: 'moon-phase', title: 'Moon Companion', sub: '24 x 18 in', compact: true },
{ key: 'sky-photo', title: 'Photo Companion', sub: '24 x 18 in', compact: true }
```

**Step 3: Update defaults and companion set**

Find lines 45-54:
```typescript
// BEFORE:
const DEFAULT_SINGLE_SIZE: DesignSize = '16x20';
const DEFAULT_COMPANION_SIZE: DesignSize = 'moon-phase';
const COMPANION_SIZE_SET = new Set<DesignSize>(['moon-phase', 'sky-photo']);
function isCompanionSize(size: DesignSize): boolean { return COMPANION_SIZE_SET.has(size); }
const SINGLE_SIZE_PRESETS = SIZE_PRESETS.filter((item) => !isCompanionSize(item.key));
const COMPANION_SIZE_PRESETS = SIZE_PRESETS.filter((item) => isCompanionSize(item.key));

// AFTER:
const DEFAULT_SINGLE_SIZE: DesignSize = '16x20';
const DEFAULT_COMPANION_SIZE: DesignSize = '16x20';
const DEFAULT_COMPANION_SUBTYPE: CompanionSubtype = 'moon-phase';
const STANDARD_SIZE_PRESETS = SIZE_PRESETS; // all sizes available for both modes
```

**Step 4: Add `companionSubtype` state near `posterType` state**

Find the line where `posterType` state is declared (search for `useState<PosterType>`). Add companion subtype state right after:
```typescript
const [companionSubtype, setCompanionSubtype] = useState<CompanionSubtype>(DEFAULT_COMPANION_SUBTYPE);
```

**Step 5: Run TypeScript check**
```bash
npx tsc --noEmit 2>&1 | head -40
```
Expected: Errors about `isCompanionSize`, `COMPANION_SIZE_PRESETS`, `moon-phase`/`sky-photo` usages — these will be fixed in Task 2.

---

## Task 2: Fix all usages of removed companion size keys in page.tsx

**Files:**
- Modify: `app/ourskymap/page.tsx`

**Step 1: Fix posterType derivation**

Find around line 684:
```typescript
// BEFORE:
const posterType: PosterType = isCompanionSize(size) ? 'companion' : 'single';

// AFTER (posterType now comes from state, not size — just remove this derived line):
// posterType is already a state variable, delete this line
```

**Step 2: Fix the posterType selector onChange handler**

Find around line 1291 (the `<select>` for poster type):
```typescript
// BEFORE: onChange sets size to DEFAULT_COMPANION_SIZE ('moon-phase')
onChange={(e) => {
  const nextType = e.target.value as PosterType;
  setSize((prev) => {
    if (nextType === 'companion') {
      return isCompanionSize(prev) ? prev : DEFAULT_COMPANION_SIZE;
    }
    return isCompanionSize(prev) ? DEFAULT_SINGLE_SIZE : prev;
  });
}}

// AFTER: posterType controls mode, size stays as-is
onChange={(e) => {
  const nextType = e.target.value as PosterType;
  setPosterType(nextType);
  // size stays the same — same size works for both modes
}}
```

**Step 3: Fix `isMoonPhase`/`isSkyPhoto` derivation**

Find lines 931-933:
```typescript
// BEFORE:
const isMoonPhase = size === 'moon-phase';
const isSkyPhoto = size === 'sky-photo';
const usesCompanionCircle = isMoonPhase || isSkyPhoto;

// AFTER:
const isMoonPhase = posterType === 'companion' && companionSubtype === 'moon-phase';
const isSkyPhoto = posterType === 'companion' && companionSubtype === 'sky-photo';
const usesCompanionCircle = posterType === 'companion';
```

**Step 4: Fix sizeOptions used in size dropdown**

Find where `sizeOptions` is set (based on `posterType`):
```typescript
// BEFORE: used SINGLE_SIZE_PRESETS or COMPANION_SIZE_PRESETS
const sizeOptions = posterType === 'companion' ? COMPANION_SIZE_PRESETS : SINGLE_SIZE_PRESETS;

// AFTER: same sizes for both modes
const sizeOptions = STANDARD_SIZE_PRESETS;
```

**Step 5: Fix `defaultPosterBySize` — remove moon-phase and sky-photo entries**

Find lines ~452-493 (the `moon-phase` and `sky-photo` entries in `defaultPosterBySize`):
```typescript
// REMOVE these two entries entirely:
'moon-phase': { ... },
'sky-photo': { ... },
```

**Step 6: Run TypeScript check**
```bash
npx tsc --noEmit 2>&1 | head -40
```
Expected: Clean or only errors from poster.ts (handled in Task 3).

**Step 7: Commit**
```bash
git add app/ourskymap/page.tsx
git commit -m "refactor(page): remove moon-phase/sky-photo as DesignSize keys, drive companion mode from posterType state"
```

---

## Task 3: Update `poster.ts` — landscape swap instead of hardcoded 24×18

**Files:**
- Modify: `lib/poster.ts` lines 467-478

**Step 1: Replace hardcoded W/H/defaultChartDiameter with landscape swap**

Find lines 467-478:
```typescript
// BEFORE:
const W =
  showCompanionCircle
    ? 24 * 72
    : layout.width;
const H =
  showCompanionCircle
    ? 18 * 72
    : layout.height;
const defaultChartDiameter =
  showCompanionCircle
    ? 10 * 72
    : layout.defaultChartDiameter;

// AFTER:
// Companion mode: use landscape orientation (long edge horizontal) for better side-by-side layout
const originalW = layout.width;
const originalH = layout.height;
const W = showCompanionCircle && originalH > originalW ? originalH : originalW;
const H = showCompanionCircle && originalH > originalW ? originalW : originalH;
const defaultChartDiameter = layout.defaultChartDiameter;
```

**Why this works:**
- Portrait sizes (e.g. 16×20: 1152×1440) swap to landscape (1440×1152) in companion mode
- Square sizes (12×12, 20×20) unchanged since originalH === originalW
- `defaultChartDiameter` now comes from `layout` (already W-based formula), no hardcoded value needed
- The companion positioning code (lines 512-541) already reads W and H dynamically

**Step 2: Run TypeScript check**
```bash
npx tsc --noEmit 2>&1 | head -40
```
Expected: Clean.

**Step 3: Commit**
```bash
git add lib/poster.ts
git commit -m "feat(poster): landscape swap for companion mode — portrait sizes rotate to landscape"
```

---

## Task 4: Replace poster type `<select>` with two toggle buttons in UI

**Files:**
- Modify: `app/ourskymap/page.tsx` around line 1286-1305

**Step 1: Replace the `<select>` for poster type with two buttons**

Find the posterType selector block (around line 1286). Replace the entire `<div className="stackField">...</div>` block:

```tsx
// BEFORE: <select> with "Single" / "Companion" options

// AFTER:
<div className="stackField">
  <label>Poster Type</label>
  <div style={{ display: 'flex', gap: '8px' }}>
    <button
      className={posterType === 'single' ? 'typeBtn typeBtn--active' : 'typeBtn'}
      onClick={() => setPosterType('single')}
      type="button"
    >
      Standard Star Map
    </button>
    <button
      className={posterType === 'companion' ? 'typeBtn typeBtn--active' : 'typeBtn'}
      onClick={() => setPosterType('companion')}
      type="button"
    >
      Star Map with Moon Phase
    </button>
  </div>
</div>
```

**Step 2: Add companion subtype selector (shown only when companion active)**

Immediately after the poster type buttons block, add:
```tsx
{posterType === 'companion' && (
  <div className="stackField">
    <label>Companion Type</label>
    <select
      className="dashedInput"
      value={companionSubtype}
      onChange={(e) => setCompanionSubtype(e.target.value as CompanionSubtype)}
    >
      <option value="moon-phase">Moon Phase</option>
      <option value="sky-photo">Photo Companion</option>
    </select>
  </div>
)}
```

**Step 3: Add CSS for typeBtn**

Find the global CSS file (likely `app/globals.css` or a module CSS). Add:
```css
.typeBtn {
  flex: 1;
  padding: 8px 12px;
  border: 1px dashed var(--ink, #ccc);
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 12px;
  border-radius: 2px;
  opacity: 0.6;
  transition: opacity 0.15s;
}
.typeBtn--active {
  opacity: 1;
  border-style: solid;
}
```

**Step 4: Run TypeScript check**
```bash
npx tsc --noEmit 2>&1 | head -40
```

**Step 5: Commit**
```bash
git add app/ourskymap/page.tsx
git commit -m "feat(ui): replace poster type select with Standard/Companion toggle buttons"
```

---

## Task 5: Update size dropdown label to show landscape hint for companion mode

**Files:**
- Modify: `app/ourskymap/page.tsx` — the size `<select>` options

**Step 1: Add a helper to get companion canvas label**

Near the size options, add:
```typescript
function getCompanionCanvasHint(sizeKey: DesignSize): string {
  // Get dimensions for this size from getPosterLayout equivalent
  const dims: Record<DesignSize, [number, number]> = {
    'us-letter': [612, 792], 'a4': [595, 842], '11x14': [792, 1008],
    'a3': [842, 1191], '12x12': [864, 864], '12x16': [864, 1152],
    '16x20': [1152, 1440], 'a2': [1191, 1684], '18x24': [1296, 1728],
    '20x20': [1440, 1440], 'a1': [1701, 3024], '24x32': [1728, 2304],
  };
  const [w, h] = dims[sizeKey] ?? [0, 0];
  return h > w ? ' (landscape)' : '';
}
```

**Step 2: Update size dropdown options to show landscape hint when companion**

Find the size options mapping (around line 1308-1315):
```tsx
// BEFORE:
{sizeOptions.map((item) => (
  <option key={item.key} value={item.key}>
    {item.title} - {item.sub}
  </option>
))}

// AFTER:
{sizeOptions.map((item) => (
  <option key={item.key} value={item.key}>
    {item.title} - {item.sub}
    {posterType === 'companion' ? getCompanionCanvasHint(item.key) : ''}
  </option>
))}
```

**Step 3: Run TypeScript check**
```bash
npx tsc --noEmit 2>&1 | head -40
```

**Step 4: Commit**
```bash
git add app/ourskymap/page.tsx
git commit -m "feat(ui): show landscape canvas hint in size dropdown for companion mode"
```

---

## Task 6: Update SKILL.md and push

**Files:**
- Modify: `~/.claude/skills/poster-layout-spec/SKILL.md`

**Step 1: Update the Companion Circle Mode section**

Find the "Companion Circle Mode" section and replace the W/H description:
```markdown
// OLD note about W=24×72, H=18×72

// NEW:
- Canvas: portrait sizes swap W↔H (landscape). e.g. 16x20 → W=1440px, H=1152px
- Square sizes (12x12, 20x20): unchanged
- Formulas (font, chart, ring) use the swapped landscape W and H
```

**Step 2: Push branch**
```bash
git push origin skymap-companion-rework
```

---

## Verification

After all tasks:

1. **TypeScript clean:** `npx tsc --noEmit` — no errors
2. **Single mode:** Select "Standard Star Map" → all 12 sizes available → poster renders portrait
3. **Companion mode:** Select "Star Map with Moon Phase" → all 12 sizes available → portrait sizes render landscape
4. **Square in companion:** Select 12×12 or 20×20 in companion → canvas stays square
5. **Companion subtype:** Switch to "Photo Companion" in subtype select → photo upload appears

---

## Rollback Plan

If issues arise: `git revert HEAD~N` or `git checkout skymap-font-chart-scale` to restore prior state.
