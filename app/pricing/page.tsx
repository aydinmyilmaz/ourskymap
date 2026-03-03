'use client';

import Image from 'next/image';
import Link from 'next/link';

const TIERS = [
  {
    name: 'Digital Download',
    price: '€11.50+',
    summary: 'Instant file delivery from checkout.',
    features: ['ZIP with SVG + PNG + PDF', 'One-time download link', 'Print-ready output'],
    cta: 'Start Star Map',
    href: '/ourskymap'
  },
  {
    name: 'Physical Print (MVP)',
    price: 'Estimate after selection',
    summary: 'Choose size, print option, and shipping details after download.',
    features: ['Etsy-style option selectors', 'Mock payment success flow', 'Provider-ready architecture'],
    cta: 'Go to Star Map',
    href: '/ourskymap'
  },
  {
    name: 'Commercial / Bulk',
    price: 'Contact us',
    summary: 'For custom workflows and high-volume operations.',
    features: ['Dedicated support', 'Custom rollout', 'Future provider integrations'],
    cta: 'Contact Team',
    href: '/contact'
  }
] as const;

export default function PricingPage() {
  return (
    <main className="pricingPage">
      <div className="shell">
        <header className="hero">
          <div>
            <p className="eyebrow">Pricing</p>
            <h1>Star Map Pricing</h1>
            <p>Single-product setup: this deployment serves only OurSkyMap and its new physical print funnel.</p>
            <div className="heroActions">
              <Link href="/ourskymap" className="btn btnPrimary">
                Start Designing
              </Link>
              <Link href="/contact" className="btn btnSecondary">
                Contact Sales
              </Link>
            </div>
          </div>
          <div className="heroVisual" aria-hidden="true">
            <Image src="/home/product-starmap.jpg" alt="Star map showcase" fill sizes="(max-width: 920px) 100vw, 34vw" />
          </div>
        </header>

        <section className="tierGrid" aria-label="Pricing plans">
          {TIERS.map((tier) => (
            <article key={tier.name} className="tierCard">
              <p className="tierName">{tier.name}</p>
              <p className="tierPrice">{tier.price}</p>
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
        .tierCard {
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
        h1 {
          margin: 6px 0 0;
          font-family: 'Prata', Georgia, serif;
          color: #0f2040;
          letter-spacing: -0.02em;
          font-size: clamp(32px, 5vw, 56px);
          line-height: 1.02;
        }
        .hero p {
          margin: 10px 0 0;
          color: #4d607f;
          font-size: 17px;
          line-height: 1.45;
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
          color: #fff;
        }
        .btnSecondary {
          background: #fff;
          border-color: #cad8ea;
          color: #1a2f55;
        }
        .tierGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .tierCard {
          padding: 16px;
          display: grid;
          gap: 10px;
        }
        .tierName {
          margin: 0;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-weight: 700;
          color: #5271a0;
        }
        .tierPrice {
          margin: 0;
          font-size: 38px;
          font-weight: 700;
          color: #0f2040;
        }
        .tierSummary {
          margin: 0;
          color: #4c607f;
          font-size: 14px;
        }
        ul {
          margin: 0;
          padding-left: 18px;
          color: #2f3f5f;
          font-size: 14px;
          line-height: 1.5;
          display: grid;
          gap: 4px;
        }
        .btnTier {
          margin-top: 4px;
          width: fit-content;
          background: #173868;
          color: #fff;
          border-color: #173868;
        }
        @media (max-width: 940px) {
          .hero {
            grid-template-columns: 1fr;
          }
          .tierGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
