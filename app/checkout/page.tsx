'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CHECKOUT_DRAFT_KEY, type CheckoutDraft } from '../../lib/checkout';
import { LOCAL_FONT_ASSETS } from '../../lib/local-font-assets';

type PaymentMethod = 'coupon' | 'paypal';
type ExportEngine = 'browser' | 'server';

type RedeemResponse = {
  success: boolean;
  message: string;
  orderCode?: string;
  downloadUrl?: string | null;
};

const TARGET_EXPORT_DPI = 300;
const BASE_SVG_DPI = 72;
const MAX_CLIENT_EXPORT_PIXELS = 40_000_000;
const MOON_ASSET_PATH_REGEX = /\/(?:moon_(?:gold|silver)\.png|moon-phases\/(?:gold|silver)\/(?:[1-9]|[12]\d|30)\.png)/g;
const VINYL_ASSET_PATH_REGEX = /\/vinyl\/(?:backgrounds|labels)\/[a-zA-Z0-9._-]+\.(?:png|jpe?g|webp)/g;

function getRasterScale(svgWidth: number, svgHeight: number): number {
  const targetScale = TARGET_EXPORT_DPI / BASE_SVG_DPI;
  const basePixels = Math.max(1, svgWidth * svgHeight);
  const capByPixels = Math.sqrt(MAX_CLIENT_EXPORT_PIXELS / basePixels);
  const scale = Math.max(1, Math.min(targetScale, capByPixels));
  return Number(scale.toFixed(3));
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

function replaceAssetUrlRefs(svg: string, assetPath: string, replacement: string): string {
  return svg
    .replaceAll(`href="${assetPath}"`, `href="${replacement}"`)
    .replaceAll(`href='${assetPath}'`, `href='${replacement}'`)
    .replaceAll(`xlink:href="${assetPath}"`, `xlink:href="${replacement}"`)
    .replaceAll(`xlink:href='${assetPath}'`, `xlink:href='${replacement}'`);
}

function listAssetPaths(svg: string, regex: RegExp): string[] {
  return [...new Set(svg.match(regex) ?? [])];
}

function inferImageMime(assetPath: string): string {
  const rel = assetPath.toLowerCase();
  if (rel.endsWith('.png')) return 'image/png';
  if (rel.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function base64Encode(bytes: Uint8Array): string {
  // Encode in chunks to avoid call-stack limits on large assets.
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(bytes.length, i + chunkSize));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function withAbsoluteMoonUrls(svg: string): string {
  const origin = window.location.origin;
  let result = svg;
  for (const assetPath of listAssetPaths(svg, MOON_ASSET_PATH_REGEX)) {
    const abs = `${origin}${assetPath}`;
    result = replaceAssetUrlRefs(result, assetPath, abs);
  }
  return result;
}

function withAbsoluteVinylUrls(svg: string): string {
  const origin = window.location.origin;
  let result = svg;
  for (const assetPath of listAssetPaths(svg, VINYL_ASSET_PATH_REGEX)) {
    const abs = `${origin}${assetPath}`;
    result = replaceAssetUrlRefs(result, assetPath, abs);
  }
  return result;
}

async function withEmbeddedMoonUrls(svg: string): Promise<string> {
  let result = svg;
  for (const assetPath of listAssetPaths(svg, MOON_ASSET_PATH_REGEX)) {
    try {
      const res = await fetch(`${window.location.origin}${assetPath}`, { cache: 'force-cache' });
      if (!res.ok) continue;
      const raw = new Uint8Array(await res.arrayBuffer());
      const dataUri = `data:image/png;base64,${base64Encode(raw)}`;
      result = replaceAssetUrlRefs(result, assetPath, dataUri);
    } catch {
      // Keep original URL and let absolute fallback handle it.
    }
  }
  return result;
}

async function withEmbeddedVinylUrls(svg: string): Promise<string> {
  let result = svg;
  for (const assetPath of listAssetPaths(svg, VINYL_ASSET_PATH_REGEX)) {
    try {
      const res = await fetch(`${window.location.origin}${assetPath}`, { cache: 'force-cache' });
      if (!res.ok) continue;
      const mime = inferImageMime(assetPath);
      const raw = new Uint8Array(await res.arrayBuffer());
      const dataUri = `data:${mime};base64,${base64Encode(raw)}`;
      result = replaceAssetUrlRefs(result, assetPath, dataUri);
    } catch {
      // Keep original URL and let absolute fallback handle it.
    }
  }
  return result;
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

async function withEmbeddedPosterFonts(svg: string): Promise<string> {
  const uniqueFontFiles = [...new Set(LOCAL_FONT_ASSETS.map((asset) => asset.fileName))];
  const fontDataUriByFile = new Map<string, string>();

  await Promise.all(
    uniqueFontFiles.map(async (fileName) => {
      try {
        const res = await fetch(`${window.location.origin}/fonts/${encodeURIComponent(fileName)}`, { cache: 'force-cache' });
        if (!res.ok) return;
        const raw = new Uint8Array(await res.arrayBuffer());
        if (!raw.length) return;
        fontDataUriByFile.set(fileName, `data:font/ttf;base64,${base64Encode(raw)}`);
      } catch {
        // Ignore missing font files.
      }
    })
  );

  if (fontDataUriByFile.size === 0) return svg;

  const blocks: string[] = [];
  for (const asset of LOCAL_FONT_ASSETS) {
    const dataUri = fontDataUriByFile.get(asset.fileName);
    if (!dataUri) continue;
    blocks.push(
      `@font-face{font-family:'${asset.family}';font-style:${asset.style};font-weight:${asset.weight};font-display:swap;src:url(${dataUri}) format('truetype');}`
    );
  }

  return injectFontCssIntoSvg(svg, blocks.join('\n'));
}

/** CRC32 for PNG chunk integrity verification */
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Injects a pHYs chunk into a PNG byte array to set the DPI metadata.
 * canvas.toBlob() produces PNGs with no DPI info (defaults to 96 DPI in viewers).
 * This rewrites the PNG to correctly report the target DPI for print software.
 */
function injectPngDpi(pngBytes: Uint8Array, dpi: number): Uint8Array {
  const ppm = Math.round(dpi / 0.0254); // pixels per metre

  // Build pHYs chunk data (9 bytes: X ppm + Y ppm + unit)
  const chunkData = new Uint8Array(9);
  const dataView = new DataView(chunkData.buffer);
  dataView.setUint32(0, ppm, false); // X pixels per unit (big-endian)
  dataView.setUint32(4, ppm, false); // Y pixels per unit (big-endian)
  dataView.setUint8(8, 1);           // unit = metre (0x01)

  // CRC32 over chunk type "pHYs" + data
  const typeAndData = new Uint8Array(13);
  typeAndData.set([112, 72, 89, 115], 0); // "pHYs"
  typeAndData.set(chunkData, 4);
  const crc = crc32(typeAndData);

  // Full chunk: 4-byte length + "pHYs" + 9-byte data + 4-byte CRC = 21 bytes
  const phys = new Uint8Array(21);
  const physView = new DataView(phys.buffer);
  physView.setUint32(0, 9, false);        // chunk data length = 9
  phys.set([112, 72, 89, 115], 4);        // "pHYs"
  phys.set(chunkData, 8);                 // X ppm + Y ppm + unit
  physView.setUint32(17, crc, false);     // CRC

  // Insert pHYs after PNG signature (8 bytes) + IHDR chunk (4+4+13+4 = 25 bytes) = offset 33
  const IHDR_END = 33;
  const result = new Uint8Array(pngBytes.length + phys.length);
  result.set(pngBytes.slice(0, IHDR_END));
  result.set(phys, IHDR_END);
  result.set(pngBytes.slice(IHDR_END), IHDR_END + phys.length);
  return result;
}

async function svgToPngBytes(svg: string, width: number, height: number): Promise<Uint8Array> {
  const scale = getRasterScale(width, height);
  const outW = Math.max(1, Math.round(width * scale));
  const outH = Math.max(1, Math.round(height * scale));
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
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('Canvas context is unavailable in browser mode.');
    ctx.drawImage(img, 0, 0, outW, outH);
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('PNG encode failed in browser mode.'));
          return;
        }
        resolve(blob);
      }, 'image/png');
    });
    const rawPng = new Uint8Array(await pngBlob.arrayBuffer());
    return injectPngDpi(rawPng, TARGET_EXPORT_DPI);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

async function downloadFlatBrowserZip(args: { svg: string; filePrefix: string; fileCode: string }): Promise<void> {
  const [{ PDFDocument }, zipMod] = await Promise.all([import('pdf-lib'), import('jszip')]);
  const JSZipCtor = zipMod.default;
  let svg = await withEmbeddedVinylUrls(args.svg);
  svg = await withEmbeddedMoonUrls(svg);
  svg = await withEmbeddedPosterFonts(svg);
  svg = withAbsoluteVinylUrls(svg);
  svg = withAbsoluteMoonUrls(svg);
  const { width, height } = parseSvgSize(svg);
  const pngBytes = await svgToPngBytes(svg, width, height);

  const pdfDoc = await PDFDocument.create();
  const pngImage = await pdfDoc.embedPng(pngBytes);
  const page = pdfDoc.addPage([width, height]);
  page.drawImage(pngImage, { x: 0, y: 0, width, height });
  const pdfBytes = await pdfDoc.save();

  const zip = new JSZipCtor();
  zip.file(`${args.filePrefix}-${args.fileCode}.svg`, svg);
  zip.file(`${args.filePrefix}-${args.fileCode}.png`, pngBytes);
  zip.file(`${args.filePrefix}-${args.fileCode}.pdf`, pdfBytes);
  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });

  const link = document.createElement('a');
  const url = URL.createObjectURL(zipBlob);
  link.href = url;
  link.download = `${args.filePrefix}-${args.fileCode}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 15_000);
}

export default function CheckoutPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);
  const [email, setEmail] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('coupon');
  const [exportEngine, setExportEngine] = useState<ExportEngine>('browser');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const isCity = draft?.productType === 'city';
  const isVinyl = draft?.productType === 'vinyl';
  const isSoundwave = draft?.productType === 'soundwave';
  const productLabel = isCity ? 'city map' : isVinyl ? 'vinyl poster' : isSoundwave ? 'soundwave poster' : 'sky map';
  const filePrefix = isCity ? 'citymap' : isVinyl ? 'vinylstudio' : isSoundwave ? 'soundwave' : 'ourskymap';

  useEffect(() => {
    try {
      const raw =
        window.localStorage.getItem(CHECKOUT_DRAFT_KEY) ??
        window.sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
      if (!raw) {
        router.replace('/ourskymap');
        return;
      }
      const parsed = JSON.parse(raw) as CheckoutDraft;
      if (!parsed?.previewSvg || !parsed?.renderRequest || !parsed?.mapData) {
        if (parsed?.productType === 'city') {
          router.replace('/citymap');
        } else if (parsed?.productType === 'vinyl') {
          router.replace('/vinyl');
        } else if (parsed?.productType === 'soundwave') {
          router.replace('/soundwave');
        } else {
          router.replace('/ourskymap');
        }
        return;
      }
      setDraft(parsed);
    } catch {
      router.replace('/ourskymap');
    }
  }, [router]);

  const canSubmit = useMemo(() => {
    if (paymentMethod !== 'coupon') return false;
    if (loading) return false;
    if (exportEngine === 'browser') return true;
    return !!email.trim() && !!couponCode.trim();
  }, [couponCode, email, exportEngine, loading, paymentMethod]);

  async function handleCouponSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setLoading(true);
    setError('');
    setInfo('');

    try {
      if (paymentMethod === 'coupon' && exportEngine === 'browser') {
        const startedAt = performance.now();
        const safeCode = (couponCode.trim() || `browser-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        await downloadFlatBrowserZip({
          svg: draft.previewSvg,
          filePrefix,
          fileCode: safeCode
        });
        const elapsed = ((performance.now() - startedAt) / 1000).toFixed(1);
        setInfo(`Browser export completed in ${elapsed}s (dev test mode, coupon not redeemed).`);
        return;
      }

      const res = await fetch('/api/redeem-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: couponCode.trim(),
          email: email.trim(),
          draft
        })
      });
      const data = (await res.json()) as RedeemResponse;
      if (!res.ok || !data.success) {
        setError(data.message || 'Coupon validation failed.');
        return;
      }

      router.push(`/download?orderCode=${encodeURIComponent(data.orderCode || couponCode.trim())}`);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!draft) {
    return <div className="loading">Loading checkout...</div>;
  }

  return (
    <div className="checkoutRoot">
      <div className="starsLayer" />
      <main className="container">
        <section className="left">
          <h1>
            {isCity
              ? 'Your Custom City Map'
              : isVinyl
                ? 'Your Custom Vinyl Poster'
                : isSoundwave
                  ? 'Your Custom Soundwave Poster'
                  : 'Your Custom StarMap'}
          </h1>
          <p>
            {isCity
              ? 'Create your personalized city map and receive print-ready files instantly.'
              : isVinyl
                ? 'Design your personalized vinyl poster and download print-ready files instantly.'
                : isSoundwave
                  ? 'Upload your audio, style the waveform, and download print-ready files instantly.'
                : 'Capture your special moment under the stars with our personalized sky maps.'}
          </p>
          <div className="previewCard">
            <div className="previewMount" dangerouslySetInnerHTML={{ __html: draft.previewSvg }} />
          </div>
          <ul className="benefits">
            <li>
              {isCity
                ? 'High-quality digital city map design'
                : isVinyl
                  ? 'High-quality digital vinyl poster design'
                  : isSoundwave
                    ? 'High-quality digital soundwave poster design'
                  : 'High-quality digital sky map design'}
            </li>
            <li>Instant download after purchase</li>
            <li>Customized to your special location and style</li>
          </ul>
        </section>

        <section className="right">
          <h2>Complete Your Order</h2>
          <p className="sub">Enter your details to receive your custom {productLabel}</p>

          <form onSubmit={handleCouponSubmit} className="form">
            <label>
              <span>Email</span>
              <input
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required={exportEngine !== 'browser'}
              />
              <small>We'll send your {productLabel} to this email</small>
            </label>

            <div className="field">
              <span>Payment Method</span>
              <div className="methodGrid">
                <button
                  type="button"
                  className={`method ${paymentMethod === 'coupon' ? 'active' : ''}`}
                  onClick={() => {
                    setPaymentMethod('coupon');
                    setInfo('');
                  }}
                >
                  Coupon Code
                </button>
                <button
                  type="button"
                  className={`method ${paymentMethod === 'paypal' ? 'active' : ''}`}
                  onClick={() => {
                    setPaymentMethod('paypal');
                    setInfo('PayPal will be enabled soon. For now, continue with coupon code.');
                  }}
                >
                  PayPal (€8.50)
                </button>
              </div>
            </div>

            {paymentMethod === 'coupon' ? (
              <label>
                <span>Coupon Code</span>
                <input
                  type="text"
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  required={exportEngine !== 'browser'}
                />
              </label>
            ) : null}

            <div className="field">
              <span>Export Engine</span>
              <div className="engineToggle" role="tablist" aria-label="Export engine">
                <button
                  type="button"
                  role="tab"
                  aria-selected={exportEngine === 'browser'}
                  className={`engineBtn ${exportEngine === 'browser' ? 'active' : ''}`}
                  onClick={() => setExportEngine('browser')}
                >
                  Browser
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={exportEngine === 'server'}
                  className={`engineBtn ${exportEngine === 'server' ? 'active' : ''}`}
                  onClick={() => setExportEngine('server')}
                >
                  Server
                </button>
              </div>
              {exportEngine === 'browser' ? (
                <small>Browser renders locally; email/coupon are optional and coupon is not redeemed.</small>
              ) : (
                <small>Server mode uses normal coupon + order flow.</small>
              )}
            </div>

            {error ? <p className="error">{error}</p> : null}
            {info ? <p className="info">{info}</p> : null}

            <button type="submit" className="submitBtn" disabled={!canSubmit}>
              {loading
                ? 'Processing...'
                : paymentMethod === 'coupon' && exportEngine === 'browser'
                  ? 'Download in Browser'
                  : 'Continue with Coupon'}
            </button>
          </form>

          <p className="terms">
            By completing this order, you agree to our Terms of Service and Privacy Policy.
          </p>
        </section>
      </main>

      <style jsx>{`
        .loading {
          min-height: 100vh;
          display: grid;
          place-items: center;
          font-size: 18px;
          color: #dbe4f4;
          background: #0c1633;
        }
        .checkoutRoot {
          min-height: 100vh;
          background: radial-gradient(1300px 800px at 20% 10%, #16336f 0%, #0c1f46 38%, #091630 100%);
          position: relative;
          color: #eef3ff;
          overflow: hidden;
        }
        .starsLayer {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image: radial-gradient(#ffffff 0.8px, transparent 0.8px);
          background-size: 220px 220px;
          opacity: 0.28;
        }
        .container {
          position: relative;
          z-index: 1;
          width: min(1240px, 94vw);
          margin: 0 auto;
          padding: 64px 0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 44px;
          align-items: start;
        }
        .left h1 {
          margin: 0;
          font-size: clamp(36px, 4vw, 56px);
          line-height: 1.05;
        }
        .left p {
          margin: 14px 0 30px;
          color: #bdcbec;
          font-size: 18px;
          max-width: 620px;
        }
        .previewCard {
          width: min(530px, 100%);
          background: rgba(255, 255, 255, 0.98);
          border: 1px solid rgba(146, 165, 209, 0.48);
          border-radius: 12px;
          padding: 14px;
        }
        .previewMount {
          display: grid;
          place-items: center;
          min-height: 460px;
          overflow: hidden;
        }
        .previewMount :global(svg) {
          max-width: 100%;
          max-height: 580px;
          width: auto;
          height: auto;
          display: block;
        }
        .benefits {
          list-style: none;
          padding: 0;
          margin: 26px 0 0;
          display: grid;
          gap: 10px;
          color: #d7e2ff;
          font-size: 18px;
        }
        .benefits li::before {
          content: '★';
          color: #f5c84f;
          margin-right: 10px;
        }
        .right {
          background: rgba(17, 32, 67, 0.84);
          border: 1px solid rgba(83, 112, 171, 0.5);
          border-radius: 18px;
          padding: 28px;
          backdrop-filter: blur(4px);
          box-shadow: 0 20px 60px rgba(4, 11, 30, 0.45);
        }
        .right h2 {
          margin: 0;
          font-size: 34px;
        }
        .sub {
          margin: 6px 0 22px;
          color: #b5c5e8;
          font-size: 17px;
        }
        .form {
          display: grid;
          gap: 16px;
        }
        label,
        .field {
          display: grid;
          gap: 8px;
        }
        span {
          font-size: 17px;
          font-weight: 600;
        }
        input {
          height: 52px;
          border-radius: 10px;
          border: 1px solid #486392;
          background: #2a3d60;
          color: #f3f7ff;
          padding: 0 14px;
          font-size: 16px;
          outline: none;
        }
        input::placeholder {
          color: #8ea3ca;
        }
        small {
          color: #9fb2d8;
          font-size: 13px;
        }
        .methodGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .method {
          height: 52px;
          border-radius: 10px;
          border: 1px solid #4e648e;
          background: #2b3f62;
          color: #dbe7ff;
          font-size: 16px;
          cursor: pointer;
        }
        .method.active {
          border-color: #5e4df3;
          background: linear-gradient(90deg, #4e38df 0%, #5f44f6 100%);
          color: #ffffff;
        }
        .engineToggle {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .engineBtn {
          height: 46px;
          border-radius: 10px;
          border: 1px solid #4e648e;
          background: #2b3f62;
          color: #dbe7ff;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
        }
        .engineBtn.active {
          border-color: #f6c54f;
          background: #3f4f6e;
          color: #fff7de;
          box-shadow: 0 0 0 1px rgba(246, 197, 79, 0.3);
        }
        .submitBtn {
          margin-top: 8px;
          height: 54px;
          border-radius: 10px;
          border: 0;
          background: linear-gradient(90deg, #4c36de 0%, #5d42f2 100%);
          color: #fff;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
        }
        .submitBtn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .terms {
          margin: 20px 0 0;
          border-top: 1px solid rgba(120, 146, 194, 0.4);
          padding-top: 16px;
          color: #9fb2d8;
          font-size: 13px;
        }
        .error {
          margin: 0;
          color: #ff8f98;
          font-size: 13px;
        }
        .info {
          margin: 0;
          color: #b9c9ea;
          font-size: 13px;
        }
        @media (max-width: 1080px) {
          .container {
            grid-template-columns: 1fr;
          }
          .previewCard {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
