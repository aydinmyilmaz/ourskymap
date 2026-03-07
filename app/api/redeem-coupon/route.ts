import { NextResponse } from 'next/server';
import type { CheckoutDraft } from '../../../lib/checkout';
import {
  buildOrderExportBundle,
  getExportEngineLabel,
  isValidEmail,
  normalizeExportMode,
  prepareOrderSvg,
  type ExportMode
} from '../../../lib/order-export';
import { getSupabaseAdminClient } from '../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

type OrderRow = {
  id: string;
  order_code: string;
  status: 'pending' | 'completed';
  used_at: string | null;
  pdf_url: string | null;
};

function isSimulationCoupon(orderCode: string): boolean {
  const simulationEnabled = (process.env.ETSY_SIMULATION_MODE ?? 'true').trim().toLowerCase() === 'true';
  if (!simulationEnabled) return false;
  const allowAny = (process.env.ETSY_SIMULATION_ALLOW_ANY ?? 'true').trim().toLowerCase() === 'true';
  if (allowAny) return true;
  const prefix = (process.env.ETSY_SIMULATION_PREFIX ?? 'SIM-').trim();
  return prefix.length > 0 && orderCode.toUpperCase().startsWith(prefix.toUpperCase());
}

function buildOrderUpdate(input: {
  draft: CheckoutDraft;
  email: string;
  fileUrl: string;
}) {
  return {
    status: 'completed',
    used_at: new Date().toISOString(),
    customer_email: input.email,
    location: input.draft.mapData.city,
    date: input.draft.mapData.date ?? '',
    time: input.draft.mapData.time ?? '',
    title: input.draft.mapData.title,
    names: input.draft.mapData.names ?? '',
    font: input.draft.mapData.font,
    pdf_url: input.fileUrl
  };
}

async function uploadPreparedAsset(input: {
  supabase: ReturnType<typeof getSupabaseAdminClient>;
  storageBucket: string;
  orderCode: string;
  draft: CheckoutDraft;
  exportMode: ExportMode;
  assetBaseUrl: string;
}): Promise<string> {
  const ts = Date.now();

  if (input.exportMode === 'browser') {
    const prepared = await prepareOrderSvg({ draft: input.draft, orderCode: input.orderCode, assetBaseUrl: input.assetBaseUrl });
    const fileName = `star-maps/${prepared.fileToken}-${ts}.svg`;
    const upload = await input.supabase.storage.from(input.storageBucket).upload(fileName, Buffer.from(prepared.exportSvg, 'utf-8'), {
      contentType: 'image/svg+xml; charset=utf-8',
      upsert: true
    });
    if (upload.error) throw new Error(`Storage upload failed: ${upload.error.message}`);
    return input.supabase.storage.from(input.storageBucket).getPublicUrl(fileName).data.publicUrl;
  }

  const bundle = await buildOrderExportBundle({ draft: input.draft, orderCode: input.orderCode, assetBaseUrl: input.assetBaseUrl });
  const fileName = `star-maps/${bundle.fileToken}-${ts}.zip`;
  const upload = await input.supabase.storage.from(input.storageBucket).upload(fileName, bundle.zipBuffer, {
    contentType: 'application/zip',
    upsert: true
  });
  if (upload.error) throw new Error(`Storage upload failed: ${upload.error.message}`);
  return input.supabase.storage.from(input.storageBucket).getPublicUrl(fileName).data.publicUrl;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      couponCode?: string;
      email?: string;
      draft?: CheckoutDraft;
      exportMode?: string;
    };

    const couponCode = (body.couponCode || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const draft = body.draft;
    const exportMode = normalizeExportMode(body.exportMode);
    const ordersTable = (process.env.SUPABASE_ORDERS_TABLE ?? 'orders').trim();
    const storageBucket = (process.env.SUPABASE_STORAGE_BUCKET ?? 'generated-maps').trim();
    const assetBaseUrl = new URL(req.url).origin;

    if (!couponCode) {
      return NextResponse.json({ success: false, message: 'Coupon code is required.' }, { status: 400 });
    }
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ success: false, message: 'Please enter a valid email address.' }, { status: 400 });
    }
    if (!draft?.renderRequest || !draft?.previewSvg || !draft?.mapData) {
      return NextResponse.json({ success: false, message: 'Missing map data. Please return to designer.' }, { status: 400 });
    }
    if (draft.productType && draft.productType !== 'sky') {
      return NextResponse.json(
        {
          success: false,
          message: `Unsupported draft productType "${draft.productType}". This checkout accepts sky maps only.`
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    let order: OrderRow | null = null;
    const lookup = await supabase
      .from(ordersTable)
      .select('id,order_code,status,used_at,pdf_url')
      .eq('order_code', couponCode)
      .maybeSingle();

    if (lookup.error) {
      throw new Error(`Failed to validate coupon: ${lookup.error.message}`);
    }
    order = lookup.data as OrderRow | null;

    if (!order && isSimulationCoupon(couponCode)) {
      const seeded = await supabase
        .from(ordersTable)
        .insert({
          order_code: couponCode,
          status: 'pending'
        })
        .select('id,order_code,status,used_at,pdf_url')
        .single();

      if (seeded.error) {
        throw new Error(`Failed to create simulated order: ${seeded.error.message}`);
      }
      order = seeded.data as OrderRow;
    }

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Invalid coupon code. Please check your Etsy order confirmation.' },
        { status: 400 }
      );
    }

    const allowSimulationRerender = order.status === 'completed' && isSimulationCoupon(couponCode);

    if (order.status === 'completed' && !allowSimulationRerender) {
      const usedOn = order.used_at ? new Date(order.used_at).toLocaleString('en-US') : 'a previous date';
      return NextResponse.json(
        {
          success: false,
          message: `This coupon was already used on ${usedOn}.`,
          orderCode: order.order_code,
          downloadUrl: order.pdf_url
        },
        { status: 400 }
      );
    }

    const fileUrl = await uploadPreparedAsset({
      supabase,
      storageBucket,
      orderCode: couponCode,
      draft,
      exportMode,
      assetBaseUrl
    });

    const update = await supabase
      .from(ordersTable)
      .update(buildOrderUpdate({ draft, email, fileUrl }))
      .eq('order_code', couponCode);

    if (update.error) {
      throw new Error(`Failed to update order: ${update.error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: exportMode === 'browser' ? 'Coupon validated. Browser export is ready.' : 'Your map is ready.',
      orderCode: couponCode,
      downloadUrl: fileUrl,
      engineLabel: getExportEngineLabel(exportMode)
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        success: false,
        message: e?.message ?? 'Failed to process coupon.'
      },
      { status: 500 }
    );
  }
}
