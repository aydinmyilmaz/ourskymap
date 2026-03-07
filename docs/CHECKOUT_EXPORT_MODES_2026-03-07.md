# Checkout Export Modes and Coupon Flow

## Summary

This document explains the checkout and download flow changes made on March 7, 2026.

The main goal was to separate two concerns that had been mixed together:

- How an order is authorized: `with coupon` vs `without coupon`
- How the final downloadable files are produced: `Quick` vs `High Quality`

The result is a cleaner flow model with two independent axes instead of one hard-coded split.

## Previous State

Before these changes, the system effectively had two different pipelines:

1. `Continue with Coupon`
   - Called `/api/redeem-coupon`
   - Validated the coupon in Supabase
   - Generated downloadable assets on the server
   - Uploaded the ZIP to Supabase storage
   - Used the stored order record for later download and print checkout

2. `Continue Without Coupon`
   - Used a dev-only shortcut path
   - Did not create a normal order record in the same way
   - Built the ZIP in the browser
   - Relied on local session/browser state

This created several practical problems:

- Download behavior depended on which button the user clicked
- Quick and High Quality rendering could drift
- Font handling was not equally reliable in both paths
- Fixes applied to one pipeline could be missed in the other
- "Coupon" and "render engine" were coupled even though they are separate decisions

## Problems We Observed

### 1. Text disappearing in coupon flow

Coupon flow regenerated the poster again on the server, while the no-coupon path reused the already prepared SVG. That mismatch allowed text output to differ between flows.

### 2. Font mismatches

Rendered output could use a different font than the one selected in the UI. The main reasons were:

- backend export and browser export were not fully aligned
- local font files were not always loaded explicitly by the server renderer
- `Times New Roman` was exposed in the UI but was not mapped cleanly through the poster font model

### 3. Export fidelity differences

The large `24x32` export path was capped below 300 DPI because of the pixel limit. This was fixed by raising the export ceiling just enough to support `24x32` at 300 DPI.

## New State

The checkout system now works with two explicit dimensions:

- `downloadMode` in UI
  - `Quick`
  - `High Quality`
- `exportMode` internally
  - `browser`
  - `server`
- `checkoutMode`
  - `with-coupon`
  - `without-coupon`

That means the system conceptually supports four combinations:

1. `Quick + with coupon`
2. `Quick + without coupon`
3. `High Quality + with coupon`
4. `High Quality + without coupon`

## What Changed

### 1. Download mode was separated from coupon/no-coupon

We introduced an explicit download mode toggle in checkout. The default is `Quick`.

This means:

- coupon choice only decides whether coupon validation is required
- download mode only decides whether the final downloadable files are built in the browser or through backend rendering

### UI label vs technical implementation

The user-facing labels are now:

- `Quick`
- `High Quality`

Internally, those map to:

- `Quick` -> `browser`
- `High Quality` -> `server`

Inside backend rendering, there is still a second technical distinction:

- local app-server rendering
- remote Fly render-worker rendering

That distinction is operational and should not be exposed in checkout UI.

### 2. Shared backend export logic was extracted

A shared module was added:

- [`lib/order-export.ts`](/Users/aydin/Desktop/apps/ourskymap/lib/order-export.ts)

This module centralizes:

- SVG preparation
- moon asset embedding
- local font embedding
- raster export
- PDF generation
- ZIP generation
- backend export mode normalization

This removes duplicated logic from the coupon route and makes the backend export path easier to maintain.

### 3. Coupon route was simplified

The coupon route now focuses on:

- validating or seeding the order code
- deciding whether the selected export mode is `browser` or `server`
- uploading the prepared source asset or generated ZIP
- updating the order row

It no longer owns a large copy of the rendering pipeline.

### 4. A non-coupon preparation route was added

New route:

- [`app/api/prepare-order/route.ts`](/Users/aydin/Desktop/apps/ourskymap/app/api/prepare-order/route.ts)

This allows the no-coupon path to behave like a normal order path instead of a special dev-only branch.

### 5. Print-order download behavior now follows `exportMode`

The print-order page now uses the selected export mode:

- `Quick` / `browser` mode downloads by building the ZIP from the local checkout draft
- `High Quality` / `server` mode downloads the stored file from backend output

Legacy `dev=1` support remains as backward compatibility, but it is no longer the primary design.

### 6. Source size parsing now supports more file types

Previously, print size detection assumed ZIP-only filenames.

Now it also supports:

- `.svg`
- `.png`
- `.pdf`
- `.zip`

This is required because Quick mode stores the prepared SVG as the source asset instead of a ZIP.

## Quality and Reliability Decisions

### Why `Quick` is the default

The default was intentionally set to `Quick` because backend usage is still a product and operational decision, not a finalized platform rule.

This keeps the system flexible while preserving the option to switch to `High Quality` when:

- consistent server-side rendering is preferred
- repeatable downloads across devices are more important
- browser-side rasterization becomes a maintenance burden

### Which pipeline is more robust today

At the time of this change:

- `High Quality` / backend export is still the more robust and deterministic pipeline
- `Quick` / browser export is still the lighter and more flexible pipeline

The new architecture does not claim that both engines are identical. It makes the difference explicit and controllable.

### Important deployment note

`High Quality` does not automatically mean "Fly worker".

It means "backend rendering", and backend rendering currently has two technical implementations:

1. local rendering in the app server
2. remote rendering through the Fly worker

Which one is active depends on configuration:

- if `EXPORT_ENGINE=local`, backend rendering happens inside the app server process
- if `EXPORT_ENGINE=fly`, backend rendering is delegated to the Fly render worker

In other words:

- `Quick` = browser
- `High Quality` = backend
- backend = local app server or Fly worker, depending on environment configuration

## Font-Related Fixes Included in This Work

The following font issues were also addressed as part of this effort:

- backend export now explicitly provides local font files to the renderer
- coupon export uses the prepared SVG path more consistently
- `Times New Roman` now maps through the poster font model instead of silently falling back to a generic serif path

These changes reduce the chance that the chosen font in the designer differs from the downloaded file.

## Export Fidelity Fix Included in This Work

The maximum export pixel ceiling was raised so that `24x32` can render at full 300 DPI.

This was intentionally done with a minimal change rather than a broader render-system rewrite.

## Files Introduced or Significantly Updated

- [`app/api/prepare-order/route.ts`](/Users/aydin/Desktop/apps/ourskymap/app/api/prepare-order/route.ts)
- [`app/api/redeem-coupon/route.ts`](/Users/aydin/Desktop/apps/ourskymap/app/api/redeem-coupon/route.ts)
- [`app/checkout/page.tsx`](/Users/aydin/Desktop/apps/ourskymap/app/checkout/page.tsx)
- [`app/print-order/page.tsx`](/Users/aydin/Desktop/apps/ourskymap/app/print-order/page.tsx)
- [`lib/order-export.ts`](/Users/aydin/Desktop/apps/ourskymap/lib/order-export.ts)
- [`lib/checkout.ts`](/Users/aydin/Desktop/apps/ourskymap/lib/checkout.ts)
- [`lib/print-size-utils.ts`](/Users/aydin/Desktop/apps/ourskymap/lib/print-size-utils.ts)
- [`lib/poster.ts`](/Users/aydin/Desktop/apps/ourskymap/lib/poster.ts)
- [`lib/types.ts`](/Users/aydin/Desktop/apps/ourskymap/lib/types.ts)

## Remaining Tradeoffs

Some tradeoffs still exist and are intentional for now:

- Quick mode still depends on local checkout draft availability for ZIP generation
- High Quality mode is still the better choice for repeatable downloads across devices
- browser and backend export engines are still different implementations even though the flow model is now cleaner

## Recommended Next Step

If the product decision becomes clear later, the next clean simplification would be:

- keep both `with coupon` and `without coupon`
- keep only one export engine in production

Until then, the current design keeps both options explicit without mixing authorization logic with rendering logic.
