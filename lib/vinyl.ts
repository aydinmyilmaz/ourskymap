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

function fontFamily(k: VinylParams['titleFont'] | VinylParams['namesFont'] | VinylParams['metaFont']): string {
  switch (k) {
    case 'prata':
      return "Prata, ui-serif, Georgia, Times New Roman, serif";
    case 'jimmy-script':
      return "Jimmy Script, cursive, ui-serif, Georgia, Times New Roman, serif";
    case 'signika':
      return "Signika, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
    case 'mono':
      return "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace";
    case 'serif':
      return "ui-serif, Georgia, Times New Roman, serif";
    case 'cursive':
      return "cursive, ui-serif, Georgia, Times New Roman, serif";
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

  const rawLines = wrapTextToLines(v.outerText || '', 120);
  const ringLines = rawLines.slice(0, ringCountMax);

  const lineHeight = ringFontSize + ringLineGap;
  const ringStartR = diskR - 18;

  const defs: string[] = [];
  const ringText: string[] = [];

  // Vinyl disk colors (disc is always dark; text/lines adapt for contrast).
  const diskFill = '#0b0b0d';
  const diskInk =
    effectiveInkRgb && relativeLuminance(effectiveInkRgb) < 0.42 ? '#f6f6f7' : palette.ink;
  const diskMutedInk =
    diskInk === palette.ink ? palette.mutedInk : 'rgba(246,246,247,0.40)';

  for (let i = 0; i < ringLines.length; i++) {
    const r = ringStartR - i * lineHeight;
    if (r <= innerGrooveR + 8) break;
    const id = `ringPath${i}`;
    defs.push(`<path id="${id}" d="${circlePathD(diskCx, diskCy, r)}"/>`);

    const approxChars = Math.max(80, Math.floor((2 * Math.PI * r) / (ringFontSize * 0.6)));
    const text = repeatToMinLength(ringLines[i], approxChars);

    ringText.push(
      `<text fill="${diskInk}" opacity="0.92" font-size="${ringFontSize.toFixed(2)}" letter-spacing="${ringLetterSpacing.toFixed(2)}" font-family="${fontFamily('sans')}">` +
        `<textPath href="#${id}" startOffset="50%" text-anchor="middle">${svgEscape(text.toUpperCase())}</textPath>` +
        `</text>`
    );
  }

  const labelFill = '#efe3cf';
  const labelPaper = bgRgb && relativeLuminance(bgRgb) > 0.62 ? '#f3e8d7' : '#e7d9c5';

  const title = (v.title || '').trim();
  const songTitle = (v.songTitle || '').trim();
  const artist = (v.artist || '').trim();
  const names = (v.names || '').trim();
  const dateLine = (v.dateLine || '').trim();
  const showCenterGuides = !!v.showCenterGuides;

  const titleFontSize = clamp(v.titleFontSize, 10, 120);
  const namesFontSize = clamp(v.namesFontSize, 10, 120);
  const metaFontSize = clamp(v.metaFontSize, 8, 80);

  const titleFont = fontFamily(v.titleFont);
  const namesFont = fontFamily(v.namesFont);
  const metaFont = fontFamily(v.metaFont);

  // Text layout below disk
  const belowTop = diskCy + diskR + 40;
  const belowAvailable = H - margin - belowTop;
  const namesY = belowTop + Math.max(0, belowAvailable * 0.35);
  const dateY = namesY + metaFontSize * 1.2;

  const centerText: string[] = [];
  let cy = diskCy - labelR * 0.35;
  if (title) {
    centerText.push(
      `<text x="${diskCx}" y="${cy.toFixed(2)}" font-size="${(metaFontSize * 0.95).toFixed(2)}" fill="${diskFill}" text-anchor="middle" font-family="${metaFont}" font-weight="800" letter-spacing="1">${svgEscape(title.toUpperCase())}</text>`
    );
    cy += metaFontSize * 1.15;
  }
  if (songTitle) {
    centerText.push(
      `<text x="${diskCx}" y="${cy.toFixed(2)}" font-size="${(metaFontSize * 0.78).toFixed(2)}" fill="${diskFill}" text-anchor="middle" font-family="${metaFont}" font-weight="700" opacity="0.9">${svgEscape(songTitle.toUpperCase())}</text>`
    );
    cy += metaFontSize * 1.05;
  }
  if (artist) {
    centerText.push(
      `<text x="${diskCx}" y="${cy.toFixed(2)}" font-size="${(metaFontSize * 0.70).toFixed(2)}" fill="rgba(0,0,0,0.60)" text-anchor="middle" font-family="${metaFont}" font-weight="700">${svgEscape(artist.toUpperCase())}</text>`
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
    ${defs.join('\n    ')}
  </defs>

  <g>
    <circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${diskR.toFixed(2)}" fill="${diskFill}" stroke="${diskInk}" stroke-width="10" opacity="0.96"/>
    <circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${(diskR - 16).toFixed(2)}" fill="none" stroke="${diskInk}" stroke-width="2.5" opacity="0.35"/>
    <circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${innerGrooveR.toFixed(2)}" fill="none" stroke="${diskMutedInk}" stroke-width="1.1" opacity="0.35"/>
    ${ringText.join('\n    ')}

    <circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${labelR.toFixed(2)}" fill="${labelPaper}" opacity="0.98" filter="url(#labelPaper)"/>
    <circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${labelR.toFixed(2)}" fill="${labelFill}" stroke="rgba(0,0,0,0.45)" stroke-width="2" opacity="0.95"/>
    ${centerGuides}
    ${centerText.join('\n    ')}
    <circle cx="${diskCx.toFixed(2)}" cy="${diskCy.toFixed(2)}" r="${holeR.toFixed(2)}" fill="${diskFill}" stroke="rgba(0,0,0,0.55)" stroke-width="2"/>
  </g>

  <g>
    ${
      names
        ? `<text x="${W / 2}" y="${namesY.toFixed(2)}" font-size="${namesFontSize.toFixed(2)}" fill="${palette.accent}" text-anchor="middle" font-family="${namesFont}">${svgEscape(names)}</text>`
        : ''
    }
    ${
      dateLine
        ? `<text x="${W / 2}" y="${dateY.toFixed(2)}" font-size="${metaFontSize.toFixed(2)}" fill="${palette.ink}" text-anchor="middle" font-family="${metaFont}" font-weight="600" letter-spacing="1">${svgEscape(dateLine.toUpperCase())}</text>`
        : ''
    }
  </g>
</svg>`;
}
