import fs from 'node:fs';
import path from 'node:path';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function hsl(h, s, l) {
  return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;
}

const outDir = path.resolve(process.cwd(), 'age_test_images');
fs.mkdirSync(outDir, { recursive: true });

const widths = [480, 640, 800, 960, 1200, 1600, 2000];
const heights = [480, 600, 720, 900, 1200, 1600];

const total = Number(process.argv[2] ?? 80);
const count = Number.isFinite(total) ? Math.max(50, Math.min(120, total)) : 80;

for (let i = 1; i <= count; i++) {
  const rng = mulberry32(0xabc000 + i * 1337);
  const w = pick(rng, widths);
  const h = pick(rng, heights);
  const bg1 = hsl(rng() * 360, 40 + rng() * 40, 45 + rng() * 25);
  const bg2 = hsl((rng() * 360 + 120) % 360, 40 + rng() * 40, 35 + rng() * 25);
  const accent = hsl((rng() * 360 + 240) % 360, 55 + rng() * 35, 55 + rng() * 25);

  const circles = Array.from({ length: 8 }).map((_, idx) => {
    const cx = rng() * w;
    const cy = rng() * h;
    const r = 40 + rng() * Math.min(w, h) * 0.18;
    const op = 0.15 + rng() * 0.25;
    const fill = idx % 2 ? accent : '#ffffff';
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" opacity="${op.toFixed(3)}"/>`;
  });

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg1}"/>
      <stop offset="1" stop-color="${bg2}"/>
    </linearGradient>
    <filter id="n" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${i}" />
      <feColorMatrix type="matrix" values="
        1 0 0 0 0
        0 1 0 0 0
        0 0 1 0 0
        0 0 0 0.08 0" />
    </filter>
  </defs>
  <rect x="0" y="0" width="${w}" height="${h}" fill="url(#g)"/>
  ${circles.join('\n  ')}
  <rect x="0" y="0" width="${w}" height="${h}" fill="#000" opacity="0.06" filter="url(#n)"/>
  <g font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" fill="#111" opacity="0.85">
    <rect x="${(w * 0.06).toFixed(1)}" y="${(h * 0.74).toFixed(1)}" width="${(w * 0.88).toFixed(1)}" height="${(h * 0.20).toFixed(1)}" fill="#fff" opacity="0.55" rx="18"/>
    <text x="${(w * 0.10).toFixed(1)}" y="${(h * 0.82).toFixed(1)}" font-size="${Math.max(18, Math.round(Math.min(w, h) * 0.05))}" font-weight="800">
      SAMPLE ${pad2(i)}
    </text>
    <text x="${(w * 0.10).toFixed(1)}" y="${(h * 0.90).toFixed(1)}" font-size="${Math.max(14, Math.round(Math.min(w, h) * 0.035))}" font-weight="600">
      ${w} × ${h}
    </text>
  </g>
</svg>`;

  const name = `sample_${pad2(i)}_${w}x${h}.svg`;
  fs.writeFileSync(path.join(outDir, name), svg, 'utf8');
}

console.log(`Generated ${count} SVG images in: ${outDir}`);

