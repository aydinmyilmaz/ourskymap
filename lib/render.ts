import { altAzToXY, clamp01, raDecToAltAz } from './astro';
import stars from '../data/stars.json';
import constellationsData from '../data/constellations.json';

export type Theme = 'light' | 'dark';
export type StarMode = 'none' | 'constellations' | 'all';

export type RenderParams = {
  theme: Theme;
  showAzimuthScale: boolean;
  labelConstellations: boolean;
  starMode: StarMode;
  magnitudeLimit: number;
  minStarSize: number;
  starSizeMin: number;
  starSizeMax: number;
  starSizeGamma: number;
  starAlpha: number;
  emphasizeVertices: boolean;
  vertexSizeMin: number;
  vertexSizeMax: number;
  vertexSizeGamma: number;
  vertexAlpha: number;
  constellationLineWidth: number;
  constellationLineAlpha: number;
  eclipticAlpha: number;
};

export type ChartRequest = {
  latitude: number;
  longitude: number;
  timeUtcIso: string;
  locationLabel: string;
  params: RenderParams;
};

type StarRow = { hip: number; ra_deg: number; dec_deg: number; mag: number };

function starSizeFromMag(mag: number, magLimit: number, sMin: number, sMax: number, gamma: number): number {
  const x = clamp01((magLimit - mag) / Math.max(magLimit, 1e-6));
  const y = Math.pow(x, gamma);
  return sMin + (sMax - sMin) * y;
}

function svgEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderSvg(req: ChartRequest): string {
  const {
    latitude,
    longitude,
    timeUtcIso,
    locationLabel,
    params
  } = req;

  const date = new Date(timeUtcIso);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid timeUtcIso');

  const W = 595;
  const H = 842;
  const chartCx = W / 2;
  const chartCy = 360;
  const chartR = 260;

  const bg = params.theme === 'dark' ? '#0b1020' : '#ffffff';
  const fg = params.theme === 'dark' ? '#ffffff' : '#111111';
  const line = params.theme === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)';
  const constLine = params.theme === 'dark' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
  const labelFill = params.theme === 'dark' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.45)';
  const labelStroke = params.theme === 'dark' ? 'rgba(0,0,0,0.0)' : 'rgba(255,255,255,0.9)';
  const labelStrokeWidth = params.theme === 'dark' ? 0 : 3;

  const edges: [number, number][] = (constellationsData as any).edges;
  const constellationList: { label: string; hips: number[] }[] = (constellationsData as any).constellations;

  // Precompute HIP -> star record for quick access.
  const starByHip = new Map<number, StarRow>();
  for (const s of stars as unknown as StarRow[]) starByHip.set(s.hip, s);

  // Build a list of stars to consider.
  let starList: StarRow[] = [];
  if (params.starMode === 'all') {
    starList = (stars as unknown as StarRow[]).filter((s) => s.mag <= params.magnitudeLimit);
  } else if (params.starMode === 'constellations') {
    const hipSet = new Set<number>();
    for (const [a, b] of edges) {
      hipSet.add(a);
      hipSet.add(b);
    }
    for (const hip of hipSet) {
      const s = starByHip.get(hip);
      if (s && s.mag <= params.magnitudeLimit) starList.push(s);
    }
  }

  // Compute star positions
  const starPoints: { x: number; y: number; size: number }[] = [];
  for (const s of starList) {
    const { altDeg, azDeg } = raDecToAltAz(s.ra_deg, s.dec_deg, latitude, longitude, date);
    if (altDeg <= 0) continue;
    const { x, y } = altAzToXY(altDeg, azDeg);
    const size = starSizeFromMag(s.mag, params.magnitudeLimit, params.starSizeMin, params.starSizeMax, params.starSizeGamma);
    if (size < params.minStarSize) continue;
    starPoints.push({
      x: chartCx + x * chartR,
      y: chartCy - y * chartR,
      size
    });
  }

  // Constellation vertex points (optional)
  const vertexPoints: { x: number; y: number; size: number }[] = [];
  let hipToXY: Map<number, { x: number; y: number }> | null = null;
  if (params.emphasizeVertices || params.labelConstellations) {
    hipToXY = new Map();
    const hipSet = new Set<number>();
    for (const [a, b] of edges) {
      hipSet.add(a);
      hipSet.add(b);
    }
    for (const hip of hipSet) {
      const s = starByHip.get(hip);
      if (!s) continue;
      const { altDeg, azDeg } = raDecToAltAz(s.ra_deg, s.dec_deg, latitude, longitude, date);
      if (altDeg <= 0) continue;
      const { x, y } = altAzToXY(altDeg, azDeg);
      const px = chartCx + x * chartR;
      const py = chartCy - y * chartR;
      hipToXY.set(hip, { x: px, y: py });

      if (params.emphasizeVertices) {
        const size = starSizeFromMag(s.mag, Math.max(params.magnitudeLimit, 6.5), params.vertexSizeMin, params.vertexSizeMax, params.vertexSizeGamma);
        vertexPoints.push({ x: px, y: py, size });
      }
    }
  }

  // Constellation lines
  const linePaths: string[] = [];
  for (const [a, b] of edges) {
    const p1 = hipToXY?.get(a);
    const p2 = hipToXY?.get(b);
    if (!p1 || !p2) continue;
    linePaths.push(`M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`);
  }

  // Ecliptic polyline (simple obliquity-based curve)
  const eclPts: string[] = [];
  const eps = 23.439291 * (Math.PI / 180);
  for (let lon = 0; lon <= 360; lon += 2) {
    const L = lon * (Math.PI / 180);
    // Ecliptic coordinates on unit circle
    const xe = Math.cos(L);
    const ye = Math.sin(L);
    // Rotate to equatorial
    const xq = xe;
    const yq = ye * Math.cos(eps);
    const zq = ye * Math.sin(eps);
    const ra = (Math.atan2(yq, xq) * 180 / Math.PI + 360) % 360;
    const dec = Math.asin(zq) * 180 / Math.PI;
    const { altDeg, azDeg } = raDecToAltAz(ra, dec, latitude, longitude, date);
    if (altDeg <= 0) continue;
    const { x, y } = altAzToXY(altDeg, azDeg);
    eclPts.push(`${(chartCx + x * chartR).toFixed(2)},${(chartCy - y * chartR).toFixed(2)}`);
  }

  // Azimuth scale rings
  const azScale: string[] = [];
  if (params.showAzimuthScale) {
    const innerR = chartR;
    const outerR = chartR + 20;
    azScale.push(`<circle cx="${chartCx}" cy="${chartCy}" r="${innerR}" fill="none" stroke="${fg}" stroke-width="1.2"/>`);
    azScale.push(`<circle cx="${chartCx}" cy="${chartCy}" r="${outerR}" fill="none" stroke="${fg}" stroke-width="0.8"/>`);
    for (let az = 0; az < 360; az += 10) {
      const ang = (az * Math.PI) / 180;
      const x1 = chartCx + innerR * Math.sin(ang);
      const y1 = chartCy - innerR * Math.cos(ang);
      const tick = az % 30 === 0 ? 10 : 6;
      const x2 = chartCx + (innerR + tick) * Math.sin(ang);
      const y2 = chartCy - (innerR + tick) * Math.cos(ang);
      azScale.push(`<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${fg}" stroke-width="0.6"/>`);

      const tx = chartCx + (outerR - 6) * Math.sin(ang);
      const ty = chartCy - (outerR - 6) * Math.cos(ang);
      const rot = -az;
      azScale.push(
        `<text x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" font-size="8" fill="${fg}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${rot} ${tx.toFixed(2)} ${ty.toFixed(2)})">${az}</text>`
      );
    }
    const cards: [string, number][] = [
      ['N', 0],
      ['E', 90],
      ['S', 180],
      ['W', 270]
    ];
    for (const [lab, az] of cards) {
      const ang = (az * Math.PI) / 180;
      const tx = chartCx + (outerR + 14) * Math.sin(ang);
      const ty = chartCy - (outerR + 14) * Math.cos(ang);
      azScale.push(`<text x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" font-size="18" font-weight="700" fill="${fg}" text-anchor="middle" dominant-baseline="middle">${lab}</text>`);
    }
  }

  // Constellation labels
  const labels: string[] = [];
  if (params.labelConstellations && hipToXY) {
    for (const c of constellationList) {
      const pts = c.hips.map((h) => hipToXY!.get(h)).filter(Boolean) as { x: number; y: number }[];
      if (!pts.length) continue;
      const mx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
      const my = pts.reduce((a, p) => a + p.y, 0) / pts.length;
      // Avoid near-edge
      const dx = mx - chartCx;
      const dy = my - chartCy;
      if (dx * dx + dy * dy > (chartR * 0.92) * (chartR * 0.92)) continue;
      labels.push(
        `<text x="${mx.toFixed(2)}" y="${my.toFixed(2)}" font-size="10" fill="${labelFill}" stroke="${labelStroke}" stroke-width="${labelStrokeWidth}" paint-order="stroke" text-anchor="middle" dominant-baseline="middle">${svgEscape(c.label)}</text>`
      );
    }
  }

  const info1 = `Location: ${locationLabel}`;
  const info2 = `Time: ${new Date(timeUtcIso).toUTCString().replace('GMT', '(UTC +00:00)')}`;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect x="0" y="0" width="${W}" height="${H}" fill="${bg}"/>
  ${azScale.join('\n  ')}
  <g>
    ${eclPts.length > 2 ? `<polyline points="${eclPts.join(' ')}" fill="none" stroke="${line}" stroke-width="1" stroke-dasharray="7 7" opacity="${params.eclipticAlpha}"/>` : ''}
  </g>
  <g>
    ${linePaths.length ? `<path d="${linePaths.join(' ')}" fill="none" stroke="${constLine}" stroke-width="${params.constellationLineWidth}" opacity="${params.constellationLineAlpha}" stroke-linecap="round"/>` : ''}
  </g>
  <g opacity="${clamp01(params.starAlpha)}">
    ${starPoints.map((p) => `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${(Math.sqrt(p.size) * 0.55).toFixed(2)}" fill="${fg}"/>`).join('')}
  </g>
  <g opacity="${clamp01(params.vertexAlpha)}">
    ${vertexPoints.map((p) => `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${(Math.sqrt(p.size) * 0.6).toFixed(2)}" fill="${fg}"/>`).join('')}
  </g>
  <g>
    ${labels.join('')}
  </g>
  <g>
    <text x="48" y="760" font-size="14" fill="${fg}" text-anchor="start">${svgEscape(info1)}</text>
    <text x="48" y="785" font-size="14" fill="${fg}" text-anchor="start">${svgEscape(info2)}</text>
  </g>
</svg>`;

  return svg;
}
