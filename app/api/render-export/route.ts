import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { existsSync } from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';

const TARGET_EXPORT_DPI = 300;
const BASE_SVG_DPI = 72;
const DEFAULT_MAX_EXPORT_PIXELS = Number.parseInt(process.env.EXPORT_MAX_PIXELS ?? '40000000', 10);
const MAX_SVG_CHARS = 12_000_000;
const RENDER_SHARED_SECRET = (process.env.RENDER_SHARED_SECRET ?? '').trim();

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

function getRasterScale(svgWidth: number, svgHeight: number, maxExportPixels: number): number {
  const targetScale = TARGET_EXPORT_DPI / BASE_SVG_DPI;
  const basePixels = Math.max(1, svgWidth * svgHeight);
  const safeMaxPixels = Number.isFinite(maxExportPixels) && maxExportPixels > 1_000_000
    ? maxExportPixels
    : 40_000_000;
  const capByPixels = Math.sqrt(safeMaxPixels / basePixels);
  const scale = Math.max(1, Math.min(targetScale, capByPixels));
  return Number(scale.toFixed(3));
}

async function renderSvgToPng(
  svg: string,
  opts: {
    svgWidth: number;
    svgHeight: number;
    allowSharpFallback?: boolean;
    maxExportPixels?: number;
  }
): Promise<Buffer> {
  const svgBuffer = Buffer.from(svg, 'utf-8');
  const scale = getRasterScale(opts.svgWidth, opts.svgHeight, opts.maxExportPixels ?? DEFAULT_MAX_EXPORT_PIXELS);
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

async function makePdfFromPng(pngBuffer: Buffer, svgWidthPx: number, svgHeightPx: number): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const pageWidth = Math.max(72, svgWidthPx);
  const pageHeight = Math.max(72, svgHeightPx);
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

export async function POST(req: Request) {
  try {
    const startedAt = Date.now();
    const rssTrace: string[] = [];
    const markRss = (label: string) => {
      const rssMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
      rssTrace.push(`${label}:${rssMb}`);
    };
    markRss('start');

    if (!RENDER_SHARED_SECRET) {
      return NextResponse.json({ success: false, message: 'Render secret is not configured.' }, { status: 503 });
    }
    const headerSecret = (req.headers.get('x-render-secret') || '').trim();
    if (!headerSecret || headerSecret !== RENDER_SHARED_SECRET) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const body = (await req.json()) as {
      svg?: string;
      svgWidth?: number;
      svgHeight?: number;
      allowSharpFallback?: boolean;
    };
    const svg = String(body?.svg || '');
    const width = Number.isFinite(body?.svgWidth) && Number(body.svgWidth) > 0 ? Number(body.svgWidth) : 1200;
    const height = Number.isFinite(body?.svgHeight) && Number(body.svgHeight) > 0 ? Number(body.svgHeight) : 1800;
    const allowSharpFallback = !!body?.allowSharpFallback;

    if (!svg.trim().startsWith('<svg') && !svg.trim().startsWith('<?xml')) {
      throw new Error('Invalid SVG payload.');
    }
    if (svg.length > MAX_SVG_CHARS) {
      throw new Error('SVG payload is too large.');
    }

    const png = await renderSvgToPng(svg, {
      svgWidth: width,
      svgHeight: height,
      allowSharpFallback,
      maxExportPixels: DEFAULT_MAX_EXPORT_PIXELS
    });
    markRss('png_ready');

    const pngWithDpi = await sharp(png)
      .withMetadata({ density: TARGET_EXPORT_DPI })
      .png({ compressionLevel: 9 })
      .toBuffer();
    markRss('png_with_dpi');

    const pdf = await makePdfFromPng(pngWithDpi, width, height);
    markRss('pdf_ready');

    const zip = new JSZip();
    zip.file('render.png', pngWithDpi);
    zip.file('render.pdf', pdf);
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });
    markRss('zip_ready');
    const peakRssMb = rssTrace
      .map((entry) => Number(entry.split(':')[1] || 0))
      .reduce((max, value) => (value > max ? value : max), 0);
    const elapsedMs = Date.now() - startedAt;

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Cache-Control': 'no-store',
        'X-Render-Peak-Rss-Mb': String(peakRssMb),
        'X-Render-Time-Ms': String(elapsedMs),
        'X-Render-Rss-Trace': rssTrace.join(',')
      }
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        success: false,
        message: e?.message || 'Render worker failed.'
      },
      { status: 500 }
    );
  }
}
