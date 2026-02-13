import { clamp01 } from './astro';
import { buildChartGeometry } from './geometry';
import type { ChartRequest } from './types';
import { DateTime } from 'luxon';

function svgEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function moonIlluminatedPath(cx: number, cy: number, r: number, phaseDeg: number, mirrorHorizontal: boolean): string {
  // phaseDeg: reduced phase angle in [0..180] where 0=new, 180=full.
  const p = Math.max(0, Math.min(180, phaseDeg));
  const phi = (p * Math.PI) / 180;
  const k = Math.cos(phi); // +1=new, 0=quarter, -1=full
  const rx = Math.max(0.001, Math.abs(k) * r);
  const sign = k < 0 ? -1 : 1; // gibbous/full bulges opposite to the sunward limb

  const n = 48;
  const pts: { x: number; y: number }[] = [];

  // Outer limb (sunward side) is on +X before rotation.
  for (let i = 0; i <= n; i++) {
    const t = (-Math.PI / 2) + (i * Math.PI) / n;
    pts.push({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) });
  }
  // Terminator curve back to top.
  for (let i = n; i >= 0; i--) {
    const t = (-Math.PI / 2) + (i * Math.PI) / n;
    pts.push({ x: cx + sign * rx * Math.cos(t), y: cy + r * Math.sin(t) });
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

function buildAzimuthScale(opts: {
  chartCx: number;
  chartCy: number;
  chartR: number;
  fg: string;
  innerWidth: number;
  outerWidth: number;
  mirrorHorizontal: boolean;
}): string[] {
  const { chartCx, chartCy, chartR, fg, innerWidth, outerWidth, mirrorHorizontal } = opts;
  const sinScale = mirrorHorizontal ? -1 : 1;
  const clampWidth = (v: number) => Math.max(0, Math.min(12, v));
  const azScale: string[] = [];
  const innerR = chartR;
  const outerR = chartR + 20;
  azScale.push(`<circle cx="${chartCx}" cy="${chartCy}" r="${innerR}" fill="none" stroke="${fg}" stroke-width="${clampWidth(innerWidth)}"/>`);
  azScale.push(`<circle cx="${chartCx}" cy="${chartCy}" r="${outerR}" fill="none" stroke="${fg}" stroke-width="${clampWidth(outerWidth)}"/>`);
  for (let az = 0; az < 360; az += 10) {
    const ang = (az * Math.PI) / 180;
    const x1 = chartCx + innerR * Math.sin(ang) * sinScale;
    const y1 = chartCy - innerR * Math.cos(ang);
    const tick = az % 30 === 0 ? 10 : 6;
    const x2 = chartCx + (innerR + tick) * Math.sin(ang) * sinScale;
    const y2 = chartCy - (innerR + tick) * Math.cos(ang);
    azScale.push(`<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${fg}" stroke-width="0.6"/>`);

    const tx = chartCx + (outerR - 6) * Math.sin(ang) * sinScale;
    const ty = chartCy - (outerR - 6) * Math.cos(ang);
    const rot = mirrorHorizontal ? az : -az;
    azScale.push(
      `<text x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" font-size="8" fill="${fg}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${rot} ${tx.toFixed(2)} ${ty.toFixed(2)})">${az}</text>`
    );
  }
  const cards: [string, number][] = [
    ['N', 0],
    ['E', 90],
    ['S', 180],
    ['W', 270]
  ];
  for (const [lab, az] of cards) {
    const ang = (az * Math.PI) / 180;
    const tx = chartCx + (outerR + 14) * Math.sin(ang) * sinScale;
    const ty = chartCy - (outerR + 14) * Math.cos(ang);
    azScale.push(`<text x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" font-size="18" font-weight="700" fill="${fg}" text-anchor="middle" dominant-baseline="middle">${lab}</text>`);
  }
  return azScale;
}

export function renderSvg(req: ChartRequest): string {
  const { latitude, longitude, timeUtcIso, locationLabel, params } = req;
  const date = new Date(timeUtcIso);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid timeUtcIso');

  const geom = buildChartGeometry({ latitude, longitude, date, params, layout: 'a4' });

  const bg = params.theme === 'dark' ? '#0b1020' : '#ffffff';
  const fg = params.theme === 'dark' ? '#ffffff' : '#111111';
  const line = params.theme === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)';
  const constLine = params.theme === 'dark' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
  const labelFill = params.theme === 'dark' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.45)';
  const labelStroke = params.theme === 'dark' ? 'rgba(0,0,0,0.0)' : 'rgba(255,255,255,0.9)';
  const labelStrokeWidth = params.theme === 'dark' ? 0 : 3;
  const gridStroke = params.theme === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)';

  const azScale = params.showAzimuthScale
    ? buildAzimuthScale({
        chartCx: geom.chartCx,
        chartCy: geom.chartCy,
        chartR: geom.chartR,
        fg,
        innerWidth: params.azimuthRingInnerWidth,
        outerWidth: params.azimuthRingOuterWidth,
        mirrorHorizontal: params.mirrorHorizontal
      })
    : [];

  const info1 = `Location: ${locationLabel}`;
  const dtUtc = DateTime.fromISO(timeUtcIso, { zone: 'utc' });
  const dt = req.timeZone ? dtUtc.setZone(req.timeZone) : dtUtc;
  const zoneLabel = `UTC ${dt.toFormat('ZZ')}`;
  const info2 = `Time: ${dt.toFormat('dd LLLL yyyy HH:mm')} (${zoneLabel})`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${geom.W}" height="${geom.H}" viewBox="0 0 ${geom.W} ${geom.H}">
  <rect x="0" y="0" width="${geom.W}" height="${geom.H}" fill="${bg}"/>
  ${azScale.join('\n  ')}
  <g>
    ${
      geom.coordinateGridPaths.length
        ? `<path d="${geom.coordinateGridPaths.join(' ')}" fill="none" stroke="${gridStroke}" stroke-width="0.8" stroke-linecap="round" opacity="0.9"/>`
        : ''
    }
    ${geom.eclipticPoints.length > 2 ? `<polyline points="${geom.eclipticPoints.join(' ')}" fill="none" stroke="${line}" stroke-width="1" stroke-dasharray="7 7" opacity="${params.eclipticAlpha}"/>` : ''}
  </g>
  <g>
    ${geom.linePaths.length ? `<path d="${geom.linePaths.join(' ')}" fill="none" stroke="${constLine}" stroke-width="${params.constellationLineWidth}" opacity="${params.constellationLineAlpha}" stroke-linecap="round"/>` : ''}
  </g>
  <g opacity="${clamp01(params.starAlpha)}">
    ${geom.starPoints.map((p) => `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${(Math.sqrt(p.size) * 0.55).toFixed(2)}" fill="${fg}"/>`).join('')}
  </g>
  <g opacity="${clamp01(params.vertexAlpha)}">
    ${geom.vertexPoints.map((p) => `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${(Math.sqrt(p.size) * 0.6).toFixed(2)}" fill="${fg}"/>`).join('')}
  </g>
  <g>
    ${
      geom.solarSystem.length
        ? geom.solarSystem
            .map((o) => {
              const fill =
                o.kind === 'sun'
                  ? params.theme === 'dark'
                    ? '#FDB813'
                    : '#D68D00'
                  : o.kind === 'moon'
                    ? params.theme === 'dark'
                      ? '#D1D5DB'
                      : '#6B7280'
                    : params.theme === 'dark'
                      ? '#93C5FD'
                      : '#2563EB';
              const stroke = params.theme === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.75)';
              const labelFill = params.theme === 'dark' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)';
              const lx = (o.x + o.r + 4).toFixed(2);
              const ly = (o.y + 3).toFixed(2);
              if (o.kind === 'sun') {
                const p = sunburstPath(o.x, o.y, o.r * 1.15, 12, 0.52);
                return [
                  `<path d="${p}" fill="${fill}" stroke="${stroke}" stroke-width="1.2" stroke-linejoin="round"/>`,
                  `<circle cx="${o.x.toFixed(2)}" cy="${o.y.toFixed(2)}" r="${(o.r * 0.45).toFixed(2)}" fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>`,
                  params.labelSolarSystem
                    ? `<text x="${lx}" y="${ly}" font-size="10" fill="${labelFill}" stroke="${stroke}" stroke-width="3" paint-order="stroke" text-anchor="start" dominant-baseline="middle">${svgEscape(o.label)}</text>`
                    : ''
                ].join('');
              }
              if (o.kind === 'moon' && typeof o.moonPhaseDeg === 'number') {
                const phase = o.moonPhaseDeg <= 180 ? o.moonPhaseDeg : 360 - o.moonPhaseDeg;
                const rot = Number.isFinite(o.limbAngleDeg as any) ? (o.limbAngleDeg as number) : 0;
                const path = phase >= 0.6 && phase <= 179.4 ? moonIlluminatedPath(o.x, o.y, o.r, phase, false) : '';
                return [
                  `<circle cx="${o.x.toFixed(2)}" cy="${o.y.toFixed(2)}" r="${o.r.toFixed(2)}" fill="none" stroke="${stroke}" stroke-width="1.2"/>`,
                  `<g transform="rotate(${rot.toFixed(2)} ${o.x.toFixed(2)} ${o.y.toFixed(2)})">`,
                  phase > 179.4
                    ? `<circle cx="${o.x.toFixed(2)}" cy="${o.y.toFixed(2)}" r="${o.r.toFixed(2)}" fill="${fill}" opacity="0.95"/>`
                    : phase < 0.6
                      ? ''
                      : `<path d="${path}" fill="${fill}" opacity="0.95"/>`,
                  `</g>`,
                  params.labelSolarSystem
                    ? `<text x="${lx}" y="${ly}" font-size="10" fill="${labelFill}" stroke="${stroke}" stroke-width="3" paint-order="stroke" text-anchor="start" dominant-baseline="middle">${svgEscape(o.label)}</text>`
                    : ''
                ].join('');
              }
              return [
                `<circle cx="${o.x.toFixed(2)}" cy="${o.y.toFixed(2)}" r="${o.r.toFixed(2)}" fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>`,
                params.labelSolarSystem
                  ? `<text x="${lx}" y="${ly}" font-size="10" fill="${labelFill}" stroke="${stroke}" stroke-width="3" paint-order="stroke" text-anchor="start" dominant-baseline="middle">${svgEscape(o.label)}</text>`
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
              const stroke = params.theme === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.75)';
              const fill = params.theme === 'dark' ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.6)';
              const labelFill = params.theme === 'dark' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.5)';
              const s = 4.6;
              const x = d.x.toFixed(2);
              const y = d.y.toFixed(2);
              const marker =
                d.kind === 'cluster'
                  ? `<rect x="${(d.x - s / 2).toFixed(2)}" y="${(d.y - s / 2).toFixed(2)}" width="${s.toFixed(2)}" height="${s.toFixed(2)}" fill="none" stroke="${fill}" stroke-width="1.2"/>`
                  : d.kind === 'globular'
                    ? `<circle cx="${x}" cy="${y}" r="${(s / 2).toFixed(2)}" fill="none" stroke="${fill}" stroke-width="1.2"/>`
                    : `<path d="M ${(d.x).toFixed(2)} ${(d.y - s / 2).toFixed(2)} L ${(d.x + s / 2).toFixed(2)} ${(d.y).toFixed(2)} L ${(d.x).toFixed(2)} ${(d.y + s / 2).toFixed(2)} L ${(d.x - s / 2).toFixed(2)} ${(d.y).toFixed(2)} Z" fill="none" stroke="${fill}" stroke-width="1.2"/>`;

              const label = params.labelDeepSky
                ? `<text x="${(d.x + 6).toFixed(2)}" y="${(d.y + 3).toFixed(2)}" font-size="9" fill="${labelFill}" stroke="${stroke}" stroke-width="3" paint-order="stroke" text-anchor="start" dominant-baseline="middle">${svgEscape(d.label)}</text>`
                : '';
              return `${marker}${label}`;
            })
            .join('')
        : ''
    }
  </g>
  <g>
    ${geom.constellationLabels
      .map(
        (l) =>
          `<text x="${l.x.toFixed(2)}" y="${l.y.toFixed(2)}" font-size="10" fill="${labelFill}" stroke="${labelStroke}" stroke-width="${labelStrokeWidth}" paint-order="stroke" text-anchor="middle" dominant-baseline="middle">${svgEscape(l.text)}</text>`
      )
      .join('')}
  </g>
  <g>
    <text x="48" y="760" font-size="14" fill="${fg}" text-anchor="start">${svgEscape(info1)}</text>
    <text x="48" y="785" font-size="14" fill="${fg}" text-anchor="start">${svgEscape(info2)}</text>
  </g>
</svg>`;
}
