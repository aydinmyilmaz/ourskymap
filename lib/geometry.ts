import { altAzToXY, clamp01, raDecToAltAz } from './astro';
import { AstroTime, Body, Equator, Horizon, MoonPhase, Observer } from 'astronomy-engine';
import stars from '../data/stars.json';
import constellationsData from '../data/constellations.json';
import deepSky from '../data/deepsky.json';
import type { RenderParams } from './types';

type StarRow = { hip: number; ra_deg: number; dec_deg: number; mag: number };

export type ChartGeometry = {
  W: number;
  H: number;
  chartCx: number;
  chartCy: number;
  chartR: number;
  starPoints: { x: number; y: number; size: number }[];
  vertexPoints: { x: number; y: number; size: number }[];
  linePaths: string[];
  eclipticPoints: string[];
  constellationLabels: { x: number; y: number; text: string }[];
  solarSystem: {
    x: number;
    y: number;
    r: number;
    label: string;
    kind: 'sun' | 'moon' | 'planet';
    moonPhaseDeg?: number;
  }[];
  deepSky: { x: number; y: number; label: string; kind: 'galaxy' | 'nebula' | 'cluster' | 'globular' }[];
};

function starSizeFromMag(mag: number, magLimit: number, sMin: number, sMax: number, gamma: number): number {
  const x = clamp01((magLimit - mag) / Math.max(magLimit, 1e-6));
  const y = Math.pow(x, gamma);
  return sMin + (sMax - sMin) * y;
}

export function buildChartGeometry(args: {
  latitude: number;
  longitude: number;
  date: Date;
  params: RenderParams;
  layout?: 'a4' | 'square';
}): ChartGeometry {
  const { latitude, longitude, date, params } = args;
  const mirrorX = params.mirrorHorizontal ? -1 : 1;

  const layout = args.layout ?? 'a4';
  const W = layout === 'square' ? 1024 : 595;
  const H = layout === 'square' ? 1024 : 842;
  const chartCx = W / 2;
  const chartCy = layout === 'square' ? H / 2 : 360;
  const chartR = layout === 'square' ? 390 : 260;

  const edges: [number, number][] = (constellationsData as any).edges;
  const constellationList: { label: string; hips: number[] }[] = (constellationsData as any).constellations;

  const starByHip = new Map<number, StarRow>();
  for (const s of stars as unknown as StarRow[]) starByHip.set(s.hip, s);

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

  const starPoints: { x: number; y: number; size: number }[] = [];
  for (const s of starList) {
    const { altDeg, azDeg } = raDecToAltAz(s.ra_deg, s.dec_deg, latitude, longitude, date);
    if (altDeg <= 0) continue;
    const { x: x0, y } = altAzToXY(altDeg, azDeg);
    const x = x0 * mirrorX;
    const size = starSizeFromMag(s.mag, params.magnitudeLimit, params.starSizeMin, params.starSizeMax, params.starSizeGamma);
    if (size < params.minStarSize) continue;
    starPoints.push({
      x: chartCx + x * chartR,
      y: chartCy - y * chartR,
      size
    });
  }

  // Prepare HIP -> XY for constellation lines, vertex emphasis, and label positioning.
  const hipToXY = new Map<number, { x: number; y: number; mag: number }>();
  {
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
      const { x: x0, y } = altAzToXY(altDeg, azDeg);
      const x = x0 * mirrorX;
      hipToXY.set(hip, { x: chartCx + x * chartR, y: chartCy - y * chartR, mag: s.mag });
    }
  }

  const linePaths: string[] = [];
  for (const [a, b] of edges) {
    const p1 = hipToXY.get(a);
    const p2 = hipToXY.get(b);
    if (!p1 || !p2) continue;
    linePaths.push(`M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`);
  }

  const vertexPoints: { x: number; y: number; size: number }[] = [];
  if (params.emphasizeVertices) {
    for (const p of hipToXY.values()) {
      const size = starSizeFromMag(
        p.mag,
        Math.max(params.magnitudeLimit, 6.5),
        params.vertexSizeMin,
        params.vertexSizeMax,
        params.vertexSizeGamma
      );
      vertexPoints.push({ x: p.x, y: p.y, size });
    }
  }

  const eclipticPoints: string[] = [];
  const eps = 23.439291 * (Math.PI / 180);
  for (let lon = 0; lon <= 360; lon += 2) {
    const L = lon * (Math.PI / 180);
    const xe = Math.cos(L);
    const ye = Math.sin(L);
    const xq = xe;
    const yq = ye * Math.cos(eps);
    const zq = ye * Math.sin(eps);
    const ra = (Math.atan2(yq, xq) * 180) / Math.PI;
    const raDeg = (ra + 360) % 360;
    const decDeg = (Math.asin(zq) * 180) / Math.PI;
    const { altDeg, azDeg } = raDecToAltAz(raDeg, decDeg, latitude, longitude, date);
    if (altDeg <= 0) continue;
    const { x: x0, y } = altAzToXY(altDeg, azDeg);
    const x = x0 * mirrorX;
    eclipticPoints.push(`${(chartCx + x * chartR).toFixed(2)},${(chartCy - y * chartR).toFixed(2)}`);
  }

  const constellationLabels: { x: number; y: number; text: string }[] = [];
  if (params.labelConstellations) {
    for (const c of constellationList) {
      const pts = c.hips.map((h) => hipToXY.get(h)).filter(Boolean) as { x: number; y: number }[];
      if (!pts.length) continue;
      const mx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
      const my = pts.reduce((a, p) => a + p.y, 0) / pts.length;
      const dx = mx - chartCx;
      const dy = my - chartCy;
      if (dx * dx + dy * dy > (chartR * 0.92) * (chartR * 0.92)) continue;
      constellationLabels.push({ x: mx, y: my, text: c.label });
    }
  }

  const solarSystem: {
    x: number;
    y: number;
    r: number;
    label: string;
    kind: 'sun' | 'moon' | 'planet';
    moonPhaseDeg?: number;
  }[] = [];
  if (params.showSolarSystem) {
    const obs = new Observer(latitude, longitude, 0);
    const t = new AstroTime(date);
    const moonPhaseDeg = MoonPhase(t);

    const addBody = (body: Body, label: string, kind: 'sun' | 'moon' | 'planet', r: number) => {
      const eq = Equator(body, t, obs, true, true);
      const hor = Horizon(t, obs, eq.ra, eq.dec);
      const altDeg = hor.altitude;
      const azDeg = hor.azimuth;
      if (altDeg <= 0) return;
      const { x: x0, y } = altAzToXY(altDeg, azDeg);
      const x = x0 * mirrorX;
      solarSystem.push({
        x: chartCx + x * chartR,
        y: chartCy - y * chartR,
        r,
        label,
        kind,
        moonPhaseDeg: kind === 'moon' ? moonPhaseDeg : undefined
      });
    };

    // Sun: show only when above horizon (daytime for the observer).
    addBody(Body.Sun, 'Sun', 'sun', 7.5);
    addBody(Body.Moon, 'Moon', 'moon', 6.5);
    addBody(Body.Mercury, 'Mercury', 'planet', 5.2);
    addBody(Body.Venus, 'Venus', 'planet', 5.6);
    addBody(Body.Mars, 'Mars', 'planet', 5.4);
    addBody(Body.Jupiter, 'Jupiter', 'planet', 6.2);
    addBody(Body.Saturn, 'Saturn', 'planet', 6.0);
    addBody(Body.Uranus, 'Uranus', 'planet', 5.6);
    addBody(Body.Neptune, 'Neptune', 'planet', 5.6);
  }

  const deepSkyPoints: { x: number; y: number; label: string; kind: 'galaxy' | 'nebula' | 'cluster' | 'globular' }[] = [];
  if (params.showDeepSky) {
    type Row = { name: string; kind: 'galaxy' | 'nebula' | 'cluster' | 'globular'; ra_deg: number; dec_deg: number };
    for (const o of deepSky as unknown as Row[]) {
      const { altDeg, azDeg } = raDecToAltAz(o.ra_deg, o.dec_deg, latitude, longitude, date);
      if (altDeg <= 0) continue;
      const { x: x0, y } = altAzToXY(altDeg, azDeg);
      const x = x0 * mirrorX;
      deepSkyPoints.push({
        x: chartCx + x * chartR,
        y: chartCy - y * chartR,
        label: o.name,
        kind: o.kind
      });
    }
  }

  return {
    W,
    H,
    chartCx,
    chartCy,
    chartR,
    starPoints,
    vertexPoints,
    linePaths,
    eclipticPoints,
    constellationLabels,
    solarSystem,
    deepSky: deepSkyPoints
  };
}
