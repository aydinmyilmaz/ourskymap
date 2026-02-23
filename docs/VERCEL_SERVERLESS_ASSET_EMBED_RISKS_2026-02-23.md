# Vercel Serverless Asset Embed Risks (2026-02-23)

## Context

To fix Vercel's `250 MB unzipped function size` error, local filesystem reads of large `public/` assets were removed from runtime paths that affected serverless tracing.

Key change summary:

- `lib/poster.ts`
  - Removed `existsSync/path` based public-asset existence checks.
  - `resolvePosterPublicAssetUrl()` now uses URL preference/fallback logic only.
- `app/api/redeem-coupon/route.ts`
  - Moon/vinyl asset embedding switched from local `readFileSync(process.cwd()/public/...)` to HTTP `fetch` using app base URL.
  - Keeps fallback behavior to absolute URLs when embedding fails.

This solved serverless bundle inflation from:

- `public/moon-phases/*`
- `public/vinyl/backgrounds/*`
- `public/vinyl/labels/*`

## Production Risks

1. Wrong `NEXT_PUBLIC_APP_URL`
- Symptom: asset embed `fetch` fails, export may fallback to absolute URLs or render without expected images.
- Affected area: `app/api/redeem-coupon/route.ts`.

2. Auth-protected deployment access
- Symptom: server-side fetch to static assets returns `401/403` in protected environments.
- Affected area: coupon export flow for moon/vinyl assets.

3. Network dependency introduced for embed
- Symptom: intermittent DNS/TLS/timeout causes slower exports or occasional embed failure.
- Affected area: `POST /api/redeem-coupon`.

4. Render worker reachability mismatch
- Symptom: absolute URL fallback works in app runtime but not in isolated render worker context; image may be missing in final export.
- Affected area: Fly/local rendering fallback chain.

5. Silent missing asset risk in poster path
- Symptom: because local existence checks were removed, wrong paths can survive longer and fail only at render/consumer stage.
- Affected area: moon asset URL resolution in poster rendering.

6. Function size regression from fonts (secondary)
- Symptom: future font growth can still enlarge `api/redeem-coupon` trace (fonts are intentionally local).
- Affected area: export routes that embed local font files.

## Detection Signals

Watch these logs/metrics:

- `api/redeem-coupon` error rate and p95 latency
- export success ratio (`svg/png/pdf` generated)
- remote worker fallback frequency
- HTTP status for internal static fetches (`200` vs `401/403/404/5xx`)

Practical indicators:

- Missing moon phase disk in output
- Missing vinyl label/background in output
- Coupons consumed but zip missing expected visuals

## Immediate Mitigations

1. Ensure `NEXT_PUBLIC_APP_URL` is set to the exact production domain (no trailing slash).
2. Verify static asset endpoints are server-reachable from serverless context:
   - `/moon_gold.png`
   - `/moon-phases/gold/1.png`
   - `/vinyl/backgrounds/a.jpg`
   - `/vinyl/labels/vintage-gold.png`
3. If auth middleware is enabled, allow internal server-side static fetches.
4. Keep fallback to absolute URLs enabled (current behavior).

## Recommended Hardening (Next Iteration)

1. Add retry with short timeout for asset fetch
- Example policy: `2 attempts`, `1500-2500 ms timeout`.

2. Add explicit structured logs around embed
- Asset path
- status code
- elapsed time
- fallback decision

3. Add low-cost runtime guard
- If embed fails for all assets in a request, emit warning with request id/coupon id.

4. Add canary smoke test endpoint/script
- Validates asset fetch + one render for sky/vinyl after deployment.

## Validation Checklist for Future Deploys

1. `npm run build` passes.
2. Confirm `api/skymap`/`api/poster` traces do not include massive `public/moon-phases` or `public/vinyl/*` directories.
3. Run one real coupon redemption test for:
   - sky map (moon assets)
   - vinyl (label/background assets)
4. Open generated zip and verify:
   - SVG contains expected image refs/data URIs
   - PNG/PDF include the same visuals

## Owner Notes

- This is an operational risk note, not a rollback request.
- If incidents appear, first inspect `NEXT_PUBLIC_APP_URL` and static fetch accessibility before code rollback.
