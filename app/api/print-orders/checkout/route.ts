import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import { calculatePrintTotals, parsePrintCurrency } from '../../../../lib/print-pricing';
import { isPayoneerEnabled } from '../../../../lib/payments/payoneer';
import type { PrintOptionKey, PrintSizeKey } from '../../../../lib/print-types';
import { parsePrintSizeFromZipName } from '../../../../lib/print-size-utils';

export const runtime = 'nodejs';

function createPrintOrderCode(): string {
  return `PO-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

function getSafeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function asString(form: FormData, key: string): string {
  return String(form.get(key) ?? '').trim();
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const orderCode = asString(form, 'orderCode');
    const size = asString(form, 'size') as PrintSizeKey;
    const printOption = asString(form, 'printOption') as PrintOptionKey;
    const quantity = Number.parseInt(asString(form, 'quantity') || '1', 10);
    const currency = parsePrintCurrency(asString(form, 'currency'));

    const shippingName = asString(form, 'shippingName');
    const customerEmail = asString(form, 'customerEmail').toLowerCase();
    const phone = asString(form, 'phone');
    const addressLine1 = asString(form, 'addressLine1');
    const addressLine2 = asString(form, 'addressLine2');
    const city = asString(form, 'city');
    const stateRegion = asString(form, 'stateRegion');
    const postalCode = asString(form, 'postalCode');
    const countryCode = asString(form, 'countryCode').toUpperCase();

    if (!orderCode) {
      return NextResponse.json({ success: false, message: 'orderCode is required.' }, { status: 400 });
    }
    if (!size || !printOption) {
      return NextResponse.json({ success: false, message: 'Size and print option are required.' }, { status: 400 });
    }
    if (!Number.isFinite(quantity) || quantity < 1) {
      return NextResponse.json({ success: false, message: 'Quantity must be at least 1.' }, { status: 400 });
    }
    if (!shippingName || !addressLine1 || !city || !postalCode || !countryCode) {
      return NextResponse.json(
        { success: false, message: 'Shipping name, address, city, postal code and country are required.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const ordersTable = (process.env.SUPABASE_ORDERS_TABLE ?? 'orders').trim();
    const printOrdersTable = (process.env.SUPABASE_PRINT_ORDERS_TABLE ?? 'print_orders').trim();
    const printAssetsBucket = (process.env.SUPABASE_PRINT_ASSETS_BUCKET ?? 'print-order-assets').trim();

    const { data: sourceOrder, error: sourceErr } = await supabase
      .from(ordersTable)
      .select('order_code,status,pdf_url,customer_email')
      .eq('order_code', orderCode)
      .maybeSingle();

    if (sourceErr) throw new Error(sourceErr.message);
    if (!sourceOrder || sourceOrder.status !== 'completed') {
      return NextResponse.json({ success: false, message: 'Source order is not ready for print checkout.' }, { status: 400 });
    }
    const sourceOrderPrintSize = parsePrintSizeFromZipName(sourceOrder.pdf_url || '');

    let artworkSourceType: 'order_file' | 'upload' = 'order_file';
    let artworkUrl = (sourceOrder.pdf_url || '').trim();

    const artworkFileValue = form.get('artworkFile');
    if (artworkFileValue instanceof File && artworkFileValue.size > 0) {
      if (!artworkFileValue.type.startsWith('image/')) {
        return NextResponse.json({ success: false, message: 'Uploaded artwork must be an image file.' }, { status: 400 });
      }

      const rawBytes = Buffer.from(await artworkFileValue.arrayBuffer());
      const safeOrderCode = orderCode.replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeFileName = getSafeFileName(artworkFileValue.name || 'artwork.png');
      const filePath = `print-orders/${safeOrderCode}/${Date.now()}-${safeFileName}`;

      const upload = await supabase.storage.from(printAssetsBucket).upload(filePath, rawBytes, {
        contentType: artworkFileValue.type || 'image/png',
        upsert: true
      });
      if (upload.error) {
        throw new Error(`Artwork upload failed: ${upload.error.message}`);
      }

      const { data: publicFile } = supabase.storage.from(printAssetsBucket).getPublicUrl(filePath);
      artworkSourceType = 'upload';
      artworkUrl = publicFile.publicUrl;
    }

    if (artworkSourceType === 'order_file' && sourceOrderPrintSize && size !== sourceOrderPrintSize) {
      return NextResponse.json(
        {
          success: false,
          message: `Size must match your original digital order (${sourceOrderPrintSize}) unless you upload a replacement artwork.`
        },
        { status: 400 }
      );
    }

    if (!artworkUrl) {
      return NextResponse.json({ success: false, message: 'Could not resolve artwork source URL.' }, { status: 400 });
    }

    const totals = calculatePrintTotals({
      size,
      option: printOption,
      quantity,
      currency
    });

    const payoneerEnabled = isPayoneerEnabled();
    const paymentStatus = payoneerEnabled ? 'pending_real_payment' : 'completed_mock';
    const printOrderCode = createPrintOrderCode();

    const insert = await supabase
      .from(printOrdersTable)
      .insert({
        print_order_code: printOrderCode,
        source_order_code: sourceOrder.order_code,
        source_product_type: 'sky',
        artwork_source_type: artworkSourceType,
        artwork_url: artworkUrl,
        print_option: printOption,
        size,
        quantity,
        currency,
        unit_price_cents: Math.round(totals.unit * 100),
        subtotal_cents: Math.round(totals.subtotal * 100),
        shipping_cents: Math.round(totals.shipping * 100),
        total_cents: Math.round(totals.total * 100),
        customer_email: customerEmail || sourceOrder.customer_email || null,
        shipping_name: shippingName,
        phone: phone || null,
        address_line1: addressLine1,
        address_line2: addressLine2 || null,
        city,
        state_region: stateRegion || null,
        postal_code: postalCode,
        country_code: countryCode,
        payment_provider: 'payoneer',
        payment_status: paymentStatus,
        provider_name: null,
        provider_order_id: null,
        provider_status: 'not_submitted'
      })
      .select('print_order_code,payment_status,total_cents,currency')
      .single();

    if (insert.error) throw new Error(insert.error.message);

    return NextResponse.json({
      success: true,
      printOrderCode: insert.data.print_order_code,
      paymentStatus: insert.data.payment_status,
      currency: insert.data.currency,
      total: Number(insert.data.total_cents ?? 0) / 100
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message ?? 'Failed to create print order.' },
      { status: 500 }
    );
  }
}
