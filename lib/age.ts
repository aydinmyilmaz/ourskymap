export type AgePosterSize = 'a4' | 'square' | '16x20' | '20x20';

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
  bgColor: string;
  frame: boolean;
  frameInset: number;
  frameWidth: number;
  frameColor: string;
  caption: string;
  captionFontFamily: string;
  captionFontSize: number;
  captionY: number;
  subCaption: string;
  subCaptionFontFamily: string;
  subCaptionFontSize: number;
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
  const W = size === '16x20' ? 16 * 72 : size === '20x20' ? 20 * 72 : size === 'square' ? 1024 : 595;
  const H = size === '16x20' ? 20 * 72 : size === '20x20' ? 20 * 72 : size === 'square' ? 1024 : 842;
  const margin = size === '16x20' || size === '20x20' ? 72 : size === 'square' ? 70 : 48;
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

export function renderAgeMosaicSvg(input: { params: AgeMosaicParams; images: string[] }): string {
  const p = input.params;
  const { W, H, margin } = dims(p.size);

  const ageText = (p.ageText || '').trim() || '70';

  const tileSize = clamp(p.tileSize, 16, 220);
  const tileGap = clamp(p.tileGap, 0, 24);
  const tileBleed = clamp(p.tileBleed, 0, 0.6);

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

  const cols = Math.max(1, Math.floor((mosaicW + tileGap) / (tileSize + tileGap)));
  const rows = Math.max(1, Math.floor((mosaicH + tileGap) / (tileSize + tileGap)));
  const step = tileSize + tileGap;

  const tileClips: string[] = [];
  const tiles: string[] = [];

  const images = (input.images || []).filter((s) => typeof s === 'string' && s.trim().length > 0);
  const hasImages = images.length > 0;

  let tileIndex = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = mosaicX0 + c * step;
      const y = mosaicY0 + r * step;
      const id = `t${tileIndex}`;
      tileClips.push(`<clipPath id="${id}"><rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${tileSize.toFixed(2)}" height="${tileSize.toFixed(2)}" rx="1.5" ry="1.5"/></clipPath>`);

      const seed = hash32(`${ageText}:${tileIndex}:${c},${r}`);
      const jx = (rand01(seed) - 0.5) * tileSize * tileBleed;
      const jy = (rand01(seed + 1) - 0.5) * tileSize * tileBleed;
      const over = 1 + tileBleed;
      const iw = tileSize * over;
      const ih = tileSize * over;
      const ix = x - (iw - tileSize) / 2 + jx;
      const iy = y - (ih - tileSize) / 2 + jy;

      if (hasImages) {
        const idx = seed % images.length;
        const href = images[idx].trim();
        tiles.push(
          `<g clip-path="url(#${id})">` +
            `<image href="${svgEscape(href)}" x="${ix.toFixed(2)}" y="${iy.toFixed(2)}" width="${iw.toFixed(2)}" height="${ih.toFixed(2)}" preserveAspectRatio="xMidYMid slice" />` +
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

  const caption = (p.caption || '').trim();
  const subCaption = (p.subCaption || '').trim();

  const captionFontSize = clamp(p.captionFontSize, 10, 120);
  const subCaptionFontSize = clamp(p.subCaptionFontSize, 10, 80);

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
    ${tileClips.join('\n    ')}
    <clipPath id="ageClip" clipPathUnits="userSpaceOnUse">
      <text x="${(W / 2).toFixed(2)}" y="${ageY.toFixed(2)}" text-anchor="middle" dominant-baseline="middle"
        font-family="${svgEscape(p.ageFontFamily)}" font-size="${ageFontSize.toFixed(2)}" font-weight="${Math.round(p.ageFontWeight)}">
        ${svgEscape(ageText)}
      </text>
    </clipPath>
  </defs>

  <g clip-path="url(#ageClip)">
    ${tiles.join('\n    ')}
    <rect x="0" y="0" width="${W}" height="${H}" fill="${inkColor}" opacity="0.05" filter="url(#grain)"/>
  </g>

  <g>
    ${
      caption
        ? `<text x="${(W / 2).toFixed(2)}" y="${captionY.toFixed(2)}" text-anchor="middle" font-family="${svgEscape(
            p.captionFontFamily
          )}" font-size="${captionFontSize.toFixed(2)}" fill="${inkColor}">${svgEscape(caption)}</text>`
        : ''
    }
    ${
      subCaption
        ? `<text x="${(W / 2).toFixed(2)}" y="${subCaptionY.toFixed(2)}" text-anchor="middle" font-family="${svgEscape(
            p.subCaptionFontFamily
          )}" font-size="${subCaptionFontSize.toFixed(2)}" fill="${inkColor}" opacity="0.85">${svgEscape(subCaption)}</text>`
        : ''
    }
  </g>
</svg>`;
}

