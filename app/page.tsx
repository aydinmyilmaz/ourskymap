'use client';

import { useEffect, useState } from 'react';
import { renderAgeMosaicSvg } from '../lib/age';

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

type VinylParams = {
  size: PosterParams['size'];
  palette: PosterParams['palette'];
  inkColor: string;
  backgroundTexture: 'solid' | 'paper' | 'marble' | 'noise';
  recordImageDataUrl?: string;
  labelImageDataUrl?: string;
  diskDiameter: number;
  ringCountMax: number;
  ringFontSize: number;
  ringLetterSpacing: number;
  ringLineGap: number;
  title: string;
  songTitle: string;
  artist: string;
  outerText: string;
  names: string;
  dateLine: string;
  showCenterGuides: boolean;
  titleFont: PosterParams['titleFont'];
  titleFontSize: number;
  namesFont: PosterParams['namesFont'];
  namesFontSize: number;
  metaFont: PosterParams['metaFont'];
  metaFontSize: number;
};

type AgeParams = {
  size: PosterParams['size'];
  ageText: string;
  bgColor: string;
  inkColor: string;
  frame: boolean;
  frameInset: number;
  frameWidth: number;
  frameColor: string;
  ageFontFamily: string;
  ageFontWeight: number;
  ageFontSize: number;
  ageY: number;
  tileSize: number;
  tileGap: number;
  tileBleed: number;
  caption: string;
  captionFontFamily: string;
  captionFontSize: number;
  captionY: number;
  subCaption: string;
  subCaptionFontFamily: string;
  subCaptionFontSize: number;
  subCaptionY: number;
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

const defaultVinyl: VinylParams = {
  size: '16x20',
  palette: 'sand',
  inkColor: '#1b1b1b',
  backgroundTexture: 'paper',
  recordImageDataUrl: '',
  labelImageDataUrl: '',
  diskDiameter: 11.5 * 72,
  ringCountMax: 8,
  ringFontSize: 12,
  ringLetterSpacing: 2.0,
  ringLineGap: 2,
  title: 'YOUR TITLE HERE',
  songTitle: 'SONG TITLE',
  artist: 'ARTIST',
  outerText:
    'Put your lyrics here. The text will wrap into multiple rings around the record. You can paste multiple lines and we will distribute them from outside to inside.',
  names: 'Sara & Nick',
  dateLine: '11.03.2011',
  showCenterGuides: true,
  titleFont: 'prata',
  titleFontSize: 40,
  namesFont: 'jimmy-script',
  namesFontSize: 64,
  metaFont: 'signika',
  metaFontSize: 18
};

const defaultAge: AgeParams = {
  size: '16x20',
  ageText: '70',
  bgColor: '#ffffff',
  inkColor: '#111111',
  frame: true,
  frameInset: 18,
  frameWidth: 6,
  frameColor: '#111111',
  ageFontFamily: 'Signika, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial',
  ageFontWeight: 700,
  ageFontSize: 820,
  ageY: 520,
  tileSize: 64,
  tileGap: 2,
  tileBleed: 0.22,
  caption: 'Happy Birthday!',
  captionFontFamily: 'Prata, ui-serif, Georgia, Times New Roman, serif',
  captionFontSize: 40,
  captionY: 1200,
  subCaption: 'You are truly cherished.',
  subCaptionFontFamily: 'Signika, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial',
  subCaptionFontSize: 18,
  subCaptionY: 1245
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

type PresetStore = {
  chart: { name: string; params: RenderParams }[];
  poster: { name: string; poster: PosterParams }[];
  active?: { chart?: string; poster?: string };
};

const PRESETS_KEY = 'space_map_presets_v1';
const VINYL_RECORD_IMAGE_KEY = 'space_map_vinyl_record_image_v1';
const VINYL_LABEL_IMAGE_KEY = 'space_map_vinyl_label_image_v1';
const AGE_IMAGES_KEY = 'space_map_age_images_v1';

function safeJsonParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function normalizePresetName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function upsertByName<T extends { name: string }>(list: T[], item: T): T[] {
  const key = item.name.trim().toLowerCase();
  const next: T[] = [];
  let replaced = false;
  for (const it of list) {
    if (it.name.trim().toLowerCase() === key) {
      if (!replaced) next.push(item);
      replaced = true;
    } else {
      next.push(it);
    }
  }
  if (!replaced) next.unshift(item);
  return next;
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
  view: 'poster' | 'chart' | 'vinyl' | 'age';
  vinyl: VinylParams;
  age: AgeParams;
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

  const v = input.vinyl;
  sp.set('vs', v.size);
  sp.set('vp', v.palette);
  sp.set('vic', v.inkColor);
  sp.set('vtx', v.backgroundTexture);
  sp.set('vdd', String(v.diskDiameter));
  sp.set('vrc', String(v.ringCountMax));
  sp.set('vrfs', String(v.ringFontSize));
  sp.set('vrls', String(v.ringLetterSpacing));
  sp.set('vrlg', String(v.ringLineGap));
  sp.set('vt', v.title);
  sp.set('vst', v.songTitle);
  sp.set('var', v.artist);
  // Avoid huge URLs: include lyrics only if reasonably short.
  if ((v.outerText || '').length <= 600) sp.set('vot', v.outerText);
  sp.set('vn', v.names);
  sp.set('vdl', v.dateLine);
  sp.set('vcg', v.showCenterGuides ? '1' : '0');
  sp.set('vtf', v.titleFont);
  sp.set('vtfs', String(v.titleFontSize));
  sp.set('vnf', v.namesFont);
  sp.set('vnfs', String(v.namesFontSize));
  sp.set('vmf', v.metaFont);
  sp.set('vmfs', String(v.metaFontSize));

  const a = input.age;
  sp.set('as', a.size);
  sp.set('at', a.ageText);
  sp.set('abg', a.bgColor);
  sp.set('aic', a.inkColor);
  sp.set('af', a.frame ? '1' : '0');
  sp.set('afi', String(a.frameInset));
  sp.set('afw', String(a.frameWidth));
  sp.set('afc', a.frameColor);
  sp.set('afs', String(a.ageFontSize));
  sp.set('afy', String(a.ageY));
  sp.set('ats', String(a.tileSize));
  sp.set('atg', String(a.tileGap));
  sp.set('atb', String(a.tileBleed));
  if ((a.caption || '').length <= 200) sp.set('ac', a.caption);
  sp.set('acs', String(a.captionFontSize));
  sp.set('acy', String(a.captionY));
  if ((a.subCaption || '').length <= 200) sp.set('asc', a.subCaption);
  sp.set('ascs', String(a.subCaptionFontSize));
  sp.set('ascy', String(a.subCaptionY));

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
  vinyl: VinylParams;
  age: AgeParams;
  metaAuto: boolean;
  view: 'poster' | 'chart' | 'vinyl' | 'age';
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

  const vs = sp.get('vs');
  const vp = sp.get('vp');
  const vtx = sp.get('vtx');
  const vinyl: VinylParams = {
    ...defaultVinyl,
    size: vs === '20x20' ? '20x20' : vs === '16x20' ? '16x20' : vs === 'square' ? 'square' : 'a4',
    palette:
      vp === 'classic-black' ||
      vp === 'midnight' ||
      vp === 'navy-gold' ||
      vp === 'night-gold' ||
      vp === 'cream-ink' ||
      vp === 'slate' ||
      vp === 'forest' ||
      vp === 'emerald' ||
      vp === 'plum' ||
      vp === 'burgundy' ||
      vp === 'sand'
        ? vp
        : defaultVinyl.palette,
    inkColor: sp.get('vic') ?? defaultVinyl.inkColor,
    backgroundTexture: (vtx === 'solid' || vtx === 'paper' || vtx === 'marble' || vtx === 'noise') ? vtx : defaultVinyl.backgroundTexture,
    diskDiameter: parseNum(sp.get('vdd'), defaultVinyl.diskDiameter),
    ringCountMax: parseNum(sp.get('vrc'), defaultVinyl.ringCountMax),
    ringFontSize: parseNum(sp.get('vrfs'), defaultVinyl.ringFontSize),
    ringLetterSpacing: parseNum(sp.get('vrls'), defaultVinyl.ringLetterSpacing),
    ringLineGap: parseNum(sp.get('vrlg'), defaultVinyl.ringLineGap),
    title: sp.get('vt') ?? defaultVinyl.title,
    songTitle: sp.get('vst') ?? defaultVinyl.songTitle,
    artist: sp.get('var') ?? defaultVinyl.artist,
    outerText: sp.get('vot') ?? defaultVinyl.outerText,
    names: sp.get('vn') ?? defaultVinyl.names,
    dateLine: sp.get('vdl') ?? defaultVinyl.dateLine,
    showCenterGuides: parseBool(sp.get('vcg'), defaultVinyl.showCenterGuides),
    titleFont: parseEnum(sp.get('vtf'), ['serif', 'sans', 'mono', 'prata'] as const, defaultVinyl.titleFont),
    titleFontSize: parseNum(sp.get('vtfs'), defaultVinyl.titleFontSize),
    namesFont: parseEnum(sp.get('vnf'), ['serif', 'sans', 'cursive', 'jimmy-script'] as const, defaultVinyl.namesFont),
    namesFontSize: parseNum(sp.get('vnfs'), defaultVinyl.namesFontSize),
    metaFont: parseEnum(sp.get('vmf'), ['sans', 'serif', 'mono', 'signika'] as const, defaultVinyl.metaFont),
    metaFontSize: parseNum(sp.get('vmfs'), defaultVinyl.metaFontSize)
  };

  const as = sp.get('as');
  const age: AgeParams = {
    ...defaultAge,
    size: as === '20x20' ? '20x20' : as === '16x20' ? '16x20' : as === 'square' ? 'square' : 'a4',
    ageText: sp.get('at') ?? defaultAge.ageText,
    bgColor: sp.get('abg') ?? defaultAge.bgColor,
    inkColor: sp.get('aic') ?? defaultAge.inkColor,
    frame: parseBool(sp.get('af'), defaultAge.frame),
    frameInset: parseNum(sp.get('afi'), defaultAge.frameInset),
    frameWidth: parseNum(sp.get('afw'), defaultAge.frameWidth),
    frameColor: sp.get('afc') ?? defaultAge.frameColor,
    ageFontSize: parseNum(sp.get('afs'), defaultAge.ageFontSize),
    ageY: parseNum(sp.get('afy'), defaultAge.ageY),
    tileSize: parseNum(sp.get('ats'), defaultAge.tileSize),
    tileGap: parseNum(sp.get('atg'), defaultAge.tileGap),
    tileBleed: parseNum(sp.get('atb'), defaultAge.tileBleed),
    caption: sp.get('ac') ?? defaultAge.caption,
    captionFontSize: parseNum(sp.get('acs'), defaultAge.captionFontSize),
    captionY: parseNum(sp.get('acy'), defaultAge.captionY),
    subCaption: sp.get('asc') ?? defaultAge.subCaption,
    subCaptionFontSize: parseNum(sp.get('ascs'), defaultAge.subCaptionFontSize),
    subCaptionY: parseNum(sp.get('ascy'), defaultAge.subCaptionY)
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
    vinyl,
    age,
    metaAuto: sp.get('pma') === null ? undefined : parseBool(sp.get('pma'), true),
    view: view === 'chart' ? 'chart' : view === 'vinyl' ? 'vinyl' : view === 'age' ? 'age' : view === 'poster' ? 'poster' : undefined
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
  const [vinyl, setVinyl] = useState<VinylParams>(defaultVinyl);
  const [age, setAge] = useState<AgeParams>(defaultAge);
  const [ageImages, setAgeImages] = useState<string[]>([]);
  const [chartSvg, setChartSvg] = useState<string>('');
  const [posterSvg, setPosterSvg] = useState<string>('');
  const [vinylSvg, setVinylSvg] = useState<string>('');
  const [ageSvg, setAgeSvg] = useState<string>('');
  const [viewMode, setViewMode] = useState<'poster' | 'chart' | 'vinyl' | 'age'>('poster');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>('');
  const [shareLink, setShareLink] = useState<string>('');
  const [metaAuto, setMetaAuto] = useState(true);
  const [lastAutoMetaText, setLastAutoMetaText] = useState('');
  const [presets, setPresets] = useState<PresetStore>({ chart: [], poster: [], active: {} });
  const [chartPresetName, setChartPresetName] = useState('');
  const [posterPresetName, setPosterPresetName] = useState('');
  const [selectedChartPreset, setSelectedChartPreset] = useState('');
  const [selectedPosterPreset, setSelectedPosterPreset] = useState('');

  async function downscaleImageToDataUrl(file: File, maxSize: number, mime: 'image/jpeg' | 'image/webp' = 'image/jpeg', quality = 0.88): Promise<string> {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = 'async';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = url;
      });
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const scale = Math.min(1, maxSize / Math.max(w, h));
      const cw = Math.max(1, Math.round(w * scale));
      const ch = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.drawImage(img, 0, 0, cw, ch);
      return canvas.toDataURL(mime, quality);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

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

  async function generateVinyl() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/vinyl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vinyl })
      });
      if (!res.ok) throw new Error((await res.text()) || 'Vinyl generation failed');
      const svg = await res.text();
      setVinylSvg(svg);

      const qs = encodeStateToQuery({
        locationMode,
        cityQuery,
        lat,
        lon,
        dateTime,
        locationLabelOverride,
        params,
        poster,
        vinyl,
        age,
        metaAuto,
        view: 'vinyl'
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

  async function generateAge() {
    setBusy(true);
    setError('');
    try {
      const svg = renderAgeMosaicSvg({
        params: {
          size: age.size,
          ageText: age.ageText,
          ageFontFamily: age.ageFontFamily,
          ageFontWeight: age.ageFontWeight,
          ageFontSize: age.ageFontSize,
          ageY: age.ageY,
          tileSize: age.tileSize,
          tileGap: age.tileGap,
          tileBleed: age.tileBleed,
          bgColor: age.bgColor,
          frame: age.frame,
          frameInset: age.frameInset,
          frameWidth: age.frameWidth,
          frameColor: age.frameColor,
          caption: age.caption,
          captionFontFamily: age.captionFontFamily,
          captionFontSize: age.captionFontSize,
          captionY: age.captionY,
          subCaption: age.subCaption,
          subCaptionFontFamily: age.subCaptionFontFamily,
          subCaptionFontSize: age.subCaptionFontSize,
          subCaptionY: age.subCaptionY,
          inkColor: age.inkColor
        },
        images: ageImages
      });
      setAgeSvg(svg);

      const qs = encodeStateToQuery({
        locationMode,
        cityQuery,
        lat,
        lon,
        dateTime,
        locationLabelOverride,
        params,
        poster,
        vinyl,
        age,
        metaAuto,
        view: 'age'
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
        vinyl,
        age,
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
    if (decoded.vinyl) setVinyl(decoded.vinyl);
    if (decoded.age) setAge(decoded.age);
    if (decoded.view) setViewMode(decoded.view);

    try {
      const rec = window.localStorage.getItem(VINYL_RECORD_IMAGE_KEY) ?? '';
      const lab = window.localStorage.getItem(VINYL_LABEL_IMAGE_KEY) ?? '';
      const ageImgs = safeJsonParse<string[]>(window.localStorage.getItem(AGE_IMAGES_KEY));
      if (rec || lab) {
        setVinyl((v) => ({
          ...v,
          recordImageDataUrl: v.recordImageDataUrl || rec,
          labelImageDataUrl: v.labelImageDataUrl || lab
        }));
      }
      if (Array.isArray(ageImgs) && ageImgs.length) setAgeImages(ageImgs.filter((s) => typeof s === 'string').slice(0, 12));
    } catch {
      // ignore
    }

    const stored = safeJsonParse<PresetStore>(typeof window !== 'undefined' ? window.localStorage.getItem(PRESETS_KEY) : null);
    if (stored && Array.isArray(stored.chart) && Array.isArray(stored.poster)) {
      const activeChart = stored.active?.chart ?? '';
      const activePoster = stored.active?.poster ?? '';
      setPresets({ chart: stored.chart, poster: stored.poster, active: stored.active ?? {} });
      setSelectedChartPreset(activeChart);
      setSelectedPosterPreset(activePoster);
    }

    // generate after state is applied
    const initialView = decoded.view ?? 'poster';
    setTimeout(() => {
      if (initialView === 'vinyl') generateVinyl();
      else if (initialView === 'age') generateAge();
      else generate();
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      if (vinyl.recordImageDataUrl) window.localStorage.setItem(VINYL_RECORD_IMAGE_KEY, vinyl.recordImageDataUrl);
      else window.localStorage.removeItem(VINYL_RECORD_IMAGE_KEY);
    } catch {
      // ignore
    }
  }, [vinyl.recordImageDataUrl]);

  useEffect(() => {
    try {
      if (vinyl.labelImageDataUrl) window.localStorage.setItem(VINYL_LABEL_IMAGE_KEY, vinyl.labelImageDataUrl);
      else window.localStorage.removeItem(VINYL_LABEL_IMAGE_KEY);
    } catch {
      // ignore
    }
  }, [vinyl.labelImageDataUrl]);

  useEffect(() => {
    try {
      window.localStorage.setItem(AGE_IMAGES_KEY, JSON.stringify(ageImages.slice(0, 12)));
    } catch {
      // ignore
    }
  }, [ageImages]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
    } catch {
      // ignore
    }
  }, [presets]);

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

  function applyChartPreset(name: string) {
    const key = name.trim().toLowerCase();
    const p = presets.chart.find((x) => x.name.trim().toLowerCase() === key);
    if (!p) return;
    setParams({ ...defaultParams, ...p.params });
    setPresets((s) => ({ ...s, active: { ...(s.active ?? {}), chart: p.name } }));
    setSelectedChartPreset(p.name);
  }

  function applyPosterPreset(name: string) {
    const key = name.trim().toLowerCase();
    const p = presets.poster.find((x) => x.name.trim().toLowerCase() === key);
    if (!p) return;
    const next = { ...defaultPoster, ...p.poster };
    setPoster(next);
    if (metaAuto) setLastAutoMetaText(next.metaText ?? '');
    setPresets((s) => ({ ...s, active: { ...(s.active ?? {}), poster: p.name } }));
    setSelectedPosterPreset(p.name);
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
          {leftOpen ? (
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {viewMode === 'vinyl' ? 'Vinyl Poster' : viewMode === 'age' ? 'Age Mosaic' : 'Sky Chart'}
            </div>
          ) : null}
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
          {viewMode === 'vinyl' ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Vinyl Poster</div>

              <Field label="Poster boyutu">
                <select
                  value={vinyl.size}
                  onChange={(e) => setVinyl((v) => ({ ...v, size: e.target.value as VinylParams['size'] }))}
                  style={{ padding: 10, border: '1px solid #ddd', background: '#fff' }}
                >
                  <option value="a4">A4 (595x842)</option>
                  <option value="square">Square (1024x1024)</option>
                  <option value="16x20">16x20 in (1152x1440)</option>
                  <option value="20x20">20x20 in (1440x1440)</option>
                </select>
              </Field>

              <Field label="Renk paleti">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                  {posterPalettes.map((p) => {
                    const active = vinyl.palette === p.key;
                    return (
                      <button
                        key={p.key}
                        onClick={() =>
                          setVinyl((s) => ({
                            ...s,
                            palette: p.key,
                            inkColor: s.inkColor === defaultVinyl.inkColor ? p.ink : s.inkColor
                          }))
                        }
                        title={p.label}
                        style={{
                          height: 44,
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
              </Field>

              <Field label="Yazi / cizgi rengi (hex)">
                <div style={{ display: 'grid', gap: 8 }}>
                  <input
                    value={vinyl.inkColor}
                    onChange={(e) => setVinyl((v) => ({ ...v, inkColor: e.target.value }))}
                    placeholder="#1b1b1b"
                    style={{ padding: 10, border: '1px solid #ddd' }}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    {[
                      { label: '#1b1b1b', v: '#1b1b1b' },
                      { label: '#d9d9d9', v: '#d9d9d9' },
                      { label: '#ffffff', v: '#ffffff' },
                      { label: '#fbab29', v: '#fbab29' }
                    ].map((c) => {
                      const active = vinyl.inkColor.trim().toLowerCase() === c.v;
                      return (
                        <button
                          key={c.v}
                          onClick={() => setVinyl((v) => ({ ...v, inkColor: c.v }))}
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

              <Field label="Arka plan deseni">
                <select
                  value={vinyl.backgroundTexture}
                  onChange={(e) => setVinyl((v) => ({ ...v, backgroundTexture: e.target.value as VinylParams['backgroundTexture'] }))}
                  style={{ padding: 10, border: '1px solid #ddd', background: '#fff' }}
                >
                  <option value="solid">Solid</option>
                  <option value="paper">Paper</option>
                  <option value="marble">Marble</option>
                  <option value="noise">Noise</option>
                </select>
              </Field>

              <Field label="Plak resmi (opsiyonel, daha gerçekçi)">
                <div style={{ display: 'grid', gap: 8 }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const dataUrl = await downscaleImageToDataUrl(f, 1200, 'image/jpeg', 0.88);
                      setVinyl((v) => ({ ...v, recordImageDataUrl: dataUrl }));
                      e.currentTarget.value = '';
                    }}
                  />
                  {vinyl.recordImageDataUrl ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        onClick={() => setVinyl((v) => ({ ...v, recordImageDataUrl: '' }))}
                        style={{ padding: '8px 10px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                      >
                        Kaldır
                      </button>
                      <img
                        src={vinyl.recordImageDataUrl}
                        alt="Record"
                        style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }}
                      />
                      <span style={{ fontSize: 12, color: '#6b7280' }}>Seçildi</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#6b7280' }}>SVG içi “foto” görünüm için önerilir. Linke dahil edilmez.</div>
                  )}
                </div>
              </Field>

              <Field label="Label resmi (opsiyonel)">
                <div style={{ display: 'grid', gap: 8 }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const dataUrl = await downscaleImageToDataUrl(f, 700, 'image/jpeg', 0.88);
                      setVinyl((v) => ({ ...v, labelImageDataUrl: dataUrl }));
                      e.currentTarget.value = '';
                    }}
                  />
                  {vinyl.labelImageDataUrl ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        onClick={() => setVinyl((v) => ({ ...v, labelImageDataUrl: '' }))}
                        style={{ padding: '8px 10px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                      >
                        Kaldır
                      </button>
                      <img
                        src={vinyl.labelImageDataUrl}
                        alt="Label"
                        style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 999, border: '1px solid #e5e7eb' }}
                      />
                      <span style={{ fontSize: 12, color: '#6b7280' }}>Seçildi</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#6b7280' }}>İstersen gerçek label görseli ekleyebilirsin.</div>
                  )}
                </div>
              </Field>

              <Field label={`Plak çapı: ${(vinyl.diskDiameter / 72).toFixed(1)} in`}>
                <input
                  type="range"
                  min={8 * 72}
                  max={15.5 * 72}
                  step={1}
                  value={vinyl.diskDiameter}
                  onChange={(e) => setVinyl((v) => ({ ...v, diskDiameter: Number(e.target.value) }))}
                />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label={`Ring sayısı: ${vinyl.ringCountMax}`}>
                  <input
                    type="range"
                    min={1}
                    max={16}
                    step={1}
                    value={vinyl.ringCountMax}
                    onChange={(e) => setVinyl((v) => ({ ...v, ringCountMax: Number(e.target.value) }))}
                  />
                </Field>
                <Field label={`Ring font: ${vinyl.ringFontSize.toFixed(0)}`}>
                  <input
                    type="range"
                    min={8}
                    max={24}
                    step={1}
                    value={vinyl.ringFontSize}
                    onChange={(e) => setVinyl((v) => ({ ...v, ringFontSize: Number(e.target.value) }))}
                  />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label={`Letter spacing: ${vinyl.ringLetterSpacing.toFixed(1)}`}>
                  <input
                    type="range"
                    min={-2}
                    max={12}
                    step={0.1}
                    value={vinyl.ringLetterSpacing}
                    onChange={(e) => setVinyl((v) => ({ ...v, ringLetterSpacing: Number(e.target.value) }))}
                  />
                </Field>
                <Field label={`Satır aralığı: ${vinyl.ringLineGap.toFixed(0)}`}>
                  <input
                    type="range"
                    min={0}
                    max={12}
                    step={1}
                    value={vinyl.ringLineGap}
                    onChange={(e) => setVinyl((v) => ({ ...v, ringLineGap: Number(e.target.value) }))}
                  />
                </Field>
              </div>

              <Field label="Center Title">
                <input value={vinyl.title} onChange={(e) => setVinyl((v) => ({ ...v, title: e.target.value }))} style={{ padding: 10, border: '1px solid #ddd' }} />
              </Field>
              <Field label="Song Title">
                <input value={vinyl.songTitle} onChange={(e) => setVinyl((v) => ({ ...v, songTitle: e.target.value }))} style={{ padding: 10, border: '1px solid #ddd' }} />
              </Field>
              <Field label="Artist">
                <input value={vinyl.artist} onChange={(e) => setVinyl((v) => ({ ...v, artist: e.target.value }))} style={{ padding: 10, border: '1px solid #ddd' }} />
              </Field>

              <Field label="Şarkı sözleri (outer rings)">
                <textarea
                  value={vinyl.outerText}
                  onChange={(e) => setVinyl((v) => ({ ...v, outerText: e.target.value }))}
                  rows={6}
                  style={{ padding: 10, border: '1px solid #ddd', resize: 'vertical' }}
                />
              </Field>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                Not: Çok uzun sözler linke sığmayabilir; bu yüzden paylaşım linkinde en fazla ~600 karakter saklıyoruz.
              </div>

              <Field label="İsimler (altta)">
                <input value={vinyl.names} onChange={(e) => setVinyl((v) => ({ ...v, names: e.target.value }))} style={{ padding: 10, border: '1px solid #ddd' }} />
              </Field>
              <Field label="Tarih (altta)">
                <input value={vinyl.dateLine} onChange={(e) => setVinyl((v) => ({ ...v, dateLine: e.target.value }))} style={{ padding: 10, border: '1px solid #ddd' }} />
              </Field>

              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={vinyl.showCenterGuides}
                  onChange={(e) => setVinyl((v) => ({ ...v, showCenterGuides: e.target.checked }))}
                />
                Merkez çizgileri
              </label>
            </div>
          ) : null}

          {viewMode === 'age' ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Age Mosaic</div>

              <Field label="Poster boyutu">
                <select
                  value={age.size}
                  onChange={(e) => {
                    const s = e.target.value as AgeParams['size'];
                    setAge((a) => {
                      const presets: Record<AgeParams['size'], Partial<AgeParams>> = {
                        a4: { ageFontSize: 460, ageY: 320, captionY: 720, subCaptionY: 750, tileSize: 34 },
                        square: { ageFontSize: 660, ageY: 410, captionY: 870, subCaptionY: 900, tileSize: 48 },
                        '16x20': { ageFontSize: 820, ageY: 520, captionY: 1200, subCaptionY: 1245, tileSize: 64 },
                        '20x20': { ageFontSize: 900, ageY: 560, captionY: 1180, subCaptionY: 1220, tileSize: 72 }
                      };
                      return { ...a, ...presets[s], size: s };
                    });
                  }}
                  style={{ padding: 10, border: '1px solid #ddd', background: '#fff' }}
                >
                  <option value="a4">A4 (595x842)</option>
                  <option value="square">Square (1024x1024)</option>
                  <option value="16x20">16x20 in (1152x1440)</option>
                  <option value="20x20">20x20 in (1440x1440)</option>
                </select>
              </Field>

              <Field label="Yaş (ör: 70)">
                <input value={age.ageText} onChange={(e) => setAge((a) => ({ ...a, ageText: e.target.value }))} style={{ padding: 10, border: '1px solid #ddd' }} />
              </Field>

              <Field label="Fotoğraflar (çoklu yükle)">
                <div style={{ display: 'grid', gap: 8 }}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files ?? []);
                      if (!files.length) return;
                      const imgs: string[] = [];
                      for (const f of files.slice(0, 30)) {
                        try {
                          const dataUrl = await downscaleImageToDataUrl(f, 900, 'image/jpeg', 0.86);
                          imgs.push(dataUrl);
                        } catch {
                          // ignore individual file
                        }
                      }
                      setAgeImages((cur) => [...imgs, ...cur].slice(0, 40));
                      e.currentTarget.value = '';
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setAgeImages([])}
                      disabled={!ageImages.length}
                      style={{
                        padding: '8px 10px',
                        border: '1px solid #cbd5e1',
                        background: '#fff',
                        cursor: ageImages.length ? 'pointer' : 'not-allowed'
                      }}
                    >
                      Temizle
                    </button>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{ageImages.length ? `${ageImages.length} foto` : 'Foto yok → placeholder renkler'}</span>
                  </div>
                  {ageImages.length ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
                      {ageImages.slice(0, 12).map((src, idx) => (
                        <button
                          key={idx}
                          onClick={() => setAgeImages((arr) => arr.filter((_, i) => i !== idx))}
                          title="Kaldır"
                          style={{ padding: 0, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', borderRadius: 8, overflow: 'hidden' }}
                        >
                          <img src={src} alt={`img${idx}`} style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }} />
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    Not: Yüklenen fotoğraflar paylaşım linkine eklenmez (tarayıcıda saklanır).
                  </div>
                </div>
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label={`Tile size: ${age.tileSize.toFixed(0)}`}>
                  <input type="range" min={18} max={140} step={1} value={age.tileSize} onChange={(e) => setAge((a) => ({ ...a, tileSize: Number(e.target.value) }))} />
                </Field>
                <Field label={`Gap: ${age.tileGap.toFixed(0)}`}>
                  <input type="range" min={0} max={12} step={1} value={age.tileGap} onChange={(e) => setAge((a) => ({ ...a, tileGap: Number(e.target.value) }))} />
                </Field>
              </div>
              <Field label={`Image bleed: ${(age.tileBleed * 100).toFixed(0)}%`}>
                <input type="range" min={0} max={0.6} step={0.02} value={age.tileBleed} onChange={(e) => setAge((a) => ({ ...a, tileBleed: Number(e.target.value) }))} />
              </Field>

              <Field label="Arka plan rengi (hex)">
                <input value={age.bgColor} onChange={(e) => setAge((a) => ({ ...a, bgColor: e.target.value }))} placeholder="#ffffff" style={{ padding: 10, border: '1px solid #ddd' }} />
              </Field>
              <Field label="Yazı rengi (hex)">
                <input value={age.inkColor} onChange={(e) => setAge((a) => ({ ...a, inkColor: e.target.value }))} placeholder="#111111" style={{ padding: 10, border: '1px solid #ddd' }} />
              </Field>

              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <input type="checkbox" checked={age.frame} onChange={(e) => setAge((a) => ({ ...a, frame: e.target.checked }))} />
                Çerçeve (frame)
              </label>
              {age.frame ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label={`Frame width: ${age.frameWidth.toFixed(1)}`}>
                    <input type="range" min={1} max={14} step={0.5} value={age.frameWidth} onChange={(e) => setAge((a) => ({ ...a, frameWidth: Number(e.target.value) }))} />
                  </Field>
                  <Field label={`Frame inset: ${age.frameInset.toFixed(0)}`}>
                    <input type="range" min={0} max={60} step={1} value={age.frameInset} onChange={(e) => setAge((a) => ({ ...a, frameInset: Number(e.target.value) }))} />
                  </Field>
                </div>
              ) : null}

              <Field label={`Age font size: ${age.ageFontSize.toFixed(0)}`}>
                <input type="range" min={240} max={1200} step={2} value={age.ageFontSize} onChange={(e) => setAge((a) => ({ ...a, ageFontSize: Number(e.target.value) }))} />
              </Field>
              <Field label={`Age Y: ${age.ageY.toFixed(0)}`}>
                <input type="range" min={180} max={980} step={2} value={age.ageY} onChange={(e) => setAge((a) => ({ ...a, ageY: Number(e.target.value) }))} />
              </Field>

              <Field label="Alt yazı (caption)">
                <input value={age.caption} onChange={(e) => setAge((a) => ({ ...a, caption: e.target.value }))} style={{ padding: 10, border: '1px solid #ddd' }} />
              </Field>
              <Field label="Alt yazı 2 (subcaption)">
                <input value={age.subCaption} onChange={(e) => setAge((a) => ({ ...a, subCaption: e.target.value }))} style={{ padding: 10, border: '1px solid #ddd' }} />
              </Field>
            </div>
          ) : null}

          {viewMode !== 'vinyl' && viewMode !== 'age' ? (
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
          <div style={{ display: 'grid', gap: 8, padding: 10, background: '#fff', border: '1px solid #eee' }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Presetler</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center' }}>
              <select
                value={selectedChartPreset}
                onChange={(e) => setSelectedChartPreset(e.target.value)}
                style={{ padding: 10, border: '1px solid #ddd', background: '#fff' }}
              >
                <option value="">(Seç…)</option>
                {presets.chart.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => selectedChartPreset && applyChartPreset(selectedChartPreset)}
                disabled={!selectedChartPreset}
                style={{ padding: '10px 12px', border: '1px solid #111', background: '#fff', cursor: selectedChartPreset ? 'pointer' : 'not-allowed' }}
              >
                Uygula
              </button>
              <button
                onClick={() => {
                  if (!selectedChartPreset) return;
                  const key = selectedChartPreset.trim().toLowerCase();
                  setPresets((s) => {
                    const next = { ...s, chart: s.chart.filter((p) => p.name.trim().toLowerCase() !== key) };
                    if (next.active?.chart && next.active.chart.trim().toLowerCase() === key) {
                      next.active = { ...(next.active ?? {}), chart: undefined };
                    }
                    return next;
                  });
                  setSelectedChartPreset('');
                }}
                disabled={!selectedChartPreset}
                style={{ padding: '10px 12px', border: '1px solid #cbd5e1', background: '#fff', cursor: selectedChartPreset ? 'pointer' : 'not-allowed' }}
                title="Preset sil"
              >
                Sil
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
              <input
                value={chartPresetName}
                onChange={(e) => setChartPresetName(e.target.value)}
                placeholder="Yeni preset adı"
                style={{ padding: 10, border: '1px solid #ddd' }}
              />
              <button
                onClick={() => {
                  const name = normalizePresetName(chartPresetName);
                  if (!name) return;
                  setPresets((s) => ({
                    ...s,
                    chart: upsertByName(s.chart, { name, params }),
                    active: { ...(s.active ?? {}), chart: name }
                  }));
                  setSelectedChartPreset(name);
                  setChartPresetName('');
                }}
                style={{ padding: '10px 12px', border: '1px solid #111', background: '#fff', cursor: 'pointer' }}
              >
                Kaydet
              </button>
            </div>
          </div>

          {viewMode === 'chart' ? (
            <Field label="Tema (Chart)">
              <select
                value={params.theme}
                onChange={(e) => setParams((p) => ({ ...p, theme: e.target.value === 'dark' ? 'dark' : 'light' }))}
                style={{ padding: 10, border: '1px solid #ddd', background: '#fff' }}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </Field>
          ) : null}

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
        </>
          ) : null}

        <div style={{ height: 14 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={viewMode === 'vinyl' ? generateVinyl : viewMode === 'age' ? generateAge : generate}
            disabled={busy}
            style={{ padding: '10px 12px', border: '1px solid #111', background: '#111', color: '#fff', cursor: 'pointer' }}
          >
            {busy ? 'Üretiliyor…' : 'Generate'}
          </button>
          <button
            onClick={() =>
              downloadSvg(
                viewMode === 'age' ? ageSvg : viewMode === 'vinyl' ? vinylSvg : viewMode === 'poster' ? posterSvg : chartSvg,
                viewMode === 'age' ? 'age-mosaic.svg' : viewMode === 'vinyl' ? 'vinyl-poster.svg' : viewMode === 'poster' ? 'star-poster.svg' : 'sky-chart.svg'
              )
            }
            disabled={viewMode === 'age' ? !ageSvg : viewMode === 'vinyl' ? !vinylSvg : viewMode === 'poster' ? !posterSvg : !chartSvg}
            style={{ padding: '10px 12px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
          >
            Download SVG
          </button>
          <button
            onClick={() =>
              downloadPng(
                viewMode === 'age' ? ageSvg : viewMode === 'vinyl' ? vinylSvg : viewMode === 'poster' ? posterSvg : chartSvg,
                viewMode === 'age' ? 'age-mosaic.png' : viewMode === 'vinyl' ? 'vinyl-poster.png' : viewMode === 'poster' ? 'star-poster.png' : 'sky-chart.png',
                3
              )
            }
            disabled={viewMode === 'age' ? !ageSvg : viewMode === 'vinyl' ? !vinylSvg : viewMode === 'poster' ? !posterSvg : !chartSvg}
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
            <button
              onClick={() => setViewMode('vinyl')}
              style={{
                padding: '8px 10px',
                border: '1px solid #ddd',
                background: viewMode === 'vinyl' ? '#111' : '#fff',
                color: viewMode === 'vinyl' ? '#fff' : '#111'
              }}
            >
              Vinyl
            </button>
            <button
              onClick={() => setViewMode('age')}
              style={{
                padding: '8px 10px',
                border: '1px solid #ddd',
                background: viewMode === 'age' ? '#111' : '#fff',
                color: viewMode === 'age' ? '#fff' : '#111'
              }}
            >
              Age
            </button>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Preview</div>
          </div>

          <div
            style={{ border: '1px solid #e5e7eb', background: '#fff' }}
            dangerouslySetInnerHTML={{ __html: viewMode === 'age' ? ageSvg : viewMode === 'vinyl' ? vinylSvg : viewMode === 'poster' ? posterSvg : chartSvg }}
          />
          {viewMode !== 'vinyl' && viewMode !== 'age' ? (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
              Not: Zaman girdisi seçilen konumun lokal saatine göre yorumlanır. PDF için tarayıcıdan yazdır (Print) kullanabilirsin.
            </div>
          ) : null}
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

        {!rightOpen ? null : viewMode === 'vinyl' || viewMode === 'age' ? (
          <div style={{ display: 'grid', gap: 10, fontSize: 13, color: '#374151' }}>
            <div style={{ padding: 12, background: '#fff', border: '1px solid #eee' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{viewMode === 'vinyl' ? 'Vinyl modu' : 'Age Mosaic modu'}</div>
              <div>
                {viewMode === 'vinyl'
                  ? 'Vinyl poster ayarları soldaki menüde. Buradaki “Poster Tasarımı” ayarları Sky Poster için geçerli.'
                  : 'Age Mosaic ayarları soldaki menüde. Buradaki “Poster Tasarımı” ayarları Sky Poster için geçerli.'}
              </div>
            </div>
          </div>
        ) : <div style={{ display: 'grid', gap: 10 }}>
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

          <div style={{ display: 'grid', gap: 8, padding: 10, background: '#fff', border: '1px solid #eee' }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Poster presetleri</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center' }}>
              <select
                value={selectedPosterPreset}
                onChange={(e) => setSelectedPosterPreset(e.target.value)}
                style={{ padding: 10, border: '1px solid #ddd', background: '#fff' }}
              >
                <option value="">(Seç…)</option>
                {presets.poster.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => selectedPosterPreset && applyPosterPreset(selectedPosterPreset)}
                disabled={!selectedPosterPreset}
                style={{ padding: '10px 12px', border: '1px solid #111', background: '#fff', cursor: selectedPosterPreset ? 'pointer' : 'not-allowed' }}
              >
                Uygula
              </button>
              <button
                onClick={() => {
                  if (!selectedPosterPreset) return;
                  const key = selectedPosterPreset.trim().toLowerCase();
                  setPresets((s) => {
                    const next = { ...s, poster: s.poster.filter((p) => p.name.trim().toLowerCase() !== key) };
                    if (next.active?.poster && next.active.poster.trim().toLowerCase() === key) {
                      next.active = { ...(next.active ?? {}), poster: undefined };
                    }
                    return next;
                  });
                  setSelectedPosterPreset('');
                }}
                disabled={!selectedPosterPreset}
                style={{ padding: '10px 12px', border: '1px solid #cbd5e1', background: '#fff', cursor: selectedPosterPreset ? 'pointer' : 'not-allowed' }}
                title="Preset sil"
              >
                Sil
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
              <input
                value={posterPresetName}
                onChange={(e) => setPosterPresetName(e.target.value)}
                placeholder="Yeni preset adı"
                style={{ padding: 10, border: '1px solid #ddd' }}
              />
              <button
                onClick={() => {
                  const name = normalizePresetName(posterPresetName);
                  if (!name) return;
                  setPresets((s) => ({
                    ...s,
                    poster: upsertByName(s.poster, { name, poster }),
                    active: { ...(s.active ?? {}), poster: name }
                  }));
                  setSelectedPosterPreset(name);
                  setPosterPresetName('');
                }}
                style={{ padding: '10px 12px', border: '1px solid #111', background: '#fff', cursor: 'pointer' }}
              >
                Kaydet
              </button>
            </div>
          </div>

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
