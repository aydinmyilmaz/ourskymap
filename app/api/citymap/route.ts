import { NextResponse } from 'next/server';
import { renderCityMapSvg } from '../../../lib/citymap';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const svg = await renderCityMapSvg(body);
    return new NextResponse(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });
  } catch (e: any) {
    return new NextResponse(e?.message ?? 'error', { status: 400 });
  }
}
