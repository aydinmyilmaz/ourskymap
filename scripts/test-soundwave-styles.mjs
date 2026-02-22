#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const BASE_URL = process.env.SOUNDWAVE_TEST_URL || 'http://127.0.0.1:4010/soundwave';
const AUDIO_PATH =
  process.env.SOUNDWAVE_TEST_AUDIO ||
  path.join(process.cwd(), 'data', 'Bryan Adams - Have You Ever Really Loved A Woman (Classic Version) - Bryan Adams.mp3');
const OUT_DIR = process.env.SOUNDWAVE_TEST_OUT || path.join(process.cwd(), 'tmp', 'soundwave-style-check');

function lineCount(svg) {
  const m = svg.match(/<line\b/g);
  return m ? m.length : 0;
}

function pathCount(svg) {
  const m = svg.match(/<path\b/g);
  return m ? m.length : 0;
}

function lineStats(svg) {
  const widths = [];
  const opacities = [];
  const lineTagRe = /<line\b[^>]*>/g;
  const widthRe = /stroke-width="([0-9.]+)"/;
  const opacityRe = /stroke-opacity="([0-9.]+)"/;
  for (const tag of svg.match(lineTagRe) || []) {
    const w = widthRe.exec(tag);
    if (w) widths.push(Number(w[1]));
    const o = opacityRe.exec(tag);
    if (o) opacities.push(Number(o[1]));
  }
  const summary = (arr) => {
    if (!arr.length) return { min: 0, max: 0, avg: 0 };
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    return { min: Number(min.toFixed(3)), max: Number(max.toFixed(3)), avg: Number(avg.toFixed(3)) };
  };
  return {
    width: summary(widths),
    opacity: summary(opacities)
  };
}

async function waitForPreviewStabilize(page, prevHtml = '') {
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(250);
    const html = await page.locator('.svgMount').innerHTML();
    if (html.includes('<svg') && html !== prevHtml) return html;
  }
  const html = await page.locator('.svgMount').innerHTML();
  if (!html.includes('<svg')) throw new Error('SVG preview was not rendered.');
  return html;
}

async function clickStyle(page, label) {
  const btn = page.locator('.waveStyleBtn', { hasText: label }).first();
  await btn.click();
}

async function saveCurrentSvg(page, fileName, prevHtml = '') {
  const html = await waitForPreviewStabilize(page, prevHtml);
  const svg = html.slice(html.indexOf('<svg'));
  const outPath = path.join(OUT_DIR, fileName);
  await fs.writeFile(outPath, svg, 'utf8');
  return { svg, outPath };
}

async function run() {
  const { chromium } = await import('playwright');
  await fs.mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1520, height: 1040 } });
  page.setDefaultTimeout(120000);

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.svgMount');

    const audioInput = page.locator('input[type="file"][accept="audio/*"]');
    await audioInput.setInputFiles(AUDIO_PATH);

    await page.waitForFunction(() => {
      const text = document.body?.innerText || '';
      return text.includes('(cached)') || text.includes('•');
    });

    let prev = '';
    const filled = await saveCurrentSvg(page, 'filled.svg', prev);
    prev = filled.svg;

    await clickStyle(page, 'Fine Lines');
    const fine = await saveCurrentSvg(page, 'fine-lines.svg', prev);
    prev = fine.svg;

    await clickStyle(page, 'Needle Lines');
    const needle = await saveCurrentSvg(page, 'needle-lines.svg', prev);

    await page.screenshot({ path: path.join(OUT_DIR, 'preview.png'), fullPage: true });

    const report = {
      audio: AUDIO_PATH,
      baseUrl: BASE_URL,
      files: {
        filled: {
          file: filled.outPath,
          lineCount: lineCount(filled.svg),
          pathCount: pathCount(filled.svg),
          lineStats: lineStats(filled.svg)
        },
        fineLines: {
          file: fine.outPath,
          lineCount: lineCount(fine.svg),
          pathCount: pathCount(fine.svg),
          lineStats: lineStats(fine.svg)
        },
        needleLines: {
          file: needle.outPath,
          lineCount: lineCount(needle.svg),
          pathCount: pathCount(needle.svg),
          lineStats: lineStats(needle.svg)
        }
      }
    };
    const reportPath = path.join(OUT_DIR, 'report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err?.stack || String(err));
  process.exitCode = 1;
});
