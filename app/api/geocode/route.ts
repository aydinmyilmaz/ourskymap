import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json([]);

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('q', q);
  url.searchParams.set('limit', '3');

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'mementogifts (vercel app)'
    }
  });
  if (!res.ok) return NextResponse.json([]);

  const data = (await res.json()) as any[];
  return NextResponse.json(
    data.map((r) => ({
      lat: Number(r.lat),
      lon: Number(r.lon),
      label: String(r.display_name)
    }))
  );
}
