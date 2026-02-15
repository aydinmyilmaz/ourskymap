'use client';

import Link from 'next/link';

const PRODUCTS = [
  {
    href: '/ourskymap',
    title: 'OurSkyMap',
    tag: 'Signature Product',
    desc: 'Create a personalized star map for a date and location with a clean, print-ready poster output.',
    cta: 'Start Sky Map',
    tone: 'sky'
  },
  {
    href: '/citymap',
    title: 'CityMap',
    tag: 'Location Poster',
    desc: 'Build minimal and retro-inspired city posters with map style, road weight, and typography controls.',
    cta: 'Start City Map',
    tone: 'city'
  },
  {
    href: '/playground',
    title: 'Playground',
    tag: 'Sandbox',
    desc: 'Use the internal experimentation studio to test advanced parameter combinations quickly.',
    cta: 'Open Playground',
    tone: 'lab'
  }
] as const;

const STATS = [
  { label: 'Design Variants', value: '100+' },
  { label: 'Export Ready', value: 'SVG / PNG / PDF' },
  { label: 'Checkout Flow', value: 'Integrated' }
] as const;

const STEPS = [
  { title: 'Choose Product', body: 'Select OurSkyMap, CityMap, or Playground depending on your goal.' },
  { title: 'Customize', body: 'Adjust style, color, map composition, text, and layout in real-time.' },
  { title: 'Checkout & Download', body: 'Complete checkout and receive production-ready digital files.' }
] as const;

export default function HomePage() {
  return (
    <main className="homeRoot">
      <div className="bgAura bgAuraOne" aria-hidden="true" />
      <div className="bgAura bgAuraTwo" aria-hidden="true" />

      <div className="shell">
        <header className="topNav">
          <nav className="navLinks" aria-label="Main">
            <Link href="/ourskymap">OurSkyMap</Link>
            <Link href="/citymap">CityMap</Link>
            <Link href="/playground">Playground</Link>
          </nav>
          <Link href="/citymap" className="navCta">
            Design Now
          </Link>
        </header>

        <section className="hero">
          <div className="heroCopy">
            <p className="eyebrow">Custom Digital Poster Platform</p>
            <h1>Design Meaningful Poster Products in Minutes</h1>
            <p className="lead">
              Create custom sky maps and city maps with studio-level controls, then export print-ready files through a single
              workflow.
            </p>
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
            <div className="visualStage">
              <div className="posterMock posterSky" />
              <div className="posterMock posterCity" />
              <div className="posterMock posterMinimal" />
              <div className="floatingBadge">NY Retro Ready</div>
            </div>
          </div>
        </section>

        <section className="stats" aria-label="Highlights">
          {STATS.map((item) => (
            <article key={item.label} className="statCard">
              <p className="statValue">{item.value}</p>
              <p className="statLabel">{item.label}</p>
            </article>
          ))}
        </section>

        <section className="productsSection" aria-label="Products">
          <div className="sectionHead">
            <p className="sectionTag">Products</p>
            <h2>Choose Your Workflow</h2>
          </div>

          <div className="productsGrid">
            {PRODUCTS.map((item) => (
              <article key={item.href} className="productCard">
                <div className={`cardVisual ${item.tone}`} aria-hidden="true" />
                <p className="tag">{item.tag}</p>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
                <Link href={item.href} className="cardLink">
                  {item.cta}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="workflow" aria-label="How it works">
          <div className="sectionHead">
            <p className="sectionTag">How It Works</p>
            <h2>Simple End-to-End Flow</h2>
          </div>

          <div className="stepGrid">
            {STEPS.map((step, i) => (
              <article key={step.title} className="stepCard">
                <div className="stepNum">0{i + 1}</div>
                <h4>{step.title}</h4>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="ctaBand">
          <div>
            <p className="sectionTag">Ready to start?</p>
            <h2>Launch a new design in under a minute.</h2>
          </div>
          <div className="heroActions">
            <Link href="/citymap" className="btn btnPrimary">
              Open CityMap
            </Link>
            <Link href="/ourskymap" className="btn btnSecondary">
              Open OurSkyMap
            </Link>
          </div>
        </section>
      </div>

      <style jsx>{`
        .homeRoot {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          padding: 28px 20px 40px;
          background: linear-gradient(170deg, #edf1f8 0%, #e8edf6 45%, #dde5f2 100%);
          color: #10162c;
          font-family: 'Signika', ui-sans-serif, system-ui;
        }

        .bgAura {
          position: absolute;
          filter: blur(55px);
          pointer-events: none;
          z-index: 0;
          opacity: 0.7;
        }

        .bgAuraOne {
          width: 420px;
          height: 420px;
          left: -120px;
          top: -120px;
          border-radius: 999px;
          background: radial-gradient(circle at 40% 40%, #9db7ef 0%, #e6efff 66%, transparent 100%);
        }

        .bgAuraTwo {
          width: 480px;
          height: 480px;
          right: -180px;
          top: 200px;
          border-radius: 999px;
          background: radial-gradient(circle at 50% 50%, #8fd4cf 0%, #e2f4f2 70%, transparent 100%);
        }

        .shell {
          position: relative;
          z-index: 1;
          width: min(1240px, 100%);
          margin: 0 auto;
          display: grid;
          gap: 16px;
        }

        .topNav {
          min-height: 66px;
          border-radius: 16px;
          border: 1px solid #c8d1e2;
          background: rgba(250, 252, 255, 0.88);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 16px;
          animation: fadeUp 0.45s ease both;
        }

        .navLinks {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: flex-start;
          flex-wrap: wrap;
        }

        .navLinks :global(a) {
          text-decoration: none;
          color: #2f4061;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
        }

        .navLinks :global(a:hover) {
          background: #e8eef9;
        }

        .navCta {
          min-height: 38px;
          padding: 0 12px;
          border-radius: 9px;
          text-decoration: none;
          border: 1px solid #324871;
          color: #f7f9ff;
          background: #1f2a44;
          font-size: 13px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .hero {
          border-radius: 22px;
          border: 1px solid #c9d2e3;
          background: linear-gradient(140deg, #ffffff 0%, #f3f7fd 100%);
          box-shadow: 0 22px 54px rgba(20, 31, 57, 0.12);
          padding: 26px;
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(300px, 0.85fr);
          gap: 24px;
          align-items: center;
          animation: fadeUp 0.55s ease both;
        }

        .eyebrow {
          margin: 0;
          font-size: 12px;
          letter-spacing: 0.14em;
          color: #456091;
          font-weight: 700;
          text-transform: uppercase;
        }

        h1 {
          margin: 8px 0 0;
          font-size: clamp(34px, 4.2vw, 62px);
          line-height: 0.98;
          letter-spacing: -0.03em;
          color: #111c37;
        }

        .lead {
          margin: 16px 0 0;
          max-width: 700px;
          color: #44506d;
          font-size: 19px;
          line-height: 1.44;
        }

        .heroActions {
          margin-top: 22px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .btn {
          min-height: 44px;
          padding: 0 14px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-weight: 700;
          font-size: 14px;
          border: 1px solid transparent;
        }

        .btnPrimary {
          background: #1f2a44;
          color: #ffffff;
          border-color: #1f2a44;
        }

        .btnSecondary {
          background: #ffffff;
          color: #1f2a44;
          border-color: #b9c4dc;
        }

        .heroVisual {
          display: grid;
          place-items: center;
        }

        .visualStage {
          width: min(430px, 100%);
          aspect-ratio: 5 / 4;
          border-radius: 18px;
          border: 1px solid #ced7e9;
          background: linear-gradient(135deg, #f5f8ff 0%, #ebf2ff 58%, #e0ecff 100%);
          position: relative;
          overflow: hidden;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.6);
        }

        .posterMock {
          position: absolute;
          border-radius: 10px;
          border: 1px solid #ced6e7;
          box-shadow: 0 14px 26px rgba(22, 35, 63, 0.2);
          background-size: cover;
          background-repeat: no-repeat;
          animation: floatY 4.6s ease-in-out infinite;
        }

        .posterSky {
          width: 42%;
          height: 68%;
          left: 8%;
          top: 16%;
          background:
            radial-gradient(circle at 60% 24%, rgba(255, 255, 255, 0.75) 0 1px, transparent 2px),
            radial-gradient(circle at 43% 66%, rgba(255, 255, 255, 0.65) 0 1px, transparent 2px),
            linear-gradient(170deg, #0e1530 0%, #1a2f60 100%);
          background-size: auto, auto, cover;
        }

        .posterCity {
          width: 40%;
          height: 64%;
          right: 10%;
          top: 10%;
          animation-delay: 0.6s;
          background:
            linear-gradient(45deg, rgba(238, 227, 198, 0.95) 0 54%, rgba(249, 112, 100, 0.86) 54% 58%, rgba(41, 181, 173, 0.9) 58% 100%),
            linear-gradient(180deg, #efe5cb 0%, #efe5cb 100%);
        }

        .posterMinimal {
          width: 36%;
          height: 56%;
          left: 34%;
          bottom: 8%;
          animation-delay: 1.2s;
          background:
            radial-gradient(circle at 50% 31%, #d9e0dc 0 38%, transparent 39%),
            linear-gradient(180deg, #aeb6af 0%, #aeb6af 64%, #e8e8e3 64% 100%);
        }

        .floatingBadge {
          position: absolute;
          right: 12px;
          bottom: 12px;
          min-height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid #c4cfe4;
          background: rgba(255, 255, 255, 0.9);
          color: #2a3f67;
          font-size: 12px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          animation: fadeUp 0.65s ease both;
        }

        .statCard {
          border-radius: 14px;
          border: 1px solid #ced7e8;
          background: rgba(249, 251, 255, 0.88);
          padding: 12px 14px;
        }

        .statValue {
          margin: 0;
          color: #172648;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .statLabel {
          margin: 4px 0 0;
          color: #516080;
          font-size: 13px;
          font-weight: 600;
        }

        .productsSection,
        .workflow,
        .ctaBand {
          border-radius: 18px;
          border: 1px solid #cfd7e8;
          background: rgba(252, 253, 255, 0.9);
          padding: 18px;
          animation: fadeUp 0.7s ease both;
        }

        .sectionHead {
          display: grid;
          gap: 4px;
          margin-bottom: 12px;
        }

        .sectionTag {
          margin: 0;
          font-size: 12px;
          letter-spacing: 0.12em;
          color: #556b97;
          font-weight: 700;
          text-transform: uppercase;
        }

        h2 {
          margin: 0;
          font-size: clamp(28px, 3vw, 40px);
          letter-spacing: -0.02em;
          color: #111c37;
        }

        .productsGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .productCard {
          border-radius: 14px;
          border: 1px solid #d7deec;
          background: #ffffff;
          padding: 14px;
          display: grid;
          gap: 8px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .productCard:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 28px rgba(19, 29, 52, 0.12);
        }

        .cardVisual {
          height: 120px;
          border-radius: 10px;
          border: 1px solid #d4dceb;
          background: #f2f5fb;
        }

        .cardVisual.sky {
          background:
            radial-gradient(circle at 20% 22%, rgba(255, 255, 255, 0.8) 0 1px, transparent 2px),
            radial-gradient(circle at 62% 50%, rgba(255, 255, 255, 0.7) 0 1px, transparent 2px),
            linear-gradient(170deg, #0b1329 0%, #193364 100%);
        }

        .cardVisual.city {
          background:
            linear-gradient(45deg, #efe5cb 0 50%, #ff6f67 50% 54%, #2cb4ad 54% 100%),
            linear-gradient(180deg, #efe5cb 0%, #efe5cb 100%);
        }

        .cardVisual.lab {
          background:
            linear-gradient(120deg, #e3ebfd 0 32%, #cfdcf5 32% 34%, #dce6fa 34% 67%, #cfdcf5 67% 69%, #e3ebfd 69% 100%),
            linear-gradient(180deg, #eff4ff 0%, #e7eefc 100%);
        }

        .tag {
          margin: 0;
          font-size: 11px;
          letter-spacing: 0.08em;
          font-weight: 700;
          color: #5d6f96;
          text-transform: uppercase;
        }

        h3 {
          margin: 0;
          font-size: 34px;
          letter-spacing: -0.02em;
          color: #131a2f;
          line-height: 0.95;
        }

        .productCard p {
          margin: 0;
          color: #4f5971;
          font-size: 15px;
          line-height: 1.42;
        }

        .cardLink {
          margin-top: 4px;
          text-decoration: none;
          color: #20345f;
          font-weight: 700;
          font-size: 14px;
        }

        .stepGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .stepCard {
          border-radius: 12px;
          border: 1px solid #d8dfed;
          background: #ffffff;
          padding: 14px;
          display: grid;
          gap: 6px;
        }

        .stepNum {
          font-size: 12px;
          letter-spacing: 0.12em;
          color: #586d99;
          font-weight: 700;
          text-transform: uppercase;
        }

        h4 {
          margin: 0;
          color: #1b2644;
          font-size: 22px;
          letter-spacing: -0.02em;
        }

        .stepCard p {
          margin: 0;
          color: #4f5971;
          font-size: 14px;
          line-height: 1.45;
        }

        .ctaBand {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: linear-gradient(130deg, #1f2a44 0%, #283b66 100%);
          border-color: #2f426d;
        }

        .ctaBand h2 {
          color: #f3f6ff;
          font-size: clamp(26px, 2.5vw, 36px);
        }

        .ctaBand .sectionTag {
          color: #b8c8ec;
        }

        .ctaBand .btnPrimary {
          background: #f6f8ff;
          color: #1f2a44;
          border-color: #f6f8ff;
        }

        .ctaBand .btnSecondary {
          background: transparent;
          color: #f6f8ff;
          border-color: #9eb3dc;
        }

        @keyframes floatY {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-6px);
          }
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 1120px) {
          .hero {
            grid-template-columns: 1fr;
          }

          .heroVisual {
            order: -1;
          }

          .productsGrid,
          .stepGrid,
          .stats {
            grid-template-columns: 1fr;
          }

          .ctaBand {
            flex-direction: column;
            align-items: flex-start;
          }

          .topNav {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (max-width: 760px) {
          .homeRoot {
            padding: 14px 12px 28px;
          }

          .hero,
          .productsSection,
          .workflow,
          .ctaBand {
            padding: 14px;
          }

          .lead {
            font-size: 16px;
          }

          h3 {
            font-size: 30px;
          }

          .cardVisual {
            height: 104px;
          }
        }
      `}</style>
    </main>
  );
}
