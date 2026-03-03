# OurSkyMap

Single-product Next.js app for personalized **Star Map** design, checkout, download, and physical print funnel.

## Scope

This deployment only serves:
- `/ourskymap`
- `/checkout`
- `/download`
- `/print-order`

Legacy product routes (`/citymap`, `/vinyl`, `/soundwave`, `/image`, `/mockup`) are intentionally disabled.

## Dev

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deployment

- Push to GitHub
- Import repository in Vercel
- Configure required env vars
- Deploy

## Environment Variables

Core:
- `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ORDERS_TABLE` (default: `orders`)
- `SUPABASE_STORAGE_BUCKET` (default: `generated-maps`)

Physical print funnel:
- `SUPABASE_PRINT_ORDERS_TABLE` (default: `print_orders`)
- `SUPABASE_PRINT_ASSETS_BUCKET` (default: `print-order-assets`)
- `PAYONEER_ENABLED` (`false` for current mock flow)

## Supabase SQL

- Base orders table: `supabase/sql/orders_schema.sql`
- Physical print table: `supabase/sql/print_orders_schema.sql`

## Technical docs

- Checkout flow: `docs/CHECKOUT_COUPON_FLOW.md`
- Print order flow: `docs/PRINT_ORDER_FLOW.md`
- OurSkyMap technical notes: `docs/OURSKYMAP_TECHNICAL.md`
- Archived non-sky docs: `docs/archive/`
