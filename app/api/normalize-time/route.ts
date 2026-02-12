import { NextResponse } from 'next/server';
import tzLookup from 'tz-lookup';
import { DateTime } from 'luxon';

export const runtime = 'nodejs';

type Body = {
  latitude: number;
  longitude: number;
  localDateTime: string; // "YYYY-MM-DDTHH:mm"
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>;
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    const localDateTime = String(body.localDateTime ?? '');

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('Invalid coordinates');
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localDateTime)) throw new Error('Invalid localDateTime');

    const timeZone = tzLookup(latitude, longitude);
    const dtLocal = DateTime.fromFormat(localDateTime, "yyyy-MM-dd'T'HH:mm", { zone: timeZone });
    if (!dtLocal.isValid) throw new Error('Invalid local datetime for timezone');

    const timeUtcIso = dtLocal.toUTC().toISO({ suppressMilliseconds: true });
    if (!timeUtcIso) throw new Error('Failed to normalize datetime');

    return NextResponse.json({
      timeUtcIso,
      timeZone,
      offsetMinutes: dtLocal.offset,
      offset: dtLocal.toFormat('ZZ'),
      localIso: dtLocal.toISO({ suppressMilliseconds: true, includeOffset: true })
    });
  } catch (e: any) {
    return new NextResponse(e?.message ?? 'error', { status: 400 });
  }
}

