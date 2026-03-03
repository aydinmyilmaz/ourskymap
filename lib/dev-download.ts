import JSZip from 'jszip';
import { LOCAL_FONT_ASSETS } from './local-font-assets';
import type { PrintSizeKey } from './print-types';
import { buildOrderFileToken } from './print-size-utils';

export const DEV_DOWNLOAD_DRAFT_KEY = 'ourskymap_dev_download_v1';

export type DevDownloadDraft = {
  orderCode: string;
  email: string;
  previewSvg: string;
  sourceDesignSize?: string;
  sourcePrintSize?: PrintSizeKey | null;
  createdAtIso: string;
};

export function makeDevOrderCode(): string {
  return `DEV-${Date.now()}`;
}

export function buildSvgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const MOON_ASSET_PATH_REGEX = /\/(?:moon_(?:gold|silver)\.png|moon-phases\/(?:gold|silver)\/(?:[1-9]|[12]\d|30)\.png)/g;

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

function resolveAssetBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin.replace(/\/+$/, '');
}

function withAbsoluteMoonUrls(svg: string): string {
  const base = resolveAssetBaseUrl();
  if (!base) return svg;
  let result = svg;
  for (const assetPath of listMoonAssetPaths(svg)) {
    result = replaceAssetUrlRefs(result, assetPath, `${base}${assetPath}`);
  }
  return result;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

const publicDataUriCache = new Map<string, string | null>();

async function loadPublicAssetDataUri(path: string, mimeType: string): Promise<string | null> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const cacheKey = `${normalizedPath}|${mimeType}`;
  if (publicDataUriCache.has(cacheKey)) {
    return publicDataUriCache.get(cacheKey) ?? null;
  }
  const base = resolveAssetBaseUrl();
  if (!base) {
    publicDataUriCache.set(cacheKey, null);
    return null;
  }
  try {
    const res = await fetch(`${base}${normalizedPath}`, { cache: 'force-cache' });
    if (!res.ok) {
      publicDataUriCache.set(cacheKey, null);
      return null;
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    const dataUri = `data:${mimeType};base64,${bytesToBase64(bytes)}`;
    publicDataUriCache.set(cacheKey, dataUri);
    return dataUri;
  } catch {
    publicDataUriCache.set(cacheKey, null);
    return null;
  }
}

async function withEmbeddedMoonUrls(svg: string): Promise<string> {
  let result = svg;
  for (const assetPath of listMoonAssetPaths(svg)) {
    const dataUri = await loadPublicAssetDataUri(assetPath, 'image/png');
    if (!dataUri) continue;
    result = replaceAssetUrlRefs(result, assetPath, dataUri);
  }
  return result;
}

const embeddedFontCssCache: { value: string | null } = { value: null };

async function getEmbeddedPosterFontsCss(): Promise<string> {
  if (embeddedFontCssCache.value !== null) return embeddedFontCssCache.value;
  const uniqueFileNames = [...new Set(LOCAL_FONT_ASSETS.map((item) => item.fileName))];
  const fileDataUris = new Map<string, string>();

  for (const fileName of uniqueFileNames) {
    const dataUri = await loadPublicAssetDataUri(`/fonts/${fileName}`, 'font/ttf');
    if (dataUri) {
      fileDataUris.set(fileName, dataUri);
    }
  }

  const rules: string[] = [];
  for (const asset of LOCAL_FONT_ASSETS) {
    const dataUri = fileDataUris.get(asset.fileName);
    if (!dataUri) continue;
    rules.push(
      `@font-face{font-family:'${asset.family}';font-style:${asset.style};font-weight:${asset.weight};font-display:swap;src:url(${dataUri}) format('truetype');}`
    );
  }

  embeddedFontCssCache.value = rules.join('\n');
  return embeddedFontCssCache.value;
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

async function prepareSvgForBrowserExport(svg: string): Promise<string> {
  const withMoonDataUris = await withEmbeddedMoonUrls(svg);
  let prepared = withMoonDataUris !== svg ? withMoonDataUris : withAbsoluteMoonUrls(svg);
  const embeddedFontsCss = await getEmbeddedPosterFontsCss();
  if (embeddedFontsCss) {
    prepared = injectFontCssIntoSvg(prepared, embeddedFontsCss);
  }
  return prepared;
}

export function loadDevDownloadDraft(): DevDownloadDraft | null {
  try {
    const raw = window.sessionStorage.getItem(DEV_DOWNLOAD_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DevDownloadDraft;
    if (!parsed?.orderCode || !parsed?.previewSvg) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDevDownloadDraft(input: DevDownloadDraft): void {
  window.sessionStorage.setItem(DEV_DOWNLOAD_DRAFT_KEY, JSON.stringify(input));
}

function parseSvgSize(svg: string): { width: number; height: number } {
  const viewBoxMatch = svg.match(/viewBox=["']\s*[-\d.]+\s+[-\d.]+\s+([-\d.]+)\s+([-\d.]+)\s*["']/i);
  if (viewBoxMatch) {
    const width = Number.parseFloat(viewBoxMatch[1] || '');
    const height = Number.parseFloat(viewBoxMatch[2] || '');
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return { width, height };
    }
  }
  const widthMatch = svg.match(/\bwidth=["']\s*([-\d.]+)(?:px)?\s*["']/i);
  const heightMatch = svg.match(/\bheight=["']\s*([-\d.]+)(?:px)?\s*["']/i);
  const width = Number.parseFloat(widthMatch?.[1] || '');
  const height = Number.parseFloat(heightMatch?.[1] || '');
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return { width, height };
  }
  return { width: 1200, height: 1800 };
}

async function svgToPngBytes(svg: string, width: number, height: number): Promise<Uint8Array> {
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const next = new Image();
      next.decoding = 'async';
      next.onload = () => resolve(next);
      next.onerror = () => reject(new Error('Could not rasterize SVG in browser mode.'));
      next.src = svgUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('Canvas context is unavailable in browser mode.');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('PNG encode failed in browser mode.'));
          return;
        }
        resolve(blob);
      }, 'image/png');
    });
    return new Uint8Array(await pngBlob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export async function buildDevZipBlob(previewSvg: string, orderCode: string, sourcePrintSize: PrintSizeKey | null = null): Promise<Blob> {
  const preparedSvg = await prepareSvgForBrowserExport(previewSvg);
  const [{ PDFDocument }, { width, height }] = await Promise.all([import('pdf-lib'), Promise.resolve(parseSvgSize(preparedSvg))]);
  const pngBytes = await svgToPngBytes(preparedSvg, width, height);
  const pdfDoc = await PDFDocument.create();
  const pngImage = await pdfDoc.embedPng(pngBytes);
  const page = pdfDoc.addPage([width, height]);
  page.drawImage(pngImage, { x: 0, y: 0, width, height });
  const pdfBytes = await pdfDoc.save();

  const zip = new JSZip();
  const token = buildOrderFileToken(orderCode, sourcePrintSize);
  zip.file(`ourskymap-${token}.svg`, preparedSvg);
  zip.file(`ourskymap-${token}.png`, pngBytes);
  zip.file(`ourskymap-${token}.pdf`, pdfBytes);
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
}

export function triggerBlobDownload(blob: Blob, fileName: string): void {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
