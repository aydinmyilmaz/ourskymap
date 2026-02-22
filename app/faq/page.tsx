'use client';

import Link from 'next/link';

const FAQS = [
  {
    q: 'How accurate are the sky maps?',
    a: 'Sky maps are generated from date, time, and location parameters. Exact time improves the precision of the star field.'
  },
  {
    q: 'Can I design city posters for any location?',
    a: 'Yes. You can search global locations and customize map style, zoom composition, typography, and poster framing.'
  },
  {
    q: 'Which file formats do I receive?',
    a: 'Depending on the product and plan, exports include print-ready PNG, PDF, and SVG.'
  },
  {
    q: 'Can I edit my design after checkout?',
    a: 'You can return to your design flow, adjust settings, and generate a new export when needed.'
  },
  {
    q: 'Do you offer commercial/partner usage?',
    a: 'Yes. For store bundles, campaigns, or white-label usage, contact the sales team for the right plan.'
  },
  {
    q: 'How fast is support?',
    a: 'Most support requests are answered within 12-24 hours. Sales and partnership requests are prioritized on business days.'
  }
] as const;

export default function FaqPage() {
  return (
    <main className="faqPage">
      <div className="shell">
        <header className="hero">
          <p className="eyebrow">FAQ</p>
          <h1>Questions Before You Launch Your Design</h1>
          <p>Quick answers about quality, exports, licensing, and workflow so you can move faster with confidence.</p>
        </header>

        <section className="faqGrid" aria-label="Frequently asked questions">
          {FAQS.map((item) => (
            <article key={item.q} className="faqCard">
              <h2>{item.q}</h2>
              <p>{item.a}</p>
            </article>
          ))}
        </section>

        <section className="ctaBand" aria-label="Need help">
          <div>
            <p className="eyebrow">Need a custom answer?</p>
            <h2>Talk to our team directly.</h2>
            <p>We can help with product setup, commercial plans, and workflow recommendations.</p>
          </div>
          <div className="actions">
            <Link href="/contact" className="btn btnPrimary">
              Contact Team
            </Link>
            <Link href="/pricing" className="btn btnSecondary">
              View Pricing
            </Link>
          </div>
        </section>
      </div>

      <style jsx>{`
        .faqPage {
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
        .faqCard,
        .ctaBand {
          border-radius: 18px;
          border: 1px solid #c8d5e9;
          background: rgba(255, 255, 255, 0.94);
        }

        .hero {
          padding: 20px;
          display: grid;
          gap: 8px;
        }

        .eyebrow {
          margin: 0;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #4a6898;
        }

        h1,
        h2 {
          margin: 0;
          font-family: 'Prata', Georgia, serif;
          color: #102142;
          letter-spacing: -0.02em;
        }

        h1 {
          font-size: clamp(32px, 5vw, 54px);
          line-height: 1.02;
        }

        .hero p:last-child {
          margin: 2px 0 0;
          color: #4f6180;
          font-size: 17px;
          line-height: 1.45;
          max-width: 760px;
        }

        .faqGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .faqCard {
          padding: 14px;
          display: grid;
          gap: 7px;
        }

        .faqCard h2 {
          font-size: 28px;
          line-height: 1.05;
        }

        .faqCard p {
          margin: 0;
          color: #4b6187;
          font-size: 15px;
          line-height: 1.45;
        }

        .ctaBand {
          padding: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          background: linear-gradient(135deg, #132a4c 0%, #1b3f6d 100%);
          border-color: #24497a;
        }

        .ctaBand .eyebrow {
          color: #afcfee;
        }

        .ctaBand h2 {
          color: #f0f7ff;
          font-size: clamp(27px, 3vw, 39px);
        }

        .ctaBand p {
          margin: 8px 0 0;
          color: #c7dcf5;
          font-size: 15px;
          line-height: 1.45;
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .btn {
          min-height: 42px;
          border-radius: 10px;
          padding: 0 14px;
          text-decoration: none;
          border: 1px solid transparent;
          font-size: 14px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .btnPrimary {
          background: #f4f8ff;
          border-color: #f4f8ff;
          color: #153362;
        }

        .btnSecondary {
          background: transparent;
          border-color: #89abd4;
          color: #ecf5ff;
        }

        @media (max-width: 980px) {
          .faqGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .faqPage {
            padding: 12px 10px 24px;
          }

          .hero,
          .faqCard,
          .ctaBand {
            padding: 14px;
          }

          .hero p:last-child,
          .faqCard p {
            font-size: 14px;
          }
        }
      `}</style>
    </main>
  );
}
