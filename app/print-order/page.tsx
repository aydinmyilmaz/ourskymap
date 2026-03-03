'use client';

import { Suspense, type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import JSZip from 'jszip';
import { calculatePrintTotals, formatMoney } from '../../lib/print-pricing';
import type { PricingPayload, PrintCurrency, PrintOptionKey, PrintSizeKey } from '../../lib/print-types';
import { buildDevZipBlob, loadDevDownloadDraft, triggerBlobDownload } from '../../lib/dev-download';
import { buildOrderFileToken, mapDesignSizeToPrintSize } from '../../lib/print-size-utils';

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

function PrintOrderPageBody() {
  const router = useRouter();
  const search = useSearchParams();
  const orderCode = (search.get('orderCode') || '').trim();
  const isDevMode = search.get('dev') === '1';

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

  const [shippingExpanded, setShippingExpanded] = useState(true);
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

    if (isDevMode) {
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
  }, [isDevMode, orderCode]);

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

  const shippingSummary = useMemo(() => {
    const parts = [shippingName, city, countryCode].map((item) => item.trim()).filter(Boolean);
    if (parts.length === 0) return 'Add shipping and contact details';
    return parts.join(' • ');
  }, [city, countryCode, shippingName]);

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
      if (isDevMode) {
        const draft = loadDevDownloadDraft();
        if (!draft || draft.orderCode !== order.orderCode) {
          throw new Error('Missing dev download context. Return to checkout and retry.');
        }
        const zipBlob = await buildDevZipBlob(draft.previewSvg, draft.orderCode, draft.sourcePrintSize || null);
        const token = buildOrderFileToken(draft.orderCode, draft.sourcePrintSize || null);
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
      setShippingExpanded(true);
      setError('Please complete shipping details for physical print options.');
      return;
    }

    if (isDevMode) {
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
    return <div className="state">Loading print checkout...</div>;
  }

  if (error && !order) {
    return (
      <div className="state">
        <p>{error}</p>
        <a href="/checkout">Back to checkout</a>
      </div>
    );
  }

  return (
    <div className="page">
      <main className="shell">
        <section className="leftRail">
          <div className="artPanel">
            <div className="artTopRow">
              <p className="eyebrow">Customer Digital Product</p>
              <p className="orderPill">Order #{order?.orderCode}</p>
            </div>
            <div className="artFrameWrap">
              <div className="artFrameGlow" />
              <div className="artFrame">
                {previewImageDataUrl ? (
                  <img src={previewImageDataUrl} alt="Customer digital artwork" />
                ) : previewSvgMarkup ? (
                  <div className="inlineSvgMount" dangerouslySetInnerHTML={{ __html: previewSvgMarkup }} />
                ) : (
                  <div className="placeholder">Could not auto-load preview from ZIP. Upload your artwork below.</div>
                )}
              </div>
            </div>
            <p className="artMeta">Master digital file shown above. Physical print options below.</p>
          </div>

          <div className="mockupPanel">
            <div className="mockupHead">
              <h3>Mockup Previews</h3>
              <span>Replace files in /public/mockups/print-order</span>
            </div>
            <div className="mockupGrid">
              {MOCKUP_SCENES.map((scene) => (
                <figure key={scene.title} className="mockupCard">
                  <img src={scene.src} alt={scene.title} className="mockupBg" />
                  <figcaption>{scene.title}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="buyPanel">
          <div className="priceHeader">
            <h1>Now from €33,61 <span>from €63,68</span></h1>
            <div className="chipRow">
              <p className="badge">New markdown!</p>
              <p className="sale">45% off • Sale ends soon</p>
            </div>
            <p className="vat">VAT included (where applicable)</p>
            <p className="title">Custom Star Map Print, Personalized Wall Art Keepsake</p>
            <p className="vendor">OurSkyMap ★★★★★</p>
            <p className="hint">Exchanges accepted</p>
          </div>

          <div className="downloadBox">
            <div>
              <p className="downloadBoxTitle">Digital File Ready</p>
              <p className="downloadBoxSub">Re-download your ZIP anytime while choosing your physical print options.</p>
            </div>
            <button type="button" className="downloadAgainBtn" onClick={() => void handleDownloadZipAgain()} disabled={downloadingZip}>
              {downloadingZip ? 'Preparing ZIP...' : 'Download ZIP Again'}
            </button>
            {downloadError ? <p className="downloadBoxError">{downloadError}</p> : null}
          </div>

          <form className="form" onSubmit={handleSubmit}>
            <div className="selectorGrid">
              <label>
                <span>{isOrderSizeLocked ? 'Size (from your digital order)' : 'Size'}</span>
                {isOrderSizeLocked ? (
                  <>
                    <input value={selectedSizeLabel || String(selectedSize)} readOnly />
                    <small className="fieldHint">To choose another size, upload a replacement artwork first.</small>
                  </>
                ) : (
                  <select value={selectedSize} onChange={(e) => setSelectedSize(e.target.value as PrintSizeKey)} required>
                    <option value="">Select an option</option>
                    {pricing?.sizes.map((size) => (
                      <option key={size.key} value={size.key}>
                        {size.label}
                      </option>
                    ))}
                  </select>
                )}
              </label>

              <label>
                <span>Print Options (Unframed, Framed or Canvas)</span>
                <select value={selectedOption} onChange={(e) => setSelectedOption(e.target.value as PrintOptionKey)} required>
                  <option value="">Select an option</option>
                  {pricing?.printOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Quantity</span>
                <select value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}>
                  {(pricing?.quantityOptions || [1]).map((qty) => (
                    <option key={qty} value={qty}>
                      {qty}
                    </option>
                  ))}
                </select>
              </label>

              <label className="uploadField">
                <span>Replace Artwork (optional)</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUploadChange} />
              </label>
            </div>

            <div className="accordionWrap">
              <button
                type="button"
                className="accordionHead"
                aria-expanded={shippingExpanded}
                onClick={() => setShippingExpanded((v) => !v)}
              >
                <div>
                  <strong>Shipping & Contact Details</strong>
                  <p>{shippingSummary}</p>
                </div>
                <span>{shippingExpanded ? '−' : '+'}</span>
              </button>

              {shippingExpanded ? (
                <div className="accordionBody">
                  <div className="addressGrid">
                    <label>
                      <span>Full Name</span>
                      <input value={shippingName} onChange={(e) => setShippingName(e.target.value)} required />
                    </label>
                    <label>
                      <span>Email</span>
                      <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
                    </label>
                    <label>
                      <span>Phone</span>
                      <input value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </label>
                    <label>
                      <span>Country</span>
                      <select
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
                    <label className="full">
                      <span>Address Line 1</span>
                      <input value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} required />
                    </label>
                    <label className="full">
                      <span>Address Line 2</span>
                      <input value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
                    </label>
                    <label>
                      <span>City</span>
                      <input value={city} onChange={(e) => setCity(e.target.value)} required />
                    </label>
                    <label>
                      <span>State/Region</span>
                      <input value={stateRegion} onChange={(e) => setStateRegion(e.target.value)} />
                    </label>
                    <label>
                      <span>Postal Code</span>
                      <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} required />
                    </label>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="summary">
              <p>Currency <strong>{currency}</strong></p>
              <p>Unit <strong>{totals ? formatMoney(totals.unit, currency) : '-'}</strong></p>
              <p>Subtotal <strong>{totals ? formatMoney(totals.subtotal, currency) : '-'}</strong></p>
              <p>Shipping <strong>{totals ? formatMoney(totals.shipping, currency) : '-'}</strong></p>
              <p className="total">Estimated Total <strong>{totals ? formatMoney(totals.total, currency) : '-'}</strong></p>
              <p className="estimate">Estimated total. Final exact pricing table will be applied later.</p>
            </div>

            {error ? <p className="error">{error}</p> : null}

            <button type="submit" disabled={saving || !selectedSize || !selectedOption}>
              {saving ? 'Saving...' : 'Complete Order (Mock Payment)'}
            </button>
            <p className="tiny">Payoneer integration is prepared but not active yet.</p>
          </form>
        </section>
      </main>

      <style jsx>{`
        .state {
          min-height: 100vh;
          display: grid;
          place-items: center;
          background: radial-gradient(900px 520px at 20% -10%, #f8efe0 0%, #e8ecf4 45%, #e2e6ef 100%);
          color: #23252c;
          text-align: center;
          padding: 24px;
        }
        .state a {
          color: #224c9e;
          text-decoration: none;
        }
        .page {
          min-height: 100vh;
          background:
            radial-gradient(1200px 700px at 4% 0%, rgba(246, 209, 166, 0.28) 0%, rgba(246, 209, 166, 0) 55%),
            radial-gradient(1100px 720px at 100% 8%, rgba(136, 171, 223, 0.28) 0%, rgba(136, 171, 223, 0) 58%),
            #e8ebf2;
          color: #20242f;
          padding: 22px;
          font-family: 'Signika', ui-sans-serif, system-ui;
        }
        .shell {
          max-width: 1360px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(360px, 1.22fr) minmax(390px, 0.94fr);
          gap: 24px;
          align-items: start;
        }
        .leftRail {
          position: sticky;
          top: 20px;
          display: grid;
          gap: 16px;
        }
        .artPanel,
        .mockupPanel,
        .buyPanel {
          border-radius: 20px;
          border: 1px solid rgba(67, 83, 117, 0.22);
          background: rgba(255, 255, 255, 0.82);
          box-shadow: 0 16px 40px rgba(25, 39, 67, 0.11);
          backdrop-filter: blur(6px);
        }
        .artPanel {
          padding: 16px;
        }
        .artTopRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .eyebrow {
          margin: 0;
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 700;
          color: #4d628f;
        }
        .orderPill {
          margin: 0;
          font-size: 12px;
          padding: 7px 10px;
          border-radius: 999px;
          background: #edf2ff;
          border: 1px solid #cfdaf7;
          color: #2e4069;
          font-weight: 700;
        }
        .artFrameWrap {
          margin-top: 10px;
          position: relative;
        }
        .artFrameGlow {
          position: absolute;
          inset: -14px;
          background: radial-gradient(circle at 50% 30%, rgba(251, 191, 95, 0.45), transparent 70%);
          filter: blur(20px);
          pointer-events: none;
        }
        .artFrame {
          position: relative;
          min-height: 540px;
          border-radius: 18px;
          background: linear-gradient(160deg, #14253f 0%, #1b2642 100%);
          padding: 16px;
          border: 1px solid rgba(238, 198, 120, 0.35);
          display: grid;
          place-items: center;
          overflow: hidden;
        }
        .artFrame img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center;
          border-radius: 10px;
          box-shadow: 0 20px 44px rgba(5, 9, 18, 0.45);
          background: #ffffff;
        }
        .artFrame :global(.inlineSvgMount) {
          width: 100%;
          height: 100%;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 20px 44px rgba(5, 9, 18, 0.45);
          background: #ffffff;
          display: grid;
          place-items: center;
        }
        .artFrame :global(.inlineSvgMount svg) {
          width: 100%;
          height: 100%;
          display: block;
        }
        .placeholder {
          max-width: 380px;
          text-align: center;
          color: #c9d5ef;
          font-size: 15px;
          line-height: 1.45;
        }
        .artMeta {
          margin: 12px 0 0;
          color: #4a5778;
          font-size: 14px;
        }
        .mockupPanel {
          padding: 14px;
        }
        .mockupHead {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
        }
        .mockupHead h3 {
          margin: 0;
          font-size: 20px;
          font-family: 'Prata', Georgia, serif;
          color: #202733;
        }
        .mockupHead span {
          font-size: 12px;
          color: #5c6782;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
        }
        .mockupGrid {
          margin-top: 10px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        .mockupCard {
          margin: 0;
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #ced7ea;
          background: #fff;
          min-height: 190px;
        }
        .mockupBg {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          filter: saturate(0.95) contrast(0.96);
        }
        .mockupCard figcaption {
          position: absolute;
          left: 8px;
          right: 8px;
          bottom: 6px;
          z-index: 2;
          font-size: 11px;
          color: #f5f8ff;
          font-weight: 700;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.66);
          letter-spacing: 0.04em;
        }
        .buyPanel {
          padding: 18px;
        }
        .priceHeader h1 {
          margin: 0;
          font-size: clamp(44px, 5vw, 68px);
          line-height: 0.96;
          letter-spacing: -0.03em;
          color: #1e2331;
        }
        .priceHeader h1 span {
          font-size: 0.48em;
          margin-left: 8px;
          text-decoration: line-through;
          color: #4c4f5b;
          font-weight: 500;
        }
        .chipRow {
          margin-top: 12px;
          display: grid;
          gap: 6px;
        }
        .badge {
          margin: 0;
          display: inline-flex;
          width: fit-content;
          padding: 7px 16px;
          border-radius: 999px;
          background: #97d98e;
          color: #14301d;
          font-size: 16px;
          font-weight: 700;
        }
        .sale {
          margin: 0;
          color: #1b7b46;
          font-size: 36px;
          font-weight: 700;
        }
        .vat {
          margin: 9px 0 0;
          color: #596178;
          font-size: 23px;
        }
        .title {
          margin: 13px 0 0;
          color: #252c3a;
          font-size: 22px;
          line-height: 1.34;
          font-weight: 600;
        }
        .vendor {
          margin: 8px 0 0;
          font-size: 28px;
          font-weight: 700;
          color: #1e2434;
        }
        .hint {
          margin: 4px 0 0;
          color: #485470;
          font-size: 16px;
          font-weight: 600;
        }
        .downloadBox {
          margin-top: 14px;
          border: 1px solid #c9d3e8;
          border-radius: 14px;
          background: linear-gradient(160deg, #f6f9ff 0%, #eef3fc 100%);
          padding: 12px;
          display: grid;
          gap: 10px;
        }
        .downloadBoxTitle {
          margin: 0;
          color: #1f2a40;
          font-size: 15px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .downloadBoxSub {
          margin: 4px 0 0;
          color: #4b5877;
          font-size: 14px;
          line-height: 1.35;
        }
        .downloadAgainBtn {
          min-height: 46px;
          border-radius: 11px;
          border: 1px solid #2e3b59;
          background: #20293d;
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
        }
        .downloadAgainBtn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .downloadBoxError {
          margin: 0;
          color: #a01010;
          font-size: 13px;
          font-weight: 700;
        }
        .form {
          margin-top: 14px;
          display: grid;
          gap: 13px;
        }
        .selectorGrid {
          display: grid;
          gap: 10px;
        }
        .form label {
          display: grid;
          gap: 6px;
        }
        .form span {
          font-size: 17px;
          color: #22293a;
          font-weight: 700;
        }
        .form small.fieldHint {
          color: #4f5d7e;
          font-size: 12px;
          font-weight: 600;
        }
        .form select,
        .form input {
          min-height: 50px;
          width: 100%;
          box-sizing: border-box;
          border-radius: 12px;
          border: 1px solid #b4bdd0;
          background: #f8f9fc;
          color: #1d2230;
          font-size: 16px;
          padding: 0 13px;
        }
        .uploadField input {
          padding: 10px 12px;
          min-height: 50px;
        }
        .accordionWrap {
          border: 1px solid #c9d2e6;
          border-radius: 14px;
          overflow: hidden;
          background: #f8fafd;
        }
        .accordionHead {
          width: 100%;
          border: 0;
          background: #eef3fb;
          color: #202633;
          min-height: 62px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          text-align: left;
          cursor: pointer;
        }
        .accordionHead strong {
          display: block;
          font-size: 16px;
          font-weight: 700;
        }
        .accordionHead p {
          margin: 3px 0 0;
          font-size: 13px;
          color: #586381;
        }
        .accordionHead span {
          font-size: 24px;
          font-weight: 700;
          color: #3a4868;
          line-height: 1;
        }
        .accordionBody {
          padding: 12px;
        }
        .addressGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .addressGrid .full {
          grid-column: 1 / -1;
        }
        .summary {
          border: 1px solid #bec9e0;
          border-radius: 14px;
          background: linear-gradient(160deg, #f4f7fd 0%, #edf1fa 100%);
          padding: 12px;
          display: grid;
          gap: 5px;
        }
        .summary p {
          margin: 0;
          font-size: 15px;
          color: #2d3650;
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }
        .summary strong {
          color: #151c2c;
        }
        .summary .total {
          font-size: 18px;
          font-weight: 700;
          color: #1e2638;
          margin-top: 2px;
        }
        .summary .estimate {
          font-size: 12px;
          color: #5b6787;
          margin-top: 3px;
        }
        .error {
          margin: 0;
          color: #b41919;
          font-size: 14px;
          font-weight: 700;
        }
        button[type='submit'] {
          min-height: 58px;
          border-radius: 999px;
          border: 2px solid #252b37;
          background: #1f2533;
          color: #ffffff;
          font-size: 24px;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.16s ease, box-shadow 0.16s ease;
        }
        button[type='submit']:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(18, 29, 54, 0.25);
        }
        button[type='submit']:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .tiny {
          margin: 0;
          font-size: 12px;
          color: #5f6985;
        }

        @media (max-width: 1160px) {
          .shell {
            grid-template-columns: 1fr;
          }
          .leftRail {
            position: static;
          }
          .mockupGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .priceHeader h1 {
            font-size: clamp(40px, 12vw, 66px);
          }
          .sale {
            font-size: clamp(24px, 5.8vw, 36px);
          }
          .vat {
            font-size: clamp(18px, 4.2vw, 24px);
          }
        }

        @media (max-width: 760px) {
          .page {
            padding: 12px;
          }
          .artFrame {
            min-height: 380px;
          }
          .mockupGrid {
            grid-template-columns: 1fr;
          }
          .addressGrid {
            grid-template-columns: 1fr;
          }
          .addressGrid .full {
            grid-column: auto;
          }
        }
      `}</style>
    </div>
  );
}

export default function PrintOrderPage() {
  return (
    <Suspense fallback={<div className="state">Loading print checkout...</div>}>
      <PrintOrderPageBody />
    </Suspense>
  );
}
