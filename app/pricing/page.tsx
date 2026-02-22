'use client';

import Image from 'next/image';
import Link from 'next/link';

const TIERS = [
  {
    name: 'Starter',
    price: '$19',
    cadence: '50 designs per day',
    featured: false,
    summary: 'For one-off personal posters and quick gift production.',
    features: ['1 product export', 'PNG + PDF', 'Standard licensing', '48-hour draft support'],
    cta: 'Choose Starter',
    href: '/ourskymap'
  },
  {
    name: 'Professional',
    price: '$39',
    cadence: '200 designs per day',
    summary: 'Best for premium artwork and advanced export control.',
    features: ['All export formats', 'Priority render queue', 'Advanced style controls', 'Commercial-ready outputs'],
    cta: 'Choose Professional',
    href: '/citymap',
    featured: true
  },
  {
    name: 'Studio Bundle',
    price: '$89',
    cadence: '500 designs per day',
    featured: false,
    summary: 'For agencies and stores that need multi-product delivery.',
    features: ['Multi-product package', 'Reusable templates', 'Partner onboarding', 'Priority technical support'],
    cta: 'Talk to Sales',
    href: '/contact'
  },
  {
    name: 'Commercial',
    price: 'Custom',
    cadence: '1000+ designs per day',
    featured: false,
    summary: 'For marketplace operators and high-volume commercial teams.',
    features: ['Dedicated commercial license', 'Enterprise render capacity', 'Priority SLA support', 'Account manager'],
    cta: 'Contact Commercial',
    href: '/contact'
  }
] as const;

const COMPARISON = [
  { feature: 'Daily design limit', starter: '50/day', pro: '200/day', bundle: '500/day', commercial: '1000+/day' },
  { feature: 'Products', starter: 'Single', pro: 'Single', bundle: 'Multi-product', commercial: 'Multi-product' },
  {
    feature: 'Export formats',
    starter: 'PNG/PDF',
    pro: 'SVG/PNG/PDF',
    bundle: 'SVG/PNG/PDF',
    commercial: 'SVG/PNG/PDF'
  },
  {
    feature: 'Customization depth',
    starter: 'Core controls',
    pro: 'Advanced controls',
    bundle: 'Advanced + templates',
    commercial: 'Advanced + enterprise templates'
  },
  { feature: 'Use case', starter: 'Personal', pro: 'Professional', bundle: 'Agency', commercial: 'Commercial / Marketplace' }
] as const;

export default function PricingPage() {
  return (
    <main className="pricingPage">
      <div className="shell">
        <header className="hero">
          <div>
            <p className="eyebrow">Pricing</p>
            <h1>Flexible Pricing for Every Poster Workflow</h1>
            <p>
              Start with a single design or scale with a multi-product bundle. Every plan is optimized for print-ready quality and
              fast turnaround.
            </p>
            <div className="heroActions">
              <Link href="/ourskymap" className="btn btnPrimary">
                Start with Sky Map
              </Link>
              <Link href="/contact" className="btn btnSecondary">
                Contact Sales
              </Link>
            </div>
          </div>
          <div className="heroVisual" aria-hidden="true">
            <Image src="/home/product-vinyl.jpg" alt="Pricing showcase" fill sizes="(max-width: 920px) 100vw, 34vw" />
          </div>
        </header>

        <section className="tierGrid" aria-label="Pricing plans">
          {TIERS.map((tier) => (
            <article key={tier.name} className={tier.featured ? 'tierCard tierCardFeatured' : 'tierCard'}>
              <p className="tierName">{tier.name}</p>
              <p className="tierPrice">{tier.price}</p>
              <p className="tierCadence">{tier.cadence}</p>
              <p className="tierSummary">{tier.summary}</p>
              <ul>
                {tier.features.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link href={tier.href} className="btn btnTier">
                {tier.cta}
              </Link>
            </article>
          ))}
        </section>

        <section className="compare" aria-label="Plan comparison">
          <h2>Plan Comparison</h2>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Starter</th>
                  <th>Professional</th>
                  <th>Studio Bundle</th>
                  <th>Commercial</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.feature}>
                    <td>{row.feature}</td>
                    <td>{row.starter}</td>
                    <td>{row.pro}</td>
                    <td>{row.bundle}</td>
                    <td>{row.commercial}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="ctaBand" aria-label="Pricing help">
          <div>
            <p className="eyebrow">Need help choosing?</p>
            <h2>We can match a plan to your use case.</h2>
            <p>Tell us your workflow and we'll recommend the best setup for speed, quality, and margin.</p>
          </div>
          <div className="heroActions">
            <Link href="/contact" className="btn btnPrimary">
              Contact Team
            </Link>
            <Link href="/faq" className="btn btnSecondary">
              Read FAQ
            </Link>
          </div>
        </section>
      </div>

      <style jsx>{`
        .pricingPage {
          min-height: 100vh;
          background: linear-gradient(165deg, #edf3fa 0%, #e8f0fb 100%);
          padding: 22px 14px 40px;
          font-family: 'Signika', ui-sans-serif, system-ui;
          color: #0f1f3d;
        }

        .shell {
          width: min(1120px, 100%);
          margin: 0 auto;
          display: grid;
          gap: 14px;
        }

        .hero,
        .tierCard,
        .compare,
        .ctaBand {
          border-radius: 18px;
          border: 1px solid #c7d4e8;
          background: rgba(255, 255, 255, 0.94);
        }

        .hero {
          padding: 20px;
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(260px, 0.9fr);
          gap: 14px;
          align-items: center;
        }

        .eyebrow {
          margin: 0;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #4a6797;
        }

        h1,
        h2 {
          margin: 6px 0 0;
          font-family: 'Prata', Georgia, serif;
          color: #0f2040;
          letter-spacing: -0.02em;
        }

        h1 {
          font-size: clamp(32px, 5vw, 56px);
          line-height: 1.02;
        }

        h2 {
          font-size: clamp(27px, 3vw, 38px);
        }

        .hero p {
          margin: 10px 0 0;
          color: #4d607f;
          font-size: 17px;
          line-height: 1.45;
          max-width: 700px;
        }

        .heroVisual {
          position: relative;
          min-height: 300px;
          border-radius: 12px;
          border: 1px solid #d4dfef;
          overflow: hidden;
        }

        .heroVisual :global(img) {
          object-fit: cover;
        }

        .heroActions {
          margin-top: 14px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .btn {
          min-height: 42px;
          border-radius: 10px;
          padding: 0 14px;
          border: 1px solid transparent;
          text-decoration: none;
          font-size: 14px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .btnPrimary {
          background: linear-gradient(120deg, #163667 0%, #22518e 100%);
          border-color: #1c4174;
          color: #f7fbff;
        }

        .btnSecondary {
          background: #ffffff;
          color: #1b3d70;
          border-color: #bfd0e8;
        }

        .tierGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 10px;
        }

        .tierCard {
          padding: 16px;
          display: grid;
          gap: 7px;
        }

        .tierCardFeatured {
          border-color: #8bb0dd;
          box-shadow: 0 16px 30px rgba(16, 43, 81, 0.15);
        }

        .tierName {
          margin: 0;
          color: #1e467d;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
        }

        .tierPrice {
          margin: 0;
          font-size: 46px;
          line-height: 1;
          font-family: 'Prata', Georgia, serif;
          letter-spacing: -0.03em;
          color: #102243;
        }

        .tierCadence {
          margin: -2px 0 4px;
          color: #59719a;
          font-size: 13px;
          font-weight: 600;
        }

        .tierSummary {
          margin: 0;
          color: #4a5d7f;
          font-size: 14px;
          line-height: 1.45;
        }

        .tierCard ul {
          margin: 0;
          padding-left: 20px;
          display: grid;
          gap: 6px;
          color: #415980;
          font-size: 14px;
        }

        .btnTier {
          width: fit-content;
          margin-top: 2px;
          background: #122f59;
          border-color: #122f59;
          color: #f4f8ff;
        }

        .compare {
          padding: 16px;
        }

        .tableWrap {
          margin-top: 10px;
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 640px;
        }

        th,
        td {
          border: 1px solid #d3deee;
          padding: 10px;
          text-align: left;
          font-size: 14px;
        }

        th {
          background: #eef5ff;
          color: #1f3f70;
          font-weight: 700;
        }

        td {
          color: #425c84;
          background: #ffffff;
        }

        .ctaBand {
          padding: 18px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, #132a4c 0%, #1b3f6d 100%);
          border-color: #24497a;
        }

        .ctaBand .eyebrow {
          color: #aecded;
        }

        .ctaBand h2 {
          color: #f0f7ff;
          margin: 6px 0 0;
        }

        .ctaBand p {
          margin: 8px 0 0;
          color: #c7dcf5;
          font-size: 15px;
          line-height: 1.45;
        }

        .ctaBand .btnSecondary {
          background: transparent;
          border-color: #89abd4;
          color: #ecf5ff;
        }

        @media (max-width: 980px) {
          .hero {
            grid-template-columns: 1fr;
          }

          .tierGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .pricingPage {
            padding: 12px 10px 24px;
          }

          .hero,
          .compare,
          .ctaBand,
          .tierCard {
            padding: 14px;
          }

          .hero p {
            font-size: 15px;
          }
        }
      `}</style>
    </main>
  );
}
