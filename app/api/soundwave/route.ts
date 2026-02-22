import { NextResponse } from 'next/server';
import { renderSoundwavePosterSvg } from '../../../lib/soundwave';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const svg = renderSoundwavePosterSvg(body);
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

