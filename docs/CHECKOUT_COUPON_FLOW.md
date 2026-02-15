# Checkout Coupon Flow (Supabase + Etsy-ready)

This project now supports a coupon-first checkout flow for `ourskymap`.

## Pages and APIs

- UI:
  - `app/ourskymap/page.tsx` (designer)
  - `app/checkout/page.tsx` (coupon checkout)
  - `app/download/page.tsx` (download result)
- API:
  - `app/api/redeem-coupon/route.ts`
  - `app/api/order-status/route.ts`

## Runtime flow

1. User customizes map in `/ourskymap`.
2. User clicks `Checkout`.
3. App builds fresh render payload and SVG, then stores checkout draft in `localStorage` (`ourskymap_checkout_draft_v1`).
4. User is redirected to `/checkout`.
5. User enters email + coupon code.
6. `POST /api/redeem-coupon`:
   - validates coupon in Supabase `orders` table
   - if simulation is enabled and code matches prefix, creates a pending order row
   - rejects already-completed codes
   - renders SVG (or fallback preview SVG)
   - uploads file to Supabase Storage
   - updates order row to `completed`
7. User is redirected to `/download?orderCode=...`.
8. `/download` calls `GET /api/order-status` and shows downloadable file URL.

## Environment variables

Use `.env.example` as template.

Required now:
- `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ORDERS_TABLE` (default `orders`)
- `SUPABASE_STORAGE_BUCKET` (default `generated-maps`)

Simulation now:
- `ETSY_SIMULATION_MODE=true`
- `ETSY_SIMULATION_PREFIX=SIM-`
- `ETSY_SIMULATION_ALLOW_ANY=true` (accept any code while Etsy is inactive)

Future Etsy integration:
- `ETSY_API_KEY`
- `ETSY_CLIENT_ID`
- `ETSY_CLIENT_SECRET`
- `ETSY_SHOP_ID`
- `ETSY_WEBHOOK_SIGNING_SECRET`

## Supabase setup

Run schema:
- `supabase/sql/orders_schema.sql`

Create storage bucket:
- name: `generated-maps` (or match env var)
- recommended: public bucket for direct file URL in MVP

## Coupon simulation behavior

If `ETSY_SIMULATION_MODE=true` and code starts with `ETSY_SIMULATION_PREFIX` (default `SIM-`):
- unknown code is auto-seeded as `pending`
- first redemption succeeds
- second redemption fails as `completed`

This lets you test end-to-end before Etsy is active.

## Simulating Etsy order push to Supabase

Use the seed script to write `pending` order codes as if Etsy sent them:

```bash
npm run simulate:etsy -- --count 5 --prefix ETSY- --start-at 3000
```

This creates:
- `ETSY-3000`
- `ETSY-3001`
- `ETSY-3002`
- `ETSY-3003`
- `ETSY-3004`

Then test in checkout by entering one of these codes.

For strict DB-only validation, set:
- `ETSY_SIMULATION_ALLOW_ANY=false`
