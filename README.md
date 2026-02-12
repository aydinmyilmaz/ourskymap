# Space Map (Sky Chart)

Next.js app that generates a printable sky chart (SVG) for a given location and UTC time.

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

- The app generates SVG server-side in `app/api/chart/route.ts`.
- Location search uses Nominatim via `app/api/geocode/route.ts`.
- Star/constellation datasets are in `data/`.
