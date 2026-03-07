import { NextResponse } from 'next/server';
import type { CheckoutDraft } from '../../../lib/checkout';
import {
  buildOrderExportBundle,
  createDirectOrderCode,
  isValidEmail,
  normalizeExportMode,
  prepareOrderSvg,
  type ExportMode
} from '../../../lib/order-export';
import { getSupabaseAdminClient } from '../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

function buildOrderInsert(input: {
  orderCode: string;
  draft: CheckoutDraft;
  email: string;
  fileUrl: string;
}) {
  return {
    order_code: input.orderCode,
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
}): Promise<string> {
  const ts = Date.now();

  if (input.exportMode === 'browser') {
    const prepared = await prepareOrderSvg({ draft: input.draft, orderCode: input.orderCode });
    const fileName = `star-maps/${prepared.fileToken}-${ts}.svg`;
    const upload = await input.supabase.storage.from(input.storageBucket).upload(fileName, Buffer.from(prepared.exportSvg, 'utf-8'), {
      contentType: 'image/svg+xml; charset=utf-8',
      upsert: true
    });
    if (upload.error) throw new Error(`Storage upload failed: ${upload.error.message}`);
    return input.supabase.storage.from(input.storageBucket).getPublicUrl(fileName).data.publicUrl;
  }

  const bundle = await buildOrderExportBundle({ draft: input.draft, orderCode: input.orderCode });
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
      email?: string;
      draft?: CheckoutDraft;
      exportMode?: string;
    };

    const email = (body.email || '').trim().toLowerCase();
    const draft = body.draft;
    const exportMode = normalizeExportMode(body.exportMode);
    const orderCode = createDirectOrderCode();

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
    const ordersTable = (process.env.SUPABASE_ORDERS_TABLE ?? 'orders').trim();
    const storageBucket = (process.env.SUPABASE_STORAGE_BUCKET ?? 'generated-maps').trim();
    const fileUrl = await uploadPreparedAsset({
      supabase,
      storageBucket,
      orderCode,
      draft,
      exportMode
    });

    const insert = await supabase.from(ordersTable).insert(buildOrderInsert({ orderCode, draft, email, fileUrl }));
    if (insert.error) {
      throw new Error(`Failed to create order: ${insert.error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: exportMode === 'browser' ? 'Browser export is ready.' : 'Your map is ready.',
      orderCode,
      downloadUrl: fileUrl
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        success: false,
        message: e?.message ?? 'Failed to prepare order.'
      },
      { status: 500 }
    );
  }
}
