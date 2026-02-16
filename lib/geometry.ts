import { altAzToXY, clamp01, raDecToAltAz } from './astro';
import { AstroTime, Body, Equator, Horizon, MoonPhase, Observer } from 'astronomy-engine';
import stars from '../data/stars.json';
import constellationsData from '../data/constellations.json';
import deepSky from '../data/deepsky.json';
import type { RenderParams } from './types';

type StarRow = { hip: number; ra_deg: number; dec_deg: number; mag: number };
type LabelKind = 'star' | 'constellation';
type LabelAnchor = 'start' | 'middle';
type LabelCandidate = {
  kind: LabelKind;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  anchor: LabelAnchor;
  priority: number;
};
type LabelRect = { left: number; top: number; right: number; bottom: number };

export type ChartGeometry = {
  W: number;
  H: number;
  chartCx: number;
  chartCy: number;
  chartR: number;
  coordinateGridPaths: string[];
  starPoints: { x: number; y: number; size: number }[];
  vertexPoints: { x: number; y: number; size: number }[];
  linePaths: string[];
  eclipticPoints: string[];
  starLabels: { x: number; y: number; text: string }[];
  constellationLabels: { x: number; y: number; text: string }[];
  solarSystem: {
    x: number;
    y: number;
    r: number;
    label: string;
    kind: 'sun' | 'moon' | 'planet';
    moonPhaseDeg?: number;
    limbAngleDeg?: number;
  }[];
  deepSky: { x: number; y: number; label: string; kind: 'galaxy' | 'nebula' | 'cluster' | 'globular' }[];
};

const BRIGHT_STAR_LABELS: Record<number, string> = {
  32349: 'Sirius',
  30438: 'Canopus',
  69673: 'Arcturus',
  91262: 'Vega',
  24608: 'Capella',
  24436: 'Rigel',
  37279: 'Procyon',
  27989: 'Betelgeuse',
  7588: 'Achernar',
  68702: 'Hadar',
  97649: 'Altair',
  60718: 'Acrux',
  21421: 'Aldebaran',
  80763: 'Antares',
  65474: 'Spica',
  37826: 'Pollux',
  113368: 'Fomalhaut',
  102098: 'Deneb',
  49669: 'Regulus',
  54061: 'Dubhe',
  25336: 'Bellatrix',
  62956: 'Alioth'
};

// ============================================================================
// LABEL OBSTACLE TUNING (OurSkyMap)
// ----------------------------------------------------------------------------
// TR:
// Bu sabitler, etiket yerlestirme motorunun hangi cisimleri "dokunulmaz alan"
// olarak gormesini belirler. Amac, isimlerin ozellikle gezegenlerin ve buyuk
// yildiz/vertex noktalarinin ustune binmesini azaltmaktir.
//
// BIG_STAR_OBSTACLE_MIN_R:
// - Star noktasinin ekrandaki yaricapi (render radius) bu degerin altindaysa
//   obstacle kabul edilmez.
// - Yani sadece "buyuk/one cikan" yildizlar etiketten korunur.
// - Degeri azaltirsan daha fazla yildiz obstacle olur (etiketler daha cok kacar).
// - Degeri artirirsan sadece daha iri yildizlar korunur (etiketler daha serbest olur).
//
// BIG_VERTEX_OBSTACLE_MIN_R:
// - Constellation vertex noktasi icin ayni mantik.
// - Degeri azaltmak daha cok dugumu korur; artirmak daha az dugumu korur.
//
// STAR_OBSTACLE_PAD:
// - Buyuk yildiz/vertex obstacle kutusuna eklenen ekstra bosluk (px benzeri).
// - Artarsa etiketler bu noktalardan daha uzak durur.
// - Azalirsa etiketler buyuk yildizlara/vertexlere daha cok yaklasabilir.
//
// PLANET_OBSTACLE_PAD:
// - Gezegen/Gunes/Ay obstacle yaricapina eklenen ekstra tampon bosluk.
// - Oncelikli koruma burada oldugu icin, bu degeri artirmak gezegen isim
//   caprazlamalarini ciddi azaltir.
//
// EN:
// These constants control which objects are treated as "no-label zones" by the
// label placement engine. The goal is to keep labels off important objects,
// especially planets and large star/vertex markers.
//
// BIG_STAR_OBSTACLE_MIN_R:
// - If a star's rendered radius is below this threshold, it is ignored as an obstacle.
// - Lower value = more stars become protected obstacles.
// - Higher value = only larger stars are protected.
//
// BIG_VERTEX_OBSTACLE_MIN_R:
// - Same threshold logic for emphasized constellation vertex points.
// - Lower value protects more vertices; higher value protects fewer.
//
// STAR_OBSTACLE_PAD:
// - Extra padding added around large star/vertex obstacle bounds.
// - Increase to keep labels farther from prominent stars/vertices.
//
// PLANET_OBSTACLE_PAD:
// - Extra padding added to planet/Sun/Moon obstacle radius.
// - Increase this first if labels still feel too close to planets.
//
// INITIAL / OPTIMAL (quick restore guide)
// TR:
// - Initial: Ilk implementasyondaki baseline deger.
// - Optimal: Su anki tuned/onerilen deger.
// EN:
// - Initial: Baseline value from first implementation.
// - Optimal: Current tuned/recommended value.
//
// BIG_STAR_OBSTACLE_MIN_R   -> Initial: 1.7, Optimal: 1.7
// BIG_VERTEX_OBSTACLE_MIN_R -> Initial: 2.0, Optimal: 3.0
// STAR_OBSTACLE_PAD         -> Initial: 1.4, Optimal: 1.4
// PLANET_OBSTACLE_PAD       -> Initial: 3.2, Optimal: 3.2
// ============================================================================
const BIG_STAR_OBSTACLE_MIN_R = 1.7;
const BIG_VERTEX_OBSTACLE_MIN_R = 3.0;
const STAR_OBSTACLE_PAD = 1.4;
const PLANET_OBSTACLE_PAD = 3.2;

function starSizeFromMag(mag: number, magLimit: number, sMin: number, sMax: number, gamma: number): number {
  const x = clamp01((magLimit - mag) / Math.max(magLimit, 1e-6));
  const y = Math.pow(x, gamma);
  return sMin + (sMax - sMin) * y;
}

function clampNum(v: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, v));
}

function estimateLabelWidth(text: string, fontSize: number): number {
  let units = 0;
  for (const ch of text) {
    if (ch === ' ') units += 0.32;
    else if ('ilI1|!.,:;'.includes(ch)) units += 0.34;
    else if ('MW@#%&'.includes(ch)) units += 0.95;
    else units += 0.62;
  }
  return Math.max(2, units * fontSize);
}

function improveConstellationAnchor(
  pts: { x: number; y: number }[],
  centerX: number,
  centerY: number
): { x: number; y: number } {
  if (!pts.length) return { x: centerX, y: centerY };
  const sorted = [...pts]
    .map((p) => {
      const dx = p.x - centerX;
      const dy = p.y - centerY;
      return { p, d2: dx * dx + dy * dy };
    })
    .sort((a, b) => a.d2 - b.d2);

  const k = Math.min(3, sorted.length);
  if (k === 0) return { x: centerX, y: centerY };
  const near = sorted.slice(0, k);
  const nearX = near.reduce((acc, it) => acc + it.p.x, 0) / k;
  const nearY = near.reduce((acc, it) => acc + it.p.y, 0) / k;
  const dx = nearX - centerX;
  const dy = nearY - centerY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // If centroid falls in a sparse hole, pull it toward the nearest star cluster.
  const detachedThreshold = 16;
  if (dist <= detachedThreshold) return { x: centerX, y: centerY };
  const excess = dist - detachedThreshold;
  const pull = Math.min(0.72, excess / Math.max(20, dist));
  return {
    x: centerX + dx * pull,
    y: centerY + dy * pull
  };
}

function buildLabelRect(label: LabelCandidate, x: number, y: number, padding: number): LabelRect {
  const effectivePadding = padding + (label.kind === 'constellation' ? 1.6 : 0);
  const width = estimateLabelWidth(label.text, label.fontSize);
  const height = label.fontSize * 0.95;
  const halfH = height / 2;
  if (label.anchor === 'middle') {
    return {
      left: x - width / 2 - effectivePadding,
      right: x + width / 2 + effectivePadding,
      top: y - halfH - effectivePadding,
      bottom: y + halfH + effectivePadding
    };
  }
  return {
    left: x - effectivePadding,
    right: x + width + effectivePadding,
    top: y - halfH - effectivePadding,
    bottom: y + halfH + effectivePadding
  };
}

function circleToRect(x: number, y: number, r: number): LabelRect {
  return {
    left: x - r,
    top: y - r,
    right: x + r,
    bottom: y + r
  };
}

function rectsOverlap(a: LabelRect, b: LabelRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function isInsideChart(x: number, y: number, chartCx: number, chartCy: number, chartR: number): boolean {
  const dx = x - chartCx;
  const dy = y - chartCy;
  return dx * dx + dy * dy <= chartR * chartR;
}

function buildOffsetCandidates(maxShift: number): { dx: number; dy: number }[] {
  if (maxShift <= 0.01) return [{ dx: 0, dy: 0 }];
  const d1 = Math.max(3, maxShift * 0.38);
  const d2 = Math.max(d1 + 1.5, maxShift * 0.72);
  const d3 = maxShift;
  const offsets: { dx: number; dy: number }[] = [
    { dx: 0, dy: 0 },
    { dx: d1, dy: 0 },
    { dx: -d1, dy: 0 },
    { dx: 0, dy: d1 },
    { dx: 0, dy: -d1 },
    { dx: d1, dy: d1 },
    { dx: -d1, dy: d1 },
    { dx: d1, dy: -d1 },
    { dx: -d1, dy: -d1 },
    { dx: d2, dy: 0 },
    { dx: -d2, dy: 0 },
    { dx: 0, dy: d2 },
    { dx: 0, dy: -d2 },
    { dx: d2, dy: d1 },
    { dx: -d2, dy: d1 },
    { dx: d2, dy: -d1 },
    { dx: -d2, dy: -d1 },
    { dx: d3, dy: 0 },
    { dx: -d3, dy: 0 },
    { dx: 0, dy: d3 },
    { dx: 0, dy: -d3 }
  ];
  const seen = new Set<string>();
  const out: { dx: number; dy: number }[] = [];
  for (const o of offsets) {
    const dx = Number(o.dx.toFixed(2));
    const dy = Number(o.dy.toFixed(2));
    const key = `${dx},${dy}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ dx, dy });
  }
  return out;
}

function placeLabelCandidates(opts: {
  candidates: LabelCandidate[];
  strategy: 'none' | 'smart';
  collisionPadding: number;
  maxShift: number;
  obstacles?: LabelRect[];
  chartCx: number;
  chartCy: number;
  chartR: number;
}): LabelCandidate[] {
  const { candidates, strategy, collisionPadding, maxShift, obstacles, chartCx, chartCy, chartR } = opts;
  if (!candidates.length) return [];
  if (strategy === 'none') return candidates;

  const offsets = buildOffsetCandidates(maxShift);
  const occupied: LabelRect[] = obstacles ? [...obstacles] : [];
  const placed: LabelCandidate[] = [];
  const sorted = [...candidates].sort((a, b) => b.priority - a.priority || a.text.localeCompare(b.text));
  const inChartR = chartR * 0.985;

  for (const label of sorted) {
    let best: LabelCandidate | null = null;
    let bestRect: LabelRect | null = null;
    for (const off of offsets) {
      const x = label.x + off.dx;
      const y = label.y + off.dy;
      if (!isInsideChart(x, y, chartCx, chartCy, inChartR)) continue;
      const rect = buildLabelRect(label, x, y, collisionPadding);
      if (occupied.some((taken) => rectsOverlap(taken, rect))) continue;
      best = { ...label, x, y };
      bestRect = rect;
      break;
    }
    if (!best || !bestRect) continue;
    placed.push(best);
    occupied.push(bestRect);
  }

  return placed;
}

function buildCoordinateGridPaths(opts: {
  latitude: number;
  longitude: number;
  date: Date;
  chartCx: number;
  chartCy: number;
  chartR: number;
  mirrorX: number;
  stepDeg: number;
}): string[] {
  const { latitude, longitude, date, chartCx, chartCy, chartR, mirrorX } = opts;
  const stepDeg = Math.max(5, Math.min(60, Math.round(opts.stepDeg)));

  const paths: string[] = [];

  const pushSegment = (seg: { x: number; y: number }[]) => {
    if (seg.length < 2) return;
    const d = seg
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(' ');
    paths.push(d);
  };

  const decMin = -80;
  const decMax = 80;
  const raSample = 3; // degrees
  const decSample = 2; // degrees
  const poleAltDeg = Math.abs(latitude);
  const poleAzDeg = latitude >= 0 ? 0 : 180;
  const poleXY = altAzToXY(poleAltDeg, poleAzDeg);
  const poleAnchor = {
    x: chartCx + poleXY.x * mirrorX * chartR,
    y: chartCy - poleXY.y * chartR
  };

  // "Latitude" lines on the sky: declination circles.
  for (let dec = -90 + stepDeg; dec <= 90 - stepDeg; dec += stepDeg) {
    if (dec < decMin || dec > decMax) continue;
    let seg: { x: number; y: number }[] = [];
    for (let ra = 0; ra <= 360; ra += raSample) {
      const { altDeg, azDeg } = raDecToAltAz(ra % 360, dec, latitude, longitude, date);
      if (altDeg <= 0) {
        pushSegment(seg);
        seg = [];
        continue;
      }
      const { x: x0, y } = altAzToXY(altDeg, azDeg);
      const x = x0 * mirrorX;
      seg.push({ x: chartCx + x * chartR, y: chartCy - y * chartR });
    }
    pushSegment(seg);
  }

  // "Longitude" lines on the sky: right-ascension meridians.
  for (let ra = 0; ra < 360; ra += stepDeg) {
    const meridianSegments: { x: number; y: number }[][] = [];
    let seg: { x: number; y: number }[] = [];
    for (let dec = decMin; dec <= decMax; dec += decSample) {
      const { altDeg, azDeg } = raDecToAltAz(ra, dec, latitude, longitude, date);
      if (altDeg <= 0) {
        if (seg.length >= 2) meridianSegments.push(seg);
        seg = [];
        continue;
      }
      const { x: x0, y } = altAzToXY(altDeg, azDeg);
      const x = x0 * mirrorX;
      seg.push({ x: chartCx + x * chartR, y: chartCy - y * chartR });
    }
    if (seg.length >= 2) meridianSegments.push(seg);

    // Cosmetic convergence: make RA meridians visually meet at the celestial pole anchor.
    let closestToPole: { x: number; y: number } | null = null;
    let minDist2 = Number.POSITIVE_INFINITY;
    for (const s of meridianSegments) {
      for (const p of s) {
        const dx = p.x - poleAnchor.x;
        const dy = p.y - poleAnchor.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < minDist2) {
          minDist2 = d2;
          closestToPole = p;
        }
      }
    }
    if (closestToPole && minDist2 > 0.25) {
      paths.push(
        `M ${poleAnchor.x.toFixed(2)} ${poleAnchor.y.toFixed(2)} L ${closestToPole.x.toFixed(2)} ${closestToPole.y.toFixed(2)}`
      );
    }

    for (const s of meridianSegments) pushSegment(s);
  }

  return paths;
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

  const coordinateGridPaths =
    params.showCoordinateGrid
      ? buildCoordinateGridPaths({
          latitude,
          longitude,
          date,
          chartCx,
          chartCy,
          chartR,
          mirrorX,
          stepDeg: params.coordinateGridStepDeg
        })
      : [];

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

  const labelObstacles: LabelRect[] = [];

  for (const p of starPoints) {
    const r = Math.sqrt(p.size) * 0.55;
    if (r < BIG_STAR_OBSTACLE_MIN_R) continue;
    labelObstacles.push(circleToRect(p.x, p.y, r + STAR_OBSTACLE_PAD));
  }
  for (const p of vertexPoints) {
    const r = Math.sqrt(p.size) * 0.6;
    if (r < BIG_VERTEX_OBSTACLE_MIN_R) continue;
    labelObstacles.push(circleToRect(p.x, p.y, r + STAR_OBSTACLE_PAD));
  }

  if (params.showSolarSystem) {
    const obs = new Observer(latitude, longitude, 0);
    const t = new AstroTime(date);
    const bodyObstacles: { body: Body; r: number }[] = [
      { body: Body.Sun, r: 7.5 },
      { body: Body.Moon, r: 6.5 },
      { body: Body.Mercury, r: 5.2 },
      { body: Body.Venus, r: 5.6 },
      { body: Body.Mars, r: 5.4 },
      { body: Body.Jupiter, r: 6.2 },
      { body: Body.Saturn, r: 6.0 },
      { body: Body.Uranus, r: 5.6 },
      { body: Body.Neptune, r: 5.6 }
    ];

    for (const item of bodyObstacles) {
      const eq = Equator(item.body, t, obs, true, true);
      const hor = Horizon(t, obs, eq.ra, eq.dec);
      if (hor.altitude <= 0) continue;
      const { x: x0, y } = altAzToXY(hor.altitude, hor.azimuth);
      const x = x0 * mirrorX;
      const px = chartCx + x * chartR;
      const py = chartCy - y * chartR;
      labelObstacles.push(circleToRect(px, py, item.r + PLANET_OBSTACLE_PAD));
    }
  }

  const labelPlacementStrategy = params.labelPlacementStrategy === 'smart' ? 'smart' : 'none';
  const labelCollisionPadding = clampNum(params.labelCollisionPadding, 0, 16, 0);
  const labelMaxShift = clampNum(params.labelMaxShift, 0, 48, 0);
  const maxConstellationLabels = Math.max(0, Math.round(clampNum(params.maxConstellationLabels, 0, 120, 0)));
  const maxStarLabels = Math.max(0, Math.round(clampNum(params.maxStarLabels, 0, 120, 0)));

  const STAR_LABEL_DX = 5;
  const STAR_LABEL_DY = 2;
  const STAR_LABEL_FONT = 8;
  const CONSTELLATION_LABEL_FONT = 10;

  let constellationLabelCandidates: LabelCandidate[] = [];
  if (params.labelConstellations) {
    for (const c of constellationList) {
      const pts = c.hips.map((h) => hipToXY.get(h)).filter(Boolean) as { x: number; y: number }[];
      if (!pts.length) continue;
      const mx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
      const my = pts.reduce((a, p) => a + p.y, 0) / pts.length;
      const anchor = improveConstellationAnchor(pts, mx, my);
      const dx = anchor.x - chartCx;
      const dy = anchor.y - chartCy;
      const radial = Math.sqrt(dx * dx + dy * dy) / Math.max(1, chartR);
      if (radial > 0.92) continue;
      const priority = 120 - radial * 40 + Math.min(20, pts.length * 0.8);
      constellationLabelCandidates.push({
        kind: 'constellation',
        x: anchor.x,
        y: anchor.y,
        text: c.label,
        fontSize: CONSTELLATION_LABEL_FONT,
        anchor: 'middle',
        priority
      });
    }
    if (maxConstellationLabels > 0 && constellationLabelCandidates.length > maxConstellationLabels) {
      constellationLabelCandidates = constellationLabelCandidates
        .sort((a, b) => b.priority - a.priority)
        .slice(0, maxConstellationLabels);
    }
  }

  let starLabelCandidates: LabelCandidate[] = [];
  if (params.labelStarNames) {
    for (const [hipRaw, label] of Object.entries(BRIGHT_STAR_LABELS)) {
      const hip = Number(hipRaw);
      const s = starByHip.get(hip);
      if (!s) continue;
      if (s.mag > Math.max(1.8, Math.min(3.0, params.magnitudeLimit))) continue;
      const { altDeg, azDeg } = raDecToAltAz(s.ra_deg, s.dec_deg, latitude, longitude, date);
      if (altDeg <= 0) continue;
      const { x: x0, y } = altAzToXY(altDeg, azDeg);
      const x = x0 * mirrorX;
      const sx = chartCx + x * chartR;
      const sy = chartCy - y * chartR;
      const dx = sx - chartCx;
      const dy = sy - chartCy;
      const radial = Math.sqrt(dx * dx + dy * dy) / Math.max(1, chartR);
      if (radial > 0.93) continue;
      const priority = 220 - s.mag * 36 - radial * 28;
      starLabelCandidates.push({
        kind: 'star',
        x: sx + STAR_LABEL_DX,
        y: sy + STAR_LABEL_DY,
        text: label,
        fontSize: STAR_LABEL_FONT,
        anchor: 'start',
        priority
      });
    }
    if (maxStarLabels > 0 && starLabelCandidates.length > maxStarLabels) {
      starLabelCandidates = starLabelCandidates
        .sort((a, b) => b.priority - a.priority)
        .slice(0, maxStarLabels);
    }
  }

  const placedLabels = placeLabelCandidates({
    candidates: [...starLabelCandidates, ...constellationLabelCandidates],
    strategy: labelPlacementStrategy,
    collisionPadding: labelCollisionPadding,
    maxShift: labelMaxShift,
    obstacles: labelObstacles,
    chartCx,
    chartCy,
    chartR
  });

  const constellationLabels: { x: number; y: number; text: string }[] = placedLabels
    .filter((l) => l.kind === 'constellation')
    .map((l) => ({ x: l.x, y: l.y, text: l.text }));

  const starLabels: { x: number; y: number; text: string }[] = placedLabels
    .filter((l) => l.kind === 'star')
    .map((l) => ({ x: l.x - STAR_LABEL_DX, y: l.y - STAR_LABEL_DY, text: l.text }));

  const solarSystem: {
    x: number;
    y: number;
    r: number;
    label: string;
    kind: 'sun' | 'moon' | 'planet';
    moonPhaseDeg?: number;
    limbAngleDeg?: number;
  }[] = [];
  if (params.showSolarSystem) {
    const obs = new Observer(latitude, longitude, 0);
    const t = new AstroTime(date);
    const moonPhaseDeg = MoonPhase(t);

    const bodyScreen = (body: Body): { altDeg: number; azDeg: number; x: number; y: number } => {
      const eq = Equator(body, t, obs, true, true);
      const hor = Horizon(t, obs, eq.ra, eq.dec);
      const altDeg = hor.altitude;
      const azDeg = hor.azimuth;
      const { x: x0, y: y0 } = altAzToXY(altDeg, azDeg);
      const x = x0 * mirrorX;
      return {
        altDeg,
        azDeg,
        x: chartCx + x * chartR,
        y: chartCy - y0 * chartR
      };
    };

    const addBody = (body: Body, label: string, kind: 'sun' | 'moon' | 'planet', r: number, extra?: { limbAngleDeg?: number }) => {
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
        moonPhaseDeg: kind === 'moon' ? moonPhaseDeg : undefined,
        limbAngleDeg: extra?.limbAngleDeg
      });
    };

    // Sun: show only when above horizon (daytime for the observer).
    addBody(Body.Sun, 'Sun', 'sun', 7.5);
    const moon = bodyScreen(Body.Moon);
    const sun = bodyScreen(Body.Sun);
    let limbAngleDeg = 0;
    const dx = sun.x - moon.x;
    const dy = sun.y - moon.y;
    if (Number.isFinite(dx) && Number.isFinite(dy) && (Math.abs(dx) + Math.abs(dy) > 1e-6)) {
      limbAngleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    }
    addBody(Body.Moon, 'Moon', 'moon', 6.5, { limbAngleDeg });
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
    coordinateGridPaths,
    starPoints,
    vertexPoints,
    linePaths,
    eclipticPoints,
    starLabels,
    constellationLabels,
    solarSystem,
    deepSky: deepSkyPoints
  };
}
