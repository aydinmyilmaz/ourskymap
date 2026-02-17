import { NextResponse } from 'next/server';
import { renderPosterSvg } from '../../../lib/poster';
import type { CheckoutDraft } from '../../../lib/checkout';
import { renderCityMapSvg, type CityMapRequest } from '../../../lib/citymap';
import type { PosterRequest } from '../../../lib/types';
import { getSupabaseAdminClient } from '../../../lib/supabaseAdmin';
import JSZip from 'jszip';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';

type OrderRow = {
  id: string;
  order_code: string;
  status: 'pending' | 'completed';
  used_at: string | null;
  pdf_url: string | null;
};

const TARGET_EXPORT_DPI = 300;
const BASE_SVG_DPI = 72;
const MAX_EXPORT_PIXELS = 40_000_000;
const RENDER_WORKER_URL = (process.env.FLY_RENDER_URL ?? '').trim().replace(/\/+$/, '');
const RENDER_WORKER_SHARED_SECRET = (process.env.RENDER_SHARED_SECRET ?? '').trim();
const RENDER_WORKER_TIMEOUT_MS = Number.parseInt(process.env.FLY_RENDER_TIMEOUT_MS ?? '30000', 10);
const RENDER_WORKER_TEXTURE_ATTEMPTS = Number.parseInt(process.env.FLY_RENDER_TEXTURE_ATTEMPTS ?? '2', 10);
const RENDER_WORKER_TEXTURE_RETRY_DELAY_MS = Number.parseInt(process.env.FLY_RENDER_TEXTURE_RETRY_DELAY_MS ?? '2500', 10);
const RENDER_WORKER_TEXTURE_ATTEMPT_TIMEOUT_MS = Number.parseInt(process.env.FLY_RENDER_TEXTURE_ATTEMPT_TIMEOUT_MS ?? '30000', 10);

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sleep(ms: number): Promise<void> {
  const waitMs = Number.isFinite(ms) ? Math.max(0, ms) : 0;
  return new Promise((resolve) => setTimeout(resolve, waitMs));
}

function isSimulationCoupon(orderCode: string): boolean {
  const simulationEnabled = (process.env.ETSY_SIMULATION_MODE ?? 'true').trim().toLowerCase() === 'true';
  if (!simulationEnabled) return false;
  const allowAny = (process.env.ETSY_SIMULATION_ALLOW_ANY ?? 'true').trim().toLowerCase() === 'true';
  if (allowAny) return true;
  const prefix = (process.env.ETSY_SIMULATION_PREFIX ?? 'SIM-').trim();
  return prefix.length > 0 && orderCode.toUpperCase().startsWith(prefix.toUpperCase());
}

function withAbsoluteMoonUrl(svg: string, req: Request): string {
  const configuredBase = (process.env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/+$/, '');
  const requestBase = new URL(req.url).origin;
  const base = configuredBase || requestBase;
  const absoluteMoon = `${base}/moon.png`;
  return svg
    .replaceAll('href="/moon.png"', `href="${absoluteMoon}"`)
    .replaceAll("href='/moon.png'", `href='${absoluteMoon}'`)
    .replaceAll('xlink:href="/moon.png"', `xlink:href="${absoluteMoon}"`)
    .replaceAll("xlink:href='/moon.png'", `xlink:href='${absoluteMoon}'`);
}

let moonImageDataUriCache: string | null | undefined;

function getMoonImageDataUri(): string | null {
  if (moonImageDataUriCache !== undefined) return moonImageDataUriCache;
  try {
    const moonPath = path.join(process.cwd(), 'public', 'moon.png');
    const raw = readFileSync(moonPath);
    moonImageDataUriCache = `data:image/png;base64,${raw.toString('base64')}`;
  } catch {
    moonImageDataUriCache = null;
  }
  return moonImageDataUriCache;
}

function withEmbeddedMoonUrl(svg: string): string {
  const moonDataUri = getMoonImageDataUri();
  if (!moonDataUri) return svg;
  return svg
    .replaceAll('href="/moon.png"', `href="${moonDataUri}"`)
    .replaceAll("href='/moon.png'", `href='${moonDataUri}'`)
    .replaceAll('xlink:href="/moon.png"', `xlink:href="${moonDataUri}"`)
    .replaceAll("xlink:href='/moon.png'", `xlink:href='${moonDataUri}'`);
}

type InkTextureKey = 'gold' | 'silver';

const INK_TEXTURE_PATHS: Record<InkTextureKey, string[]> = {
  gold: ['/textures/gold_texture_hd_3500.jpg', '/textures/gold_texture_2500.jpg'],
  silver: ['/textures/silver_texture_hd_3500.jpg', '/textures/silver_texture_2500.jpg']
};

const INK_TEXTURE_REMOTE_URLS: Partial<Record<InkTextureKey, string>> = {
  gold: (process.env.BUNNY_TEXTURE_GOLD_URL ?? '').trim(),
  silver: (process.env.BUNNY_TEXTURE_SILVER_URL ?? '').trim()
};

const BUNNY_TEXTURE_BASE_URL = (process.env.BUNNY_TEXTURE_BASE_URL ?? '').trim().replace(/\/+$/, '');
const BUNNY_TEXTURE_QUERY = (process.env.BUNNY_TEXTURE_QUERY ?? '').trim();
const TEXTURE_FETCH_TIMEOUT_MS = Number.parseInt(process.env.EXPORT_TEXTURE_FETCH_TIMEOUT_MS ?? '6000', 10);
const MAX_TEXTURE_BYTES = Number.parseInt(process.env.EXPORT_TEXTURE_MAX_BYTES ?? '25000000', 10);
const TEXTURE_MAX_DIM = Number.parseInt(process.env.EXPORT_TEXTURE_MAX_DIM ?? '1000', 10);
const TEXTURE_JPEG_QUALITY = Number.parseInt(process.env.EXPORT_TEXTURE_JPEG_QUALITY ?? '76', 10);
const EXPECTED_TEXTURE_PIPELINE_VERSION = '2';

function getTextureMimeByPath(texturePathRel: string): string {
  if (texturePathRel.toLowerCase().endsWith('.jpg') || texturePathRel.toLowerCase().endsWith('.jpeg')) return 'image/jpeg';
  if (texturePathRel.toLowerCase().endsWith('.png')) return 'image/png';
  return 'image/webp';
}

function getBunnyTextureUrl(key: InkTextureKey): string | null {
  const explicit = INK_TEXTURE_REMOTE_URLS[key];
  if (explicit) return explicit;
  if (!BUNNY_TEXTURE_BASE_URL) return null;
  const texturePathRel = INK_TEXTURE_PATHS[key][0];
  const baseUrl = `${BUNNY_TEXTURE_BASE_URL}${texturePathRel}`;
  if (!BUNNY_TEXTURE_QUERY) return baseUrl;
  return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${BUNNY_TEXTURE_QUERY}`;
}

function isInkTextureSvg(svg: string): boolean {
  return svg.includes('id="inkTexturePattern"') || svg.includes("id='inkTexturePattern'");
}

async function normalizeInkTextureRaw(raw: Buffer, fallbackMime: string, key: InkTextureKey): Promise<{ raw: Buffer; mime: string }> {
  const baseMaxDim = Number.isFinite(TEXTURE_MAX_DIM) && TEXTURE_MAX_DIM >= 512 ? Math.min(4096, TEXTURE_MAX_DIM) : 1000;
  const maxDim = key === 'gold' ? Math.max(baseMaxDim, 3000) : Math.max(baseMaxDim, 1800);
  const quality = Number.isFinite(TEXTURE_JPEG_QUALITY) && TEXTURE_JPEG_QUALITY >= 50
    ? Math.min(95, TEXTURE_JPEG_QUALITY)
    : 76;
  const targetQuality = key === 'gold' ? Math.max(quality, 93) : Math.max(quality, 88);
  try {
    const image = sharp(raw, { limitInputPixels: 100_000_000 }).rotate();
    const metadata = await image.metadata();
    const width = metadata.width ?? maxDim;
    const height = metadata.height ?? maxDim;
    const shouldResize = width > maxDim || height > maxDim;
    const pipeline = shouldResize
      ? image.resize({ width: maxDim, height: maxDim, fit: 'inside', withoutEnlargement: true })
      : image;
    const normalized = await pipeline
      .jpeg({
        quality: targetQuality,
        mozjpeg: true,
        chromaSubsampling: '4:4:4'
      })
      .toBuffer();
    return { raw: normalized, mime: 'image/jpeg' };
  } catch {
    return { raw, mime: fallbackMime };
  }
}

async function fetchTextureFromRemote(url: string): Promise<{ raw: Buffer; mime: string | null } | null> {
  const timeoutMs = Number.isFinite(TEXTURE_FETCH_TIMEOUT_MS) && TEXTURE_FETCH_TIMEOUT_MS > 0
    ? TEXTURE_FETCH_TIMEOUT_MS
    : 6000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const arr = await res.arrayBuffer();
    const raw = Buffer.from(arr);
    if (!raw.length) return null;
    const maxBytes = Number.isFinite(MAX_TEXTURE_BYTES) && MAX_TEXTURE_BYTES > 0 ? MAX_TEXTURE_BYTES : 5_000_000;
    if (raw.length > maxBytes) return null;
    const mime = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase() || null;
    return { raw, mime };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function loadInkTextureRaw(key: InkTextureKey): Promise<{ raw: Buffer; mime: string } | null> {
  const remoteUrl = getBunnyTextureUrl(key);
  const fallbackMime = getTextureMimeByPath(INK_TEXTURE_PATHS[key][0]);
  const maxBytes = Number.isFinite(MAX_TEXTURE_BYTES) && MAX_TEXTURE_BYTES > 0 ? MAX_TEXTURE_BYTES : 15_000_000;
  const effectiveMaxBytes = key === 'gold' ? Math.max(maxBytes, 15_000_000) : maxBytes;
  if (remoteUrl) {
    const remote = await fetchTextureFromRemote(remoteUrl);
    if (remote) {
      const normalized = await normalizeInkTextureRaw(remote.raw, remote.mime || fallbackMime, key);
      return normalized;
    }
  }

  for (const texturePathRel of INK_TEXTURE_PATHS[key]) {
    try {
      const texturePath = path.join(process.cwd(), 'public', texturePathRel.replace(/^\/+/, ''));
      const raw = readFileSync(texturePath);
      if (raw.length > effectiveMaxBytes) continue;
      return await normalizeInkTextureRaw(raw, getTextureMimeByPath(texturePathRel), key);
    } catch {
      continue;
    }
  }
  return null;
}

const inkTextureDataUriCache: Partial<Record<InkTextureKey, string | null>> = {};
const inkTextureDataUriPromiseCache: Partial<Record<InkTextureKey, Promise<string | null>>> = {};

async function getInkTextureDataUri(key: InkTextureKey): Promise<string | null> {
  if (Object.prototype.hasOwnProperty.call(inkTextureDataUriCache, key)) {
    return inkTextureDataUriCache[key] ?? null;
  }
  const inflight = inkTextureDataUriPromiseCache[key];
  if (inflight) return inflight;

  const task = (async () => {
    const loaded = await loadInkTextureRaw(key);
    if (!loaded) {
      inkTextureDataUriCache[key] = null;
      return null;
    }
    const dataUri = `data:${loaded.mime};base64,${loaded.raw.toString('base64')}`;
    inkTextureDataUriCache[key] = dataUri;
    return dataUri;
  })();

  inkTextureDataUriPromiseCache[key] = task;
  try {
    return await task;
  } finally {
    delete inkTextureDataUriPromiseCache[key];
  }
}

async function withEmbeddedInkTextureUrls(svg: string): Promise<string> {
  let out = svg;
  for (const key of Object.keys(INK_TEXTURE_PATHS) as InkTextureKey[]) {
    const variants = INK_TEXTURE_PATHS[key];
    const needsReplace = variants.some((src) =>
      out.includes(`href="${src}"`) ||
      out.includes(`href='${src}'`) ||
      out.includes(`xlink:href="${src}"`) ||
      out.includes(`xlink:href='${src}'`)
    );
    if (!needsReplace) continue;
    const dataUri = await getInkTextureDataUri(key);
    if (!dataUri) continue;
    for (const src of variants) {
      out = out
        .replaceAll(`href="${src}"`, `href="${dataUri}"`)
        .replaceAll(`href='${src}'`, `href='${dataUri}'`)
        .replaceAll(`xlink:href="${src}"`, `xlink:href="${dataUri}"`)
        .replaceAll(`xlink:href='${src}'`, `xlink:href='${dataUri}'`);
    }
  }
  return out;
}

function hasUnresolvedInkTextureRefs(svg: string): boolean {
  return Object.values(INK_TEXTURE_PATHS).flat().some((src) =>
    svg.includes(`href="${src}"`) ||
    svg.includes(`href='${src}'`) ||
    svg.includes(`xlink:href="${src}"`) ||
    svg.includes(`xlink:href='${src}'`)
  );
}

type LocalFontAsset = {
  family: string;
  weight: number;
  style: 'normal' | 'italic';
  fileName: string;
};

const POSTER_FONT_ASSETS: LocalFontAsset[] = [
  { family: 'Allura', weight: 400, style: 'normal', fileName: 'Allura-Regular.ttf' },
  { family: 'Great Vibes', weight: 400, style: 'normal', fileName: 'GreatVibes-Regular.ttf' },
  { family: 'Prata', weight: 400, style: 'normal', fileName: 'Prata-Regular.ttf' },
  { family: 'Signika', weight: 400, style: 'normal', fileName: 'Signika-Regular.ttf' },
  { family: 'Signika', weight: 500, style: 'normal', fileName: 'Signika-Medium.ttf' },
  { family: 'Signika', weight: 700, style: 'normal', fileName: 'Signika-Bold.ttf' }
];

function getPosterFontAbsolutePath(fileName: string): string {
  return path.join(process.cwd(), 'public', 'fonts', fileName);
}

function getPosterFontFilePaths(): string[] {
  return POSTER_FONT_ASSETS
    .map((asset) => getPosterFontAbsolutePath(asset.fileName))
    .filter((absPath) => existsSync(absPath));
}

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

let cachedResvgCtor: ResvgCtor | null | undefined;

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
      // Fallback to sharp if resvg fails at runtime.
    }
  }
  if (!opts?.allowSharpFallback) {
    throw new Error(
      'High-fidelity SVG renderer is unavailable. Install the matching @resvg binary package for this server and restart.'
    );
  }
  return sharp(svgBuffer, { density: Math.max(BASE_SVG_DPI, Math.round(BASE_SVG_DPI * scale)) })
    .resize(targetWidth, targetHeight, { fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

let embeddedPosterFontsCssCache: string | null | undefined;

function getEmbeddedPosterFontsCss(): string {
  if (embeddedPosterFontsCssCache !== undefined) return embeddedPosterFontsCssCache || '';
  try {
    const blocks: string[] = [];
    for (const asset of POSTER_FONT_ASSETS) {
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

type RemoteRenderResult = {
  png: Buffer;
  pdf: Buffer;
  peakRssMb: number | null;
  renderTimeMs: number | null;
  rssTrace: string | null;
  texturePipelineVersion: string | null;
};

async function renderViaFlyWorker(opts: {
  svgWidth: number;
  svgHeight: number;
  allowSharpFallback: boolean;
  timeoutMs?: number;
  svg?: string;
  baseSvg?: string;
  maskSvg?: string;
  textureBase64?: string;
  textureKind?: InkTextureKey;
}): Promise<RemoteRenderResult | null> {
  if (!RENDER_WORKER_URL || !RENDER_WORKER_SHARED_SECRET) return null;
  const timeoutMs = Number.isFinite(opts.timeoutMs) && (opts.timeoutMs as number) > 0
    ? Math.trunc(opts.timeoutMs as number)
    : (Number.isFinite(RENDER_WORKER_TIMEOUT_MS) && RENDER_WORKER_TIMEOUT_MS > 0
        ? RENDER_WORKER_TIMEOUT_MS
        : 30000);
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
        allowSharpFallback: opts.allowSharpFallback,
        baseSvg: opts.baseSvg,
        maskSvg: opts.maskSvg,
        textureBase64: opts.textureBase64,
        textureKind: opts.textureKind
      }),
      signal: controller.signal,
      cache: 'no-store'
    });
    if (!res.ok) {
      const elapsedMs = Date.now() - startedAt;
      let detail = '';
      try {
        const txt = await res.text();
        detail = txt ? txt.slice(0, 600) : '';
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
    const [png, pdf] = await Promise.all([
      pngEntry.async('nodebuffer'),
      pdfEntry.async('nodebuffer')
    ]);
    if (!png.length || !pdf.length) return null;
    const peakRssHeader = Number.parseInt(res.headers.get('x-render-peak-rss-mb') || '', 10);
    const renderTimeHeader = Number.parseInt(res.headers.get('x-render-time-ms') || '', 10);
    const rssTrace = res.headers.get('x-render-rss-trace');
    const texturePipelineVersion = (res.headers.get('x-texture-pipeline-version') || '').trim() || null;
    return {
      png,
      pdf,
      peakRssMb: Number.isFinite(peakRssHeader) ? peakRssHeader : null,
      renderTimeMs: Number.isFinite(renderTimeHeader) ? renderTimeHeader : null,
      rssTrace: rssTrace || null,
      texturePipelineVersion
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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      couponCode?: string;
      email?: string;
      draft?: CheckoutDraft;
    };

    const couponCode = (body.couponCode || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const draft = body.draft;
    const ordersTable = (process.env.SUPABASE_ORDERS_TABLE ?? 'orders').trim();
    const storageBucket = (process.env.SUPABASE_STORAGE_BUCKET ?? 'generated-maps').trim();

    if (!couponCode) {
      return NextResponse.json({ success: false, message: 'Coupon code is required.' }, { status: 400 });
    }
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ success: false, message: 'Please enter a valid email address.' }, { status: 400 });
    }
    if (!draft?.renderRequest || !draft?.previewSvg || !draft?.mapData) {
      return NextResponse.json({ success: false, message: 'Missing map data. Please return to designer.' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();

    let order: OrderRow | null = null;
    const lookup = await supabase
      .from(ordersTable)
      .select('id,order_code,status,used_at,pdf_url')
      .eq('order_code', couponCode)
      .maybeSingle();

    if (lookup.error) {
      throw new Error(`Failed to validate coupon: ${lookup.error.message}`);
    }
    order = lookup.data as OrderRow | null;

    // Etsy inactive for now: allow simulation codes and seed pending order row on first use.
    if (!order && isSimulationCoupon(couponCode)) {
      const seeded = await supabase
        .from(ordersTable)
        .insert({
          order_code: couponCode,
          status: 'pending'
        })
        .select('id,order_code,status,used_at,pdf_url')
        .single();

      if (seeded.error) {
        throw new Error(`Failed to create simulated order: ${seeded.error.message}`);
      }
      order = seeded.data as OrderRow;
    }

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Invalid coupon code. Please check your Etsy order confirmation.' },
        { status: 400 }
      );
    }

    const allowSimulationRerender = order.status === 'completed' && isSimulationCoupon(couponCode);

    if (order.status === 'completed' && !allowSimulationRerender) {
      const usedOn = order.used_at ? new Date(order.used_at).toLocaleString('en-US') : 'a previous date';
      return NextResponse.json(
        {
          success: false,
          message: `This coupon was already used on ${usedOn}.`,
          orderCode: order.order_code,
          downloadUrl: order.pdf_url
        },
        { status: 400 }
      );
    }

    if (allowSimulationRerender) {
      console.info(`[coupon] simulation rerender enabled for completed order ${couponCode}`);
    }

    const isCityDraft = draft.productType === 'city';
    const skyRenderRequest = isCityDraft ? null : (draft.renderRequest as PosterRequest);
    const textureRequested = !isCityDraft && (skyRenderRequest?.poster?.inkFinish ?? 'flat') === 'texture';
    let svg = '';
    let textureCompositePayload: { baseSvg: string; maskSvg: string; textureBase64: string; textureKind: InkTextureKey } | null = null;
    try {
      if (isCityDraft) {
        svg = await renderCityMapSvg(draft.renderRequest as CityMapRequest);
      } else {
        const baseSkyRequest: PosterRequest = textureRequested
          ? {
              ...skyRenderRequest!,
              poster: {
                ...skyRenderRequest!.poster,
                inkFinish: 'flat'
              }
            }
          : (skyRenderRequest as PosterRequest);
        svg = renderPosterSvg(baseSkyRequest);
      }
    } catch {
      if (isCityDraft) {
        svg = draft.previewSvg;
      } else {
        throw new Error('Could not regenerate sky map for export. Please return to designer and try again.');
      }
    }

    if (!svg.trim().startsWith('<')) {
      return NextResponse.json(
        { success: false, message: 'Could not generate map output. Please try again.' },
        { status: 500 }
      );
    }
    if (!isCityDraft) {
      const embeddedMoonSvg = withEmbeddedMoonUrl(svg);
      svg = embeddedMoonSvg !== svg ? embeddedMoonSvg : withAbsoluteMoonUrl(svg, req);
    }

    const embeddedFontsCss = getEmbeddedPosterFontsCss();
    if (embeddedFontsCss) {
      svg = injectFontCssIntoSvg(svg, embeddedFontsCss);
    }

    if (textureRequested && skyRenderRequest) {
      const maskRequest: PosterRequest = {
        ...skyRenderRequest,
        poster: {
          ...skyRenderRequest.poster,
          inkFinish: 'flat',
          renderVariant: 'ink-mask'
        }
      };
      let maskSvg = renderPosterSvg(maskRequest);
      if (embeddedFontsCss) {
        maskSvg = injectFontCssIntoSvg(maskSvg, embeddedFontsCss);
      }
      const textureKey: InkTextureKey = skyRenderRequest.poster.inkTexture === 'silver' ? 'silver' : 'gold';
      const textureRaw = await loadInkTextureRaw(textureKey);
      if (textureRaw && textureRaw.raw.length) {
        textureCompositePayload = {
          baseSvg: svg,
          maskSvg,
          textureBase64: textureRaw.raw.toString('base64'),
          textureKind: textureKey
        };
      }
    }

    const safeCode = couponCode.replace(/[^a-zA-Z0-9_-]/g, '_');
    const ts = Date.now();
    let exportSvg = svg;
    let { width: exportSvgW, height: exportSvgH } = getSvgSize(exportSvg);
    const textureCompositeRequested = !!textureCompositePayload;

    const textureAttemptCount = textureCompositeRequested
      ? Math.max(1, Math.min(4, Number.isFinite(RENDER_WORKER_TEXTURE_ATTEMPTS) ? RENDER_WORKER_TEXTURE_ATTEMPTS : 3))
      : 1;
    const retryDelayMs = Math.max(
      0,
      Number.isFinite(RENDER_WORKER_TEXTURE_RETRY_DELAY_MS) ? RENDER_WORKER_TEXTURE_RETRY_DELAY_MS : 2500
    );
    const shortAttemptTimeoutMs = Math.max(
      3000,
      Number.isFinite(RENDER_WORKER_TEXTURE_ATTEMPT_TIMEOUT_MS) ? RENDER_WORKER_TEXTURE_ATTEMPT_TIMEOUT_MS : 30000
    );
    const fullTimeoutMs = Math.max(3000, RENDER_WORKER_TIMEOUT_MS);
    const approxTextureBytes = textureCompositePayload ? Math.round(textureCompositePayload.textureBase64.length * 0.75) : 0;
    // Large base64 payloads can exceed short attempt windows during upload.
    const useShortAttempts = textureCompositeRequested && approxTextureBytes > 0 && approxTextureBytes < 6_000_000;

    let remoteRender: RemoteRenderResult | null = null;
    let staleTextureWorker = false;
    let staleWorkerVersion: string | null = null;
    for (let attempt = 1; attempt <= textureAttemptCount; attempt++) {
      const isFinalAttempt = attempt === textureAttemptCount;
      const timeoutMs = textureCompositeRequested && useShortAttempts && !isFinalAttempt
        ? Math.min(shortAttemptTimeoutMs, fullTimeoutMs)
        : fullTimeoutMs;

      const candidate = await renderViaFlyWorker({
        svgWidth: exportSvgW,
        svgHeight: exportSvgH,
        allowSharpFallback: isCityDraft,
        timeoutMs,
        ...(textureCompositePayload
          ? {
              baseSvg: textureCompositePayload.baseSvg,
              maskSvg: textureCompositePayload.maskSvg,
              textureBase64: textureCompositePayload.textureBase64,
              textureKind: textureCompositePayload.textureKind
            }
          : { svg: exportSvg })
      });

      const candidateStale =
        !!candidate &&
        textureCompositeRequested &&
        !!candidate.texturePipelineVersion &&
        candidate.texturePipelineVersion !== EXPECTED_TEXTURE_PIPELINE_VERSION;
      if (candidate && textureCompositeRequested && !candidate.texturePipelineVersion) {
        console.warn(
          `[render-worker] coupon=${couponCode} worker did not return texture pipeline version header; accepting for compatibility`
        );
      }
      if (candidate && !candidateStale) {
        remoteRender = candidate;
        staleTextureWorker = false;
        break;
      }

      staleTextureWorker = staleTextureWorker || candidateStale;
      if (candidateStale) {
        staleWorkerVersion = candidate.texturePipelineVersion;
      }
      if (textureCompositeRequested && !isFinalAttempt) {
        await sleep(retryDelayMs);
      }
    }

    let png: Buffer;
    let pdf: Buffer;
    if (remoteRender && !staleTextureWorker) {
      png = remoteRender.png;
      pdf = remoteRender.pdf;
      if (remoteRender.peakRssMb || remoteRender.renderTimeMs) {
        console.info(
          `[render-worker] coupon=${couponCode} rssMb=${remoteRender.peakRssMb ?? 'n/a'} timeMs=${remoteRender.renderTimeMs ?? 'n/a'} trace=${remoteRender.rssTrace ?? 'n/a'}`
        );
      }
    } else if (!isCityDraft && textureCompositeRequested) {
      const reason = staleTextureWorker
        ? `stale worker version ${staleWorkerVersion ?? 'unknown'} (expected ${EXPECTED_TEXTURE_PIPELINE_VERSION})`
        : 'worker unavailable';
      console.warn(`[render-worker] coupon=${couponCode} texture export blocked: ${reason}`);
      return NextResponse.json(
        {
          success: false,
          message: 'Texture export worker is unavailable. Please retry in a moment.'
        },
        { status: 503 }
      );
    } else {
      png = await renderSvgToPng(exportSvg, {
        svgWidth: exportSvgW,
        svgHeight: exportSvgH,
        allowSharpFallback: isCityDraft
      });
      pdf = await makePdfFromPng(png, exportSvgW, exportSvgH);
    }

    const zip = new JSZip();
    const filePrefix = isCityDraft ? 'citymap' : 'ourskymap';
    zip.file(`${filePrefix}-${safeCode}.svg`, exportSvg);
    zip.file(`${filePrefix}-${safeCode}.png`, png);
    zip.file(`${filePrefix}-${safeCode}.pdf`, pdf);
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });

    const fileName = `star-maps/${safeCode}-${ts}.zip`;
    const upload = await supabase.storage.from(storageBucket).upload(fileName, zipBuffer, {
      contentType: 'application/zip',
      upsert: true
    });
    if (upload.error) {
      throw new Error(`Storage upload failed: ${upload.error.message}`);
    }

    const { data: publicFile } = supabase.storage.from(storageBucket).getPublicUrl(fileName);
    const fileUrl = publicFile.publicUrl;

    const update = await supabase
      .from(ordersTable)
      .update({
        status: 'completed',
        used_at: new Date().toISOString(),
        customer_email: email,
        location: draft.mapData.city,
        date: draft.mapData.date ?? '',
        time: draft.mapData.time ?? '',
        title: draft.mapData.title,
        names: draft.mapData.names ?? '',
        font: draft.mapData.font,
        pdf_url: fileUrl
      })
      .eq('order_code', couponCode);

    if (update.error) {
      throw new Error(`Failed to update order: ${update.error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Your map is ready.',
      orderCode: couponCode,
      downloadUrl: fileUrl
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        success: false,
        message: e?.message ?? 'Failed to process coupon.'
      },
      { status: 500 }
    );
  }
}
