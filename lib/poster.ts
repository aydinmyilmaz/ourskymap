import { clamp01 } from './astro';
import { buildChartGeometry } from './geometry';
import type { PosterRequest } from './types';
import { DateTime } from 'luxon';

function svgEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function moonIlluminatedPath(cx: number, cy: number, r: number, phaseDeg: number, mirrorHorizontal: boolean): string {
  const phi = (phaseDeg * Math.PI) / 180;
  const a = Math.cos(phi);
  const rx = Math.max(0.001, Math.abs(a) * r);
  const isWaxing = phaseDeg < 180;
  const outerSweep = (isWaxing !== mirrorHorizontal) ? 1 : 0;
  const largeArc = a < 0 ? 1 : 0;
  const x0 = cx.toFixed(2);
  const yTop = (cy - r).toFixed(2);
  const yBot = (cy + r).toFixed(2);
  return `M ${x0} ${yTop} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 ${outerSweep} ${x0} ${yBot} A ${rx.toFixed(2)} ${r.toFixed(2)} 0 ${largeArc} ${outerSweep} ${x0} ${yTop} Z`;
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

function getPalette(name: PosterRequest['poster']['palette']): Palette {
  switch (name) {
    case 'classic-black':
      return { bg: '#0b0b0d', ink: '#f6f6f7', mutedInk: 'rgba(246,246,247,0.55)', accent: '#f6f6f7' };
    case 'navy-gold':
      return { bg: '#151c2d', ink: '#f4c25b', mutedInk: 'rgba(244,194,91,0.35)', accent: '#f4c25b' };
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

export function renderPosterSvg(req: PosterRequest): string {
  const { latitude, longitude, timeUtcIso, locationLabel, params, poster } = req;
  const date = new Date(timeUtcIso);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid timeUtcIso');

  const geomLayout = poster.size === 'a4' ? 'a4' : 'square';
  const geom = buildChartGeometry({ latitude, longitude, date, params, layout: geomLayout });

  const palette = getPalette(poster.palette);
  const inkRgb = hexToRgb(poster.inkColor || '');
  if (inkRgb) {
    palette.ink = `#${poster.inkColor.trim().replace(/^#/, '').toLowerCase()}`;
    palette.accent = palette.ink;
    palette.mutedInk = `rgba(${inkRgb.r},${inkRgb.g},${inkRgb.b},0.40)`;
  }

  // Poster layout regions
  const size = poster.size;
  const margin = size === '16x20' || size === '20x20' ? 72 : size === 'square' ? 70 : 48;
  const frameInset = poster.borderInset;
  const borderW = poster.borderWidth;

  const W = size === '16x20' ? 16 * 72 : size === '20x20' ? 20 * 72 : size === 'square' ? 1024 : 595;
  const H = size === '16x20' ? 20 * 72 : size === '20x20' ? 20 * 72 : size === 'square' ? 1024 : 842;
  const chartDiameter = poster.chartDiameter > 0 ? poster.chartDiameter : size === 'square' ? 760 : 520;
  const chartR = chartDiameter / 2;
  const chartCx = W / 2;
  const chartCy = size === 'square' ? H * 0.44 : size === 'a4' ? 320 : margin + frameInset + chartR + 28;

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

  // Build azimuth scale for poster (simpler: just outer ring + cardinals)
  const azScale: string[] = [];
  if (includeAzScale) {
    const sinScale = params.mirrorHorizontal ? -1 : 1;
    const clampWidth = (v: number) => Math.max(0, Math.min(20, v));
    const innerR = chartR;
    const outerR = chartR + Math.max(0, poster.ringGap ?? 18);
    azScale.push(
      `<circle cx="${chartCx}" cy="${chartCy}" r="${innerR}" fill="none" stroke="${palette.ink}" stroke-width="${clampWidth(poster.ringInnerWidth)}" opacity="0.9"/>`
    );
    azScale.push(
      `<circle cx="${chartCx}" cy="${chartCy}" r="${outerR}" fill="none" stroke="${palette.ink}" stroke-width="${clampWidth(poster.ringOuterWidth)}" opacity="0.9"/>`
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
          `<text x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" font-size="18" font-weight="700" fill="${palette.ink}" text-anchor="middle" dominant-baseline="middle">${lab}</text>`
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

  const labelFill = palette.mutedInk;

  const frame = poster.border
    ? `<rect x="${margin + frameInset}" y="${margin + frameInset}" width="${W - 2 * (margin + frameInset)}" height="${H - 2 * (margin + frameInset)}" fill="none" stroke="${palette.ink}" stroke-width="${borderW}" opacity="0.9"/>`
    : '';

  const fontFamily = (k: PosterRequest['poster']['titleFont'] | PosterRequest['poster']['namesFont'] | PosterRequest['poster']['metaFont']) => {
    switch (k) {
      case 'prata':
        return "Prata, ui-serif, Georgia, Times New Roman, serif";
      case 'jimmy-script':
        return "Jimmy Script, cursive, ui-serif, Georgia, Times New Roman, serif";
      case 'signika':
        return "Signika, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
      case 'mono':
        return 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      case 'sans':
        return 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
      case 'cursive':
        return 'cursive, ui-serif, Georgia, Times New Roman, serif';
      case 'serif':
      default:
        return 'ui-serif, Georgia, Times New Roman, serif';
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

  const scale = size === 'square' ? 1.25 : 1.0;
  const titleFontKey = (poster.titleFont ?? 'serif') as PosterRequest['poster']['titleFont'];
  const namesFontKey = (poster.namesFont ?? 'serif') as PosterRequest['poster']['namesFont'];
  const metaFontKey = (poster.metaFont ?? 'sans') as PosterRequest['poster']['metaFont'];
  let titleFont = Math.max(10, (poster.titleFontSize ?? 40) * scale);
  let namesFont = Math.max(10, (poster.namesFontSize ?? 22) * scale);
  let metaFont = Math.max(10, (poster.metaFontSize ?? 12) * scale);
  const metaFontWeight = poster.metaFontWeight ?? 500;
  const metaLetterSpacing = poster.metaLetterSpacing ?? 0;
  const metaLineSpacing = poster.metaLineSpacing ?? 1.35;
  const metaUppercase = !!poster.metaUppercase;

  const minTitleFont = 18;
  const minNamesFont = 12;
  const minMetaFont = 10;

  const chartBottom = chartCy + chartR;
  const regionTop = chartBottom + (size === 'square' ? 52 : 46);
  const regionBottom = H - margin - (size === 'square' ? 52 : 54);
  const regionH = Math.max(0, regionBottom - regionTop);

  const titleLineHeight = () => titleFont * 1.12;
  const namesLineHeight = () => namesFont * 1.18;
  const metaLineHeight = () => metaFont * metaLineSpacing;

  const gap1 = 14;
  const gap2 = 16;

  const calcNeeded = () => {
    let h = 0;
    if (title) h += titleLineHeight();
    if (namesLines.length) h += (title ? gap1 : 0) + namesLines.length * namesLineHeight();
    if (metaTextLines.length) h += ((title || namesLines.length) ? gap2 : 0) + metaTextLines.length * metaLineHeight();
    return h;
  };

  for (let i = 0; i < 40 && calcNeeded() > regionH; i++) {
    if (titleFont > minTitleFont) titleFont -= 1.5;
    if (namesFont > minNamesFont) namesFont -= 1.0;
    if (metaFont > minMetaFont) metaFont -= 0.8;
    if (titleFont <= minTitleFont && namesFont <= minNamesFont && metaFont <= minMetaFont) break;
  }

  const textBlock: string[] = [];
  let y = regionTop + Math.max(0, (regionH - calcNeeded()) / 2);

  if (title) {
    y += titleLineHeight();
    textBlock.push(
      `<text x="${W / 2}" y="${y.toFixed(2)}" font-size="${titleFont.toFixed(2)}" fill="${palette.accent}" text-anchor="middle" letter-spacing="2" font-family="${fontFamily(titleFontKey)}">${svgEscape(title.toUpperCase())}</text>`
    );
  }

  if (namesLines.length) {
    y += title ? gap1 : 0;
    for (const line of namesLines) {
      y += namesLineHeight();
      textBlock.push(
        `<text x="${W / 2}" y="${y.toFixed(2)}" font-size="${namesFont.toFixed(2)}" fill="${palette.accent}" text-anchor="middle" font-family="${fontFamily(namesFontKey)}">${svgEscape(line)}</text>`
      );
    }
  }

  const metaLines: string[] = [];
  if (metaTextLines.length) {
    y += (title || namesLines.length) ? gap2 : 0;
    for (const line of metaTextLines) {
      y += metaLineHeight();
      const txt = metaUppercase ? line.toUpperCase() : line;
      metaLines.push(
        `<text x="${W / 2}" y="${y.toFixed(2)}" font-size="${metaFont.toFixed(2)}" fill="${palette.ink}" opacity="0.9" text-anchor="middle" font-family="${fontFamily(metaFontKey)}" font-weight="${metaFontWeight}" letter-spacing="${metaLetterSpacing}">${svgEscape(txt)}</text>`
      );
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect x="0" y="0" width="${W}" height="${H}" fill="${palette.bg}"/>
  ${frame}
  <defs>
    <clipPath id="clipCircle">
      <circle cx="${chartCx}" cy="${chartCy}" r="${chartR}"/>
    </clipPath>
  </defs>
  <g clip-path="url(#clipCircle)">
    <g transform="${transform}">
      ${geom.eclipticPoints.length > 2 ? `<polyline points="${geom.eclipticPoints.join(' ')}" fill="none" stroke="${palette.ink}" stroke-width="1" stroke-dasharray="7 7" opacity="${params.eclipticAlpha}"/>` : ''}
      ${geom.linePaths.length ? `<path d="${geom.linePaths.join(' ')}" fill="none" stroke="${palette.ink}" stroke-width="${params.constellationLineWidth}" opacity="${params.constellationLineAlpha}" stroke-linecap="round"/>` : ''}
      <g opacity="${clamp01(params.starAlpha)}">
        ${geom.starPoints.map((p) => `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${(Math.sqrt(p.size) * 0.55).toFixed(2)}" fill="${palette.ink}"/>`).join('')}
      </g>
      <g opacity="${clamp01(params.vertexAlpha)}">
        ${geom.vertexPoints.map((p) => `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${(Math.sqrt(p.size) * 0.6).toFixed(2)}" fill="${palette.ink}"/>`).join('')}
      </g>
      <g>
        ${
          geom.solarSystem.length
            ? geom.solarSystem
                .map((o) => {
                  const stroke = palette.bg;
                  if (o.kind === 'moon' && typeof o.moonPhaseDeg === 'number') {
                    const fill = palette.ink;
                    const path = moonIlluminatedPath(o.x, o.y, o.r, o.moonPhaseDeg, params.mirrorHorizontal);
                    return [
                      `<circle cx="${o.x.toFixed(2)}" cy="${o.y.toFixed(2)}" r="${o.r.toFixed(2)}" fill="none" stroke="${stroke}" stroke-width="1.2" opacity="0.95"/>`,
                      `<path d="${path}" fill="${fill}" opacity="0.95"/>`,
                      params.labelSolarSystem
                        ? `<text x="${(o.x + o.r + 4).toFixed(2)}" y="${(o.y + 2).toFixed(2)}" font-size="10" fill="${palette.ink}" opacity="0.75" text-anchor="start" dominant-baseline="middle" font-family="ui-sans-serif, system-ui">${svgEscape(o.label)}</text>`
                        : ''
                    ].join('');
                  }
                  const fill = o.kind === 'sun' ? '#FDB813' : o.kind === 'moon' ? palette.mutedInk : palette.ink;
                  return [
                    `<circle cx="${o.x.toFixed(2)}" cy="${o.y.toFixed(2)}" r="${o.r.toFixed(2)}" fill="${fill}" stroke="${stroke}" stroke-width="1.2" opacity="0.95"/>`,
                    params.labelSolarSystem
                      ? `<text x="${(o.x + o.r + 4).toFixed(2)}" y="${(o.y + 2).toFixed(2)}" font-size="10" fill="${palette.ink}" opacity="0.75" text-anchor="start" dominant-baseline="middle" font-family="ui-sans-serif, system-ui">${svgEscape(o.label)}</text>`
                      : ''
                  ].join('');
                })
                .join('')
            : ''
        }
      </g>
      <g>
        ${
          geom.deepSky.length
            ? geom.deepSky
                .map((d) => {
                  const fill = palette.mutedInk;
                  const s = 4.2;
                  const marker =
                    d.kind === 'cluster'
                      ? `<rect x="${(d.x - s / 2).toFixed(2)}" y="${(d.y - s / 2).toFixed(2)}" width="${s.toFixed(2)}" height="${s.toFixed(2)}" fill="none" stroke="${fill}" stroke-width="1.1" opacity="0.8"/>`
                      : d.kind === 'globular'
                        ? `<circle cx="${d.x.toFixed(2)}" cy="${d.y.toFixed(2)}" r="${(s / 2).toFixed(2)}" fill="none" stroke="${fill}" stroke-width="1.1" opacity="0.8"/>`
                        : `<path d="M ${(d.x).toFixed(2)} ${(d.y - s / 2).toFixed(2)} L ${(d.x + s / 2).toFixed(2)} ${(d.y).toFixed(2)} L ${(d.x).toFixed(2)} ${(d.y + s / 2).toFixed(2)} L ${(d.x - s / 2).toFixed(2)} ${(d.y).toFixed(2)} Z" fill="none" stroke="${fill}" stroke-width="1.1" opacity="0.8"/>`;

                  const label = params.labelDeepSky
                    ? `<text x="${(d.x + 6).toFixed(2)}" y="${(d.y + 2).toFixed(2)}" font-size="9" fill="${palette.mutedInk}" opacity="0.75" text-anchor="start" dominant-baseline="middle" font-family="ui-sans-serif, system-ui">${svgEscape(d.label)}</text>`
                    : '';
                  return `${marker}${label}`;
                })
                .join('')
            : ''
        }
      </g>
      <g>
        ${geom.constellationLabels
          .map((l) => `<text x="${l.x.toFixed(2)}" y="${l.y.toFixed(2)}" font-size="10" fill="${labelFill}" opacity="0.75" text-anchor="middle" dominant-baseline="middle">${svgEscape(l.text)}</text>`)
          .join('')}
      </g>
    </g>
  </g>
  ${azScale.join('\n  ')}
  ${textBlock.join('\n  ')}
  ${metaLines.join('\n  ')}
</svg>`;
}
