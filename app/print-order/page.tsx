'use client';

import { Suspense, type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import JSZip from 'jszip';
import { calculatePrintTotals, formatMoney } from '../../lib/print-pricing';
import type { PricingPayload, PrintCurrency, PrintOptionKey, PrintSizeKey } from '../../lib/print-types';
import { buildDevZipBlob, loadDevDownloadDraft, triggerBlobDownload } from '../../lib/dev-download';
import { buildOrderFileToken, mapDesignSizeToPrintSize } from '../../lib/print-size-utils';
import { CHECKOUT_DRAFT_KEY, type CheckoutDraft, type CheckoutExportMode } from '../../lib/checkout';

type OrderStatusResponse = {
  success: boolean;
  message?: string;
  orderCode?: string;
  status?: 'pending' | 'completed';
  downloadUrl?: string | null;
  customerEmail?: string | null;
  sourcePrintSize?: PrintSizeKey | null;
};

type PricingResponse = PricingPayload & {
  success: boolean;
  message?: string;
};

type CheckoutResponse = {
  success: boolean;
  message?: string;
  printOrderCode?: string;
};

const MOCKUP_SCENES = [
  {
    title: 'Living Room Mockup',
    src: '/mockups/print-order/mockup-1.jpg'
  },
  {
    title: 'Gift Presentation',
    src: '/mockups/print-order/mockup-2.jpg'
  },
  {
    title: 'Studio Wall Preview',
    src: '/mockups/print-order/mockup-3.jpg'
  }
] as const;

function currencyByCountry(countryCode: string): PrintCurrency {
  return countryCode.toUpperCase() === 'US' ? 'USD' : 'EUR';
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read image.'));
    reader.readAsDataURL(blob);
  });
}

const MOON_ASSET_PATH_REGEX = /(xlink:href|href)=["'](\/(?:moon_(?:gold|silver)\.png|moon-phases\/(?:gold|silver)\/(?:[1-9]|[12]\d|30)\.png))["']/g;

function absolutizeMoonAssetRefs(svg: string): string {
  if (typeof window === 'undefined') return svg;
  const base = window.location.origin.replace(/\/+$/, '');
  return svg.replace(MOON_ASSET_PATH_REGEX, (_match, attr: string, path: string) => `${attr}="${base}${path}"`);
}

async function extractPreviewPng(zipUrl: string): Promise<string | null> {
  try {
    const res = await fetch(zipUrl, { cache: 'no-store' });
    if (!res.ok) return null;
    const bytes = await res.arrayBuffer();
    const zip = await JSZip.loadAsync(bytes);
    const entry = Object.values(zip.files).find((item) => !item.dir && item.name.toLowerCase().endsWith('.png'));
    if (!entry) return null;
    const blob = await entry.async('blob');
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

function PrintOrderStateScreen(props: {
  title: string;
  message: string;
  linkHref?: string;
  linkLabel?: string;
  debugLabel?: string;
}) {
  useEffect(() => {
    if (!props.debugLabel) return;
    console.info(`[print-order] preparing via ${props.debugLabel}`);
  }, [props.debugLabel]);

  return (
    <div className="statePage">
      <div className="stateShell">
        <div className="stateBrand">
          <div className="stateBrandMark" aria-hidden="true">
            <img src="/logo_ourskymap_v4.jpeg" alt="" />
          </div>
          <div className="stateBrandText">
            <div className="stateBrandMain">STAR MAP</div>
            <div className="stateBrandSub">STUDIO</div>
          </div>
        </div>

        <div className="stateCard">
          <div className="stateOrbit" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <h1>{props.title}</h1>
          <p>{props.message}</p>
          {props.debugLabel ? <div className="stateDebug">dev: {props.debugLabel}</div> : null}
          {props.linkHref && props.linkLabel ? (
            <a href={props.linkHref} className="stateLink">
              {props.linkLabel}
            </a>
          ) : null}
        </div>
      </div>

      <style jsx>{`
        .statePage {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 32px 20px;
          background:
            radial-gradient(circle at top, rgba(90, 118, 190, 0.22), transparent 38%),
            linear-gradient(180deg, #eef2f8 0%, #e5eaf2 100%);
          font-family: 'Signika', ui-sans-serif, system-ui;
          color: #20242f;
        }
        .stateShell {
          width: min(720px, 100%);
          display: grid;
          gap: 22px;
        }
        .stateBrand {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #1b2a4d;
        }
        .stateBrandMark {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 2px solid rgba(27, 42, 77, 0.14);
          overflow: hidden;
          background: rgba(255, 255, 255, 0.72);
          box-shadow: 0 10px 24px rgba(31, 47, 84, 0.12);
        }
        .stateBrandMark img {
          width: 84%;
          height: 84%;
          margin: 8%;
          display: block;
          object-fit: contain;
        }
        .stateBrandMain {
          font-size: 22px;
          line-height: 1;
          letter-spacing: 0.1em;
          font-weight: 700;
        }
        .stateBrandSub {
          margin-top: 3px;
          font-size: 10px;
          line-height: 1;
          letter-spacing: 0.28em;
          opacity: 0.72;
        }
        .stateCard {
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(27, 42, 77, 0.09);
          border-radius: 24px;
          padding: 38px 32px;
          text-align: center;
          box-shadow: 0 26px 70px rgba(32, 44, 73, 0.12);
        }
        .stateOrbit {
          width: 84px;
          height: 84px;
          margin: 0 auto 18px;
          position: relative;
          border-radius: 50%;
          border: 1px solid rgba(31, 63, 149, 0.16);
          background: radial-gradient(circle at 50% 50%, rgba(31, 63, 149, 0.12) 0, rgba(31, 63, 149, 0.03) 54%, transparent 55%);
        }
        .stateOrbit span {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1px solid rgba(31, 63, 149, 0.18);
          animation: orbitPulse 1.8s ease-in-out infinite;
        }
        .stateOrbit span:nth-child(2) {
          inset: 10px;
          animation-delay: 0.18s;
        }
        .stateOrbit span:nth-child(3) {
          inset: 22px;
          animation-delay: 0.36s;
        }
        .stateCard h1 {
          margin: 0;
          font-family: 'Prata', Georgia, serif;
          font-size: clamp(28px, 4vw, 38px);
          line-height: 1.15;
          color: #111827;
        }
        .stateCard p {
          margin: 12px auto 0;
          max-width: 460px;
          font-size: 16px;
          line-height: 1.6;
          color: #546072;
        }
        .stateDebug {
          margin-top: 14px;
          font-size: 11px;
          line-height: 1;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(27, 42, 77, 0.42);
          user-select: text;
        }
        .stateLink {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-top: 22px;
          min-height: 46px;
          padding: 0 18px;
          border-radius: 999px;
          background: linear-gradient(135deg, #1f3f95 0%, #182d67 100%);
          color: #fff;
          text-decoration: none;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.01em;
          box-shadow: 0 14px 30px rgba(31, 63, 149, 0.24);
        }
        @keyframes orbitPulse {
          0%, 100% {
            opacity: 0.34;
            transform: scale(1);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.05);
          }
        }
        @media (max-width: 640px) {
          .stateCard {
            padding: 30px 20px;
            border-radius: 20px;
          }
          .stateBrandMain {
            font-size: 18px;
          }
          .stateBrandSub {
            font-size: 9px;
          }
          .stateCard p {
            font-size: 15px;
          }
        }
      `}</style>
    </div>
  );
}

function loadCheckoutDraftFromStorage(): CheckoutDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CHECKOUT_DRAFT_KEY) ?? window.sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CheckoutDraft;
    if (!parsed?.previewSvg || !parsed?.renderRequest || !parsed?.mapData) return null;
    return parsed;
  } catch {
    return null;
  }
}

function PrintOrderPageBody() {
  const router = useRouter();
  const search = useSearchParams();
  const orderCode = (search.get('orderCode') || '').trim();
  const isLegacyDevMode = search.get('dev') === '1';
  const exportMode: CheckoutExportMode = search.get('exportMode') === 'server' ? 'server' : 'browser';
  const engineLabel = (search.get('engineLabel') || '').trim() || (exportMode === 'browser' ? 'browser' : 'backend');

  const [order, setOrder] = useState<OrderStatusResponse | null>(null);
  const [pricing, setPricing] = useState<PricingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const [countryCode, setCountryCode] = useState('DE');
  const [currency, setCurrency] = useState<PrintCurrency>('EUR');
  const [selectedSize, setSelectedSize] = useState<PrintSizeKey | ''>('');
  const [selectedOption, setSelectedOption] = useState<PrintOptionKey | ''>('');
  const [quantity, setQuantity] = useState(1);
  const [sourcePrintSize, setSourcePrintSize] = useState<PrintSizeKey | ''>('');

  const [shippingName, setShippingName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateRegion, setStateRegion] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewImageDataUrl, setPreviewImageDataUrl] = useState('');
  const [previewSvgMarkup, setPreviewSvgMarkup] = useState('');

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const locale = navigator.language.toLowerCase();
    if (locale.includes('-us')) {
      setCountryCode('US');
      setCurrency('USD');
    }
  }, []);

  useEffect(() => {
    if (!orderCode) {
      setError('Missing order code. Please return to checkout.');
      setLoading(false);
      return;
    }

    if (isLegacyDevMode) {
      const draft = loadDevDownloadDraft();
      if (!draft || draft.orderCode !== orderCode) {
        setError('Missing dev order context. Return to checkout and use Dev Quick Download again.');
        setLoading(false);
        return;
      }
      setOrder({
        success: true,
        orderCode: draft.orderCode,
        status: 'completed',
        customerEmail: draft.email || null
      });
      if (draft.email) {
        setCustomerEmail(draft.email);
      }
      const draftSourceSize =
        draft.sourcePrintSize || mapDesignSizeToPrintSize(draft.sourceDesignSize || null);
      if (draftSourceSize) {
        setSourcePrintSize(draftSourceSize);
      }
      setPreviewImageDataUrl('');
      setPreviewSvgMarkup(absolutizeMoonAssetRefs(draft.previewSvg));
      setLoading(false);
      return;
    }

    if (exportMode === 'browser') {
      const checkoutDraft = loadCheckoutDraftFromStorage();
      if (!checkoutDraft) {
        setError('Missing browser export context. Return to checkout and try again.');
        setLoading(false);
        return;
      }

      setOrder({
        success: true,
        orderCode,
        status: 'completed',
        customerEmail: null
      });
      const localSourceSize = mapDesignSizeToPrintSize(checkoutDraft.mapData.size);
      if (localSourceSize) {
        setSourcePrintSize(localSourceSize);
      }
      setPreviewImageDataUrl('');
      setPreviewSvgMarkup(absolutizeMoonAssetRefs(checkoutDraft.previewSvg));

      const run = async () => {
        setLoading(true);
        setError('');
        try {
          const orderRes = await fetch(`/api/order-status?orderCode=${encodeURIComponent(orderCode)}`, { cache: 'no-store' });
          const orderJson = (await orderRes.json()) as OrderStatusResponse;
          if (orderRes.ok && orderJson.success) {
            setOrder(orderJson);
            if (orderJson.sourcePrintSize) {
              setSourcePrintSize(orderJson.sourcePrintSize);
            }
            if (orderJson.customerEmail) {
              setCustomerEmail(orderJson.customerEmail);
            }
          }
        } catch {
          // Browser export can still proceed from the local draft.
        } finally {
          setLoading(false);
        }
      };

      void run();
      return;
    }

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const orderRes = await fetch(`/api/order-status?orderCode=${encodeURIComponent(orderCode)}`, { cache: 'no-store' });
        const orderJson = (await orderRes.json()) as OrderStatusResponse;

        if (!orderRes.ok || !orderJson.success) {
          throw new Error(orderJson.message || 'Could not load source order.');
        }

        setOrder(orderJson);
        if (orderJson.sourcePrintSize) {
          setSourcePrintSize(orderJson.sourcePrintSize);
        }

        if (orderJson.customerEmail) {
          setCustomerEmail(orderJson.customerEmail);
        }

        const prefilledPreview = orderJson.downloadUrl ? await extractPreviewPng(orderJson.downloadUrl) : null;
        if (prefilledPreview) {
          setPreviewSvgMarkup('');
          setPreviewImageDataUrl(prefilledPreview);
        }
      } catch (e: any) {
        setError(e?.message ?? 'Could not load print order page.');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [exportMode, isLegacyDevMode, orderCode]);

  useEffect(() => {
    const run = async () => {
      try {
        const pricingRes = await fetch(`/api/print-orders/pricing?currency=${encodeURIComponent(currency)}`, { cache: 'no-store' });
        const pricingJson = (await pricingRes.json()) as PricingResponse;
        if (!pricingRes.ok || !pricingJson.success) {
          throw new Error(pricingJson.message || 'Could not load print pricing.');
        }
        setPricing(pricingJson);
      } catch (e: any) {
        setError(e?.message ?? 'Could not load print pricing.');
      }
    };
    void run();
  }, [currency]);

  useEffect(() => {
    if (!pricing) return;
    const pricingSizeKeys = new Set(pricing.sizes.map((item) => item.key));
    const hasSourceSize = !!sourcePrintSize && pricingSizeKeys.has(sourcePrintSize);

    if (hasSourceSize && !uploadFile) {
      if (selectedSize !== sourcePrintSize) {
        setSelectedSize(sourcePrintSize);
      }
    } else if (!selectedSize && pricing.sizes.length > 0) {
      setSelectedSize(pricing.sizes[0].key as PrintSizeKey);
    }
    if (!selectedOption && pricing.printOptions.length > 0) {
      setSelectedOption(pricing.printOptions[0].key as PrintOptionKey);
    }
    if (!pricing.quantityOptions.includes(quantity)) {
      setQuantity(pricing.quantityOptions[0] || 1);
    }
  }, [pricing, quantity, selectedOption, selectedSize, sourcePrintSize, uploadFile]);

  const isOrderSizeLocked = !!sourcePrintSize && !uploadFile;

  const selectedSizeLabel = useMemo(() => {
    if (!selectedSize || !pricing) return '';
    return pricing.sizes.find((item) => item.key === selectedSize)?.label || selectedSize;
  }, [pricing, selectedSize]);

  const totals = useMemo(() => {
    if (!selectedSize || !selectedOption) return null;
    return calculatePrintTotals({
      size: selectedSize,
      option: selectedOption,
      quantity,
      currency
    });
  }, [currency, quantity, selectedOption, selectedSize]);

  async function handleUploadChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    if (!String(file.type || '').startsWith('image/')) {
      setError('Please upload a valid image file (PNG/JPG/WEBP).');
      return;
    }
    const dataUrl = await blobToDataUrl(file);
    setUploadFile(file);
    setPreviewSvgMarkup('');
    setPreviewImageDataUrl(dataUrl);
    setError('');
  }

  function extractFileNameFromDisposition(disposition: string | null, fallback: string): string {
    if (!disposition) return fallback;
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
      try {
        return decodeURIComponent(utf8Match[1]);
      } catch {
        return utf8Match[1];
      }
    }
    const simpleMatch = disposition.match(/filename="?([^\";]+)"?/i);
    return simpleMatch?.[1] || fallback;
  }

  async function handleDownloadZipAgain() {
    if (!order?.orderCode) return;
    setDownloadingZip(true);
    setDownloadError('');
    try {
      if (isLegacyDevMode || exportMode === 'browser') {
        const legacyDraft = isLegacyDevMode ? loadDevDownloadDraft() : null;
        const checkoutDraft = loadCheckoutDraftFromStorage();
        const previewSvg = legacyDraft?.previewSvg || checkoutDraft?.previewSvg || '';
        if (!previewSvg) {
          throw new Error('Missing browser export context. Return to checkout and retry.');
        }
        const resolvedSourceSize =
          sourcePrintSize ||
          legacyDraft?.sourcePrintSize ||
          mapDesignSizeToPrintSize(checkoutDraft?.mapData.size || null);
        const zipBlob = await buildDevZipBlob(previewSvg, order.orderCode, resolvedSourceSize || null);
        const token = buildOrderFileToken(order.orderCode, resolvedSourceSize || null);
        triggerBlobDownload(zipBlob, `ourskymap-${token}.zip`);
        return;
      }

      const res = await fetch(`/api/download-order-file?orderCode=${encodeURIComponent(order.orderCode)}`, { cache: 'no-store' });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message || 'Download failed. Please try again.');
      }
      const blob = await res.blob();
      const fallbackName = `ourskymap-${order.orderCode}.zip`;
      const fileName = extractFileNameFromDisposition(res.headers.get('content-disposition'), fallbackName);
      triggerBlobDownload(blob, fileName);
    } catch (e: any) {
      setDownloadError(e?.message || 'Download failed. Please try again.');
    } finally {
      setDownloadingZip(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!order?.orderCode || !pricing || !selectedSize || !selectedOption || !totals) return;

    const normalizedShippingName = shippingName.trim();
    const normalizedAddressLine1 = addressLine1.trim();
    const normalizedCity = city.trim();
    const normalizedPostalCode = postalCode.trim();
    const normalizedCountryCode = countryCode.trim().toUpperCase();

    if (!normalizedShippingName || !normalizedAddressLine1 || !normalizedCity || !normalizedPostalCode || !normalizedCountryCode) {
      setError('Please complete shipping details for physical print options.');
      return;
    }

    if (isLegacyDevMode) {
      const devPrintOrderCode = `DEV-PO-${Date.now()}`;
      router.push(
        `/print-order/success?printOrderCode=${encodeURIComponent(devPrintOrderCode)}&sourceOrderCode=${encodeURIComponent(order.orderCode)}&currency=${currency}&total=${encodeURIComponent(totals.total.toFixed(2))}&dev=1`
      );
      return;
    }

    setSaving(true);
    setError('');
    try {
      const form = new FormData();
      form.append('orderCode', order.orderCode);
      form.append('size', selectedSize);
      form.append('printOption', selectedOption);
      form.append('quantity', String(quantity));
      form.append('currency', currency);
      form.append('shippingName', normalizedShippingName);
      form.append('customerEmail', customerEmail.trim());
      form.append('phone', phone.trim());
      form.append('addressLine1', normalizedAddressLine1);
      form.append('addressLine2', addressLine2.trim());
      form.append('city', normalizedCity);
      form.append('stateRegion', stateRegion.trim());
      form.append('postalCode', normalizedPostalCode);
      form.append('countryCode', normalizedCountryCode);
      if (uploadFile) {
        form.append('artworkFile', uploadFile);
      }

      const res = await fetch('/api/print-orders/checkout', {
        method: 'POST',
        body: form
      });
      const json = (await res.json()) as CheckoutResponse;
      if (!res.ok || !json.success || !json.printOrderCode) {
        throw new Error(json.message || 'Print order could not be completed.');
      }

      router.push(`/print-order/success?printOrderCode=${encodeURIComponent(json.printOrderCode)}`);
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong while saving print order.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <PrintOrderStateScreen
        title="Preparing your print checkout"
        message="We are loading your artwork, delivery options, and download details."
        debugLabel={engineLabel}
      />
    );
  }

  if (error && !order) {
    return (
      <PrintOrderStateScreen
        title="We could not open this print checkout"
        message={error}
        linkHref="/checkout"
        linkLabel="Back to checkout"
        debugLabel={engineLabel}
      />
    );
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <div className="brandMark" aria-hidden="true">
            <img src="/logo_ourskymap_v4.jpeg" alt="" />
          </div>
          <div className="brandText">
            <div className="brandMain">STAR MAP</div>
            <div className="brandSub">STUDIO</div>
          </div>
        </div>
        <nav className="cornerLinks" aria-label="Quick links">
          <a href="/ourskymap">SkyMap Studio</a>
          <a href="/">Home Page</a>
        </nav>
      </header>

      <main className="shell">
        {/* ---- Left Panel: Product Preview ---- */}
        <section className="leftRail">
          <div className="artPanel">
            <div className="artFrame">
              <span className="orderPill">Order #{order?.orderCode}</span>
              {previewImageDataUrl ? (
                <img src={previewImageDataUrl} alt="Your custom star map" />
              ) : previewSvgMarkup ? (
                <div className="inlineSvgMount" dangerouslySetInnerHTML={{ __html: previewSvgMarkup }} />
              ) : (
                <div className="placeholder">Upload your artwork to see a preview.</div>
              )}
            </div>
            <p className="artCaption">Your custom star map</p>
          </div>

          <div className="fileBanner">
            <div className="fileBannerContent">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 1.67a8.33 8.33 0 100 16.66 8.33 8.33 0 000-16.66zm-.83 11.66V8.33h1.66v5h-1.66zm0-6.66V5h1.66v1.67H9.17z" fill="#1f8844"/></svg>
              <span>Digital file ready</span>
            </div>
            <p className="fileBannerHint">Download button is pinned under the print title.</p>
          </div>

          <div className="mockupStrip">
            {isLegacyDevMode ? <span className="mockupDevHint">Replace files in /public/mockups/print-order</span> : null}
            <div className="mockupRow">
              {MOCKUP_SCENES.map((scene) => (
                <figure key={scene.title} className="mockupThumb">
                  <img src={scene.src} alt={scene.title} />
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ---- Right Panel: Configuration & Checkout ---- */}
        <section className="buyPanel">
          <div className="priceSection">
            <h1 className="productTitle">Custom Star Map Print</h1>
            <p className="productSubtitle">Personalized Wall Art Keepsake</p>
            <p className="trustLine">Free exchanges accepted</p>
            <div className="downloadCallout">
              <div className="downloadCalloutCopy">
                <strong>Your paid digital file is ready</strong>
                <span>Download anytime while you decide on physical print options.</span>
              </div>
              <button type="button" className="downloadPrimaryBtn" onClick={() => void handleDownloadZipAgain()} disabled={downloadingZip}>
                {downloadingZip ? 'Preparing ZIP...' : 'Download ZIP'}
              </button>
            </div>
            {downloadError ? <p className="downloadInlineError">{downloadError}</p> : null}
          </div>

          <form className="form" onSubmit={handleSubmit}>
            <div className="configSection">
              <h2 className="sectionHeading">Print Options</h2>
              <div className="configGrid">
                <label className="field">
                  <span className="fieldLabel">{isOrderSizeLocked ? 'Size (from your digital order)' : 'Size'}</span>
                  {isOrderSizeLocked ? (
                    <>
                      <input className="fieldInput" value={selectedSizeLabel || String(selectedSize)} readOnly />
                      <small className="fieldHint">Upload a replacement artwork to choose another size.</small>
                    </>
                  ) : (
                    <select className="fieldInput" value={selectedSize} onChange={(e) => setSelectedSize(e.target.value as PrintSizeKey)} required>
                      <option value="">Select size</option>
                      {pricing?.sizes.map((size) => (
                        <option key={size.key} value={size.key}>{size.label}</option>
                      ))}
                    </select>
                  )}
                </label>

                <label className="field">
                  <span className="fieldLabel">Print Type</span>
                  <select className="fieldInput" value={selectedOption} onChange={(e) => setSelectedOption(e.target.value as PrintOptionKey)} required>
                    <option value="">Select type</option>
                    {pricing?.printOptions.map((option) => (
                      <option key={option.key} value={option.key}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label className="field fieldSmall">
                  <span className="fieldLabel">Quantity</span>
                  <select className="fieldInput" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}>
                    {(pricing?.quantityOptions || [1]).map((qty) => (
                      <option key={qty} value={qty}>{qty}</option>
                    ))}
                  </select>
                </label>
              </div>

              <details className="uploadDetails">
                <summary className="uploadSummary">Replace artwork (optional)</summary>
                <div className="uploadBody">
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUploadChange} className="uploadInput" />
                </div>
              </details>
            </div>

            <div className="shippingCard">
              <h2 className="sectionHeading">Shipping & Contact</h2>
              <div className="addressGrid">
                <label className="field">
                  <span className="fieldLabel">Full Name</span>
                  <input className="fieldInput" value={shippingName} onChange={(e) => setShippingName(e.target.value)} required />
                </label>
                <label className="field">
                  <span className="fieldLabel">Email</span>
                  <input className="fieldInput" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
                </label>
                <label className="field">
                  <span className="fieldLabel">Phone</span>
                  <input className="fieldInput" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </label>
                <label className="field">
                  <span className="fieldLabel">Country</span>
                  <select
                    className="fieldInput"
                    value={countryCode}
                    onChange={(e) => {
                      const next = e.target.value;
                      setCountryCode(next);
                      setCurrency(currencyByCountry(next));
                    }}
                  >
                    <option value="DE">Germany</option>
                    <option value="TR">Turkey</option>
                    <option value="US">United States</option>
                    <option value="NL">Netherlands</option>
                    <option value="FR">France</option>
                    <option value="ES">Spain</option>
                    <option value="IT">Italy</option>
                    <option value="GB">United Kingdom</option>
                  </select>
                </label>
                <label className="field fieldFull">
                  <span className="fieldLabel">Address Line 1</span>
                  <input className="fieldInput" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} required />
                </label>
                <label className="field fieldFull">
                  <span className="fieldLabel">Address Line 2</span>
                  <input className="fieldInput" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
                </label>
                <label className="field">
                  <span className="fieldLabel">City</span>
                  <input className="fieldInput" value={city} onChange={(e) => setCity(e.target.value)} required />
                </label>
                <label className="field">
                  <span className="fieldLabel">State / Region</span>
                  <input className="fieldInput" value={stateRegion} onChange={(e) => setStateRegion(e.target.value)} />
                </label>
                <label className="field">
                  <span className="fieldLabel">Postal Code</span>
                  <input className="fieldInput" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} required />
                </label>
              </div>
            </div>

            <div className="orderSummary">
              <div className="summaryRow"><span>Currency</span><strong>{currency}</strong></div>
              <div className="summaryRow"><span>Unit price</span><strong>{totals ? formatMoney(totals.unit, currency) : '\u2014'}</strong></div>
              <div className="summaryRow"><span>Subtotal</span><strong>{totals ? formatMoney(totals.subtotal, currency) : '\u2014'}</strong></div>
              <div className="summaryRow"><span>Shipping</span><strong>{totals ? formatMoney(totals.shipping, currency) : '\u2014'}</strong></div>
              <div className="summaryRow summaryTotal"><span>Estimated Total</span><strong>{totals ? formatMoney(totals.total, currency) : '\u2014'}</strong></div>
              <p className="summaryNote">Estimated total. Final exact pricing will be applied at fulfillment.</p>
            </div>

            {error ? <p className="formError">{error}</p> : null}

            <button type="submit" className="submitBtn" disabled={saving || !selectedSize || !selectedOption}>
              {saving ? 'Processing...' : 'Complete Order (Mock Payment)'}
            </button>
            <p className="submitNote">Payoneer integration is prepared but not active yet.</p>
          </form>
        </section>
      </main>

      {/* Mobile sticky CTA bar */}
      <div className="mobileCta">
        <div className="mobileCtaInner">
          <span className="mobileCtaPrice">{totals ? formatMoney(totals.total, currency) : '\u2014'}</span>
          <button
            type="button"
            className="mobileCtaBtn"
            disabled={saving || !selectedSize || !selectedOption}
            onClick={() => {
              const f = document.querySelector('.form') as HTMLFormElement | null;
              if (f) f.requestSubmit();
            }}
          >
            {saving ? 'Processing...' : 'Complete Order'}
          </button>
        </div>
      </div>

      <style jsx>{`
        /* ========== Layout ========== */
        .state {
          min-height: 100vh;
          display: grid;
          place-items: center;
          background: #f0f2f7;
          color: #23252c;
          text-align: center;
          padding: 24px;
          font-family: 'Signika', ui-sans-serif, system-ui;
        }
        .state a {
          color: #3b5998;
          text-decoration: none;
        }
        .page {
          min-height: 100vh;
          background: linear-gradient(170deg, #eef1f8 0%, #e4e8f0 100%);
          color: #20242f;
          padding: 108px 28px 28px;
          font-family: 'Signika', ui-sans-serif, system-ui;
        }
        .topbar {
          height: 74px;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 80;
          background: linear-gradient(90deg, #0f172a 0%, #13203f 52%, #1b2a4d 100%);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 0 18px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.14);
          overflow: hidden;
        }
        .topbar::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            radial-gradient(circle, rgba(255, 255, 255, 0.42) 0.7px, transparent 1px),
            radial-gradient(circle, rgba(255, 255, 255, 0.28) 0.5px, transparent 0.9px);
          background-size: 46px 46px, 73px 73px;
          background-position: 0 0, 23px 14px;
          background-repeat: repeat, repeat;
          opacity: 0.88;
        }
        .topbar > * {
          position: relative;
          z-index: 2;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 0 0 auto;
          min-width: 0;
        }
        .brandMark {
          width: 40px;
          height: 40px;
          border: 2px solid rgba(255, 255, 255, 0.82);
          border-radius: 50%;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.08);
        }
        .brandMark img {
          width: 84%;
          height: 84%;
          margin: 8%;
          display: block;
          object-fit: contain;
          object-position: center;
          border-radius: 50%;
        }
        .brandMain {
          font-size: 18px;
          letter-spacing: 0.1em;
          line-height: 1;
          font-weight: 700;
          font-family: 'Signika', ui-sans-serif, system-ui;
        }
        .brandSub {
          font-size: 9px;
          letter-spacing: 0.32em;
          margin-top: 2px;
          font-family: 'Signika', ui-sans-serif, system-ui;
        }
        .cornerLinks {
          display: inline-flex;
          align-items: center;
          gap: 18px;
          flex: 0 0 auto;
        }
        .cornerLinks a {
          color: rgba(255, 255, 255, 0.92);
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.01em;
          white-space: nowrap;
        }
        .cornerLinks a:hover {
          color: #ffffff;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .shell {
          max-width: 1320px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 28px;
          align-items: start;
        }

        /* ========== Left Rail ========== */
        .leftRail {
          position: sticky;
          top: 28px;
          display: grid;
          gap: 16px;
        }
        .artPanel {
          border-radius: 16px;
          overflow: hidden;
          background: #fff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
        }
        .artFrame {
          position: relative;
          min-height: 520px;
          background: #0f1729;
          padding: 24px;
          display: grid;
          place-items: center;
          overflow: hidden;
        }
        .orderPill {
          position: absolute;
          top: 12px;
          right: 12px;
          font-size: 11px;
          padding: 5px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.6);
          font-weight: 600;
          letter-spacing: 0.02em;
          z-index: 2;
        }
        .artFrame img {
          max-width: 100%;
          max-height: 480px;
          object-fit: contain;
          border-radius: 6px;
        }
        .artFrame :global(.inlineSvgMount) {
          width: 100%;
          max-height: 480px;
          border-radius: 6px;
          overflow: hidden;
          display: grid;
          place-items: center;
        }
        .artFrame :global(.inlineSvgMount svg) {
          width: 100%;
          height: 100%;
          display: block;
        }
        .placeholder {
          color: rgba(255, 255, 255, 0.4);
          font-size: 15px;
          text-align: center;
          max-width: 300px;
        }
        .artCaption {
          margin: 0;
          padding: 12px 16px;
          font-size: 13px;
          color: #6b7280;
          text-align: center;
        }

        /* ========== File Banner ========== */
        .fileBanner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 12px;
          background: #f8fafb;
          border: 1px solid #e5e8ee;
        }
        .fileBannerContent {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #1f8844;
        }
        .fileBannerHint {
          margin: 0;
          font-size: 12px;
          color: #4b5563;
          font-weight: 600;
        }

        /* ========== Mockup Strip ========== */
        .mockupStrip {
          display: grid;
          gap: 6px;
        }
        .mockupDevHint {
          font-size: 11px;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 600;
          text-align: right;
        }
        .mockupRow {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .mockupThumb {
          margin: 0;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid #e5e8ee;
          aspect-ratio: 4 / 3;
          transition: transform 0.2s ease;
        }
        .mockupThumb:hover {
          transform: scale(1.02);
        }
        .mockupThumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* ========== Right Panel ========== */
        .buyPanel {
          border-radius: 16px;
          background: #fff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
          padding: 28px;
        }

        /* Price Section */
        .priceSection {
          padding-bottom: 20px;
          border-bottom: 1px solid #f0f0f0;
          margin-bottom: 20px;
        }
        .productTitle {
          margin: 0;
          font-family: 'Prata', Georgia, serif;
          font-size: 28px;
          color: #111827;
          line-height: 1.2;
        }
        .productSubtitle {
          margin: 4px 0 0;
          font-size: 15px;
          color: #6b7280;
        }
        .trustLine {
          margin: 8px 0 0;
          font-size: 14px;
          color: #1f8844;
          font-weight: 600;
        }
        .downloadCallout {
          margin-top: 14px;
          border: 1px solid #c9d8ff;
          border-radius: 14px;
          background: linear-gradient(155deg, #edf3ff 0%, #e4edff 100%);
          padding: 14px;
          display: grid;
          gap: 12px;
          box-shadow: 0 8px 18px rgba(52, 87, 175, 0.14);
        }
        .downloadCalloutCopy {
          display: grid;
          gap: 4px;
        }
        .downloadCalloutCopy strong {
          font-size: 16px;
          color: #142e6c;
          line-height: 1.2;
        }
        .downloadCalloutCopy span {
          font-size: 13px;
          color: #334155;
          line-height: 1.35;
        }
        .downloadPrimaryBtn {
          height: 50px;
          border: 0;
          border-radius: 11px;
          background: linear-gradient(135deg, #1f3f95 0%, #182d67 100%);
          color: #fff;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 0.01em;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
        }
        .downloadPrimaryBtn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(30, 53, 119, 0.32);
        }
        .downloadPrimaryBtn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .downloadInlineError {
          margin: 8px 0 0;
          color: #b91c1c;
          font-size: 12px;
          font-weight: 600;
        }

        /* Form */
        .form {
          display: grid;
          gap: 24px;
        }

        /* Config Section */
        .configSection {
          display: grid;
          gap: 16px;
        }
        .sectionHeading {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: #111827;
          letter-spacing: 0.01em;
        }
        .configGrid {
          display: grid;
          gap: 14px;
        }

        /* Fields */
        .field {
          display: grid;
          gap: 5px;
        }
        .fieldLabel {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }
        .fieldInput {
          height: 48px;
          width: 100%;
          box-sizing: border-box;
          border-radius: 10px;
          border: 1px solid #d1d5db;
          background: #f9fafb;
          color: #111827;
          font-size: 15px;
          padding: 0 12px;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .fieldInput:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        .fieldSmall {
          max-width: 120px;
        }
        .fieldHint {
          font-size: 12px;
          color: #9ca3af;
          font-weight: 500;
        }

        /* Upload Details */
        .uploadDetails {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          overflow: hidden;
        }
        .uploadSummary {
          padding: 12px 14px;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          cursor: pointer;
          background: #f9fafb;
          list-style: none;
        }
        .uploadSummary::-webkit-details-marker {
          display: none;
        }
        .uploadBody {
          padding: 12px 14px;
          border-top: 1px solid #e5e7eb;
        }
        .uploadInput {
          font-size: 14px;
          color: #374151;
        }

        /* Shipping Card */
        .shippingCard {
          display: grid;
          gap: 14px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 14px;
          background: #fff;
          padding: 20px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
        }
        .addressGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .fieldFull {
          grid-column: 1 / -1;
        }

        /* Order Summary */
        .orderSummary {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #f9fafb;
          padding: 16px;
          display: grid;
          gap: 6px;
        }
        .summaryRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          color: #374151;
        }
        .summaryRow strong {
          color: #111827;
        }
        .summaryTotal {
          font-size: 17px;
          font-weight: 700;
          color: #111827;
          padding-top: 8px;
          margin-top: 4px;
          border-top: 1px solid #e5e7eb;
        }
        .summaryTotal strong {
          font-size: 17px;
        }
        .summaryNote {
          margin: 4px 0 0;
          font-size: 12px;
          color: #9ca3af;
        }

        /* Errors */
        .formError {
          margin: 0;
          padding: 10px 14px;
          border-radius: 8px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          font-size: 14px;
          font-weight: 600;
        }

        /* Submit Button */
        .submitBtn {
          width: 100%;
          height: 56px;
          border-radius: 999px;
          border: 0;
          background: #1f2535;
          color: #fff;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .submitBtn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        }
        .submitBtn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .submitNote {
          margin: 0;
          text-align: center;
          font-size: 12px;
          color: #9ca3af;
        }

        /* ========== Mobile Sticky CTA ========== */
        .mobileCta {
          display: none;
        }

        /* ========== Responsive ========== */
        @media (max-width: 1160px) {
          .shell {
            grid-template-columns: 1fr;
          }
          .leftRail {
            position: static;
          }
          .artFrame {
            min-height: 400px;
          }
          .mobileCta {
            display: block;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 100;
            background: #fff;
            border-top: 1px solid #e5e7eb;
            box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
            padding: 12px 20px;
          }
          .mobileCtaInner {
            max-width: 600px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
          }
          .mobileCtaPrice {
            font-size: 22px;
            font-weight: 800;
            color: #111827;
          }
          .mobileCtaBtn {
            height: 46px;
            padding: 0 28px;
            border-radius: 999px;
            border: 0;
            background: #1f2535;
            color: #fff;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            white-space: nowrap;
          }
          .mobileCtaBtn:disabled {
            opacity: 0.45;
            cursor: not-allowed;
          }
          .page {
            padding-bottom: 90px;
          }
        }

        @media (max-width: 640px) {
          .page {
            padding: 90px 12px 90px;
          }
          .topbar {
            height: 64px;
            padding: 0 12px;
          }
          .brandMain {
            font-size: 14px;
            letter-spacing: 0.08em;
          }
          .brandSub {
            letter-spacing: 0.2em;
          }
          .cornerLinks {
            gap: 10px;
          }
          .cornerLinks a {
            font-size: 12px;
          }
          .brandMark {
            width: 34px;
            height: 34px;
          }
          .buyPanel {
            padding: 20px;
          }
          .artFrame {
            min-height: 300px;
            padding: 16px;
          }
          .productTitle {
            font-size: 24px;
          }
          .priceDisplay {
            font-size: 32px;
          }
          .addressGrid {
            grid-template-columns: 1fr;
          }
          .addressGrid .fieldFull {
            grid-column: auto;
          }
          .mockupRow {
            grid-template-columns: repeat(3, 1fr);
          }
          .fileBanner {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}

export default function PrintOrderPage() {
  return (
    <Suspense
      fallback={
        <PrintOrderStateScreen
          title="Opening your print checkout"
          message="We are preparing the page and syncing your order details."
          debugLabel="route-shell"
        />
      }
    >
      <PrintOrderPageBody />
    </Suspense>
  );
}
