export type AgePosterSize = 'a4' | 'square' | '16x20' | '20x20' | '20x16';

export type AgeMosaicParams = {
  size: AgePosterSize;
  ageText: string; // e.g. "70"
  ageFontFamily: string; // CSS font-family string
  ageFontWeight: number;
  ageFontSize: number;
  ageY: number;
  tileSize: number;
  tileGap: number;
  tileBleed: number; // image oversize factor (0..0.5)
  imageFit: 'cover' | 'contain'; // cover=crop (slice), contain=fit (meet)
  imageJitter: number; // 0..1 (only for cover)
  containFill: 'solid' | 'blur'; // when imageFit=contain, fill bars
  tileLayout: 'grid' | 'stagger'; // stagger offsets every other row
  tilePositionJitter: number; // px (random tile position offset)
  bgColor: string;
  frame: boolean;
  frameInset: number;
  frameWidth: number;
  frameColor: string;
  caption: string;
  captionFontFamily: string;
  captionFontWeight: number;
  captionFontSize: number;
  captionLetterSpacing: number; // px
  captionLineSpacing: number; // 0.8..2.5 (multiline)
  captionUppercase: boolean;
  captionBoxWidthPct: number; // 0.4..1.0 (fraction of poster width)
  captionBoxHeightLines: number; // 1..12 (clip height in "lines")
  captionMaxLines: number; // 1..8
  captionAutoWrap: boolean;
  captionY: number;
  subCaption: string;
  subCaptionFontFamily: string;
  subCaptionFontWeight: number;
  subCaptionFontSize: number;
  subCaptionLetterSpacing: number; // px
  subCaptionLineSpacing: number; // 0.8..2.5 (multiline)
  subCaptionUppercase: boolean;
  subCaptionBoxWidthPct: number; // 0.4..1.0
  subCaptionBoxHeightLines: number; // 1..14
  subCaptionMaxLines: number; // 1..10
  subCaptionAutoWrap: boolean;
  subCaptionY: number;
  inkColor: string; // used for text
};

function svgEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function dims(size: AgePosterSize): { W: number; H: number; margin: number } {
  const W = size === '16x20' ? 16 * 72 : size === '20x20' || size === '20x16' ? 20 * 72 : size === 'square' ? 1024 : 595;
  const H = size === '16x20' ? 20 * 72 : size === '20x20' ? 20 * 72 : size === '20x16' ? 16 * 72 : size === 'square' ? 1024 : 842;
  const margin = size === '16x20' || size === '20x20' || size === '20x16' ? 72 : size === 'square' ? 70 : 48;
  return { W, H, margin };
}

function hash32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rand01(seed: number): number {
  // xorshift32
  let x = seed >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return ((x >>> 0) % 100000) / 100000;
}

function isValidHexColor(s: string): boolean {
  const h = s.trim().replace(/^#/, '');
  return /^[0-9a-fA-F]{6}$/.test(h);
}

function splitTextareaLines(s: string): string[] {
  const raw = (s || '').replace(/\r\n/g, '\n').split('\n');
  // Keep user's explicit line breaks, but trim line edges for cleaner output.
  const lines = raw.map((l) => l.trim());
  // Remove trailing empty lines (common when textarea ends with newline).
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function renderMultilineText(input: {
  x: number;
  y: number;
  lines: string[];
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  fill: string;
  letterSpacingPx: number;
  lineSpacing: number;
  opacity?: number;
}): string {
  if (!input.lines.length) return '';
  if (input.lines.length === 1) {
    return `<text x="${input.x.toFixed(2)}" y="${input.y.toFixed(2)}" text-anchor="middle" font-family="${svgEscape(
      input.fontFamily
    )}" font-weight="${Math.round(input.fontWeight)}" font-size="${input.fontSize.toFixed(2)}" fill="${input.fill}" letter-spacing="${input.letterSpacingPx.toFixed(
      2
    )}"${typeof input.opacity === 'number' ? ` opacity="${input.opacity.toFixed(3)}"` : ''}>${svgEscape(input.lines[0])}</text>`;
  }

  const lh = clamp(input.lineSpacing, 0.8, 2.5) * input.fontSize;
  const tspans = input.lines
    .map((l, idx) => {
      const dy = idx === 0 ? 0 : lh;
      return `<tspan x="${input.x.toFixed(2)}" dy="${dy.toFixed(2)}">${svgEscape(l)}</tspan>`;
    })
    .join('');

  return `<text x="${input.x.toFixed(2)}" y="${input.y.toFixed(2)}" text-anchor="middle" font-family="${svgEscape(
    input.fontFamily
  )}" font-weight="${Math.round(input.fontWeight)}" font-size="${input.fontSize.toFixed(2)}" fill="${input.fill}" letter-spacing="${input.letterSpacingPx.toFixed(
    2
  )}"${typeof input.opacity === 'number' ? ` opacity="${input.opacity.toFixed(3)}"` : ''}>${tspans}</text>`;
}

function wrapTextareaLinesByChars(input: { lines: string[]; maxChars: number; maxLines: number }): string[] {
  const maxChars = Math.max(5, Math.floor(input.maxChars));
  const maxLines = Math.max(1, Math.floor(input.maxLines));
  const out: string[] = [];

  const pushLine = (s: string) => {
    if (out.length >= maxLines) return;
    out.push(s);
  };

  const pushEllipsis = () => {
    if (!out.length) return;
    const last = out[out.length - 1] || '';
    const trimmed = last.replace(/\s+$/g, '');
    out[out.length - 1] = trimmed.length >= 1 ? `${trimmed.slice(0, Math.max(1, maxChars - 1))}…` : '…';
  };

  const wrapSingleLine = (line: string): string[] => {
    const t = line.trim();
    if (!t) return [''];
    const words = t.split(/\s+/g);
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      if (!cur) {
        if (w.length <= maxChars) cur = w;
        else {
          let rest = w;
          while (rest.length) {
            const chunk = rest.slice(0, maxChars);
            rest = rest.slice(maxChars);
            if (rest.length) lines.push(chunk);
            else cur = chunk;
          }
        }
      } else {
        const cand = `${cur} ${w}`;
        if (cand.length <= maxChars) cur = cand;
        else {
          lines.push(cur);
          cur = '';
          if (w.length <= maxChars) cur = w;
          else {
            let rest = w;
            while (rest.length) {
              const chunk = rest.slice(0, maxChars);
              rest = rest.slice(maxChars);
              if (rest.length) lines.push(chunk);
              else cur = chunk;
            }
          }
        }
      }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  };

  let truncated = false;
  for (const rawLine of input.lines) {
    if (out.length >= maxLines) break;
    const wrapped = wrapSingleLine(rawLine);
    for (const w of wrapped) {
      if (out.length >= maxLines) {
        truncated = true;
        break;
      }
      pushLine(w);
    }
    if (out.length >= maxLines && wrapped.length) {
      // if we had more content in this line, mark as truncated
      const lastWrapped = wrapped[wrapped.length - 1] ?? '';
      if (lastWrapped && rawLine.trim().length > lastWrapped.length) truncated = true;
    }
  }

  if (out.length > maxLines) return out.slice(0, maxLines);
  if (truncated && out.length) pushEllipsis();
  return out;
}

export function renderAgeMosaicSvg(input: { params: AgeMosaicParams; images: string[] }): string {
  const p = input.params;
  const { W, H, margin } = dims(p.size);

  const ageText = (p.ageText || '').trim() || '70';

  const tileSize = clamp(p.tileSize, 16, 220);
  const tileGap = clamp(p.tileGap, 0, 24);
  const tileBleed = clamp(p.tileBleed, 0, 0.6);
  const imageFit: 'cover' | 'contain' = p.imageFit === 'contain' ? 'contain' : 'cover';
  const imageJitter = clamp(typeof p.imageJitter === 'number' ? p.imageJitter : 1, 0, 1);
  const containFill: 'solid' | 'blur' = p.containFill === 'solid' ? 'solid' : 'blur';
  const tileLayout: 'grid' | 'stagger' = p.tileLayout === 'stagger' ? 'stagger' : 'grid';
  const tilePositionJitter = clamp(typeof p.tilePositionJitter === 'number' ? p.tilePositionJitter : 0, 0, tileSize * 0.35);

  const ageFontSize = clamp(p.ageFontSize, 120, Math.min(W, H) * 0.9);
  const ageY = clamp(p.ageY, margin + ageFontSize * 0.35, H - margin - ageFontSize * 0.25);

  const captionY = clamp(p.captionY, ageY + ageFontSize * 0.30, H - margin);
  const subCaptionY = clamp(p.subCaptionY, captionY + 18, H - margin);

  const bgColor = p.bgColor || '#ffffff';
  const inkColor = isValidHexColor(p.inkColor) ? `#${p.inkColor.trim().replace(/^#/, '').toLowerCase()}` : '#111111';
  const frameColor = isValidHexColor(p.frameColor) ? `#${p.frameColor.trim().replace(/^#/, '').toLowerCase()}` : inkColor;

  const frameInset = clamp(p.frameInset, 0, 120);
  const frameWidth = clamp(p.frameWidth, 0.5, 14);

  const mosaicX0 = margin + frameInset + 12;
  const mosaicY0 = margin + frameInset + 12;
  const mosaicX1 = W - margin - frameInset - 12;
  const mosaicY1 = Math.min(H * 0.70, H - margin - 220);
  const mosaicW = Math.max(1, mosaicX1 - mosaicX0);
  const mosaicH = Math.max(1, mosaicY1 - mosaicY0);

  const cols = Math.max(1, Math.floor(mosaicW / (tileSize + tileGap)) + 4);
  const rows = Math.max(1, Math.floor(mosaicH / (tileSize + tileGap)) + 4);
  const step = tileSize + tileGap;
  const startX = mosaicX0 - step;
  const startY = mosaicY0 - step;

  const tileClips: string[] = [];
  const tiles: string[] = [];

  const images = (input.images || []).filter((s) => typeof s === 'string' && s.trim().length > 0);
  const hasImages = images.length > 0;

  let tileIndex = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const seed = hash32(`${ageText}:${tileIndex}:${c},${r}`);
      const rowOffset = tileLayout === 'stagger' && r % 2 === 1 ? step * 0.5 : 0;
      const posJitter = tileLayout === 'stagger' ? tilePositionJitter : 0;
      const tx = posJitter ? (rand01(seed + 101) - 0.5) * 2 * posJitter : 0;
      const ty = posJitter ? (rand01(seed + 202) - 0.5) * 2 * posJitter : 0;
      const x = startX + c * step + rowOffset + tx;
      const y = startY + r * step + ty;
      const id = `t${tileIndex}`;
      tileClips.push(`<clipPath id="${id}"><rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${tileSize.toFixed(2)}" height="${tileSize.toFixed(2)}" rx="1.5" ry="1.5"/></clipPath>`);

      const jitter = imageFit === 'cover' ? imageJitter : 0;
      const jx = (rand01(seed) - 0.5) * tileSize * tileBleed * jitter;
      const jy = (rand01(seed + 1) - 0.5) * tileSize * tileBleed * jitter;
      const over = imageFit === 'cover' ? 1 + tileBleed : 1;
      const iw = tileSize * over;
      const ih = tileSize * over;
      const ix = x - (iw - tileSize) / 2 + jx;
      const iy = y - (ih - tileSize) / 2 + jy;

      if (hasImages) {
        const idx = seed % images.length;
        const href = images[idx].trim();
        const preserve = imageFit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice';
        tiles.push(
          `<g clip-path="url(#${id})">` +
            `${
              imageFit === 'contain'
                ? `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${tileSize.toFixed(2)}" height="${tileSize.toFixed(2)}" fill="${bgColor}" />` +
                  (containFill === 'blur'
                    ? `<image href="${svgEscape(href)}" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${tileSize.toFixed(2)}" height="${tileSize.toFixed(
                        2
                      )}" preserveAspectRatio="xMidYMid slice" filter="url(#tileBlur)" opacity="0.85" />`
                    : '')
                : ''
            }` +
            `<image href="${svgEscape(href)}" x="${ix.toFixed(2)}" y="${iy.toFixed(2)}" width="${iw.toFixed(2)}" height="${ih.toFixed(2)}" preserveAspectRatio="${preserve}" />` +
            `</g>`
        );
      } else {
        const hue = (seed % 360 + 360) % 360;
        const sat = 42 + (seed % 30);
        const light = 55 + (seed % 18);
        tiles.push(
          `<g clip-path="url(#${id})">` +
            `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${tileSize.toFixed(2)}" height="${tileSize.toFixed(2)}" fill="hsl(${hue} ${sat}% ${light}%)" opacity="0.95"/>` +
            `</g>`
        );
      }

      tileIndex++;
    }
  }

  const frame = p.frame
    ? `<rect x="${(margin + frameInset).toFixed(2)}" y="${(margin + frameInset).toFixed(2)}" width="${(W - 2 * (margin + frameInset)).toFixed(2)}" height="${(H - 2 * (margin + frameInset)).toFixed(2)}" fill="none" stroke="${frameColor}" stroke-width="${frameWidth.toFixed(2)}" opacity="0.95"/>`
    : '';

  const captionLinesRaw = splitTextareaLines(p.caption);
  const subCaptionLinesRaw = splitTextareaLines(p.subCaption);
  const captionLines = (p.captionUppercase ? captionLinesRaw.map((l) => (l ? l.toUpperCase() : l)) : captionLinesRaw).slice(0, 20);
  const subCaptionLines = (p.subCaptionUppercase ? subCaptionLinesRaw.map((l) => (l ? l.toUpperCase() : l)) : subCaptionLinesRaw).slice(0, 30);

  const captionFontSize = clamp(p.captionFontSize, 10, 120);
  const subCaptionFontSize = clamp(p.subCaptionFontSize, 10, 80);
  const captionFontWeight = clamp(p.captionFontWeight, 100, 900);
  const subCaptionFontWeight = clamp(p.subCaptionFontWeight, 100, 900);
  const captionLetterSpacing = clamp(p.captionLetterSpacing, -6, 60);
  const subCaptionLetterSpacing = clamp(p.subCaptionLetterSpacing, -6, 60);
  const captionLineSpacing = clamp(p.captionLineSpacing, 0.8, 2.5);
  const subCaptionLineSpacing = clamp(p.subCaptionLineSpacing, 0.8, 2.5);

  const captionBoxWidthPct = clamp(p.captionBoxWidthPct, 0.4, 1.0);
  const subCaptionBoxWidthPct = clamp(p.subCaptionBoxWidthPct, 0.4, 1.0);
  const captionMaxLines = clamp(p.captionMaxLines, 1, 8);
  const subCaptionMaxLines = clamp(p.subCaptionMaxLines, 1, 10);
  const captionBoxHeightLines = clamp(p.captionBoxHeightLines, 1, 12);
  const subCaptionBoxHeightLines = clamp(p.subCaptionBoxHeightLines, 1, 14);

  const captionMaxChars = Math.floor((W * captionBoxWidthPct) / Math.max(8, captionFontSize * 0.56));
  const subCaptionMaxChars = Math.floor((W * subCaptionBoxWidthPct) / Math.max(8, subCaptionFontSize * 0.56));

  const captionFinalLines =
    p.captionAutoWrap && captionLines.length
      ? wrapTextareaLinesByChars({ lines: captionLines, maxChars: captionMaxChars, maxLines: captionMaxLines })
      : captionLines.slice(0, captionMaxLines);
  const subCaptionFinalLines =
    p.subCaptionAutoWrap && subCaptionLines.length
      ? wrapTextareaLinesByChars({ lines: subCaptionLines, maxChars: subCaptionMaxChars, maxLines: subCaptionMaxLines })
      : subCaptionLines.slice(0, subCaptionMaxLines);

  const captionBoxW = W * captionBoxWidthPct;
  const subCaptionBoxW = W * subCaptionBoxWidthPct;
  const captionClipH = captionFontSize * captionLineSpacing * captionBoxHeightLines;
  const subCaptionClipH = subCaptionFontSize * subCaptionLineSpacing * subCaptionBoxHeightLines;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect x="0" y="0" width="${W}" height="${H}" fill="${bgColor}"/>
  ${frame}
  <defs>
    <filter id="grain" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="3" />
      <feColorMatrix type="matrix" values="
        1 0 0 0 0
        0 1 0 0 0
        0 0 1 0 0
        0 0 0 0.12 0" />
    </filter>
    <filter id="tileBlur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="${Math.max(2, Math.min(16, tileSize * 0.10)).toFixed(2)}" />
    </filter>
    ${tileClips.join('\n    ')}
    <clipPath id="ageClip" clipPathUnits="userSpaceOnUse">
      <text x="${(W / 2).toFixed(2)}" y="${ageY.toFixed(2)}" text-anchor="middle" dominant-baseline="middle"
        font-family="${svgEscape(p.ageFontFamily)}" font-size="${ageFontSize.toFixed(2)}" font-weight="${Math.round(p.ageFontWeight)}">
        ${svgEscape(ageText)}
      </text>
    </clipPath>
    <clipPath id="capClip" clipPathUnits="userSpaceOnUse">
      <rect x="${((W - captionBoxW) / 2).toFixed(2)}" y="${(captionY - captionFontSize * 1.25).toFixed(2)}" width="${captionBoxW.toFixed(
    2
  )}" height="${captionClipH.toFixed(2)}" />
    </clipPath>
    <clipPath id="subClip" clipPathUnits="userSpaceOnUse">
      <rect x="${((W - subCaptionBoxW) / 2).toFixed(2)}" y="${(subCaptionY - subCaptionFontSize * 1.25).toFixed(2)}" width="${subCaptionBoxW.toFixed(
    2
  )}" height="${subCaptionClipH.toFixed(2)}" />
    </clipPath>
  </defs>

  <g clip-path="url(#ageClip)">
    ${tiles.join('\n    ')}
    <rect x="0" y="0" width="${W}" height="${H}" fill="${inkColor}" opacity="0.05" filter="url(#grain)"/>
  </g>

  <g>
    <g clip-path="url(#capClip)">
      ${renderMultilineText({
        x: W / 2,
        y: captionY,
        lines: captionFinalLines,
        fontFamily: p.captionFontFamily,
        fontWeight: captionFontWeight,
        fontSize: captionFontSize,
        fill: inkColor,
        letterSpacingPx: captionLetterSpacing,
        lineSpacing: captionLineSpacing
      })}
    </g>
    <g clip-path="url(#subClip)">
      ${renderMultilineText({
        x: W / 2,
        y: subCaptionY,
        lines: subCaptionFinalLines,
        fontFamily: p.subCaptionFontFamily,
        fontWeight: subCaptionFontWeight,
        fontSize: subCaptionFontSize,
        fill: inkColor,
        letterSpacingPx: subCaptionLetterSpacing,
        lineSpacing: subCaptionLineSpacing,
        opacity: 0.85
      })}
    </g>
  </g>
</svg>`;
}
