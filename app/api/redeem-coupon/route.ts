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
const EXPORT_ENGINE = (process.env.EXPORT_ENGINE ?? 'local').trim().toLowerCase();
const RENDER_WORKER_URL = (process.env.FLY_RENDER_URL ?? '').trim().replace(/\/+$/, '');
const RENDER_WORKER_SHARED_SECRET = (process.env.RENDER_SHARED_SECRET ?? '').trim();
const RENDER_WORKER_TIMEOUT_MS = Number.parseInt(process.env.FLY_RENDER_TIMEOUT_MS ?? '30000', 10);

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isSimulationCoupon(orderCode: string): boolean {
  const simulationEnabled = (process.env.ETSY_SIMULATION_MODE ?? 'true').trim().toLowerCase() === 'true';
  if (!simulationEnabled) return false;
  const allowAny = (process.env.ETSY_SIMULATION_ALLOW_ANY ?? 'true').trim().toLowerCase() === 'true';
  if (allowAny) return true;
  const prefix = (process.env.ETSY_SIMULATION_PREFIX ?? 'SIM-').trim();
  return prefix.length > 0 && orderCode.toUpperCase().startsWith(prefix.toUpperCase());
}

function withAbsoluteMoonUrls(svg: string, req: Request): string {
  const configuredBase = (process.env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/+$/, '');
  const requestBase = new URL(req.url).origin;
  const base = configuredBase || requestBase;
  let result = svg;
  for (const name of ['moon_gold.png', 'moon_silver.png']) {
    const abs = `${base}/${name}`;
    result = result
      .replaceAll(`href="/${name}"`, `href="${abs}"`)
      .replaceAll(`href='/${name}'`, `href='${abs}'`)
      .replaceAll(`xlink:href="/${name}"`, `xlink:href="${abs}"`)
      .replaceAll(`xlink:href='/${name}'`, `xlink:href='${abs}'`);
  }
  return result;
}

const moonDataUriCache: Record<string, string | null> = {};

function getMoonImageDataUri(fileName: string): string | null {
  if (Object.prototype.hasOwnProperty.call(moonDataUriCache, fileName)) return moonDataUriCache[fileName];
  try {
    const moonPath = path.join(process.cwd(), 'public', fileName);
    const raw = readFileSync(moonPath);
    moonDataUriCache[fileName] = `data:image/png;base64,${raw.toString('base64')}`;
  } catch {
    moonDataUriCache[fileName] = null;
  }
  return moonDataUriCache[fileName];
}

function withEmbeddedMoonUrls(svg: string): string {
  let result = svg;
  for (const name of ['moon_gold.png', 'moon_silver.png']) {
    const dataUri = getMoonImageDataUri(name);
    if (!dataUri) continue;
    result = result
      .replaceAll(`href="/${name}"`, `href="${dataUri}"`)
      .replaceAll(`href='/${name}'`, `href='${dataUri}'`)
      .replaceAll(`xlink:href="/${name}"`, `xlink:href="${dataUri}"`)
      .replaceAll(`xlink:href='/${name}'`, `xlink:href='${dataUri}'`);
  }
  return result;
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
};

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
    return {
      png,
      pdf,
      peakRssMb: Number.isFinite(peakRssHeader) ? peakRssHeader : null,
      renderTimeMs: Number.isFinite(renderTimeHeader) ? renderTimeHeader : null,
      rssTrace: rssTrace || null
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
    let svg = '';
    try {
      if (isCityDraft) {
        svg = await renderCityMapSvg(draft.renderRequest as CityMapRequest);
      } else {
        svg = renderPosterSvg(draft.renderRequest as PosterRequest);
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
      const embeddedMoonSvg = withEmbeddedMoonUrls(svg);
      svg = embeddedMoonSvg !== svg ? embeddedMoonSvg : withAbsoluteMoonUrls(svg, req);
    }

    const embeddedFontsCss = getEmbeddedPosterFontsCss();
    if (embeddedFontsCss) {
      svg = injectFontCssIntoSvg(svg, embeddedFontsCss);
    }

    const safeCode = couponCode.replace(/[^a-zA-Z0-9_-]/g, '_');
    const ts = Date.now();
    const exportSvg = svg;
    const { width: exportSvgW, height: exportSvgH } = getSvgSize(exportSvg);
    const useFlyWorker = EXPORT_ENGINE === 'fly';

    let png: Buffer;
    let pdf: Buffer;
    if (useFlyWorker) {
      const remoteRender = await renderViaFlyWorker({
        svg: exportSvg,
        svgWidth: exportSvgW,
        svgHeight: exportSvgH,
        allowSharpFallback: isCityDraft
      });
      if (remoteRender) {
        png = remoteRender.png;
        pdf = remoteRender.pdf;
        if (remoteRender.peakRssMb || remoteRender.renderTimeMs) {
          console.info(
            `[render-worker] coupon=${couponCode} rssMb=${remoteRender.peakRssMb ?? 'n/a'} timeMs=${remoteRender.renderTimeMs ?? 'n/a'} trace=${remoteRender.rssTrace ?? 'n/a'}`
          );
        }
      } else {
        console.warn(`[render-worker] coupon=${couponCode} fly worker unavailable, falling back to local`);
        png = await renderSvgToPng(exportSvg, {
          svgWidth: exportSvgW,
          svgHeight: exportSvgH,
          allowSharpFallback: isCityDraft
        });
        pdf = await makePdfFromPng(png, exportSvgW, exportSvgH);
      }
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
