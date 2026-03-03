import { NextResponse } from 'next/server';
import { buildPricingPayload, parsePrintCurrency } from '../../../../lib/print-pricing';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const currency = parsePrintCurrency(url.searchParams.get('currency'));
    return NextResponse.json({
      success: true,
      ...buildPricingPayload(currency)
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message ?? 'Failed to load print pricing.' },
      { status: 500 }
    );
  }
}
