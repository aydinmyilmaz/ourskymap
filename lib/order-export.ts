import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import type { CheckoutDraft } from './checkout';
import { LOCAL_FONT_ASSETS } from './local-font-assets';
import { renderPosterSvg } from './poster';
import { buildOrderFileToken, mapDesignSizeToPrintSize } from './print-size-utils';
import type { PrintSizeKey } from './print-types';

export type ExportMode = 'browser' | 'server';
export type ExportEngineLabel = 'browser' | 'fly-api' | 'vercel-api' | 'local-api';

export type OrderExportBundle = {
  exportSvg: string;
  png: Buffer;
  pdf: Buffer;
  zipBuffer: Buffer;
  fileToken: string;
  sourcePrintSize: PrintSizeKey | null;
};

const TARGET_EXPORT_DPI = 300;
const BASE_SVG_DPI = 72;
const MAX_EXPORT_PIXELS = 70_000_000;
const EXPORT_ENGINE = (process.env.EXPORT_ENGINE ?? 'local').trim().toLowerCase();
const RENDER_WORKER_URL = (process.env.FLY_RENDER_URL ?? '').trim().replace(/\/+$/, '');
const RENDER_WORKER_SHARED_SECRET = (process.env.RENDER_SHARED_SECRET ?? '').trim();
const RENDER_WORKER_TIMEOUT_MS = Number.parseInt(process.env.FLY_RENDER_TIMEOUT_MS ?? '30000', 10);

const MOON_ASSET_PATH_REGEX = /\/(?:moon_(?:gold|silver)\.png|moon-phases\/(?:gold|silver)\/(?:[1-9]|[12]\d|30)\.png)/g;
const SAFE_MOON_ASSET_REL_PATH_REGEX = /^(?:moon_(?:gold|silver)\.png|moon-phases\/(?:gold|silver)\/(?:[1-9]|[12]\d|30)\.png)$/;

type ResvgCtor = new (
  svg: string,
  options?: {
    fitTo?: { mode: 'zoom'; value: number };
    font?: {
      fontFiles?: string[];
      loadSystemFonts?: boolean;
    };
  }
) => {
  render(): { asPng(): Uint8Array };
};

type RemoteRenderResult = {
  png: Buffer;
  pdf: Buffer;
  peakRssMb: number | null;
  renderTimeMs: number | null;
  rssTrace: string | null;
};

const publicAssetBytesCache: Record<string, Buffer | null> = {};
const moonDataUriCache: Record<string, string | null> = {};
let embeddedPosterFontsCssCache: string | null | undefined;
let cachedResvgCtor: ResvgCtor | null | undefined;

function getPublicAssetAbsolutePath(relPath: string): string {
  return path.join(process.cwd(), 'public', relPath.replace(/^\/+/, ''));
}

function loadPublicAssetBytes(relPath: string): Buffer | null {
  const normalizedRelPath = relPath.replace(/^\/+/, '');
  const cacheKey = normalizedRelPath.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(publicAssetBytesCache, cacheKey)) {
    return publicAssetBytesCache[cacheKey];
  }
  const absPath = getPublicAssetAbsolutePath(normalizedRelPath);
  if (!existsSync(absPath)) {
    publicAssetBytesCache[cacheKey] = null;
    return null;
  }
  try {
    const raw = readFileSync(absPath);
    publicAssetBytesCache[cacheKey] = raw;
    return raw;
  } catch {
    publicAssetBytesCache[cacheKey] = null;
    return null;
  }
}

function replaceAssetUrlRefs(svg: string, assetPath: string, replacement: string): string {
  return svg
    .replaceAll(`href="${assetPath}"`, `href="${replacement}"`)
    .replaceAll(`href='${assetPath}'`, `href='${replacement}'`)
    .replaceAll(`xlink:href="${assetPath}"`, `xlink:href="${replacement}"`)
    .replaceAll(`xlink:href='${assetPath}'`, `xlink:href='${replacement}'`);
}

function listMoonAssetPaths(svg: string): string[] {
  return [...new Set(svg.match(MOON_ASSET_PATH_REGEX) ?? [])];
}

function getMoonImageDataUri(assetPath: string): string | null {
  const relPath = assetPath.replace(/^\/+/, '');
  if (!SAFE_MOON_ASSET_REL_PATH_REGEX.test(relPath)) return null;
  if (Object.prototype.hasOwnProperty.call(moonDataUriCache, relPath)) return moonDataUriCache[relPath];
  const raw = loadPublicAssetBytes(relPath);
  if (!raw) {
    moonDataUriCache[relPath] = null;
    return null;
  }
  moonDataUriCache[relPath] = `data:image/png;base64,${raw.toString('base64')}`;
  return moonDataUriCache[relPath];
}

function withEmbeddedMoonUrls(svg: string): string {
  let result = svg;
  for (const assetPath of listMoonAssetPaths(svg)) {
    const dataUri = getMoonImageDataUri(assetPath);
    if (!dataUri) continue;
    result = replaceAssetUrlRefs(result, assetPath, dataUri);
  }
  return result;
}

function getPosterFontAbsolutePath(fileName: string): string {
  return path.join(process.cwd(), 'public', 'fonts', fileName);
}

function getPosterFontFilePaths(): string[] {
  return [...new Set(
    LOCAL_FONT_ASSETS
      .map((asset) => getPosterFontAbsolutePath(asset.fileName))
      .filter((absPath) => existsSync(absPath))
  )];
}

function getEmbeddedPosterFontsCss(): string {
  if (embeddedPosterFontsCssCache !== undefined) return embeddedPosterFontsCssCache || '';
  try {
    const blocks: string[] = [];
    for (const asset of LOCAL_FONT_ASSETS) {
      const absPath = getPosterFontAbsolutePath(asset.fileName);
      if (!existsSync(absPath)) continue;
      const raw = readFileSync(absPath);
      const dataUri = `data:font/ttf;base64,${raw.toString('base64')}`;
      blocks.push(
        `@font-face{font-family:'${asset.family}';font-style:${asset.style};font-weight:${asset.weight};font-display:swap;src:url(${dataUri}) format('truetype');}`
      );
    }
    embeddedPosterFontsCssCache = blocks.join('\n');
  } catch {
    embeddedPosterFontsCssCache = '';
  }
  return embeddedPosterFontsCssCache || '';
}

function injectFontCssIntoSvg(svg: string, css: string): string {
  const trimmed = css.trim();
  if (!trimmed) return svg;
  const styleNode = `<style><![CDATA[\n${trimmed}\n]]></style>`;
  if (svg.includes('<defs>')) {
    return svg.replace('<defs>', `<defs>\n${styleNode}`);
  }
  const svgOpenTag = svg.match(/<svg[^>]*>/i)?.[0];
  if (!svgOpenTag) return svg;
  return svg.replace(svgOpenTag, `${svgOpenTag}\n<defs>\n${styleNode}\n</defs>`);
}

function getSvgSize(svg: string): { width: number; height: number } {
  const viewBoxMatch = svg.match(/viewBox="[^"]*?(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)"/i);
  if (viewBoxMatch) {
    return { width: Math.max(1, Number(viewBoxMatch[1])), height: Math.max(1, Number(viewBoxMatch[2])) };
  }
  const wMatch = svg.match(/width="(\d+(?:\.\d+)?)"/i);
  const hMatch = svg.match(/height="(\d+(?:\.\d+)?)"/i);
  return {
    width: Math.max(1, Number(wMatch?.[1] || 1200)),
    height: Math.max(1, Number(hMatch?.[1] || 1800))
  };
}

async function getResvgCtor(): Promise<ResvgCtor | null> {
  if (cachedResvgCtor !== undefined) return cachedResvgCtor;
  try {
    const mod = (await import('@resvg/resvg-js')) as { Resvg?: ResvgCtor };
    cachedResvgCtor = typeof mod.Resvg === 'function' ? mod.Resvg : null;
  } catch {
    cachedResvgCtor = null;
  }
  return cachedResvgCtor;
}

function getRasterScale(svgWidth: number, svgHeight: number, maxPixels = MAX_EXPORT_PIXELS): number {
  const targetScale = TARGET_EXPORT_DPI / BASE_SVG_DPI;
  const basePixels = Math.max(1, svgWidth * svgHeight);
  const safeMaxPixels = Number.isFinite(maxPixels) && maxPixels > 1_000_000 ? maxPixels : MAX_EXPORT_PIXELS;
  const capByPixels = Math.sqrt(safeMaxPixels / basePixels);
  const scale = Math.max(1, Math.min(targetScale, capByPixels));
  return Number(scale.toFixed(3));
}

async function renderSvgToPng(
  svg: string,
  opts: { svgWidth: number; svgHeight: number; allowSharpFallback?: boolean; maxExportPixels?: number }
): Promise<Buffer> {
  const svgBuffer = Buffer.from(svg, 'utf-8');
  const scale = getRasterScale(opts.svgWidth, opts.svgHeight, opts.maxExportPixels);
  const targetWidth = Math.max(1, Math.round(opts.svgWidth * scale));
  const targetHeight = Math.max(1, Math.round(opts.svgHeight * scale));
  const Resvg = await getResvgCtor();
  if (Resvg) {
    try {
      const resvg = new Resvg(svg, {
        fitTo: { mode: 'zoom', value: scale },
        font: {
          fontFiles: getPosterFontFilePaths(),
          loadSystemFonts: true
        }
      });
      return Buffer.from(resvg.render().asPng());
    } catch {
      // Fall back to sharp only if explicitly allowed.
    }
  }
  if (!opts.allowSharpFallback) {
    throw new Error(
      'High-fidelity SVG renderer is unavailable. Install the matching @resvg binary package for this server and restart.'
    );
  }
  return sharp(svgBuffer, { density: Math.max(BASE_SVG_DPI, Math.round(BASE_SVG_DPI * scale)) })
    .resize(targetWidth, targetHeight, { fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function makePdfFromPng(pngBuffer: Buffer, pageWidthPt: number, pageHeightPt: number): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const pageWidth = Math.max(72, pageWidthPt);
  const pageHeight = Math.max(72, pageHeightPt);
  const pngImage = await pdfDoc.embedPng(pngBuffer);
  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  page.drawImage(pngImage, {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight
  });
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function renderViaFlyWorker(opts: {
  svg: string;
  svgWidth: number;
  svgHeight: number;
  allowSharpFallback: boolean;
}): Promise<RemoteRenderResult | null> {
  if (!RENDER_WORKER_URL || !RENDER_WORKER_SHARED_SECRET) return null;
  const timeoutMs = Number.isFinite(RENDER_WORKER_TIMEOUT_MS) && RENDER_WORKER_TIMEOUT_MS > 0
    ? RENDER_WORKER_TIMEOUT_MS
    : 30000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const res = await fetch(`${RENDER_WORKER_URL}/api/render-export`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-render-secret': RENDER_WORKER_SHARED_SECRET
      },
      body: JSON.stringify({
        svg: opts.svg,
        svgWidth: opts.svgWidth,
        svgHeight: opts.svgHeight,
        allowSharpFallback: opts.allowSharpFallback
      }),
      signal: controller.signal,
      cache: 'no-store'
    });
    if (!res.ok) {
      const elapsedMs = Date.now() - startedAt;
      let detail = '';
      try {
        detail = (await res.text()).slice(0, 600);
      } catch {
        detail = '';
      }
      console.warn(
        `[render-worker] non-200 status=${res.status} statusText=${res.statusText} elapsedMs=${elapsedMs} timeoutMs=${timeoutMs} detail=${detail || '<empty>'}`
      );
      return null;
    }
    const zipBuffer = Buffer.from(await res.arrayBuffer());
    if (!zipBuffer.length) return null;
    const zip = await JSZip.loadAsync(zipBuffer);
    const pngEntry = zip.file('render.png');
    const pdfEntry = zip.file('render.pdf');
    if (!pngEntry || !pdfEntry) return null;
    const [png, pdf] = await Promise.all([pngEntry.async('nodebuffer'), pdfEntry.async('nodebuffer')]);
    if (!png.length || !pdf.length) return null;
    const peakRssHeader = Number.parseInt(res.headers.get('x-render-peak-rss-mb') || '', 10);
    const renderTimeHeader = Number.parseInt(res.headers.get('x-render-time-ms') || '', 10);
    return {
      png,
      pdf,
      peakRssMb: Number.isFinite(peakRssHeader) ? peakRssHeader : null,
      renderTimeMs: Number.isFinite(renderTimeHeader) ? renderTimeHeader : null,
      rssTrace: res.headers.get('x-render-rss-trace') || null
    };
  } catch (err) {
    const elapsedMs = Date.now() - startedAt;
    console.warn(
      `[render-worker] fetch failed elapsedMs=${elapsedMs} timeoutMs=${timeoutMs} error=${err instanceof Error ? err.message : String(err)}`
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function normalizeExportMode(value: string | null | undefined): ExportMode {
  return String(value || '').trim().toLowerCase() === 'server' ? 'server' : 'browser';
}

export function getExportEngineLabel(exportMode: ExportMode): ExportEngineLabel {
  if (exportMode === 'browser') return 'browser';
  if (EXPORT_ENGINE === 'fly') return 'fly-api';
  if ((process.env.VERCEL || '').trim() === '1') return 'vercel-api';
  return 'local-api';
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function createDirectOrderCode(): string {
  return `DIRECT-${Date.now()}`;
}

export async function prepareOrderSvg(input: {
  draft: CheckoutDraft;
  orderCode: string;
}): Promise<{ exportSvg: string; fileToken: string; sourcePrintSize: PrintSizeKey | null }> {
  let svg = String(input.draft.previewSvg || '').trim();
  if (!svg.startsWith('<')) {
    svg = renderPosterSvg(input.draft.renderRequest).trim();
  }
  if (!svg.startsWith('<')) {
    throw new Error('Could not generate map output. Please try again.');
  }
  const exportSvg = injectFontCssIntoSvg(withEmbeddedMoonUrls(svg), getEmbeddedPosterFontsCss());
  const sourcePrintSize = mapDesignSizeToPrintSize(input.draft.mapData.size);
  const fileToken = buildOrderFileToken(input.orderCode, sourcePrintSize);
  return { exportSvg, fileToken, sourcePrintSize };
}

export async function buildOrderExportBundle(input: {
  draft: CheckoutDraft;
  orderCode: string;
}): Promise<OrderExportBundle> {
  const { exportSvg, fileToken, sourcePrintSize } = await prepareOrderSvg(input);
  const { width: exportSvgW, height: exportSvgH } = getSvgSize(exportSvg);
  const useFlyWorker = EXPORT_ENGINE === 'fly';

  let png: Buffer;
  let pdf: Buffer;
  if (useFlyWorker) {
    const remoteRender = await renderViaFlyWorker({
      svg: exportSvg,
      svgWidth: exportSvgW,
      svgHeight: exportSvgH,
      allowSharpFallback: false
    });
    if (remoteRender) {
      png = remoteRender.png;
      pdf = remoteRender.pdf;
      if (remoteRender.peakRssMb || remoteRender.renderTimeMs) {
        console.info(
          `[render-worker] order=${input.orderCode} rssMb=${remoteRender.peakRssMb ?? 'n/a'} timeMs=${remoteRender.renderTimeMs ?? 'n/a'} trace=${remoteRender.rssTrace ?? 'n/a'}`
        );
      }
    } else {
      console.warn(`[render-worker] order=${input.orderCode} fly worker unavailable, falling back to local`);
      png = await renderSvgToPng(exportSvg, {
        svgWidth: exportSvgW,
        svgHeight: exportSvgH,
        allowSharpFallback: false
      });
      pdf = await makePdfFromPng(png, exportSvgW, exportSvgH);
    }
  } else {
    png = await renderSvgToPng(exportSvg, {
      svgWidth: exportSvgW,
      svgHeight: exportSvgH,
      allowSharpFallback: false
    });
    pdf = await makePdfFromPng(png, exportSvgW, exportSvgH);
  }

  const zip = new JSZip();
  zip.file(`ourskymap-${fileToken}.svg`, exportSvg);
  zip.file(`ourskymap-${fileToken}.png`, png);
  zip.file(`ourskymap-${fileToken}.pdf`, pdf);
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });

  return {
    exportSvg,
    png,
    pdf,
    zipBuffer,
    fileToken,
    sourcePrintSize
  };
}
