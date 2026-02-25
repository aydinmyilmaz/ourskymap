import { clamp01 } from './astro';
import { buildChartGeometry } from './geometry';
import type { PosterRequest } from './types';
import { DateTime } from 'luxon';
import { AstroTime, MoonPhase } from 'astronomy-engine';
import { getFixedVerticalSpacingPx } from './ourskymap-fixed-sizes';

function svgEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function svgAttrEscape(s: string): string {
  return svgEscape(s).replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function envFlagEnabled(v: string | undefined): boolean {
  if (!v) return false;
  return /^(1|true|yes|on)$/i.test(v.trim());
}

function resolvePosterPublicAssetUrl(preferredUrl: string, fallbackUrl: string): string {
  const preferred = preferredUrl.trim();
  const fallback = fallbackUrl.trim() || '/moon_gold.png';
  if (preferred) return preferred;
  return fallback;
}

function resolveMoonPhaseAssetUrl(inkPreset: PosterRequest['poster']['inkPreset'], phaseIndex: number): string {
  const variant = inkPreset === 'silver' ? 'silver' : 'gold';
  // Asset set starts near full-moon frames; shift by half-cycle so astronomical
  // phase index (0=new, ~15=full) lands on the expected visual bucket.
  const normalizedPhaseIndex = ((Math.floor(phaseIndex) % MOON_PHASE_BUCKET_COUNT) + MOON_PHASE_BUCKET_COUNT) % MOON_PHASE_BUCKET_COUNT;
  const assetPhaseIndex = (normalizedPhaseIndex + 15) % MOON_PHASE_BUCKET_COUNT;
  const phaseNumber = assetPhaseIndex + 1;
  return resolvePosterPublicAssetUrl(
    `/moon-phases/${variant}/${phaseNumber}.png`,
    variant === 'silver' ? '/moon_silver.png' : '/moon_gold.png'
  );
}

function moonIlluminatedPath(cx: number, cy: number, r: number, phaseDeg: number, mirrorHorizontal: boolean): string {
  const p = Math.max(0, Math.min(180, phaseDeg));
  const phi = (p * Math.PI) / 180;
  const k = Math.cos(phi);
  const rx = Math.max(0.001, Math.abs(k) * r);
  const sign = k < 0 ? -1 : 1;

  const n = 48;
  const pts: { x: number; y: number }[] = [];
  const mx = mirrorHorizontal ? -1 : 1;
  for (let i = 0; i <= n; i++) {
    const t = (-Math.PI / 2) + (i * Math.PI) / n;
    pts.push({ x: cx + mx * r * Math.cos(t), y: cy + r * Math.sin(t) });
  }
  for (let i = n; i >= 0; i--) {
    const t = (-Math.PI / 2) + (i * Math.PI) / n;
    pts.push({ x: cx + mx * sign * rx * Math.cos(t), y: cy + r * Math.sin(t) });
  }

  const d = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');
  return `${d} Z`;
}

function sunburstPath(cx: number, cy: number, r: number, rays = 12, innerRatio = 0.55): string {
  const pts: string[] = [];
  const n = rays * 2;
  for (let i = 0; i < n; i++) {
    const ang = (i * Math.PI * 2) / n - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * innerRatio;
    const x = cx + rr * Math.cos(ang);
    const y = cy + rr * Math.sin(ang);
    pts.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `M ${pts[0]} L ${pts.slice(1).join(' L ')} Z`;
}

type Palette = {
  bg: string;
  ink: string;
  mutedInk: string;
  accent: string;
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return { r, g, b };
}

function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const toLin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = toLin(rgb.r);
  const g = toLin(rgb.g);
  const b = toLin(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function rgba(rgb: { r: number; g: number; b: number }, a: number): string {
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}

function getPalette(name: PosterRequest['poster']['palette']): Palette {
  switch (name) {
    case 'classic-black':
      return { bg: '#0b0b0d', ink: '#f6f6f7', mutedInk: 'rgba(246,246,247,0.55)', accent: '#f6f6f7' };
    case 'graphite':
      return { bg: '#4a5368', ink: '#f2f4f8', mutedInk: 'rgba(242,244,248,0.42)', accent: '#f2f4f8' };
    case 'deep-navy':
      return { bg: '#09105f', ink: '#f1f4ff', mutedInk: 'rgba(241,244,255,0.42)', accent: '#f1f4ff' };
    case 'royal-blue':
      return { bg: '#365b8e', ink: '#eef4ff', mutedInk: 'rgba(238,244,255,0.42)', accent: '#eef4ff' };
    case 'ocean-teal':
      return { bg: '#2c8d84', ink: '#eefcf9', mutedInk: 'rgba(238,252,249,0.42)', accent: '#eefcf9' };
    case 'mustard-gold':
      return { bg: '#deae00', ink: '#1d1a14', mutedInk: 'rgba(29,26,20,0.36)', accent: '#1d1a14' };
    case 'burnt-orange':
      return { bg: '#d3854f', ink: '#1f1510', mutedInk: 'rgba(31,21,16,0.36)', accent: '#1f1510' };
    case 'terracotta-red':
      return { bg: '#d45745', ink: '#fff4f0', mutedInk: 'rgba(255,244,240,0.44)', accent: '#fff4f0' };
    case 'navy-gold':
      return { bg: '#151c2d', ink: '#f4c25b', mutedInk: 'rgba(244,194,91,0.35)', accent: '#f4c25b' };
    case 'night-gold':
      return { bg: '#24283a', ink: '#fbab29', mutedInk: 'rgba(251,171,41,0.35)', accent: '#fbab29' };
    case 'twilight-blue':
      return { bg: '#1f2a44', ink: '#d7e3ff', mutedInk: 'rgba(215,227,255,0.40)', accent: '#d7e3ff' };
    case 'storm-gray':
      return { bg: '#2a2f39', ink: '#e8e9ee', mutedInk: 'rgba(232,233,238,0.40)', accent: '#e8e9ee' };
    case 'mocha':
      return { bg: '#3b2d2a', ink: '#f2d8c8', mutedInk: 'rgba(242,216,200,0.40)', accent: '#f2d8c8' };
    case 'soft-sage':
      return { bg: '#25352f', ink: '#d8e7de', mutedInk: 'rgba(216,231,222,0.40)', accent: '#d8e7de' };
    case 'blush-night':
      return { bg: '#3a2733', ink: '#f5d7e2', mutedInk: 'rgba(245,215,226,0.40)', accent: '#f5d7e2' };
    case 'cream-ink':
      return { bg: '#fbf5ea', ink: '#1b1b1b', mutedInk: 'rgba(27,27,27,0.35)', accent: '#1b1b1b' };
    case 'slate':
      return { bg: '#111827', ink: '#d9d9d9', mutedInk: 'rgba(217,217,217,0.40)', accent: '#d9d9d9' };
    case 'forest':
      return { bg: '#0e1f16', ink: '#d9d9d9', mutedInk: 'rgba(217,217,217,0.40)', accent: '#d9d9d9' };
    case 'emerald':
      return { bg: '#0b3d2e', ink: '#d9d9d9', mutedInk: 'rgba(217,217,217,0.40)', accent: '#d9d9d9' };
    case 'plum':
      return { bg: '#1c1230', ink: '#d9d9d9', mutedInk: 'rgba(217,217,217,0.40)', accent: '#d9d9d9' };
    case 'burgundy':
      return { bg: '#2a0f1a', ink: '#d9d9d9', mutedInk: 'rgba(217,217,217,0.40)', accent: '#d9d9d9' };
    case 'sand':
      return { bg: '#f7f3e8', ink: '#1b1b1b', mutedInk: 'rgba(27,27,27,0.35)', accent: '#1b1b1b' };
    case 'pearl':
      return { bg: '#f2f0ea', ink: '#202020', mutedInk: 'rgba(32,32,32,0.35)', accent: '#202020' };
    case 'navy-blue':
      return { bg: '#232733', ink: '#ffbe4c', mutedInk: 'rgba(255,190,76,0.35)', accent: '#ffbe4c' };
    case 'gold-black':
      return { bg: '#121212', ink: '#ffbe4c', mutedInk: 'rgba(255,190,76,0.35)', accent: '#ffbe4c' };
    case 'dark-green':
      return { bg: '#1f392c', ink: '#ffbe4c', mutedInk: 'rgba(255,190,76,0.35)', accent: '#ffbe4c' };
    case 'classic-burgundy':
      return { bg: '#4e1d1c', ink: '#ffbe4c', mutedInk: 'rgba(255,190,76,0.35)', accent: '#ffbe4c' };
    case 'deep-teal':
      return { bg: '#2c4d42', ink: '#ffbe4c', mutedInk: 'rgba(255,190,76,0.35)', accent: '#ffbe4c' };
    case 'midnight':
    default:
      return { bg: '#0b1020', ink: '#ffffff', mutedInk: 'rgba(255,255,255,0.40)', accent: '#ffffff' };
  }
}

function getPosterLayout(size: PosterRequest['poster']['size']): {
  width: number;
  height: number;
  layout: 'a4' | 'square';
  defaultChartDiameter: number;
} {
  switch (size) {
    case 'us-letter':
      // W=8.5" → 8.5/16 × 12.8" = 6.8"
      return { width: 612, height: 792, layout: 'a4', defaultChartDiameter: 6.8 * 72 };
    case 'a2':
      // W=1191px=16.54" → 16.54/16 × 12.8" ≈ 13.23"
      return { width: 1191, height: 1684, layout: 'a4', defaultChartDiameter: Math.round((1191 / 72 / 16) * 12.8 * 72) };
    case '18x24':
      // W=18" → 18/16 × 12.8" = 14.4"
      return { width: 18 * 72, height: 24 * 72, layout: 'a4', defaultChartDiameter: 14.4 * 72 };
    case '11x14':
      // W=11" → 11/16 × 12.8" = 8.8" (unchanged)
      return { width: 11 * 72, height: 14 * 72, layout: 'a4', defaultChartDiameter: 8.8 * 72 };
    case 'a3':
      // W=842px=11.69" → 11.69/16 × 12.8" ≈ 9.35" (keep existing close value)
      return { width: 842, height: 1191, layout: 'a4', defaultChartDiameter: (23.7 / 2.54) * 72 };
    case '12x12':
      // Special case: fixed spec value (geometric constraint)
      return { width: 12 * 72, height: 12 * 72, layout: 'square', defaultChartDiameter: 8.6 * 72 };
    case '12x16':
      // W=12" → 12/16 × 12.8" = 9.6" (unchanged)
      return { width: 12 * 72, height: 16 * 72, layout: 'a4', defaultChartDiameter: 9.6 * 72 };
    case '16x20':
      // W=16" → reference → 12.8"
      return { width: 16 * 72, height: 20 * 72, layout: 'square', defaultChartDiameter: 12.8 * 72 };
    case '20x20':
      // Special case: fixed spec value (geometric constraint)
      return { width: 20 * 72, height: 20 * 72, layout: 'square', defaultChartDiameter: 14.3 * 72 };
    case 'a1':
      // W=1701px=23.625" → 23.625/16 × 12.8" ≈ 18.9"
      return {
        width: Math.round((59.4 / 2.54) * 72),
        height: Math.round((84.1 / 2.54) * 72),
        layout: 'a4',
        defaultChartDiameter: Math.round((Math.round((59.4 / 2.54) * 72) / 72 / 16) * 12.8 * 72)
      };
    case '24x32':
      // W=24" → 24/16 × 12.8" = 19.2" (unchanged)
      return { width: 24 * 72, height: 32 * 72, layout: 'a4', defaultChartDiameter: 19.2 * 72 };
    case 'square':
      return { width: 1024, height: 1024, layout: 'square', defaultChartDiameter: 722 };
    case 'a4':
    default:
      // W=595px=8.264" → 8.264/16 × 12.8" ≈ 6.61"
      return { width: 595, height: 842, layout: 'a4', defaultChartDiameter: Math.round((595 / 72 / 16) * 12.8 * 72) };
  }
}

function getDefaultMargin(size: PosterRequest['poster']['size']): number {
  switch (size) {
    case '16x20':
    case '20x20':
      return 72;
    case 'square':
      return 70;
    case 'a2':
      return 96;
    case '18x24':
      return 80;
    case 'us-letter':
      return 46;
    case '11x14':
      return 79.2;
    case 'a3':
      return (4.6 / 2.54) * 72;
    case '12x12':
      return 0.9 * 72;
    case '12x16':
      return 1.2 * 72;
    case 'a1':
      return (10 / 2.54) * 72;
    case '24x32':
      return 2.4 * 72;
    case 'a4':
    default:
      return 48;
  }
}

function getVerticalSpacing(size: PosterRequest['poster']['size'], heightPx: number): {
  topMargin: number;
  bottomMargin: number;
} {
  const fixed = getFixedVerticalSpacingPx(size, 'single');
  if (fixed) return fixed;

  const heightInches = heightPx / 72;

  // Special cases for square formats
  if (size === '12x12') {
    return { topMargin: 0.8 * 72, bottomMargin: 0.8 * 72 };
  }
  if (size === '20x20') {
    return { topMargin: 1.3 * 72, bottomMargin: 1.3 * 72 };
  }

  // General formula: height / 12.5 (currently only applied to 12x12 and 20x20)
  const marginInches = heightInches / 12.5;
  const marginPx = marginInches * 72;

  return { topMargin: marginPx, bottomMargin: marginPx };
}

function getCompanionVerticalSpacing(size: PosterRequest['poster']['size'], shortHeightPx: number): {
  topMargin: number;
  bottomMargin: number;
} {
  const fixed = getFixedVerticalSpacingPx(size, 'companion');
  if (fixed) return fixed;

  const shortHeightInches = shortHeightPx / 72;
  const marginInches =
    size === '12x12' || size === '20x20'
      ? (shortHeightInches / 20) * 3.3
      : (shortHeightInches / 16) * 1.6;
  const marginPx = marginInches * 72;
  return { topMargin: marginPx, bottomMargin: marginPx };
}


function formatCoords(lat: number, lon: number): string {
  const latStr = `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(4)}°${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr} ${lonStr}`;
}

function formatDate(dateUtc: Date, showTime: boolean, timeZone?: string): string {
  const dtUtc = DateTime.fromJSDate(dateUtc, { zone: 'utc' });
  const dt = timeZone ? dtUtc.setZone(timeZone) : dtUtc;
  const m = dt.toFormat('LLLL');
  const d = dt.day;
  const y = dt.year;
  if (!showTime) return `${m} ${d}, ${y}`;
  const hh = dt.toFormat('HH');
  const mm = dt.toFormat('mm');
  const off = dt.toFormat('ZZ'); // "+03:00"
  return `${m} ${d}, ${y}  ${hh}:${mm} (UTC ${off})`;
}

function estimateTextWidth(text: string, fontSize: number, letterSpacing = 0): number {
  let units = 0;
  for (const ch of text) {
    if (ch === ' ') units += 0.32;
    else if ('ilI1|!.,:;'.includes(ch)) units += 0.34;
    else if ('MW@#%&'.includes(ch)) units += 0.95;
    else units += 0.62;
  }
  return units * fontSize + Math.max(0, text.length - 1) * letterSpacing;
}

function wrapTextToWidth(text: string, maxWidth: number, fontSize: number, letterSpacing = 0): string[] {
  const source = text.trim();
  if (!source) return [];
  const words = source.split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const lines: string[] = [];
  let current = '';

  const pushCurrent = () => {
    if (current.trim()) lines.push(current.trim());
    current = '';
  };

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || estimateTextWidth(candidate, fontSize, letterSpacing) <= maxWidth) {
      current = candidate;
      continue;
    }
    pushCurrent();

    if (estimateTextWidth(word, fontSize, letterSpacing) <= maxWidth) {
      current = word;
      continue;
    }

    let chunk = '';
    for (const ch of word) {
      const next = chunk + ch;
      if (!chunk || estimateTextWidth(next, fontSize, letterSpacing) <= maxWidth) {
        chunk = next;
      } else {
        lines.push(chunk);
        chunk = ch;
      }
    }
    current = chunk;
  }

  pushCurrent();
  return lines;
}

const MOON_PHASE_BUCKET_COUNT = 30;
const MOON_PHASE_STEP_DEG = 360 / MOON_PHASE_BUCKET_COUNT;

function normalizeDeg360(v: number): number {
  const n = v % 360;
  return n < 0 ? n + 360 : n;
}

function quantizeMoonPhaseDeg(phaseDegRaw: number): { phaseIndex: number } {
  const raw = normalizeDeg360(phaseDegRaw);
  const phaseIndex = Math.floor((raw + MOON_PHASE_STEP_DEG / 2) / MOON_PHASE_STEP_DEG) % MOON_PHASE_BUCKET_COUNT;
  return { phaseIndex };
}

function renderGalaxyPosterSvg(req: PosterRequest, showRuler: boolean): string {
  const { latitude, longitude, timeUtcIso, locationLabel, params, poster } = req;
  const date = new Date(timeUtcIso);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid timeUtcIso');

  const size = poster.size;
  const layout = getPosterLayout(size);
  const W = layout.width;
  const H = layout.height;
  const geom = buildChartGeometry({ latitude, longitude, date, params, layout: layout.layout });

  const palette = getPalette(poster.palette);
  const inkRgb = hexToRgb(poster.inkColor || '');
  if (inkRgb) {
    palette.ink = `#${poster.inkColor.trim().replace(/^#/, '').toLowerCase()}`;
    palette.accent = palette.ink;
    palette.mutedInk = rgba(inkRgb, 0.42);
  }

  const bgRgb = hexToRgb(palette.bg);
  const effectiveInkRgb = hexToRgb(palette.ink) || inkRgb;
  if (bgRgb && effectiveInkRgb && relativeLuminance(bgRgb) > 0.62 && relativeLuminance(effectiveInkRgb) < 0.45) {
    palette.mutedInk = rgba(effectiveInkRgb, 0.58);
  }

  const layerInk = palette.ink;
  const layerMutedInk = palette.mutedInk;
  const layerAccent = palette.accent;
  const mapLabelHalo = 'rgba(0,0,0,0.55)';
  const mapLabelFont = "'Signika', 'Helvetica Neue', Arial, sans-serif";
  const fontFamily = (k: PosterRequest['poster']['titleFont'] | PosterRequest['poster']['namesFont'] | PosterRequest['poster']['metaFont']) => {
    switch (k) {
      case 'prata':
        return "'Prata', ui-serif, Georgia, 'Times New Roman', serif";
      case 'jimmy-script':
        return "'Allura', 'Great Vibes', cursive, ui-serif, Georgia, 'Times New Roman', serif";
      case 'signika':
        return "'Signika', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      case 'mono':
        return 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      case 'sans':
        return "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      case 'cursive':
        return "'Great Vibes', 'Allura', cursive, ui-serif, Georgia, 'Times New Roman', serif";
      case 'serif':
      default:
        return "ui-serif, Georgia, 'Times New Roman', serif";
    }
  };

  const topAreaY = Math.round(H * 0.665);
  // Galaxy variant: slightly zoom out to expose more sky/stars in top texture area.
  const longEdge = Math.max(W, H);
  // Small poster sizes need extra zoom-out; large sizes stay near base ratio.
  const smallSizeZoomOut = Math.max(0.78, Math.min(1, longEdge / 1728));
  const mapR = longEdge * 0.45 * smallSizeZoomOut;
  const mapCx = W / 2;
  const mapCy = topAreaY * 0.48;
  const boundaryBandTop = topAreaY - 18;
  const boundaryDarkBandH = 40;
  const boundaryPaperBandTop = topAreaY - 6;
  const boundaryPaperBandH = 44;
  const sx = mapR / geom.chartR;
  const sy = mapR / geom.chartR;
  const tx = mapCx - geom.chartCx * sx;
  const ty = mapCy - geom.chartCy * sy;
  const transform = `matrix(${sx.toFixed(6)} 0 0 ${sy.toFixed(6)} ${tx.toFixed(3)} ${ty.toFixed(3)})`;

  const title = (poster.title || '').trim().toUpperCase();
  const subtitle = (poster.subtitle || '').trim();
  const coordsLine = poster.showCoordinates ? formatCoords(latitude, longitude) : '';
  const dateLine = formatDate(date, poster.showTime, req.timeZone);
  const metaTextLines = (poster.metaText || '').trim()
    ? poster.metaText.split('\n').map((l) => l.trim()).filter(Boolean)
    : [locationLabel, ...(coordsLine ? [coordsLine] : []), dateLine];

  const titleFontKey = (poster.titleFont ?? 'serif') as PosterRequest['poster']['titleFont'];
  const namesFontKey = (poster.namesFont ?? 'serif') as PosterRequest['poster']['namesFont'];
  const metaFontKey = (poster.metaFont ?? 'sans') as PosterRequest['poster']['metaFont'];
  const titleFont = Math.max(22, (poster.titleFontSize ?? 40) * 0.68);
  const namesFont = Math.max(15, (poster.namesFontSize ?? 22) * 0.52);
  const metaFont = Math.max(10, (poster.metaFontSize ?? 12) * 0.48);
  const titleLines = title ? wrapTextToWidth(title, W * 0.78, titleFont, 1.4) : [];

  const textBlock: string[] = [];
  let textY = topAreaY + Math.max(56, (H - topAreaY) * 0.34);
  for (const line of titleLines) {
    textBlock.push(
      `<text x="${(W / 2).toFixed(2)}" y="${textY.toFixed(2)}" font-size="${titleFont.toFixed(2)}" fill="#5c6068" text-anchor="middle" letter-spacing="1.4" font-family="${fontFamily(titleFontKey)}">${svgEscape(line)}</text>`
    );
    textY += titleFont * 1.1;
  }
  if (subtitle) {
    textY += 8;
    textBlock.push(
      `<text x="${(W / 2).toFixed(2)}" y="${textY.toFixed(2)}" font-size="${namesFont.toFixed(2)}" fill="#6a7078" text-anchor="middle" font-family="${fontFamily(namesFontKey)}">${svgEscape(subtitle)}</text>`
    );
    textY += namesFont * 1.14;
  }
  textY += 9;
  for (const line of metaTextLines) {
    textBlock.push(
      `<text x="${(W / 2).toFixed(2)}" y="${textY.toFixed(2)}" font-size="${metaFont.toFixed(2)}" fill="#7c8189" text-anchor="middle" font-family="${fontFamily(metaFontKey)}" letter-spacing="0.5">${svgEscape(line.toUpperCase())}</text>`
    );
    textY += metaFont * 1.38;
  }

  const bgImageUrl = poster.backgroundMode === 'image' ? (poster.backgroundImageUrl || '').trim() : '';
  const bgImageLayer = bgImageUrl
    ? `<image href="${svgAttrEscape(bgImageUrl)}" x="0" y="0" width="${W}" height="${topAreaY}" preserveAspectRatio="xMidYMid slice" opacity="1"/>`
    : '';

  const frame = poster.border
    ? `<rect x="28" y="28" width="${(W - 56).toFixed(2)}" height="${(H - 56).toFixed(2)}" fill="none" stroke="#dfdfdf" stroke-width="${Math.max(1.5, poster.borderWidth || 2)}" opacity="0.9"/>`
    : '';

  const ruler = showRuler
    ? `<g id="measurement-ruler-galaxy">
    <line x1="${(W / 2).toFixed(2)}" y1="0" x2="${(W / 2).toFixed(2)}" y2="${H}" stroke="#00FFFF" stroke-width="2" opacity="0.8"/>
    <line x1="0" y1="${topAreaY.toFixed(2)}" x2="${W}" y2="${topAreaY.toFixed(2)}" stroke="#00FFFF" stroke-width="2" opacity="0.8"/>
    <text x="${(W - 16).toFixed(2)}" y="${(H - 18).toFixed(2)}" font-size="12" fill="#00FFFF" text-anchor="end" font-family="monospace" opacity="0.95" stroke="#000" stroke-width="2.2" paint-order="stroke">Galaxy Top: ${(topAreaY / 72).toFixed(3)}"</text>
  </g>`
    : '';

  const widthInches = (W / 72).toFixed(4);
  const heightInches = (H / 72).toFixed(4);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${widthInches}in" height="${heightInches}in" viewBox="0 0 ${W} ${H}" inkscape:export-xdpi="300" inkscape:export-ydpi="300">
  <rect x="0" y="0" width="${W}" height="${H}" fill="${palette.bg}"/>
  <defs>
    <clipPath id="galaxyTopClip">
      <rect x="0" y="0" width="${W}" height="${topAreaY}"/>
    </clipPath>
    <linearGradient id="galaxyBoundaryDarkFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(4,8,15,0.34)"/>
      <stop offset="55%" stop-color="rgba(4,8,15,0.14)"/>
      <stop offset="100%" stop-color="rgba(4,8,15,0)"/>
    </linearGradient>
    <linearGradient id="galaxyBoundaryPaperFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(243,243,241,0)"/>
      <stop offset="58%" stop-color="rgba(243,243,241,0.48)"/>
      <stop offset="100%" stop-color="rgba(243,243,241,0.95)"/>
    </linearGradient>
    <filter id="galaxyBoundaryBlur" x="-5%" y="-60%" width="110%" height="220%">
      <feGaussianBlur stdDeviation="5.2"/>
    </filter>
  </defs>
  <g clip-path="url(#galaxyTopClip)">
    ${bgImageLayer}
    <rect x="0" y="0" width="${W}" height="${topAreaY}" fill="rgba(4,8,15,0.38)"/>
    <g transform="${transform}">
      ${geom.coordinateGridPaths.length
      ? `<path d="${geom.coordinateGridPaths.join(' ')}" fill="none" stroke="${layerMutedInk}" stroke-width="0.9" stroke-linecap="round" opacity="0.80"/>`
      : ''}
      ${geom.linePaths.length ? `<path d="${geom.linePaths.join(' ')}" fill="none" stroke="${layerInk}" stroke-width="${params.constellationLineWidth}" opacity="${params.constellationLineAlpha}" stroke-linecap="round"/>` : ''}
      <g opacity="${clamp01(params.starAlpha)}">
        ${geom.starPoints.map((p) => `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${(Math.sqrt(p.size) * 0.55).toFixed(2)}" fill="${layerInk}"/>`).join('')}
      </g>
      <g opacity="${clamp01(params.vertexAlpha)}">
        ${geom.vertexPoints.map((p) => `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${(Math.sqrt(p.size) * 0.6).toFixed(2)}" fill="${layerInk}"/>`).join('')}
      </g>
      <g>
        ${geom.starLabels
      .map((l) => `<text x="${(l.x + 5).toFixed(2)}" y="${(l.y + 2).toFixed(2)}" font-size="8" fill="${layerMutedInk}" opacity="0.8" stroke="${mapLabelHalo}" stroke-width="2.2" paint-order="stroke" text-anchor="start" dominant-baseline="middle" font-family="${mapLabelFont}">${svgEscape(l.text)}</text>`)
      .join('')}
      </g>
      <g>
        ${geom.constellationLabels
      .map((l) => `<text x="${l.x.toFixed(2)}" y="${l.y.toFixed(2)}" font-size="10" fill="${layerMutedInk}" opacity="0.84" stroke="${mapLabelHalo}" stroke-width="2.8" paint-order="stroke" text-anchor="middle" dominant-baseline="middle" font-family="${mapLabelFont}">${svgEscape(l.text)}</text>`)
      .join('')}
      </g>
    </g>
  </g>
  <rect x="0" y="${topAreaY}" width="${W}" height="${(H - topAreaY).toFixed(2)}" fill="#f3f3f1"/>
  <g filter="url(#galaxyBoundaryBlur)" opacity="0.92">
    <rect x="0" y="${boundaryBandTop}" width="${W}" height="${boundaryDarkBandH}" fill="url(#galaxyBoundaryDarkFade)"/>
    <rect x="0" y="${boundaryPaperBandTop}" width="${W}" height="${boundaryPaperBandH}" fill="url(#galaxyBoundaryPaperFade)"/>
  </g>
  ${textBlock.join('\n  ')}
  ${frame}
  ${ruler}
</svg>`;
}

export function renderPosterSvg(req: PosterRequest): string {
  const { latitude, longitude, timeUtcIso, locationLabel, params, poster } = req;
  const date = new Date(timeUtcIso);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid timeUtcIso');
  const showRuler = typeof poster.showRuler === 'boolean'
    ? poster.showRuler
    : envFlagEnabled(process.env.SHOW_RULER);
  const posterVariant = poster.posterVariant ?? 'classic';
  if (posterVariant === 'galaxy') {
    return renderGalaxyPosterSvg(req, showRuler);
  }

  const size = poster.size;
  const is12x12Layout = size === '12x12';
  const showMoonPhase = !!poster.showMoonPhase;
  const showCompanionPhoto = !!poster.showCompanionPhoto && !!(poster.companionPhotoImageUrl || '').trim();
  const showCompanionCircle = showMoonPhase || showCompanionPhoto;
  let moonPhaseImageUrl = resolveMoonPhaseAssetUrl(poster.inkPreset, 0);

  const companionPhotoUrl = (poster.companionPhotoImageUrl || '').trim();
  const layout = getPosterLayout(size);
  const geom = buildChartGeometry({ latitude, longitude, date, params, layout: layout.layout });

  const palette = getPalette(poster.palette);
  const inkRgb = hexToRgb(poster.inkColor || '');
  if (inkRgb) {
    palette.ink = `#${poster.inkColor.trim().replace(/^#/, '').toLowerCase()}`;
    palette.accent = palette.ink;
    palette.mutedInk = rgba(inkRgb, 0.40);
  }

  // Improve readability on light backgrounds by making "muted" ink less transparent.
  const bgRgb = hexToRgb(palette.bg);
  const effectiveInkRgb = hexToRgb(palette.ink) || inkRgb;
  if (bgRgb && effectiveInkRgb) {
    const bgLum = relativeLuminance(bgRgb);
    const inkLum = relativeLuminance(effectiveInkRgb);
    const bgIsLight = bgLum > 0.62;
    const inkIsDark = inkLum < 0.45;
    if (bgIsLight && inkIsDark) {
      palette.mutedInk = rgba(effectiveInkRgb, 0.58);
    }
  }

  const companionInk = palette.ink;
  const layerInk = palette.ink;
  const layerMutedInk = palette.mutedInk;
  const layerAccent = palette.accent;
  const layerDenseInk = palette.ink;
  const layerSolarStroke = palette.bg;
  const mapLabelHalo = layerSolarStroke;
  const strokeOpacity = '0.9';

  // Poster layout regions
  const margin =
    typeof poster.pageMargin === 'number' && poster.pageMargin > 0
      ? poster.pageMargin
      : showCompanionCircle
        ? ((layout.width > layout.height ? layout.width : layout.height) / 72 / 20) * 1.1 * 72
        : getDefaultMargin(size);
  const marginRight =
    typeof poster.pageMarginRight === 'number' && poster.pageMarginRight > 0
      ? poster.pageMarginRight
      : margin;
  const frameInset = poster.borderInset;
  const borderW = poster.borderWidth;

  // Companion mode: use landscape orientation (long edge horizontal) for better side-by-side layout
  const originalW = layout.width;
  const originalH = layout.height;
  const W = showCompanionCircle && originalH > originalW ? originalH : originalW;
  const H = showCompanionCircle && originalH > originalW ? originalW : originalH;
  const defaultChartDiameter = layout.defaultChartDiameter;
  const chartDiameter = poster.chartDiameter > 0 ? poster.chartDiameter : defaultChartDiameter;
  const ringGapEarly = Math.max(0, poster.ringGap ?? 18);
  const explicitOuterDiameter = typeof poster.chartOuterDiameter === 'number' && poster.chartOuterDiameter > 0
    ? poster.chartOuterDiameter
    : 0;
  // chartDiameter legacy behavior keeps inner diameter; chartOuterDiameter fixes outer diameter directly.
  let outerR = explicitOuterDiameter > 0 ? explicitOuterDiameter / 2 : chartDiameter / 2 + ringGapEarly;
  let chartR = Math.max(1, outerR - ringGapEarly);

  const isSquareTextLayout = size === '12x12' || size === '20x20' || size === 'square';

  let chartCx = W / 2;
  let chartCy: number;

  // Always use spec-defined vertical spacing:
  // companion: updated formula set with short-edge H
  // single: legacy vertical spacing logic
  const verticalSpacing = showCompanionCircle ? getCompanionVerticalSpacing(size, H) : getVerticalSpacing(size, H);
  const { topMargin } = verticalSpacing;
  chartCy = topMargin + outerR;

  let moonCx = 0;
  let moonCy = 0;
  let moonR = 0;
  let moonPhaseBucketIndex = 0;

  if (showCompanionCircle) {
    const { topMargin: compTopMargin, bottomMargin: compBottomMargin } = verticalSpacing;
    const fixedCompanionLayout = explicitOuterDiameter > 0;
    if (fixedCompanionLayout) {
      const explicitMoonDiameter = typeof poster.companionMoonDiameter === 'number' && poster.companionMoonDiameter > 0
        ? poster.companionMoonDiameter
        : chartR * 2;
      moonR = explicitMoonDiameter / 2;
      moonCx = margin + moonR;
      chartCx = W - marginRight - outerR;
      moonCy = compTopMargin + moonR;
      chartCy = compTopMargin + outerR;
    } else {
      const gap = 54;
      const availableHeight = H - compTopMargin - compBottomMargin;
      const topBandHeight = availableHeight * 0.72;
      const maxRByHeight = Math.max(80, (topBandHeight - 18) / 2);
      // Gap ortası = W/2, chart sağ dış kenarı = W-margin kısıtı:
      // chartCx + compOuterR = W-margin → W/2 + compOuterR + gap/2 + compOuterR = W-margin
      // → chartR <= (W/2 - margin - gap/2) / 2 - ringGap
      const maxRByWidthOuter = Math.max(80, (W / 2 - margin - gap / 2) / 2 - ringGapEarly);
      const baseR = Math.max(120, Math.min(chartR, maxRByWidthOuter, maxRByHeight));
      chartR = baseR;
      outerR = chartR + ringGapEarly;
      moonR = chartR;
      const compOuterR = outerR;
      // gap ortası = W/2
      moonCx = W / 2 - moonR - gap / 2;
      chartCx = W / 2 + compOuterR + gap / 2;
      // dikey: her ikisi aynı cy → chart dış çember üstü = topMargin
      const sharedCy = compTopMargin + compOuterR;
      chartCy = sharedCy;
      moonCy = sharedCy;
    }
    if (showMoonPhase) {
      const moonPhaseDegRaw = MoonPhase(new AstroTime(date));
      const q = quantizeMoonPhaseDeg(moonPhaseDegRaw);
      moonPhaseBucketIndex = q.phaseIndex;
      moonPhaseImageUrl = resolveMoonPhaseAssetUrl(poster.inkPreset, q.phaseIndex);
    }
  }

  const title = (poster.title || '').trim();
  const subtitle = (poster.subtitle || '').trim();
  const dedication = (poster.dedication || '').trim();

  const coordsLine = poster.showCoordinates ? formatCoords(latitude, longitude) : '';
  const dateLine = formatDate(date, poster.showTime, req.timeZone);
  const dtUtc = DateTime.fromJSDate(date, { zone: 'utc' });
  const dtLocal = req.timeZone ? dtUtc.setZone(req.timeZone) : dtUtc;
  const utcOffset = `UTC ${dtLocal.toFormat('ZZ')}`;

  const includeAzScale = !!poster.includeAzimuthScale;
  const showCardinals = poster.showCardinals !== false;
  const mapLabelFont = "'Signika', 'Helvetica Neue', Arial, sans-serif";

  // Build azimuth scale for poster (simpler: just outer ring + cardinals)
  const azScale: string[] = [];
  if (includeAzScale) {
    const sinScale = params.mirrorHorizontal ? -1 : 1;
    const clampWidth = (v: number) => Math.max(0, Math.min(20, v));
    const innerR = chartR;
    const outerR = chartR + Math.max(0, poster.ringGap ?? 18);
    azScale.push(
      `<circle cx="${chartCx}" cy="${chartCy}" r="${innerR}" fill="none" stroke="${layerInk}" stroke-width="${clampWidth(poster.ringInnerWidth)}" opacity="${strokeOpacity}"/>`
    );
    azScale.push(
      `<circle cx="${chartCx}" cy="${chartCy}" r="${outerR}" fill="none" stroke="${layerInk}" stroke-width="${clampWidth(poster.ringOuterWidth)}" opacity="${strokeOpacity}"/>`
    );
    if (showCardinals) {
      const cards: [string, number][] = [
        ['N', 0],
        ['E', 90],
        ['S', 180],
        ['W', 270]
      ];
      for (const [lab, az] of cards) {
        const ang = (az * Math.PI) / 180;
        const tx = chartCx + (outerR + 16) * Math.sin(ang) * sinScale;
        const ty = chartCy - (outerR + 16) * Math.cos(ang);
        azScale.push(
          `<text x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" font-size="18" font-weight="700" fill="${layerInk}" text-anchor="middle" dominant-baseline="middle" font-family="${mapLabelFont}">${lab}</text>`
        );
      }
    }
  }

  // Remap geometry coordinates to poster chart circle space.
  const sx = chartR / geom.chartR;
  const sy = chartR / geom.chartR;
  const tx = chartCx - geom.chartCx * sx;
  const ty = chartCy - geom.chartCy * sy;

  const transform = `matrix(${sx.toFixed(6)} 0 0 ${sy.toFixed(6)} ${tx.toFixed(3)} ${ty.toFixed(3)})`;

  const labelFill = layerMutedInk;

  // Optional frame sits 0.4in from page edge (+custom inset).
  const frameEdgeInset = 0.4 * 72 + frameInset;
  const frame = poster.border
    ? `<rect x="${frameEdgeInset}" y="${frameEdgeInset}" width="${W - 2 * frameEdgeInset}" height="${H - 2 * frameEdgeInset}" fill="none" stroke="${layerInk}" stroke-width="${borderW}" opacity="${strokeOpacity}"/>`
    : '';

  const fontFamily = (k: PosterRequest['poster']['titleFont'] | PosterRequest['poster']['namesFont'] | PosterRequest['poster']['metaFont']) => {
    switch (k) {
      case 'prata':
        return "'Prata', ui-serif, Georgia, 'Times New Roman', serif";
      case 'jimmy-script':
        return "'Allura', 'Great Vibes', cursive, ui-serif, Georgia, 'Times New Roman', serif";
      case 'signika':
        return "'Signika', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      case 'mono':
        return 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      case 'sans':
        return "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      case 'cursive':
        return "'Great Vibes', 'Allura', cursive, ui-serif, Georgia, 'Times New Roman', serif";
      case 'serif':
      default:
        return "ui-serif, Georgia, 'Times New Roman', serif";
    }
  };

  // Three-section text layout under the chart:
  // 1) Title
  // 2) Names (subtitle + optional dedication lines)
  // 3) Meta (location + date/time + optional coords)
  const namesLines = [subtitle, dedication]
    .join('\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const defaultMetaTextLines: string[] = [];
  defaultMetaTextLines.push(locationLabel);
  if (coordsLine) defaultMetaTextLines.push(coordsLine);
  defaultMetaTextLines.push(dateLine);

  // metaText is treated as literal, user-edited content.
  const metaTextLines: string[] = (poster.metaText || '').trim()
    ? poster.metaText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
    : defaultMetaTextLines;

  const scale = 1.0;
  const titleFontKey = (poster.titleFont ?? 'serif') as PosterRequest['poster']['titleFont'];
  const namesFontKey = (poster.namesFont ?? 'serif') as PosterRequest['poster']['namesFont'];
  const metaFontKey = (poster.metaFont ?? 'sans') as PosterRequest['poster']['metaFont'];
  const requestedTitleFont = Math.max(10, (poster.titleFontSize ?? 40) * scale);
  const requestedNamesFont = Math.max(10, (poster.namesFontSize ?? 22) * scale);
  const requestedMetaFont = Math.max(10, (poster.metaFontSize ?? 12) * scale);
  let titleFont = requestedTitleFont;
  let namesFont = requestedNamesFont;
  let metaFont = requestedMetaFont;
  const metaFontWeight = poster.metaFontWeight ?? 500;
  const metaLetterSpacing = poster.metaLetterSpacing ?? 0;
  const metaLineSpacing = poster.metaLineSpacing ?? 1.35;
  const metaUppercase = !!poster.metaUppercase;

  const minTitleFont = 18;
  const minNamesFont = 12;
  const minMetaFont = 10;
  // TR: Baslik genislik siniri (sayfa genisligine gore oran).
  // EN: Title max width ratio relative to page width.
  const TITLE_PAGE_WIDTH_RATIO = 0.80;

  // TR: Baslik genislik siniri (yildiz haritasi capina gore oran).
  // EN: Title max width ratio relative to chart diameter.
  const TITLE_CHART_DIAMETER_RATIO = 0.96;
  const titleLetterSpacing = 2;
  const titleMaxWidth = showCompanionCircle
    ? Math.max(40, W * 0.75)
    : Math.max(
      40,
      Math.max(W * TITLE_PAGE_WIDTH_RATIO, chartDiameter * TITLE_CHART_DIAMETER_RATIO)
    );
  const makeTitleLines = () => wrapTextToWidth(title.toUpperCase(), titleMaxWidth, titleFont, titleLetterSpacing);
  let titleLines = title ? makeTitleLines() : [];

  // companion: chart dış çemberi (compOuterR) ve moon (moonR) en üst/alt kenarlar
  // normal: outerR (dış çember)
  const compOuterRRef = showCompanionCircle ? chartR + ringGapEarly : 0;
  const topVisualTop = showCompanionCircle ? Math.min(chartCy - compOuterRRef, moonCy - moonR) : chartCy - outerR;
  const topVisualBottom = showCompanionCircle ? Math.max(chartCy + compOuterRRef, moonCy + moonR) : chartCy + outerR;
  // Companion uses a slightly tighter but still safe visual gap so fixed font presets shrink less often.
  // Single mode keeps proportional spacing based on chart radius.
  const minTextGap = showCompanionCircle ? 28 : Math.round(outerR * 0.12);
  const regionTop = topVisualBottom + minTextGap;

  // Her iki modda da spec-defined bottom margin
  const regionBottom = H - verticalSpacing.bottomMargin;

  const regionH = Math.max(0, regionBottom - regionTop);

  const titleLineHeight = () => titleFont * (is12x12Layout ? 1.06 : 1.12);
  const namesLineHeight = () => namesFont * (is12x12Layout ? 1.11 : 1.18);
  const effectiveMetaLineSpacing = is12x12Layout ? Math.max(1.15, metaLineSpacing - 0.12) : metaLineSpacing;
  const metaLineHeight = () => metaFont * effectiveMetaLineSpacing;

  const gap1 = is12x12Layout ? 10 : showCompanionCircle ? 8 : 14;
  const gap2 = is12x12Layout ? 10 : showCompanionCircle ? 10 : 16;
  const textBlockYOffset = is12x12Layout ? -20 : 0;

  const calcNeeded = () => {
    let h = 0;
    if (titleLines.length) h += titleLines.length * titleLineHeight();
    if (namesLines.length) h += (titleLines.length ? gap1 : 0) + namesLines.length * namesLineHeight();
    if (metaTextLines.length) h += ((titleLines.length || namesLines.length) ? gap2 : 0) + metaTextLines.length * metaLineHeight();
    return h;
  };

  for (let i = 0; i < 40 && calcNeeded() > regionH; i++) {
    if (titleFont > minTitleFont) titleFont -= 1.5;
    if (namesFont > minNamesFont) namesFont -= 1.0;
    if (metaFont > minMetaFont) metaFont -= 0.8;
    titleLines = title ? makeTitleLines() : [];
    if (titleFont <= minTitleFont && namesFont <= minNamesFont && metaFont <= minMetaFont) break;
  }

  const textBlock: string[] = [];
  const neededH = calcNeeded();
  // Text bloğu regionBottom'a yaslanır: textBottom = regionBottom → bottomMargin spec'e uyar
  const bottomAlignedStart = regionBottom - neededH;
  const balancedStart = H - topVisualTop - neededH;
  const maxStart = regionBottom - neededH;
  const companionStart = Math.max(regionTop, Math.min(maxStart, balancedStart));
  let y = showCompanionCircle ? companionStart : bottomAlignedStart;
  const textBlockStartY = y;

  if (titleLines.length) {
    for (const line of titleLines) {
      y += titleLineHeight();
      textBlock.push(
        `<text x="${W / 2}" y="${y.toFixed(2)}" font-size="${titleFont.toFixed(2)}" fill="${layerAccent}" text-anchor="middle" letter-spacing="${titleLetterSpacing}" font-family="${fontFamily(titleFontKey)}">${svgEscape(line)}</text>`
      );
    }
  }

  if (namesLines.length) {
    y += titleLines.length ? gap1 : 0;
    for (const line of namesLines) {
      y += namesLineHeight();
      textBlock.push(
        `<text x="${W / 2}" y="${y.toFixed(2)}" font-size="${namesFont.toFixed(2)}" fill="${layerAccent}" text-anchor="middle" font-family="${fontFamily(namesFontKey)}">${svgEscape(line)}</text>`
      );
    }
  }

  const metaLines: string[] = [];
  if (metaTextLines.length) {
    y += (titleLines.length || namesLines.length) ? gap2 : 0;
    for (const line of metaTextLines) {
      y += metaLineHeight();
      const txt = metaUppercase ? line.toUpperCase() : line;
      metaLines.push(
        `<text x="${W / 2}" y="${y.toFixed(2)}" font-size="${metaFont.toFixed(2)}" fill="${layerInk}" opacity="${strokeOpacity}" text-anchor="middle" font-family="${fontFamily(metaFontKey)}" font-weight="${metaFontWeight}" letter-spacing="${metaLetterSpacing}">${svgEscape(txt)}</text>`
      );
    }
  }

  const innerRingStroke = includeAzScale ? Math.max(0, poster.ringInnerWidth ?? 0) : 0;
  const starSafeInset = innerRingStroke > 0 ? innerRingStroke / 2 + 1.25 : 0;
  const starSafeRadius = Math.max(0, chartR - starSafeInset);

  const isPointInsideStarSafeRadius = (x: number, y: number, pointRadius: number): boolean => {
    const px = x * sx + tx;
    const py = y * sy + ty;
    const dx = px - chartCx;
    const dy = py - chartCy;
    const safeR = Math.max(0, starSafeRadius - pointRadius);
    return dx * dx + dy * dy <= safeR * safeR;
  };

  const visibleStarPoints = geom.starPoints.filter((p) => {
    const pointRadius = Math.sqrt(p.size) * 0.55 * sx + 0.35;
    return isPointInsideStarSafeRadius(p.x, p.y, pointRadius);
  });
  const visibleVertexPoints = geom.vertexPoints.filter((p) => {
    const pointRadius = Math.sqrt(p.size) * 0.6 * sx + 0.35;
    return isPointInsideStarSafeRadius(p.x, p.y, pointRadius);
  });

  const chartLayer = `<g clip-path="url(#clipCircle)">
    <g transform="${transform}">
      ${geom.coordinateGridPaths.length
      ? `<path d="${geom.coordinateGridPaths.join(' ')}" fill="none" stroke="${layerMutedInk}" stroke-width="0.9" stroke-linecap="round" opacity="0.85"/>`
      : ''
    }
      ${geom.eclipticPoints.length > 2 ? `<polyline points="${geom.eclipticPoints.join(' ')}" fill="none" stroke="${layerInk}" stroke-width="1" stroke-dasharray="7 7" opacity="${params.eclipticAlpha}"/>` : ''}
      ${geom.linePaths.length ? `<path d="${geom.linePaths.join(' ')}" fill="none" stroke="${layerInk}" stroke-width="${params.constellationLineWidth}" opacity="${params.constellationLineAlpha}" stroke-linecap="round"/>` : ''}
      <g opacity="${clamp01(params.starAlpha)}">
        ${visibleStarPoints.map((p) => `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${(Math.sqrt(p.size) * 0.55).toFixed(2)}" fill="${layerDenseInk}"/>`).join('')}
      </g>
      <g opacity="${clamp01(params.vertexAlpha)}">
        ${visibleVertexPoints.map((p) => `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${(Math.sqrt(p.size) * 0.6).toFixed(2)}" fill="${layerDenseInk}"/>`).join('')}
      </g>
      <g>
        ${geom.solarSystem.length
      ? geom.solarSystem
        .map((o) => {
          const stroke = layerSolarStroke;
          if (o.kind === 'sun') {
            const p = sunburstPath(o.x, o.y, o.r * 1.15, 12, 0.52);
            const fill = layerInk;
            return [
              `<path d="${p}" fill="${fill}" stroke="${stroke}" stroke-width="1.2" stroke-linejoin="round" opacity="0.95"/>`,
              `<circle cx="${o.x.toFixed(2)}" cy="${o.y.toFixed(2)}" r="${(o.r * 0.45).toFixed(2)}" fill="${fill}" stroke="${stroke}" stroke-width="1.2" opacity="0.95"/>`,
              params.labelSolarSystem
                ? `<text x="${(o.x + o.r + 4).toFixed(2)}" y="${(o.y + 2).toFixed(2)}" font-size="10" fill="${layerInk}" opacity="0.75" stroke="${mapLabelHalo}" stroke-width="2.4" paint-order="stroke" text-anchor="start" dominant-baseline="middle" font-family="${mapLabelFont}">${svgEscape(o.label)}</text>`
                : ''
            ].join('');
          }
          if (o.kind === 'moon' && typeof o.moonPhaseDeg === 'number') {
            const fill = layerInk;
            const phase = o.moonPhaseDeg <= 180 ? o.moonPhaseDeg : 360 - o.moonPhaseDeg;
            const rot = typeof o.limbAngleDeg === 'number' && Number.isFinite(o.limbAngleDeg) ? o.limbAngleDeg : 0;
            const path = phase >= 0.6 && phase <= 179.4 ? moonIlluminatedPath(o.x, o.y, o.r, phase, false) : '';
            return [
              `<circle cx="${o.x.toFixed(2)}" cy="${o.y.toFixed(2)}" r="${o.r.toFixed(2)}" fill="none" stroke="${stroke}" stroke-width="1.2" opacity="0.95"/>`,
              `<g transform="rotate(${rot.toFixed(2)} ${o.x.toFixed(2)} ${o.y.toFixed(2)})">`,
              phase > 179.4
                ? `<circle cx="${o.x.toFixed(2)}" cy="${o.y.toFixed(2)}" r="${o.r.toFixed(2)}" fill="${fill}" opacity="0.95"/>`
                : phase < 0.6
                  ? ''
                  : `<path d="${path}" fill="${fill}" opacity="0.95"/>`,
              `</g>`,
              params.labelSolarSystem
                ? `<text x="${(o.x + o.r + 4).toFixed(2)}" y="${(o.y + 2).toFixed(2)}" font-size="10" fill="${layerInk}" opacity="0.75" stroke="${mapLabelHalo}" stroke-width="2.4" paint-order="stroke" text-anchor="start" dominant-baseline="middle" font-family="${mapLabelFont}">${svgEscape(o.label)}</text>`
                : ''
            ].join('');
          }
          const fill = o.kind === 'moon' ? layerMutedInk : layerInk;
          return [
            `<circle cx="${o.x.toFixed(2)}" cy="${o.y.toFixed(2)}" r="${o.r.toFixed(2)}" fill="${fill}" stroke="${stroke}" stroke-width="1.2" opacity="0.95"/>`,
            params.labelSolarSystem
              ? `<text x="${(o.x + o.r + 4).toFixed(2)}" y="${(o.y + 2).toFixed(2)}" font-size="10" fill="${layerInk}" opacity="0.75" stroke="${mapLabelHalo}" stroke-width="2.4" paint-order="stroke" text-anchor="start" dominant-baseline="middle" font-family="${mapLabelFont}">${svgEscape(o.label)}</text>`
              : ''
          ].join('');
        })
        .join('')
      : ''
    }
      </g>
      <g>
        ${geom.deepSky.length
      ? geom.deepSky
        .map((d) => {
          const fill = layerMutedInk;
          const s = 4.2;
          const marker =
            d.kind === 'cluster'
              ? `<rect x="${(d.x - s / 2).toFixed(2)}" y="${(d.y - s / 2).toFixed(2)}" width="${s.toFixed(2)}" height="${s.toFixed(2)}" fill="none" stroke="${fill}" stroke-width="1.1" opacity="0.8"/>`
              : d.kind === 'globular'
                ? `<circle cx="${d.x.toFixed(2)}" cy="${d.y.toFixed(2)}" r="${(s / 2).toFixed(2)}" fill="none" stroke="${fill}" stroke-width="1.1" opacity="0.8"/>`
                : `<path d="M ${(d.x).toFixed(2)} ${(d.y - s / 2).toFixed(2)} L ${(d.x + s / 2).toFixed(2)} ${(d.y).toFixed(2)} L ${(d.x).toFixed(2)} ${(d.y + s / 2).toFixed(2)} L ${(d.x - s / 2).toFixed(2)} ${(d.y).toFixed(2)} Z" fill="none" stroke="${fill}" stroke-width="1.1" opacity="0.8"/>`;

          const label = params.labelDeepSky
            ? `<text x="${(d.x + 6).toFixed(2)}" y="${(d.y + 2).toFixed(2)}" font-size="9" fill="${layerMutedInk}" opacity="0.75" stroke="${mapLabelHalo}" stroke-width="2.1" paint-order="stroke" text-anchor="start" dominant-baseline="middle" font-family="${mapLabelFont}">${svgEscape(d.label)}</text>`
            : '';
          return `${marker}${label}`;
        })
        .join('')
      : ''
    }
      </g>
      <g>
        ${geom.starLabels
      .map((l) => `<text x="${(l.x + 5).toFixed(2)}" y="${(l.y + 2).toFixed(2)}" font-size="8" fill="${labelFill}" opacity="0.78" stroke="${mapLabelHalo}" stroke-width="2.2" paint-order="stroke" text-anchor="start" dominant-baseline="middle" font-family="${mapLabelFont}">${svgEscape(l.text)}</text>`)
      .join('')}
      </g>
      <g>
        ${geom.constellationLabels
      .map((l) => `<text x="${l.x.toFixed(2)}" y="${l.y.toFixed(2)}" font-size="10" fill="${labelFill}" opacity="0.85" stroke="${mapLabelHalo}" stroke-width="2.8" paint-order="stroke" text-anchor="middle" dominant-baseline="middle" font-family="${mapLabelFont}">${svgEscape(l.text)}</text>`)
      .join('')}
      </g>
    </g>
  </g>`;

  // Add DPI metadata for print-ready files (300 DPI standard)
  const widthInches = (W / 72).toFixed(4);
  const heightInches = (H / 72).toFixed(4);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${widthInches}in" height="${heightInches}in" viewBox="0 0 ${W} ${H}" inkscape:export-xdpi="300" inkscape:export-ydpi="300">
  <rect x="0" y="0" width="${W}" height="${H}" fill="${palette.bg}"/>
  ${frame}
  <defs>
    <clipPath id="clipCircle">
      <circle cx="${chartCx}" cy="${chartCy}" r="${chartR}"/>
    </clipPath>
    <clipPath id="rulerDiaClip">
      <circle cx="${chartCx}" cy="${chartCy}" r="${outerR}"/>
    </clipPath>
    ${showCompanionCircle
      ? `<clipPath id="moonClip"><circle cx="${moonCx}" cy="${moonCy}" r="${moonR}"/></clipPath>
    <filter id="moonDropShadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="${Math.max(2, moonR * 0.02).toFixed(2)}" stdDeviation="${Math.max(2.5, moonR * 0.02).toFixed(2)}" flood-color="#000000" flood-opacity="0.32"/>
    </filter>`
      : ''
    }
  </defs>
  ${chartLayer}
  ${showCompanionCircle
      ? showCompanionPhoto
        ? `<g>
    <g filter="url(#moonDropShadow)">
      <circle cx="${moonCx}" cy="${moonCy}" r="${moonR}" fill="rgba(0,0,0,0.48)"/>
      <image href="${svgAttrEscape(companionPhotoUrl)}" x="${(moonCx - moonR).toFixed(2)}" y="${(moonCy - moonR).toFixed(2)}" width="${(moonR * 2).toFixed(2)}" height="${(moonR * 2).toFixed(2)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#moonClip)" opacity="1"/>
    </g>
  </g>`
        : `<g>
    <image href="${svgAttrEscape(moonPhaseImageUrl)}" x="${(moonCx - moonR).toFixed(2)}" y="${(moonCy - moonR).toFixed(2)}" width="${(moonR * 2).toFixed(2)}" height="${(moonR * 2).toFixed(2)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#moonClip)" data-moon-phase-index="${moonPhaseBucketIndex}"/>
  </g>`
      : ''
    }
  
  ${azScale.join('\n  ')}
  ${textBlock.join('\n  ')}
  ${metaLines.join('\n  ')}
  ${showRuler ? (() => {
    const cx = W / 2;   // horizontal center (0 point for horizontal ruler)
    const cy = H / 2;   // vertical center (0 point for vertical ruler)
    const stepsV = Math.ceil((H / 2) / 7.2);  // steps from center to edge (up & down)
    const stepsH = Math.ceil((W / 2) / 7.2);  // steps from center to edge (left & right)

    const vTicks = Array.from({ length: stepsV * 2 + 1 }, (_, i) => {
      const step = i - stepsV;  // negative = above center, positive = below
      const y = cy + step * 7.2;
      if (y < 0 || y > H) return '';
      const absStep = Math.abs(step);
      const isWholeInch = absStep % 10 === 0;
      const isHalfInch = absStep % 5 === 0 && !isWholeInch;
      const tickLen = isWholeInch ? 32 : isHalfInch ? 20 : 8;
      const inchVal = (absStep / 10).toFixed(absStep % 10 === 0 ? 0 : 1);
      const sign = step < 0 ? '-' : step > 0 ? '+' : '';
      const label = (isWholeInch || isHalfInch) ? `${sign}${inchVal}"` : '';
      return `
    <line x1="${(cx - tickLen).toFixed(2)}" y1="${y.toFixed(2)}" x2="${(cx + tickLen).toFixed(2)}" y2="${y.toFixed(2)}" stroke="${isWholeInch ? '#FF4444' : isHalfInch ? '#FFDD00' : '#00FFFF'}" stroke-width="${isWholeInch ? 3 : isHalfInch ? 2 : 1}" opacity="1"/>
    ${label ? `<text x="${(cx + tickLen + 5).toFixed(2)}" y="${(y + 5).toFixed(2)}" font-size="${isWholeInch ? 16 : 13}" fill="${isWholeInch ? '#FF4444' : '#FFDD00'}" font-family="monospace" font-weight="bold" opacity="1" stroke="#000" stroke-width="3" paint-order="stroke">${label}</text>` : ''}`;
    }).join('');

    const hTicks = Array.from({ length: stepsH * 2 + 1 }, (_, i) => {
      const step = i - stepsH;  // negative = left of center, positive = right
      const x = cx + step * 7.2;
      if (x < 0 || x > W) return '';
      const absStep = Math.abs(step);
      const isWholeInch = absStep % 10 === 0;
      const isHalfInch = absStep % 5 === 0 && !isWholeInch;
      const tickLen = isWholeInch ? 32 : isHalfInch ? 20 : 8;
      const inchVal = (absStep / 10).toFixed(absStep % 10 === 0 ? 0 : 1);
      const sign = step < 0 ? '-' : step > 0 ? '+' : '';
      const label = (isWholeInch || isHalfInch) ? `${sign}${inchVal}"` : '';
      return `
    <line x1="${x.toFixed(2)}" y1="${(cy - tickLen).toFixed(2)}" x2="${x.toFixed(2)}" y2="${(cy + tickLen).toFixed(2)}" stroke="${isWholeInch ? '#FF4444' : isHalfInch ? '#FFDD00' : '#00FFFF'}" stroke-width="${isWholeInch ? 3 : isHalfInch ? 2 : 1}" opacity="1"/>
    ${label ? `<text x="${(x - 14).toFixed(2)}" y="${(cy + tickLen + 16).toFixed(2)}" font-size="${isWholeInch ? 16 : 13}" fill="${isWholeInch ? '#FF4444' : '#FFDD00'}" font-family="monospace" font-weight="bold" opacity="1" stroke="#000" stroke-width="3" paint-order="stroke">${label}</text>` : ''}`;
    }).join('');

    const visTopR = outerR;                                   // final outer ring radius
    const chartTopIn   = (chartCy - visTopR) / 72;           // page top → görsel üst kenar
    const chartBotIn   = (chartCy + visTopR) / 72;           // page top → görsel alt kenar
    const chartDiamIn  = (2 * visTopR) / 72;                 // visible chart diameter
    const requestedChartDiamIn = (explicitOuterDiameter > 0 ? explicitOuterDiameter : chartDiameter + 2 * ringGapEarly) / 72;
    const hasDiaDiff = Math.abs(chartDiamIn - requestedChartDiamIn) > 0.001;
    const diaLeftX = chartCx - visTopR;
    const diaRightX = chartCx + visTopR;
    const diaRulerColor = '#00FFFF';
    const quarterInPx = 72 / 4;
    const diaTickSteps = Math.floor((diaRightX - diaLeftX) / quarterInPx);
    const diaTicks = Array.from({ length: diaTickSteps + 1 }, (_, i) => {
      const x = diaLeftX + i * quarterInPx;
      const isWholeInch = i % 4 === 0;
      const isHalfInch = i % 2 === 0 && !isWholeInch;
      const tickLen = isWholeInch ? 16 : isHalfInch ? 11 : 7;
      const label = isWholeInch ? `${(i / 4).toFixed(0)}"` : '';
      return `
    <line x1="${x.toFixed(2)}" y1="${(chartCy - tickLen).toFixed(2)}" x2="${x.toFixed(2)}" y2="${(chartCy + tickLen).toFixed(2)}" stroke="${diaRulerColor}" stroke-width="${isWholeInch ? 2 : 1.4}" opacity="0.95"/>
    ${label ? `<text x="${x.toFixed(2)}" y="${(chartCy - tickLen - 6).toFixed(2)}" font-size="11" fill="${diaRulerColor}" font-family="monospace" text-anchor="middle" opacity="0.95" stroke="#000" stroke-width="2" paint-order="stroke">${label}</text>` : ''}`;
    }).join('');
  const fontDebugX = W - 18;
  const fontDebugLineH = 18;
  const hasFontShrink =
    Math.abs(titleFont - requestedTitleFont) > 0.001 ||
    Math.abs(namesFont - requestedNamesFont) > 0.001 ||
    Math.abs(metaFont - requestedMetaFont) > 0.001;
  const fontDebugY = H - (fontDebugLineH * 5 + 14);
  const diaDebugY = fontDebugY - fontDebugLineH;
  const textBottomPx = textBlockStartY + neededH;           // actual last text line
  const textBotFromPageBotIn = (H - textBottomPx) / 72;    // text bottom → page bottom

    return `<!-- Measurement Ruler Overlay (SHOW_RULER=true) -->
  <g id="measurement-ruler">
    <line x1="${cx}" y1="0" x2="${cx}" y2="${H}" stroke="#00FFFF" stroke-width="2" opacity="0.85"/>
    <line x1="0" y1="${cy}" x2="${W}" y2="${cy}" stroke="#00FFFF" stroke-width="2" opacity="0.85"/>
    ${vTicks}
    ${hTicks}
    <!-- Chart top: page top → görsel üst kenar -->
    <line x1="${(cx - 60).toFixed(2)}" y1="${(chartCy - visTopR).toFixed(2)}" x2="${(cx + 60).toFixed(2)}" y2="${(chartCy - visTopR).toFixed(2)}" stroke="#00FF44" stroke-width="3" opacity="1"/>
    <text x="${(cx + 66).toFixed(2)}" y="${(chartCy - visTopR + 6).toFixed(2)}" font-size="16" fill="#00FF44" font-family="monospace" font-weight="bold" opacity="1" stroke="#000" stroke-width="3" paint-order="stroke">TOP: ${chartTopIn.toFixed(3)}"</text>
    <!-- Chart bottom: görsel alt kenar -->
    <line x1="${(cx - 60).toFixed(2)}" y1="${(chartCy + visTopR).toFixed(2)}" x2="${(cx + 60).toFixed(2)}" y2="${(chartCy + visTopR).toFixed(2)}" stroke="#FFAA00" stroke-width="2" opacity="1"/>
    <text x="${(cx + 66).toFixed(2)}" y="${(chartCy + visTopR + 6).toFixed(2)}" font-size="14" fill="#FFAA00" font-family="monospace" font-weight="bold" opacity="1" stroke="#000" stroke-width="3" paint-order="stroke">chart-bot: ${chartBotIn.toFixed(3)}"</text>
    <!-- Chart diameter (white): sol kenar ↔ sag kenar (clip: dis cember) -->
    <g clip-path="url(#rulerDiaClip)">
      <line x1="${diaLeftX.toFixed(2)}" y1="${chartCy.toFixed(2)}" x2="${diaRightX.toFixed(2)}" y2="${chartCy.toFixed(2)}" stroke="${diaRulerColor}" stroke-width="2.5" opacity="1"/>
      ${diaTicks}
      <line x1="${diaLeftX.toFixed(2)}" y1="${(chartCy - 16).toFixed(2)}" x2="${diaLeftX.toFixed(2)}" y2="${(chartCy + 16).toFixed(2)}" stroke="${diaRulerColor}" stroke-width="2.2" opacity="1"/>
      <line x1="${diaRightX.toFixed(2)}" y1="${(chartCy - 16).toFixed(2)}" x2="${diaRightX.toFixed(2)}" y2="${(chartCy + 16).toFixed(2)}" stroke="${diaRulerColor}" stroke-width="2.2" opacity="1"/>
    </g>
    <!-- Font sizes -->
    <text x="${fontDebugX}" y="${diaDebugY}" font-size="12" fill="${hasDiaDiff ? '#FFAA00' : diaRulerColor}" font-family="monospace" text-anchor="end" opacity="0.95" stroke="#000" stroke-width="2.4" paint-order="stroke">${hasDiaDiff ? `DIA req/app: ${requestedChartDiamIn.toFixed(3)}" -> ${chartDiamIn.toFixed(3)}"` : `DIA: ${chartDiamIn.toFixed(3)}"`}</text>
    <text x="${fontDebugX}" y="${fontDebugY}" font-size="13" fill="#FFFFFF" font-family="monospace" font-weight="700" text-anchor="end" opacity="0.95" stroke="#000" stroke-width="3" paint-order="stroke">FONT SIZES</text>
    <text x="${fontDebugX}" y="${(fontDebugY + fontDebugLineH).toFixed(2)}" font-size="12" fill="${hasFontShrink ? '#FFAA00' : '#8CFF9F'}" font-family="monospace" text-anchor="end" opacity="0.95" stroke="#000" stroke-width="2.4" paint-order="stroke">Shrink: ${hasFontShrink ? 'YES' : 'NO'}</text>
    ${hasFontShrink ? `<text x="${fontDebugX}" y="${(fontDebugY + fontDebugLineH * 2).toFixed(2)}" font-size="12" fill="#FFFFFF" font-family="monospace" text-anchor="end" opacity="0.95" stroke="#000" stroke-width="2.4" paint-order="stroke">Title req/app: ${requestedTitleFont.toFixed(2)} -> ${titleFont.toFixed(2)}px</text>` : `<text x="${fontDebugX}" y="${(fontDebugY + fontDebugLineH * 2).toFixed(2)}" font-size="12" fill="#FFFFFF" font-family="monospace" text-anchor="end" opacity="0.95" stroke="#000" stroke-width="2.4" paint-order="stroke">Title: ${titleFont.toFixed(2)}px</text>`}
    ${hasFontShrink ? `<text x="${fontDebugX}" y="${(fontDebugY + fontDebugLineH * 3).toFixed(2)}" font-size="12" fill="#FFFFFF" font-family="monospace" text-anchor="end" opacity="0.95" stroke="#000" stroke-width="2.4" paint-order="stroke">Names req/app: ${requestedNamesFont.toFixed(2)} -> ${namesFont.toFixed(2)}px</text>` : `<text x="${fontDebugX}" y="${(fontDebugY + fontDebugLineH * 3).toFixed(2)}" font-size="12" fill="#FFFFFF" font-family="monospace" text-anchor="end" opacity="0.95" stroke="#000" stroke-width="2.4" paint-order="stroke">Names: ${namesFont.toFixed(2)}px</text>`}
    ${hasFontShrink ? `<text x="${fontDebugX}" y="${(fontDebugY + fontDebugLineH * 4).toFixed(2)}" font-size="12" fill="#FFFFFF" font-family="monospace" text-anchor="end" opacity="0.95" stroke="#000" stroke-width="2.4" paint-order="stroke">Meta req/app: ${requestedMetaFont.toFixed(2)} -> ${metaFont.toFixed(2)}px</text>` : `<text x="${fontDebugX}" y="${(fontDebugY + fontDebugLineH * 4).toFixed(2)}" font-size="12" fill="#FFFFFF" font-family="monospace" text-anchor="end" opacity="0.95" stroke="#000" stroke-width="2.4" paint-order="stroke">Meta: ${metaFont.toFixed(2)}px</text>`}
    <!-- Text bottom: text son satiri → page alti -->
    <line x1="${(cx - 60).toFixed(2)}" y1="${textBottomPx.toFixed(2)}" x2="${(cx + 60).toFixed(2)}" y2="${textBottomPx.toFixed(2)}" stroke="#FF44FF" stroke-width="3" opacity="1"/>
    <text x="${(cx + 66).toFixed(2)}" y="${(textBottomPx + 6).toFixed(2)}" font-size="16" fill="#FF44FF" font-family="monospace" font-weight="bold" opacity="1" stroke="#000" stroke-width="3" paint-order="stroke">BOT: ${textBotFromPageBotIn.toFixed(3)}"</text>
  </g>`;
  })() : ''}
</svg>`;
}
