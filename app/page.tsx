'use client';

import { useEffect, useState } from 'react';

type RenderParams = {
  theme: 'light' | 'dark';
  showAzimuthScale: boolean;
  showCoordinateGrid: boolean;
  coordinateGridStepDeg: number;
  labelConstellations: boolean;
  labelBrightStars?: boolean;
  labelSolarSystem: boolean;
  mirrorHorizontal: boolean;
  showSolarSystem: boolean;
  showDeepSky: boolean;
  labelDeepSky: boolean;
  starMode: 'none' | 'constellations' | 'all';
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
  azimuthRingInnerWidth: number;
  azimuthRingOuterWidth: number;
};

type PosterParams = {
  size: 'a4' | 'square' | '16x20' | '20x20';
  palette:
    | 'classic-black'
    | 'midnight'
    | 'navy-gold'
    | 'cream-ink'
    | 'night-gold'
    | 'forest'
    | 'emerald'
    | 'plum'
    | 'burgundy'
    | 'slate'
    | 'sand';
  inkColor: string;
  border: boolean;
  borderWidth: number;
  borderInset: number;
  chartDiameter: number;
  title: string;
  subtitle: string;
  dedication: string;
  showCoordinates: boolean;
  coordsInline: boolean;
  showTime: boolean;
  includeAzimuthScale: boolean;
  showCardinals: boolean;
  ringInnerWidth: number;
  ringGap: number;
  ringOuterWidth: number;
  titleFont: 'serif' | 'sans' | 'mono' | 'prata';
  titleFontSize: number;
  namesFont: 'serif' | 'sans' | 'cursive' | 'jimmy-script';
  namesFontSize: number;
  metaFont: 'sans' | 'serif' | 'mono' | 'signika';
  metaFontSize: number;
  metaText: string;
  metaFontWeight: 400 | 500 | 700;
  metaLetterSpacing: number;
  metaLineSpacing: number;
  metaUppercase: boolean;
};

const defaultParams: RenderParams = {
  theme: 'light',
  showAzimuthScale: true,
  showCoordinateGrid: false,
  coordinateGridStepDeg: 30,
  labelConstellations: true,
  labelSolarSystem: true,
  mirrorHorizontal: true,
  showSolarSystem: true,
  showDeepSky: false,
  labelDeepSky: true,
  starMode: 'all',
  magnitudeLimit: 6.0,
  minStarSize: 1.1,
  starSizeMin: 0.75,
  starSizeMax: 6.0,
  starSizeGamma: 1.8,
  starAlpha: 1.0,
  emphasizeVertices: true,
  vertexSizeMin: 3.0,
  vertexSizeMax: 22.0,
  vertexSizeGamma: 1.2,
  vertexAlpha: 0.95,
  constellationLineWidth: 0.6,
  constellationLineAlpha: 0.7,
  eclipticAlpha: 0.35,
  azimuthRingInnerWidth: 1.2,
  azimuthRingOuterWidth: 0.8
};

const defaultPoster: PosterParams = {
  size: '16x20',
  palette: 'navy-gold',
  inkColor: '#d9d9d9',
  border: true,
  borderWidth: 2,
  borderInset: 14,
  chartDiameter: 12.8 * 72,
  title: 'THE NIGHT OUR STORY BEGAN',
  subtitle: '',
  dedication: '',
  showCoordinates: true,
  coordsInline: false,
  showTime: false,
  includeAzimuthScale: true,
  showCardinals: false,
  ringInnerWidth: 13,
  ringGap: 6,
  ringOuterWidth: 7,
  titleFont: 'prata',
  titleFontSize: 45,
  namesFont: 'jimmy-script',
  namesFontSize: 65,
  metaFont: 'signika',
  metaFontSize: 23,
  metaText: '',
  metaFontWeight: 500,
  metaLetterSpacing: 5.8,
  metaLineSpacing: 1.5,
  metaUppercase: true
};

const posterSizePresets: Record<PosterParams['size'], Partial<PosterParams>> = {
  a4: {
    chartDiameter: 520,
    ringInnerWidth: 1.2,
    ringGap: 18,
    ringOuterWidth: 0.8,
    titleFontSize: 40,
    namesFontSize: 22,
    metaFontSize: 12,
    metaLetterSpacing: 0,
    metaLineSpacing: 1.35
  },
  square: {
    chartDiameter: 760,
    ringInnerWidth: 1.2,
    ringGap: 18,
    ringOuterWidth: 0.8,
    titleFontSize: 56,
    namesFontSize: 28,
    metaFontSize: 12,
    metaLetterSpacing: 0,
    metaLineSpacing: 1.35
  },
  '16x20': {
    chartDiameter: 12.8 * 72,
    ringInnerWidth: 13,
    ringGap: 6,
    ringOuterWidth: 7,
    titleFont: 'prata',
    titleFontSize: 45,
    namesFont: 'jimmy-script',
    namesFontSize: 65,
    metaFont: 'signika',
    metaFontSize: 23,
    metaLetterSpacing: 5.8,
    metaLineSpacing: 1.5,
    includeAzimuthScale: true,
    showCardinals: false,
    metaUppercase: true
  },
  '20x20': {
    chartDiameter: 14.3 * 72,
    ringInnerWidth: 14,
    ringGap: 7,
    ringOuterWidth: 8,
    titleFont: 'prata',
    titleFontSize: 40,
    namesFont: 'jimmy-script',
    namesFontSize: 60,
    metaFont: 'signika',
    metaFontSize: 21,
    metaLetterSpacing: 5.3,
    metaLineSpacing: 1.5,
    includeAzimuthScale: true,
    showCardinals: false,
    metaUppercase: true
  }
};

const posterPalettes: { key: PosterParams['palette']; label: string; bg: string; ink: string }[] = [
  { key: 'classic-black', label: 'Classic', bg: '#0b0b0d', ink: '#f6f6f7' },
  { key: 'midnight', label: 'Midnight', bg: '#0b1020', ink: '#ffffff' },
  { key: 'navy-gold', label: 'Navy/Gold', bg: '#151c2d', ink: '#f4c25b' },
  { key: 'night-gold', label: 'Night/Gold', bg: '#24283a', ink: '#fbab29' },
  { key: 'cream-ink', label: 'Cream', bg: '#fbf5ea', ink: '#1b1b1b' },
  { key: 'slate', label: 'Slate', bg: '#111827', ink: '#d9d9d9' },
  { key: 'forest', label: 'Forest', bg: '#0e1f16', ink: '#d9d9d9' },
  { key: 'emerald', label: 'Emerald', bg: '#0b3d2e', ink: '#d9d9d9' },
  { key: 'plum', label: 'Plum', bg: '#1c1230', ink: '#d9d9d9' },
  { key: 'burgundy', label: 'Burgundy', bg: '#2a0f1a', ink: '#d9d9d9' },
  { key: 'sand', label: 'Sand', bg: '#f7f3e8', ink: '#1b1b1b' }
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
      <div style={{ color: '#333' }}>{label}</div>
      {children}
    </label>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function parseBool(v: string | null, fallback: boolean) {
  if (v === null) return fallback;
  return v === '1' || v.toLowerCase() === 'true';
}

function parseNum(v: string | null, fallback: number) {
  if (v === null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseEnum<T extends string>(v: string | null, allowed: readonly T[], fallback: T): T {
  if (!v) return fallback;
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

function encodeStateToQuery(input: {
  locationMode: 'city' | 'latlon';
  cityQuery: string;
  lat: number;
  lon: number;
  dateTime: string;
  locationLabelOverride: string;
  params: RenderParams;
  poster: PosterParams;
  metaAuto: boolean;
  view: 'poster' | 'chart';
}) {
  const sp = new URLSearchParams();
  sp.set('mode', input.locationMode);
  sp.set('q', input.cityQuery);
  sp.set('lat', String(input.lat));
  sp.set('lon', String(input.lon));
  sp.set('dt', input.dateTime);
  if (input.locationLabelOverride) sp.set('label', input.locationLabelOverride);

  const p = input.params;
  sp.set('theme', p.theme);
  sp.set('az', p.showAzimuthScale ? '1' : '0');
  sp.set('cg', p.showCoordinateGrid ? '1' : '0');
  sp.set('cgs', String(p.coordinateGridStepDeg));
  sp.set('cl', p.labelConstellations ? '1' : '0');
  sp.set('psl', p.labelSolarSystem ? '1' : '0');
  sp.set('mh', p.mirrorHorizontal ? '1' : '0');
  sp.set('ss', p.showSolarSystem ? '1' : '0');
  sp.set('dso', p.showDeepSky ? '1' : '0');
  sp.set('dsl', p.labelDeepSky ? '1' : '0');
  sp.set('sm', p.starMode);
  sp.set('ml', String(p.magnitudeLimit));
  sp.set('mss', String(p.minStarSize));
  sp.set('ssmin', String(p.starSizeMin));
  sp.set('ssmax', String(p.starSizeMax));
  sp.set('ssg', String(p.starSizeGamma));
  sp.set('sa', String(p.starAlpha));
  sp.set('ev', p.emphasizeVertices ? '1' : '0');
  sp.set('vsmin', String(p.vertexSizeMin));
  sp.set('vsmax', String(p.vertexSizeMax));
  sp.set('vsg', String(p.vertexSizeGamma));
  sp.set('va', String(p.vertexAlpha));
  sp.set('lw', String(p.constellationLineWidth));
  sp.set('la', String(p.constellationLineAlpha));
  sp.set('ea', String(p.eclipticAlpha));
  sp.set('aiw', String(p.azimuthRingInnerWidth));
  sp.set('aow', String(p.azimuthRingOuterWidth));

  const po = input.poster;
  sp.set('view', input.view);
  sp.set('ps', po.size);
  sp.set('pp', po.palette);
  sp.set('pic', po.inkColor);
  sp.set('pb', po.border ? '1' : '0');
  sp.set('pbw', String(po.borderWidth));
  sp.set('pbi', String(po.borderInset));
  sp.set('pcd', String(po.chartDiameter));
  sp.set('pt', po.title);
  sp.set('pst', po.subtitle);
  sp.set('pd', po.dedication);
  sp.set('pc', po.showCoordinates ? '1' : '0');
  sp.set('pci', po.coordsInline ? '1' : '0');
  sp.set('ptime', po.showTime ? '1' : '0');
  sp.set('paz', po.includeAzimuthScale ? '1' : '0');
  sp.set('psc', po.showCardinals ? '1' : '0');
  sp.set('pri', String(po.ringInnerWidth));
  sp.set('prg', String(po.ringGap));
  sp.set('pro', String(po.ringOuterWidth));
  sp.set('ptf', po.titleFont);
  sp.set('ptfs', String(po.titleFontSize));
  sp.set('pnf', po.namesFont);
  sp.set('pnfs', String(po.namesFontSize));
  sp.set('pmf', po.metaFont);
  sp.set('pmfs', String(po.metaFontSize));
  sp.set('pmt', po.metaText);
  sp.set('pmw', String(po.metaFontWeight));
  sp.set('pmls', String(po.metaLetterSpacing));
  sp.set('pmlh', String(po.metaLineSpacing));
  sp.set('pmu', po.metaUppercase ? '1' : '0');
  sp.set('pma', input.metaAuto ? '1' : '0');
  return sp.toString();
}

function decodeStateFromQuery(): Partial<{
  locationMode: 'city' | 'latlon';
  cityQuery: string;
  lat: number;
  lon: number;
  dateTime: string;
  locationLabelOverride: string;
  params: RenderParams;
  poster: PosterParams;
  metaAuto: boolean;
  view: 'poster' | 'chart';
}> {
  const sp = new URLSearchParams(window.location.search);
  const mode = sp.get('mode');
  const theme = sp.get('theme');
  const sm = sp.get('sm');
  const view = sp.get('view');

	  const params: RenderParams = {
    ...defaultParams,
    theme: theme === 'dark' ? 'dark' : 'light',
    showAzimuthScale: parseBool(sp.get('az'), defaultParams.showAzimuthScale),
    showCoordinateGrid: parseBool(sp.get('cg'), defaultParams.showCoordinateGrid),
    coordinateGridStepDeg: parseNum(sp.get('cgs'), defaultParams.coordinateGridStepDeg),
    labelConstellations: parseBool(sp.get('cl'), defaultParams.labelConstellations),
    labelSolarSystem: parseBool(sp.get('psl'), defaultParams.labelSolarSystem),
    mirrorHorizontal: parseBool(sp.get('mh'), defaultParams.mirrorHorizontal),
    showSolarSystem: parseBool(sp.get('ss'), defaultParams.showSolarSystem),
    showDeepSky: parseBool(sp.get('dso'), defaultParams.showDeepSky),
    labelDeepSky: parseBool(sp.get('dsl'), defaultParams.labelDeepSky),
    starMode: sm === 'none' || sm === 'constellations' || sm === 'all' ? sm : defaultParams.starMode,
    magnitudeLimit: parseNum(sp.get('ml'), defaultParams.magnitudeLimit),
    minStarSize: parseNum(sp.get('mss'), defaultParams.minStarSize),
    starSizeMin: parseNum(sp.get('ssmin'), defaultParams.starSizeMin),
    starSizeMax: parseNum(sp.get('ssmax'), defaultParams.starSizeMax),
    starSizeGamma: parseNum(sp.get('ssg'), defaultParams.starSizeGamma),
    starAlpha: parseNum(sp.get('sa'), defaultParams.starAlpha),
    emphasizeVertices: parseBool(sp.get('ev'), defaultParams.emphasizeVertices),
    vertexSizeMin: parseNum(sp.get('vsmin'), defaultParams.vertexSizeMin),
    vertexSizeMax: parseNum(sp.get('vsmax'), defaultParams.vertexSizeMax),
    vertexSizeGamma: parseNum(sp.get('vsg'), defaultParams.vertexSizeGamma),
	    vertexAlpha: parseNum(sp.get('va'), defaultParams.vertexAlpha),
	    constellationLineWidth: parseNum(sp.get('lw'), defaultParams.constellationLineWidth),
	    constellationLineAlpha: parseNum(sp.get('la'), defaultParams.constellationLineAlpha),
	    eclipticAlpha: parseNum(sp.get('ea'), defaultParams.eclipticAlpha),
	    azimuthRingInnerWidth: parseNum(sp.get('aiw'), defaultParams.azimuthRingInnerWidth),
	    azimuthRingOuterWidth: parseNum(sp.get('aow'), defaultParams.azimuthRingOuterWidth)
	  };

  const ps = sp.get('ps');
  const pp = sp.get('pp');
	  const poster: PosterParams = {
    ...defaultPoster,
    size: ps === '20x20' ? '20x20' : ps === '16x20' ? '16x20' : ps === 'square' ? 'square' : 'a4',
    palette:
      pp === 'classic-black' ||
      pp === 'midnight' ||
      pp === 'navy-gold' ||
      pp === 'night-gold' ||
      pp === 'cream-ink' ||
      pp === 'slate' ||
      pp === 'forest' ||
      pp === 'emerald' ||
      pp === 'plum' ||
      pp === 'burgundy' ||
      pp === 'sand'
        ? pp
        : defaultPoster.palette,
    inkColor: sp.get('pic') ?? defaultPoster.inkColor,
    border: parseBool(sp.get('pb'), defaultPoster.border),
    borderWidth: parseNum(sp.get('pbw'), defaultPoster.borderWidth),
    borderInset: parseNum(sp.get('pbi'), defaultPoster.borderInset),
    chartDiameter: parseNum(sp.get('pcd'), defaultPoster.chartDiameter),
    title: sp.get('pt') ?? defaultPoster.title,
    subtitle: sp.get('pst') ?? defaultPoster.subtitle,
	    dedication: sp.get('pd') ?? defaultPoster.dedication,
	    showCoordinates: parseBool(sp.get('pc'), defaultPoster.showCoordinates),
	    coordsInline: parseBool(sp.get('pci'), defaultPoster.coordsInline),
	    showTime: parseBool(sp.get('ptime'), defaultPoster.showTime),
	    includeAzimuthScale: parseBool(sp.get('paz'), defaultPoster.includeAzimuthScale),
	    showCardinals: parseBool(sp.get('psc'), defaultPoster.showCardinals),
	    ringInnerWidth: parseNum(sp.get('pri'), defaultPoster.ringInnerWidth),
	    ringGap: parseNum(sp.get('prg'), defaultPoster.ringGap),
	    ringOuterWidth: parseNum(sp.get('pro'), defaultPoster.ringOuterWidth),
	    titleFont: parseEnum(sp.get('ptf'), ['serif', 'sans', 'mono', 'prata'] as const, defaultPoster.titleFont),
	    titleFontSize: parseNum(sp.get('ptfs'), defaultPoster.titleFontSize),
	    namesFont: parseEnum(sp.get('pnf'), ['serif', 'sans', 'cursive', 'jimmy-script'] as const, defaultPoster.namesFont),
	    namesFontSize: parseNum(sp.get('pnfs'), defaultPoster.namesFontSize),
	    metaFont: parseEnum(sp.get('pmf'), ['sans', 'serif', 'mono', 'signika'] as const, defaultPoster.metaFont),
	    metaFontSize: parseNum(sp.get('pmfs'), defaultPoster.metaFontSize),
	    metaText: sp.get('pmt') ?? defaultPoster.metaText,
	    metaFontWeight: (parseNum(sp.get('pmw'), defaultPoster.metaFontWeight) === 700
	      ? 700
	      : parseNum(sp.get('pmw'), defaultPoster.metaFontWeight) === 400
	        ? 400
	        : 500),
	    metaLetterSpacing: parseNum(sp.get('pmls'), defaultPoster.metaLetterSpacing),
	    metaLineSpacing: parseNum(sp.get('pmlh'), defaultPoster.metaLineSpacing),
	    metaUppercase: parseBool(sp.get('pmu'), defaultPoster.metaUppercase)
	  };

  return {
    locationMode: mode === 'latlon' ? 'latlon' : mode === 'city' ? 'city' : undefined,
    cityQuery: sp.get('q') ?? undefined,
    lat: sp.get('lat') ? parseNum(sp.get('lat'), 0) : undefined,
    lon: sp.get('lon') ? parseNum(sp.get('lon'), 0) : undefined,
    dateTime: sp.get('dt') ?? undefined,
    locationLabelOverride: sp.get('label') ?? undefined,
    params,
    poster,
    metaAuto: sp.get('pma') === null ? undefined : parseBool(sp.get('pma'), true),
    view: view === 'chart' ? 'chart' : view === 'poster' ? 'poster' : undefined
  };
}

export default function Page() {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [locationMode, setLocationMode] = useState<'city' | 'latlon'>('city');
  const [cityQuery, setCityQuery] = useState('Istanbul, Turkey');
  const [lat, setLat] = useState(0);
  const [lon, setLon] = useState(0);
  const [dateTime, setDateTime] = useState('2026-02-12T11:50');
  const [timeZone, setTimeZone] = useState<string>('');
  const [timeUtcIso, setTimeUtcIso] = useState<string>('');
  const [timeOffset, setTimeOffset] = useState<string>('');
  const [resolvedLabel, setResolvedLabel] = useState<string>('');
  const [locationLabelOverride, setLocationLabelOverride] = useState('');
  const [params, setParams] = useState<RenderParams>(defaultParams);
  const [poster, setPoster] = useState<PosterParams>(defaultPoster);
  const [chartSvg, setChartSvg] = useState<string>('');
  const [posterSvg, setPosterSvg] = useState<string>('');
  const [viewMode, setViewMode] = useState<'poster' | 'chart'>('poster');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>('');
  const [shareLink, setShareLink] = useState<string>('');
  const [metaAuto, setMetaAuto] = useState(true);
  const [lastAutoMetaText, setLastAutoMetaText] = useState('');

  function formatCoordsLine(latitude: number, longitude: number, precision = 4): string {
    const latStr = `${Math.abs(latitude).toFixed(precision)}°${latitude >= 0 ? 'N' : 'S'}`;
    const lonStr = `${Math.abs(longitude).toFixed(precision)}°${longitude >= 0 ? 'E' : 'W'}`;
    return `${latStr} ${lonStr}`;
  }

  function formatMetaDateLine(utcIso: string, tz: string, offset: string, showTime: boolean): string {
    const d = new Date(utcIso);
    const datePart = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: tz }).format(d);
    if (!showTime) return datePart;
    const timePart = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).format(d);
    const off = offset || '+00:00';
    return `${datePart}  ${timePart} (UTC ${off})`;
  }

  function patchMetaText(input: {
    current: string;
    label: string;
    latitude: number;
    longitude: number;
    utcIso: string;
    tz: string;
    offset: string;
    showCoordinates: boolean;
    coordsInline: boolean;
    showTime: boolean;
  }): string {
    const coordsLine = formatCoordsLine(input.latitude, input.longitude, input.coordsInline ? 2 : 4);
    const dateLine = formatMetaDateLine(input.utcIso, input.tz, input.offset, input.showTime);
    const lines = input.current
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return buildDefaultMetaText(input);

    // Ensure first line exists (keep user's first line, fallback to resolved label).
    if (!lines[0]) lines[0] = input.label;

    // Coordinates line heuristics: if showCoordinates, keep/insert as 2nd line; if not, remove if 2nd line looks like coords.
    const looksLikeCoords = (s: string) => /\d+\.\d+°[NS]\s+\d+\.\d+°[EW]/.test(s);
    if (input.showCoordinates && !input.coordsInline) {
      if (lines.length < 2) lines.push(coordsLine);
      else if (looksLikeCoords(lines[1])) lines[1] = coordsLine;
      else lines.splice(1, 0, coordsLine);
    } else {
      if (lines.length >= 2 && looksLikeCoords(lines[1])) lines.splice(1, 1);
    }

    if (input.showCoordinates && input.coordsInline) {
      // Put coords on the first line in a compact way.
      const base = lines[0].split('|')[0].trim() || input.label;
      lines[0] = `${base} | ${coordsLine}`;
    }

    // Replace last line with date/time line.
    lines[lines.length - 1] = dateLine;
    return lines.join('\n');
  }

  function buildDefaultMetaText(input: {
    label: string;
    latitude: number;
    longitude: number;
    utcIso: string;
    tz: string;
    offset: string;
    showCoordinates: boolean;
    coordsInline: boolean;
    showTime: boolean;
  }): string {
    const lines: string[] = [];
    const coordsLine = formatCoordsLine(input.latitude, input.longitude, input.coordsInline ? 2 : 4);
    lines.push(input.showCoordinates && input.coordsInline ? `${input.label} | ${coordsLine}` : input.label);
    if (input.showCoordinates && !input.coordsInline) lines.push(coordsLine);
    lines.push(formatMetaDateLine(input.utcIso, input.tz, input.offset, input.showTime));
    return lines.join('\n');
  }

  async function geocode(): Promise<{ lat: number; lon: number; label: string } | null> {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(cityQuery)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { lat: number; lon: number; label: string }[];
    return data[0] ?? null;
  }

  async function normalizeTime(latitude: number, longitude: number): Promise<{ timeUtcIso: string; timeZone: string; offset: string }> {
    const res = await fetch('/api/normalize-time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude, longitude, localDateTime: dateTime })
    });
    if (!res.ok) throw new Error((await res.text()) || 'Time normalization failed');
    const data = (await res.json()) as { timeUtcIso: string; timeZone: string; offset: string };
    return data;
  }

  async function generate() {
    setBusy(true);
    setError('');
    try {
      let latitude = lat;
      let longitude = lon;
      let label = locationLabelOverride || `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;

      if (locationMode === 'city') {
        const g = await geocode();
        if (!g) throw new Error('Konum bulunamadı.');
        latitude = g.lat;
        longitude = g.lon;
        label = locationLabelOverride || g.label;
        setLat(latitude);
        setLon(longitude);
      }

      const { timeUtcIso, timeZone: tz, offset } = await normalizeTime(latitude, longitude);
      setTimeZone(tz);
      setTimeUtcIso(timeUtcIso);
      setTimeOffset(offset);
      setResolvedLabel(label);

      const shouldAutoMeta = metaAuto || !poster.metaText.trim();
      const nextMetaText = buildDefaultMetaText({
        label,
        latitude,
        longitude,
        utcIso: timeUtcIso,
        tz,
        offset,
        showCoordinates: poster.showCoordinates,
        coordsInline: poster.coordsInline,
        showTime: poster.showTime
      });
      const shouldWriteMeta =
        metaAuto || poster.metaText.trim().length === 0 || poster.metaText.trim() === lastAutoMetaText.trim();
      const posterForReq = shouldWriteMeta ? { ...poster, metaText: nextMetaText } : poster;
      if (shouldWriteMeta) {
        setPoster((p) => ({ ...p, metaText: nextMetaText }));
        setLastAutoMetaText(nextMetaText);
      }

      const chartReq = fetch('/api/chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude, timeUtcIso, timeZone: tz, timeLocal: dateTime, locationLabel: label, params })
      });
      const posterReq = fetch('/api/poster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude, timeUtcIso, timeZone: tz, timeLocal: dateTime, locationLabel: label, params, poster: posterForReq })
      });

      const [chartRes, posterRes] = await Promise.all([chartReq, posterReq]);
      if (!chartRes.ok) throw new Error((await chartRes.text()) || 'Chart generation failed');
      if (!posterRes.ok) throw new Error((await posterRes.text()) || 'Poster generation failed');

      setChartSvg(await chartRes.text());
      setPosterSvg(await posterRes.text());

      const qs = encodeStateToQuery({
        locationMode,
        cityQuery,
        lat: latitude,
        lon: longitude,
        dateTime,
        locationLabelOverride,
        params,
        poster: posterForReq,
        metaAuto,
        view: viewMode
      });
      const url = `${window.location.origin}${window.location.pathname}?${qs}`;
      window.history.replaceState(null, '', url);
      setShareLink(url);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const decoded = decodeStateFromQuery();
    if (decoded.locationMode) setLocationMode(decoded.locationMode);
    if (decoded.cityQuery) setCityQuery(decoded.cityQuery);
    if (typeof decoded.lat === 'number') setLat(decoded.lat);
    if (typeof decoded.lon === 'number') setLon(decoded.lon);
    if (decoded.dateTime) setDateTime(decoded.dateTime);
    if (decoded.locationLabelOverride) setLocationLabelOverride(decoded.locationLabelOverride);
    if (decoded.params) setParams(decoded.params);
    const initialMetaAuto = typeof decoded.metaAuto === 'boolean' ? decoded.metaAuto : true;
    setMetaAuto(initialMetaAuto);
    if (decoded.poster) {
      setPoster(decoded.poster);
      setLastAutoMetaText(initialMetaAuto ? decoded.poster.metaText ?? '' : '');
    }
    if (decoded.view) setViewMode(decoded.view);

    // generate after state is applied
    setTimeout(() => generate(), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function downloadSvg(svgText: string, filename: string) {
    const blob = new Blob([svgText], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadPng(svgText: string, filename: string, scale: number) {
    const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('PNG conversion failed'));
      img.src = svgUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(img.width * scale);
    canvas.height = Math.floor(img.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(svgUrl);
    const pngBlob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b as Blob), 'image/png'));
    const pngUrl = URL.createObjectURL(pngBlob);
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(pngUrl);
  }

  async function copyLink() {
    const url = shareLink || `${window.location.href}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // best-effort fallback
      window.prompt('Linki kopyala:', url);
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `${leftOpen ? 420 : 64}px 1fr ${rightOpen ? 380 : 64}px`, minHeight: '100vh' }}>
      <div
        style={{
          padding: leftOpen ? 18 : 8,
          borderRight: '1px solid #e5e7eb',
          background: '#fafafa',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: leftOpen ? 'space-between' : 'center', gap: 10, marginBottom: leftOpen ? 12 : 6 }}>
          {leftOpen ? <div style={{ fontSize: 18, fontWeight: 700 }}>Sky Chart</div> : null}
          <button
            onClick={() => setLeftOpen((v) => !v)}
            title={leftOpen ? 'Kontrolleri gizle' : 'Kontrolleri göster'}
            aria-label={leftOpen ? 'Kontrolleri gizle' : 'Kontrolleri göster'}
            style={{
              width: 40,
              height: 40,
              border: '1px solid #cbd5e1',
              background: '#fff',
              cursor: 'pointer',
              borderRadius: 10,
              fontSize: 18,
              lineHeight: '40px'
            }}
          >
            {leftOpen ? '‹' : '›'}
          </button>
        </div>

        {!leftOpen ? (
          <div style={{ display: 'flex', justifyContent: 'center', color: '#6b7280', fontSize: 11, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            Kontroller
          </div>
        ) : null}

        {!leftOpen ? null : (
          <>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => setLocationMode('city')}
            style={{ padding: '8px 10px', border: '1px solid #ddd', background: locationMode === 'city' ? '#fff' : '#f3f4f6' }}
          >
            Şehir/Ülke
          </button>
          <button
            onClick={() => setLocationMode('latlon')}
            style={{ padding: '8px 10px', border: '1px solid #ddd', background: locationMode === 'latlon' ? '#fff' : '#f3f4f6' }}
          >
            Enlem/Boylam
          </button>
        </div>

        {locationMode === 'city' ? (
          <Field label="Şehir, Ülke">
            <input value={cityQuery} onChange={(e) => setCityQuery(e.target.value)} style={{ padding: 10, border: '1px solid #ddd' }} />
          </Field>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Enlem (lat)">
              <input
                type="number"
                value={lat}
                onChange={(e) => setLat(Number(e.target.value))}
                step="0.0001"
                style={{ padding: 10, border: '1px solid #ddd' }}
              />
            </Field>
            <Field label="Boylam (lon)">
              <input
                type="number"
                value={lon}
                onChange={(e) => setLon(Number(e.target.value))}
                step="0.0001"
                style={{ padding: 10, border: '1px solid #ddd' }}
              />
            </Field>
          </div>
        )}

        <div style={{ height: 12 }} />
        <Field label="Tarih/Saat (lokal)">
          <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} style={{ padding: 10, border: '1px solid #ddd' }} />
        </Field>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
          {timeZone ? `Timezone: ${timeZone} (UTC${timeOffset || ''})` : 'Timezone: (Generate ile otomatik bulunur)'}
          {timeUtcIso ? (
            <div style={{ marginTop: 2 }}>UTC: {timeUtcIso.replace('.000Z', 'Z')}</div>
          ) : null}
        </div>

        <div style={{ height: 12 }} />
        <Field label="Etiket (opsiyonel)">
          <input
            value={locationLabelOverride}
            onChange={(e) => setLocationLabelOverride(e.target.value)}
            placeholder="Or: The Night Sky, Istanbul"
            style={{ padding: 10, border: '1px solid #ddd' }}
          />
        </Field>

        <div style={{ height: 14 }} />
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Parametreler</div>

        <div style={{ display: 'grid', gap: 10 }}>
          <Field label="Tema">
            <select
              value={params.theme}
              onChange={(e) => setParams((p) => ({ ...p, theme: e.target.value === 'dark' ? 'dark' : 'light' }))}
              style={{ padding: 10, border: '1px solid #ddd', background: '#fff' }}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </Field>

          <Field label="Yıldız modu">
            <select
              value={params.starMode}
              onChange={(e) => {
                const v = e.target.value as RenderParams['starMode'];
                setParams((p) => ({ ...p, starMode: v }));
              }}
              style={{ padding: 10, border: '1px solid #ddd', background: '#fff' }}
            >
              <option value="all">All</option>
              <option value="constellations">Constellations only</option>
              <option value="none">None</option>
            </select>
          </Field>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={params.showSolarSystem}
              onChange={(e) => setParams((p) => ({ ...p, showSolarSystem: e.target.checked }))}
            />
            Güneş / Ay / Gezegenler
          </label>

          {params.showSolarSystem ? (
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, paddingLeft: 22 }}>
              <input
                type="checkbox"
                checked={params.labelSolarSystem}
                onChange={(e) => setParams((p) => ({ ...p, labelSolarSystem: e.target.checked }))}
              />
              Gezegen isimleri
            </label>
          ) : null}

          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={params.showDeepSky}
              onChange={(e) => setParams((p) => ({ ...p, showDeepSky: e.target.checked }))}
            />
            Önemli gökcisimleri (M31, M42…)
          </label>

          {params.showDeepSky ? (
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, paddingLeft: 22 }}>
              <input
                type="checkbox"
                checked={params.labelDeepSky}
                onChange={(e) => setParams((p) => ({ ...p, labelDeepSky: e.target.checked }))}
              />
              Gökcismi isimleri
            </label>
          ) : null}

          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={params.mirrorHorizontal}
              onChange={(e) => setParams((p) => ({ ...p, mirrorHorizontal: e.target.checked }))}
            />
            Gözlemci görünümü (Doğu/Batı aynala)
          </label>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={params.showAzimuthScale}
              onChange={(e) => setParams((p) => ({ ...p, showAzimuthScale: e.target.checked }))}
            />
            Azimut ölçeği (dış halka)
          </label>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={params.showCoordinateGrid}
              onChange={(e) => setParams((p) => ({ ...p, showCoordinateGrid: e.target.checked }))}
            />
            Koordinat ızgarası (gök enlem/boylam)
          </label>

          {params.showCoordinateGrid ? (
            <Field label={`Izgara aralığı: ${params.coordinateGridStepDeg}° (küçük = daha yoğun)`}>
              <select
                value={params.coordinateGridStepDeg}
                onChange={(e) => setParams((p) => ({ ...p, coordinateGridStepDeg: Number(e.target.value) }))}
                style={{ padding: 10, border: '1px solid #ddd', background: '#fff' }}
              >
                <option value={30}>Seyrek (30°)</option>
                <option value={20}>Orta (20°)</option>
                <option value={15}>Detaylı (15°)</option>
                <option value={10}>Çok detaylı (10°)</option>
              </select>
            </Field>
          ) : null}

          {params.showAzimuthScale ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label={`Ring inner: ${params.azimuthRingInnerWidth.toFixed(2)}`}>
                <input
                  type="range"
                  min={0.2}
                  max={12.0}
                  step={0.05}
                  value={params.azimuthRingInnerWidth}
                  onChange={(e) => setParams((p) => ({ ...p, azimuthRingInnerWidth: Number(e.target.value) }))}
                />
              </Field>
              <Field label={`Ring outer: ${params.azimuthRingOuterWidth.toFixed(2)}`}>
                <input
                  type="range"
                  min={0.2}
                  max={12.0}
                  step={0.05}
                  value={params.azimuthRingOuterWidth}
                  onChange={(e) => setParams((p) => ({ ...p, azimuthRingOuterWidth: Number(e.target.value) }))}
                />
              </Field>
            </div>
          ) : null}

          <Field label={`Magnitude limit: ${params.magnitudeLimit.toFixed(1)} (düşür: daha az yıldız)`}>
            <input
              type="range"
              min={3.5}
              max={7.0}
              step={0.1}
              value={params.magnitudeLimit}
              onChange={(e) => setParams((p) => ({ ...p, magnitudeLimit: Number(e.target.value) }))}
            />
          </Field>

          <Field label={`Min star size: ${params.minStarSize.toFixed(2)} (artır: kalabalık azalır)`}>
            <input
              type="range"
              min={0.2}
              max={3.0}
              step={0.05}
              value={params.minStarSize}
              onChange={(e) => setParams((p) => ({ ...p, minStarSize: Number(e.target.value) }))}
            />
          </Field>

          <Field label={`Star size min: ${params.starSizeMin.toFixed(2)}`}>
            <input
              type="range"
              min={0.1}
              max={3.0}
              step={0.05}
              value={params.starSizeMin}
              onChange={(e) => setParams((p) => ({ ...p, starSizeMin: Number(e.target.value) }))}
            />
          </Field>

          <Field label={`Star size max: ${params.starSizeMax.toFixed(1)} (çok artırma: balon)`}>
            <input
              type="range"
              min={1.0}
              max={20.0}
              step={0.2}
              value={params.starSizeMax}
              onChange={(e) => setParams((p) => ({ ...p, starSizeMax: Number(e.target.value) }))}
            />
          </Field>

          <Field label={`Star gamma: ${params.starSizeGamma.toFixed(2)} (artır: parlaklar daha hızlı büyür)`}>
            <input
              type="range"
              min={0.5}
              max={3.0}
              step={0.05}
              value={params.starSizeGamma}
              onChange={(e) => setParams((p) => ({ ...p, starSizeGamma: Number(e.target.value) }))}
            />
          </Field>

          <Field label={`Star alpha: ${params.starAlpha.toFixed(2)}`}>
            <input
              type="range"
              min={0.1}
              max={1.0}
              step={0.05}
              value={params.starAlpha}
              onChange={(e) => setParams((p) => ({ ...p, starAlpha: Number(e.target.value) }))}
            />
          </Field>

          <Field label={`Constellation line width: ${params.constellationLineWidth.toFixed(2)}`}>
            <input
              type="range"
              min={0.2}
              max={2.0}
              step={0.05}
              value={params.constellationLineWidth}
              onChange={(e) => setParams((p) => ({ ...p, constellationLineWidth: Number(e.target.value) }))}
            />
          </Field>

          <Field label={`Constellation line alpha: ${params.constellationLineAlpha.toFixed(2)}`}>
            <input
              type="range"
              min={0.05}
              max={1.0}
              step={0.05}
              value={params.constellationLineAlpha}
              onChange={(e) => setParams((p) => ({ ...p, constellationLineAlpha: Number(e.target.value) }))}
            />
          </Field>

          <Field label={`Ecliptic alpha: ${params.eclipticAlpha.toFixed(2)}`}>
            <input
              type="range"
              min={0.0}
              max={1.0}
              step={0.05}
              value={params.eclipticAlpha}
              onChange={(e) => setParams((p) => ({ ...p, eclipticAlpha: Number(e.target.value) }))}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={params.emphasizeVertices}
                onChange={(e) => setParams((p) => ({ ...p, emphasizeVertices: e.target.checked }))}
              />
              Köşe yıldızlarını vurgula
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={params.labelConstellations}
                onChange={(e) => setParams((p) => ({ ...p, labelConstellations: e.target.checked }))}
              />
              Takımyıldız isimleri
            </label>
          </div>

          {params.emphasizeVertices ? (
            <div style={{ display: 'grid', gap: 10, padding: 10, background: '#fff', border: '1px solid #eee' }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Köşe Yıldızları</div>
              <Field label={`Vertex min: ${params.vertexSizeMin.toFixed(1)}`}>
                <input
                  type="range"
                  min={0.1}
                  max={10.0}
                  step={0.1}
                  value={params.vertexSizeMin}
                  onChange={(e) => setParams((p) => ({ ...p, vertexSizeMin: Number(e.target.value) }))}
                />
              </Field>
              <Field label={`Vertex max: ${params.vertexSizeMax.toFixed(1)}`}>
                <input
                  type="range"
                  min={1.0}
                  max={40.0}
                  step={0.5}
                  value={params.vertexSizeMax}
                  onChange={(e) => setParams((p) => ({ ...p, vertexSizeMax: Number(e.target.value) }))}
                />
              </Field>
              <Field label={`Vertex gamma: ${params.vertexSizeGamma.toFixed(2)}`}>
                <input
                  type="range"
                  min={0.5}
                  max={3.0}
                  step={0.05}
                  value={params.vertexSizeGamma}
                  onChange={(e) => setParams((p) => ({ ...p, vertexSizeGamma: Number(e.target.value) }))}
                />
              </Field>
              <Field label={`Vertex alpha: ${params.vertexAlpha.toFixed(2)}`}>
                <input
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={params.vertexAlpha}
                  onChange={(e) => setParams((p) => ({ ...p, vertexAlpha: Number(e.target.value) }))}
                />
              </Field>
            </div>
          ) : null}
        </div>

        <div style={{ height: 14 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={generate}
            disabled={busy}
            style={{ padding: '10px 12px', border: '1px solid #111', background: '#111', color: '#fff', cursor: 'pointer' }}
          >
            {busy ? 'Üretiliyor…' : 'Generate'}
          </button>
          <button
            onClick={() => downloadSvg(viewMode === 'poster' ? posterSvg : chartSvg, viewMode === 'poster' ? 'star-poster.svg' : 'sky-chart.svg')}
            disabled={viewMode === 'poster' ? !posterSvg : !chartSvg}
            style={{ padding: '10px 12px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
          >
            Download SVG
          </button>
          <button
            onClick={() => downloadPng(viewMode === 'poster' ? posterSvg : chartSvg, viewMode === 'poster' ? 'star-poster.png' : 'sky-chart.png', 3)}
            disabled={viewMode === 'poster' ? !posterSvg : !chartSvg}
            style={{ padding: '10px 12px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
          >
            Download PNG
          </button>
          <button
            onClick={copyLink}
            style={{ padding: '10px 12px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
          >
            Copy Link
          </button>
        </div>

        {error ? <div style={{ marginTop: 10, color: '#b91c1c', fontSize: 13 }}>{error}</div> : null}
          </>
        )}
      </div>

      <div style={{ padding: 18, overflow: 'auto', background: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
            <button
              onClick={() => setViewMode('poster')}
              style={{
                padding: '8px 10px',
                border: '1px solid #ddd',
                background: viewMode === 'poster' ? '#111' : '#fff',
                color: viewMode === 'poster' ? '#fff' : '#111'
              }}
            >
              Poster
            </button>
            <button
              onClick={() => setViewMode('chart')}
              style={{
                padding: '8px 10px',
                border: '1px solid #ddd',
                background: viewMode === 'chart' ? '#111' : '#fff',
                color: viewMode === 'chart' ? '#fff' : '#111'
              }}
            >
              Chart
            </button>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Preview</div>
          </div>

          <div
            style={{ border: '1px solid #e5e7eb', background: '#fff' }}
            dangerouslySetInnerHTML={{ __html: viewMode === 'poster' ? posterSvg : chartSvg }}
          />
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
            Not: Zaman girdisi seçilen konumun lokal saatine göre yorumlanır. PDF için tarayıcıdan yazdır (Print) kullanabilirsin.
          </div>
        </div>
      </div>

      <div
        style={{
          padding: rightOpen ? 18 : 8,
          borderLeft: '1px solid #e5e7eb',
          background: '#fafafa',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: rightOpen ? 'space-between' : 'center', gap: 10, marginBottom: rightOpen ? 12 : 6 }}>
          {rightOpen ? <div style={{ fontSize: 14, fontWeight: 700 }}>Poster Tasarimi</div> : null}
          <button
            onClick={() => setRightOpen((v) => !v)}
            title={rightOpen ? 'Tasarımı gizle' : 'Tasarımı göster'}
            aria-label={rightOpen ? 'Tasarımı gizle' : 'Tasarımı göster'}
            style={{
              width: 40,
              height: 40,
              border: '1px solid #cbd5e1',
              background: '#fff',
              cursor: 'pointer',
              borderRadius: 10,
              fontSize: 18,
              lineHeight: '40px'
            }}
          >
            {rightOpen ? '›' : '‹'}
          </button>
        </div>

        {!rightOpen ? (
          <div style={{ display: 'flex', justifyContent: 'center', color: '#6b7280', fontSize: 11, writingMode: 'vertical-rl' }}>
            Tasarım
          </div>
        ) : null}

        {!rightOpen ? null : <div style={{ display: 'grid', gap: 10 }}>
          <Field label="Poster boyutu">
            <select
              value={poster.size}
              onChange={(e) => {
                const v = e.target.value as PosterParams['size'];
                setPoster((p) => ({ ...p, ...posterSizePresets[v], size: v }));
              }}
              style={{ padding: 10, border: '1px solid #ddd', background: '#fff' }}
            >
              <option value="a4">A4 (595x842)</option>
              <option value="square">Square (1024x1024)</option>
              <option value="16x20">16x20 in (1152x1440)</option>
              <option value="20x20">20x20 in (1440x1440)</option>
            </select>
          </Field>

          <Field label="Yazi / cizgi rengi (hex)">
            <div style={{ display: 'grid', gap: 8 }}>
              <input
                value={poster.inkColor}
                onChange={(e) => setPoster((p) => ({ ...p, inkColor: e.target.value }))}
                placeholder="#d9d9d9"
                style={{ padding: 10, border: '1px solid #ddd' }}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                {[
                  { label: '#d9d9d9', v: '#d9d9d9' },
                  { label: '#fbab29', v: '#fbab29' },
                  { label: '#f4c25b', v: '#f4c25b' },
                  { label: '#ffffff', v: '#ffffff' },
                  { label: '#1b1b1b', v: '#1b1b1b' }
                ].map((c) => {
                  const active = poster.inkColor.trim().toLowerCase() === c.v;
                  return (
                    <button
                      key={c.v}
                      onClick={() => setPoster((p) => ({ ...p, inkColor: c.v }))}
                      title={c.label}
                      style={{
                        width: 34,
                        height: 28,
                        borderRadius: 8,
                        border: active ? '2px solid #111' : '1px solid #cbd5e1',
                        background: c.v,
                        cursor: 'pointer'
                      }}
                    />
                  );
                })}
                <span style={{ fontSize: 12, color: '#6b7280' }}>Hızlı seçim</span>
              </div>
            </div>
          </Field>

          <Field
            label={`Yıldız haritası çapı: ${(poster.chartDiameter / 72).toFixed(1)} in (${poster.chartDiameter.toFixed(0)}u)`}
          >
            <input
              type="range"
              min={300}
              max={1200}
              step={1}
              value={poster.chartDiameter}
              onChange={(e) => setPoster((p) => ({ ...p, chartDiameter: Number(e.target.value) }))}
            />
          </Field>

          <Field label="Renk paleti">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {posterPalettes.map((p) => {
                const active = poster.palette === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() =>
                      setPoster((s) => ({
                        ...s,
                        palette: p.key,
                        inkColor: s.inkColor === defaultPoster.inkColor ? p.ink : s.inkColor
                      }))
                    }
                    title={p.label}
                    style={{
                      height: 48,
                      border: active ? '2px solid #111' : '1px solid #cbd5e1',
                      background: `linear-gradient(135deg, ${p.bg} 0%, ${p.bg} 72%, ${p.ink} 72%, ${p.ink} 100%)`,
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        inset: 6,
                        border: `2px solid ${p.ink}`,
                        opacity: 0.75,
                        boxShadow: active ? '0 0 0 3px rgba(17,24,39,0.12)' : undefined
                      }}
                    />
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              Seçili: {posterPalettes.find((p) => p.key === poster.palette)?.label ?? poster.palette}
            </div>
          </Field>

          <Field label="Baslik (Title)">
            <input value={poster.title} onChange={(e) => setPoster((p) => ({ ...p, title: e.target.value }))} style={{ padding: 10, border: '1px solid #ddd' }} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Title font">
              <select
                value={poster.titleFont}
                onChange={(e) => setPoster((p) => ({ ...p, titleFont: e.target.value as PosterParams['titleFont'] }))}
                style={{ padding: 10, border: '1px solid #ddd', background: '#fff' }}
              >
                <option value="prata">Prata</option>
                <option value="serif">Serif</option>
                <option value="sans">Sans</option>
                <option value="mono">Mono</option>
              </select>
            </Field>
            <Field label={`Title size: ${poster.titleFontSize.toFixed(0)}`}>
              <input
                type="range"
                min={18}
                max={160}
                step={1}
                value={poster.titleFontSize}
                onChange={(e) => setPoster((p) => ({ ...p, titleFontSize: Number(e.target.value) }))}
              />
            </Field>
          </div>

          <Field label="Kisi isimleri (satir satir)">
            <textarea
              value={poster.subtitle}
              onChange={(e) => setPoster((p) => ({ ...p, subtitle: e.target.value }))}
              rows={2}
              style={{ padding: 10, border: '1px solid #ddd', resize: 'vertical' }}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Isimler font">
              <select
                value={poster.namesFont}
                onChange={(e) => setPoster((p) => ({ ...p, namesFont: e.target.value as PosterParams['namesFont'] }))}
                style={{ padding: 10, border: '1px solid #ddd', background: '#fff' }}
              >
                <option value="jimmy-script">Jimmy Script</option>
                <option value="serif">Serif</option>
                <option value="sans">Sans</option>
                <option value="cursive">Cursive</option>
              </select>
            </Field>
            <Field label={`Isimler size: ${poster.namesFontSize.toFixed(0)}`}>
              <input
                type="range"
                min={10}
                max={160}
                step={1}
                value={poster.namesFontSize}
                onChange={(e) => setPoster((p) => ({ ...p, namesFontSize: Number(e.target.value) }))}
              />
            </Field>
          </div>

          <Field label="Ek satirlar (opsiyonel, satir satir)">
            <textarea
              value={poster.dedication}
              onChange={(e) => setPoster((p) => ({ ...p, dedication: e.target.value }))}
              rows={4}
              style={{ padding: 10, border: '1px solid #ddd', resize: 'vertical' }}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Alt bilgi font">
              <select
                value={poster.metaFont}
                onChange={(e) => setPoster((p) => ({ ...p, metaFont: e.target.value as PosterParams['metaFont'] }))}
                style={{ padding: 10, border: '1px solid #ddd', background: '#fff' }}
              >
                <option value="signika">Signika</option>
                <option value="sans">Sans</option>
                <option value="serif">Serif</option>
                <option value="mono">Mono</option>
              </select>
            </Field>
            <Field label={`Alt bilgi size: ${poster.metaFontSize.toFixed(0)}`}>
              <input
                type="range"
                min={9}
                max={80}
                step={1}
                value={poster.metaFontSize}
                onChange={(e) => setPoster((p) => ({ ...p, metaFontSize: Number(e.target.value) }))}
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Alt bilgi weight">
              <select
                value={poster.metaFontWeight}
                onChange={(e) => setPoster((p) => ({ ...p, metaFontWeight: Number(e.target.value) as any }))}
                style={{ padding: 10, border: '1px solid #ddd', background: '#fff' }}
              >
                <option value={400}>Regular</option>
                <option value={500}>Medium</option>
                <option value={700}>Bold</option>
              </select>
            </Field>
            <Field label={`Letter spacing: ${poster.metaLetterSpacing.toFixed(1)}`}>
              <input
                type="range"
                min={-1.0}
                max={20.0}
                step={0.1}
                value={poster.metaLetterSpacing}
                onChange={(e) => setPoster((p) => ({ ...p, metaLetterSpacing: Number(e.target.value) }))}
              />
            </Field>
          </div>

          <Field label={`Line spacing: ${poster.metaLineSpacing.toFixed(2)}`}>
            <input
              type="range"
              min={1.0}
              max={2.0}
              step={0.05}
              value={poster.metaLineSpacing}
              onChange={(e) => setPoster((p) => ({ ...p, metaLineSpacing: Number(e.target.value) }))}
            />
          </Field>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <input type="checkbox" checked={poster.metaUppercase} onChange={(e) => setPoster((p) => ({ ...p, metaUppercase: e.target.checked }))} />
            Alt bilgi UPPERCASE
          </label>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={metaAuto}
              onChange={(e) => {
                const v = e.target.checked;
                setMetaAuto(v);
                if (v && timeUtcIso && timeZone) {
                  const label = resolvedLabel || locationLabelOverride || cityQuery;
                  const nextMetaText = buildDefaultMetaText({
                    label,
                    latitude: lat,
                    longitude: lon,
                    utcIso: timeUtcIso,
                    tz: timeZone,
                    offset: timeOffset,
                    showCoordinates: poster.showCoordinates,
                    coordsInline: poster.coordsInline,
                    showTime: poster.showTime
                  });
                  setPoster((p) => ({ ...p, metaText: nextMetaText }));
                }
              }}
            />
            Alt bilgi otomatik güncellensin
          </label>

          <Field label="Alt bilgi metni (ekranda gorunecek, satir satir)">
            <textarea
              value={poster.metaText}
              onChange={(e) => {
                setMetaAuto(false);
                setPoster((p) => ({ ...p, metaText: e.target.value }));
              }}
              rows={4}
              placeholder={'Örn:\nIstanbul, Turkey\n41.0082°N 28.9784°E\nFebruary 12, 2026  23:00 (UTC +03:00)'}
              style={{ padding: 10, border: '1px solid #ddd', resize: 'vertical' }}
            />
          </Field>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <input type="checkbox" checked={poster.border} onChange={(e) => setPoster((p) => ({ ...p, border: e.target.checked }))} />
            Cerceve (border)
          </label>

          {poster.border ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label={`Border width: ${poster.borderWidth.toFixed(1)}`}>
                <input
                  type="range"
                  min={0.5}
	                  max={6}
	                  step={0.5}
	                  value={poster.borderWidth}
	                  onChange={(e) => setPoster((p) => ({ ...p, borderWidth: Number(e.target.value) }))}
	                />
	              </Field>
	              <Field label={`Border inset: ${poster.borderInset.toFixed(0)}`}>
	                <input
	                  type="range"
	                  min={0}
	                  max={40}
	                  step={1}
	                  value={poster.borderInset}
	                  onChange={(e) => setPoster((p) => ({ ...p, borderInset: Number(e.target.value) }))}
	                />
	              </Field>
	            </div>
	          ) : null}

          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={poster.showCoordinates}
              onChange={(e) => {
                const v = e.target.checked;
                setPoster((p) => {
                  if (!timeUtcIso || !timeZone) return { ...p, showCoordinates: v };
                  const label = resolvedLabel || locationLabelOverride || cityQuery;
                  const nextMetaText = patchMetaText({
                    current: p.metaText || '',
                    label,
                    latitude: lat,
                    longitude: lon,
                    utcIso: timeUtcIso,
                    tz: timeZone,
                    offset: timeOffset,
                    showCoordinates: v,
                    coordsInline: p.coordsInline,
                    showTime: p.showTime
                  });
                  return { ...p, showCoordinates: v, coordsInline: v ? p.coordsInline : false, metaText: nextMetaText };
                });
              }}
            />
            Koordinatlar (lat/lon)
          </label>

          {poster.showCoordinates ? (
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, paddingLeft: 22 }}>
              <input
                type="checkbox"
                checked={poster.coordsInline}
                onChange={(e) => {
                  const v = e.target.checked;
                  setPoster((p) => {
                    if (!timeUtcIso || !timeZone) return { ...p, coordsInline: v };
                    const label = resolvedLabel || locationLabelOverride || cityQuery;
                    const nextMetaText = patchMetaText({
                      current: p.metaText || '',
                      label,
                      latitude: lat,
                      longitude: lon,
                      utcIso: timeUtcIso,
                      tz: timeZone,
                      offset: timeOffset,
                      showCoordinates: p.showCoordinates,
                      coordsInline: v,
                      showTime: p.showTime
                    });
                    return { ...p, coordsInline: v, metaText: nextMetaText };
                  });
                }}
              />
              Kompakt (lokasyon satırında)
            </label>
          ) : null}

          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={poster.showTime}
              onChange={(e) => {
                const v = e.target.checked;
                setPoster((p) => {
                  if (!timeUtcIso || !timeZone) return { ...p, showTime: v };
                  const label = resolvedLabel || locationLabelOverride || cityQuery;
                  const nextMetaText = patchMetaText({
                    current: p.metaText || '',
                    label,
                    latitude: lat,
                    longitude: lon,
                    utcIso: timeUtcIso,
                    tz: timeZone,
                    offset: timeOffset,
                    showCoordinates: p.showCoordinates,
                    coordsInline: p.coordsInline,
                    showTime: v
                  });
                  return { ...p, showTime: v, metaText: nextMetaText };
                });
              }}
            />
            Saat goster (UTC)
          </label>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <input type="checkbox" checked={poster.includeAzimuthScale} onChange={(e) => setPoster((p) => ({ ...p, includeAzimuthScale: e.target.checked }))} />
            Azimut olcegi (poster)
          </label>

          {poster.includeAzimuthScale ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <input type="checkbox" checked={poster.showCardinals} onChange={(e) => setPoster((p) => ({ ...p, showCardinals: e.target.checked }))} />
                N / E / S / W harfleri
              </label>
              <div style={{ display: 'grid', gap: 10 }}>
                <Field label={`Ring inner: ${poster.ringInnerWidth.toFixed(2)}`}>
                  <input
                    type="range"
                    min={0.2}
                    max={20.0}
                    step={0.05}
                    value={poster.ringInnerWidth}
                    onChange={(e) => setPoster((p) => ({ ...p, ringInnerWidth: Number(e.target.value) }))}
                  />
                </Field>
                <Field label={`Ring gap: ${poster.ringGap.toFixed(1)}`}>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    step={0.5}
                    value={poster.ringGap}
                    onChange={(e) => setPoster((p) => ({ ...p, ringGap: Number(e.target.value) }))}
                  />
                </Field>
                <Field label={`Ring outer: ${poster.ringOuterWidth.toFixed(2)}`}>
                  <input
                    type="range"
                    min={0.2}
                    max={20.0}
                    step={0.05}
                    value={poster.ringOuterWidth}
                    onChange={(e) => setPoster((p) => ({ ...p, ringOuterWidth: Number(e.target.value) }))}
                  />
                </Field>
              </div>
            </div>
          ) : null}

          <button
            onClick={generate}
            disabled={busy}
            style={{ padding: '10px 12px', border: '1px solid #111', background: '#fff', cursor: 'pointer' }}
          >
            {busy ? 'Üretiliyor…' : 'Update Poster'}
          </button>
        </div>}
      </div>
    </div>
  );
}
