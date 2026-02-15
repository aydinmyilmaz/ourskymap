import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const token = (process.env.MAPBOX_API_KEY || process.env.MAPBOX_ACCESS_TOKEN || '').trim();
  if (!token) {
    return NextResponse.json({ token: '' }, { status: 404 });
  }
  return NextResponse.json({ token });
}
