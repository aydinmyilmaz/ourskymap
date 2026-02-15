import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

function fileNameFor(orderCode: string, contentType: string): string {
  const safe = orderCode.replace(/[^a-zA-Z0-9_-]/g, '_');
  if (contentType.includes('zip')) return `custom-map-${safe}.zip`;
  if (contentType.includes('pdf')) return `custom-map-${safe}.pdf`;
  if (contentType.includes('svg')) return `custom-map-${safe}.svg`;
  return `custom-map-${safe}.bin`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const orderCode = (url.searchParams.get('orderCode') || '').trim();
    if (!orderCode) {
      return NextResponse.json({ success: false, message: 'orderCode is required.' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const table = (process.env.SUPABASE_ORDERS_TABLE ?? 'orders').trim();
    const { data, error } = await supabase
      .from(table)
      .select('order_code,pdf_url,status')
      .eq('order_code', orderCode)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) {
      return NextResponse.json({ success: false, message: 'Order not found.' }, { status: 404 });
    }
    if (data.status !== 'completed' || !data.pdf_url) {
      return NextResponse.json({ success: false, message: 'Download file not ready yet.' }, { status: 400 });
    }

    const source = await fetch(data.pdf_url, { cache: 'no-store' });
    if (!source.ok) {
      return NextResponse.json({ success: false, message: 'Could not fetch file.' }, { status: 502 });
    }
    const contentType = source.headers.get('content-type') || 'application/octet-stream';
    const bytes = await source.arrayBuffer();
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileNameFor(orderCode, contentType)}"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message ?? 'Failed to download file.' },
      { status: 500 }
    );
  }
}
