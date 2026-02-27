import type { VinylRequest, VinylParams } from './types';
import { getVinylLayoutPreset } from './vinyl-layout-spec';

function svgEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

function rgba(rgb: { r: number; g: number; b: number }, a: number): string {
  const aa = Math.max(0, Math.min(1, a));
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${aa.toFixed(3)})`;
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

function getPalette(name: VinylParams['palette']): Palette {
  switch (name) {
    case 'classic-black':
      return { bg: '#0b0b0d', ink: '#f6f6f7', mutedInk: 'rgba(246,246,247,0.55)', accent: '#f6f6f7' };
    case 'navy-blue':
      return { bg: '#0f1c42', ink: '#f1f3f8', mutedInk: 'rgba(241,243,248,0.42)', accent: '#f1f3f8' };
    case 'classic-burgundy':
      return { bg: '#4d1f2a', ink: '#f7f4f3', mutedInk: 'rgba(247,244,243,0.42)', accent: '#f7f4f3' };
    case 'midnight':
      return { bg: '#0b1020', ink: '#ffffff', mutedInk: 'rgba(255,255,255,0.40)', accent: '#ffffff' };
    case 'deep-navy':
      return { bg: '#121b34', ink: '#f0f4ff', mutedInk: 'rgba(240,244,255,0.42)', accent: '#f0f4ff' };
    case 'royal-blue':
      return { bg: '#1f3f86', ink: '#f3f6ff', mutedInk: 'rgba(243,246,255,0.43)', accent: '#f3f6ff' };
    case 'ocean-teal':
      return { bg: '#125f67', ink: '#eef8f8', mutedInk: 'rgba(238,248,248,0.42)', accent: '#eef8f8' };
    case 'deep-teal':
      return { bg: '#0f4f5a', ink: '#e8f5f6', mutedInk: 'rgba(232,245,246,0.42)', accent: '#e8f5f6' };
    case 'emerald':
      return { bg: '#0b3d2e', ink: '#e6f4ee', mutedInk: 'rgba(230,244,238,0.42)', accent: '#e6f4ee' };
    case 'dark-green':
      return { bg: '#132a1f', ink: '#ecf2ee', mutedInk: 'rgba(236,242,238,0.42)', accent: '#ecf2ee' };
    case 'forest':
      return { bg: '#0e1f16', ink: '#e7eee9', mutedInk: 'rgba(231,238,233,0.42)', accent: '#e7eee9' };
    case 'mustard-gold':
      return { bg: '#886820', ink: '#fbf2dd', mutedInk: 'rgba(251,242,221,0.42)', accent: '#fbf2dd' };
    case 'night-gold':
      return { bg: '#24283a', ink: '#fbab29', mutedInk: 'rgba(251,171,41,0.35)', accent: '#fbab29' };
    case 'burnt-orange':
      return { bg: '#8d4f1f', ink: '#fff0de', mutedInk: 'rgba(255,240,222,0.42)', accent: '#fff0de' };
    case 'terracotta-red':
      return { bg: '#8f3c34', ink: '#fff0ed', mutedInk: 'rgba(255,240,237,0.42)', accent: '#fff0ed' };
    case 'plum':
      return { bg: '#1c1230', ink: '#efe9fb', mutedInk: 'rgba(239,233,251,0.42)', accent: '#efe9fb' };
    case 'storm-gray':
      return { bg: '#2c3341', ink: '#edf1f7', mutedInk: 'rgba(237,241,247,0.42)', accent: '#edf1f7' };
    case 'sand':
      return { bg: '#efe3cb', ink: '#1f1b16', mutedInk: 'rgba(31,27,22,0.35)', accent: '#1f1b16' };
    case 'pearl':
      return { bg: '#ececed', ink: '#16171c', mutedInk: 'rgba(22,23,28,0.35)', accent: '#16171c' };
    case 'navy-gold':
      return { bg: '#151c2d', ink: '#f4c25b', mutedInk: 'rgba(244,194,91,0.35)', accent: '#f4c25b' };
    case 'cream-ink':
      return { bg: '#fbf5ea', ink: '#1b1b1b', mutedInk: 'rgba(27,27,27,0.35)', accent: '#1b1b1b' };
    case 'slate':
      return { bg: '#111827', ink: '#d9d9d9', mutedInk: 'rgba(217,217,217,0.40)', accent: '#d9d9d9' };
    case 'burgundy':
      return { bg: '#2a0f1a', ink: '#d9d9d9', mutedInk: 'rgba(217,217,217,0.40)', accent: '#d9d9d9' };
    default:
      return { bg: '#0b1020', ink: '#ffffff', mutedInk: 'rgba(255,255,255,0.40)', accent: '#ffffff' };
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function circlePathD(cx: number, cy: number, r: number): string {
  const rr = r.toFixed(2);
  const x = cx.toFixed(2);
  const y = (cy - r).toFixed(2);
  // Full circle using two arcs.
  return `M ${x} ${y} a ${rr} ${rr} 0 1 1 0 ${(2 * r).toFixed(2)} a ${rr} ${rr} 0 1 1 0 ${(-2 * r).toFixed(2)}`;
}

function arcPathD(input: {
  cx: number;
  cy: number;
  r: number;
  startDeg: number;
  endDeg: number;
  clockwise?: boolean;
}): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const clockwise = input.clockwise !== false;
  const s = toRad(input.startDeg);
  const e = toRad(input.endDeg);
  const x1 = input.cx + input.r * Math.cos(s);
  const y1 = input.cy + input.r * Math.sin(s);
  const x2 = input.cx + input.r * Math.cos(e);
  const y2 = input.cy + input.r * Math.sin(e);
  let delta = input.endDeg - input.startDeg;
  if (clockwise) {
    while (delta < 0) delta += 360;
  } else {
    while (delta > 0) delta -= 360;
  }
  const largeArcFlag = Math.abs(delta) > 180 ? 1 : 0;
  const sweepFlag = clockwise ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${input.r.toFixed(2)} ${input.r.toFixed(2)} 0 ${largeArcFlag} ${sweepFlag} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function buildSpiralPath(input: {
  cx: number;
  cy: number;
  startRadius: number;
  endRadius: number;
  turns: number;
}): { d: string; length: number } {
  const turns = Math.max(0.5, input.turns);
  const pointCount = Math.max(240, Math.ceil(turns * 220));
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= pointCount; i++) {
    const t = i / pointCount;
    const r = input.startRadius + (input.endRadius - input.startRadius) * t;
    const theta = -Math.PI / 2 + 2 * Math.PI * turns * t; // start at top, go clockwise in SVG coords
    const x = input.cx + r * Math.cos(theta);
    const y = input.cy + r * Math.sin(theta);
    pts.push({ x, y });
  }
  let length = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    length += Math.hypot(dx, dy);
  }
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  return { d, length };
}

function buildFlowingRingText(input: {
  text: string;
  targetChars: number;
  minChars: number;
  start: number;
}): { chunk: string; next: number } {
  const raw = (input.text || '').replace(/\s+/g, ' ').trim();
  if (!raw) return { chunk: '', next: 0 };
  const words = raw.split(' ').filter((w) => w.length > 0);
  const n = words.length;
  if (!n) return { chunk: '', next: 0 };

  const targetChars = Math.max(24, input.targetChars);
  const minChars = clamp(Math.floor(input.minChars), 0, targetChars);
  let idx = ((Math.round(input.start) % n) + n) % n;
  const out: string[] = [];
  let len = 0;

  // Build with full words only; never cut a word at the end.
  for (let guard = 0; guard < n * 60; guard++) {
    const w = words[idx];
    const add = out.length === 0 ? w.length : w.length + 1;

    if (len + add > targetChars) {
      // If no word has been added yet, allow one full word (even if long).
      if (!out.length) {
        out.push(w);
        len = w.length;
        idx = (idx + 1) % n;
      }
      break;
    }

    out.push(w);
    len += add;
    idx = (idx + 1) % n;
    if (len >= minChars && out.length >= 4) {
      const nextWord = words[idx];
      const nextAdd = (nextWord?.length || 0) + 1;
      if (len + nextAdd > targetChars) break;
    }
  }

  return { chunk: out.join(' ').trim(), next: idx };
}

function splitMultiline(text: string): string[] {
  return (text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function normalizeLyricsInput(text: string): string {
  const raw = (text || '')
    .replace(/\\n/gi, '\n')
    .replace(/\/n/gi, '\n')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');

  const sectionHeader = /^(verse(\s+\d+)?|chorus|outro|intro|bridge|pre-chorus|refrain)$/i;
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !sectionHeader.test(line.replace(/[:\-–]+$/, '').trim()));

  return lines.join(' ').replace(/\s+/g, ' ').trim();
}

function centeredMultilineText(input: {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  lineSpacing: number;
  fill: string;
  fontFamily: string;
  letterSpacing: number;
  fontWeight?: number;
}): string {
  const lines = splitMultiline(input.text);
  if (!lines.length) return '';
  const tspans = lines
    .map((line, i) => {
      const dy = i === 0 ? '0' : (input.fontSize * input.lineSpacing).toFixed(2);
      return `<tspan x="${input.x}" dy="${dy}">${svgEscape(line)}</tspan>`;
    })
    .join('');
  const fw = input.fontWeight ? ` font-weight="${input.fontWeight}"` : '';
  return `<text x="${input.x}" y="${input.y.toFixed(2)}" font-size="${input.fontSize.toFixed(2)}" fill="${input.fill}" text-anchor="middle" font-family="${input.fontFamily}" letter-spacing="${input.letterSpacing.toFixed(2)}"${fw}>${tspans}</text>`;
}

function estimateTitleGlyphUnits(text: string, fontKey: VinylParams['titleFont']): number {
  const baseUnit =
    fontKey === 'mono'
      ? 0.62
      : fontKey === 'big-shoulders'
        ? 0.57
      : fontKey === 'sans'
        ? 0.58
        : fontKey === 'prata'
          ? 0.66
          : 0.64;
  let units = 0;
  for (const ch of text) {
    if (ch === ' ') {
      units += 0.34;
      continue;
    }
    if (/[MW@#&%]/.test(ch)) {
      units += baseUnit + 0.24;
      continue;
    }
    if (/[IJ1\|']/i.test(ch)) {
      units += Math.max(0.3, baseUnit - 0.22);
      continue;
    }
    if (/[.,:;!]/.test(ch)) {
      units += 0.24;
      continue;
    }
    units += baseUnit;
  }
  return units;
}

function fitTitleSizeToArc(input: {
  text: string;
  fontKey: VinylParams['titleFont'];
  preferredSize: number;
  minSize: number;
  maxSize: number;
  arcRadius: number;
  arcSpanDeg: number;
  letterSpacing: number;
}): number {
  const preferred = clamp(input.preferredSize, input.minSize, input.maxSize);
  const raw = (input.text || '').trim();
  if (!raw) return preferred;

  const title = raw.toUpperCase();
  const arcLength = (Math.PI * 2 * input.arcRadius * input.arcSpanDeg) / 360;
  const usableLength = Math.max(0, arcLength * 0.92);
  const spacingTotal = Math.max(0, title.length - 1) * input.letterSpacing;
  const glyphUnits = estimateTitleGlyphUnits(title, input.fontKey);
  if (glyphUnits <= 0) return preferred;

  const fitted = (usableLength - spacingTotal) / glyphUnits;
  if (!Number.isFinite(fitted)) return preferred;
  return clamp(Math.min(preferred, fitted), input.minSize, input.maxSize);
}

function fontFamily(k: VinylParams['titleFont'] | VinylParams['namesFont'] | VinylParams['metaFont']): string {
  switch (k) {
    case 'big-shoulders':
      return "'Big Shoulders Display', 'Arial Narrow', 'Franklin Gothic Medium', ui-sans-serif, Arial, sans-serif";
    case 'amsterdam-four':
      return "'Amsterdam Four', 'Alex Brush', 'Great Vibes', Allura, 'Brush Script MT', cursive";
    case 'corinthia':
      return "Corinthia, 'Mrs Saint Delafield', 'Meow Script', 'Segoe Script', cursive";
    case 'meow-script':
      return "'Meow Script', Corinthia, 'Mrs Saint Delafield', 'Segoe Script', cursive";
    case 'mrs-saint-delafield':
      return "'Mrs Saint Delafield', 'Meow Script', Corinthia, 'Segoe Script', cursive";
    case 'windsong':
      return "WindSong, Sacramento, 'Meow Script', cursive";
    case 'sacramento':
      return "Sacramento, WindSong, 'Meow Script', cursive";
    case 'montez':
      return "Montez, Sacramento, WindSong, cursive";
    case 'courier-prime':
      return "'Courier Prime', 'Courier New', Courier, 'Liberation Mono', monospace";
    case 'prata':
      return "Prata, ui-serif, Georgia, Times New Roman, serif";
    case 'jimmy-script':
      return 'Allura, Great Vibes, cursive, ui-serif, Georgia, Times New Roman, serif';
    case 'signika':
      return "Signika, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
    case 'mono':
      return "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace";
    case 'serif':
      return "ui-serif, Georgia, Times New Roman, serif";
    case 'cursive':
      return 'Great Vibes, Allura, cursive, ui-serif, Georgia, Times New Roman, serif';
    case 'sans':
    default:
      return "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  }
}

type LyricsFontSpec = {
  family: string;
  weight: 300 | 400 | 500 | 600 | 700 | 800;
  style?: 'normal' | 'italic';
  uppercase?: boolean;
};

function lyricsFontSpec(preset: VinylParams['lyricsFontPreset']): LyricsFontSpec {
  // These families mirror the Vinyl UI option list.
  switch (preset) {
    case 'font-1':
      return { family: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace", weight: 500 };
    case 'font-2':
      return { family: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif", weight: 500 };
    case 'font-3':
      return { family: "'Rage Italic', 'Rouge Script', 'Brush Script MT', cursive", weight: 400, style: 'italic' };
    case 'font-4':
      return { family: "'Lucida Handwriting', 'Dancing Script', 'Segoe Script', cursive", weight: 400 };
    case 'font-5':
      return { family: "'Vladimir Script', Parisienne, 'Brush Script MT', cursive", weight: 400 };
    case 'font-6':
      return { family: "'Ink Free', 'Patrick Hand', 'Segoe Script', cursive", weight: 500 };
    case 'font-7':
      return { family: "'Viner Hand ITC', 'Permanent Marker', 'Brush Script MT', cursive", weight: 500 };
    case 'font-8':
      return { family: "'Pristina', Satisfy, 'Segoe Script', cursive", weight: 500 };
    case 'font-9':
      return { family: "'Bodoni MT', 'Bodoni Moda', Didot, 'Times New Roman', serif", weight: 500 };
    case 'font-10':
      return { family: "'Felix Titling', Cinzel, 'Copperplate Gothic Light', serif", weight: 600, uppercase: true };
    case 'font-11':
      return { family: "'Engravers MT', 'Cinzel Decorative', 'Copperplate Gothic Bold', serif", weight: 700, uppercase: true };
    case 'font-12':
      return { family: "'Algerian', 'Almendra Display', 'Copperplate Gothic Bold', serif", weight: 700, uppercase: true };
    case 'font-13':
      return { family: "'Harrington', 'Marcellus SC', 'Book Antiqua', serif", weight: 500 };
    case 'font-14':
      return { family: "'Imprint MT Shadow', 'Bungee Shade', 'Book Antiqua', serif", weight: 500 };
    case 'font-15':
    default:
      return { family: "'Poor Richard', 'IM Fell English SC', 'Palatino Linotype', serif", weight: 500 };
  }
}

export function renderVinylPosterSvg(req: VinylRequest): string {
  const v = req.vinyl;
  const showDisk = v.showDisk !== false;
  const showCenterLabel = v.showCenterLabel !== false;
  const showRuler = v.showRuler === true;
  const size = v.size;
  const spec = getVinylLayoutPreset(size);
  const { W, H, topMargin, bottomMargin, leftMargin, rightMargin, recordDiameter } = spec;

  const palette = getPalette(v.palette);
  const inkRgb = hexToRgb(v.inkColor || '');
  if (inkRgb) {
    palette.ink = `#${v.inkColor.trim().replace(/^#/, '').toLowerCase()}`;
    palette.accent = palette.ink;
    palette.mutedInk = rgba(inkRgb, 0.40);
  }

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

  const innerLeft = leftMargin;
  const innerRight = W - rightMargin;
  const diskCx = (innerLeft + innerRight) / 2;
  // Keep the disk fully inside the spec margin box.
  const maxDiskRByX = Math.min(diskCx - innerLeft, innerRight - diskCx);
  const maxDiskRByY = Math.max(1, (H - topMargin - bottomMargin) / 2);
  const maxDiskR = Math.max(1, Math.min(maxDiskRByX, maxDiskRByY));
  const minDiskR = Math.min(130, maxDiskR);
  const requestedDiskDiameter = Number.isFinite(v.diskDiameter) && v.diskDiameter > 0 ? v.diskDiameter : recordDiameter;
  const diskR = clamp(requestedDiskDiameter / 2, minDiskR, maxDiskR);
  const diskCy = topMargin + diskR;

  const innerGrooveR = diskR * 0.62;
  const labelR = diskR * 0.26;
  const holeR = Math.max(6, diskR * 0.03);

  const ringCountMax = Math.max(1, Math.round(v.ringCountMax));
  const ringFontSize = clamp(v.ringFontSize, 10, 34);
  const ringLineGap = clamp(v.ringLineGap, 0, 16);
  const ringLetterSpacing = clamp(v.ringLetterSpacing, -2, 20);
  const backgroundImage = (v.backgroundImageDataUrl || '').trim();
  const diskImage = (v.recordImageDataUrl || '').trim();
  const labelImage = (v.labelImageDataUrl || '').trim();
  const hasCustomLabelImage = showCenterLabel && labelImage.length > 0;
  const hasCustomLabelOnDisk = hasCustomLabelImage && showDisk;
  const usesLabelPresetImage = labelImage.startsWith('/vinyl/labels/label-');
  const usesEmbeddedLabelImageFit = hasCustomLabelImage && !showDisk && usesLabelPresetImage;
  const usesDiskEmbeddedLabel = showCenterLabel && !hasCustomLabelImage && diskImage.length > 0;
  const usesEmbeddedLabelLayout = usesDiskEmbeddedLabel || (hasCustomLabelImage && !showDisk);
  const showEmbeddedLabelOnly = showCenterLabel && !showDisk && usesDiskEmbeddedLabel;
  const showCenterLabelText = showCenterLabel && (showDisk || hasCustomLabelImage || usesDiskEmbeddedLabel);
  // Many uploaded record photos include a thin gray studio/background margin.
  // Slightly zoom the image inside the clip to keep only the actual vinyl edge.
  const recordImageScale = diskImage ? 1.12 : 1;
  const recordImageR = diskR * recordImageScale;

  const flowText = normalizeLyricsInput(v.outerText || '');

  // Keep lyric rings on the vinyl surface and build from inner to outer.
  const ringOuterInset = clamp(ringFontSize * 1.8 + Math.max(0, ringLetterSpacing) * 1.0 + (diskImage ? 12 : 10), 24, 82);
  // Disk presets include an embedded center label that is much larger than the old synthetic label radius.
  // Use a larger effective label radius so lyrics start outside that printed label area.
  const embeddedLabelOuterR = clamp(diskR * 0.52, labelR, Math.max(labelR, diskR - ringOuterInset - 18));
  const effectiveLabelOuterR = usesEmbeddedLabelLayout ? embeddedLabelOuterR : labelR;
  // Visual crop for "No disk" mode: keep only center label, exclude vinyl grooves.
  // 0.478 keeps label-only mode visually aligned with disk preset center-label diameter
  // after the 1.12 disk image zoom that trims source edge margins.
  const embeddedLabelVisualClipR = clamp(diskR * 0.478, labelR, embeddedLabelOuterR);
  const customLabelVisualClipR = hasCustomLabelOnDisk ? labelR : embeddedLabelVisualClipR;
  const customLabelImageDrawR = usesEmbeddedLabelImageFit ? recordImageR : customLabelVisualClipR;
  // Keep extra clearance when a raster center label is used so lyrics don't hug its outer edge.
  const ringInnerInsetBase = ringFontSize * 0.72 + Math.max(0, ringLetterSpacing) * 0.25 + 3;
  const ringInnerInsetBoost = hasCustomLabelOnDisk
    ? clamp(labelR * 0.08 + ringFontSize * 0.2, 8, 18)
    : usesEmbeddedLabelLayout
      ? clamp(ringFontSize * 0.35 + Math.max(0, ringLetterSpacing) * 0.16 + 2, 6, 16)
      : 0;
  const ringInnerInset = clamp(ringInnerInsetBase + ringInnerInsetBoost, 7, 46);
  const baseCenterR = showCenterLabel ? effectiveLabelOuterR : Math.max(holeR * 2, diskR * 0.02);
  const ringMinR = baseCenterR + ringInnerInset;
  const ringMaxR = diskR - ringOuterInset;
  const ringSpan = Math.max(0, ringMaxR - ringMinR);

  const defs: string[] = [];
  let spiralLyricsText = '';

  // Placeholder record: plain black disk until real vinyl image files are provided.
  const diskFill = '#060607';
  const customLyricsRgb = hexToRgb(v.lyricsTextColor || '');
  const ringFill = customLyricsRgb
    ? `#${(v.lyricsTextColor || '').trim().replace(/^#/, '').toLowerCase()}`
    : showDisk
      ? '#f2f2f4'
      : palette.ink;
  const ringFillLum = (() => {
    const rgb = hexToRgb(ringFill);
    return rgb ? relativeLuminance(rgb) : 0.5;
  })();
  const ringStroke = showDisk ? 'rgba(0,0,0,0.44)' : ringFillLum > 0.55 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.18)';
  const ringStrokeWidth = showDisk ? 0.95 : 0.45;
  const lyricsSpec = lyricsFontSpec(v.lyricsFontPreset);
  const lyricsCase = v.lyricsTextCase ?? 'original';

  // Keep font size, letter spacing and line gap visually stable.
  // Ring count only adds more turns outward with fixed radial pitch.
  // Do not cap by disk radius; overflow is allowed so user can tune manually.
  const radialPitch = Math.max(1, ringFontSize * 0.62 + ringLineGap * 0.9);
  // Start two full turns inward while keeping the same outer coverage.
  const spiralInnerTurns = 2;
  const spiralTurns = ringCountMax + spiralInnerTurns;
  const spiralStartR = Math.max(6, ringMinR - radialPitch * spiralInnerTurns);
  const spiralEndR = spiralStartR + spiralTurns * radialPitch;
  if (flowText && ringSpan > 2 && spiralTurns > 0.2) {
    const spiralPathId = 'lyricsSpiralPath';
    const spiral = buildSpiralPath({
      cx: diskCx,
      cy: diskCy,
      startRadius: spiralStartR,
      endRadius: spiralEndR,
      turns: spiralTurns
    });
    defs.push(`<path id="${spiralPathId}" d="${spiral.d}"/>`);

    // Build word-safe lyric text and force its visual end near 11 o'clock.
    // 12 o'clock is fixed as the reference start direction; ending slightly
    // before it gives the "completed circle" feel requested by design.
    const charAdvance = Math.max(4.2, ringFontSize * 0.56 + Math.max(0, ringLetterSpacing) * 0.95);
    const spaceAdvance = Math.max(1.8, charAdvance * 0.46);
    const endTargetOffsetDeg = 30; // 11 o'clock
    const endCircumference = Math.PI * 2 * Math.max(1, spiralEndR);
    const endTargetOffsetPx = (endCircumference * endTargetOffsetDeg) / 360;
    const endTargetDistance = Math.max(64, spiral.length - endTargetOffsetPx);
    const approxChars = Math.max(48, Math.floor((endTargetDistance * 0.985) / charAdvance));
    const minChars = Math.floor(approxChars * 0.84);
    const { chunk } = buildFlowingRingText({ text: flowText, targetChars: approxChars, minChars, start: 0 });
    const stripTrailingPunctuation = (s: string) => s.replace(/[,\.;:!?'"`’”)\]]+\s*$/g, '').trim();
    const baseText = stripTrailingPunctuation(chunk || flowText);
    const text =
      lyricsCase === 'upper' ? baseText.toUpperCase() : lyricsCase === 'lower' ? baseText.toLowerCase() : baseText;
    spiralLyricsText =
      `<text fill="${ringFill}" stroke="${ringStroke}" stroke-width="${ringStrokeWidth.toFixed(2)}" paint-order="stroke" opacity="0.93" font-size="${ringFontSize.toFixed(2)}" letter-spacing="${ringLetterSpacing.toFixed(2)}" font-family="${lyricsSpec.family}" font-weight="${lyricsSpec.weight}" font-style="${lyricsSpec.style ?? 'normal'}">` +
      `<textPath href="#${spiralPathId}" startOffset="0%" text-anchor="start" textLength="${endTargetDistance.toFixed(2)}" lengthAdjust="spacing">${svgEscape(text)}</textPath>` +
      `</text>`;
  }

  const labelEdgeStrokeW = Math.max(3, labelR * 0.07);
  const labelInnerStrokeW = Math.max(1.2, labelR * 0.014);
  const labelHubR = Math.max(holeR * 2.9, labelR * 0.29);
  const labelHubStrokeW = Math.max(1.6, labelR * 0.017);
  const labelDividerY = diskCy;
  const titleFontSize = clamp(v.titleFontSize, 8, 126);
  const titleArcWidth = clamp(v.titleArcWidth, 0.45, 0.95);
  const title = (v.title || '').trim();
  const songTitle = (v.songTitle || '').trim();
  const artist = (v.artist || '').trim();
  const labelOuterGuideR = labelR - labelEdgeStrokeW * 0.45;
  const labelInnerGuideR = labelR * 0.78;
  // IMPORTANT: Keep this placement stable.
  // Product requirement:
  // 1) Compute the "current title arc" as midpoint(outer guide ring, hub guide ring).
  // 2) Then move one step inward by taking midpoint(current title arc, hub guide ring).
  //
  // This is the exact position requested by design review:
  // - visually lower than the old outer-biased arc
  // - centered in the target band near the hub
  // - should not be "simplified" back to midpoint(outer, inner guide)
  //
  // If this ever changes, re-verify against the approved screenshot where
  // "LOVE YOU" sits closer to the inner center circle.
  const titleHubGuideR = labelHubR + labelHubStrokeW * 0.5;
  const titleArcCurrentR = (labelOuterGuideR + titleHubGuideR) * 0.5;
  const labelTitleArcDefaultR = (titleArcCurrentR + titleHubGuideR) * 0.5;
  const labelTitleArcR = hasCustomLabelOnDisk
    ? labelR * 0.72
    : usesEmbeddedLabelLayout
      ? labelR * 0.90
      : labelTitleArcDefaultR;
  const arcWidthT = (titleArcWidth - 0.45) / (0.95 - 0.45);
  const baseTitleArcSpanDeg = 94 + arcWidthT * 62;
  const centerTitleMaxSize = hasCustomLabelOnDisk
    ? labelR * 0.46
    : usesEmbeddedLabelLayout
      ? labelR * 0.506
      : labelR * 0.52;
  // Keep title size exactly at the configured size (subject to hard layout caps).
  const centerTitleSize = clamp(titleFontSize, 8, centerTitleMaxSize);
  // Prevent first/last letters from being clipped in export renderers when title text is long.
  const titleArcSpanDeg = (() => {
    if (!title) return baseTitleArcSpanDeg;
    const titleGlyphUnits = estimateTitleGlyphUnits(title.toUpperCase(), v.titleFont);
    if (!Number.isFinite(titleGlyphUnits) || titleGlyphUnits <= 0) return baseTitleArcSpanDeg;
    const spacingTotal = Math.max(0, title.length - 1) * 0.5;
    const textLength = centerTitleSize * titleGlyphUnits + spacingTotal;
    const requiredArcLength = textLength / 0.92;
    const requiredSpanDeg = (requiredArcLength * 360) / (Math.PI * 2 * Math.max(1, labelTitleArcR));
    return clamp(Math.max(baseTitleArcSpanDeg, requiredSpanDeg + 2), baseTitleArcSpanDeg, 240);
  })();
  const titleArcHalfSpan = titleArcSpanDeg * 0.5;
  const labelTitleArcStartDeg = 270 - titleArcHalfSpan;
  const labelTitleArcEndDeg = 270 + titleArcHalfSpan;
  const labelTitleArcId = 'labelTitleArc';
  if (showCenterLabelText) {
    defs.push(
      `<path id="${labelTitleArcId}" d="${arcPathD({
        cx: diskCx,
        cy: diskCy,
        r: labelTitleArcR,
        startDeg: labelTitleArcStartDeg,
        endDeg: labelTitleArcEndDeg
      })}"/>`
    );
  }

  const namesRaw = v.names || '';
  const dateLineRaw = v.dateLine || '';
  const namesUsesPlaceholder = namesRaw.trim().length === 0;
  const dateUsesPlaceholder = dateLineRaw.trim().length === 0;
  const names = namesUsesPlaceholder ? 'NAMES SURNAME' : namesRaw;
  const dateLine = dateUsesPlaceholder ? 'CITY - DATE' : dateLineRaw;

  const namesFontSize = clamp(v.namesFontSize, 10, 144);
  const dateFontSize = clamp(v.dateFontSize, 8, 135);
  const centerMetaFontSize = clamp(v.metaFontSize, 8, 120);
  const requestedSongSize = Number.isFinite(v.songFontSize) ? v.songFontSize : centerMetaFontSize;
  const requestedArtistSize = Number.isFinite(v.artistFontSize) ? v.artistFontSize : centerMetaFontSize * 0.75;
  const namesLetterSpacing = clamp(v.namesLetterSpacing, -1, 20);
  const namesLineSpacing = clamp(v.namesLineSpacing, 0.8, 3.0);
  const namesYOffset = clamp(v.namesYOffset, -260, 260);
  const dateLetterSpacing = clamp(v.dateLetterSpacing, -1, 20);
  const dateLineSpacing = clamp(v.dateLineSpacing, 0.8, 3.0);
  const dateYOffset = clamp(v.dateYOffset, -260, 260);

  const titleFont = fontFamily(v.titleFont);
  const namesFont = fontFamily(v.namesFont);
  const dateFont = fontFamily(v.dateFont);
  const centerMetaFont = fontFamily(v.metaFont);
  const centerSongSize = clamp(
    requestedSongSize,
    10,
    labelR * (hasCustomLabelOnDisk ? 0.36 : usesEmbeddedLabelLayout ? 0.255 : 0.42)
  );
  const centerArtistSize = clamp(
    requestedArtistSize,
    8,
    labelR * (hasCustomLabelOnDisk ? 0.27 : usesEmbeddedLabelLayout ? 0.188 : 0.3)
  );
  const defaultLabelTextRgb = hasCustomLabelImage || usesDiskEmbeddedLabel ? { r: 23, g: 17, b: 11 } : { r: 0, g: 0, b: 0 };
  const customLabelTextRgb = hexToRgb(v.labelTextColor || '');
  const centerTextRgb = customLabelTextRgb || defaultLabelTextRgb;
  const centerTextLum = relativeLuminance(centerTextRgb);
  const centerTitleFill = rgba(centerTextRgb, hasCustomLabelImage || usesDiskEmbeddedLabel ? 0.90 : 0.88);
  const centerSongFill = rgba(centerTextRgb, hasCustomLabelImage || usesDiskEmbeddedLabel ? 0.88 : 0.86);
  const centerArtistFill = rgba(centerTextRgb, hasCustomLabelImage || usesDiskEmbeddedLabel ? 0.74 : 0.62);
  const centerTextStroke =
    hasCustomLabelImage || usesDiskEmbeddedLabel
      ? centerTextLum > 0.62
        ? 'rgba(0,0,0,0.26)'
        : 'rgba(255,255,255,0.16)'
      : 'rgba(0,0,0,0)';
  const centerTextStrokeWidth = hasCustomLabelImage || usesDiskEmbeddedLabel ? 0.42 : 0;

  // Text layout below disk
  const namesLines = splitMultiline(names);
  const dateLines = splitMultiline(dateLine);
  const regionBottom = H - bottomMargin;
  const dateStackOffset = Math.max(0, dateLines.length - 1) * dateFontSize * dateLineSpacing;
  const namesStackOffset = Math.max(0, namesLines.length - 1) * namesFontSize * namesLineSpacing;
  const baseNamesGap = Math.max(14, dateFontSize * 1.15, namesFontSize * 0.5);
  const placeholderGapBoost = namesUsesPlaceholder || dateUsesPlaceholder ? Math.max(2, dateFontSize * 0.12) : 0;
  const namesGap = baseNamesGap + placeholderGapBoost;
  const dateY = regionBottom - dateStackOffset + dateYOffset;
  const namesY = dateY - namesGap - namesStackOffset + namesYOffset;

  const centerText: string[] = [];
  // Keep song title clear of inner hub ring with a subtle downward offset.
  const centerSongYOffset = hasCustomLabelOnDisk
    ? clamp(labelR * 0.08, 3, 10)
    : usesEmbeddedLabelLayout
      ? clamp(labelR * 0.06, 4, 13)
      : clamp(labelR * 0.05, 2, 6);
  let cy = diskCy + labelR * (hasCustomLabelOnDisk ? 0.5 : usesEmbeddedLabelLayout ? 0.90 : 0.46) + centerSongYOffset;
  const centerSongToArtistGap = hasCustomLabelOnDisk
    ? centerSongSize * 1.12
    : usesEmbeddedLabelLayout
      ? Math.max(centerSongSize * 0.95, labelR * 0.20)
      : centerSongSize * 1.18;
  if (showCenterLabelText && title) {
    centerText.push(
      `<text fill="${centerTitleFill}" stroke="${centerTextStroke}" stroke-width="${centerTextStrokeWidth.toFixed(2)}" paint-order="stroke" font-size="${centerTitleSize.toFixed(2)}" letter-spacing="0.5" font-family="${titleFont}" font-weight="800">` +
      `<textPath href="#${labelTitleArcId}" startOffset="50%" text-anchor="middle">${svgEscape(title.toUpperCase())}</textPath>` +
      `</text>`
    );
  }
  if (showCenterLabelText && songTitle) {
    centerText.push(
      `<text x="${diskCx}" y="${cy.toFixed(2)}" font-size="${centerSongSize.toFixed(2)}" fill="${centerSongFill}" stroke="${centerTextStroke}" stroke-width="${(centerTextStrokeWidth * 0.88).toFixed(2)}" paint-order="stroke" text-anchor="middle" font-family="${centerMetaFont}" font-weight="700" letter-spacing="0.6">${svgEscape(songTitle.toUpperCase())}</text>`
    );
    cy += centerSongToArtistGap;
  }
  if (showCenterLabelText && artist) {
    centerText.push(
      `<text x="${diskCx}" y="${cy.toFixed(2)}" font-size="${centerArtistSize.toFixed(2)}" fill="${centerArtistFill}" stroke="${centerTextStroke}" stroke-width="${(centerTextStrokeWidth * 0.78).toFixed(2)}" paint-order="stroke" text-anchor="middle" font-family="${centerMetaFont}" font-weight="700" letter-spacing="0.5">${svgEscape(artist.toUpperCase())}</text>`
    );
  }

  const centerGuides = '';

  const rulerOverlay = showRuler
    ? (() => {
      const cx = W / 2;
      const cy = H / 2;
      const stepPx = 7.2; // 0.1 in
      const stepsV = Math.ceil((H / 2) / stepPx);
      const stepsH = Math.ceil((W / 2) / stepPx);

      const vTicks = Array.from({ length: stepsV * 2 + 1 }, (_, i) => {
        const step = i - stepsV;
        const y = cy + step * stepPx;
        if (y < 0 || y > H) return '';
        const abs = Math.abs(step);
        const whole = abs % 10 === 0;
        const half = abs % 5 === 0 && !whole;
        const tickLen = whole ? 24 : half ? 16 : 8;
        const stroke = whole ? '#ff5e57' : half ? '#ffd166' : '#66d9ff';
        const width = whole ? 2.3 : half ? 1.7 : 1;
        const sign = step < 0 ? '-' : step > 0 ? '+' : '';
        const label = (whole || half) ? `${sign}${(abs / 10).toFixed(abs % 10 === 0 ? 0 : 1)}"` : '';
        return `<line x1="${(cx - tickLen).toFixed(2)}" y1="${y.toFixed(2)}" x2="${(cx + tickLen).toFixed(2)}" y2="${y.toFixed(2)}" stroke="${stroke}" stroke-width="${width}" opacity="0.92"/>${label ? `<text x="${(cx + tickLen + 5).toFixed(2)}" y="${(y + 4).toFixed(2)}" font-size="10" fill="${stroke}" font-family="monospace" font-weight="700" stroke="#000" stroke-width="2.4" paint-order="stroke">${label}</text>` : ''}`;
      }).join('');

      const hTicks = Array.from({ length: stepsH * 2 + 1 }, (_, i) => {
        const step = i - stepsH;
        const x = cx + step * stepPx;
        if (x < 0 || x > W) return '';
        const abs = Math.abs(step);
        const whole = abs % 10 === 0;
        const half = abs % 5 === 0 && !whole;
        const tickLen = whole ? 24 : half ? 16 : 8;
        const stroke = whole ? '#ff5e57' : half ? '#ffd166' : '#66d9ff';
        const width = whole ? 2.3 : half ? 1.7 : 1;
        const sign = step < 0 ? '-' : step > 0 ? '+' : '';
        const label = (whole || half) ? `${sign}${(abs / 10).toFixed(abs % 10 === 0 ? 0 : 1)}"` : '';
        return `<line x1="${x.toFixed(2)}" y1="${(cy - tickLen).toFixed(2)}" x2="${x.toFixed(2)}" y2="${(cy + tickLen).toFixed(2)}" stroke="${stroke}" stroke-width="${width}" opacity="0.92"/>${label ? `<text x="${(x - 12).toFixed(2)}" y="${(cy + tickLen + 14).toFixed(2)}" font-size="10" fill="${stroke}" font-family="monospace" font-weight="700" stroke="#000" stroke-width="2.4" paint-order="stroke">${label}</text>` : ''}`;
      }).join('');

      const specDiskR = recordDiameter / 2;
      const specLabelR = specDiskR * 0.26;

      const diskLabelY = diskCy - diskR - Math.max(18, diskR * 0.07);
      const labelLabelY = diskCy + labelR + Math.max(18, labelR * 0.35);
      const labelDiaHalf = labelR;
      const diskDiaIn = (diskR * 2 / 72).toFixed(2);
      const radialRulerY = diskCy;
      const radialGuideStart = diskCx - labelR;
      const radialGuideEnd = diskCx + labelR;
      const radialTickCount = 10;
      const radialLabelY = radialRulerY - Math.max(16, labelR * 0.16);
      const radialTicks = Array.from({ length: radialTickCount + 1 }, (_, i) => {
        const t = i / radialTickCount;
        const dx = labelR * t;
        const xRight = diskCx + dx;
        const xLeft = diskCx - dx;
        const major = i % 2 === 0 || i === 0 || i === radialTickCount;
        const tickLen = major ? 15 : 9;
        const stroke = major ? '#7efeff' : '#3cb9e8';
        const width = major ? 1.8 : 1.2;
        const label = major
          ? t === 0
            ? 'r0'
            : `${t.toFixed(1)}R/${(labelR * t / 72).toFixed(2)}"`
          : '';
        return `<line x1="${xRight.toFixed(2)}" y1="${(radialRulerY - tickLen).toFixed(2)}" x2="${xRight.toFixed(2)}" y2="${(radialRulerY + tickLen).toFixed(2)}" stroke="${stroke}" stroke-width="${width}" opacity="0.98"/>` +
          `<line x1="${xLeft.toFixed(2)}" y1="${(radialRulerY - tickLen).toFixed(2)}" x2="${xLeft.toFixed(2)}" y2="${(radialRulerY + tickLen).toFixed(2)}" stroke="${stroke}" stroke-width="${width}" opacity="0.98"/>` +
          (label
            ? `<text x="${(xRight + 3).toFixed(2)}" y="${radialLabelY.toFixed(2)}" font-size="9.5" fill="#7efeff" font-family="monospace" font-weight="700" stroke="#000" stroke-width="2.2" paint-order="stroke">${label}</text>`
            : '');
      }).join('');
      return `<g id="measurement-ruler-vinyl" pointer-events="none">
    <line x1="${cx.toFixed(2)}" y1="0" x2="${cx.toFixed(2)}" y2="${H.toFixed(2)}" stroke="#66d9ff" stroke-width="1.8" stroke-dasharray="3 7" opacity="0.86"/>
    <line x1="0" y1="${cy.toFixed(2)}" x2="${W.toFixed(2)}" y2="${cy.toFixed(2)}" stroke="#66d9ff" stroke-width="1.8" stroke-dasharray="3 7" opacity="0.86"/>
    ${vTicks}
    ${hTicks}
    <rect x="${innerLeft.toFixed(2)}" y="${topMargin.toFixed(2)}" width="${(innerRight - innerLeft).toFixed(2)}" height="${(H - topMargin - bottomMargin).toFixed(2)}" fill="none" stroke="#a6b7d4" stroke-width="1.1" stroke-dasharray="4 7" opacity="0.62"/>

    <circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${specDiskR.toFixed(2)}" fill="none" stroke="#00eaff" stroke-width="2.4" stroke-dasharray="2 10" opacity="0.95"/>
    <circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${diskR.toFixed(2)}" fill="none" stroke="#ffd85f" stroke-width="2.4" stroke-dasharray="16 10" opacity="0.95"/>
    <circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${specLabelR.toFixed(2)}" fill="none" stroke="#ff78f6" stroke-width="2" stroke-dasharray="2 9" opacity="0.92"/>
    <circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${labelR.toFixed(2)}" fill="none" stroke="#91ff89" stroke-width="2" stroke-dasharray="11 8" opacity="0.92"/>

    <line x1="${(diskCx - diskR).toFixed(2)}" y1="${diskCy.toFixed(2)}" x2="${(diskCx + diskR).toFixed(2)}" y2="${diskCy.toFixed(2)}" stroke="#ffd85f" stroke-width="2.2" opacity="0.96"/>
    <text x="${(diskCx + diskR + 8).toFixed(2)}" y="${(diskCy - 5).toFixed(2)}" font-size="11" fill="#ffd85f" font-family="monospace" font-weight="700" stroke="#000" stroke-width="2.6" paint-order="stroke">disk ${diskDiaIn}"</text>
    <line x1="${(diskCx - specDiskR).toFixed(2)}" y1="${diskLabelY.toFixed(2)}" x2="${(diskCx + specDiskR).toFixed(2)}" y2="${diskLabelY.toFixed(2)}" stroke="#00eaff" stroke-width="2.2" stroke-dasharray="8 7" opacity="0.96"/>
    <line x1="${(diskCx - labelDiaHalf).toFixed(2)}" y1="${labelLabelY.toFixed(2)}" x2="${(diskCx + labelDiaHalf).toFixed(2)}" y2="${labelLabelY.toFixed(2)}" stroke="#91ff89" stroke-width="1.9" opacity="0.96"/>
    <line x1="${radialGuideStart.toFixed(2)}" y1="${radialRulerY.toFixed(2)}" x2="${radialGuideEnd.toFixed(2)}" y2="${radialRulerY.toFixed(2)}" stroke="#7efeff" stroke-width="2.2" stroke-dasharray="6 6" opacity="0.98"/>
    <text x="${(radialGuideStart - 34).toFixed(2)}" y="${(radialRulerY - 7).toFixed(2)}" font-size="10" fill="#7efeff" font-family="monospace" font-weight="700" stroke="#000" stroke-width="2.2" paint-order="stroke">180deg</text>
    <text x="${(radialGuideEnd + 8).toFixed(2)}" y="${(radialRulerY - 7).toFixed(2)}" font-size="10" fill="#7efeff" font-family="monospace" font-weight="700" stroke="#000" stroke-width="2.2" paint-order="stroke">0deg</text>
    <circle cx="${diskCx.toFixed(2)}" cy="${radialRulerY.toFixed(2)}" r="2.8" fill="#7efeff" opacity="0.98"/>
    ${radialTicks}
  </g>`;
    })()
    : '';

  const texture = v.backgroundTexture ?? 'solid';
  const textureOverlays: string[] = [];
  if (texture === 'paper') {
    textureOverlays.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="${palette.ink}" opacity="0.06" filter="url(#texPaper)"/>`);
  } else if (texture === 'noise') {
    textureOverlays.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="${palette.ink}" opacity="0.05" filter="url(#texNoise)"/>`);
  } else if (texture === 'marble') {
    textureOverlays.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="${palette.ink}" opacity="0.07" filter="url(#texMarble)"/>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
  <rect x="0" y="0" width="${W}" height="${H}" fill="${palette.bg}"/>
  ${backgroundImage ? `<image href="${svgEscape(backgroundImage)}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>` : ''}
  ${textureOverlays.join('\n  ')}
  <defs>
    <filter id="texNoise" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="2" stitchTiles="stitch" />
      <feColorMatrix type="matrix" values="
        1 0 0 0 0
        0 1 0 0 0
        0 0 1 0 0
        0 0 0 0.35 0" />
    </filter>
    <filter id="texPaper" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" seed="6" stitchTiles="stitch" result="n" />
      <feColorMatrix in="n" type="matrix" values="
        1.2 0 0 0 -0.05
        0 1.2 0 0 -0.05
        0 0 1.2 0 -0.05
        0 0 0 0.45 0" result="g" />
      <feGaussianBlur in="g" stdDeviation="0.25" />
    </filter>
    <filter id="texMarble" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="turbulence" baseFrequency="0.008 0.022" numOctaves="3" seed="9" result="t" />
      <feColorMatrix in="t" type="matrix" values="
        1.6 0 0 0 -0.25
        0 1.6 0 0 -0.25
        0 0 1.6 0 -0.25
        0 0 0 0.25 0" result="m" />
      <feGaussianBlur in="m" stdDeviation="0.45" />
    </filter>
    <clipPath id="clipDisc">
      <circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${diskR.toFixed(2)}"/>
    </clipPath>
    <clipPath id="clipLabel">
      <circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${customLabelVisualClipR.toFixed(2)}"/>
    </clipPath>
    <clipPath id="clipEmbeddedLabel">
      <circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${embeddedLabelVisualClipR.toFixed(2)}"/>
    </clipPath>
    ${defs.join('\n    ')}
  </defs>

  <g>
    ${
      showDisk
        ? `<g clip-path="url(#clipDisc)">
      ${
        diskImage
          ? `<image href="${svgEscape(diskImage)}" x="${(diskCx - recordImageR).toFixed(2)}" y="${(diskCy - recordImageR).toFixed(2)}" width="${(recordImageR * 2).toFixed(2)}" height="${(recordImageR * 2).toFixed(2)}" preserveAspectRatio="xMidYMid slice" opacity="1"/>`
          : `<circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${diskR.toFixed(2)}" fill="${diskFill}"/>`
      }
    </g>`
        : ''
    }
    ${spiralLyricsText}

    ${
      showDisk
        ? `<circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${diskR.toFixed(2)}" fill="none" stroke="rgba(0,0,0,0.86)" stroke-width="8"/>
    <circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${(diskR - 10).toFixed(2)}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>`
        : ''
    }

    ${
      showCenterLabel && hasCustomLabelImage
        ? `<g clip-path="url(#clipLabel)"><image href="${svgEscape(labelImage)}" x="${(diskCx - customLabelImageDrawR).toFixed(2)}" y="${(diskCy - customLabelImageDrawR).toFixed(2)}" width="${(customLabelImageDrawR * 2).toFixed(2)}" height="${(customLabelImageDrawR * 2).toFixed(2)}" preserveAspectRatio="xMidYMid slice"/></g>`
        : showEmbeddedLabelOnly
          ? `<g clip-path="url(#clipEmbeddedLabel)"><image href="${svgEscape(diskImage)}" x="${(diskCx - recordImageR).toFixed(2)}" y="${(diskCy - recordImageR).toFixed(2)}" width="${(recordImageR * 2).toFixed(2)}" height="${(recordImageR * 2).toFixed(2)}" preserveAspectRatio="xMidYMid slice" opacity="1"/></g>`
        : ''
    }
    ${centerGuides}
    ${centerText.join('\n    ')}
    ${showCenterLabel ? `<circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${holeR.toFixed(2)}" fill="${diskFill}" stroke="rgba(0,0,0,0.55)" stroke-width="2"/>` : ''}
  </g>

  <g>
    ${centeredMultilineText({
      text: names,
      x: W / 2,
      y: namesY,
      fontSize: namesFontSize,
      lineSpacing: namesLineSpacing,
      fill: namesUsesPlaceholder ? rgba(centerTextRgb, 0.58) : rgba(centerTextRgb, 0.90),
      fontFamily: namesFont,
      letterSpacing: namesLetterSpacing
    })}
    ${centeredMultilineText({
      text: dateLine,
      x: W / 2,
      y: dateY,
      fontSize: dateFontSize,
      lineSpacing: dateLineSpacing,
      fill: dateUsesPlaceholder ? rgba(centerTextRgb, 0.56) : rgba(centerTextRgb, 0.84),
      fontFamily: dateFont,
      letterSpacing: dateLetterSpacing,
      fontWeight: 600
    })}
  </g>
  ${rulerOverlay}
</svg>`;
}
