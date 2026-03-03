# Checkout Coupon Flow (SkyMap only)

This app now supports a single-product SkyMap checkout and download flow.

## Pages

- `app/ourskymap/page.tsx`
- `app/checkout/page.tsx`
- `app/download/page.tsx`

## APIs

- `POST /api/redeem-coupon`
- `GET /api/order-status`
- `GET /api/download-order-file`

## Runtime flow

1. User customizes map in `/ourskymap`.
2. User clicks checkout and draft is stored under `ourskymap_checkout_draft_v2`.
3. `/checkout` collects email + coupon.
4. `POST /api/redeem-coupon` validates coupon/order and generates ZIP export.
5. User is redirected to `/download?orderCode=...`.
6. User downloads files.
7. Optional: user continues to `/print-order` from post-download prompt.

## Notes

- This deployment intentionally supports only SkyMap.
- Legacy product routes are disabled with HTTP `410 Gone`.
