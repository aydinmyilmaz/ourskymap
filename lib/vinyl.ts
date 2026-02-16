import type { VinylRequest, VinylParams } from './types';

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
    case 'navy-gold':
      return { bg: '#151c2d', ink: '#f4c25b', mutedInk: 'rgba(244,194,91,0.35)', accent: '#f4c25b' };
    case 'night-gold':
      return { bg: '#24283a', ink: '#fbab29', mutedInk: 'rgba(251,171,41,0.35)', accent: '#fbab29' };
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
    case 'midnight':
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

function buildFlowingRingText(input: { text: string; targetChars: number; start: number }): { chunk: string; next: number } {
  const raw = (input.text || '').replace(/\s+/g, ' ').trim();
  if (!raw) return { chunk: '', next: 0 };
  const words = raw.split(' ').filter((w) => w.length > 0);
  const n = words.length;
  if (!n) return { chunk: '', next: 0 };

  const targetChars = Math.max(40, input.targetChars);
  let idx = ((Math.round(input.start) % n) + n) % n;
  const startIdx = idx;
  const out: string[] = [];
  let len = 0;

  for (let guard = 0; guard < n * 3; guard++) {
    const w = words[idx];
    const add = out.length === 0 ? w.length : w.length + 1;
    const isLongEnough = len >= Math.floor(targetChars * 0.82) && out.length >= 6;
    if (len + add > targetChars && isLongEnough) break;
    out.push(w);
    len += add;
    idx = (idx + 1) % n;
    if (idx === startIdx && out.length >= 8) break;
  }

  return { chunk: out.join(' ').trim(), next: idx };
}

function wrapTextToLines(text: string, maxChars: number): string[] {
  const t = (text || '').trim();
  if (!t) return [];
  if (t.includes('\n')) {
    return t
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }

  const words = t.split(/\s+/g);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function repeatToMinLength(s: string, minLen: number): string {
  const base = s.trim();
  if (!base) return '';
  let out = base;
  const sep = ' • ';
  while (out.length < minLen) out = `${out}${sep}${base}`;
  return out;
}

function splitMultiline(text: string): string[] {
  return (text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
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

function fontFamily(k: VinylParams['titleFont'] | VinylParams['namesFont'] | VinylParams['metaFont']): string {
  switch (k) {
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

export function renderVinylPosterSvg(req: VinylRequest): string {
  const v = req.vinyl;
  const size = v.size;
  const W = size === '16x20' ? 16 * 72 : size === '20x20' ? 20 * 72 : size === 'square' ? 1024 : 595;
  const H = size === '16x20' ? 20 * 72 : size === '20x20' ? 20 * 72 : size === 'square' ? 1024 : 842;

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

  const margin = size === '16x20' || size === '20x20' ? 72 : size === 'square' ? 70 : 48;
  const diskDiameter = clamp(v.diskDiameter, 260, Math.min(W, H) - 2 * margin);
  const diskR = diskDiameter / 2;
  const diskCx = W / 2;
  const diskCy = size === 'square' ? H * 0.42 : size === 'a4' ? H * 0.33 : H * 0.36;

  const innerGrooveR = diskR * 0.62;
  const labelR = diskR * 0.26;
  const holeR = Math.max(6, diskR * 0.03);

  const ringCountMax = clamp(Math.round(v.ringCountMax), 1, 16);
  const ringFontSize = clamp(v.ringFontSize, 8, 28);
  const ringLineGap = clamp(v.ringLineGap, 0, 16);
  const ringLetterSpacing = clamp(v.ringLetterSpacing, -2, 20);
  const diskImage = (v.recordImageDataUrl || '').trim();
  const labelImage = (v.labelImageDataUrl || '').trim();
  // Many uploaded record photos include a thin gray studio/background margin.
  // Slightly zoom the image inside the clip to keep only the actual vinyl edge.
  const recordImageScale = diskImage ? 1.12 : 1;
  const recordImageR = diskR * recordImageScale;

  const flowText = (v.outerText || '').trim();
  const hasManualLines = flowText.includes('\n');
  const rawLines = hasManualLines ? wrapTextToLines(flowText, 120) : [];
  const ringLines = hasManualLines ? rawLines.slice(0, ringCountMax) : [];

  const lineHeight = ringFontSize + ringLineGap;
  // Keep lyric rings visibly on the dark vinyl surface, not on the outer paper/background.
  const ringOuterInset = clamp(ringFontSize * 2.4 + Math.max(0, ringLetterSpacing) * 1.1 + (diskImage ? 14 : 10), 34, 96);
  const ringStartR = diskR - ringOuterInset;

  const defs: string[] = [];
  const ringText: string[] = [];

  // Vinyl disk colors (disc is always dark; text/lines adapt for contrast).
  const diskFill = '#0b0b0d';
  const diskInk = effectiveInkRgb && relativeLuminance(effectiveInkRgb) < 0.42 ? '#f6f6f7' : palette.ink;
  const diskMutedInk = diskInk === palette.ink ? palette.mutedInk : 'rgba(246,246,247,0.40)';
  const ringFill = relativeLuminance(hexToRgb(diskInk) || { r: 246, g: 246, b: 247 }) < 0.5 ? '#f2f2f4' : diskInk;
  const ringStroke = diskImage ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.30)';
  const ringStrokeWidth = diskImage ? 0.95 : 0.75;

  const grooves: string[] = [];
  const grooveStart = labelR * 1.2;
  const grooveEnd = diskR - 24;
  const grooveStep = 6.0;
  for (let rr = grooveStart; rr <= grooveEnd; rr += grooveStep) {
    const a = 0.02 + 0.015 * (Math.sin(rr * 0.06) * 0.5 + 0.5);
    grooves.push(
      `<circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${rr.toFixed(2)}" fill="none" stroke="rgba(255,255,255,${a.toFixed(3)})" stroke-width="1"/>`
    );
  }

  for (let i = 0; i < ringLines.length; i++) {
    const r = ringStartR - i * lineHeight;
    if (r <= innerGrooveR + 8) break;
    const id = `ringPath${i}`;
    defs.push(`<path id="${id}" d="${circlePathD(diskCx, diskCy, r)}"/>`);

    const approxChars = Math.max(80, Math.floor((2 * Math.PI * r) / (ringFontSize * 0.6)));
    const text = repeatToMinLength(ringLines[i], approxChars);

    ringText.push(
      `<text fill="${ringFill}" stroke="${ringStroke}" stroke-width="${ringStrokeWidth.toFixed(2)}" paint-order="stroke" opacity="0.93" font-size="${ringFontSize.toFixed(2)}" letter-spacing="${ringLetterSpacing.toFixed(2)}" font-family="${fontFamily('sans')}" font-weight="600">` +
      `<textPath href="#${id}" startOffset="50%" text-anchor="middle">${svgEscape(text)}</textPath>` +
      `</text>`
    );
  }

  // Auto-flow mode: split the lyrics into consecutive chunks for each ring.
  if (!hasManualLines) {
    let cursor = 0;
    for (let i = 0; i < ringCountMax; i++) {
      const r = ringStartR - i * lineHeight;
      if (r <= innerGrooveR + 8) break;
      const id = `ringPath${defs.length}`;
      defs.push(`<path id="${id}" d="${circlePathD(diskCx, diskCy, r)}"/>`);
      const approxChars = Math.max(90, Math.floor((2 * Math.PI * r) / (ringFontSize * 0.6)));
      const { chunk, next } = buildFlowingRingText({ text: flowText, targetChars: approxChars, start: cursor });
      if (!chunk) break;
      cursor = next;
      const text = repeatToMinLength(chunk, approxChars);
      ringText.push(
        `<text fill="${ringFill}" stroke="${ringStroke}" stroke-width="${ringStrokeWidth.toFixed(2)}" paint-order="stroke" opacity="0.93" font-size="${ringFontSize.toFixed(2)}" letter-spacing="${ringLetterSpacing.toFixed(2)}" font-family="${fontFamily('sans')}" font-weight="600">` +
        `<textPath href="#${id}" startOffset="50%" text-anchor="middle">${svgEscape(text)}</textPath>` +
        `</text>`
      );
    }
  }

  const labelFill = '#efe3cf';
  const labelPaper = bgRgb && relativeLuminance(bgRgb) > 0.62 ? '#f3e8d7' : '#e7d9c5';
  const labelEdgeStrokeW = Math.max(3, labelR * 0.07);
  const labelInnerStrokeW = Math.max(1.2, labelR * 0.014);
  const labelHubR = Math.max(holeR * 2.9, labelR * 0.29);
  const labelHubStrokeW = Math.max(1.6, labelR * 0.017);
  const labelDividerY = diskCy;
  const titleArcWidth = clamp(v.titleArcWidth, 0.45, 0.95);
  const labelTitleArcR = labelR * titleArcWidth;
  const labelTitleY = diskCy - labelR * 0.10;
  const titleArcCurvature = clamp(v.titleArcCurvature, 0.15, 1.4);
  const labelTitleArcControlY = labelTitleY - labelR * titleArcCurvature;
  const labelTitleArcId = 'labelTitleArc';
  defs.push(
    `<path id="${labelTitleArcId}" d="M ${(diskCx - labelTitleArcR).toFixed(2)} ${labelTitleY.toFixed(2)} Q ${diskCx.toFixed(2)} ${labelTitleArcControlY.toFixed(2)} ${(diskCx + labelTitleArcR).toFixed(2)} ${labelTitleY.toFixed(2)}"/>`
  );

  const title = (v.title || '').trim();
  const songTitle = (v.songTitle || '').trim();
  const artist = (v.artist || '').trim();
  const names = v.names || '';
  const dateLine = v.dateLine || '';
  const showCenterGuides = !!v.showCenterGuides;

  const titleFontSize = clamp(v.titleFontSize, 10, 120);
  const namesFontSize = clamp(v.namesFontSize, 10, 120);
  const dateFontSize = clamp(v.dateFontSize, 8, 80);
  const centerMetaFontSize = clamp(v.metaFontSize, 8, 80);
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
  const centerTitleSize = clamp(titleFontSize, 12, labelR * 0.52);
  const centerSongSize = clamp(centerMetaFontSize, 10, labelR * 0.28);
  const centerArtistSize = clamp(centerMetaFontSize * 0.72, 8, labelR * 0.20);

  // Text layout below disk
  const belowTop = diskCy + diskR + 40;
  const belowAvailable = H - margin - belowTop;
  const belowAnchorY = belowTop + Math.max(0, belowAvailable * 0.35);
  const namesY = belowAnchorY + namesYOffset;
  const dateY = belowAnchorY + dateYOffset;

  const centerText: string[] = [];
  let cy = diskCy + labelR * 0.46;
  if (title) {
    centerText.push(
      `<text fill="rgba(0,0,0,0.88)" font-size="${centerTitleSize.toFixed(2)}" letter-spacing="0.5" font-family="${titleFont}" font-weight="800">` +
      `<textPath href="#${labelTitleArcId}" startOffset="50%" text-anchor="middle">${svgEscape(title.toUpperCase())}</textPath>` +
      `</text>`
    );
  }
  if (songTitle) {
    centerText.push(
      `<text x="${diskCx}" y="${cy.toFixed(2)}" font-size="${centerSongSize.toFixed(2)}" fill="rgba(0,0,0,0.86)" text-anchor="middle" font-family="${centerMetaFont}" font-weight="700" letter-spacing="0.6">${svgEscape(songTitle.toUpperCase())}</text>`
    );
    cy += centerSongSize * 1.18;
  }
  if (artist) {
    centerText.push(
      `<text x="${diskCx}" y="${cy.toFixed(2)}" font-size="${centerArtistSize.toFixed(2)}" fill="rgba(0,0,0,0.62)" text-anchor="middle" font-family="${centerMetaFont}" font-weight="700" letter-spacing="0.5">${svgEscape(artist.toUpperCase())}</text>`
    );
  }

  const centerGuides = showCenterGuides
    ? [
        `<line x1="${(diskCx - labelR).toFixed(2)}" y1="${diskCy.toFixed(2)}" x2="${(diskCx + labelR).toFixed(2)}" y2="${diskCy.toFixed(2)}" stroke="rgba(0,0,0,0.28)" stroke-width="1"/>`,
        `<line x1="${diskCx.toFixed(2)}" y1="${(diskCy - labelR).toFixed(2)}" x2="${diskCx.toFixed(2)}" y2="${(diskCy + labelR).toFixed(2)}" stroke="rgba(0,0,0,0.28)" stroke-width="1"/>`
      ].join('')
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
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect x="0" y="0" width="${W}" height="${H}" fill="${palette.bg}"/>
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
    <filter id="labelPaper" x="-15%" y="-15%" width="130%" height="130%">
      <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="11" result="n" />
      <feColorMatrix in="n" type="matrix" values="
        1 0 0 0 0
        0 1 0 0 0
        0 0 1 0 0
        0 0 0 0.20 0" />
      <feGaussianBlur stdDeviation="0.35" />
    </filter>
    <filter id="labelDust" x="-15%" y="-15%" width="130%" height="130%">
      <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed="17" result="n" />
      <feColorMatrix in="n" type="matrix" values="
        0 0 0 0 0.22
        0 0 0 0 0.14
        0 0 0 0 0.08
        0 0 0 0.24 0" result="d" />
      <feGaussianBlur in="d" stdDeviation="0.25" />
    </filter>
    <radialGradient id="labelTint" cx="48%" cy="44%" r="64%">
      <stop offset="0%" stop-color="#f0e3cf"/>
      <stop offset="62%" stop-color="#e6d3ba"/>
      <stop offset="100%" stop-color="#cfb89b"/>
    </radialGradient>
    <radialGradient id="discGrad" cx="38%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#1a1b1f"/>
      <stop offset="38%" stop-color="#0f1014"/>
      <stop offset="72%" stop-color="#0b0b0d"/>
      <stop offset="100%" stop-color="#050506"/>
    </radialGradient>
    <radialGradient id="discVignette" cx="50%" cy="50%" r="50%">
      <stop offset="58%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="82%" stop-color="#000000" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.56"/>
    </radialGradient>
    <clipPath id="clipDisc">
      <circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${diskR.toFixed(2)}"/>
    </clipPath>
    <clipPath id="clipLabel">
      <circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${labelR.toFixed(2)}"/>
    </clipPath>
    ${defs.join('\n    ')}
  </defs>

  <g>
    <g clip-path="url(#clipDisc)">
      ${
        diskImage
          ? `<image href="${svgEscape(diskImage)}" x="${(diskCx - recordImageR).toFixed(2)}" y="${(diskCy - recordImageR).toFixed(2)}" width="${(recordImageR * 2).toFixed(2)}" height="${(recordImageR * 2).toFixed(2)}" preserveAspectRatio="xMidYMid slice" opacity="1"/>`
          : `<circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${diskR.toFixed(2)}" fill="url(#discGrad)" opacity="0.98"/>`
      }
      ${diskImage ? `<circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${(innerGrooveR * 0.98).toFixed(2)}" fill="rgba(0,0,0,0.20)"/>` : ''}
      ${diskImage ? '' : grooves.join('\n      ')}
      <circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${diskR.toFixed(2)}" fill="url(#discVignette)"/>
      ${ringText.join('\n      ')}
      ${diskImage ? '' : `<circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${(diskR * 0.92).toFixed(2)}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="18"/>`}
    </g>

    ${
      diskImage
        ? ''
        : `<circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${diskR.toFixed(2)}" fill="none" stroke="rgba(6,6,8,0.92)" stroke-width="9"/>`
    }
    ${
      diskImage
        ? ''
        : `<circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${(diskR - 16).toFixed(2)}" fill="none" stroke="rgba(255,255,255,0.11)" stroke-width="2.3"/>`
    }
    ${diskImage ? '' : `<circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${innerGrooveR.toFixed(2)}" fill="none" stroke="${diskMutedInk}" stroke-width="1.1" opacity="0.35"/>`}

    ${
      labelImage
        ? `<g clip-path="url(#clipLabel)"><image href="${svgEscape(labelImage)}" x="${(diskCx - labelR).toFixed(2)}" y="${(diskCy - labelR).toFixed(2)}" width="${(labelR * 2).toFixed(2)}" height="${(labelR * 2).toFixed(2)}" preserveAspectRatio="xMidYMid slice"/></g>`
        : `<circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${labelR.toFixed(2)}" fill="${labelPaper}" opacity="0.98" filter="url(#labelPaper)"/>`
    }
    <circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${labelR.toFixed(2)}" fill="url(#labelTint)" opacity="${labelImage ? '0.60' : '0.95'}"/>
    <g clip-path="url(#clipLabel)">
      <circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${labelR.toFixed(2)}" fill="${labelFill}" opacity="${labelImage ? '0.10' : '0.18'}" filter="url(#labelDust)"/>
    </g>
    <circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${(labelR - labelEdgeStrokeW * 0.45).toFixed(2)}" fill="none" stroke="rgba(0,0,0,0.82)" stroke-width="${labelEdgeStrokeW.toFixed(2)}"/>
    <circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${(labelR * 0.78).toFixed(2)}" fill="none" stroke="rgba(0,0,0,0.40)" stroke-width="${labelInnerStrokeW.toFixed(2)}"/>
    <line x1="${(diskCx - labelR * 0.94).toFixed(2)}" y1="${labelDividerY.toFixed(2)}" x2="${(diskCx + labelR * 0.94).toFixed(2)}" y2="${labelDividerY.toFixed(2)}" stroke="rgba(0,0,0,0.62)" stroke-width="${Math.max(1.2, labelR * 0.016).toFixed(2)}"/>
    <circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${labelHubR.toFixed(2)}" fill="none" stroke="rgba(0,0,0,0.58)" stroke-width="${labelHubStrokeW.toFixed(2)}"/>
    ${centerGuides}
    ${centerText.join('\n    ')}
    <circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${holeR.toFixed(2)}" fill="${diskFill}" stroke="rgba(0,0,0,0.55)" stroke-width="2"/>
  </g>

  <g>
    ${centeredMultilineText({
      text: names,
      x: W / 2,
      y: namesY,
      fontSize: namesFontSize,
      lineSpacing: namesLineSpacing,
      fill: palette.accent,
      fontFamily: namesFont,
      letterSpacing: namesLetterSpacing
    })}
    ${centeredMultilineText({
      text: dateLine,
      x: W / 2,
      y: dateY,
      fontSize: dateFontSize,
      lineSpacing: dateLineSpacing,
      fill: palette.ink,
      fontFamily: dateFont,
      letterSpacing: dateLetterSpacing,
      fontWeight: 600
    })}
  </g>
</svg>`;
}
