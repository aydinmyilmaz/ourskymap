import type { SoundwaveParams, SoundwaveRequest } from './types';

function svgEscape(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

type Rgb = { r: number; g: number; b: number };

function parseHexColor(hex: string): Rgb | null {
  const s = (hex || '').trim().toLowerCase();
  if (!s.startsWith('#')) return null;
  const raw = s.slice(1);
  if (raw.length === 3) {
    const r = parseInt(raw[0] + raw[0], 16);
    const g = parseInt(raw[1] + raw[1], 16);
    const b = parseInt(raw[2] + raw[2], 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return { r, g, b };
  }
  if (raw.length !== 6) return null;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return { r, g, b };
}

function rgbToHex(c: Rgb): string {
  const toHex = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`;
}

function srgbToLinear(v255: number): number {
  const v = clamp(v255 / 255, 0, 1);
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance(c: Rgb): number {
  const r = srgbToLinear(c.r);
  const g = srgbToLinear(c.g);
  const b = srgbToLinear(c.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  const k = clamp(t, 0, 1);
  return {
    r: a.r * (1 - k) + b.r * k,
    g: a.g * (1 - k) + b.g * k,
    b: a.b * (1 - k) + b.b * k
  };
}

function ensureContrastHex(fgHex: string, bgHex: string, minContrast = 2.6): string {
  const fg = parseHexColor(fgHex);
  const bg = parseHexColor(bgHex);
  if (!fg || !bg) return fgHex;

  const black: Rgb = { r: 0, g: 0, b: 0 };
  const white: Rgb = { r: 255, g: 255, b: 255 };
  const c0 = contrastRatio(fg, bg);
  if (c0 >= minContrast) return fgHex;

  const towardBlack = contrastRatio(black, bg);
  const towardWhite = contrastRatio(white, bg);
  const target = towardBlack >= towardWhite ? black : white;

  let best = fg;
  let bestContrast = c0;
  for (let i = 1; i <= 24; i++) {
    const mixed = mixRgb(fg, target, i / 24);
    const c = contrastRatio(mixed, bg);
    if (c > bestContrast) {
      best = mixed;
      bestContrast = c;
    }
    if (c >= minContrast) break;
  }

  if (bestContrast < minContrast) {
    best = towardBlack >= towardWhite ? black : white;
  }
  return rgbToHex(best);
}

function unitNoise(seed: number): number {
  const x = Math.sin(seed * 127.1 + seed * seed * 0.013) * 43758.5453123;
  return x - Math.floor(x);
}

function signedNoise(seed: number): number {
  return unitNoise(seed) * 2 - 1;
}

function sanitizeDataImageUri(value?: string): string {
  if (!value) return '';
  const raw = value.trim();
  if (!raw.startsWith('data:image/')) return '';
  const ok = /^data:image\/[a-zA-Z0-9.+-]+;base64,[a-zA-Z0-9+/=]+$/.test(raw);
  return ok ? raw : '';
}

const SIZE_INCH: Record<SoundwaveParams['size'], { w: number; h: number }> = {
  '4x6': { w: 4, h: 6 },
  '5x7': { w: 5, h: 7 },
  '6x9': { w: 6, h: 9 },
  '8x10': { w: 8, h: 10 },
  '11x14': { w: 11, h: 14 },
  '24x8': { w: 24, h: 8 },
  '16x20': { w: 16, h: 20 },
  '18x24': { w: 18, h: 24 },
  '30x10': { w: 30, h: 10 },
  '36x12': { w: 36, h: 12 },
  '42x14': { w: 42, h: 14 },
  '48x16': { w: 48, h: 16 },
  '54x18': { w: 54, h: 18 }
};

type WavePalette = {
  name: SoundwaveParams['palette'];
  colors: string[];
  textColor: string;
};

const WAVE_PALETTES: WavePalette[] = [
  { name: 'multicolor-1', colors: ['#9553a0', '#ef6ea8', '#4a59d1'], textColor: '#2a2431' },
  { name: 'multicolor-2', colors: ['#f1a0de', '#c16ddb', '#6f8fe8'], textColor: '#2a2431' },
  { name: 'multicolor-3', colors: ['#3ebf64', '#d8d744', '#f56a44'], textColor: '#2a2431' },
  { name: 'multicolor-4', colors: ['#f48a5a', '#f0b24a', '#f3d36f'], textColor: '#2a2431' },
  { name: 'multicolor-5', colors: ['#e6533f', '#f3cb43', '#2f8ac8', '#7349c8'], textColor: '#2a2431' },
  { name: 'multicolor-6', colors: ['#2f80d0', '#53c6dc'], textColor: '#2a2431' },
  { name: 'multicolor-7', colors: ['#9b234a', '#f08848', '#4233aa'], textColor: '#2a2431' },
  { name: 'multicolor-8', colors: ['#0c5f9b', '#1e77b7'], textColor: '#2a2431' },
  { name: 'multicolor-9', colors: ['#d8232f', '#111111', '#d8232f'], textColor: '#2a2431' },
  { name: 'multicolor-10', colors: ['#ef2f2f', '#d72222'], textColor: '#2a2431' },
  { name: 'gold', colors: ['#e7cf8a', '#cda54d'], textColor: '#2a2431' },
  { name: 'silver', colors: ['#c8c8c8', '#9ea4ad'], textColor: '#2a2431' },
  { name: 'emerald-green', colors: ['#0f9f5f', '#0a6f40'], textColor: '#2a2431' },
  { name: 'black', colors: ['#101010', '#000000'], textColor: '#2a2431' },
  { name: 'white', colors: ['#f3f3f3', '#dedede'], textColor: '#2a2431' },
  { name: 'sapphire', colors: ['#0f3c8c', '#2a7ace'], textColor: '#2a2431' },
  { name: 'emerald', colors: ['#0f7b4e', '#1eb97d'], textColor: '#2a2431' },
  { name: 'amethyst', colors: ['#6b40ac', '#a472df'], textColor: '#2a2431' },
  { name: 'iridescent', colors: ['#5a85df', '#c17ecf', '#e7b07b', '#72c6ab'], textColor: '#2a2431' },
  { name: 'bronze', colors: ['#8f6d3f', '#be8c4d'], textColor: '#2a2431' },
  { name: 'copper', colors: ['#a55b36', '#d07a4f'], textColor: '#2a2431' },
  { name: 'ruby', colors: ['#8e1f32', '#d0405f'], textColor: '#2a2431' },
  { name: 'onyx', colors: ['#111111', '#303030'], textColor: '#f2f2f2' },
  { name: 'seafoam', colors: ['#2d4d7a', '#25b585', '#3ba9e1'], textColor: '#2a2431' },
  { name: 'apple', colors: ['#b88715', '#d95d1c', '#b32222'], textColor: '#2a2431' },
  { name: 'cantaloupe', colors: ['#db8f8f', '#e98f44', '#efc46a'], textColor: '#2a2431' },
  { name: 'ocean', colors: ['#0f7a6f', '#18a2b8', '#1e84d5'], textColor: '#2a2431' },
  { name: 'mauve', colors: ['#6f5d8f', '#4d477a', '#5871a8'], textColor: '#2a2431' },
  { name: 'after-dark', colors: ['#090f22', '#0d2d52', '#183f6a'], textColor: '#f2f2f2' },
  { name: 'magenta', colors: ['#7a0f50', '#a3157a', '#ca2f87'], textColor: '#2a2431' },
  { name: 'peacock', colors: ['#0a4f73', '#0d3f85', '#0b5aa1'], textColor: '#2a2431' },
  { name: 'spice', colors: ['#8a2d0a', '#7b3a12', '#7a5b1e'], textColor: '#2a2431' },
  { name: 'rainbow-1', colors: ['#d43b2a', '#e89f1d', '#f1d52f', '#45b94d', '#34a5e3', '#7d45d2'], textColor: '#2a2431' },
  { name: 'rainbow-2', colors: ['#b34ad8', '#5d5fdc', '#35b6ea', '#43bb6f', '#f0b82f', '#e0612c'], textColor: '#2a2431' },
  { name: 'sunset', colors: ['#2c4c96', '#ef5fa8', '#f0c02f'], textColor: '#2a2431' }
];

type FontSpec = { family: string; weight: number; style?: 'normal' | 'italic' };

const FONT_PRESETS: Record<SoundwaveParams['fontPreset'], FontSpec> = {
  f1: { family: "Great Vibes, Allura, cursive, ui-serif, Georgia, 'Times New Roman', serif", weight: 400 },
  f2: { family: "Signika, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif", weight: 700 },
  f3: { family: "Allura, 'Great Vibes', cursive, ui-serif, Georgia, 'Times New Roman', serif", weight: 400 },
  f4: { family: "Prata, ui-serif, Georgia, 'Times New Roman', serif", weight: 400 },
  f5: { family: "Great Vibes, Allura, cursive, ui-serif, Georgia, 'Times New Roman', serif", weight: 400 },
  f6: { family: "Prata, ui-serif, Georgia, 'Times New Roman', serif", weight: 500 },
  f7: { family: "Allura, 'Great Vibes', cursive, ui-serif, Georgia, 'Times New Roman', serif", weight: 400 },
  f8: { family: "Signika, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif", weight: 500 }
};

function paletteByName(name: SoundwaveParams['palette']): WavePalette {
  return WAVE_PALETTES.find((x) => x.name === name) ?? WAVE_PALETTES[0];
}

function applyTextCase(text: string, mode: SoundwaveParams['textCase']): string {
  if (mode === 'upper') return text.toUpperCase();
  if (mode === 'lower') return text.toLowerCase();
  return text;
}

function fallbackPeaks(count: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1);
    const mix =
      0.35 * Math.sin(t * 21.0 * Math.PI) +
      0.25 * Math.sin(t * 38.0 * Math.PI + 0.7) +
      0.12 * Math.sin(t * 62.0 * Math.PI + 1.9);
    const envelope = 0.12 + 0.9 * Math.pow(Math.sin(Math.PI * t), 0.45);
    out.push(clamp(Math.abs(mix) * envelope + 0.06, 0, 1));
  }
  return out;
}

function resamplePeaks(raw: number[], count: number): number[] {
  const clean = raw.map((v) => clamp(Math.abs(v), 0, 1));
  if (!clean.length) return fallbackPeaks(count);
  if (clean.length === count) return clean;

  const out: number[] = [];
  const srcLast = clean.length - 1;
  for (let i = 0; i < count; i++) {
    const t = (i / Math.max(1, count - 1)) * srcLast;
    const i0 = Math.floor(t);
    const i1 = Math.min(srcLast, i0 + 1);
    const f = t - i0;
    out.push(clean[i0] * (1 - f) + clean[i1] * f);
  }
  return out;
}

function smoothPeaks(peaks: number[], radius: number): number[] {
  if (radius <= 0) return peaks;
  const out = new Array<number>(peaks.length).fill(0);
  for (let i = 0; i < peaks.length; i++) {
    let sum = 0;
    let cnt = 0;
    for (let d = -radius; d <= radius; d++) {
      const j = i + d;
      if (j < 0 || j >= peaks.length) continue;
      sum += peaks[j];
      cnt += 1;
    }
    out[i] = cnt ? sum / cnt : peaks[i];
  }
  return out;
}

function estimateTextWidthPx(text: string, fontSize: number, letterSpacingEm: number): number {
  const s = (text || '').trim();
  if (!s) return 0;
  let units = 0;
  for (const ch of s) {
    if (ch === ' ') {
      units += 0.34;
      continue;
    }
    if (/[.,:;'"`]/.test(ch)) {
      units += 0.22;
      continue;
    }
    if (/[ilI1|!]/.test(ch)) {
      units += 0.32;
      continue;
    }
    if (/[MW@#%&]/.test(ch)) {
      units += 0.92;
      continue;
    }
    if (/[A-Z]/.test(ch)) {
      units += 0.66;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      units += 0.58;
      continue;
    }
    units += 0.56;
  }
  const base = units * fontSize;
  const tracking = Math.max(0, s.length - 1) * (letterSpacingEm * fontSize);
  return base + tracking;
}

function fitFontSizeToWidth(args: {
  text: string;
  target: number;
  min: number;
  maxWidth: number;
  letterSpacingEm: number;
}): number {
  const text = (args.text || '').trim();
  if (!text) return args.target;
  let size = args.target;
  for (let i = 0; i < 28; i++) {
    const w = estimateTextWidthPx(text, size, args.letterSpacingEm);
    if (w <= args.maxWidth || size <= args.min) break;
    size = Math.max(args.min, size * 0.93);
  }
  return size;
}

export function renderSoundwavePosterSvg(req: SoundwaveRequest): string {
  const s = req.soundwave;
  const size = SIZE_INCH[s.size] ?? SIZE_INCH['16x20'];
  const W = Math.round(size.w * 72);
  const H = Math.round(size.h * 72);

  const bg = s.backgroundColor || '#f3eeea';
  const palette = paletteByName(s.palette);
  const font = FONT_PRESETS[s.fontPreset] ?? FONT_PRESETS.f8;
  const requestedTextColor = (s.textColor || '').trim();
  const textColor = parseHexColor(requestedTextColor) ? requestedTextColor : palette.textColor;

  const outerMargin = clamp(Math.round(Math.min(W, H) * 0.05), 14, 72);
  const waveLeft = outerMargin + Math.round(W * 0.06);
  const waveRight = W - outerMargin - Math.round(W * 0.06);
  const waveW = Math.max(80, waveRight - waveLeft);
  const waveCenterY = H * (size.w / size.h > 1.8 ? 0.5 : 0.38);
  const baseWaveHeight = H * (size.w / size.h > 1.8 ? 0.24 : 0.17);
  const waveHeight = baseWaveHeight * clamp(s.waveHeight || 1, 0.35, 1.65);

  const sampleCount = clamp(Math.floor(waveW / 1.7), 220, 1800);
  const rs = resamplePeaks(s.peaks || [], sampleCount);
  const smooth = smoothPeaks(rs, 2).map((v) => Math.pow(clamp(v, 0, 1), 0.82));

  const pointsTop: Array<{ x: number; y: number }> = [];
  const pointsBot: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < smooth.length; i++) {
    const t = i / Math.max(1, smooth.length - 1);
    const x = waveLeft + t * waveW;
    const a = smooth[i] * waveHeight * 0.5;
    pointsTop.push({ x, y: waveCenterY - a });
    pointsBot.push({ x, y: waveCenterY + a });
  }

  const topPath = pointsTop.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  const bottomPath = pointsBot
    .slice()
    .reverse()
    .map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');
  const wavePath = `${topPath} ${bottomPath} Z`;

  const centerLine = pointsTop
    .map((p, i) => {
      const b = pointsBot[i];
      const y = ((p.y + b.y) * 0.5).toFixed(2);
      return `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${y}`;
    })
    .join(' ');

  const textCase = s.textCase ?? 'original';
  const title = applyTextCase((s.title || '').trim(), textCase);
  const subtitle = applyTextCase((s.subtitle || '').trim(), textCase);
  const caption = applyTextCase((s.caption || '').trim(), textCase);

  // Typography follows poster-size scale (H-based), then width-fit to avoid clipping on narrow sizes.
  const typeScale = H / 1440;
  const textSafePad = clamp(Math.min(W, H) * 0.03, 10, 36);
  const textMaxWidth = Math.max(40, W - 2 * (outerMargin + textSafePad));
  const captionTrack = 0.08;
  const titleTrack = 0.02;
  const subtitleTrack = 0.03;
  const captionFont = fitFontSizeToWidth({
    text: caption,
    target: clamp(20 * typeScale, 9, 28),
    min: 8,
    maxWidth: textMaxWidth,
    letterSpacingEm: captionTrack
  });
  const titleFont = fitFontSizeToWidth({
    text: title,
    target: clamp(40 * typeScale, 13, 84),
    min: 11,
    maxWidth: textMaxWidth,
    letterSpacingEm: titleTrack
  });
  const subtitleFont = fitFontSizeToWidth({
    text: subtitle,
    target: clamp(26 * typeScale, 10, 42),
    min: 9,
    maxWidth: textMaxWidth,
    letterSpacingEm: subtitleTrack
  });
  const titleY = waveCenterY + waveHeight * 0.75 + clamp(H * 0.06, 16, 80);
  const subtitleY = titleY + Math.max(subtitleFont * 1.15, clamp(H * 0.028, 10, 44));
  const frameStroke = s.showFrame !== false ? textColor : 'transparent';
  const waveOpacity = clamp(s.waveformOpacity || 0.95, 0.2, 1);
  const waveThickness = clamp(s.waveThickness || 2.2, 0.6, 8);
  const waveStyle = s.waveStyle ?? 'filled';

  const gradientStops = palette.colors
    .map((c, i) => {
      const o = i / Math.max(1, palette.colors.length - 1);
      return `<stop offset="${(o * 100).toFixed(2)}%" stop-color="${c}"/>`;
    })
    .join('');
  const lineGradientStops = palette.colors
    .map((c, i) => {
      const o = i / Math.max(1, palette.colors.length - 1);
      const lineColor = ensureContrastHex(c, bg, 5.2);
      return `<stop offset="${(o * 100).toFixed(2)}%" stop-color="${lineColor}"/>`;
    })
    .join('');
  const brushGradientStops = palette.colors
    .map((c, i) => {
      const o = i / Math.max(1, palette.colors.length - 1);
      const brushColor = ensureContrastHex(c, bg, 1.8);
      return `<stop offset="${(o * 100).toFixed(2)}%" stop-color="${brushColor}"/>`;
    })
    .join('');

  const samplePeakAt = (tRaw: number): number => {
    const t = clamp(tRaw, 0, 1) * Math.max(1, smooth.length - 1);
    const i0 = Math.floor(t);
    const i1 = Math.min(smooth.length - 1, i0 + 1);
    const f = t - i0;
    return smooth[i0] * (1 - f) + smooth[i1] * f;
  };

  const styleThickness = clamp(waveThickness, 0.6, 8);
  const scanSpacingPx = clamp(2.6 + styleThickness * 1.45, 3.2, 13.5);
  const scanCoreWidth = clamp(1.8 + styleThickness * 0.35, 1.8, 3.8);
  const scanAccentWidth = clamp(scanCoreWidth * 0.48, 0.8, 1.95);
  const scanCoreLines: string[] = [];
  const scanAccentLines: string[] = [];
  let scanIndex = 0;
  for (let x = waveLeft; x <= waveRight; x += scanSpacingPx) {
    const t = (x - waveLeft) / Math.max(1, waveW);
    const peak = samplePeakAt(t);
    const amp = Math.pow(peak, 0.9) * waveHeight * 0.5;
    if (amp < 0.22) {
      scanIndex += 1;
      continue;
    }
    const taper = 0.96 + 0.06 * Math.sin(t * 17.0 * Math.PI + 0.35);
    const y1 = waveCenterY - amp * taper;
    const y2 = waveCenterY + amp * taper;
    const densityGate = 0.72 + 0.28 * Math.abs(Math.sin(t * 23.0 * Math.PI + 0.8));
    const coreOpacity = clamp((0.46 + peak * 0.55) * densityGate * waveOpacity, 0.62, 1);
    scanCoreLines.push(
      `<line x1="${x.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="url(#waveLineGrad)" stroke-width="${scanCoreWidth.toFixed(2)}" stroke-opacity="${coreOpacity.toFixed(3)}" stroke-linecap="square" />`
    );
    if (scanIndex % 8 === 0 && amp > 2.4) {
      const accentX = x + scanCoreWidth * 0.6;
      scanAccentLines.push(
        `<line x1="${accentX.toFixed(2)}" y1="${(y1 + amp * 0.04).toFixed(2)}" x2="${accentX.toFixed(2)}" y2="${(y2 - amp * 0.04).toFixed(2)}" stroke="url(#waveLineGrad)" stroke-width="${scanAccentWidth.toFixed(2)}" stroke-opacity="${clamp(coreOpacity * 0.68, 0.32, 0.82).toFixed(3)}" stroke-linecap="square" />`
      );
    }
    scanIndex += 1;
  }

  const spikeSpacingPx = clamp(4.8 + styleThickness * 1.95, 5.5, 18);
  const spikeCoreWidth = clamp(1.45 + styleThickness * 0.4, 1.5, 4.2);
  const spikeNeedleWidth = clamp(spikeCoreWidth * 0.68, 1.0, 3.2);
  const spikeCoreLines: string[] = [];
  const spikeNeedleLines: string[] = [];
  let spikeIndex = 0;
  for (let x = waveLeft; x <= waveRight; x += spikeSpacingPx) {
    const t = (x - waveLeft) / Math.max(1, waveW);
    const peak = samplePeakAt(t);
    const floorGate = 0.004 + 0.012 * Math.abs(Math.sin(t * 7.0 * Math.PI + 0.2));
    if (peak < floorGate) {
      spikeIndex += 1;
      continue;
    }
    const ampCore = Math.pow(peak, 0.58) * waveHeight * 0.46;
    const needleGain = 1.24 + 0.82 * Math.abs(Math.sin(t * 39.0 * Math.PI + 0.35));
    const ampNeedle = ampCore * needleGain;
    if (ampNeedle < 0.32) {
      spikeIndex += 1;
      continue;
    }
    const y1Core = waveCenterY - ampCore;
    const y2Core = waveCenterY + ampCore;
    const y1Needle = waveCenterY - ampNeedle;
    const y2Needle = waveCenterY + ampNeedle;
    const coreOpacity = clamp((0.36 + peak * 0.6) * waveOpacity, 0.55, 0.98);
    const needleOpacity = clamp((0.52 + peak * 0.52) * waveOpacity, 0.64, 1);
    spikeCoreLines.push(
      `<line x1="${x.toFixed(2)}" y1="${y1Core.toFixed(2)}" x2="${x.toFixed(2)}" y2="${y2Core.toFixed(2)}" stroke="url(#waveLineGrad)" stroke-width="${spikeCoreWidth.toFixed(2)}" stroke-opacity="${coreOpacity.toFixed(3)}" stroke-linecap="square" />`
    );
    spikeNeedleLines.push(
      `<line x1="${x.toFixed(2)}" y1="${y1Needle.toFixed(2)}" x2="${x.toFixed(2)}" y2="${y2Needle.toFixed(2)}" stroke="url(#waveLineGrad)" stroke-width="${spikeNeedleWidth.toFixed(2)}" stroke-opacity="${needleOpacity.toFixed(3)}" stroke-linecap="square" />`
    );
    if (spikeIndex % 4 === 0 && ampNeedle > 3.2) {
      const offset = spikeNeedleWidth * (spikeIndex % 2 === 0 ? 0.85 : -0.85);
      spikeNeedleLines.push(
        `<line x1="${(x + offset).toFixed(2)}" y1="${(y1Needle + ampNeedle * 0.08).toFixed(2)}" x2="${(x + offset).toFixed(2)}" y2="${(y2Needle - ampNeedle * 0.08).toFixed(2)}" stroke="url(#waveLineGrad)" stroke-width="${clamp(spikeNeedleWidth * 0.55, 0.16, 0.6).toFixed(2)}" stroke-opacity="${clamp(needleOpacity * 0.72, 0.36, 0.88).toFixed(3)}" stroke-linecap="square" />`
      );
    }
    spikeIndex += 1;
  }

  const brushSpacingPx = clamp(2.1 + styleThickness * 0.95, 2.0, 6.2);
  const brushCoreWidth = clamp(0.72 + styleThickness * 0.19, 0.72, 2.5);
  const brushHairWidth = clamp(brushCoreWidth * 0.42, 0.26, 1.05);
  const brushCoreLines: string[] = [];
  const brushHairLines: string[] = [];
  let brushIndex = 0;
  for (let x = waveLeft; x <= waveRight; x += brushSpacingPx) {
    const t = (x - waveLeft) / Math.max(1, waveW);
    const peak = samplePeakAt(t);
    const ampCore = Math.pow(peak, 0.84) * waveHeight * 0.5;
    if (ampCore < 0.14) {
      brushIndex += 1;
      continue;
    }
    const jitterTop = 1 + 0.18 * signedNoise(brushIndex * 1.19 + 5.2);
    const jitterBot = 1 + 0.18 * signedNoise(brushIndex * 1.27 + 9.4);
    const y1 = waveCenterY - ampCore * jitterTop;
    const y2 = waveCenterY + ampCore * jitterBot;
    const coreOpacity = clamp((0.44 + peak * 0.56) * waveOpacity, 0.36, 0.98);
    brushCoreLines.push(
      `<line x1="${x.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="url(#waveBrushGrad)" stroke-width="${brushCoreWidth.toFixed(2)}" stroke-opacity="${coreOpacity.toFixed(3)}" stroke-linecap="round" />`
    );

    const featherSteps = peak > 0.34 ? 2 : 1;
    for (let step = 0; step < featherSteps; step++) {
      for (const dir of [-1, 1]) {
        const nA = unitNoise(brushIndex * 0.73 + step * 1.7 + (dir > 0 ? 11.7 : 4.3));
        const nB = unitNoise(brushIndex * 0.91 + step * 2.2 + (dir > 0 ? 17.1 : 6.8));
        const xOffset = dir * brushCoreWidth * (0.35 + 0.65 * nA) * (step === 0 ? 1 : 1.45);
        const xHair = x + xOffset;
        const topLen = ampCore * (0.12 + 0.26 * nA);
        const botLen = ampCore * (0.12 + 0.26 * nB);
        const topY1 = y1 - topLen;
        const topY2 = y1 + topLen * 0.28;
        const botY1 = y2 - botLen * 0.28;
        const botY2 = y2 + botLen;
        const hairOpacity = clamp(coreOpacity * (0.34 + 0.22 * nB), 0.16, 0.62);
        brushHairLines.push(
          `<line x1="${xHair.toFixed(2)}" y1="${topY1.toFixed(2)}" x2="${xHair.toFixed(2)}" y2="${topY2.toFixed(2)}" stroke="url(#waveBrushGrad)" stroke-width="${brushHairWidth.toFixed(2)}" stroke-opacity="${hairOpacity.toFixed(3)}" stroke-linecap="round" />`
        );
        brushHairLines.push(
          `<line x1="${xHair.toFixed(2)}" y1="${botY1.toFixed(2)}" x2="${xHair.toFixed(2)}" y2="${botY2.toFixed(2)}" stroke="url(#waveBrushGrad)" stroke-width="${brushHairWidth.toFixed(2)}" stroke-opacity="${hairOpacity.toFixed(3)}" stroke-linecap="round" />`
        );
      }
    }
    brushIndex += 1;
  }

  const brushSpikeSpacingPx = clamp(1.35 + styleThickness * 0.72, 1.15, 4.6);
  const brushSpikeCoreWidth = clamp(0.74 + styleThickness * 0.18, 0.72, 2.45);
  const brushSpikeHairWidth = clamp(brushSpikeCoreWidth * 0.38, 0.22, 0.96);
  const brushSpikeCoreLines: string[] = [];
  const brushSpikeHairLines: string[] = [];
  let brushSpikeIndex = 0;
  for (let x = waveLeft; x <= waveRight; x += brushSpikeSpacingPx) {
    const t = (x - waveLeft) / Math.max(1, waveW);
    const peak = samplePeakAt(t);
    if (peak < 0.008) {
      brushSpikeIndex += 1;
      continue;
    }
    const ampBase = Math.pow(peak, 0.7) * waveHeight * 0.5;
    const spikeGainTop =
      0.92 + 0.72 * Math.abs(signedNoise(brushSpikeIndex * 0.67 + 1.4)) + 0.22 * Math.abs(Math.sin(t * 31 * Math.PI));
    const spikeGainBot =
      0.92 + 0.72 * Math.abs(signedNoise(brushSpikeIndex * 0.71 + 3.1)) + 0.22 * Math.abs(Math.sin(t * 29 * Math.PI + 0.45));
    const ampTop = ampBase * spikeGainTop;
    const ampBot = ampBase * spikeGainBot;
    const y1 = waveCenterY - ampTop;
    const y2 = waveCenterY + ampBot;
    const coreOpacity = clamp((0.5 + peak * 0.6) * waveOpacity, 0.48, 1);
    brushSpikeCoreLines.push(
      `<line x1="${x.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="url(#waveBrushGrad)" stroke-width="${brushSpikeCoreWidth.toFixed(2)}" stroke-opacity="${coreOpacity.toFixed(3)}" stroke-linecap="square" />`
    );
    const fringeCount = peak > 0.36 ? 3 : 2;
    for (let k = 0; k < fringeCount; k++) {
      for (const dir of [-1, 1]) {
        const n = unitNoise(brushSpikeIndex * 0.73 + k * 0.93 + (dir > 0 ? 9.2 : 4.6));
        const n2 = unitNoise(brushSpikeIndex * 0.81 + k * 1.22 + (dir > 0 ? 12.6 : 7.4));
        const dx = dir * brushSpikeCoreWidth * (0.28 + 0.6 * n) * (1 + k * 0.58);
        const xHair = x + dx;
        const topHairLen = ampTop * (0.2 + 0.42 * n);
        const botHairLen = ampBot * (0.2 + 0.42 * n2);
        const topY1 = y1 - topHairLen;
        const topY2 = y1 + topHairLen * 0.18;
        const botY1 = y2 - botHairLen * 0.18;
        const botY2 = y2 + botHairLen;
        const hairOpacity = clamp(coreOpacity * (0.3 + 0.34 * n2), 0.18, 0.72);
        brushSpikeHairLines.push(
          `<line x1="${xHair.toFixed(2)}" y1="${topY1.toFixed(2)}" x2="${xHair.toFixed(2)}" y2="${topY2.toFixed(2)}" stroke="url(#waveBrushGrad)" stroke-width="${brushSpikeHairWidth.toFixed(2)}" stroke-opacity="${hairOpacity.toFixed(3)}" stroke-linecap="square" />`
        );
        brushSpikeHairLines.push(
          `<line x1="${xHair.toFixed(2)}" y1="${botY1.toFixed(2)}" x2="${xHair.toFixed(2)}" y2="${botY2.toFixed(2)}" stroke="url(#waveBrushGrad)" stroke-width="${brushSpikeHairWidth.toFixed(2)}" stroke-opacity="${hairOpacity.toFixed(3)}" stroke-linecap="square" />`
        );
      }
    }
    brushSpikeIndex += 1;
  }

  let waveMarkup = '';
  if (waveStyle === 'scanlines') {
    const hasLines = scanCoreLines.length > 0 || scanAccentLines.length > 0;
    if (!hasLines) {
      waveMarkup = `<g filter="url(#waveSoftShadow)">
    <path d="${wavePath}" fill="url(#waveGrad)" opacity="${clamp(Math.max(waveOpacity, 0.7), 0.45, 1).toFixed(3)}"/>
    <path d="${centerLine}" fill="none" stroke="rgba(0,0,0,0.12)" stroke-width="${clamp(waveThickness * 0.18, 0.32, 0.95).toFixed(2)}" stroke-linecap="round"/>
  </g>`;
    } else {
      waveMarkup = `<g>
    ${scanAccentLines.join('')}
    ${scanCoreLines.join('')}
    <path d="${centerLine}" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="${clamp(waveThickness * 0.5, 1.2, 3.2).toFixed(2)}" stroke-linecap="round"/>
  </g>`;
    }
  } else if (waveStyle === 'spikes') {
    const hasLines = spikeCoreLines.length > 0 || spikeNeedleLines.length > 0;
    if (!hasLines) {
      waveMarkup = `<g filter="url(#waveSoftShadow)">
    <path d="${wavePath}" fill="url(#waveGrad)" opacity="${clamp(Math.max(waveOpacity, 0.68), 0.45, 1).toFixed(3)}"/>
    <path d="${centerLine}" fill="none" stroke="rgba(0,0,0,0.12)" stroke-width="${clamp(waveThickness * 0.17, 0.3, 0.9).toFixed(2)}" stroke-linecap="round"/>
  </g>`;
    } else {
      waveMarkup = `<g>
    ${spikeCoreLines.join('')}
    ${spikeNeedleLines.join('')}
    <path d="${centerLine}" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="${clamp(waveThickness * 0.46, 1.1, 3.0).toFixed(2)}" stroke-linecap="round"/>
  </g>`;
    }
  } else if (waveStyle === 'brush-lines') {
    const hasLines = brushCoreLines.length > 0;
    if (!hasLines) {
      waveMarkup = `<g filter="url(#waveSoftShadow)">
    <path d="${wavePath}" fill="url(#waveGrad)" opacity="${clamp(Math.max(waveOpacity, 0.68), 0.45, 1).toFixed(3)}"/>
    <path d="${centerLine}" fill="none" stroke="rgba(0,0,0,0.12)" stroke-width="${clamp(waveThickness * 0.17, 0.3, 0.9).toFixed(2)}" stroke-linecap="round"/>
  </g>`;
    } else {
      waveMarkup = `<g>
    ${brushHairLines.join('')}
    ${brushCoreLines.join('')}
    <path d="${centerLine}" fill="none" stroke="rgba(0,0,0,0.16)" stroke-width="${clamp(waveThickness * 0.24, 0.9, 2.1).toFixed(2)}" stroke-linecap="round"/>
  </g>`;
    }
  } else if (waveStyle === 'brush-spike') {
    const hasLines = brushSpikeCoreLines.length > 0;
    if (!hasLines) {
      waveMarkup = `<g filter="url(#waveSoftShadow)">
    <path d="${wavePath}" fill="url(#waveGrad)" opacity="${clamp(Math.max(waveOpacity, 0.68), 0.45, 1).toFixed(3)}"/>
    <path d="${centerLine}" fill="none" stroke="rgba(0,0,0,0.12)" stroke-width="${clamp(waveThickness * 0.17, 0.3, 0.9).toFixed(2)}" stroke-linecap="round"/>
  </g>`;
    } else {
      waveMarkup = `<g>
    ${brushSpikeHairLines.join('')}
    ${brushSpikeCoreLines.join('')}
    <path d="${centerLine}" fill="none" stroke="rgba(0,0,0,0.14)" stroke-width="${clamp(waveThickness * 0.22, 0.85, 2.0).toFixed(2)}" stroke-linecap="round"/>
  </g>`;
    }
  } else {
    waveMarkup = `<g filter="url(#waveSoftShadow)">
    <path d="${wavePath}" fill="url(#waveGrad)" opacity="${waveOpacity.toFixed(3)}"/>
    <path d="${centerLine}" fill="none" stroke="rgba(0,0,0,0.12)" stroke-width="${waveThickness.toFixed(2)}" stroke-linecap="round"/>
  </g>`;
  }

  const qrMode = s.qrMode ?? 'none';
  const wantsQr = qrMode === 'qr' || qrMode === 'picture-qr';
  const qrPosition = s.qrPosition ?? 'bottom-right';
  const wantsQrTitleEnd = wantsQr && qrPosition === 'title-end';
  const wantsQrBottomRight = wantsQr && !wantsQrTitleEnd;
  const wantsPicture = qrMode === 'picture' || qrMode === 'picture-qr';
  const wantsSpotifyCode = !!s.showSpotifyCode;
  const qrImageDataUrl = sanitizeDataImageUri(s.qrImageDataUrl);
  const spotifyCodeImageDataUrl = sanitizeDataImageUri(s.spotifyCodeImageDataUrl);
  const pictureImageDataUrl = sanitizeDataImageUri(s.pictureImageDataUrl);

  const mediaSize = clamp(H * (size.w / size.h > 1.8 ? 0.11 : 0.09), 40, 126);
  const footerPad = clamp(Math.min(W, H) * 0.02, 6, 18);
  const mediaYBottom = H - outerMargin - footerPad - mediaSize;
  const mediaY = mediaYBottom;
  const mediaGap = clamp(mediaSize * 0.22, 8, 22);
  const pictureW = Math.round(mediaSize * 1.25);
  const qrSize = Math.round(mediaSize);
  const spotifyCodeW = Math.round(mediaSize * 2.3);
  const qrInlineSize = clamp(Math.min(W, H) * 0.07, 28, 74);
  const mediaX: Partial<Record<'picture' | 'spotify' | 'qr', number>> = {};
  let cursorRight = W - outerMargin - footerPad;
  if (wantsQrBottomRight) {
    mediaX.qr = cursorRight - qrSize;
    cursorRight = (mediaX.qr ?? cursorRight) - mediaGap;
  }
  if (wantsSpotifyCode) {
    mediaX.spotify = cursorRight - spotifyCodeW;
    cursorRight = (mediaX.spotify ?? cursorRight) - mediaGap;
  }
  if (wantsPicture) {
    mediaX.picture = cursorRight - pictureW;
    cursorRight = (mediaX.picture ?? cursorRight) - mediaGap;
  }
  const qrBottomRightX = mediaX.qr ?? (W - outerMargin - footerPad - qrSize);
  const qrBottomRightY = mediaY;
  const textAnchorForQr = subtitle || title;
  const textAnchorFont = subtitle ? subtitleFont : titleFont;
  const textAnchorTrack = subtitle ? subtitleTrack : titleTrack;
  const textAnchorY = subtitle ? subtitleY : titleY;
  const textAnchorWidth = estimateTextWidthPx(textAnchorForQr, textAnchorFont, textAnchorTrack);
  const qrTitleXRaw = W / 2 + textAnchorWidth / 2 + clamp(textAnchorFont * 0.28, 8, 20);
  const qrTitleYRaw = textAnchorY - qrInlineSize * 0.8;
  const qrTitleX = clamp(qrTitleXRaw, outerMargin + footerPad, W - outerMargin - footerPad - qrInlineSize);
  const qrTitleY = clamp(qrTitleYRaw, outerMargin + footerPad, H - outerMargin - footerPad - qrInlineSize);
  const qrRenderSize = wantsQrTitleEnd ? qrInlineSize : qrSize;
  const qrRenderX = wantsQrTitleEnd ? qrTitleX : qrBottomRightX;
  const qrRenderY = wantsQrTitleEnd ? qrTitleY : qrBottomRightY;
  const spotifyX = mediaX.spotify ?? (W - outerMargin - footerPad - spotifyCodeW);
  const pictureX = mediaX.picture ?? (W - outerMargin - footerPad - pictureW);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="waveGrad" x1="0%" y1="50%" x2="100%" y2="50%">
      ${gradientStops}
    </linearGradient>
    <linearGradient id="waveLineGrad" gradientUnits="userSpaceOnUse" x1="${waveLeft.toFixed(2)}" y1="${waveCenterY.toFixed(2)}" x2="${waveRight.toFixed(2)}" y2="${waveCenterY.toFixed(2)}">
      ${lineGradientStops}
    </linearGradient>
    <linearGradient id="waveBrushGrad" gradientUnits="userSpaceOnUse" x1="${waveLeft.toFixed(2)}" y1="${waveCenterY.toFixed(2)}" x2="${waveRight.toFixed(2)}" y2="${waveCenterY.toFixed(2)}">
      ${brushGradientStops}
    </linearGradient>
    <filter id="waveSoftShadow" x="-15%" y="-40%" width="130%" height="180%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="${(Math.min(W, H) * 0.0042).toFixed(2)}" result="blur"/>
      <feOffset dx="0" dy="${(Math.min(W, H) * 0.0024).toFixed(2)}" result="off"/>
      <feColorMatrix in="off" type="matrix" values="
        0 0 0 0 0.15
        0 0 0 0 0.12
        0 0 0 0 0.20
        0 0 0 0.20 0"/>
      <feBlend in="SourceGraphic" mode="normal"/>
    </filter>
  </defs>

  <rect x="0" y="0" width="${W}" height="${H}" fill="${bg}"/>
  <rect x="${outerMargin}" y="${outerMargin}" width="${W - 2 * outerMargin}" height="${H - 2 * outerMargin}" fill="none" stroke="${frameStroke}" stroke-width="${clamp(Math.min(W, H) * 0.0023, 1, 3).toFixed(2)}"/>

  ${waveMarkup}

  ${
    caption
      ? `<text x="${(W / 2).toFixed(2)}" y="${(waveCenterY + waveHeight * 0.58).toFixed(2)}" text-anchor="middle" fill="${textColor}" fill-opacity="0.78" font-family="${font.family}" font-size="${captionFont.toFixed(2)}" letter-spacing="${captionTrack}em" font-weight="500">${svgEscape(caption)}</text>`
      : ''
  }

  ${
    title
      ? `<text x="${(W / 2).toFixed(2)}" y="${titleY.toFixed(2)}" text-anchor="middle" fill="${textColor}" font-family="${font.family}" font-size="${titleFont.toFixed(2)}" letter-spacing="${titleTrack}em" font-weight="${font.weight}" font-style="${font.style ?? 'normal'}">${svgEscape(title)}</text>`
      : ''
  }
  ${
    subtitle
      ? `<text x="${(W / 2).toFixed(2)}" y="${subtitleY.toFixed(2)}" text-anchor="middle" fill="${textColor}" fill-opacity="0.84" font-family="${font.family}" font-size="${subtitleFont.toFixed(2)}" letter-spacing="${subtitleTrack}em" font-weight="${Math.max(400, font.weight - 100)}">${svgEscape(subtitle)}</text>`
      : ''
  }

  ${
    wantsPicture
      ? `<g>
    <rect x="${pictureX.toFixed(2)}" y="${mediaY.toFixed(2)}" width="${pictureW.toFixed(2)}" height="${mediaSize.toFixed(2)}" rx="${clamp(mediaSize * 0.06, 4, 10).toFixed(2)}" fill="rgba(255,255,255,0.72)" stroke="rgba(31,28,37,0.22)" stroke-width="${clamp(mediaSize * 0.02, 1, 2).toFixed(2)}"/>
    ${
      pictureImageDataUrl
        ? `<image href="${pictureImageDataUrl}" x="${(pictureX + 2).toFixed(2)}" y="${(mediaY + 2).toFixed(2)}" width="${(pictureW - 4).toFixed(2)}" height="${(mediaSize - 4).toFixed(2)}" preserveAspectRatio="xMidYMid slice"/>`
        : `<text x="${(pictureX + pictureW / 2).toFixed(2)}" y="${(mediaY + mediaSize / 2 + mediaSize * 0.08).toFixed(2)}" text-anchor="middle" fill="rgba(31,28,37,0.62)" font-family="${font.family}" font-size="${clamp(mediaSize * 0.25, 10, 18).toFixed(2)}" letter-spacing="0.08em" font-weight="600">PHOTO</text>`
    }
  </g>`
      : ''
  }

  ${
    wantsSpotifyCode
      ? `<g>
    <rect x="${spotifyX.toFixed(2)}" y="${mediaY.toFixed(2)}" width="${spotifyCodeW.toFixed(2)}" height="${mediaSize.toFixed(2)}" rx="${clamp(mediaSize * 0.08, 4, 12).toFixed(2)}" fill="white" stroke="rgba(31,28,37,0.34)" stroke-width="${clamp(mediaSize * 0.02, 1, 2).toFixed(2)}"/>
    ${
      spotifyCodeImageDataUrl
        ? `<image href="${spotifyCodeImageDataUrl}" x="${(spotifyX + 2).toFixed(2)}" y="${(mediaY + 2).toFixed(2)}" width="${(spotifyCodeW - 4).toFixed(2)}" height="${(mediaSize - 4).toFixed(2)}" preserveAspectRatio="xMidYMid meet"/>`
        : `<text x="${(spotifyX + spotifyCodeW / 2).toFixed(2)}" y="${(mediaY + mediaSize / 2 + mediaSize * 0.08).toFixed(2)}" text-anchor="middle" fill="rgba(31,28,37,0.62)" font-family="${font.family}" font-size="${clamp(mediaSize * 0.2, 9, 14).toFixed(2)}" letter-spacing="0.08em" font-weight="600">SPOTIFY</text>`
    }
  </g>`
      : ''
  }

  ${
    wantsQr
      ? `<g>
    <rect x="${qrRenderX.toFixed(2)}" y="${qrRenderY.toFixed(2)}" width="${qrRenderSize.toFixed(2)}" height="${qrRenderSize.toFixed(2)}" rx="${clamp(qrRenderSize * 0.06, 4, 10).toFixed(2)}" fill="white" stroke="rgba(31,28,37,0.34)" stroke-width="${clamp(qrRenderSize * 0.02, 1, 2).toFixed(2)}"/>
    ${
      qrImageDataUrl
        ? `<image href="${qrImageDataUrl}" x="${(qrRenderX + 2).toFixed(2)}" y="${(qrRenderY + 2).toFixed(2)}" width="${(qrRenderSize - 4).toFixed(2)}" height="${(qrRenderSize - 4).toFixed(2)}" preserveAspectRatio="xMidYMid meet"/>`
        : `<path d="M ${
            qrRenderX + qrRenderSize * 0.23
          } ${qrRenderY + qrRenderSize * 0.23} L ${qrRenderX + qrRenderSize * 0.77} ${qrRenderY + qrRenderSize * 0.77} M ${
            qrRenderX + qrRenderSize * 0.77
          } ${qrRenderY + qrRenderSize * 0.23} L ${qrRenderX + qrRenderSize * 0.23} ${qrRenderY + qrRenderSize * 0.77}" stroke="rgba(31,28,37,0.44)" stroke-width="${clamp(qrRenderSize * 0.03, 1, 3)}" stroke-linecap="round"/>`
    }
  </g>`
      : ''
  }

</svg>`;
}
