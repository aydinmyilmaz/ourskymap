import type { PosterParams } from './types';

type CityMapSize = 'a2' | 'us-letter' | '16x20' | '18x24';
type PinStyle = 'none' | 'classic' | 'love' | 'pushpin' | 'heart' | 'cross' | 'home' | 'graduation';
type MapShape = 'rectangle' | 'circle';

export type CityMapRequest = {
  latitude: number;
  longitude: number;
  locationLabel: string;
  size: CityMapSize;
  palette: PosterParams['palette'];
  inkColor: string;
  border: boolean;
  borderWidth: number;
  borderInset: number;
  zoom: number;
  mapImageDataUrl: string;
  mapShape?: MapShape;
  showMarker: boolean;
  pinStyle?: PinStyle;
  uppercaseTitle?: boolean;
  title: string;
  subtitle: string;
  metaText: string;
  textYOffset?: number;
  titleFont: 'serif' | 'sans' | 'mono' | 'prata';
  namesFont: 'serif' | 'sans' | 'cursive' | 'jimmy-script';
  metaFont: 'sans' | 'serif' | 'mono' | 'signika';
  titleFontSize: number;
  namesFontSize: number;
  metaFontSize: number;
  motorwayWidth?: number;
  primaryRoadWidth?: number;
  minorRoadWidth?: number;
};

type Palette = {
  bg: string;
  ink: string;
  mutedInk: string;
};

function svgEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function svgAttrEscape(s: string): string {
  return svgEscape(s).replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function getPalette(name: CityMapRequest['palette']): Palette {
  switch (name) {
    case 'classic-black':
      return { bg: '#0b0b0d', ink: '#f6f6f7', mutedInk: 'rgba(246,246,247,0.55)' };
    case 'navy-gold':
      return { bg: '#151c2d', ink: '#f4c25b', mutedInk: 'rgba(244,194,91,0.40)' };
    case 'night-gold':
      return { bg: '#24283a', ink: '#fbab29', mutedInk: 'rgba(251,171,41,0.40)' };
    case 'twilight-blue':
      return { bg: '#1f2a44', ink: '#d7e3ff', mutedInk: 'rgba(215,227,255,0.45)' };
    case 'storm-gray':
      return { bg: '#2a2f39', ink: '#e8e9ee', mutedInk: 'rgba(232,233,238,0.45)' };
    case 'mocha':
      return { bg: '#3b2d2a', ink: '#f2d8c8', mutedInk: 'rgba(242,216,200,0.45)' };
    case 'soft-sage':
      return { bg: '#25352f', ink: '#d8e7de', mutedInk: 'rgba(216,231,222,0.45)' };
    case 'blush-night':
      return { bg: '#3a2733', ink: '#f5d7e2', mutedInk: 'rgba(245,215,226,0.45)' };
    case 'slate':
      return { bg: '#111827', ink: '#d9d9d9', mutedInk: 'rgba(217,217,217,0.45)' };
    case 'forest':
      return { bg: '#0e1f16', ink: '#d9d9d9', mutedInk: 'rgba(217,217,217,0.45)' };
    case 'emerald':
      return { bg: '#0b3d2e', ink: '#d9d9d9', mutedInk: 'rgba(217,217,217,0.45)' };
    case 'plum':
      return { bg: '#1c1230', ink: '#d9d9d9', mutedInk: 'rgba(217,217,217,0.45)' };
    case 'burgundy':
      return { bg: '#2a0f1a', ink: '#d9d9d9', mutedInk: 'rgba(217,217,217,0.45)' };
    case 'sand':
      return { bg: '#f7f3e8', ink: '#1b1b1b', mutedInk: 'rgba(27,27,27,0.38)' };
    case 'pearl':
      return { bg: '#f2f0ea', ink: '#202020', mutedInk: 'rgba(32,32,32,0.38)' };
    case 'cream-ink':
      return { bg: '#fbf5ea', ink: '#1b1b1b', mutedInk: 'rgba(27,27,27,0.38)' };
    case 'midnight':
    default:
      return { bg: '#0b1020', ink: '#ffffff', mutedInk: 'rgba(255,255,255,0.44)' };
  }
}

function fontFamily(
  k: CityMapRequest['titleFont'] | CityMapRequest['namesFont'] | CityMapRequest['metaFont']
): string {
  if (k === 'prata') return `'Prata', Georgia, 'Times New Roman', serif`;
  if (k === 'jimmy-script') return `'Jimmy Script', 'Brush Script MT', 'Segoe Script', cursive`;
  if (k === 'cursive') return `'Jimmy Script', 'Brush Script MT', 'Segoe Script', cursive`;
  if (k === 'mono') return `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
  if (k === 'serif') return `Georgia, 'Times New Roman', serif`;
  if (k === 'signika') return `'Signika', ui-sans-serif, system-ui`;
  return `ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial`;
}

function getPosterSize(size: CityMapSize): { width: number; height: number; margin: number; chartTopOffset: number } {
  if (size === 'a2') return { width: 1191, height: 1684, margin: 96, chartTopOffset: 22 };
  if (size === 'us-letter') return { width: 612, height: 792, margin: 46, chartTopOffset: 14 };
  if (size === '18x24') return { width: 18 * 72, height: 24 * 72, margin: 80, chartTopOffset: 18 };
  return { width: 16 * 72, height: 20 * 72, margin: 72, chartTopOffset: 18 };
}

function renderMarker(pinStyle: PinStyle | undefined, x: number, y: number, ink: string): string {
  const pinColor = '#d9242b';
  const classic = `
    <g filter="url(#markerShadow)">
      <circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="14" fill="${pinColor}" opacity="0.94"/>
      <path d="M ${x.toFixed(2)} ${(y + 25).toFixed(2)} L ${(x - 8).toFixed(2)} ${(y + 11).toFixed(2)} L ${(x + 8).toFixed(2)} ${(y + 11).toFixed(2)} Z" fill="${pinColor}" opacity="0.92"/>
    </g>
    <circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4" fill="#ffffff"/>
  `;

  if (!pinStyle || pinStyle === 'classic') return classic;
  if (pinStyle === 'none') return '';

  const glyphByStyle: Record<Exclude<PinStyle, 'none' | 'classic'>, string> = {
    love: '❤',
    pushpin: '•',
    heart: '♥',
    cross: '✕',
    home: '⌂',
    graduation: '★'
  };
  const glyph = glyphByStyle[pinStyle];
  const fontSize = pinStyle === 'home' ? 30 : pinStyle === 'pushpin' ? 44 : 28;

  return `
    <g filter="url(#markerShadow)">
      <circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="20" fill="#ffffff" stroke="${ink}" stroke-width="1.25" opacity="0.95"/>
      <text x="${x.toFixed(2)}" y="${(y + fontSize * 0.34).toFixed(2)}" text-anchor="middle" fill="${pinColor}" font-size="${fontSize}" font-family="'Signika', ui-sans-serif, system-ui">
        ${svgEscape(glyph)}
      </text>
    </g>
  `;
}

export async function renderCityMapSvg(req: CityMapRequest): Promise<string> {
  const { width: W, height: H, margin, chartTopOffset } = getPosterSize(req.size);
  const palette = getPalette(req.palette);
  const ink = req.inkColor.trim() ? req.inkColor : palette.ink;
  const mapShape: MapShape = req.mapShape === 'circle' ? 'circle' : 'rectangle';
  const isCircle = mapShape === 'circle';
  const frameInset = req.borderInset;
  const mapX = margin + frameInset;
  const mapW = W - 2 * (margin + frameInset);
  const mapH = Math.max(220, H * 0.57);
  const mapY = margin + frameInset + chartTopOffset;
  const circleBaseRadius = Math.min(mapW, mapH) / 2;
  const circleRadius = isCircle ? circleBaseRadius * 0.97 : circleBaseRadius;
  const circleCx = mapX + mapW / 2;
  const circleCy = mapY + mapH / 2 + (isCircle ? circleBaseRadius * 0.03 : 0);

  const mapImageDataUrl = (req.mapImageDataUrl || '').trim();
  if (!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(mapImageDataUrl)) {
    throw new Error('mapImageDataUrl is required (vector capture only).');
  }

  const textTopGap = isCircle ? Math.max(86, H * 0.085) : Math.max(52, H * 0.06);
  const textYOffset = Math.max(-220, Math.min(220, Number(req.textYOffset ?? 0)));
  const textStartY = (isCircle ? circleCy + circleRadius : mapY + mapH) + textTopGap + textYOffset;
  const titleY = textStartY;
  const subtitleY = titleY + (isCircle ? Math.max(58, H * 0.044) : Math.max(50, H * 0.038));
  const metaY = subtitleY + (isCircle ? Math.max(46, H * 0.032) : Math.max(42, H * 0.03));
  const markerX = mapX + mapW / 2;
  const markerY = isCircle ? circleCy : mapY + mapH / 2;
  const titleFontSize = Math.max(12, req.titleFontSize) * (isCircle ? 1.14 : 1);
  const subtitleFontSize = Math.max(10, req.namesFontSize) * (isCircle ? 1.12 : 1);
  const metaFontSize = Math.max(9, req.metaFontSize) * (isCircle ? 1.08 : 1);

  const frame = req.border
    ? `<rect x="${mapX}" y="${mapY}" width="${mapW}" height="${H - 2 * (margin + frameInset)}" fill="none" stroke="${ink}" stroke-width="${Math.max(0.5, req.borderWidth)}" opacity="0.9"/>`
    : '';
  const mapClipShape =
    isCircle
      ? `<circle cx="${circleCx}" cy="${circleCy}" r="${circleRadius}"/>`
      : `<rect x="${mapX}" y="${mapY}" width="${mapW}" height="${mapH}" rx="0" ry="0"/>`;
  const mapOutline =
    isCircle
      ? `<circle cx="${circleCx}" cy="${circleCy}" r="${circleRadius}" fill="none" stroke="${palette.mutedInk}" stroke-width="1"/>`
      : `<rect x="${mapX}" y="${mapY}" width="${mapW}" height="${mapH}" fill="none" stroke="${palette.mutedInk}" stroke-width="1"/>`;
  const imagePreserve = isCircle ? 'xMidYMid slice' : 'none';

  const marker = req.showMarker ? renderMarker(req.pinStyle, markerX, markerY, ink) : '';
  const titleText = req.uppercaseTitle === false ? req.title || '' : (req.title || '').toUpperCase();

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <filter id="markerShadow" x="-100%" y="-100%" width="300%" height="300%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
    <clipPath id="mapClip">
      ${mapClipShape}
    </clipPath>
  </defs>

  <rect x="0" y="0" width="${W}" height="${H}" fill="${palette.bg}"/>
  ${frame}

  <g clip-path="url(#mapClip)">
    <image href="${svgAttrEscape(mapImageDataUrl)}" x="${mapX}" y="${mapY}" width="${mapW}" height="${mapH}" preserveAspectRatio="${imagePreserve}"/>
  </g>

  ${mapOutline}
  ${marker}

  <text x="${W / 2}" y="${titleY.toFixed(2)}" text-anchor="middle" fill="${ink}" font-family="${fontFamily(req.titleFont)}" font-size="${titleFontSize.toFixed(2)}" font-weight="600" letter-spacing="0.03em">
    ${svgEscape(titleText)}
  </text>
  <text x="${W / 2}" y="${subtitleY.toFixed(2)}" text-anchor="middle" fill="${ink}" font-family="${fontFamily(req.namesFont)}" font-size="${subtitleFontSize.toFixed(2)}">
    ${svgEscape(req.subtitle)}
  </text>
  <text x="${W / 2}" y="${metaY.toFixed(2)}" text-anchor="middle" fill="${palette.mutedInk}" font-family="${fontFamily(req.metaFont)}" font-size="${metaFontSize.toFixed(2)}" letter-spacing="0.16em">
    ${svgEscape(req.metaText)}
  </text>
</svg>`;
}
