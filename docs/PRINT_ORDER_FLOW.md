# Print Order Flow (MVP)

## Purpose

Allow users to place a physical print order after downloading their SkyMap ZIP.

## User flow

1. User lands on `/download?orderCode=...`.
2. User clicks `Download Files (ZIP)`.
3. Page shows post-download prompt: physical print yes/no.
4. `Yes` routes to `/print-order?orderCode=...`.
5. User selects:
- size
- print option
- quantity
- shipping details
- optional artwork replacement upload
6. User submits with mock payment (`PAYONEER_ENABLED=false`).
7. Success page shown at `/print-order/success?printOrderCode=...`.

## APIs

- `GET /api/print-orders/pricing`
- `POST /api/print-orders/checkout`
- `GET /api/print-orders/status`

## Pricing behavior (temporary)

- Uses Etsy-inspired ranges.
- Exact final table is pending.
- Current checkout stores estimated totals.

## Data model

- Supabase table: `print_orders`
- SQL file: `supabase/sql/print_orders_schema.sql`

## Payment

- Payoneer integration scaffold exists in `lib/payments/payoneer.ts`.
- Current flow uses mock success status while Payoneer remains disabled.
