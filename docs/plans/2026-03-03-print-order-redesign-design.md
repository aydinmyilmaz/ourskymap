# Print Order Page Redesign — Design Document

**Date:** 2026-03-03
**Approach:** Two-Panel Sticky Sidebar (cleaned up)
**Branch:** New branch from current working state

## Goals

- Full UX redesign of `/app/print-order/page.tsx`
- Clean & trustworthy pricing (no fake urgency, sale badges, or crossed-out prices)
- Keep dev-mode elements visible for now
- Best-practice e-commerce print product page

## Layout: Two-Panel Sticky

### Left Panel (sticky, ~55% width)

**Product Preview:**
- Clean dark canvas (#0f1729) with subtle vignette
- Star map fills space with generous padding
- Small muted "Order #xxx" pill in top-right
- Caption below: "Your custom star map" in muted text

**Digital File Banner:**
- Small elegant banner between preview and mockups
- Light bg, subtle border
- "Your digital file is ready" + "Download ZIP" text link
- De-emphasizes download, keeps focus on print upsell

**Mockup Strip:**
- 3 thumbnails in horizontal row below the preview
- Rounded rectangles with hover scale (1.02x)
- No overlaid captions in production
- Dev-only: "Replace files in /public/mockups/print-order" hint

### Right Panel (scrollable, ~45% width)

**1. Price Section**
- Title: "Custom Star Map Print" (Prata serif, 28px)
- Subtitle: "Personalized Wall Art Keepsake"
- Price: large real calculated price based on options
- No crossed-out prices, no sale badges, no urgency
- "VAT included" muted small text
- Trust line: "Free exchanges"

**2. Print Configuration**
- Size: dropdown (locked when source size exists, hint text)
- Print Option: dropdown with price range (Unframed/Framed/Canvas)
- Quantity: dropdown, default 1
- Replace Artwork: collapsible (closed by default), file upload inside
- Fields: 16px gap, 14px semibold labels, 48px height inputs, 12px radius

**3. Shipping & Contact Details**
- Always expanded (no accordion — required fields should be visible)
- 2-column grid: Name+Email, Phone+Country, Address1 (full), Address2 (full), City+State, PostalCode
- Consistent field styling

**4. Order Summary**
- Bordered card, subtle background
- Unit, Subtotal, Shipping, **Total** (bold, larger)
- Currency inline
- "Estimated total" disclaimer

**5. Place Order Button**
- Full-width pill (999px radius), 56px height
- Dark bg (#1f2535), white text
- Hover: lift + shadow
- Dev mode text: "Complete Order (Mock Payment)"

### Mobile (< 1160px)

- Single column: left panel on top, right panel below
- Left panel non-sticky
- Sticky bottom bar: total price + "Complete Order" button
- Always accessible CTA during long scroll

### Color Palette (cleaned up)

- Page bg: light radial gradient (#e8ebf2 base)
- Card bg: rgba(255,255,255,0.82) with backdrop blur
- Dark canvas: #0f1729
- Text primary: #20242f
- Text muted: #4a5778
- Border: rgba(67,83,117,0.22)
- Input bg: #f8f9fc
- Input border: #b4bdd0
- CTA button: #1f2535
- Trust/success green: #1f8844

### Typography

- Headers: Prata (serif)
- Body/UI: Signika (sans)
- Labels: 14px semibold
- Body: 16px
- Price: 36-44px bold

### Removed Elements

- "Now from €33,61" hardcoded price header
- "from €63,68" crossed-out price
- "New markdown!" green badge
- "45% off • Sale ends soon" urgency text
- "OurSkyMap ★★★★★" vendor line
- Accordion toggle for shipping (always open now)
- artFrameGlow gold glow effect

### Preserved

- All functional logic (pricing API, size locking, upload, checkout flow)
- Dev mode path (isDevMode checks)
- All state management
- Responsive breakpoints (adjusted)
