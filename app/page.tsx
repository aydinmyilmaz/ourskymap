'use client';

import Image from 'next/image';
import Link from 'next/link';

const NAV_LINKS = [
  { href: '/ourskymap', label: 'OurSkyMap' },
  { href: '/citymap', label: 'CityMap' },
  { href: '/soundwave', label: 'Soundwave' },
  { href: '/vinyl', label: 'Vinyl' },
  { href: '/image', label: 'T-Shirt Design' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' }
] as const;

const HERO_POINTS = [
  'Astronomically accurate sky rendering for meaningful dates',
  'Detailed city cartography with print-ready layout controls',
  'Unified checkout and instant export delivery (SVG, PNG, PDF)',
  'Image Studio for T-shirt and poster composition workflows'
] as const;

const STATS = [
  { value: '130K+', label: 'Designs generated' },
  { value: '190+', label: 'Countries served' },
  { value: '4.9/5', label: 'Average customer rating' },
  { value: '< 3 min', label: 'Typical design-to-download time' }
] as const;

const PRODUCTS = [
  {
    href: '/ourskymap',
    title: 'OurSkyMap',
    tag: 'Signature Product',
    description: 'Create memory-driven star maps with elegant typography, moon phases, and premium print proportions.',
    image: '/home/product-starmap.jpg',
    cta: 'Start Sky Map'
  },
  {
    href: '/citymap',
    title: 'CityMap',
    tag: 'Location Poster',
    description: 'Design clean, modern city posters with curated map themes, text styles, and frame-ready compositions.',
    image: '/home/product-citymap.jpg',
    cta: 'Start City Map'
  },
  {
    href: '/soundwave',
    title: 'Soundwave',
    tag: 'Audio Story',
    description: 'Turn songs, voice notes, and moments into custom waveform art with QR and picture integrations.',
    image: '/home/product-soundwave.jpg',
    cta: 'Create Soundwave'
  },
  {
    href: '/vinyl',
    title: 'Vinyl Studio',
    tag: 'Music Collectible',
    description: 'Design vinyl-inspired posters with curated gradients, labels, and premium visual treatments.',
    image: '/home/product-vinyl.jpg',
    cta: 'Open Vinyl Studio'
  },
  {
    href: '/image',
    title: 'Image Studio',
    tag: 'T-Shirt Design',
    description: 'Build custom T-shirt compositions with multi-layer photo editing, text effects, and print-area controls.',
    image: '/home/product-image-studio.jpg',
    cta: 'Open Image Studio'
  }
] as const;

const WORKFLOW = [
  {
    step: '01',
    title: 'Pick Your Product',
    body: 'Select sky map, city map, soundwave, vinyl, or image workflow based on your story and product target.'
  },
  {
    step: '02',
    title: 'Customize Live',
    body: 'Tune typography, color palette, composition, map style, and metadata with live visual feedback.'
  },
  {
    step: '03',
    title: 'Checkout & Export',
    body: 'Complete checkout once and instantly download production-ready files for digital or print use.'
  }
] as const;

const PRICING = [
  {
    name: 'Starter',
    price: '$19',
    note: '50 designs per day',
    highlighted: false,
    features: ['Single product export', 'PNG + PDF output', 'Standard print ratio support', 'Personal usage license'],
    href: '/pricing',
    cta: 'See Starter'
  },
  {
    name: 'Professional',
    price: '$39',
    note: '200 designs per day',
    highlighted: true,
    features: ['All export formats (SVG/PNG/PDF)', 'Advanced style controls', 'Priority render queue', 'Commercial-ready outputs'],
    href: '/pricing',
    cta: 'See Professional'
  },
  {
    name: 'Studio Bundle',
    price: '$89',
    note: '500 designs per day',
    highlighted: false,
    features: ['Multi-product access', 'Premium templates', 'Commercial usage option'],
    href: '/pricing',
    cta: 'See Bundle'
  },
  {
    name: 'Commercial',
    price: 'Custom',
    note: '1000+ designs per day',
    highlighted: false,
    features: ['Dedicated commercial license', 'Enterprise render capacity', 'Priority SLA support'],
    href: '/contact',
    cta: 'Contact Commercial'
  }
] as const;

const FAQ_PREVIEW = [
  {
    q: 'How accurate are sky and map renders?',
    a: 'Our engine computes location and time-based astronomical/map data and outputs poster-ready vectors.'
  },
  {
    q: 'Can I export files for print shops?',
    a: 'Yes. Exports are prepared for high-resolution print workflows in PNG, PDF, and SVG formats.'
  },
  {
    q: 'Can I continue editing after checkout?',
    a: 'Yes. Your design draft can be resumed and updated before creating a new export.'
  }
] as const;

const BLOG_PREVIEW = [
  {
    href: '/blog',
    title: 'How to Design Gift-Ready Star Map Posters',
    category: 'Guides',
    date: 'Jan 2026',
    image: '/home/product-vinyl.jpg'
  },
  {
    href: '/blog',
    title: 'City Poster Typography Systems That Actually Print Well',
    category: 'Design Ops',
    date: 'Dec 2025',
    image: '/home/product-citymap.jpg'
  },
  {
    href: '/blog',
    title: 'From Song to Wall Art: Building Better Soundwave Products',
    category: 'Product',
    date: 'Nov 2025',
    image: '/home/product-soundwave.jpg'
  }
] as const;

const FOOTER_COLUMNS = [
  {
    title: 'Products',
    links: [
      { href: '/ourskymap', label: 'OurSkyMap' },
      { href: '/citymap', label: 'CityMap' },
      { href: '/soundwave', label: 'Soundwave' },
      { href: '/vinyl', label: 'Vinyl Studio' },
      { href: '/image', label: 'Image Studio' }
    ]
  },
  {
    title: 'Resources',
    links: [
      { href: '/pricing', label: 'Pricing' },
      { href: '/faq', label: 'FAQ' },
      { href: '/blog', label: 'Blog' },
      { href: '/what-is-star-map', label: 'What is Sky Map?' }
    ]
  },
  {
    title: 'Company',
    links: [
      { href: '/contact', label: 'Contact' },
      { href: '/checkout', label: 'Checkout' },
      { href: '/download', label: 'Downloads' },
      { href: '/design', label: 'Legacy Design Redirect' }
    ]
  }
] as const;

export default function HomePage() {
  return (
    <main className="homeRoot">
      <div className="aura auraOne" aria-hidden="true" />
      <div className="aura auraTwo" aria-hidden="true" />

      <div className="shell">
        <section className="promoBar" aria-label="Service highlights">
          <p>Trusted by makers, gift shops, and design studios worldwide.</p>
          <p>Instant exports. Clear licensing. Print-first workflows.</p>
        </section>

        <header className="topNav">
          <nav className="navLinks" aria-label="Main navigation">
            {NAV_LINKS.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <section className="hero">
          <div className="heroCopy">
            <p className="eyebrow">Custom Digital Poster Platform</p>
            <h1>Build Meaningful Poster Products with Studio Precision</h1>
            <p className="lead">
              Create sky maps, city maps, soundwave art, and vinyl concepts in one unified platform. Designed for premium visual
              quality and production-ready delivery.
            </p>
            <ul className="heroPoints">
              {HERO_POINTS.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <div className="heroActions">
              <Link href="/ourskymap" className="btn btnPrimary">
                Design Sky Map
              </Link>
              <Link href="/citymap" className="btn btnSecondary">
                Design City Map
              </Link>
            </div>
          </div>

          <div className="heroVisual" aria-hidden="true">
            <article className="heroCard heroCardMain">
              <Image src="/home/product-starmap.jpg" alt="Star map poster mockup" fill sizes="(max-width: 960px) 100vw, 34vw" />
              <span>Sky</span>
            </article>
            <article className="heroCard heroCardOffset">
              <Image src="/home/product-citymap.jpg" alt="City map poster mockup" fill sizes="(max-width: 960px) 100vw, 26vw" />
              <span>City</span>
            </article>
            <article className="heroCard heroCardMini">
              <Image src="/home/product-soundwave.jpg" alt="Soundwave poster mockup" fill sizes="(max-width: 960px) 100vw, 20vw" />
              <span>Studio</span>
            </article>
          </div>
        </section>

        <section className="stats" aria-label="Platform metrics">
          {STATS.map((stat) => (
            <article key={stat.label} className="statCard">
              <p className="statValue">{stat.value}</p>
              <p className="statLabel">{stat.label}</p>
            </article>
          ))}
        </section>

        <section className="sectionBlock" aria-label="Product workflows">
          <div className="sectionHead">
            <p className="sectionTag">Products</p>
            <h2>Choose Your Workflow</h2>
          </div>

          <div className="productsGrid">
            {PRODUCTS.map((product) => (
              <article key={product.href} className="productCard">
                <div className="productImageWrap">
                  <Image src={product.image} alt={product.title} fill sizes="(max-width: 960px) 100vw, 24vw" />
                </div>
                <p className="cardTag">{product.tag}</p>
                <h3>{product.title}</h3>
                <p>{product.description}</p>
                <Link href={product.href} className="cardLink">
                  {product.cta}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="sectionBlock workflowBlock" aria-label="How it works">
          <div className="sectionHead">
            <p className="sectionTag">Workflow</p>
            <h2>Production-Ready From First Click</h2>
          </div>

          <div className="workflowGrid">
            <div className="workflowImageWrap">
              <Image src="/home/product-soundwave.jpg" alt="Soundwave design workflow mockup" fill sizes="(max-width: 960px) 100vw, 34vw" />
            </div>
            <div className="workflowSteps">
              {WORKFLOW.map((step) => (
                <article className="stepCard" key={step.step}>
                  <p className="stepNo">{step.step}</p>
                  <h4>{step.title}</h4>
                  <p>{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="sectionBlock pricingBlock" aria-label="Pricing overview">
          <div className="sectionHead">
            <p className="sectionTag">Pricing</p>
            <h2>Flexible Plans for Individuals and Teams</h2>
          </div>

          <div className="pricingGrid">
            {PRICING.map((plan) => (
              <article key={plan.name} className={plan.highlighted ? 'pricingCard pricingCardFeatured' : 'pricingCard'}>
                <p className="planName">{plan.name}</p>
                <p className="planPrice">{plan.price}</p>
                <p className="planNote">{plan.note}</p>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <Link href={plan.href} className="btn btnPricing">
                  {plan.cta}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section id="faq" className="sectionBlock faqBlock" aria-label="Frequently asked questions">
          <div className="sectionHeadRow">
            <div className="sectionHead">
              <p className="sectionTag">FAQ</p>
              <h2>Answers Before You Start</h2>
            </div>
            <Link href="/faq" className="ghostLink">
              View full FAQ
            </Link>
          </div>

          <div className="faqGrid">
            {FAQ_PREVIEW.map((item) => (
              <article key={item.q} className="faqCard">
                <h4>{item.q}</h4>
                <p>{item.a}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="blog" className="sectionBlock blogBlock" aria-label="Latest blog insights">
          <div className="sectionHeadRow">
            <div className="sectionHead">
              <p className="sectionTag">Blog</p>
              <h2>Design, Product, and Growth Insights</h2>
            </div>
            <Link href="/blog" className="ghostLink">
              Visit blog
            </Link>
          </div>

          <div className="blogGrid">
            {BLOG_PREVIEW.map((post) => (
              <article key={post.title} className="blogCard">
                <div className="blogImageWrap">
                  <Image src={post.image} alt={post.title} fill sizes="(max-width: 960px) 100vw, 22vw" />
                </div>
                <p className="meta">
                  {post.category} • {post.date}
                </p>
                <h4>{post.title}</h4>
                <Link href={post.href} className="cardLink">
                  Read article
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section id="contact" className="contactBand" aria-label="Contact call to action">
          <div className="contactMedia" aria-hidden="true">
            <Image src="/home/product-vinyl.jpg" alt="Vinyl poster mockup" fill sizes="(max-width: 960px) 100vw, 24vw" />
          </div>
          <div className="contactCopy">
            <p className="sectionTag">Contact</p>
            <h2>Need a custom workflow for your store or campaign?</h2>
            <p>
              Talk to us about white-label setups, partner pricing, and product bundles tailored for your audience and fulfillment
              model.
            </p>
            <div className="heroActions">
              <Link href="/contact" className="btn btnPrimary">
                Contact Sales
              </Link>
              <Link href="/pricing" className="btn btnSecondary">
                Explore Pricing
              </Link>
            </div>
          </div>
        </section>

        <footer className="footer">
          <div className="footerTop">
            <div className="footerBrand">
              <p className="footerLogo">SpaceMap Studio</p>
              <p>Digital-first poster platform for story-driven products and print-grade outputs.</p>
            </div>
            <div className="footerCols">
              {FOOTER_COLUMNS.map((column) => (
                <section key={column.title}>
                  <p className="footerColTitle">{column.title}</p>
                  <ul>
                    {column.links.map((item) => (
                      <li key={`${column.title}-${item.href}`}>
                        <Link href={item.href}>{item.label}</Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>

          <div className="footerBottom">
            <p>© {new Date().getFullYear()} SpaceMap Studio. All rights reserved.</p>
            <div>
              <Link href="/faq">Support</Link>
              <Link href="/contact">Contact</Link>
            </div>
          </div>
        </footer>
      </div>

      <style jsx>{`
        .homeRoot {
          --bg: #f0f4f8;
          --surface: #ffffff;
          --surface-soft: #f8fbff;
          --border: #c5d1e4;
          --text: #111d34;
          --text-muted: #4f5f7f;
          --ink: #172847;
          --accent: #0f4f8a;
          --accent-soft: #dbeeff;
          min-height: 100vh;
          padding: 20px;
          background:
            radial-gradient(circle at 84% 10%, rgba(129, 188, 234, 0.23) 0%, transparent 40%),
            radial-gradient(circle at 8% 7%, rgba(120, 150, 208, 0.26) 0%, transparent 33%),
            linear-gradient(165deg, #eaf1f9 0%, #eff5fc 45%, #e3ebf6 100%);
          color: var(--text);
          font-family: 'Signika', ui-sans-serif, system-ui;
          position: relative;
          overflow-x: clip;
        }

        .aura {
          position: absolute;
          border-radius: 999px;
          filter: blur(70px);
          pointer-events: none;
          z-index: 0;
        }

        .auraOne {
          width: 420px;
          height: 420px;
          left: -140px;
          top: -80px;
          background: rgba(127, 171, 236, 0.4);
        }

        .auraTwo {
          width: 360px;
          height: 360px;
          right: -120px;
          top: 280px;
          background: rgba(95, 180, 191, 0.28);
        }

        .shell {
          position: relative;
          z-index: 1;
          width: min(1260px, 100%);
          margin: 0 auto;
          display: grid;
          gap: 14px;
        }

        .promoBar {
          border: 1px solid #c9d4e7;
          border-radius: 14px;
          background: linear-gradient(100deg, #e9f4ff 0%, #edf8f7 100%);
          min-height: 44px;
          padding: 8px 14px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 8px 16px;
        }

        .promoBar p {
          margin: 0;
          color: #1f355b;
          font-size: 13px;
          font-weight: 600;
        }

        .topNav {
          min-height: 70px;
          border-radius: 16px;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.86);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px 16px;
        }

        .navLinks {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 6px;
        }

        .navLinks :global(a) {
          text-decoration: none;
          color: #2c4268;
          padding: 7px 10px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          border: 1px solid transparent;
        }

        .navLinks :global(a:hover) {
          background: #eff5ff;
          border-color: #d8e5fb;
        }

        .hero {
          border-radius: 22px;
          border: 1px solid var(--border);
          background: linear-gradient(145deg, #ffffff 0%, #f7fbff 100%);
          box-shadow: 0 22px 58px rgba(16, 29, 56, 0.11);
          padding: 24px;
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
          gap: 18px;
          align-items: stretch;
        }

        .heroCopy {
          display: grid;
          align-content: center;
          gap: 10px;
        }

        .eyebrow {
          margin: 0;
          font-size: 12px;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: #365d8e;
          font-weight: 700;
        }

        h1 {
          margin: 0;
          font-family: 'Prata', Georgia, serif;
          font-size: clamp(32px, 5vw, 62px);
          line-height: 1.02;
          letter-spacing: -0.02em;
          color: #102040;
        }

        .lead {
          margin: 0;
          font-size: 19px;
          line-height: 1.46;
          color: var(--text-muted);
          max-width: 820px;
        }

        .heroPoints {
          margin: 6px 0 0;
          padding-left: 20px;
          color: #2d456d;
          display: grid;
          gap: 6px;
          font-size: 15px;
          line-height: 1.45;
        }

        .heroActions {
          margin-top: 8px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .btn {
          min-height: 44px;
          border-radius: 11px;
          padding: 0 14px;
          border: 1px solid transparent;
          text-decoration: none;
          font-weight: 700;
          font-size: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .btnPrimary {
          background: linear-gradient(120deg, #152f59 0%, #1e4f87 100%);
          border-color: #193f6d;
          color: #f5f9ff;
        }

        .btnSecondary {
          background: #ffffff;
          border-color: #b8c8de;
          color: #1a345f;
        }

        .heroVisual {
          border-radius: 18px;
          border: 1px solid #cfdcf0;
          background: linear-gradient(140deg, #eaf2ff 0%, #f4f9ff 100%);
          min-height: 360px;
          position: relative;
          overflow: hidden;
        }

        .heroCard {
          position: absolute;
          overflow: hidden;
          border-radius: 13px;
          border: 1px solid #d7e2f2;
          box-shadow: 0 20px 32px rgba(17, 38, 69, 0.22);
          background: #d8e3f5;
        }

        .heroCard :global(img) {
          object-fit: cover;
        }

        .heroCard span {
          position: absolute;
          left: 10px;
          bottom: 10px;
          min-height: 24px;
          border-radius: 999px;
          padding: 0 10px;
          font-size: 11px;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          font-weight: 700;
          color: #14365f;
          background: rgba(243, 250, 255, 0.88);
          border: 1px solid rgba(191, 213, 238, 0.92);
          display: inline-flex;
          align-items: center;
        }

        .heroCardMain {
          width: 66%;
          height: 74%;
          left: 6%;
          top: 10%;
        }

        .heroCardOffset {
          width: 52%;
          height: 64%;
          right: 4%;
          top: 8%;
        }

        .heroCardMini {
          width: 42%;
          height: 44%;
          right: 14%;
          bottom: 6%;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .statCard {
          border-radius: 14px;
          border: 1px solid #cfdaeb;
          background: var(--surface-soft);
          padding: 14px;
        }

        .statValue {
          margin: 0;
          font-size: 27px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #13294b;
        }

        .statLabel {
          margin: 2px 0 0;
          color: #567097;
          font-size: 13px;
          font-weight: 600;
        }

        .sectionBlock,
        .contactBand,
        .footer {
          border-radius: 18px;
          border: 1px solid var(--border);
          background: rgba(254, 255, 255, 0.92);
          padding: 18px;
        }

        .sectionHead {
          display: grid;
          gap: 6px;
          margin-bottom: 12px;
        }

        .sectionHeadRow {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }

        .sectionTag {
          margin: 0;
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 700;
          color: #4a6694;
        }

        h2 {
          margin: 0;
          font-family: 'Prata', Georgia, serif;
          font-size: clamp(28px, 3.2vw, 42px);
          letter-spacing: -0.02em;
          color: #101f3f;
        }

        .ghostLink {
          min-height: 38px;
          text-decoration: none;
          border: 1px solid #c8d8ec;
          border-radius: 10px;
          padding: 0 12px;
          color: #204273;
          background: #f8fbff;
          font-size: 13px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
        }

        .productsGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 10px;
        }

        .productCard {
          border-radius: 14px;
          border: 1px solid #d5dfee;
          background: #ffffff;
          padding: 12px;
          display: grid;
          gap: 7px;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }

        .productCard:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 28px rgba(17, 34, 63, 0.12);
        }

        .productImageWrap {
          height: 138px;
          border-radius: 10px;
          border: 1px solid #d6e1f2;
          overflow: hidden;
          position: relative;
        }

        .productImageWrap :global(img) {
          object-fit: cover;
        }

        .cardTag {
          margin: 2px 0 0;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.09em;
          color: #5c7298;
          font-weight: 700;
        }

        h3 {
          margin: 0;
          font-size: 30px;
          line-height: 0.95;
          letter-spacing: -0.02em;
          color: #11203f;
        }

        .productCard p {
          margin: 0;
          color: #4f607e;
          line-height: 1.46;
          font-size: 14px;
        }

        .cardLink {
          text-decoration: none;
          color: #1f4c86;
          font-size: 14px;
          font-weight: 700;
        }

        .workflowGrid {
          display: grid;
          grid-template-columns: minmax(0, 0.78fr) minmax(0, 1.22fr);
          gap: 10px;
        }

        .workflowImageWrap {
          border-radius: 12px;
          border: 1px solid #d4dfef;
          overflow: hidden;
          min-height: 300px;
          position: relative;
        }

        .workflowImageWrap :global(img) {
          object-fit: cover;
        }

        .workflowSteps {
          display: grid;
          gap: 10px;
        }

        .stepCard {
          border: 1px solid #d2deee;
          border-radius: 12px;
          padding: 13px;
          background: #fbfdff;
          display: grid;
          gap: 4px;
        }

        .stepNo {
          margin: 0;
          font-size: 12px;
          font-weight: 700;
          color: #5574a1;
          letter-spacing: 0.12em;
        }

        h4 {
          margin: 0;
          font-size: 21px;
          color: #11264b;
          letter-spacing: -0.02em;
        }

        .stepCard p {
          margin: 0;
          color: #4f607e;
          font-size: 14px;
          line-height: 1.45;
        }

        .pricingBlock {
          background:
            linear-gradient(110deg, rgba(231, 243, 255, 0.6) 0%, rgba(230, 248, 244, 0.5) 100%),
            #ffffff;
        }

        .pricingGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 10px;
        }

        .pricingCard {
          border-radius: 13px;
          border: 1px solid #cad8ea;
          background: rgba(255, 255, 255, 0.95);
          padding: 14px;
          display: grid;
          gap: 8px;
        }

        .pricingCardFeatured {
          border-color: #8fb2df;
          box-shadow: 0 14px 30px rgba(24, 63, 114, 0.17);
        }

        .planName {
          margin: 0;
          color: #1f467a;
          font-size: 13px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 700;
        }

        .planPrice {
          margin: 0;
          font-size: 44px;
          line-height: 1;
          letter-spacing: -0.03em;
          color: #102243;
          font-family: 'Prata', Georgia, serif;
        }

        .planNote {
          margin: -2px 0 2px;
          color: #5a7095;
          font-size: 13px;
          font-weight: 600;
        }

        .pricingCard ul {
          margin: 0;
          padding-left: 20px;
          color: #435b83;
          display: grid;
          gap: 6px;
          font-size: 14px;
        }

        .btnPricing {
          background: #123463;
          color: #f5f9ff;
          border-color: #123463;
          width: fit-content;
          margin-top: 4px;
        }

        .faqGrid,
        .blogGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .faqCard,
        .blogCard {
          border-radius: 12px;
          border: 1px solid #d4deee;
          background: #ffffff;
          padding: 12px;
          display: grid;
          gap: 6px;
        }

        .faqCard h4,
        .blogCard h4 {
          margin: 0;
          font-size: 20px;
          line-height: 1.2;
          color: #12294f;
        }

        .faqCard p,
        .blogCard p {
          margin: 0;
          font-size: 14px;
          line-height: 1.45;
          color: #516585;
        }

        .blogImageWrap {
          height: 128px;
          border-radius: 10px;
          border: 1px solid #d7e2f2;
          position: relative;
          overflow: hidden;
        }

        .blogImageWrap :global(img) {
          object-fit: cover;
        }

        .meta {
          color: #5d749a;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
        }

        .contactBand {
          display: grid;
          grid-template-columns: minmax(260px, 0.82fr) minmax(0, 1.18fr);
          gap: 12px;
          background: linear-gradient(130deg, #13284c 0%, #1a3e69 55%, #1f5e88 100%);
          border-color: #204675;
        }

        .contactMedia {
          border-radius: 12px;
          border: 1px solid rgba(180, 206, 235, 0.5);
          position: relative;
          overflow: hidden;
          min-height: 260px;
        }

        .contactMedia :global(img) {
          object-fit: cover;
        }

        .contactCopy {
          display: grid;
          align-content: center;
          gap: 8px;
        }

        .contactCopy .sectionTag {
          color: #b8d6f6;
        }

        .contactCopy h2 {
          color: #f0f7ff;
          font-size: clamp(29px, 3vw, 40px);
        }

        .contactCopy p {
          margin: 0;
          color: #d8e9fc;
          font-size: 16px;
          line-height: 1.46;
          max-width: 670px;
        }

        .contactCopy .btnSecondary {
          background: transparent;
          border-color: #97bcdd;
          color: #edf6ff;
        }

        .footer {
          background: #111f3b;
          border-color: #1f355a;
          color: #deebff;
          padding: 16px;
        }

        .footerTop {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(162, 190, 226, 0.27);
        }

        .footerBrand {
          max-width: 360px;
          display: grid;
          gap: 6px;
        }

        .footerLogo {
          margin: 0;
          font-size: 22px;
          font-family: 'Prata', Georgia, serif;
          letter-spacing: -0.01em;
          color: #f3f8ff;
        }

        .footerBrand p {
          margin: 0;
          color: #bcd2f0;
          line-height: 1.46;
          font-size: 14px;
        }

        .footerCols {
          display: grid;
          grid-template-columns: repeat(3, minmax(130px, 1fr));
          gap: 12px;
        }

        .footerColTitle {
          margin: 0 0 6px;
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 700;
          color: #9fc0e6;
        }

        .footerCols ul {
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 5px;
        }

        .footerCols :global(a),
        .footerBottom :global(a) {
          text-decoration: none;
          color: #d9e8fc;
          font-size: 14px;
        }

        .footerBottom {
          margin-top: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .footerBottom p {
          margin: 0;
          color: #a9c2e3;
          font-size: 13px;
        }

        .footerBottom div {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        @media (max-width: 1180px) {
          .hero {
            grid-template-columns: 1fr;
          }

          .heroVisual {
            min-height: 300px;
          }

          .productsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .workflowGrid {
            grid-template-columns: 1fr;
          }

          .pricingGrid,
          .faqGrid,
          .blogGrid {
            grid-template-columns: 1fr;
          }

          .contactBand {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .homeRoot {
            padding: 12px;
          }

          .hero,
          .sectionBlock,
          .contactBand,
          .footer {
            padding: 14px;
          }

          .promoBar {
            padding: 8px 10px;
          }

          .promoBar p {
            font-size: 12px;
          }

          h1 {
            font-size: clamp(30px, 9vw, 46px);
          }

          .lead {
            font-size: 16px;
          }

          h3 {
            font-size: 28px;
          }

          .productImageWrap {
            height: 122px;
          }

          .blogImageWrap {
            height: 112px;
          }

          .footerCols {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 520px) {
          .productsGrid,
          .stats,
          .footerCols {
            grid-template-columns: 1fr;
          }

          .heroCardMain {
            width: 64%;
          }

          .heroCardOffset {
            width: 54%;
          }

          .heroCardMini {
            width: 44%;
          }

          .footerBottom {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}
