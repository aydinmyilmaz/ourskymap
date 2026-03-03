# OurSkyMap Technical Documentation

This deployment is single-product and serves only the Star Map experience.

## Routes

- Designer: `app/ourskymap/page.tsx`
- Checkout: `app/checkout/page.tsx`
- Download: `app/download/page.tsx`
- Physical print checkout: `app/print-order/page.tsx`
- Print success: `app/print-order/success/page.tsx`

Legacy product routes (`/citymap`, `/vinyl`, `/soundwave`, `/image`, `/mockup`) are disabled via `middleware.ts` with HTTP `410 Gone`.

## APIs

Core:
- `POST /api/redeem-coupon`
- `GET /api/order-status`
- `GET /api/download-order-file`
- `POST /api/skymap`
- `POST /api/render-export`

Print funnel:
- `GET /api/print-orders/pricing`
- `POST /api/print-orders/checkout`
- `GET /api/print-orders/status`

## End-to-end flow

1. User builds map in `/ourskymap`.
2. Checkout draft is persisted (`ourskymap_checkout_draft_v2`).
3. `/checkout` redeems coupon and creates downloadable order ZIP.
4. User lands on `/download?orderCode=...` and downloads files.
5. Optional post-download step routes to `/print-order` for physical order intent.
6. Print order is saved in `print_orders` table with mock payment status while Payoneer is disabled.

## Key modules

- Star renderer: `lib/poster.ts`
- Core types: `lib/types.ts`
- Checkout draft type: `lib/checkout.ts`
- Print pricing rules: `lib/print-pricing.ts`
- Payment scaffold: `lib/payments/payoneer.ts`
- Print provider abstraction: `lib/print-provider/index.ts`

## Supabase

- Source orders table: `orders` (`supabase/sql/orders_schema.sql`)
- Print orders table: `print_orders` (`supabase/sql/print_orders_schema.sql`)
