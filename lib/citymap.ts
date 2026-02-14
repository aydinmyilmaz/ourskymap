import type { PosterParams } from './types';

type CityMapSize = 'a2' | 'us-letter' | '16x20' | '18x24';
type MapStyleKey =
  | 'mono'
  | 'natural'
  | 'earth'
  | 'old-navy'
  | 'coral'
  | 'teal'
  | 'cobalt'
  | 'noir'
  | 'minimal-vector'
  | 'prettymaps-minimal';

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
  monochrome: boolean;
  mapStyle?: MapStyleKey;
  showMarker: boolean;
  title: string;
  subtitle: string;
  metaText: string;
  titleFont: 'serif' | 'sans' | 'mono' | 'prata';
  namesFont: 'serif' | 'sans' | 'cursive' | 'jimmy-script';
  metaFont: 'sans' | 'serif' | 'mono' | 'signika';
  titleFontSize: number;
  namesFontSize: number;
  metaFontSize: number;
};

type Palette = {
  bg: string;
  ink: string;
  mutedInk: string;
};

type Tone = {
  dark: string;
  light: string;
};

function svgEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function svgAttrEscape(s: string): string {
  return svgEscape(s).replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function hexPairToDec(v: string): number {
  return parseInt(v, 16);
}

function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const h = hex.trim().replace('#', '');
  const r = hexPairToDec(h.slice(0, 2)) / 255;
  const g = hexPairToDec(h.slice(2, 4)) / 255;
  const b = hexPairToDec(h.slice(4, 6)) / 255;
  return { r, g, b };
}

function styleTone(style: MapStyleKey): Tone | null {
  switch (style) {
    case 'mono':
      return { dark: '#3b3f44', light: '#edf0f2' };
    case 'earth':
      return { dark: '#4a5b4d', light: '#d6d8bf' };
    case 'old-navy':
      return { dark: '#24344f', light: '#d8d0b8' };
    case 'coral':
      return { dark: '#9f4a5d', light: '#f0d3c2' };
    case 'teal':
      return { dark: '#285e61', light: '#c8ddd2' };
    case 'cobalt':
      return { dark: '#2a4b75', light: '#cad9ea' };
    case 'noir':
      return { dark: '#17181c', light: '#dbdde2' };
    case 'minimal-vector':
    case 'prettymaps-minimal':
    case 'natural':
    default:
      return null;
  }
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

type MapTile = {
  href: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

function clampLat(lat: number): number {
  return Math.max(-85.05112878, Math.min(85.05112878, lat));
}

function lonToTileX(lon: number, zoom: number): number {
  const n = 2 ** zoom;
  return ((lon + 180) / 360) * n;
}

function latToTileY(lat: number, zoom: number): number {
  const n = 2 ** zoom;
  const latRad = (clampLat(lat) * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
}

function wrapX(x: number, n: number): number {
  return ((x % n) + n) % n;
}

function tileUrlsForStyle(style: MapStyleKey, z: number, x: number, y: number): string[] {
  const geoapifyKey = (process.env.GEOAPIFY_API_KEY || '').trim();
  const urls: string[] = [];
  const pushGeoapify = (name: string) => {
    if (!geoapifyKey) return;
    urls.push(`https://maps.geoapify.com/v1/tile/${name}/${z}/${x}/${y}.png?apiKey=${geoapifyKey}`);
  };

  if (style === 'minimal-vector') {
    pushGeoapify('osm-bright-grey');
    pushGeoapify('osm-bright-smooth');
    urls.push(`https://basemaps.cartocdn.com/light_nolabels/${z}/${x}/${y}.png`);
    urls.push(`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/${z}/${y}/${x}`);
    return urls;
  }

  if (style === 'prettymaps-minimal') {
    pushGeoapify('osm-bright-grey');
    pushGeoapify('klokantech-basic');
    urls.push(`https://basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png`);
    urls.push(`https://basemaps.cartocdn.com/light_nolabels/${z}/${x}/${y}.png`);
    return urls;
  }

  urls.push(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`);
  urls.push(`https://basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png`);
  return urls;
}

async function fetchTileAsDataUrl(urls: string[]): Promise<string> {
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'space-map citymap renderer'
        },
        cache: 'no-store'
      });
      if (!res.ok) continue;
      const ab = await res.arrayBuffer();
      const base64 = Buffer.from(ab).toString('base64');
      return `data:image/png;base64,${base64}`;
    } catch {
      continue;
    }
  }
  throw new Error('Tile fetch failed');
}

async function getStaticMapTiles(
  latitude: number,
  longitude: number,
  zoom: number,
  width: number,
  height: number,
  style: MapStyleKey
): Promise<MapTile[]> {
  const z = Math.max(4, Math.min(19, Math.round(zoom)));
  const tileSize = 256;
  const n = 2 ** z;

  const centerPxX = lonToTileX(longitude, z) * tileSize;
  const centerPxY = latToTileY(latitude, z) * tileSize;
  const topLeftPxX = centerPxX - width / 2;
  const topLeftPxY = centerPxY - height / 2;

  const startTileX = Math.floor(topLeftPxX / tileSize);
  const startTileY = Math.floor(topLeftPxY / tileSize);
  const endTileX = Math.floor((topLeftPxX + width - 1) / tileSize);
  const endTileY = Math.floor((topLeftPxY + height - 1) / tileSize);

  const tasks: Promise<MapTile | null>[] = [];

  for (let ty = startTileY; ty <= endTileY; ty++) {
    if (ty < 0 || ty >= n) continue;
    for (let tx = startTileX; tx <= endTileX; tx++) {
      const wrappedTx = wrapX(tx, n);
      const drawX = tx * tileSize - topLeftPxX;
      const drawY = ty * tileSize - topLeftPxY;
      const urls = tileUrlsForStyle(style, z, wrappedTx, ty);
      tasks.push(
        fetchTileAsDataUrl(urls)
          .then((href) => ({ href, x: drawX, y: drawY, w: tileSize, h: tileSize }))
          .catch(() => null)
      );
    }
  }

  const tiles = (await Promise.all(tasks)).filter(Boolean) as MapTile[];
  return tiles;
}

export async function renderCityMapSvg(req: CityMapRequest): Promise<string> {
  const { width: W, height: H, margin, chartTopOffset } = getPosterSize(req.size);
  const palette = getPalette(req.palette);
  const ink = req.inkColor.trim() ? req.inkColor : palette.ink;
  const frameInset = req.borderInset;
  const mapX = margin + frameInset;
  const mapW = W - 2 * (margin + frameInset);
  const mapH = Math.max(220, H * 0.57);
  const mapY = margin + frameInset + chartTopOffset;

  let mapTiles: MapTile[] = [];
  try {
    mapTiles = await getStaticMapTiles(req.latitude, req.longitude, req.zoom, mapW, mapH, req.mapStyle ?? 'natural');
  } catch {
    mapTiles = [];
  }

  const titleY = mapY + mapH + Math.max(52, H * 0.06);
  const subtitleY = titleY + Math.max(50, H * 0.038);
  const metaY = subtitleY + Math.max(42, H * 0.03);
  const markerX = mapX + mapW / 2;
  const markerY = mapY + mapH / 2;
  const styleKey: MapStyleKey = req.mapStyle ?? (req.monochrome ? 'mono' : 'natural');
  const tone = styleTone(styleKey);
  const darkTone = tone ? hexToRgb01(tone.dark) : null;
  const lightTone = tone ? hexToRgb01(tone.light) : null;

  const frame = req.border
    ? `<rect x="${mapX}" y="${mapY}" width="${mapW}" height="${H - 2 * (margin + frameInset)}" fill="none" stroke="${ink}" stroke-width="${Math.max(0.5, req.borderWidth)}" opacity="0.9"/>`
    : '';

  const fallbackPattern = `
    <rect x="${mapX}" y="${mapY}" width="${mapW}" height="${mapH}" fill="#eef1f4"/>
    <g stroke="#d6dbe1" stroke-width="1">
      ${Array.from({ length: 18 })
        .map((_, i) => {
          const y = mapY + (i * mapH) / 17;
          return `<line x1="${mapX}" y1="${y.toFixed(2)}" x2="${(mapX + mapW).toFixed(2)}" y2="${y.toFixed(2)}"/>`;
        })
        .join('')}
      ${Array.from({ length: 14 })
        .map((_, i) => {
          const x = mapX + (i * mapW) / 13;
          return `<line x1="${x.toFixed(2)}" y1="${mapY}" x2="${x.toFixed(2)}" y2="${(mapY + mapH).toFixed(2)}"/>`;
        })
        .join('')}
    </g>
  `;

  const marker = req.showMarker
    ? `
      <g filter="url(#markerShadow)">
        <circle cx="${markerX.toFixed(2)}" cy="${markerY.toFixed(2)}" r="14" fill="${ink}" opacity="0.92"/>
        <path d="M ${markerX.toFixed(2)} ${(markerY + 25).toFixed(2)} L ${(markerX - 8).toFixed(2)} ${(markerY + 11).toFixed(2)} L ${(markerX + 8).toFixed(2)} ${(markerY + 11).toFixed(2)} Z" fill="${ink}" opacity="0.9"/>
      </g>
      <circle cx="${markerX.toFixed(2)}" cy="${markerY.toFixed(2)}" r="4" fill="#ffffff"/>
    `
    : '';

  const filterId =
    styleKey === 'minimal-vector'
      ? 'mapMinimalVector'
      : styleKey === 'prettymaps-minimal'
        ? 'mapPrettymapsMinimal'
        : tone
          ? 'mapTone'
          : '';
  const styleFilter = filterId ? `filter="url(#${filterId})"` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    ${
      tone && darkTone && lightTone
        ? `<filter id="mapTone" x="-6%" y="-6%" width="112%" height="112%">
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncR type="table" tableValues="${darkTone.r.toFixed(4)} ${lightTone.r.toFixed(4)}"/>
        <feFuncG type="table" tableValues="${darkTone.g.toFixed(4)} ${lightTone.g.toFixed(4)}"/>
        <feFuncB type="table" tableValues="${darkTone.b.toFixed(4)} ${lightTone.b.toFixed(4)}"/>
      </feComponentTransfer>
      <feComponentTransfer>
        <feFuncR type="gamma" amplitude="1" exponent="0.92" offset="0"/>
        <feFuncG type="gamma" amplitude="1" exponent="0.92" offset="0"/>
        <feFuncB type="gamma" amplitude="1" exponent="0.92" offset="0"/>
      </feComponentTransfer>
    </filter>`
        : ''
    }
    <filter id="markerShadow" x="-100%" y="-100%" width="300%" height="300%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
    <filter id="mapMinimalVector" x="-8%" y="-8%" width="116%" height="116%">
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncR type="linear" slope="2.35" intercept="-0.95"/>
        <feFuncG type="linear" slope="2.35" intercept="-0.95"/>
        <feFuncB type="linear" slope="2.35" intercept="-0.95"/>
      </feComponentTransfer>
      <feComponentTransfer>
        <feFuncR type="gamma" amplitude="1" exponent="0.92" offset="0"/>
        <feFuncG type="gamma" amplitude="1" exponent="0.92" offset="0"/>
        <feFuncB type="gamma" amplitude="1" exponent="0.92" offset="0"/>
      </feComponentTransfer>
    </filter>
    <filter id="mapPrettymapsMinimal" x="-8%" y="-8%" width="116%" height="116%">
      <feColorMatrix type="saturate" values="0.14"/>
      <feComponentTransfer>
        <feFuncR type="linear" slope="1.75" intercept="-0.48"/>
        <feFuncG type="linear" slope="1.75" intercept="-0.48"/>
        <feFuncB type="linear" slope="1.75" intercept="-0.48"/>
      </feComponentTransfer>
      <feComponentTransfer>
        <feFuncR type="gamma" amplitude="1" exponent="0.95" offset="0"/>
        <feFuncG type="gamma" amplitude="1" exponent="0.95" offset="0"/>
        <feFuncB type="gamma" amplitude="1" exponent="0.95" offset="0"/>
      </feComponentTransfer>
    </filter>
    <clipPath id="mapClip">
      <rect x="${mapX}" y="${mapY}" width="${mapW}" height="${mapH}" rx="0" ry="0"/>
    </clipPath>
  </defs>

  <rect x="0" y="0" width="${W}" height="${H}" fill="${palette.bg}"/>
  ${frame}

  ${
    mapTiles.length > 0
      ? `<g clip-path="url(#mapClip)" ${styleFilter}>
        ${mapTiles
          .map(
            (t) =>
              `<image href="${svgAttrEscape(t.href)}" x="${(mapX + t.x).toFixed(2)}" y="${(mapY + t.y).toFixed(2)}" width="${t.w}" height="${t.h}" preserveAspectRatio="none"/>`
          )
          .join('')}
      </g>`
      : fallbackPattern
  }

  <rect x="${mapX}" y="${mapY}" width="${mapW}" height="${mapH}" fill="none" stroke="${palette.mutedInk}" stroke-width="1"/>
  ${marker}

  <text x="${W / 2}" y="${titleY.toFixed(2)}" text-anchor="middle" fill="${ink}" font-family="${fontFamily(req.titleFont)}" font-size="${Math.max(12, req.titleFontSize).toFixed(2)}" font-weight="600" letter-spacing="0.03em">
    ${svgEscape((req.title || '').toUpperCase())}
  </text>
  <text x="${W / 2}" y="${subtitleY.toFixed(2)}" text-anchor="middle" fill="${ink}" font-family="${fontFamily(req.namesFont)}" font-size="${Math.max(10, req.namesFontSize).toFixed(2)}">
    ${svgEscape(req.subtitle)}
  </text>
  <text x="${W / 2}" y="${metaY.toFixed(2)}" text-anchor="middle" fill="${palette.mutedInk}" font-family="${fontFamily(req.metaFont)}" font-size="${Math.max(9, req.metaFontSize).toFixed(2)}" letter-spacing="0.16em">
    ${svgEscape(req.metaText)}
  </text>
</svg>`;
}
