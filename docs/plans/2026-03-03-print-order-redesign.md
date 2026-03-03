# Print Order Page Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the print order page (`/app/print-order/page.tsx`) with a clean two-panel sticky layout, trustworthy pricing, and mobile sticky CTA bar.

**Architecture:** Single-file redesign of `app/print-order/page.tsx` using styled-jsx. All functional logic (state, API calls, form submission) is preserved exactly. Only the JSX structure and `<style jsx>` block are rewritten. No new dependencies.

**Tech Stack:** Next.js App Router, React, styled-jsx, existing `lib/print-pricing.ts` and `lib/print-types.ts`

---

### Task 0: Create feature branch

**Step 1: Create and switch to feature branch**

Run:
```bash
git checkout -b redesign/print-order-page
```

**Step 2: Verify branch**

Run: `git branch --show-current`
Expected: `redesign/print-order-page`

---

### Task 1: Rewrite the left panel JSX

**Files:**
- Modify: `app/print-order/page.tsx:391-429` (the `<section className="leftRail">` block)

**What to change:**

Replace the entire `<section className="leftRail">` with this structure:

```tsx
<section className="leftRail">
  {/* Product Preview */}
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

  {/* Digital File Banner */}
  <div className="fileBanner">
    <div className="fileBannerContent">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 1.67a8.33 8.33 0 100 16.66 8.33 8.33 0 000-16.66zm-.83 11.66V8.33h1.66v5h-1.66zm0-6.66V5h1.66v1.67H9.17z" fill="#1f8844"/></svg>
      <span>Your digital file is ready</span>
    </div>
    <button type="button" className="downloadLink" onClick={() => void handleDownloadZipAgain()} disabled={downloadingZip}>
      {downloadingZip ? 'Preparing...' : 'Download ZIP'}
    </button>
    {downloadError ? <p className="downloadLinkError">{downloadError}</p> : null}
  </div>

  {/* Mockup Strip */}
  <div className="mockupStrip">
    {isDevMode ? <span className="mockupDevHint">Replace files in /public/mockups/print-order</span> : null}
    <div className="mockupRow">
      {MOCKUP_SCENES.map((scene) => (
        <figure key={scene.title} className="mockupThumb">
          <img src={scene.src} alt={scene.title} />
        </figure>
      ))}
    </div>
  </div>
</section>
```

**Key changes:**
- Removed `artTopRow` with its eyebrow label — order pill now floats inside the art frame
- Removed `artFrameGlow` gold glow effect
- Removed `artMeta` replaced with simpler `artCaption`
- Digital file banner is now a compact row between preview and mockups
- Download is a text-style button, not a big dark button
- Mockup strip: removed figcaption overlays, dev hint only shows when `isDevMode`
- Removed `mockupHead` with its "Mockup Previews" heading (the images speak for themselves)

**Step 1: Make the JSX changes above**

**Step 2: Verify the page still compiles**

Run: `npx next build --no-lint 2>&1 | tail -5` (or use dev server)

**Step 3: Commit**

```bash
git add app/print-order/page.tsx
git commit -m "refactor: rewrite left panel JSX for print order redesign"
```

---

### Task 2: Rewrite the right panel JSX (price header + config)

**Files:**
- Modify: `app/print-order/page.tsx:431-503` (the `<section className="buyPanel">` opening through `.selectorGrid`)

**What to change:**

Replace the `buyPanel` opening content (from `<section className="buyPanel">` through the end of `.selectorGrid`) with:

```tsx
<section className="buyPanel">
  <div className="priceSection">
    <h1 className="productTitle">Custom Star Map Print</h1>
    <p className="productSubtitle">Personalized Wall Art Keepsake</p>
    <p className="priceDisplay">{totals ? formatMoney(totals.unit, currency) : '...'}</p>
    <p className="vatNote">VAT included (where applicable)</p>
    <p className="trustLine">Free exchanges accepted</p>
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
```

**Key changes:**
- Removed all hardcoded promo elements (€33,61, crossed-out price, sale badge, ★★★★★, vendor name)
- Price now shows the real calculated unit price from `totals`
- "Print Options (Unframed, Framed or Canvas)" → cleaner "Print Type" label
- Artwork upload uses native `<details>/<summary>` for collapse (zero JS needed)
- Added section heading "Print Options" for visual structure

**Step 1: Make the JSX changes**
**Step 2: Verify compilation**
**Step 3: Commit**

```bash
git add app/print-order/page.tsx
git commit -m "refactor: rewrite right panel price header and config section"
```

---

### Task 3: Rewrite the shipping form and order summary JSX

**Files:**
- Modify: `app/print-order/page.tsx:505-594` (accordion + summary + submit button)

**What to change:**

Replace everything from `<div className="accordionWrap">` through the closing `</form>` with:

```tsx
    <div className="shippingSection">
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
      <div className="summaryRow"><span>Unit price</span><strong>{totals ? formatMoney(totals.unit, currency) : '—'}</strong></div>
      <div className="summaryRow"><span>Subtotal</span><strong>{totals ? formatMoney(totals.subtotal, currency) : '—'}</strong></div>
      <div className="summaryRow"><span>Shipping</span><strong>{totals ? formatMoney(totals.shipping, currency) : '—'}</strong></div>
      <div className="summaryRow summaryTotal"><span>Estimated Total</span><strong>{totals ? formatMoney(totals.total, currency) : '—'}</strong></div>
      <p className="summaryNote">Estimated total. Final exact pricing will be applied at fulfillment.</p>
    </div>

    {error ? <p className="formError">{error}</p> : null}

    <button type="submit" className="submitBtn" disabled={saving || !selectedSize || !selectedOption}>
      {saving ? 'Processing...' : 'Complete Order (Mock Payment)'}
    </button>
    <p className="submitNote">Payoneer integration is prepared but not active yet.</p>
  </form>
</section>

{/* Mobile sticky CTA bar */}
<div className="mobileCta">
  <div className="mobileCtaInner">
    <span className="mobileCtaPrice">{totals ? formatMoney(totals.total, currency) : '—'}</span>
    <button
      type="button"
      className="mobileCtaBtn"
      disabled={saving || !selectedSize || !selectedOption}
      onClick={(e) => {
        const form = document.querySelector('.form') as HTMLFormElement | null;
        if (form) form.requestSubmit();
      }}
    >
      {saving ? 'Processing...' : 'Complete Order'}
    </button>
  </div>
</div>
```

**Key changes:**
- Removed accordion — shipping is always visible
- Consistent class naming (`field`, `fieldLabel`, `fieldInput`, `fieldFull`)
- Summary uses `summaryRow` divs instead of `<p>` tags for cleaner semantics
- Added mobile sticky CTA bar outside the `buyPanel` section
- Mobile CTA triggers form submit via `requestSubmit()`

**Step 1: Make the JSX changes**
**Step 2: Verify compilation**
**Step 3: Commit**

```bash
git add app/print-order/page.tsx
git commit -m "refactor: rewrite shipping form, summary, and add mobile sticky CTA"
```

---

### Task 4: Rewrite the complete `<style jsx>` block

**Files:**
- Modify: `app/print-order/page.tsx` — replace the entire `<style jsx>{\`...\`}</style>` block

**What to change:**

Replace the entire styled-jsx block (lines ~598-1076) with the new design system styles. The full CSS is below. This is the largest task.

```css
/* ---------- layout ---------- */
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
.state a { color: #3b5998; text-decoration: none; }

.page {
  min-height: 100vh;
  background: linear-gradient(170deg, #eef1f8 0%, #e4e8f0 100%);
  color: #20242f;
  padding: 28px;
  font-family: 'Signika', ui-sans-serif, system-ui;
}
.shell {
  max-width: 1320px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 28px;
  align-items: start;
}

/* ---------- left rail ---------- */
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
  border: 1px solid rgba(0,0,0,0.08);
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
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
  background: rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.6);
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
  color: rgba(255,255,255,0.4);
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

/* ---------- file banner ---------- */
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
.downloadLink {
  border: 0;
  background: none;
  color: #3b5998;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  padding: 0;
  white-space: nowrap;
}
.downloadLink:disabled { opacity: 0.5; cursor: not-allowed; }
.downloadLinkError { margin: 0; color: #b91c1c; font-size: 12px; }

/* ---------- mockup strip ---------- */
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
.mockupThumb:hover { transform: scale(1.02); }
.mockupThumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* ---------- right panel ---------- */
.buyPanel {
  border-radius: 16px;
  background: #fff;
  border: 1px solid rgba(0,0,0,0.08);
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  padding: 28px;
}

/* price section */
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
.priceDisplay {
  margin: 16px 0 0;
  font-size: 40px;
  font-weight: 800;
  color: #111827;
  letter-spacing: -0.02em;
  line-height: 1;
}
.vatNote {
  margin: 6px 0 0;
  font-size: 13px;
  color: #9ca3af;
}
.trustLine {
  margin: 8px 0 0;
  font-size: 14px;
  color: #1f8844;
  font-weight: 600;
}

/* form */
.form {
  display: grid;
  gap: 24px;
}

/* config section */
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

/* fields */
.field { display: grid; gap: 5px; }
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
  transition: border-color 0.15s ease;
}
.fieldInput:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}
.fieldSmall { max-width: 120px; }
.fieldHint {
  font-size: 12px;
  color: #9ca3af;
  font-weight: 500;
}

/* upload details */
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
.uploadSummary::-webkit-details-marker { display: none; }
.uploadSummary::before {
  content: '+';
  display: inline-block;
  margin-right: 8px;
  font-weight: 700;
  color: #9ca3af;
  transition: transform 0.15s ease;
}
.uploadDetails[open] .uploadSummary::before {
  content: '−';
}
.uploadBody {
  padding: 12px 14px;
  border-top: 1px solid #e5e7eb;
}
.uploadInput {
  font-size: 14px;
  color: #374151;
}

/* shipping section */
.shippingSection {
  display: grid;
  gap: 14px;
}
.addressGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.fieldFull { grid-column: 1 / -1; }

/* order summary */
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
.summaryRow strong { color: #111827; }
.summaryTotal {
  font-size: 17px;
  font-weight: 700;
  color: #111827;
  padding-top: 8px;
  margin-top: 4px;
  border-top: 1px solid #e5e7eb;
}
.summaryTotal strong { font-size: 17px; }
.summaryNote {
  margin: 4px 0 0;
  font-size: 12px;
  color: #9ca3af;
}

/* errors */
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

/* submit */
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
  box-shadow: 0 8px 20px rgba(0,0,0,0.15);
}
.submitBtn:disabled { opacity: 0.45; cursor: not-allowed; }
.submitNote {
  margin: 0;
  text-align: center;
  font-size: 12px;
  color: #9ca3af;
}

/* ---------- mobile sticky CTA ---------- */
.mobileCta {
  display: none;
}

/* ---------- responsive ---------- */
@media (max-width: 1160px) {
  .shell { grid-template-columns: 1fr; }
  .leftRail { position: static; }
  .artFrame { min-height: 400px; }
  .mobileCta {
    display: block;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: #fff;
    border-top: 1px solid #e5e7eb;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.08);
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
  .mobileCtaBtn:disabled { opacity: 0.45; cursor: not-allowed; }
  /* extra bottom padding so content isn't hidden behind sticky bar */
  .page { padding-bottom: 90px; }
}

@media (max-width: 640px) {
  .page { padding: 12px; }
  .buyPanel { padding: 20px; }
  .artFrame { min-height: 300px; padding: 16px; }
  .productTitle { font-size: 24px; }
  .priceDisplay { font-size: 32px; }
  .addressGrid { grid-template-columns: 1fr; }
  .addressGrid .fieldFull { grid-column: auto; }
  .mockupRow { grid-template-columns: repeat(3, 1fr); }
  .fileBanner { flex-direction: column; align-items: flex-start; }
}
```

**Step 1: Replace the full style block**
**Step 2: Verify the page renders in dev server**

Run: `npx next dev` and visit `http://localhost:3000/print-order?orderCode=TEST&dev=1`

**Step 3: Commit**

```bash
git add app/print-order/page.tsx
git commit -m "style: complete styled-jsx rewrite for print order redesign"
```

---

### Task 5: Remove unused state and clean up

**Files:**
- Modify: `app/print-order/page.tsx`

**What to change:**

1. Remove the `shippingExpanded` / `setShippingExpanded` state (no longer needed — no accordion)
2. Remove the `shippingSummary` useMemo (no accordion summary text)
3. Verify no dangling references to old class names (`eyebrow`, `artTopRow`, `artFrameGlow`, `artMeta`, `chipRow`, `badge`, `sale`, `vat`, `title`, `vendor`, `hint`, `downloadBox`, `downloadBoxTitle`, `downloadBoxSub`, `downloadAgainBtn`, `downloadBoxError`, `accordionWrap`, `accordionHead`, `accordionBody`, `selectorGrid`, `uploadField`, `summary`, `total`, `estimate`, `tiny`)
4. Search for any JSX referencing removed classes and confirm they're gone

**Step 1: Remove the state and useMemo**

Delete these lines:
```tsx
const [shippingExpanded, setShippingExpanded] = useState(true);
```

Delete this useMemo:
```tsx
const shippingSummary = useMemo(() => {
  const parts = [shippingName, city, countryCode].map((item) => item.trim()).filter(Boolean);
  if (parts.length === 0) return 'Add shipping and contact details';
  return parts.join(' • ');
}, [city, countryCode, shippingName]);
```

**Step 2: Verify compilation**

Run: `npx next build --no-lint 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add app/print-order/page.tsx
git commit -m "cleanup: remove accordion state and unused references"
```

---

### Task 6: Visual QA and final polish

**Files:**
- Modify: `app/print-order/page.tsx` (minor tweaks only)

**Step 1: Start dev server and test**

Run: `npx next dev`

Test these scenarios:
1. Desktop: `http://localhost:3000/print-order?orderCode=TEST&dev=1` — verify two-panel layout, sticky left rail, all form fields visible
2. Resize to < 1160px — verify single column, sticky bottom CTA bar appears
3. Resize to < 640px — verify compact mobile layout
4. Change country dropdown — verify currency switches
5. Change print option / size — verify price updates in real time
6. Fill form and click Complete Order — verify navigation works

**Step 2: Fix any visual issues found**

**Step 3: Final commit**

```bash
git add app/print-order/page.tsx
git commit -m "polish: final visual adjustments for print order redesign"
```

---

## Execution Notes

- All changes are in a single file: `app/print-order/page.tsx`
- No new dependencies needed
- No API changes needed
- All functional logic (state, handlers, effects) is preserved unchanged
- The branch `redesign/print-order-page` can be merged when satisfied
