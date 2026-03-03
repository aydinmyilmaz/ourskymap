import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../lib/supabaseAdmin';
import { parsePrintSizeFromZipName } from '../../../lib/print-size-utils';

export const runtime = 'nodejs';

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
      .select('order_code,status,used_at,pdf_url,customer_email')
      .eq('order_code', orderCode)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }
    if (!data) {
      return NextResponse.json({ success: false, message: 'Order not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      orderCode: data.order_code,
      status: data.status,
      usedAt: data.used_at,
      downloadUrl: data.pdf_url,
      customerEmail: data.customer_email,
      sourcePrintSize: parsePrintSizeFromZipName(data.pdf_url || '')
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message ?? 'Failed to fetch order.' }, { status: 500 });
  }
}
