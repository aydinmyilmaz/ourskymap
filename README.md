# OurSkyMap

Standalone Next.js app for personalized star map products and related checkout/download flows.

## Dev

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy (Vercel)

- Push to GitHub
- Import the repo in Vercel
- Deploy

## Notes

- Time input is interpreted as **local time for the selected location** and normalized to UTC for calculations.
  - Example: Istanbul `February 12, 2026 23:00` (Europe/Istanbul, UTC+03:00) ⇒ `2026-02-12T20:00:00Z`.
- When comparing with other sites (Stellarium / Heavens-Above), make sure you are comparing the same instant (local vs UTC).
- Sun/Moon/planet positions are computed using `astronomy-engine`. Stars/constellations depend on the bundled catalog + rendering parameters, so the map may not match other catalogs pixel-for-pixel.
- The app generates SVG server-side in `app/api/chart/route.ts`.
- Location search uses Nominatim via `app/api/geocode/route.ts`.
- Star/constellation datasets are in `data/`.

## Technical docs

- OurSkyMap routing/API migration notes: `docs/OURSKYMAP_TECHNICAL.md`
- Checkout coupon flow: `docs/CHECKOUT_COUPON_FLOW.md`
- Star density normalization note: `docs/STAR_DENSITY_NORMALIZATION_NOTE.md`
