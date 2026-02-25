'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { PosterParams, RenderParams, ConstellationLanguage } from '../../lib/types';
import { CHECKOUT_DRAFT_KEY, type CheckoutDraft } from '../../lib/checkout';
import {
  ONLY_CHART_FIXED_POSTER_PRESETS,
  STAR_CHART_MOON_FIXED_POSTER_PRESETS,
} from '../../lib/ourskymap-fixed-sizes';

type SizePreset = {
  key: DesignSize;
  title: string;
  sub: string;
  compact?: boolean;
};

type DesignSize = 'us-letter' | 'a4' | '11x14' | 'a3' | '12x12' | '12x16' | '16x20' | 'a2' | '18x24' | '20x20' | 'a1' | '24x32';
type CompanionSubtype = 'moon-phase' | 'sky-photo';
type PosterType = 'single' | 'companion' | 'galaxy';
type BackgroundSourceMode = 'palette' | 'upload';
type InkPresetKey = 'gold' | 'silver';
type FontPresetKey = 'calligraphy' | 'signature' | 'serif' | 'gothic' | 'times';

type GeocodeResult = {
  lat: number;
  lon: number;
  label: string;
};

const SIZE_PRESETS: SizePreset[] = [
  { key: 'us-letter', title: 'US Letter', sub: '8.5 x 11 in' },
  { key: 'a4', title: '8 x 12 / A4', sub: '21 x 29.7 cm', compact: true },
  { key: '11x14', title: '11 x 14', sub: '27 x 35 cm', compact: true },
  { key: 'a3', title: 'A3', sub: '29.7 x 42 cm', compact: true },
  { key: '12x12', title: '12 x 12', sub: '30 x 30 cm', compact: true },
  { key: '12x16', title: '12 x 16', sub: '30 x 40 cm', compact: true },
  { key: '16x20', title: '16 x 20', sub: '40 x 50 cm', compact: true },
  { key: 'a2', title: 'A2', sub: '42 x 59.4 cm', compact: true },
  { key: '18x24', title: '18 x 24', sub: '45 x 60 cm', compact: true },
  { key: '20x20', title: '20 x 20', sub: '50 x 50 cm', compact: true },
  { key: 'a1', title: 'A1', sub: '59.4 x 84.1 cm', compact: true },
  { key: '24x32', title: '24 x 32', sub: '60 x 80 cm', compact: true },
];
const DEFAULT_SINGLE_SIZE: DesignSize = '16x20';
const DEFAULT_COMPANION_SIZE: DesignSize = '16x20';
const DEFAULT_COMPANION_SUBTYPE: CompanionSubtype = 'moon-phase';
const STANDARD_SIZE_PRESETS = SIZE_PRESETS; // all sizes available for both modes

const FONT_PRESETS: { key: FontPresetKey; label: string }[] = [
  { key: 'calligraphy', label: 'Calligraphy' },
  { key: 'signature', label: 'Great Vibes' },
  { key: 'serif', label: 'Serif' },
  { key: 'gothic', label: 'Gothic' },
  { key: 'times', label: 'Times New Roman' }
];

const POSTER_PALETTES: { key: PosterParams['palette']; label: string; bg: string; tone: 'dark' | 'light' }[] = [
  { key: 'navy-blue', label: 'Navy Blue', bg: '#232733', tone: 'dark' },
  { key: 'gold-black', label: 'Gold Black', bg: '#121212', tone: 'dark' },
  { key: 'dark-green', label: 'Dark Green', bg: '#1f392c', tone: 'dark' },
  { key: 'classic-burgundy', label: 'Burgundy', bg: '#4e1d1c', tone: 'dark' },
  { key: 'deep-teal', label: 'Teal', bg: '#2c4d42', tone: 'dark' }
];

function findPalette(paletteKey: PosterParams['palette']) {
  return POSTER_PALETTES.find((p) => p.key === paletteKey) ?? POSTER_PALETTES[0];
}

const INK_PRESETS: { key: InkPresetKey; label: string; hex: string }[] = [
  { key: 'gold', label: 'Gold', hex: '#ffbe4c' },
  { key: 'silver', label: 'Silver', hex: '#e2e6e9' }
];

const defaultParams: RenderParams = {
  // TR: Tema paleti. dark = koyu arka plan, light = acik arka plan.
  // EN: Visual theme. dark = dark background, light = bright background.
  theme: 'dark',
  // TR: Azimut halka/olcegi gorunsun mu? true acik, false kapali.
  // EN: Shows azimuth ring/scale. true = on, false = off.
  showAzimuthScale: true,
  // TR: Enlem-boylam (graticule) cizgileri gorunsun mu? true acik, false kapali.
  // EN: Shows latitude/longitude grid (graticule). true = on, false = off.
  showCoordinateGrid: false,
  // TR: Grid adimi (derece). Artarsa cizgi sayisi azalir, azalirsa grid siklasir.
  // EN: Grid step in degrees. Higher = fewer lines, lower = denser grid.
  coordinateGridStepDeg: 20,
  // TR: Etiket yerlestirme stratejisi. smart = cakismayi azaltmak icin saga/sola kaydir ve gerekirse gizle.
  // EN: Label placement strategy. smart = shift labels to reduce overlap and hide if needed.
  labelPlacementStrategy: 'smart',
  // TR: Etiket kutulari etrafinda cakisma boslugu (px). Artarsa label'lar arasinda daha fazla bosluk kalir.
  // EN: Extra collision padding around label boxes (px). Higher adds more spacing between labels.
  labelCollisionPadding: 2.2,
  // TR: Etiketin baz konumdan maksimum kaydirma mesafesi (px). Artarsa daha fazla deneme yapilir.
  // EN: Maximum shift distance from base label anchor (px). Higher tries farther alternate positions.
  labelMaxShift: 16,
  // TR: Takimyildizi isim ust limiti. 0 ise limitsiz.
  // EN: Constellation label cap. 0 means unlimited.
  maxConstellationLabels: 42,
  // TR: Yildiz isim ust limiti. 0 ise limitsiz.
  // EN: Star label cap. 0 means unlimited.
  maxStarLabels: 18,
  // TR: Yildiz isim etiketleri. true acik, false kapali.
  // EN: Star name labels. true = on, false = off.
  labelStarNames: true,
  // TR: Takimyildizi isim etiketleri. true acik, false kapali.
  // EN: Constellation name labels. true = on, false = off.
  labelConstellations: true,
  // TR: Gunes/Ay/Gezegen etiketleri. true acik, false kapali.
  // EN: Solar-system labels (Sun/Moon/planets). true = on, false = off.
  labelSolarSystem: true,
  // TR: Haritayi yatay ayna yapar. true ise saga-sola aynalanir.
  // EN: Mirrors chart horizontally. true flips left-right orientation.
  mirrorHorizontal: true,
  // TR: Gunes Sistemi cisimlerini cizer. true acik, false kapali.
  // EN: Renders solar-system bodies. true = on, false = off.
  showSolarSystem: true,
  // TR: Derin uzay objelerini (DSO) cizer. true acik, false kapali.
  // EN: Renders deep-sky objects (DSO). true = on, false = off.
  showDeepSky: false,
  // TR: DSO isimlerini yazar. showDeepSky false ise etkisi olmaz.
  // EN: Writes DSO labels. No visible effect when showDeepSky is false.
  labelDeepSky: false,
  // TR: Yildiz kumesi modu: all = tum yildizlar, constellations = sadece takimyildizi yildizlari, none = hicbiri.
  // EN: Star source mode: all, constellation-only, or none.
  starMode: 'all',
  // TR: Gorunen en soluk yildiz siniri (mag). Artarsa daha cok (daha soluk) yildiz gelir; azalirsa daha az yildiz kalir.
  // EN: Faint-star cutoff (magnitude). Higher includes dimmer stars; lower keeps only brighter stars.
  magnitudeLimit: 10,
  // TR: Yildiz ciziminde minimum piksel boyutu filtresi. Artarsa kucuk yildizlar elenir; azalirsa daha cok yildiz gorunur.
  // EN: Minimum drawn star size filter. Higher removes tiny stars; lower keeps more of them.
  minStarSize: 2,
  // TR: Yildiz boyut alt siniri. Artarsa tum yildizlarin taban boyutu buyur; azalirsa genel gorunum incelir.
  // EN: Minimum star size baseline. Higher makes all stars larger; lower makes overall stars smaller.
  starSizeMin: 1.2,
  // TR: Yildiz boyut ust siniri. Artarsa en parlak yildizlar daha buyuk olur; azalirsa ust boyut kisilir.
  // EN: Maximum star size cap. Higher enlarges brightest stars; lower limits their size.
  starSizeMax: 6.0,
  // TR: Yildiz boyut dagilimi egri parametresi. Artarsa orta/soluk yildizlar daha da kuculur, parlaklar daha baskin olur; azalirsa dagilim dengelenir.
  // EN: Star size curve (gamma). Higher shrinks mid/faint stars and emphasizes bright ones; lower flattens the size spread.
  starSizeGamma: 2,
  // TR: Yildiz opakligi. Artarsa daha opak/parlak, azalirsa daha seffaf olur. Not: render tarafinda 0..1 araligina clamp edilir.
  // EN: Star opacity. Higher is more opaque, lower is more transparent. Note: renderer clamps this to 0..1.
  starAlpha: 5.0,
  // TR: Takimyildizi dugum (vertex) noktalarini vurgular. true acik, false kapali.
  // EN: Emphasizes constellation vertices. true = on, false = off.
  emphasizeVertices: true,
  // TR: Vertex boyut alt siniri. Artarsa tum vertex noktalar daha iri baslar.
  // EN: Minimum vertex size. Higher increases baseline vertex dot size.
  vertexSizeMin: 3.0,
  // TR: Vertex boyut ust siniri. Artarsa en parlak vertexler daha buyuk olur.
  // EN: Maximum vertex size. Higher enlarges brightest/emphasized vertices.
  vertexSizeMax: 30.0, // `ONEMLI
  // TR: Vertex boyut dagilim egri parametresi. Artarsa fark artar (parlaklar daha belirgin), azalirsa boyutlar birbirine yaklasir.
  // EN: Vertex size gamma curve. Higher increases contrast; lower makes vertex sizes more uniform.
  vertexSizeGamma: 1.5, // ONEMLI
  // TR: Vertex opakligi. Artarsa daha gorunur, azalirsa daha soluk.
  // EN: Vertex opacity. Higher is stronger, lower is fainter.
  vertexAlpha: 1,
  // TR: Takimyildizi cizgi kalinligi. Artarsa cizgiler kalinlasir, azalirsa incelir.
  // EN: Constellation line thickness. Higher = thicker lines, lower = thinner.
  constellationLineWidth: 0.6,
  // TR: Takimyildizi cizgi opakligi. Artarsa daha belirgin, azalirsa daha seffaf.
  // EN: Constellation line opacity. Higher = more visible, lower = more transparent.
  constellationLineAlpha: 0.0,
  // TR: Ekliptik cizgisi opakligi. Artarsa belirginlesir, azalirsa siliklesir.
  // EN: Ecliptic line opacity. Higher = more visible, lower = subtler.
  eclipticAlpha: 0.0,
  // TR: Azimut halkasinin ic cizgi kalinligi. Artarsa ic halka kalinlasir.
  // EN: Inner azimuth ring stroke width. Higher makes the inner ring thicker.
  azimuthRingInnerWidth: 1.2,
  // TR: Azimut halkasinin dis cizgi kalinligi. Artarsa dis halka kalinlasir.
  // EN: Outer azimuth ring stroke width. Higher makes the outer ring thicker.
  azimuthRingOuterWidth: 0.0
};

const PHOTO_MIN_DIM = 1200;
const PHOTO_TARGET_DIM = 1400;
const PHOTO_MAX_MB = 20;
const PHOTO_PREVIEW_SIZE = 220;
const PHOTO_ZOOM_MIN = 1;
const PHOTO_ZOOM_MAX = 4;
const PHOTO_ZOOM_STEP = 0.2;
const STYLE_BG_MAX_DIM = 2400;
const STYLE_BG_MAX_MB = 20;

const POSTER_SIZE_DIMS: Record<DesignSize, [number, number]> = {
  'us-letter': [612, 792], 'a4': [595, 842], '11x14': [792, 1008],
  'a3': [842, 1191], '12x12': [864, 864], '12x16': [864, 1152],
  '16x20': [1152, 1440], 'a2': [1191, 1684], '18x24': [1296, 1728],
  '20x20': [1440, 1440], 'a1': [1701, 3024], '24x32': [1728, 2304],
};

function buildPosterFormulaOverrides(sizeKey: DesignSize): Partial<PosterParams> {
  return STAR_CHART_MOON_FIXED_POSTER_PRESETS[sizeKey];
}

type CompanionPhotoMeta = {
  sourceDataUrl: string;
  inputWidth: number;
  inputHeight: number;
};

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read this image. Please try another file.'));
    img.src = src;
  });
}

function clampCompanionPhotoOffset(
  offsetX: number,
  offsetY: number,
  inputWidth: number,
  inputHeight: number,
  zoom: number
): { x: number; y: number } {
  const safeZoom = Math.max(PHOTO_ZOOM_MIN, Math.min(PHOTO_ZOOM_MAX, zoom));
  const baseScale = Math.max(PHOTO_PREVIEW_SIZE / inputWidth, PHOTO_PREVIEW_SIZE / inputHeight);
  const drawW = inputWidth * baseScale * safeZoom;
  const drawH = inputHeight * baseScale * safeZoom;
  const maxX = Math.max(0, (drawW - PHOTO_PREVIEW_SIZE) / 2);
  const maxY = Math.max(0, (drawH - PHOTO_PREVIEW_SIZE) / 2);
  return {
    x: Math.max(-maxX, Math.min(maxX, offsetX)),
    y: Math.max(-maxY, Math.min(maxY, offsetY))
  };
}

async function normalizeCompanionPhotoFile(file: File): Promise<CompanionPhotoMeta> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload an image file (JPG, PNG, or WEBP).');
  }
  if (file.size > PHOTO_MAX_MB * 1024 * 1024) {
    throw new Error(`Photo file is too large. Please keep it under ${PHOTO_MAX_MB} MB.`);
  }

  const sourceDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read this image. Please try another file.'));
    reader.readAsDataURL(file);
  });
  const img = await loadImageElement(sourceDataUrl);
  const inputWidth = img.naturalWidth || img.width;
  const inputHeight = img.naturalHeight || img.height;
  if (Math.min(inputWidth, inputHeight) < PHOTO_MIN_DIM) {
    throw new Error(`Image resolution is too low. Use at least ${PHOTO_MIN_DIM} x ${PHOTO_MIN_DIM}px.`);
  }
  return { sourceDataUrl, inputWidth, inputHeight };
}

async function buildCompanionPhotoOutput(args: {
  sourceDataUrl: string;
  inputWidth: number;
  inputHeight: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
}): Promise<string> {
  const { sourceDataUrl, inputWidth, inputHeight, zoom, offsetX, offsetY } = args;
  const img = await loadImageElement(sourceDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = PHOTO_TARGET_DIM;
  canvas.height = PHOTO_TARGET_DIM;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image processing is not available in this browser.');

  const clamped = clampCompanionPhotoOffset(offsetX, offsetY, inputWidth, inputHeight, zoom);
  const safeZoom = Math.max(PHOTO_ZOOM_MIN, Math.min(PHOTO_ZOOM_MAX, zoom));
  const baseScale = Math.max(PHOTO_TARGET_DIM / inputWidth, PHOTO_TARGET_DIM / inputHeight);
  const drawW = inputWidth * baseScale * safeZoom;
  const drawH = inputHeight * baseScale * safeZoom;
  const offsetScale = PHOTO_TARGET_DIM / PHOTO_PREVIEW_SIZE;
  const dx = (PHOTO_TARGET_DIM - drawW) / 2 + clamped.x * offsetScale;
  const dy = (PHOTO_TARGET_DIM - drawH) / 2 + clamped.y * offsetScale;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, dx, dy, drawW, drawH);
  return canvas.toDataURL('image/jpeg', 0.92);
}

async function normalizeGalaxyBackgroundFile(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload an image file (JPG, PNG, or WEBP).');
  }
  if (file.size > STYLE_BG_MAX_MB * 1024 * 1024) {
    throw new Error(`Background image is too large. Please keep it under ${STYLE_BG_MAX_MB} MB.`);
  }

  const sourceDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read this image. Please try another file.'));
    reader.readAsDataURL(file);
  });
  const img = await loadImageElement(sourceDataUrl);
  const inputWidth = img.naturalWidth || img.width;
  const inputHeight = img.naturalHeight || img.height;
  if (Math.min(inputWidth, inputHeight) < 800) {
    throw new Error('Image resolution is too low. Use at least 800px on the shorter edge.');
  }

  const scale = Math.min(1, STYLE_BG_MAX_DIM / Math.max(inputWidth, inputHeight));
  if (scale >= 1) {
    return { dataUrl: sourceDataUrl, width: inputWidth, height: inputHeight };
  }

  const outW = Math.max(1, Math.round(inputWidth * scale));
  const outH = Math.max(1, Math.round(inputHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image processing is not available in this browser.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, outW, outH);
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.9), width: outW, height: outH };
}

const metaTypographyBySize: Record<DesignSize, Pick<PosterParams, 'metaLetterSpacing' | 'metaLineSpacing' | 'metaUppercase'>> = {
  'us-letter': { metaLetterSpacing: 1.8, metaLineSpacing: 1.5, metaUppercase: true },
  a4: { metaLetterSpacing: 1.8, metaLineSpacing: 1.5, metaUppercase: true },
  '11x14': { metaLetterSpacing: 2.2, metaLineSpacing: 1.5, metaUppercase: true },
  a3: { metaLetterSpacing: 2.8, metaLineSpacing: 1.5, metaUppercase: true },
  '12x12': { metaLetterSpacing: 2, metaLineSpacing: 1.5, metaUppercase: true },
  '12x16': { metaLetterSpacing: 3, metaLineSpacing: 1.5, metaUppercase: true },
  '16x20': { metaLetterSpacing: 3.8, metaLineSpacing: 1.5, metaUppercase: true },
  a2: { metaLetterSpacing: 4.2, metaLineSpacing: 1.5, metaUppercase: true },
  '18x24': { metaLetterSpacing: 4.8, metaLineSpacing: 1.5, metaUppercase: true },
  '20x20': { metaLetterSpacing: 3.6, metaLineSpacing: 1.5, metaUppercase: true },
  a1: { metaLetterSpacing: 5.8, metaLineSpacing: 1.5, metaUppercase: true },
  '24x32': { metaLetterSpacing: 6, metaLineSpacing: 1.5, metaUppercase: true },
};

const defaultPosterBySize: Record<DesignSize, Partial<PosterParams>> = {
  'us-letter': { ...ONLY_CHART_FIXED_POSTER_PRESETS['us-letter'], ...metaTypographyBySize['us-letter'] },
  a4: { ...ONLY_CHART_FIXED_POSTER_PRESETS.a4, ...metaTypographyBySize.a4 },
  '11x14': { ...ONLY_CHART_FIXED_POSTER_PRESETS['11x14'], ...metaTypographyBySize['11x14'] },
  a3: { ...ONLY_CHART_FIXED_POSTER_PRESETS.a3, ...metaTypographyBySize.a3 },
  '12x12': { ...ONLY_CHART_FIXED_POSTER_PRESETS['12x12'], ...metaTypographyBySize['12x12'] },
  '12x16': { ...ONLY_CHART_FIXED_POSTER_PRESETS['12x16'], ...metaTypographyBySize['12x16'] },
  '16x20': { ...ONLY_CHART_FIXED_POSTER_PRESETS['16x20'], ...metaTypographyBySize['16x20'] },
  a2: { ...ONLY_CHART_FIXED_POSTER_PRESETS.a2, ...metaTypographyBySize.a2 },
  '18x24': { ...ONLY_CHART_FIXED_POSTER_PRESETS['18x24'], ...metaTypographyBySize['18x24'] },
  '20x20': { ...ONLY_CHART_FIXED_POSTER_PRESETS['20x20'], ...metaTypographyBySize['20x20'] },
  a1: { ...ONLY_CHART_FIXED_POSTER_PRESETS.a1, ...metaTypographyBySize.a1 },
  '24x32': { ...ONLY_CHART_FIXED_POSTER_PRESETS['24x32'], ...metaTypographyBySize['24x32'] },
};

const defaultPoster: PosterParams = {
  size: '16x20',
  palette: 'navy-blue',
  inkColor: '#ffbe4c',
  inkPreset: 'gold',
  border: true,
  borderWidth: 2,
  borderInset: 2,
  chartDiameter: 12.16 * 75,
  title: 'We met under this sky',
  subtitle: 'Sarah & John',
  dedication: '',
  showCoordinates: false,
  coordsInline: false,
  showTime: false,
  includeAzimuthScale: true,
  showCardinals: false,
  ringInnerWidth: 4.5,
  ringGap: 8,
  ringOuterWidth: 5,
  titleFont: 'prata',
  titleFontSize: 45,
  namesFont: 'cursive',
  namesFontSize: 64,
  metaFont: 'signika',
  metaFontSize: 23,
  metaText: 'Florida, USA | February 13, 2026 | 22:00 PM',
  metaFontWeight: 500,
  metaLetterSpacing: 5.8,
  metaLineSpacing: 2,
  metaUppercase: true
};

function mapFontPresetToPoster(fontPreset: FontPresetKey): Pick<PosterParams, 'titleFont' | 'namesFont' | 'metaFont'> {
  if (fontPreset === 'calligraphy') {
    return { titleFont: 'prata', namesFont: 'jimmy-script', metaFont: 'signika' };
  }
  if (fontPreset === 'signature') {
    return { titleFont: 'prata', namesFont: 'cursive', metaFont: 'signika' };
  }
  if (fontPreset === 'serif') {
    return { titleFont: 'serif', namesFont: 'serif', metaFont: 'serif' };
  }
  if (fontPreset === 'gothic') {
    return { titleFont: 'sans', namesFont: 'sans', metaFont: 'sans' };
  }
  return { titleFont: 'serif', namesFont: 'serif', metaFont: 'serif' };
}

function mapDesignSizeToPosterSize(size: DesignSize): PosterParams['size'] {
  return size;
}

function getCompanionCanvasHint(sizeKey: DesignSize): string {
  const [w, h] = POSTER_SIZE_DIMS[sizeKey] ?? [0, 0];
  return h > w ? ' (landscape)' : '';
}

function formatMetaLine(dateIso: string, timeValue: string, showTime: boolean, label: string): string {
  const parts = label
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  const city = parts[0] || label.trim() || 'Custom location';
  const country = parts[parts.length - 1] || '';
  const isUsOrCanada = /^(usa|us|u\.s\.a\.?|united states|canada)$/i.test(country);
  let regionOrCountry = isUsOrCanada && parts.length >= 3 ? parts[parts.length - 2] : country;
  if (regionOrCountry.toLowerCase() === city.toLowerCase()) {
    regionOrCountry = country;
  }

  const topLine = regionOrCountry ? `${city}, ${regionOrCountry}` : city;
  const d = new Date(`${dateIso}T00:00:00`);
  const datePart = Number.isNaN(d.getTime())
    ? dateIso
    : new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(d);

  if (!showTime) return `${topLine}\n${datePart}`;
  const t = /^\d{2}:\d{2}$/.test(timeValue) ? timeValue : '00:00';
  const local = new Date(`${dateIso}T${t}:00`);
  const timePart = Number.isNaN(local.getTime())
    ? t
    : new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(local);
  return `${topLine}\n${datePart} | ${timePart}`;
}

function formatDateForReview(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateIso;
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(d);
}

function normalizePlaceLabel(label: string): string {
  const chunk = label
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  if (chunk.length === 0) return '';
  if (chunk.length === 1) return chunk[0];
  return `${chunk[0]}, ${chunk[chunk.length - 1]}`;
}

function Toggle({
  checked,
  onChange,
  label
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="toggleRow"
      aria-pressed={checked}
    >
      <span className={`switch ${checked ? 'on' : ''}`}>
        <span className="knob" />
      </span>
      <span>{label}</span>
    </button>
  );
}

export default function DesignPage() {
  const router = useRouter();
  const [size, setSize] = useState<DesignSize>(DEFAULT_SINGLE_SIZE);
  const [posterType, setPosterType] = useState<PosterType>('single');
  const [companionSubtype, setCompanionSubtype] = useState<CompanionSubtype>(DEFAULT_COMPANION_SUBTYPE);
  const [frameOn, setFrameOn] = useState(false);
  const [palette, setPalette] = useState<PosterParams['palette']>('navy-blue');
  const [inkPreset, setInkPreset] = useState<InkPresetKey>('gold');
  const [cityQuery, setCityQuery] = useState('Florida, USA');
  const [locationLabel, setLocationLabel] = useState('Florida, USA');
  const [lat, setLat] = useState(27.6648);
  const [lon, setLon] = useState(-81.5158);
  const [date, setDate] = useState('2026-02-13');
  const [time, setTime] = useState('21:00');
  const [showTimeLine, setShowTimeLine] = useState(false);
  const showConstellations = true;
  const [showNames, setShowNames] = useState(true);
  const [showGraticule, setShowGraticule] = useState(false);
  const [showRuler, setShowRuler] = useState(false);
  const [galaxyBackgroundSource, setGalaxyBackgroundSource] = useState<BackgroundSourceMode>('palette');
  const [galaxyBackgroundDataUrl, setGalaxyBackgroundDataUrl] = useState('');
  const [galaxyBackgroundInfo, setGalaxyBackgroundInfo] = useState('');
  const [galaxyBackgroundBusy, setGalaxyBackgroundBusy] = useState(false);
  const [galaxyBackgroundError, setGalaxyBackgroundError] = useState('');
  const [title, setTitle] = useState('We met under this sky');
  const [fontPreset, setFontPreset] = useState<FontPresetKey>('calligraphy');
  const [names, setNames] = useState('Sarah & John');
  const [locationLine, setLocationLine] = useState(formatMetaLine('2026-02-13', '21:00', false, 'Florida, USA'));
  const [locationLineDirty, setLocationLineDirty] = useState(false);
  const [geoExpanded, setGeoExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [companionPhotoMeta, setCompanionPhotoMeta] = useState<CompanionPhotoMeta | null>(null);
  const [companionPhotoDataUrl, setCompanionPhotoDataUrl] = useState('');
  const [companionPhotoInfo, setCompanionPhotoInfo] = useState('');
  const [companionPhotoBusy, setCompanionPhotoBusy] = useState(false);
  const [companionPhotoError, setCompanionPhotoError] = useState('');
  const [companionPhotoZoom, setCompanionPhotoZoom] = useState(1);
  const [companionPhotoOffsetX, setCompanionPhotoOffsetX] = useState(0);
  const [companionPhotoOffsetY, setCompanionPhotoOffsetY] = useState(0);
  const [companionPhotoDragging, setCompanionPhotoDragging] = useState(false);
  const [companionPhotoDragStartX, setCompanionPhotoDragStartX] = useState(0);
  const [companionPhotoDragStartY, setCompanionPhotoDragStartY] = useState(0);
  const [companionPhotoDragOriginX, setCompanionPhotoDragOriginX] = useState(0);
  const [companionPhotoDragOriginY, setCompanionPhotoDragOriginY] = useState(0);
  const [constellationLanguage, setConstellationLanguage] = useState<ConstellationLanguage>('latin');

  const [posterSvg, setPosterSvg] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutConfirmOpen, setCheckoutConfirmOpen] = useState(false);
  const [error, setError] = useState('');
  const latestRequestRef = useRef(0);
  const companionPhotoInputRef = useRef<HTMLInputElement>(null);
  const galaxyBackgroundInputRef = useRef<HTMLInputElement>(null);

  const selectedPalette = useMemo(() => findPalette(palette), [palette]);
  const selectedInk = useMemo(() => INK_PRESETS.find((item) => item.key === inkPreset) ?? INK_PRESETS[0], [inkPreset]);
  const selectedFont = useMemo(() => FONT_PRESETS.find((item) => item.key === fontPreset) ?? FONT_PRESETS[0], [fontPreset]);
  const selectedSizePreset = useMemo(() => SIZE_PRESETS.find((item) => item.key === size), [size]);
  const effectiveTheme = selectedPalette.tone;
  const sizeOptions = STANDARD_SIZE_PRESETS;
  const isMoonPhaseUI = posterType === 'companion' && companionSubtype === 'moon-phase';
  const isSkyPhotoUI = posterType === 'companion' && companionSubtype === 'sky-photo';
  const isGalaxyUI = posterType === 'galaxy';
  const reviewLocation = useMemo(() => normalizePlaceLabel(locationLabel || cityQuery) || 'Custom location', [cityQuery, locationLabel]);
  const reviewLocationLine = useMemo(
    () => locationLine.trim() || formatMetaLine(date, time, showTimeLine, locationLabel || cityQuery),
    [cityQuery, date, locationLabel, locationLine, showTimeLine, time]
  );
  const reviewDateText = useMemo(() => formatDateForReview(date), [date]);
  const reviewTimeText = useMemo(
    () =>
      /^\d{2}:\d{2}$/.test(time)
        ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(
          new Date(`2000-01-01T${time}:00`)
        )
        : time,
    [time]
  );
  const companionPreviewTransform = useMemo(() => {
    if (!companionPhotoMeta) return { width: PHOTO_PREVIEW_SIZE, height: PHOTO_PREVIEW_SIZE, x: 0, y: 0 };
    const baseScale = Math.max(
      PHOTO_PREVIEW_SIZE / companionPhotoMeta.inputWidth,
      PHOTO_PREVIEW_SIZE / companionPhotoMeta.inputHeight
    );
    const drawW = companionPhotoMeta.inputWidth * baseScale * companionPhotoZoom;
    const drawH = companionPhotoMeta.inputHeight * baseScale * companionPhotoZoom;
    const clamped = clampCompanionPhotoOffset(
      companionPhotoOffsetX,
      companionPhotoOffsetY,
      companionPhotoMeta.inputWidth,
      companionPhotoMeta.inputHeight,
      companionPhotoZoom
    );
    return {
      width: drawW,
      height: drawH,
      x: (PHOTO_PREVIEW_SIZE - drawW) / 2 + clamped.x,
      y: (PHOTO_PREVIEW_SIZE - drawH) / 2 + clamped.y
    };
  }, [companionPhotoMeta, companionPhotoOffsetX, companionPhotoOffsetY, companionPhotoZoom]);

  useEffect(() => {
    if (locationLineDirty) return;
    setLocationLine(formatMetaLine(date, time, showTimeLine, locationLabel || cityQuery));
  }, [cityQuery, date, locationLabel, locationLineDirty, showTimeLine, time]);

  useEffect(() => {
    const q = cityQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const timeout = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const data = (await res.json()) as GeocodeResult[];
        setSuggestions(data.slice(0, 3));
      } catch {
        setSuggestions([]);
      }
    }, 220);
    return () => window.clearTimeout(timeout);
  }, [cityQuery]);

  useEffect(() => {
    if (companionSubtype !== 'sky-photo') {
      setCompanionPhotoError('');
    }
  }, [companionSubtype]);

  useEffect(() => {
    if (posterType !== 'galaxy') {
      setGalaxyBackgroundError('');
    }
  }, [posterType]);

  useEffect(() => {
    if (!companionPhotoMeta) {
      setCompanionPhotoDataUrl('');
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const next = await buildCompanionPhotoOutput({
          sourceDataUrl: companionPhotoMeta.sourceDataUrl,
          inputWidth: companionPhotoMeta.inputWidth,
          inputHeight: companionPhotoMeta.inputHeight,
          zoom: companionPhotoZoom,
          offsetX: companionPhotoOffsetX,
          offsetY: companionPhotoOffsetY
        });
        if (!cancelled) setCompanionPhotoDataUrl(next);
      } catch (e: any) {
        if (!cancelled) setCompanionPhotoError(e?.message ?? 'Photo processing failed.');
      }
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [companionPhotoMeta, companionPhotoOffsetX, companionPhotoOffsetY, companionPhotoZoom]);

  useEffect(() => {
    if (!checkoutConfirmOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCheckoutConfirmOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [checkoutConfirmOpen]);

  const previewBg = useMemo(() => {
    return effectiveTheme === 'dark'
      ? 'radial-gradient(1200px 700px at 50% 30%, #eceff3 0%, #d8dde5 55%, #ced4de 100%)'
      : 'radial-gradient(1200px 700px at 50% 30%, #ffffff 0%, #f4f5f6 55%, #eceeef 100%)';
  }, [effectiveTheme]);

  const applySuggestion = useCallback((item: GeocodeResult) => {
    setCityQuery(item.label);
    setLocationLabel(item.label);
    setLat(item.lat);
    setLon(item.lon);
    setSuggestionsOpen(false);
  }, []);

  const handleCompanionPhotoFile = useCallback(async (file: File | null | undefined) => {
    if (!file) return;
    setCompanionPhotoBusy(true);
    setCompanionPhotoError('');
    try {
      const normalized = await normalizeCompanionPhotoFile(file);
      setCompanionPhotoMeta(normalized);
      setCompanionPhotoZoom(1);
      setCompanionPhotoOffsetX(0);
      setCompanionPhotoOffsetY(0);
      setCompanionPhotoInfo(
        `Uploaded: ${normalized.inputWidth}x${normalized.inputHeight}px. Final export is optimized to ${PHOTO_TARGET_DIM}x${PHOTO_TARGET_DIM}px.`
      );
    } catch (e: any) {
      setCompanionPhotoError(e?.message ?? 'Photo upload failed.');
    } finally {
      setCompanionPhotoBusy(false);
    }
  }, []);

  const handleGalaxyBackgroundFile = useCallback(async (file: File | null | undefined) => {
    if (!file) return;
    setGalaxyBackgroundBusy(true);
    setGalaxyBackgroundError('');
    try {
      const normalized = await normalizeGalaxyBackgroundFile(file);
      setGalaxyBackgroundSource('upload');
      setGalaxyBackgroundDataUrl(normalized.dataUrl);
      setGalaxyBackgroundInfo(`Uploaded: ${normalized.width}x${normalized.height}px.`);
    } catch (e: any) {
      setGalaxyBackgroundError(e?.message ?? 'Background image upload failed.');
    } finally {
      setGalaxyBackgroundBusy(false);
    }
  }, []);

  const applyCompanionZoom = useCallback((nextZoom: number) => {
    if (!companionPhotoMeta) return;
    const clampedZoom = Math.max(PHOTO_ZOOM_MIN, Math.min(PHOTO_ZOOM_MAX, nextZoom));
    const clampedOffset = clampCompanionPhotoOffset(
      companionPhotoOffsetX,
      companionPhotoOffsetY,
      companionPhotoMeta.inputWidth,
      companionPhotoMeta.inputHeight,
      clampedZoom
    );
    setCompanionPhotoZoom(clampedZoom);
    setCompanionPhotoOffsetX(clampedOffset.x);
    setCompanionPhotoOffsetY(clampedOffset.y);
  }, [companionPhotoMeta, companionPhotoOffsetX, companionPhotoOffsetY]);

  const handleCompanionPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!companionPhotoMeta) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setCompanionPhotoDragging(true);
    setCompanionPhotoDragStartX(e.clientX);
    setCompanionPhotoDragStartY(e.clientY);
    setCompanionPhotoDragOriginX(companionPhotoOffsetX);
    setCompanionPhotoDragOriginY(companionPhotoOffsetY);
  }, [companionPhotoMeta, companionPhotoOffsetX, companionPhotoOffsetY]);

  const handleCompanionPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!companionPhotoDragging || !companionPhotoMeta) return;
    const dx = e.clientX - companionPhotoDragStartX;
    const dy = e.clientY - companionPhotoDragStartY;
    const clamped = clampCompanionPhotoOffset(
      companionPhotoDragOriginX + dx,
      companionPhotoDragOriginY + dy,
      companionPhotoMeta.inputWidth,
      companionPhotoMeta.inputHeight,
      companionPhotoZoom
    );
    setCompanionPhotoOffsetX(clamped.x);
    setCompanionPhotoOffsetY(clamped.y);
  }, [
    companionPhotoDragOriginX,
    companionPhotoDragOriginY,
    companionPhotoDragStartX,
    companionPhotoDragStartY,
    companionPhotoDragging,
    companionPhotoMeta,
    companionPhotoZoom
  ]);

  const handleCompanionPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!companionPhotoDragging) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setCompanionPhotoDragging(false);
  }, [companionPhotoDragging]);

  const generate = useCallback(async () => {
    setBusy(true);
    setError('');
    const reqId = ++latestRequestRef.current;
    try {
      const cleanPlaceRaw = normalizePlaceLabel(locationLabel || cityQuery);
      if (!cleanPlaceRaw) {
        throw new Error('Location is required.');
      }
      if (!date.trim()) {
        throw new Error('Date is required.');
      }

      const localDateTime = `${date}T${time}`;
      const normalizeRes = await fetch('/api/normalize-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: lat,
          longitude: lon,
          localDateTime
        })
      });
      if (!normalizeRes.ok) {
        throw new Error((await normalizeRes.text()) || 'Time normalization failed');
      }
      const normalized = (await normalizeRes.json()) as {
        timeUtcIso: string;
        timeZone: string;
      };


      const params: RenderParams = {
        ...defaultParams,
        theme: effectiveTheme,
        showCoordinateGrid: showGraticule,
        labelStarNames: showNames,
        labelConstellations: showNames,
        labelSolarSystem: showNames,
        constellationLineAlpha: 0.7,
        mirrorHorizontal: true,
        constellationLanguage
      };


      const isGalaxyPoster = posterType === 'galaxy';
      const isMoonPhase = posterType === 'companion' && companionSubtype === 'moon-phase';
      const isSkyPhoto = posterType === 'companion' && companionSubtype === 'sky-photo';
      const usesCompanionCircle = posterType === 'companion';
      if (isSkyPhoto && !companionPhotoDataUrl) {
        if (companionPhotoMeta) return;
        if (reqId === latestRequestRef.current) setPosterSvg('');
        throw new Error('Please upload a photo for the Photo Companion layout.');
      }

      const mappedFont = mapFontPresetToPoster(fontPreset);
      const bySize = defaultPosterBySize[size];
      const cleanPlace = normalizePlaceLabel(locationLabel || cityQuery);
      const fallbackLocationLine = formatMetaLine(date, time, showTimeLine, locationLabel || cityQuery);
      const nextMetaLine = locationLine.trim() || fallbackLocationLine;
      const moonPhaseImageUrl = selectedInk.key === 'silver' ? '/moon_silver.png' : '/moon_gold.png';
      const formulaOverrides = usesCompanionCircle ? buildPosterFormulaOverrides(size) : null;
      const galaxyBackgroundMode =
        isGalaxyPoster && galaxyBackgroundSource === 'upload' && galaxyBackgroundDataUrl
          ? 'image'
          : 'solid';

      const poster: PosterParams = {
        ...defaultPoster,
        ...bySize,
        ...(formulaOverrides ?? {}),
        ...mappedFont,
        size: mapDesignSizeToPosterSize(size),
        border: frameOn,
        title,
        subtitle: names,
        metaText: nextMetaLine,
        palette,
        inkColor: selectedInk.hex,
        inkPreset: selectedInk.key,
        includeAzimuthScale: true,
        showCardinals: false,
        showCoordinates: false,
        showTime: false,
        dedication: '',
        showMoonPhase: isMoonPhase,
        moonPhaseImageUrl,
        showCompanionPhoto: isSkyPhoto,
        companionPhotoImageUrl: isSkyPhoto ? companionPhotoDataUrl : undefined,
        showRuler,
        posterVariant: isGalaxyPoster ? 'galaxy' : 'classic',
        backgroundMode: galaxyBackgroundMode,
        backgroundImageUrl: galaxyBackgroundMode === 'image' ? galaxyBackgroundDataUrl : undefined,
      };

      const posterRes = await fetch('/api/skymap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: lat,
          longitude: lon,
          timeUtcIso: normalized.timeUtcIso,
          timeZone: normalized.timeZone,
          timeLocal: localDateTime,
          locationLabel: cleanPlace || 'Custom location',
          params,
          poster
        })
      });
      if (!posterRes.ok) {
        throw new Error((await posterRes.text()) || 'Poster generation failed');
      }
      const svg = await posterRes.text();
      if (reqId !== latestRequestRef.current) return;
      setPosterSvg(svg);
    } catch (e: any) {
      if (reqId !== latestRequestRef.current) return;
      setError(e?.message ?? String(e));
    } finally {
      if (reqId === latestRequestRef.current) setBusy(false);
    }
  }, [
    cityQuery,
    companionPhotoMeta,
    companionPhotoDataUrl,
    galaxyBackgroundSource,
    galaxyBackgroundDataUrl,
    constellationLanguage,
    date,
    fontPreset,
    frameOn,
    lat,
    locationLabel,
    locationLine,
    lon,
    names,
    inkPreset,
    palette,
    posterType,
    companionSubtype,
    showTimeLine,
    showNames,
    showGraticule,
    showRuler,
    size,
    effectiveTheme,
    time,
    title
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void generate();
    }, 180);
    return () => window.clearTimeout(timer);
  }, [generate]);

  const persistCheckoutDraft = useCallback((draftRaw: string): boolean => {
    const storages = [window.localStorage, window.sessionStorage];
    for (const storage of storages) {
      try {
        storage.removeItem(CHECKOUT_DRAFT_KEY);
      } catch {
        // ignore cleanup errors
      }
    }
    for (const storage of storages) {
      try {
        storage.setItem(CHECKOUT_DRAFT_KEY, draftRaw);
        return true;
      } catch {
        // try next storage
      }
    }
    return false;
  }, []);

  const handleCheckout = useCallback(async () => {
    setCheckoutBusy(true);
    setError('');
    try {
      const cleanPlaceRaw = normalizePlaceLabel(locationLabel || cityQuery);
      if (!cleanPlaceRaw) {
        throw new Error('Location is required.');
      }
      if (!date.trim()) {
        throw new Error('Date is required.');
      }

      const localDateTime = `${date}T${time}`;
      const normalizeRes = await fetch('/api/normalize-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: lat,
          longitude: lon,
          localDateTime
        })
      });
      if (!normalizeRes.ok) {
        throw new Error((await normalizeRes.text()) || 'Time normalization failed');
      }
      const normalized = (await normalizeRes.json()) as {
        timeUtcIso: string;
        timeZone: string;
      };

      const params: RenderParams = {
        ...defaultParams,
        theme: effectiveTheme,
        showCoordinateGrid: showGraticule,
        labelStarNames: showNames,
        labelConstellations: showNames,
        labelSolarSystem: showNames,
        constellationLineAlpha: 0.7,
        mirrorHorizontal: true
      };
      const isGalaxyPoster = posterType === 'galaxy';
      const isMoonPhase = posterType === 'companion' && companionSubtype === 'moon-phase';
      const isSkyPhoto = posterType === 'companion' && companionSubtype === 'sky-photo';
      const usesCompanionCircle = posterType === 'companion';
      if (isSkyPhoto && !companionPhotoDataUrl) {
        if (companionPhotoMeta) {
          throw new Error('Photo is still processing. Please wait a moment and try again.');
        }
        throw new Error('Please upload a photo for the Photo Companion layout.');
      }

      const mappedFont = mapFontPresetToPoster(fontPreset);
      const bySize = defaultPosterBySize[size];
      const cleanPlace = normalizePlaceLabel(locationLabel || cityQuery);
      const fallbackLocationLine = formatMetaLine(date, time, showTimeLine, locationLabel || cityQuery);
      const nextMetaLine = locationLine.trim() || fallbackLocationLine;
      const moonPhaseImageUrl = selectedInk.key === 'silver' ? '/moon_silver.png' : '/moon_gold.png';
      const formulaOverrides = usesCompanionCircle ? buildPosterFormulaOverrides(size) : null;
      const galaxyBackgroundMode =
        isGalaxyPoster && galaxyBackgroundSource === 'upload' && galaxyBackgroundDataUrl
          ? 'image'
          : 'solid';

      const basePoster: PosterParams = {
        ...defaultPoster,
        ...bySize,
        ...(formulaOverrides ?? {}),
        ...mappedFont,
        size: mapDesignSizeToPosterSize(size),
        border: frameOn,
        title,
        subtitle: names,
        metaText: nextMetaLine,
        palette,
        inkColor: selectedInk.hex,
        inkPreset: selectedInk.key,
        includeAzimuthScale: true,
        showCardinals: false,
        showCoordinates: false,
        showTime: false,
        dedication: '',
        showMoonPhase: isMoonPhase,
        moonPhaseImageUrl,
        showCompanionPhoto: isSkyPhoto,
        companionPhotoImageUrl: isSkyPhoto ? companionPhotoDataUrl : undefined,
        showRuler,
        posterVariant: isGalaxyPoster ? 'galaxy' : 'classic',
        backgroundMode: galaxyBackgroundMode,
        backgroundImageUrl: galaxyBackgroundMode === 'image' ? galaxyBackgroundDataUrl : undefined
      };

      const renderRequest = {
        latitude: lat,
        longitude: lon,
        timeUtcIso: normalized.timeUtcIso,
        timeZone: normalized.timeZone,
        timeLocal: localDateTime,
        locationLabel: cleanPlace || 'Custom location',
        params,
        poster: basePoster
      };

      const posterRes = await fetch('/api/skymap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(renderRequest)
      });
      if (!posterRes.ok) {
        throw new Error((await posterRes.text()) || 'Poster generation failed');
      }
      const svg = await posterRes.text();
      setPosterSvg(svg);

      const draft: CheckoutDraft = {
        createdAtIso: new Date().toISOString(),
        productType: 'sky',
        previewSvg: svg,
        renderRequest: renderRequest,
        mapData: {
          city: cleanPlace || 'Custom location',
          date,
          time,
          title,
          names,
          font: FONT_PRESETS.find((x) => x.key === fontPreset)?.label || 'Calligraphy',
          showConstellations,
          showStarNames: showNames,
          showConstellationNames: showNames,
          showPlanetNames: showNames,
          showGraticule,
          palette,
          inkColor: selectedInk.hex,
          lineColor: selectedInk.label,
          showTime: showTimeLine,
          size,
          companionPhoto: isSkyPhoto,
          frameOn,
          lat,
          lon,
          locationLine: nextMetaLine
        }
      };

      const draftRaw = JSON.stringify(draft);
      if (!persistCheckoutDraft(draftRaw)) {
        throw new Error('Browser storage is full. Please close some tabs or clear site data, then try again.');
      }
      router.push('/checkout');
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setCheckoutBusy(false);
    }
  }, [
    cityQuery,
    companionPhotoMeta,
    companionPhotoDataUrl,
    galaxyBackgroundSource,
    galaxyBackgroundDataUrl,
    date,
    effectiveTheme,
    fontPreset,
    frameOn,
    lat,
    locationLabel,
    locationLine,
    lon,
    names,
    inkPreset,
    palette,
    posterType,
    companionSubtype,
    persistCheckoutDraft,
    router,
    showTimeLine,
    showNames,
    showGraticule,
    showRuler,
    size,
    time,
    title
  ]);

  return (
    <div className="designRoot">
      <header className="topbar">
        <div className="brand">
          <div className="brandMark" aria-hidden="true">
            <img src="/logo_ourskymap_v4.jpeg" alt="" />
          </div>
          <div className="brandText">
            <div className="brandMain">STAR MAP</div>
            <div className="brandSub">STUDIO</div>
          </div>
        </div>
        <nav className="menu">
          <a href="/what-is-star-map">What is StarMap?</a>
          <span className="menuPlaceholder">Constellation Guide (Soon)</span>
          <span className="menuPlaceholder">Moon Phase Notes (Soon)</span>
          <span className="menuPlaceholder">Gift Ideas (Soon)</span>
        </nav>
        <a className="homeCta" href="/">Home Page</a>
      </header>

      <main className="layout">
        <section className="previewPanel" style={{ background: previewBg }}>
          <div className="paper">
            {posterSvg ? <div className="svgMount" dangerouslySetInnerHTML={{ __html: posterSvg }} /> : null}
          </div>
        </section>

        <aside className="rightPanel">
          <div className="panelBlock sizeFrameBlock">
            <div className="stackField">
              <label>Poster Type</label>
              <div className="posterTypeRows">
                <div className="posterTypeRow">
                  <button
                    className={posterType === 'single' ? 'typeBtn typeBtn--active' : 'typeBtn'}
                    onClick={() => setPosterType('single')}
                    type="button"
                  >
                    <img src="/poster-type-single.png" alt="" className="typeBtnImg" />
                    <span className="typeBtnLabel">Standard<br />Star Map</span>
                  </button>
                  <button
                    className={posterType === 'companion' ? 'typeBtn typeBtn--active' : 'typeBtn'}
                    onClick={() => setPosterType('companion')}
                    type="button"
                  >
                    <img src="/poster-type-companion.png" alt="" className="typeBtnImg" />
                    <span className="typeBtnLabel">Star Map<br />with Moon Phase</span>
                  </button>
                </div>
                <div className="posterTypeRow posterTypeRow--single">
                  <button
                    className={posterType === 'galaxy' ? 'typeBtn typeBtn--active' : 'typeBtn'}
                    onClick={() => setPosterType('galaxy')}
                    type="button"
                  >
                    <span className="typeBtnImg typeBtnImg--galaxy" aria-hidden="true">
                      <span className="typeBtnGalaxyLogo" />
                      <span className="typeBtnGalaxyBase" />
                    </span>
                    <span className="typeBtnLabel">Galaxy<br />Star Map</span>
                  </button>
                </div>
              </div>
            </div>

            {posterType === 'companion' && (
              <div className="stackField">
                <label>Companion Type</label>
                <select
                  className="dashedInput"
                  value={companionSubtype}
                  onChange={(e) => setCompanionSubtype(e.target.value as CompanionSubtype)}
                >
                  <option value="moon-phase">Moon Phase</option>
                  <option value="sky-photo">Photo Companion</option>
                </select>
              </div>
            )}

            <div className="stackField">
              <label>Select Poster Size</label>
              <select className="dashedInput" value={size} onChange={(e) => setSize(e.target.value as DesignSize)}>
                {sizeOptions.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.title} - {item.sub}{posterType === 'companion' ? getCompanionCanvasHint(item.key) : ''}
                  </option>
                ))}
              </select>
              <p className="microHint">Selected size is used for downloadable file output only.</p>
            </div>

            <Toggle checked={frameOn} onChange={setFrameOn} label="Decorative Border" />

            {isSkyPhotoUI ? (
              <div className="stackField">
                <label>Companion Photo (Left Circle)</label>
                <input
                  ref={companionPhotoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="uploadInputHidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    void handleCompanionPhotoFile(file);
                    e.currentTarget.value = '';
                  }}
                />
                <div className="uploadActions">
                  <button
                    type="button"
                    className="uploadBtn"
                    onClick={() => companionPhotoInputRef.current?.click()}
                    disabled={companionPhotoBusy}
                  >
                    {companionPhotoBusy
                      ? 'Processing...'
                      : companionPhotoMeta
                        ? 'Replace Photo'
                        : 'Upload Photo'}
                  </button>
                  {companionPhotoMeta ? (
                    <button
                      type="button"
                      className="uploadGhostBtn"
                      onClick={() => {
                        setCompanionPhotoMeta(null);
                        setCompanionPhotoDataUrl('');
                        setCompanionPhotoZoom(1);
                        setCompanionPhotoOffsetX(0);
                        setCompanionPhotoOffsetY(0);
                        setCompanionPhotoDragging(false);
                        setCompanionPhotoInfo('');
                        setCompanionPhotoError('');
                      }}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <div className="companionPreviewWrap">
                  <div
                    className={`companionPreview ${companionPhotoDragging ? 'dragging' : ''}`}
                    onPointerDown={handleCompanionPointerDown}
                    onPointerMove={handleCompanionPointerMove}
                    onPointerUp={handleCompanionPointerUp}
                    onPointerCancel={handleCompanionPointerUp}
                  >
                    <div className="companionCircle">
                      {companionPhotoMeta ? (
                        <img
                          src={companionPhotoMeta.sourceDataUrl}
                          alt=""
                          draggable={false}
                          className="companionImage"
                          style={{
                            width: `${companionPreviewTransform.width}px`,
                            height: `${companionPreviewTransform.height}px`,
                            left: `${companionPreviewTransform.x}px`,
                            top: `${companionPreviewTransform.y}px`
                          }}
                        />
                      ) : (
                        <div className="companionPlaceholder">Upload</div>
                      )}
                    </div>
                    <span className="companionRing companionRingInner" />
                    <span className="companionRing companionRingOuter" />
                    {companionPhotoMeta ? (
                      <div className="companionZoomControls">
                        <button
                          type="button"
                          className="companionZoomBtn"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => applyCompanionZoom(companionPhotoZoom + PHOTO_ZOOM_STEP)}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          className="companionZoomBtn"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => applyCompanionZoom(companionPhotoZoom - PHOTO_ZOOM_STEP)}
                        >
                          -
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                {companionPhotoInfo ? (
                  <p className="microHint">{companionPhotoInfo}</p>
                ) : (
                  <p className="microHint">
                    Best results: high-quality image, minimum 1200x1200px. Use + / - and drag to frame your photo.
                  </p>
                )}
                {companionPhotoError ? <p className="inlineError">{companionPhotoError}</p> : null}
              </div>
            ) : null}

            <div className="fieldGroup">
              <label>Background:</label>
              <div className="palettePickerWrap">
                <div className="palettePicker">
                  {POSTER_PALETTES.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      className={`paletteBtn ${palette === p.key ? 'active' : ''}`}
                      title={p.label}
                      onClick={() => {
                        setPalette(p.key);
                      }}
                    >
                      <span className="swatch" style={{ background: p.bg }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="fieldGroup">
              <label>Line/Text:</label>
              <div className="inkPicker">
                {INK_PRESETS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`inkBtn ${inkPreset === item.key ? 'active' : ''}`}
                    onClick={() => setInkPreset(item.key)}
                  >
                    <span className="inkSwatch" style={{ background: item.hex }} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {isGalaxyUI ? (
              <div className="stackField">
                <label>Galaxy Background</label>
                <select
                  value={galaxyBackgroundSource}
                  onChange={(e) => setGalaxyBackgroundSource(e.target.value as BackgroundSourceMode)}
                >
                  <option value="palette">Use selected background color</option>
                  <option value="upload">Upload custom background</option>
                </select>
                {galaxyBackgroundSource === 'upload' ? (
                  <>
                    <input
                      ref={galaxyBackgroundInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="uploadInputHidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        void handleGalaxyBackgroundFile(file);
                        e.currentTarget.value = '';
                      }}
                    />
                    <div className="uploadActions">
                      <button
                        type="button"
                        className="uploadBtn"
                        onClick={() => galaxyBackgroundInputRef.current?.click()}
                        disabled={galaxyBackgroundBusy}
                      >
                        {galaxyBackgroundBusy
                          ? 'Processing...'
                          : galaxyBackgroundDataUrl
                            ? 'Replace Background'
                            : 'Upload Background'}
                      </button>
                      {galaxyBackgroundDataUrl ? (
                        <button
                          type="button"
                          className="uploadGhostBtn"
                          onClick={() => {
                            setGalaxyBackgroundDataUrl('');
                            setGalaxyBackgroundInfo('');
                            setGalaxyBackgroundError('');
                          }}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                    {galaxyBackgroundDataUrl ? (
                      <div className="galaxyBgPreview">
                        <img src={galaxyBackgroundDataUrl} alt="Galaxy background preview" />
                      </div>
                    ) : null}
                    {galaxyBackgroundInfo ? <p className="microHint">{galaxyBackgroundInfo}</p> : null}
                    {galaxyBackgroundError ? <p className="inlineError">{galaxyBackgroundError}</p> : null}
                  </>
                ) : (
                  <p className="microHint">Pick a background color above, or switch to upload mode.</p>
                )}
              </div>
            ) : null}

          </div>

          <div className="panelBlock softB">
            <div className="fieldGroup">
              <label>City:</label>
              <div className="cityWrap">
                <input
                  value={cityQuery}
                  onChange={(e) => {
                    setCityQuery(e.target.value);
                    setLocationLabel(e.target.value);
                    setSuggestionsOpen(true);
                  }}
                  onFocus={() => setSuggestionsOpen(true)}
                  placeholder="Search location..."
                  required
                />
                <button
                  type="button"
                  className={`arrowBtn ${geoExpanded ? 'open' : ''}`}
                  onClick={() => {
                    setGeoExpanded((v) => !v);
                    setSuggestionsOpen(false);
                  }}
                  aria-label={geoExpanded ? 'Latitude/Longitude alanını gizle' : 'Latitude/Longitude alanını göster'}
                  aria-expanded={geoExpanded}
                >
                  <svg className="arrowIcon" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M5.2 7.4a1 1 0 0 1 1.4 0L10 10.8l3.4-3.4a1 1 0 1 1 1.4 1.4l-4.1 4.1a1 1 0 0 1-1.4 0L5.2 8.8a1 1 0 0 1 0-1.4Z" />
                  </svg>
                </button>
                {suggestionsOpen && suggestions.length > 0 ? (
                  <div className="suggestions">
                    {suggestions.map((item) => (
                      <button key={`${item.lat}_${item.lon}`} type="button" onClick={() => applySuggestion(item)}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {geoExpanded ? (
              <>
                <div className="fieldGroup">
                  <label>Latitude:</label>
                  <input
                    type="number"
                    value={lat}
                    step={0.0001}
                    onChange={(e) => setLat(Number(e.target.value))}
                  />
                </div>
                <div className="fieldGroup">
                  <label>Longitude:</label>
                  <input
                    type="number"
                    value={lon}
                    step={0.0001}
                    onChange={(e) => setLon(Number(e.target.value))}
                  />
                </div>
              </>
            ) : null}
            <div className="fieldGroup">
              <label>Date:</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="fieldGroup">
              <label>Time:</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <Toggle checked={showTimeLine} onChange={setShowTimeLine} label="Show Time in Location/Date" />
            <p className="hint">
              Default time is 21:00. Turn on time if it should appear in the poster text.
            </p>
          </div>

          <div className="panelBlock softD">
            <Toggle checked={showGraticule} onChange={setShowGraticule} label="Grids" />
            <Toggle checked={showNames} onChange={setShowNames} label="Show Labels" />
            <Toggle checked={showRuler} onChange={setShowRuler} label="Show Ruler" />

            <div className="fieldGroup">
              <label>Label Language</label>
              <select
                value={constellationLanguage}
                onChange={(e) => setConstellationLanguage(e.target.value as ConstellationLanguage)}
                className="selectInput"
              >
                <option value="latin">Latin (Universal)</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>

          <div className="panelBlock softC">
            <div className="fieldGroup">
              <label>Title:</label>
              <textarea value={title} rows={3} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="fieldGroup">
              <label>Font:</label>
              <select value={fontPreset} onChange={(e) => setFontPreset(e.target.value as FontPresetKey)}>
                {FONT_PRESETS.map((font) => (
                  <option key={font.key} value={font.key}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="fieldGroup">
              <label>Names:</label>
              <input value={names} onChange={(e) => setNames(e.target.value)} />
            </div>

            <div className="fieldGroup">
              <label>Location/Date:</label>
              <textarea
                value={locationLine}
                rows={3}
                onChange={(e) => {
                  setLocationLine(e.target.value);
                  setLocationLineDirty(true);
                }}
              />
            </div>

            <button
              type="button"
              className="checkoutBtn"
              onClick={() => setCheckoutConfirmOpen(true)}
              disabled={busy || checkoutBusy}
            >
              {checkoutBusy ? 'Preparing...' : busy ? 'Updating...' : 'Checkout'}
            </button>
            {error ? <p className="error">{error}</p> : null}
          </div>
        </aside>
      </main>

      {checkoutConfirmOpen ? (
        <div className="confirmOverlay" role="dialog" aria-modal="true" aria-label="Confirm poster details" onClick={() => setCheckoutConfirmOpen(false)}>
          <div className="confirmCard" onClick={(e) => e.stopPropagation()}>
            <div className="confirmHeader">
              <div>
                <div className="confirmEyebrow">Review Before Checkout</div>
                <h3>Confirm Your Poster Details</h3>
                <p>Please check spelling and date/location info before continuing.</p>
              </div>
              <button type="button" className="confirmCloseBtn" onClick={() => setCheckoutConfirmOpen(false)} aria-label="Close review popup">
                ×
              </button>
            </div>

            <div className="confirmGrid">
              <div className="confirmItem">
                <span>Poster Size</span>
                <strong>{selectedSizePreset ? `${selectedSizePreset.title} (${selectedSizePreset.sub})` : size}</strong>
              </div>
              <div className="confirmItem">
                <span>Font Preset</span>
                <strong>{selectedFont.label}</strong>
              </div>
              <div className="confirmItem full">
                <span>Title</span>
                <strong>{title.trim() || '—'}</strong>
              </div>
              <div className="confirmItem full">
                <span>Names</span>
                <strong>{names.trim() || '—'}</strong>
              </div>
              <div className="confirmItem">
                <span>Location</span>
                <strong>{reviewLocation}</strong>
              </div>
              <div className="confirmItem">
                <span>Date</span>
                <strong>{reviewDateText}</strong>
              </div>
              <div className="confirmItem">
                <span>Time</span>
                <strong>{reviewTimeText || '—'}</strong>
              </div>
              <div className="confirmItem">
                <span>Time Visibility</span>
                <strong>{showTimeLine ? 'Shown on poster' : 'Hidden on poster'}</strong>
              </div>
              <div className="confirmItem full">
                <span>Location/Date Text</span>
                <strong className="confirmValueMultiline">{reviewLocationLine}</strong>
              </div>
            </div>

            <div className="confirmActions">
              <button type="button" className="confirmBackBtn" onClick={() => setCheckoutConfirmOpen(false)}>
                Go Back and Edit
              </button>
              <button
                type="button"
                className="confirmApproveBtn"
                onClick={() => {
                  setCheckoutConfirmOpen(false);
                  void handleCheckout();
                }}
                disabled={busy || checkoutBusy}
              >
                {checkoutBusy ? 'Preparing...' : 'Confirm and Continue'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .designRoot :global(*),
        .designRoot :global(*::before),
        .designRoot :global(*::after) {
          box-sizing: border-box;
        }

        .designRoot {
          height: 100vh;
          background: #dfe3ea;
          color: #121317;
          overflow: hidden;
        }

        .topbar {
          height: 84px;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          background: linear-gradient(90deg, #0f172a 0%, #13203f 52%, #1b2a4d 100%);
          color: #fff;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          justify-content: normal;
          padding: 0 24px;
          overflow: hidden;
        }
        .topbar::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            radial-gradient(circle at 7% 22%, rgba(255, 255, 255, 0.95) 2px, transparent 2.6px),
            radial-gradient(circle at 14% 66%, rgba(255, 255, 255, 0.9) 1.4px, transparent 2px),
            radial-gradient(circle at 22% 36%, rgba(255, 255, 255, 0.8) 1.1px, transparent 1.7px),
            radial-gradient(circle at 31% 73%, rgba(255, 255, 255, 0.92) 1.7px, transparent 2.2px),
            radial-gradient(circle at 39% 28%, rgba(255, 255, 255, 0.75) 1px, transparent 1.6px),
            radial-gradient(circle at 46% 64%, rgba(255, 255, 255, 0.88) 1.6px, transparent 2.2px),
            radial-gradient(circle at 53% 19%, rgba(255, 255, 255, 0.82) 1.2px, transparent 1.8px),
            radial-gradient(circle at 62% 71%, rgba(255, 255, 255, 0.95) 2.1px, transparent 2.8px),
            radial-gradient(circle at 71% 33%, rgba(255, 255, 255, 0.78) 1.1px, transparent 1.7px),
            radial-gradient(circle at 79% 58%, rgba(255, 255, 255, 0.9) 1.5px, transparent 2.1px),
            radial-gradient(circle at 87% 26%, rgba(255, 255, 255, 0.74) 1px, transparent 1.6px),
            radial-gradient(circle at 95% 68%, rgba(255, 255, 255, 0.92) 1.8px, transparent 2.4px),
            radial-gradient(circle, rgba(255, 255, 255, 0.42) 0.7px, transparent 1px),
            radial-gradient(circle, rgba(255, 255, 255, 0.28) 0.5px, transparent 0.9px);
          background-size: auto, auto, auto, auto, auto, auto, auto, auto, auto, auto, auto, auto, 46px 46px, 73px 73px;
          background-position: center, center, center, center, center, center, center, center, center, center, center, center, 0 0, 23px 14px;
          background-repeat: no-repeat, no-repeat, no-repeat, no-repeat, no-repeat, no-repeat, no-repeat, no-repeat, no-repeat, no-repeat, no-repeat, no-repeat, repeat, repeat;
          opacity: 0.9;
        }
        .topbar::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            radial-gradient(ellipse at 18% 46%, rgba(114, 146, 226, 0.32) 0%, rgba(114, 146, 226, 0) 52%),
            radial-gradient(ellipse at 83% 40%, rgba(170, 112, 204, 0.2) 0%, rgba(170, 112, 204, 0) 56%),
            radial-gradient(circle at 64% 24%, rgba(255, 255, 255, 0.95) 3.4px, rgba(255, 255, 255, 0) 7px),
            radial-gradient(circle at 64% 24%, rgba(255, 255, 255, 0.52) 0.8px, rgba(255, 255, 255, 0) 12px),
            radial-gradient(circle at 91% 32%, rgba(255, 255, 255, 0.88) 2.4px, rgba(255, 255, 255, 0) 6px),
            radial-gradient(circle at 91% 32%, rgba(255, 255, 255, 0.38) 0.9px, rgba(255, 255, 255, 0) 11px),
            radial-gradient(circle at 26% 56%, rgba(255, 255, 255, 0.75) 1.8px, rgba(255, 255, 255, 0) 5px),
            radial-gradient(circle at 26.8% 56%, rgba(15, 23, 42, 0.95) 7.7px, rgba(15, 23, 42, 0.95) 8.8px, rgba(15, 23, 42, 0) 9px),
            radial-gradient(circle at 29.5% 56%, rgba(15, 23, 42, 0.95) 7.5px, rgba(15, 23, 42, 0.95) 8.7px, rgba(15, 23, 42, 0) 8.9px);
          opacity: 0.92;
        }
        .topbar > * {
          position: relative;
          z-index: 2;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          justify-self: start;
        }

        .brandMark {
          width: 44px;
          height: 44px;
          border: 2px solid rgba(255, 255, 255, 0.82);
          border-radius: 50%;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.08);
        }
        .brandMark img {
          width: 84%;
          height: 84%;
          margin: 8%;
          display: block;
          object-fit: contain;
          object-position: center;
          border-radius: 50%;
        }

        .brandMain {
          font-size: 20px;
          letter-spacing: 0.1em;
          line-height: 1;
          font-weight: 700;
          font-family: 'Signika', ui-sans-serif, system-ui;
        }

        .brandSub {
          font-size: 9px;
          letter-spacing: 0.34em;
          margin-top: 2px;
          font-family: 'Signika', ui-sans-serif, system-ui;
        }

        .menu {
          display: flex;
          align-items: center;
          justify-self: center;
          gap: 22px;
        }

        .menu a {
          color: rgba(255, 255, 255, 0.84);
          text-decoration: none;
          font-size: 15px;
          letter-spacing: 0.01em;
        }

        .menuPlaceholder {
          color: rgba(219, 228, 245, 0.82);
          font-size: 13px;
          letter-spacing: 0.01em;
          white-space: nowrap;
        }

        .homeCta {
          display: inline-flex;
          align-items: center;
          justify-self: end;
          text-align: left;
          color: rgba(255, 255, 255, 0.92);
          text-decoration: none;
          font-size: 15px;
          letter-spacing: 0.01em;
          white-space: nowrap;
        }

        .layout {
          height: calc(100vh - 84px);
          margin-top: 84px;
          display: grid;
          grid-template-columns: minmax(560px, 1fr) 410px;
          overflow: hidden;
        }

        .previewPanel {
          display: grid;
          place-items: center;
          padding: 28px;
          min-width: 0;
          overflow: hidden;
        }

        .paper {
          width: min(100%, 960px);
          height: min(82vh, calc(100vh - 150px));
          min-height: 520px;
          display: grid;
          place-items: center;
          border-radius: 24px;
          border: 1px solid rgba(209, 216, 226, 0.9);
          background: rgba(255, 255, 255, 0.78);
          box-shadow: 0 24px 80px rgba(10, 17, 32, 0.14);
          padding: 28px;
          overflow: hidden;
        }

        .svgMount {
          width: 100%;
          height: 100%;
          min-width: 0;
          min-height: 0;
          display: grid;
          place-items: center;
        }

        .svgMount :global(svg) {
          width: auto;
          height: auto;
          max-width: 100%;
          max-height: 100%;
          display: block;
          filter: drop-shadow(0 18px 36px rgba(15, 20, 28, 0.24));
        }

        .rightPanel {
          padding: 28px;
          background: linear-gradient(180deg, #e7ebf1 0%, #dee3ea 100%);
          border-left: 1px solid #cfd6e2;
          display: grid;
          align-content: start;
          gap: 16px;
          overflow-y: auto;
          overflow-x: hidden;
          min-width: 0;
        }

        .panelBlock {
          background: #f7f9fc;
          border: 1px solid #d3dce8;
          border-radius: 16px;
          padding: 16px;
          display: grid;
          gap: 14px;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.07);
          min-width: 0;
        }

        .panelBlock.softA {
          background: #f5f7fb;
          border-color: #d0d8e6;
        }

        .panelBlock.sizeFrameBlock {
          background: #f2f4f7;
          border-color: #d4dae4;
        }

        .panelBlock.softB {
          background: #f8f6fb;
          border-color: #d9d2e8;
        }

        .panelBlock.softC {
          background: #f6faf7;
          border-color: #d2e1d7;
        }

        .panelBlock.softD {
          background: #f4f0f8;
          border-color: #d6cce8;
        }

        .row {
          display: grid;
          grid-template-columns: 86px 1fr;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        label {
          font-size: 14px;
          font-weight: 600;
          color: #1c1f27;
        }

        .fieldGroup {
          display: grid;
          grid-template-columns: 86px 1fr;
          align-items: start;
          gap: 10px;
          min-width: 0;
        }

        .fieldGroup > :last-child {
          min-width: 0;
        }

        .stackField {
          display: grid;
          gap: 8px;
          min-width: 0;
        }

        .palettePicker {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(32px, 1fr));
          gap: 8px;
        }
        .palettePickerWrap {
          display: grid;
          gap: 8px;
        }

        .paletteBtn {
          height: 34px;
          border-radius: 8px;
          border: 1px solid #cbd3df;
          background: #fff;
          padding: 4px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .paletteBtn.active {
          border-color: #2f74ff;
          box-shadow: inset 0 0 0 1px #2f74ff;
        }

        .paletteBtn .swatch {
          position: absolute;
          inset: 4px;
          border-radius: 5px;
        }

        .inkPicker {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .inkBtn {
          min-height: 42px;
          border-radius: 10px;
          border: 1px solid #cbd3df;
          background: #fff;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 10px;
          cursor: pointer;
          color: #1f2937;
          font-size: 13px;
          font-weight: 600;
        }

        .inkBtn.active {
          border-color: #2f74ff;
          box-shadow: inset 0 0 0 1px #2f74ff;
          background: #edf3ff;
        }

        .inkSwatch {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          border: 1px solid rgba(15, 23, 42, 0.25);
          flex: 0 0 auto;
        }

        input,
        textarea,
        select {
          width: 100%;
          max-width: 100%;
          border: 1px solid #cdd2da;
          border-radius: 12px;
          min-height: 44px;
          background: #fff;
          font-size: 13px;
          color: #1a1d23;
          padding: 0 16px;
          outline: none;
        }

        textarea {
          min-height: 96px;
          padding: 14px 16px;
          resize: vertical;
        }

        .dashedInput {
          width: 100%;
          min-height: 46px;
          border-radius: 14px;
          border: 1.5px dashed #747982;
          background: transparent;
          padding: 0 14px;
          font-size: 13px;
          line-height: 1.2;
          color: #4a4f56;
          outline: none;
          font-family: 'Signika', ui-sans-serif, system-ui;
        }

        .typeBtn {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          border: 1.5px dashed #747982;
          background: transparent;
          color: #4a4f56;
          cursor: pointer;
          font-size: 12px;
          border-radius: 14px;
          opacity: 0.6;
          transition: opacity 0.15s;
          font-family: 'Signika', ui-sans-serif, system-ui;
          text-align: left;
        }
        .posterTypeRows {
          display: grid;
          gap: 8px;
        }
        .posterTypeRow {
          display: flex;
          gap: 8px;
          min-width: 0;
        }
        .posterTypeRow--single .typeBtn {
          flex: 0 0 calc(50% - 4px);
          max-width: calc(50% - 4px);
        }
        .typeBtn--active {
          opacity: 1;
          border-style: solid;
          color: #1a1f26;
        }
        .typeBtnImg {
          width: 44px;
          height: 66px;
          border-radius: 6px;
          object-fit: cover;
          flex-shrink: 0;
          display: block;
        }
        .typeBtnImg--galaxy {
          position: relative;
          background:
            radial-gradient(circle at 70% 22%, rgba(255, 255, 255, 0.55) 1px, transparent 2px),
            radial-gradient(circle at 34% 41%, rgba(255, 255, 255, 0.38) 1px, transparent 2px),
            radial-gradient(circle at 52% 66%, rgba(255, 255, 255, 0.46) 1px, transparent 2px),
            linear-gradient(180deg, #1f315d 0%, #192643 65%, #16213a 100%);
          border: 1px solid #2f3d61;
        }
        .typeBtnGalaxyLogo {
          position: absolute;
          left: 12px;
          top: 12px;
          width: 20px;
          height: 14px;
          border: 1.6px solid #ffbe4c;
          border-radius: 2px;
          background: linear-gradient(180deg, rgba(255, 190, 76, 0.35) 0%, rgba(255, 190, 76, 0.12) 100%);
          box-shadow: inset 0 0 0 1px rgba(255, 190, 76, 0.25);
        }
        .typeBtnGalaxyBase {
          position: absolute;
          left: 12px;
          top: 31px;
          width: 20px;
          height: 3px;
          background: #ffbe4c;
          border-radius: 2px;
          box-shadow: 0 5px 0 #ffbe4c;
          opacity: 0.9;
        }
        .typeBtnLabel {
          font-size: 11px;
          line-height: 1.4;
          text-align: left;
        }

        .microHint {
          margin: 0;
          font-size: 12px;
          color: #6d7076;
        }

        .uploadInputHidden {
          display: none;
        }

        .uploadActions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .galaxyBgPreview {
          width: 100%;
          height: 110px;
          border-radius: 10px;
          border: 1px solid #bfc9d7;
          overflow: hidden;
          background: #0f1220;
        }

        .galaxyBgPreview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .companionPreviewWrap {
          display: grid;
          justify-content: center;
          margin-top: 2px;
        }

        .companionPreview {
          position: relative;
          width: ${PHOTO_PREVIEW_SIZE + 28}px;
          height: ${PHOTO_PREVIEW_SIZE + 28}px;
          touch-action: none;
          user-select: none;
        }

        .companionCircle {
          position: absolute;
          left: 14px;
          top: 14px;
          width: ${PHOTO_PREVIEW_SIZE}px;
          height: ${PHOTO_PREVIEW_SIZE}px;
          border-radius: 50%;
          overflow: hidden;
          background: #0f1220;
          cursor: grab;
        }

        .companionPreview.dragging .companionCircle {
          cursor: grabbing;
        }

        .companionImage {
          position: absolute;
          max-width: none;
          max-height: none;
          pointer-events: none;
        }

        .companionPlaceholder {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          color: #9aa3b2;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.03em;
          background: radial-gradient(circle at 30% 20%, #232939 0%, #161c2b 100%);
        }

        .companionRing {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }

        .companionRingInner {
          left: 14px;
          top: 14px;
          width: ${PHOTO_PREVIEW_SIZE}px;
          height: ${PHOTO_PREVIEW_SIZE}px;
          border: 3px solid rgba(255, 255, 255, 0.7);
        }

        .companionRingOuter {
          left: 8px;
          top: 8px;
          width: ${PHOTO_PREVIEW_SIZE + 12}px;
          height: ${PHOTO_PREVIEW_SIZE + 12}px;
          border: 2px solid rgba(255, 255, 255, 0.62);
        }

        .companionZoomControls {
          position: absolute;
          right: -8px;
          top: 50%;
          transform: translateY(-50%);
          display: grid;
          gap: 8px;
        }

        .companionZoomBtn {
          width: 44px;
          height: 44px;
          border: 1px solid #bfc9d7;
          border-radius: 12px;
          background: #fff;
          color: #111827;
          font-size: 26px;
          line-height: 1;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.14);
        }

        .uploadBtn,
        .uploadGhostBtn {
          min-height: 40px;
          border-radius: 10px;
          border: 1px solid #bfc9d7;
          background: #fff;
          color: #1f2937;
          font-size: 13px;
          font-weight: 600;
          padding: 0 12px;
          cursor: pointer;
        }

        .uploadBtn {
          border-color: #2f74ff;
          color: #1844a6;
          background: #eef4ff;
        }

        .uploadBtn:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        .inlineError {
          margin: 0;
          color: #b91c1c;
          font-size: 12px;
        }

        .cityWrap {
          position: relative;
          display: grid;
          grid-template-columns: 1fr 58px;
          gap: 8px;
          min-width: 0;
        }

        .arrowBtn {
          border: 1px solid #cdd2da;
          border-radius: 12px;
          background: #fff;
          display: grid;
          place-items: center;
          cursor: pointer;
          color: #4b5563;
          transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
        }

        .arrowBtn:hover {
          border-color: #b6bfcc;
          background: #f8fafc;
          color: #1f2937;
        }

        .arrowBtn .arrowIcon {
          width: 20px;
          height: 20px;
          fill: currentColor;
          transition: transform 0.18s ease;
        }

        .arrowBtn.open .arrowIcon {
          transform: rotate(180deg);
        }

        .suggestions {
          position: absolute;
          top: 64px;
          left: 0;
          right: 0;
          z-index: 4;
          background: #fff;
          border: 1px solid #cdd2da;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.12);
        }

        .suggestions button {
          width: 100%;
          text-align: left;
          border: 0;
          border-top: 1px solid #eff2f6;
          background: #fff;
          padding: 12px 14px;
          font-size: 13px;
          cursor: pointer;
        }

        .suggestions button:first-child {
          border-top: 0;
        }

        .suggestions button:hover {
          background: #f8fafc;
        }

        .hint {
          margin: 0;
          font-size: 12px;
          color: #6f7481;
          padding-left: 96px;
          line-height: 1.35;
        }

        .toggleLocked {
          border: 1px dashed #b8c3d6;
          border-radius: 12px;
          background: #eef2f9;
          color: #3b4150;
          font-size: 13px;
          font-weight: 600;
          line-height: 1.35;
          padding: 10px 12px;
        }

        .designRoot :global(.toggleRow) {
          width: 100%;
          border: 1px solid #ccd3de;
          border-radius: 12px;
          background: #ffffff;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 500;
          color: #17191f;
          text-align: left;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }

        .designRoot :global(.toggleRow[aria-pressed='true']) {
          border-color: #c8922a;
          background: #fffbf3;
          box-shadow: inset 0 0 0 1px rgba(200, 146, 42, 0.25);
        }

        .designRoot :global(.switch) {
          width: 44px;
          height: 24px;
          border-radius: 999px;
          background: #d7d7d7;
          position: relative;
          transition: background 0.2s ease;
          flex: 0 0 auto;
        }

        .designRoot :global(.switch.on) {
          background: #c8922a;
        }

        .designRoot :global(.knob) {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          position: absolute;
          top: 3px;
          left: 3px;
          transition: transform 0.2s ease;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
        }

        .designRoot :global(.switch.on .knob) {
          transform: translateX(20px);
        }

        .checkoutBtn {
          border: 0;
          border-radius: 12px;
          min-height: 50px;
          font-size: 18px;
          background: #101215;
          color: #fff;
          cursor: pointer;
          margin-top: 6px;
        }

        .checkoutBtn:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        .error {
          margin: 0;
          color: #b91c1c;
          font-size: 13px;
        }

        .confirmOverlay {
          position: fixed;
          inset: 0;
          z-index: 120;
          display: grid;
          place-items: center;
          padding: 24px;
          background: rgba(7, 10, 16, 0.52);
          backdrop-filter: blur(7px);
        }

        .confirmCard {
          width: min(760px, calc(100vw - 32px));
          max-height: min(88vh, 840px);
          overflow: auto;
          background: linear-gradient(180deg, #fdfefe 0%, #f4f7fb 100%);
          border: 1px solid #cfd8e6;
          border-radius: 18px;
          box-shadow: 0 24px 70px rgba(10, 16, 31, 0.35);
          padding: 20px 20px 18px;
        }

        .confirmHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
        }

        .confirmEyebrow {
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 700;
        }

        .confirmHeader h3 {
          margin: 6px 0 4px;
          font-size: 24px;
          line-height: 1.2;
          color: #0f172a;
        }

        .confirmHeader p {
          margin: 0;
          font-size: 13px;
          color: #4b5563;
        }

        .confirmCloseBtn {
          width: 38px;
          height: 38px;
          border-radius: 11px;
          border: 1px solid #c8d2e0;
          background: #ffffff;
          color: #1f2937;
          cursor: pointer;
          font-size: 26px;
          line-height: 1;
          display: grid;
          place-items: center;
        }

        .confirmGrid {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .confirmItem {
          border: 1px solid #d7deea;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 12px;
          padding: 10px 12px;
          display: grid;
          gap: 5px;
        }

        .confirmItem.full {
          grid-column: 1 / -1;
        }

        .confirmItem span {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: #64748b;
        }

        .confirmItem strong {
          font-size: 15px;
          font-weight: 600;
          color: #0f172a;
          line-height: 1.35;
        }

        .confirmValueMultiline {
          white-space: pre-line;
        }

        .confirmActions {
          margin-top: 16px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .confirmBackBtn,
        .confirmApproveBtn {
          min-height: 46px;
          border-radius: 12px;
          padding: 0 16px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid transparent;
        }

        .confirmBackBtn {
          background: #ffffff;
          color: #1f2937;
          border-color: #c8d2e0;
        }

        .confirmApproveBtn {
          background: #101215;
          color: #ffffff;
          border-color: #101215;
        }

        .confirmApproveBtn:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        @media (max-width: 1280px) {
          .layout {
            grid-template-columns: 1fr;
          }

          .rightPanel {
            border-left: 0;
            border-top: 1px solid #d2d5dc;
          }

          .previewPanel {
            min-height: 50vh;
            padding: 18px;
          }

          .paper {
            min-height: 440px;
            height: min(74vh, calc(100vh - 120px));
            padding: 18px;
          }

          .menu {
            gap: 18px;
          }
        }

        @media (max-width: 900px) {
          .topbar {
            height: auto;
            display: grid;
            grid-template-columns: 1fr;
            gap: 14px;
            padding: 12px 14px;
          }

          .menu {
            position: static;
            justify-content: flex-start;
            flex-wrap: wrap;
            gap: 10px 16px;
          }

          .homeCta {
            position: static;
            transform: none;
            justify-self: start;
          }

          .confirmOverlay {
            padding: 14px;
          }

          .confirmCard {
            width: min(760px, calc(100vw - 16px));
            padding: 16px 14px 14px;
            max-height: min(92vh, 860px);
          }

          .confirmGrid {
            grid-template-columns: 1fr;
          }

          .confirmActions {
            flex-direction: column-reverse;
          }

          .confirmBackBtn,
          .confirmApproveBtn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
