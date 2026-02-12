# Space Map (Sky Chart)

Next.js app that generates a printable sky chart (SVG) for a given location and local time.

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
