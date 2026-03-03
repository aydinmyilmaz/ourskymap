import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const printOrderCode = (url.searchParams.get('printOrderCode') || '').trim();
    if (!printOrderCode) {
      return NextResponse.json({ success: false, message: 'printOrderCode is required.' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const table = (process.env.SUPABASE_PRINT_ORDERS_TABLE ?? 'print_orders').trim();
    const { data, error } = await supabase
      .from(table)
      .select('print_order_code,source_order_code,payment_status,provider_status,currency,total_cents,created_at')
      .eq('print_order_code', printOrderCode)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) {
      return NextResponse.json({ success: false, message: 'Print order not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      printOrderCode: data.print_order_code,
      sourceOrderCode: data.source_order_code,
      paymentStatus: data.payment_status,
      providerStatus: data.provider_status,
      currency: data.currency,
      total: Number(data.total_cents ?? 0) / 100,
      createdAt: data.created_at
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message ?? 'Failed to fetch print order status.' },
      { status: 500 }
    );
  }
}
