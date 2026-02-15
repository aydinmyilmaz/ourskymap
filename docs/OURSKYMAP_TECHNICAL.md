# OurSkyMap Technical Documentation

This document explains how the Star Map page was renamed and structured so it can later be deployed as a separate app on `ourskymap.com` with minimal rework.

## 1. Current Routing Strategy

### Primary route
- `app/ourskymap/page.tsx`
- This is now the canonical UI route for the Star Map designer.

### Legacy route (backward compatibility)
- `app/design/page.tsx`
- It performs a server redirect to `/ourskymap`.
- Result: existing links/bookmarks to `/design` keep working on current Vercel deployment.

## 2. Current API Strategy

### Canonical Star Map API
- `app/api/skymap/route.ts`
- Accepts Star Map payload and returns SVG (`image/svg+xml`).
- Internally calls shared renderer: `renderPosterSvg` from `lib/poster.ts`.

### Legacy API kept
- `app/api/poster/route.ts`
- Still exists for compatibility with older clients.
- Can be removed later after all clients are migrated.

## 3. End-to-End Render Flow

1. User interacts with `app/ourskymap/page.tsx`.
2. Location/time normalization request goes to `/api/normalize-time`.
3. Star map request is sent to `/api/skymap`.
4. API calls `lib/poster.ts` (`renderPosterSvg`).
5. SVG is returned and displayed in the preview.

## 4. Why This Structure Helps Future Split

### Today (single Vercel app)
- One codebase serves:
  - Star map (`/ourskymap`)
  - City map (`/citymap`)
  - Informational pages (`/faq`, `/blog`, `/what-is-star-map`)
- Legacy URLs remain valid.

### Later (separate `ourskymap.com` app)
- Minimal move scope is predictable:
  - `app/ourskymap`
  - `app/api/skymap`
  - shared logic: `lib/poster.ts`, `lib/types.ts`, `lib/astro.ts`, `lib/geometry.ts`, related data files.
- Since UI already uses `/ourskymap` + `/api/skymap`, no major route rename will be needed during split.

## 5. Migration Plan for `ourskymap.com`

1. Create new repo/app and copy Star Map routes + shared libs listed above.
2. Keep the same API contract for `/api/skymap` request body.
3. Set production domain to `ourskymap.com`.
4. On old app/domain, keep `/design` and `/ourskymap` as redirects to the new domain for a transition period.
5. After traffic fully migrates, remove legacy `/design` and optionally remove `/api/poster`.

## 6. API Contract Notes

### Response
- Content-Type: `image/svg+xml; charset=utf-8`
- Body: raw SVG string

### Input payload (high-level)
- Location: `latitude`, `longitude`, `locationLabel`
- Time: `timeUtcIso`, `timeZone`, `timeLocal`
- Render params: star chart settings (`params`)
- Poster params: layout/typography/palette (`poster`)

Keep these fields stable to avoid frontend/backend drift across deployments.

## 7. Operational Recommendations

- Treat `/ourskymap` and `/api/skymap` as stable public paths from now on.
- Keep `/design` and `/api/poster` as temporary compatibility aliases only.
- When split starts, move shared rendering code first, then UI, then redirects.
