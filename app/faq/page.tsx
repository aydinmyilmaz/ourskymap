'use client';

import Link from 'next/link';

const FAQ_GROUPS = [
  {
    title: 'Sky Accuracy',
    items: [
      {
        q: 'Is the star map astronomically accurate?',
        a: 'Yes. The map is generated from location and time data to represent the selected sky moment.'
      },
      {
        q: 'Do I need the exact time?',
        a: 'Exact time is optional, but it improves precision for moon phase and star positioning.'
      }
    ]
  },
  {
    title: 'Customization',
    items: [
      {
        q: 'Can I edit title, names, and location text?',
        a: 'Yes. You can personalize all key text lines before checkout.'
      },
      {
        q: 'Can I change colors and visual style?',
        a: 'Yes. Background and visual settings can be adjusted to match your preferred look.'
      }
    ]
  },
  {
    title: 'Order & Delivery',
    items: [
      {
        q: 'What happens after checkout?',
        a: 'Your order is processed immediately and your download link becomes available from the order page.'
      },
      {
        q: 'Which file formats are provided?',
        a: 'You receive production-friendly files suitable for digital delivery and print workflows.'
      }
    ]
  },
  {
    title: 'Gift Use Cases',
    items: [
      {
        q: 'Can I make a star map for future dates?',
        a: 'Yes. Future events like weddings or anniversaries are supported.'
      },
      {
        q: 'Is this a good wedding or anniversary gift?',
        a: 'Yes. These are our most common gifting scenarios because they connect date and emotion strongly.'
      }
    ]
  }
] as const;

export default function FaqPage() {
  return (
    <main className="page">
      <div className="shell">
        <header className="hero">
          <div className="heroTop">
            <Link href="/" className="brand">
              OurSkyMap
            </Link>
            <nav>
              <Link href="/">Home</Link>
              <Link href="/what-is-star-map">What is Star Map?</Link>
              <Link href="/blog">Blog</Link>
            </nav>
          </div>

          <p className="eyebrow">FAQ</p>
          <h1>Questions before you create your star map.</h1>
          <p className="lead">Everything important about data accuracy, design controls, and download flow in one place.</p>
        </header>

        <section className="faqGrid">
          {FAQ_GROUPS.map((group) => (
            <article key={group.title} className="faqGroup">
              <h2>{group.title}</h2>
              <div className="qaList">
                {group.items.map((item) => (
                  <details key={item.q} open>
                    <summary>{item.q}</summary>
                    <p>{item.a}</p>
                  </details>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="ctaBand">
          <div>
            <p className="eyebrow">NEXT STEP</p>
            <h2>Start with your date and location, customize in real time.</h2>
            <p>Need help for a special order? Contact us and we can guide the setup.</p>
          </div>
          <div className="actions">
            <Link href="/ourskymap" className="btn btnPrimary">
              Create Star Map
            </Link>
            <Link href="/contact" className="btn btnGhost">
              Contact
            </Link>
          </div>
        </section>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 82% 0%, rgba(132, 166, 226, 0.2) 0%, transparent 36%),
            linear-gradient(168deg, #080d1c 0%, #0d1730 100%);
          padding: 16px;
          color: #edf4ff;
          font-family: 'Signika', ui-sans-serif, system-ui;
        }

        .shell {
          width: min(1120px, 100%);
          margin: 0 auto;
          display: grid;
          gap: 12px;
        }

        .hero,
        .faqGroup,
        .ctaBand {
          border: 1px solid rgba(161, 189, 230, 0.24);
          background: rgba(13, 23, 47, 0.82);
          border-radius: 16px;
          backdrop-filter: blur(5px);
        }

        .hero {
          padding: 18px;
          display: grid;
          gap: 8px;
        }

        .heroTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 4px;
        }

        .brand {
          text-decoration: none;
          color: #f0f6ff;
          font-size: 22px;
          font-family: 'Prata', Georgia, serif;
        }

        nav {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        nav :global(a) {
          text-decoration: none;
          color: #d5e4fe;
          border: 1px solid transparent;
          border-radius: 999px;
          min-height: 34px;
          padding: 0 12px;
          display: inline-flex;
          align-items: center;
          font-size: 13px;
        }

        nav :global(a:hover) {
          border-color: rgba(170, 195, 235, 0.4);
          background: rgba(100, 128, 174, 0.15);
        }

        .eyebrow {
          margin: 0;
          color: #9db9e8;
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 700;
        }

        h1,
        h2 {
          margin: 0;
          font-family: 'Prata', Georgia, serif;
          letter-spacing: -0.02em;
        }

        h1 {
          font-size: clamp(34px, 4.8vw, 58px);
          line-height: 1;
          max-width: 900px;
        }

        .lead {
          margin: 0;
          color: #b7c9e7;
          font-size: 16px;
          line-height: 1.45;
          max-width: 820px;
        }

        .faqGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .faqGroup {
          padding: 14px;
          display: grid;
          gap: 10px;
        }

        h2 {
          font-size: 33px;
          line-height: 1.05;
        }

        .qaList {
          display: grid;
          gap: 8px;
        }

        details {
          border: 1px solid rgba(164, 189, 227, 0.3);
          border-radius: 10px;
          background: rgba(17, 30, 59, 0.7);
          padding: 10px 12px;
        }

        summary {
          cursor: pointer;
          color: #e8f0ff;
          font-size: 16px;
          font-weight: 600;
          line-height: 1.35;
        }

        details p {
          margin: 7px 0 0;
          color: #b4c8ea;
          font-size: 14px;
          line-height: 1.45;
        }

        .ctaBand {
          padding: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          background:
            radial-gradient(circle at 20% 20%, rgba(132, 167, 222, 0.2) 0%, transparent 42%),
            linear-gradient(130deg, #102144 0%, #1c335f 100%);
        }

        .ctaBand h2 {
          font-size: clamp(30px, 3vw, 42px);
        }

        .ctaBand p {
          margin: 6px 0 0;
          color: #bdd1ef;
          font-size: 15px;
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .btn {
          text-decoration: none;
          min-height: 40px;
          border-radius: 999px;
          padding: 0 14px;
          border: 1px solid transparent;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .btnPrimary {
          background: linear-gradient(120deg, #728dbd 0%, #56709f 100%);
          border-color: rgba(196, 213, 242, 0.34);
          color: #eef4ff;
        }

        .btnGhost {
          color: #dae8ff;
          border-color: rgba(170, 195, 234, 0.42);
          background: rgba(104, 132, 178, 0.12);
        }

        @media (max-width: 980px) {
          .faqGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .page {
            padding: 10px;
          }

          .hero,
          .faqGroup,
          .ctaBand {
            padding: 14px;
          }

          .actions,
          .actions .btn {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
