# Design Mode Switcher — Design Doc

**Date:** 2026-02-19
**Status:** Approved

## Goal

Replace the confusing dual-card layout (Upload Photos + Template Slots) with a clean two-mode sidebar: **Custom Design** and **Template Design**. Each mode shows the right upload card for its workflow.

## Mode Switcher

- New state: `designMode: 'custom' | 'template'`, default `'custom'`
- Two pill/tab buttons at the top of the sidebar panel, above all cards
- Switching is instant and non-destructive — all layers, template, and slot data are preserved
- When a template is active and user switches to Custom Design, template layers remain on canvas and can be edited normally

## Custom Design Mode

Shows existing cards unchanged:
- Upload Photos (Add Photos, photo list, hint)
- Frame People (draw boxes, Extract Selected People)

## Template Design Mode

Shows a single **Upload Photos** card that replaces both old Upload Photos and Template Slots cards:

### Upload Photos card (template mode)
- "Use a Template" button + active template badge with ✕ clear
- Per-slot rows: `[label] [Choose File btn] [filename if queued] [status icon]`
- Status icons: ○ idle, filename shown when queued, spinner when processing, ✓ done
- **"Process All" button**: appears when ≥1 slot is `'queued'`; fires all queued slots in parallel via `Promise.allSettled`; disabled while any slot is `'processing'`; shows "Processing N/M…" while running
- "Clear Slots" button: clears all slot layers and resets states to idle

Frame People card is **hidden** in template mode.
Background Settings and all other cards remain visible in both modes.

## State Changes

### New state
```ts
const [designMode, setDesignMode] = useState<'custom' | 'template'>('custom');
const [slotFiles, setSlotFiles] = useState<Record<number, File>>({});
```

### Updated slot states
```ts
type SlotState = 'idle' | 'queued' | 'processing' | 'done';
const [slotStates, setSlotStates] = useState<Record<number, SlotState>>({});
```

## handleSlotUpload change

Currently fires immediately on file pick. New flow:
- File pick → store in `slotFiles[index]`, set `slotStates[index] = 'queued'`
- "Process All" → `Promise.allSettled(queuedSlots.map(i => handleSlotUpload(i)))`
- `handleSlotUpload(index)` reads from `slotFiles[index]`, processes, sets done/idle

## Files Changed

- `app/image/page.tsx` — all changes (state, JSX, CSS)
