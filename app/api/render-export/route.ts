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
const TEXTURE_MAX_EXPORT_PIXELS = Number.parseInt(process.env.EXPORT_TEXTURE_MAX_PIXELS ?? '20000000', 10);
const MAX_SVG_CHARS = 12_000_000;
const RENDER_SHARED_SECRET = (process.env.RENDER_SHARED_SECRET ?? '').trim();
const TEXTURE_TILE_SCALE = Number.parseFloat(process.env.EXPORT_TEXTURE_TILE_SCALE ?? '0.55');
const TEXTURE_CONTRAST = Number.parseFloat(process.env.EXPORT_TEXTURE_CONTRAST ?? '1.3');
const TEXTURE_BRIGHTNESS = Number.parseFloat(process.env.EXPORT_TEXTURE_BRIGHTNESS ?? '1.0');
const TEXTURE_SATURATION = Number.parseFloat(process.env.EXPORT_TEXTURE_SATURATION ?? '1.12');
const TEXTURE_SHARPEN_SIGMA = Number.parseFloat(process.env.EXPORT_TEXTURE_SHARPEN_SIGMA ?? '0.8');
const TEXTURE_BLEND = (process.env.EXPORT_TEXTURE_BLEND ?? 'soft-light').trim().toLowerCase();
const TEXTURE_DETAIL_ALPHA = Number.parseFloat(process.env.EXPORT_TEXTURE_DETAIL_ALPHA ?? '0.30');
const TEXTURE_GOLD_DETAIL_ALPHA = Number.parseFloat(process.env.EXPORT_TEXTURE_GOLD_DETAIL_ALPHA ?? '0.10');
const TEXTURE_DETAIL_BLEND = (process.env.EXPORT_TEXTURE_DETAIL_BLEND ?? 'hard-light').trim().toLowerCase();
const TEXTURE_PIPELINE_VERSION = '2';

type SharpBlendMode =
  | 'clear'
  | 'source'
  | 'over'
  | 'in'
  | 'out'
  | 'atop'
  | 'dest'
  | 'dest-over'
  | 'dest-in'
  | 'dest-out'
  | 'dest-atop'
  | 'xor'
  | 'add'
  | 'saturate'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'colour-dodge'
  | 'color-dodge'
  | 'colour-burn'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion';

type TextureKind = 'gold' | 'silver' | 'unknown';

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
    forceSharpRenderer?: boolean;
  }
): Promise<Buffer> {
  const svgBuffer = Buffer.from(svg, 'utf-8');
  const scale = getRasterScale(opts.svgWidth, opts.svgHeight, opts.maxExportPixels ?? DEFAULT_MAX_EXPORT_PIXELS);
  const targetWidth = Math.max(1, Math.round(opts.svgWidth * scale));
  const targetHeight = Math.max(1, Math.round(opts.svgHeight * scale));
  const sharpRaster = () =>
    sharp(svgBuffer, { density: Math.max(BASE_SVG_DPI, Math.round(BASE_SVG_DPI * scale)) })
      .resize(targetWidth, targetHeight, { fit: 'fill' })
      .png({ compressionLevel: 9 })
      .toBuffer();

  if (opts.forceSharpRenderer) {
    return sharpRaster();
  }
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
  return sharpRaster();
}

function hasInkTexturePattern(svg: string): boolean {
  return svg.includes('id="inkTexturePattern"') || svg.includes("id='inkTexturePattern'");
}

function clampNum(v: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, v));
}

function getTextureBlendMode(): SharpBlendMode {
  const allowed = new Set<SharpBlendMode>([
    'over',
    'multiply',
    'screen',
    'overlay',
    'soft-light',
    'hard-light',
    'color-dodge',
    'colour-dodge',
    'color-burn',
    'colour-burn',
    'lighten',
    'darken'
  ]);
  return allowed.has(TEXTURE_BLEND as SharpBlendMode) ? (TEXTURE_BLEND as SharpBlendMode) : 'soft-light';
}

function getTextureDetailBlendMode(): SharpBlendMode {
  const allowed = new Set<SharpBlendMode>([
    'overlay',
    'hard-light',
    'soft-light',
    'multiply',
    'screen',
    'color-dodge',
    'colour-dodge',
    'darken',
    'lighten'
  ]);
  return allowed.has(TEXTURE_DETAIL_BLEND as SharpBlendMode) ? (TEXTURE_DETAIL_BLEND as SharpBlendMode) : 'hard-light';
}

async function makePdfFromPng(pngBuffer: Buffer, svgWidthPx: number, svgHeightPx: number): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();

  // SVG uses 72 DPI as base (1 SVG pixel = 1 PDF point at 72 DPI)
  // PDF also uses 72 points/inch, so SVG pixels map 1:1 to PDF points
  // This preserves the physical dimensions: e.g., 8.5" × 11" poster stays 8.5" × 11" in PDF
  // The embedded PNG is at 300 DPI, but we scale it to match the original physical size
  const pageWidth = Math.max(72, svgWidthPx);
  const pageHeight = Math.max(72, svgHeightPx);

  const pngImage = await pdfDoc.embedPng(pngBuffer);
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  // Draw the high-res PNG (300 DPI) at the original physical dimensions
  page.drawImage(pngImage, {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function buildTextureCompositePng(opts: {
  baseSvg: string;
  maskSvg: string;
  textureBase64: string;
  textureKind?: TextureKind;
  svgWidth: number;
  svgHeight: number;
  onStage?: (label: string) => void;
}): Promise<Buffer> {
  const onStage = opts.onStage ?? (() => { });
  const maxExportPixels = TEXTURE_MAX_EXPORT_PIXELS;
  const basePng = await renderSvgToPng(opts.baseSvg, {
    svgWidth: opts.svgWidth,
    svgHeight: opts.svgHeight,
    allowSharpFallback: true,
    maxExportPixels
  });
  onStage('base_png');
  let maskPng = await renderSvgToPng(opts.maskSvg, {
    svgWidth: opts.svgWidth,
    svgHeight: opts.svgHeight,
    allowSharpFallback: true,
    maxExportPixels
  });
  onStage('mask_png');

  const baseMeta = await sharp(basePng).metadata();
  const outW = Math.max(1, baseMeta.width ?? Math.round(opts.svgWidth));
  const outH = Math.max(1, baseMeta.height ?? Math.round(opts.svgHeight));

  // Ensure mask exactly matches base dimensions — resvg can produce ±1px variance.
  const maskMeta = await sharp(maskPng).metadata();
  if (maskMeta.width !== outW || maskMeta.height !== outH) {
    maskPng = await sharp(maskPng).resize(outW, outH, { fit: 'fill' }).png().toBuffer();
  }

  const textureRaw = Buffer.from(opts.textureBase64, 'base64');
  if (!textureRaw.length) throw new Error('Texture payload is empty.');
  const kind: TextureKind = opts.textureKind === 'gold' || opts.textureKind === 'silver' ? opts.textureKind : 'unknown';
  const tileScaleBase = clampNum(TEXTURE_TILE_SCALE, 0.25, 1, 0.55);
  const contrastBase = clampNum(TEXTURE_CONTRAST, 0.8, 2.5, 1.3);
  const brightness = clampNum(TEXTURE_BRIGHTNESS, 0.7, 1.6, 1.0);
  const saturationBase = clampNum(TEXTURE_SATURATION, 0.6, 2.2, 1.12);
  const sharpenSigmaBase = clampNum(TEXTURE_SHARPEN_SIGMA, 0, 3, 0.8);
  let blendMode = getTextureBlendMode();
  const detailBlendMode = getTextureDetailBlendMode();
  const detailAlphaBase = clampNum(TEXTURE_DETAIL_ALPHA, 0, 1, 0.30);
  const detailAlphaGold = clampNum(TEXTURE_GOLD_DETAIL_ALPHA, 0, 1, 0.62);

  // Gold: fine metallic sheen — minimal processing to preserve natural texture detail.
  const tileScale = kind === 'gold'
    ? clampNum(Math.max(tileScaleBase, 1.0), 0.25, 1, 1.0)
    : clampNum(Math.max(tileScaleBase, 0.58), 0.25, 1, 0.58);
  const contrast = kind === 'gold' ? Math.max(contrastBase, 1.15) : Math.max(contrastBase, 1.55);
  const saturation = kind === 'gold' ? Math.max(saturationBase, 1.08) : Math.max(saturationBase, 1.18);
  const sharpenSigma = kind === 'gold' ? Math.max(sharpenSigmaBase, 0.4) : Math.max(sharpenSigmaBase, 1.15);
  const detailAlpha = kind === 'gold' ? detailAlphaGold : detailAlphaBase;

  const sampleW = Math.max(256, Math.round(outW * tileScale));
  const sampleH = Math.max(256, Math.round(outH * tileScale));
  const contrastOffset = -(128 * contrast) + 128;
  let tile = sharp(textureRaw)
    .resize(sampleW, sampleH, { fit: 'cover', position: 'centre' })
    .modulate({ brightness, saturation })
    .linear(contrast, contrastOffset);
  // normalize() omitted for gold — stretches tonal range too aggressively, creating coarse grain.
  if (sharpenSigma > 0.05) {
    tile = tile.sharpen(sharpenSigma);
  }
  const sampledTexture = await tile.png().toBuffer();
  // Avoid repeat seams by never tiling; scale a single processed texture to output.
  const textureCanvas = sampleW === outW && sampleH === outH
    ? sampledTexture
    : await sharp(sampledTexture)
      .resize(outW, outH, { fit: 'fill', kernel: 'cubic' })
      .png()
      .toBuffer();
  onStage('texture_canvas');
  const maskedTexture = await sharp(textureCanvas)
    .composite([{ input: maskPng, blend: 'dest-in' }])
    .png()
    .toBuffer();
  onStage('masked_texture');

  const detailContrastMul = kind === 'gold' ? 1.3 : 2.35;
  const detailTexture = await sharp(textureCanvas)
    .modulate({ saturation: 0.15 })
    .linear(detailContrastMul, -(128 * detailContrastMul) + 128)
    .sharpen(Math.max(0.8, sharpenSigma + 0.3))
    .png()
    .toBuffer();
  const maskedDetailTexture = await sharp(detailTexture)
    .composite([{ input: maskPng, blend: 'dest-in' }])
    .png()
    .toBuffer();
  onStage('masked_detail_texture');
  const maskedDetailTextureWithOpacity = detailAlpha >= 0.999
    ? maskedDetailTexture
    : await sharp(maskedDetailTexture)
      .ensureAlpha()
      .linear([1, 1, 1, detailAlpha], [0, 0, 0, 0])
      .png()
      .toBuffer();

  return sharp(basePng)
    .composite([
      { input: maskedTexture, blend: blendMode },
      { input: maskedDetailTextureWithOpacity, blend: detailBlendMode }
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
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
      baseSvg?: string;
      maskSvg?: string;
      textureBase64?: string;
      textureKind?: TextureKind;
    };
    const width = Number.isFinite(body?.svgWidth) && Number(body.svgWidth) > 0 ? Number(body.svgWidth) : 1200;
    const height = Number.isFinite(body?.svgHeight) && Number(body.svgHeight) > 0 ? Number(body.svgHeight) : 1800;
    const allowSharpFallback = !!body?.allowSharpFallback;
    const baseSvg = String(body?.baseSvg || '');
    const maskSvg = String(body?.maskSvg || '');
    const textureBase64 = String(body?.textureBase64 || '');
    const textureKind: TextureKind = body?.textureKind === 'gold' || body?.textureKind === 'silver' ? body.textureKind : 'unknown';
    const hasCompositePayload = !!baseSvg && !!maskSvg && !!textureBase64;

    const png = hasCompositePayload
      ? await (async () => {
        if ((!baseSvg.trim().startsWith('<svg') && !baseSvg.trim().startsWith('<?xml')) || (!maskSvg.trim().startsWith('<svg') && !maskSvg.trim().startsWith('<?xml'))) {
          throw new Error('Invalid composite SVG payload.');
        }
        if (baseSvg.length > MAX_SVG_CHARS || maskSvg.length > MAX_SVG_CHARS) {
          throw new Error('Composite SVG payload is too large.');
        }
        return buildTextureCompositePng({
          baseSvg,
          maskSvg,
          textureBase64,
          textureKind,
          svgWidth: width,
          svgHeight: height,
          onStage: markRss
        });
      })()
      : await (async () => {
        const svg = String(body?.svg || '');
        if (!svg.trim().startsWith('<svg') && !svg.trim().startsWith('<?xml')) {
          throw new Error('Invalid SVG payload.');
        }
        if (svg.length > MAX_SVG_CHARS) {
          throw new Error('SVG payload is too large.');
        }
        const textureSvg = hasInkTexturePattern(svg);
        const maxExportPixels = textureSvg ? TEXTURE_MAX_EXPORT_PIXELS : DEFAULT_MAX_EXPORT_PIXELS;
        return renderSvgToPng(svg, {
          svgWidth: width,
          svgHeight: height,
          allowSharpFallback,
          maxExportPixels,
          forceSharpRenderer: textureSvg
        });
      })();
    markRss('png_ready');

    // Add DPI metadata to PNG (pHYs chunk for 300 DPI)
    const pngWithDpi = await sharp(png)
      .withMetadata({
        density: TARGET_EXPORT_DPI
      })
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
        'X-Render-Rss-Trace': rssTrace.join(','),
        'X-Texture-Pipeline-Version': TEXTURE_PIPELINE_VERSION
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
