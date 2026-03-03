'use client';

import Link from 'next/link';
import FallbackImage from '../components/FallbackImage';

const NAV_LINKS = [
  { href: '/#what-is-star-map', label: 'What is Star Map?' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' }
] as const;

const VALUE_POINTS = [
  {
    title: 'Astronomy-Based Rendering',
    text: 'Each map is generated from real location and time data, not a decorative template.'
  },
  {
    title: 'Luxury Poster Composition',
    text: 'Refined spacing, typography hierarchy, and moon styling built for elegant print output.'
  },
  {
    title: 'Meaningful Personalization',
    text: 'Title, names, place, and date lines transform a sky chart into a personal story object.'
  },
  {
    title: 'Instant Download Workflow',
    text: 'Preview live, checkout once, and receive export-ready files within minutes.'
  }
] as const;

const PROCESS_STEPS = [
  {
    step: '01',
    title: 'Enter your moment',
    text: 'Choose city, date, and optional time for the memory you want to preserve.'
  },
  {
    step: '02',
    title: 'Shape the design',
    text: 'Adjust background, typography, moon behavior, and content alignment.'
  },
  {
    step: '03',
    title: 'Download and gift',
    text: 'Get print-friendly files and deliver a keepsake with emotional impact.'
  }
] as const;

const OCCASIONS = [
  'Wedding Day',
  'Anniversary',
  'First Date',
  'New Baby',
  'Proposal Night',
  'Memorial Tribute'
] as const;

const TESTIMONIALS = [
  {
    quote:
      'We gave it as an anniversary gift and it felt far more personal than anything store-bought.',
    author: 'Selin & Marco'
  },
  {
    quote:
      'The editor is clear, the output quality is high, and the final result looks premium on the wall.',
    author: 'Danielle'
  },
  {
    quote:
      'I used our baby’s birth moment and the reaction from family was unforgettable.',
    author: 'Liam Family'
  }
] as const;

const FAQ_PREVIEW = [
  {
    q: 'Are your sky maps astronomically accurate?',
    a: 'Yes. We calculate star positions from date, time, and coordinates for the selected moment.'
  },
  {
    q: 'Can I create a map without exact time?',
    a: 'Yes. Location and date are enough to start. Exact time improves precision.'
  },
  {
    q: 'Can I design for future dates?',
    a: 'Yes. Future milestones like weddings and planned celebrations are fully supported.'
  },
  {
    q: 'What do I receive after checkout?',
    a: 'You receive high-resolution files optimized for both digital delivery and print production.'
  }
] as const;

const BLOG_PREVIEW = [
  {
    title: 'How We Reconstruct Historical Night Skies',
    category: 'Astronomy',
    date: 'March 2026',
    image: '/home-media/blog-historical-skies.jpg'
  },
  {
    title: 'Typography Systems for Elegant Star Map Posters',
    category: 'Design',
    date: 'February 2026',
    image: '/home-media/blog-typography-principles.jpg'
  },
  {
    title: 'Color Pairings for White and Dark Sky Themes',
    category: 'Styling',
    date: 'January 2026',
    image: '/home-media/blog-color-palettes.jpg'
  }
] as const;

export default function HomePage() {
  return (
    <main className="landing">
      <div className="ambient ambientOne" aria-hidden="true" />
      <div className="ambient ambientTwo" aria-hidden="true" />

      <div className="shell">
        <header className="topBar reveal">
          <nav className="menu" aria-label="Main navigation">
            {NAV_LINKS.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <Link href="/ourskymap" className="btn btnPrimary">
            Start Designing
          </Link>
        </header>

        <section className="hero reveal delay1">
          <div className="heroCopy">
            <p className="eyebrow">PERSONALIZED CELESTIAL PRINTS</p>
            <h1>Your memory, mapped in starlight.</h1>
            <p className="signature">For the night that changed everything.</p>
            <p className="lead">
              Build a custom star map from a meaningful place and date, then style it into a timeless gift that feels personal,
              modern, and frame-ready.
            </p>
            <div className="actions">
              <Link href="/ourskymap" className="btn btnPrimary">
                Create Your Star Map
              </Link>
              <Link href="/what-is-star-map" className="btn btnGhost">
                Explore How It Works
              </Link>
            </div>
            <div className="proofRow" aria-label="Trust indicators">
              <p><strong>Instant export</strong> after checkout</p>
              <p><strong>Print-first layout</strong> quality</p>
              <p><strong>Designed for gifting</strong> moments</p>
            </div>
          </div>

          <div className="heroVisual" aria-hidden="true">
            <div className="heroFrame mainFrame">
              <FallbackImage src="/home-media/hero-star-map.jpg" alt="Star map hero preview" fill sizes="(max-width: 980px) 100vw, 42vw" priority />
            </div>
            <div className="heroFrame detailFrame">
              <FallbackImage src="/home-media/hero-detail.jpg" alt="Star map close detail" fill sizes="(max-width: 980px) 42vw, 20vw" />
            </div>
            <p className="heroBadge">Astronomy data + editorial layout</p>
          </div>
        </section>

        <section id="what-is-star-map" className="panel reveal delay2">
          <div className="sectionHead">
            <p className="eyebrow">WHAT IS STAR MAP?</p>
            <h2>A visual keepsake of the exact sky above your chosen moment.</h2>
          </div>
          <p className="sectionLead">
            OurSkyMap turns celestial data into a design object. It combines real sky positioning with premium typography and
            flexible styling controls, so the final poster feels both accurate and emotional.
          </p>

          <div className="valueGrid">
            {VALUE_POINTS.map((item) => (
              <article key={item.title} className="valueCard">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel reveal delay3">
          <div className="sectionHead">
            <p className="eyebrow">HOW IT WORKS</p>
            <h2>From special date to finished wall art in three steps.</h2>
          </div>
          <div className="processGrid">
            {PROCESS_STEPS.map((item) => (
              <article key={item.step} className="processCard">
                <p className="stepNo">Step {item.step}</p>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="dualBlock reveal delay4">
          <article className="panel occasionsPanel">
            <div className="sectionHead compact">
              <p className="eyebrow">POPULAR OCCASIONS</p>
              <h2>Built for gifts with emotional context.</h2>
            </div>
            <div className="occasionWrap">
              {OCCASIONS.map((occasion) => (
                <span key={occasion}>{occasion}</span>
              ))}
            </div>
          </article>

          <article className="panel testimonialPanel">
            <div className="sectionHead compact">
              <p className="eyebrow">CUSTOMER NOTES</p>
              <h2>Why people choose this over generic gifts.</h2>
            </div>
            <div className="testimonialList">
              {TESTIMONIALS.map((item) => (
                <blockquote key={item.author}>
                  <p>{item.quote}</p>
                  <cite>{item.author}</cite>
                </blockquote>
              ))}
            </div>
          </article>
        </section>

        <section id="faq" className="panel reveal delay5">
          <div className="sectionHead rowHead">
            <div>
              <p className="eyebrow">FAQ</p>
              <h2>Questions before you start.</h2>
            </div>
            <Link href="/faq" className="linkPill">
              Open full FAQ
            </Link>
          </div>

          <div className="faqGrid">
            {FAQ_PREVIEW.map((item) => (
              <article key={item.q} className="faqCard">
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel reveal delay6">
          <div className="sectionHead rowHead">
            <div>
              <p className="eyebrow">BLOG</p>
              <h2>Fresh ideas from our celestial journal.</h2>
            </div>
            <Link href="/blog" className="linkPill">
              Visit blog
            </Link>
          </div>

          <div className="blogGrid">
            {BLOG_PREVIEW.map((post) => (
              <article key={post.title} className="blogCard">
                <div className="blogImageWrap">
                  <FallbackImage src={post.image} alt={post.title} fill sizes="(max-width: 980px) 100vw, 30vw" />
                </div>
                <p className="meta">
                  {post.category} - {post.date}
                </p>
                <h3>{post.title}</h3>
                <Link href="/blog" className="inlineLink">
                  Read article
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="ctaBand reveal delay7">
          <div>
            <p className="eyebrow">READY TO BUILD YOURS?</p>
            <h2>Start with one date, one place, one unforgettable sky.</h2>
            <p>Create, personalize, and download your design in minutes.</p>
          </div>
          <div className="ctaActions">
            <Link href="/ourskymap" className="btn btnPrimary">
              Start Design
            </Link>
            <Link href="/contact" className="btn btnGhost">
              Talk to Us
            </Link>
          </div>
        </section>

        <footer className="footer reveal delay7">
          <p>OurSkyMap</p>
          <div>
            <Link href="/what-is-star-map">What is Star Map?</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </footer>
      </div>

      <style jsx>{`
        .landing {
          --bg: #f6f1e9;
          --ink: #1a2842;
          --ink-soft: #43506a;
          --panel: rgba(255, 255, 255, 0.88);
          --line: rgba(35, 56, 89, 0.15);
          --accent: #bc6b2b;
          --accent-soft: #f0d4b7;
          min-height: 100vh;
          padding: 20px 14px 28px;
          position: relative;
          overflow-x: clip;
          color: var(--ink);
          font-family: 'Signika', ui-sans-serif, system-ui;
          background:
            radial-gradient(circle at 10% 0%, rgba(243, 214, 179, 0.42) 0%, transparent 34%),
            radial-gradient(circle at 92% -4%, rgba(197, 214, 238, 0.48) 0%, transparent 28%),
            linear-gradient(168deg, #f8f4ed 0%, #f4efe6 52%, #eee6db 100%);
        }

        .landing :global(a),
        .landing :global(a:visited) {
          color: var(--ink);
          text-decoration: none;
        }

        .ambient {
          position: absolute;
          border-radius: 999px;
          filter: blur(90px);
          z-index: 0;
          pointer-events: none;
        }

        .ambientOne {
          width: 300px;
          height: 300px;
          left: -120px;
          top: 140px;
          background: rgba(188, 107, 43, 0.2);
        }

        .ambientTwo {
          width: 360px;
          height: 360px;
          right: -130px;
          top: 560px;
          background: rgba(90, 122, 173, 0.2);
        }

        .shell {
          width: min(1180px, 100%);
          margin: 0 auto;
          display: grid;
          gap: 12px;
          position: relative;
          z-index: 1;
        }

        .topBar,
        .panel,
        .hero,
        .ctaBand,
        .footer {
          border: 1px solid var(--line);
          border-radius: 20px;
          background: var(--panel);
          backdrop-filter: blur(6px);
        }

        .topBar {
          min-height: 72px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          position: sticky;
          top: 10px;
          z-index: 30;
        }

        .menu {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          flex: 1;
          flex-wrap: wrap;
        }

        .menu :global(a) {
          min-height: 38px;
          padding: 0 13px;
          border-radius: 999px;
          border: 1px solid transparent;
          font-size: 13px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #2d3e61;
          display: inline-flex;
          align-items: center;
          transition: background 0.2s ease, border-color 0.2s ease;
        }

        .menu :global(a:hover) {
          background: rgba(99, 126, 167, 0.1);
          border-color: rgba(66, 95, 139, 0.22);
        }

        .hero {
          padding: 24px;
          display: grid;
          gap: 16px;
          grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
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
          letter-spacing: 0.14em;
          text-transform: uppercase;
          font-weight: 700;
          color: #5d6f8e;
        }

        h1,
        h2,
        h3 {
          margin: 0;
          color: #16233c;
          letter-spacing: -0.02em;
        }

        h1,
        h2 {
          font-family: 'Prata', Georgia, serif;
        }

        h1 {
          font-size: clamp(40px, 5.5vw, 72px);
          line-height: 0.95;
          max-width: 700px;
        }

        .signature {
          margin: 0;
          font-family: 'Allura', 'Great Vibes', cursive;
          font-size: clamp(30px, 4.3vw, 48px);
          color: #b7682a;
          line-height: 1;
        }

        .lead {
          margin: 0;
          color: var(--ink-soft);
          font-size: 18px;
          line-height: 1.45;
          max-width: 680px;
        }

        .actions,
        .ctaActions {
          margin-top: 4px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .btn {
          min-height: 44px;
          border-radius: 999px;
          padding: 0 16px;
          border: 1px solid transparent;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          transition: transform 0.15s ease;
        }

        .btn:hover {
          transform: translateY(-1px);
        }

        .btnPrimary {
          background: linear-gradient(125deg, #bf6e2f 0%, #a85b22 100%);
          color: #fffaf4;
          border-color: rgba(156, 83, 32, 0.35);
          box-shadow: 0 8px 22px rgba(168, 91, 34, 0.25);
        }

        .btnGhost {
          border-color: rgba(82, 105, 141, 0.32);
          color: #21304d;
          background: rgba(234, 241, 250, 0.76);
        }

        .proofRow {
          margin-top: 6px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .proofRow p {
          margin: 0;
          min-height: 34px;
          padding: 0 11px;
          border-radius: 999px;
          border: 1px solid rgba(86, 111, 150, 0.22);
          background: rgba(245, 248, 253, 0.88);
          color: #3f516f;
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
        }

        .proofRow strong {
          color: #243452;
          margin-right: 4px;
        }

        .heroVisual {
          border-radius: 16px;
          border: 1px solid rgba(90, 113, 147, 0.2);
          background:
            radial-gradient(circle at 18% 10%, rgba(229, 239, 253, 0.9) 0%, rgba(229, 239, 253, 0) 34%),
            linear-gradient(140deg, #e8eef7 0%, #dbe5f2 45%, #d2deef 100%);
          padding: 14px;
          display: grid;
          gap: 10px;
          align-content: start;
          position: relative;
          overflow: hidden;
        }

        .heroFrame {
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(99, 124, 164, 0.3);
          position: relative;
          box-shadow: 0 14px 26px rgba(27, 43, 73, 0.16);
          background: #eff4fb;
        }

        .mainFrame {
          min-height: 330px;
        }

        .detailFrame {
          min-height: 126px;
          width: 54%;
          margin-left: auto;
        }

        .heroFrame :global(img) {
          object-fit: cover;
        }

        .heroBadge {
          margin: 0;
          position: absolute;
          left: 14px;
          bottom: 14px;
          min-height: 30px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(73, 101, 146, 0.28);
          background: rgba(242, 247, 255, 0.84);
          color: #2f4468;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          display: inline-flex;
          align-items: center;
        }

        .panel {
          padding: 20px;
        }

        .sectionHead {
          display: grid;
          gap: 7px;
        }

        .sectionHead h2 {
          font-size: clamp(32px, 3.1vw, 46px);
          line-height: 1.02;
        }

        .sectionLead {
          margin: 10px 0 0;
          color: #4a5772;
          font-size: 16px;
          line-height: 1.5;
          max-width: 920px;
        }

        .valueGrid,
        .processGrid,
        .faqGrid,
        .blogGrid {
          margin-top: 12px;
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .valueCard,
        .processCard,
        .faqCard,
        .blogCard {
          border-radius: 14px;
          border: 1px solid rgba(77, 99, 133, 0.2);
          background: rgba(253, 254, 255, 0.85);
          padding: 14px;
          display: grid;
          gap: 6px;
        }

        .valueCard h3,
        .processCard h3,
        .faqCard h3,
        .blogCard h3 {
          font-size: 25px;
          line-height: 1.1;
        }

        .valueCard p,
        .processCard p,
        .faqCard p,
        .blogCard p {
          margin: 0;
          color: #4f5d79;
          font-size: 14px;
          line-height: 1.45;
        }

        .processGrid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .stepNo {
          margin: 0;
          color: #b06328;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 11px;
          font-weight: 700;
        }

        .dualBlock {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .compact h2 {
          font-size: clamp(28px, 2.4vw, 38px);
        }

        .occasionWrap {
          margin-top: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .occasionWrap span {
          min-height: 35px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(81, 104, 140, 0.28);
          color: #31456a;
          background: rgba(246, 250, 255, 0.9);
          font-size: 13px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
        }

        .testimonialList {
          margin-top: 10px;
          display: grid;
          gap: 8px;
        }

        .testimonialList blockquote {
          margin: 0;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(78, 101, 139, 0.2);
          background: rgba(252, 254, 255, 0.86);
          display: grid;
          gap: 7px;
        }

        .testimonialList p {
          margin: 0;
          color: #4c5973;
          line-height: 1.45;
          font-size: 14px;
        }

        .testimonialList cite {
          font-style: normal;
          color: #2f4366;
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 700;
        }

        .rowHead {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .linkPill {
          min-height: 38px;
          border-radius: 999px;
          padding: 0 13px;
          border: 1px solid rgba(77, 101, 139, 0.28);
          color: #304569;
          background: rgba(244, 249, 255, 0.86);
          font-size: 13px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
        }

        .blogGrid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .blogCard {
          gap: 8px;
        }

        .blogImageWrap {
          min-height: 150px;
          border-radius: 10px;
          border: 1px solid rgba(91, 114, 151, 0.24);
          overflow: hidden;
          position: relative;
        }

        .blogImageWrap :global(img) {
          object-fit: cover;
        }

        .meta {
          margin: 0;
          color: #6a7fa5;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
        }

        .inlineLink {
          width: fit-content;
          color: #2d4265;
          font-size: 13px;
          font-weight: 700;
        }

        .ctaBand {
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          background:
            radial-gradient(circle at 22% 10%, rgba(240, 214, 185, 0.45) 0%, transparent 40%),
            linear-gradient(130deg, #f8efe4 0%, #f1e2d3 100%);
        }

        .ctaBand h2 {
          font-size: clamp(32px, 3.3vw, 46px);
          max-width: 730px;
        }

        .ctaBand p {
          margin: 6px 0 0;
          color: #4f607f;
          font-size: 15px;
        }

        .footer {
          min-height: 70px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          background: rgba(255, 255, 255, 0.75);
        }

        .footer p {
          margin: 0;
          font-family: 'Prata', Georgia, serif;
          color: #243454;
          font-size: 22px;
        }

        .footer div {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .footer div :global(a) {
          color: #32486e;
          font-size: 13px;
        }

        .reveal {
          opacity: 0;
          transform: translateY(18px);
          animation: revealUp 0.65s ease forwards;
        }

        .delay1 {
          animation-delay: 0.08s;
        }

        .delay2 {
          animation-delay: 0.16s;
        }

        .delay3 {
          animation-delay: 0.24s;
        }

        .delay4 {
          animation-delay: 0.32s;
        }

        .delay5 {
          animation-delay: 0.4s;
        }

        .delay6 {
          animation-delay: 0.48s;
        }

        .delay7 {
          animation-delay: 0.56s;
        }

        @keyframes revealUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 1120px) {
          .hero {
            grid-template-columns: 1fr;
          }

          .blogGrid,
          .processGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 860px) {
          .dualBlock {
            grid-template-columns: 1fr;
          }

          .valueGrid,
          .faqGrid,
          .blogGrid,
          .processGrid {
            grid-template-columns: 1fr;
          }

          .detailFrame {
            width: 65%;
          }
        }

        @media (max-width: 760px) {
          .landing {
            padding: 10px;
          }

          .topBar,
          .hero,
          .panel,
          .ctaBand,
          .footer {
            padding: 14px;
            border-radius: 16px;
          }

          .topBar {
            position: static;
          }

          h1 {
            font-size: clamp(34px, 10.2vw, 54px);
          }

          .signature {
            font-size: clamp(28px, 8.4vw, 38px);
          }

          .lead {
            font-size: 16px;
          }

          .mainFrame {
            min-height: 280px;
          }

          .detailFrame {
            width: 78%;
          }

          .actions,
          .ctaActions {
            width: 100%;
          }

          .btn {
            width: 100%;
          }

          .proofRow p {
            white-space: normal;
          }
        }
      `}</style>
    </main>
  );
}
