export type AltAz = { altDeg: number; azDeg: number };

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function toJulianDate(date: Date): number {
  // Julian Date from Unix epoch.
  return date.getTime() / 86400000 + 2440587.5;
}

function gmstDegrees(date: Date): number {
  // Approximate GMST (sufficient for charting).
  const jd = toJulianDate(date);
  const t = (jd - 2451545.0) / 36525.0;
  let gmst =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * t * t -
    (t * t * t) / 38710000.0;
  gmst = ((gmst % 360) + 360) % 360;
  return gmst;
}

export function raDecToAltAz(
  raDeg: number,
  decDeg: number,
  latDeg: number,
  lonDeg: number,
  dateUtc: Date
): AltAz {
  // LST in degrees
  const lstDeg = (gmstDegrees(dateUtc) + lonDeg + 360) % 360;
  const haDeg = ((lstDeg - raDeg) % 360 + 360) % 360;

  const ha = haDeg * DEG2RAD;
  const dec = decDeg * DEG2RAD;
  const lat = latDeg * DEG2RAD;

  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

  // Azimuth from North, increasing eastward.
  const y = Math.sin(ha);
  const x = Math.cos(ha) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat);
  let az = Math.atan2(y, x) * RAD2DEG + 180; // shift to 0..360
  az = ((az % 360) + 360) % 360;

  return { altDeg: alt * RAD2DEG, azDeg: az };
}

export function altAzToXY(altDeg: number, azDeg: number): { x: number; y: number } {
  // Polar chart: zenith center, horizon r=1.
  const r = (90 - altDeg) / 90;
  const theta = azDeg * DEG2RAD;
  return {
    x: r * Math.sin(theta),
    y: r * Math.cos(theta)
  };
}

export function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}
