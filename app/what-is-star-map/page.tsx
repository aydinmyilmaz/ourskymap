'use client';

import Link from 'next/link';
import FallbackImage from '../../components/FallbackImage';

const PILLARS = [
  {
    title: 'Astronomy Data',
    text: 'Sky geometry is generated from date, time, and coordinates so your map reflects a real celestial arrangement.'
  },
  {
    title: 'Personal Story',
    text: 'Title, names, location line, and date text are all editable to match the event behind the print.'
  },
  {
    title: 'Print-Ready Output',
    text: 'Designs are exported for clean wall-art printing and digital sharing without quality loss.'
  }
] as const;

const OCCASIONS = [
  'Wedding day sky',
  'The day you met',
  'Birth night of your child',
  'Graduation milestone',
  'Engagement or proposal memory',
  'Memorial tribute date'
] as const;

const FLOW = [
  {
    step: '1',
    title: 'Enter place and date',
    text: 'Start with city and date. Add time for sharper astronomical alignment.'
  },
  {
    step: '2',
    title: 'Style your poster',
    text: 'Adjust colors, moon phase handling, typography, and content hierarchy.'
  },
  {
    step: '3',
    title: 'Checkout and download',
    text: 'Complete checkout and receive high-quality files for frame shops or home printers.'
  }
] as const;

const FAQ = [
  {
    q: 'Do I need exact birth time?',
    a: 'Not mandatory. Date and location work, but exact time improves sky precision.'
  },
  {
    q: 'Can I preview before checkout?',
    a: 'Yes. You can see your composition live while editing.'
  },
  {
    q: 'Can I use future dates?',
    a: 'Yes. Future milestones are supported the same way as past moments.'
  },
  {
    q: 'Is this suitable as a wedding gift?',
    a: 'Yes. Wedding and anniversary maps are among the most common use cases.'
  }
] as const;

export default function WhatIsStarMapPage() {
  return (
    <main className="page">
      <div className="shell">
        <header className="topNav">
          <Link href="/" className="brand">
            OurSkyMap
          </Link>
          <nav>
            <Link href="/">Home</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/blog">Blog</Link>
          </nav>
          <Link href="/ourskymap" className="ctaBtn">
            Start Design
          </Link>
        </header>

        <section className="hero">
          <div className="heroText">
            <p className="eyebrow">WHAT IS A STAR MAP?</p>
            <h1>A personalized map of the sky for the moment that changed your story.</h1>
            <p>
              A star map is a custom artwork that shows how the night sky looked at a selected place and time. It captures
              the atmosphere of a memory in a format you can frame, gift, and keep forever.
            </p>
            <div className="heroActions">
              <Link href="/ourskymap" className="ctaBtn">
                Create Your Star Map
              </Link>
              <Link href="/faq" className="ghostBtn">
                Read FAQ
              </Link>
            </div>
          </div>
          <div className="heroImage">
            <FallbackImage src="/home-media/what-is-hero.jpg" alt="Star map example" fill sizes="(max-width: 980px) 100vw, 46vw" />
          </div>
        </section>

        <section className="cardBlock">
          <h2>How it works technically</h2>
          <p className="intro">
            The map engine computes sky data from coordinates and time context, then converts the result into a visual system
            optimized for personal storytelling and high-quality print.
          </p>
          <div className="pillars">
            {PILLARS.map((item) => (
              <article key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="cardBlock splitBlock">
          <div>
            <h2>Popular occasions</h2>
            <p className="intro">Most customers create star maps for milestones where date and emotion are strongly connected.</p>
            <ul className="occasionList">
              {OCCASIONS.map((occasion) => (
                <li key={occasion}>{occasion}</li>
              ))}
            </ul>
          </div>

          <div>
            <h2>Creation flow</h2>
            <div className="flowList">
              {FLOW.map((item) => (
                <article key={item.step}>
                  <p className="step">Step {item.step}</p>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="cardBlock">
          <h2>Quick answers</h2>
          <div className="faqGrid">
            {FAQ.map((item) => (
              <article key={item.q}>
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 12% 0%, rgba(131, 163, 221, 0.24) 0%, transparent 34%),
            linear-gradient(170deg, #080d1d 0%, #0d1730 100%);
          padding: 16px;
          color: #edf4ff;
          font-family: 'Signika', ui-sans-serif, system-ui;
        }

        .shell {
          width: min(1080px, 100%);
          margin: 0 auto;
          display: grid;
          gap: 12px;
        }

        .topNav,
        .hero,
        .cardBlock {
          border: 1px solid rgba(162, 190, 230, 0.24);
          background: rgba(13, 23, 47, 0.82);
          border-radius: 16px;
          backdrop-filter: blur(5px);
        }

        .topNav {
          min-height: 66px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }

        .brand {
          text-decoration: none;
          color: #f0f6ff;
          font-family: 'Prata', Georgia, serif;
          font-size: 22px;
        }

        nav {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        nav :global(a) {
          text-decoration: none;
          color: #d2e2ff;
          border: 1px solid transparent;
          border-radius: 999px;
          min-height: 34px;
          padding: 0 12px;
          display: inline-flex;
          align-items: center;
          font-size: 13px;
          letter-spacing: 0.04em;
        }

        nav :global(a:hover) {
          border-color: rgba(172, 197, 232, 0.38);
          background: rgba(99, 129, 177, 0.16);
        }

        .hero {
          padding: 18px;
          display: grid;
          gap: 12px;
          grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
          align-items: stretch;
        }

        .heroText {
          display: grid;
          align-content: center;
          gap: 10px;
        }

        .eyebrow {
          margin: 0;
          color: #9db8e8;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-size: 12px;
          font-weight: 700;
        }

        h1,
        h2,
        h3 {
          margin: 0;
          letter-spacing: -0.02em;
        }

        h1,
        h2 {
          font-family: 'Prata', Georgia, serif;
        }

        h1 {
          font-size: clamp(34px, 4.6vw, 56px);
          line-height: 1;
        }

        .heroText p {
          margin: 0;
          color: #b8c9e8;
          font-size: 16px;
          line-height: 1.45;
        }

        .heroActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .ctaBtn,
        .ghostBtn {
          text-decoration: none;
          min-height: 40px;
          border-radius: 999px;
          padding: 0 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          border: 1px solid transparent;
        }

        .ctaBtn {
          background: linear-gradient(120deg, #748fbf 0%, #5770a0 100%);
          color: #eff4ff;
          border-color: rgba(198, 214, 241, 0.36);
        }

        .ghostBtn {
          color: #dce9ff;
          border-color: rgba(165, 191, 233, 0.44);
          background: rgba(102, 127, 170, 0.14);
        }

        .heroImage {
          position: relative;
          border-radius: 12px;
          border: 1px solid rgba(181, 204, 238, 0.36);
          overflow: hidden;
          min-height: 320px;
        }

        .heroImage :global(img) {
          object-fit: cover;
        }

        .cardBlock {
          padding: 18px;
          display: grid;
          gap: 10px;
        }

        h2 {
          font-size: clamp(30px, 3.2vw, 44px);
          line-height: 1.05;
        }

        .intro {
          margin: 0;
          color: #b8c9e8;
          line-height: 1.45;
          font-size: 15px;
          max-width: 860px;
        }

        .pillars,
        .faqGrid {
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .pillars article,
        .faqGrid article,
        .flowList article {
          border-radius: 12px;
          border: 1px solid rgba(158, 186, 227, 0.28);
          background: rgba(18, 30, 58, 0.72);
          padding: 12px;
          display: grid;
          gap: 6px;
        }

        h3 {
          font-size: 23px;
          color: #edf5ff;
        }

        article p {
          margin: 0;
          color: #b4c7e8;
          line-height: 1.45;
          font-size: 14px;
        }

        .splitBlock {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .occasionList {
          margin: 2px 0 0;
          padding-left: 18px;
          display: grid;
          gap: 6px;
          color: #b9c9e7;
        }

        .flowList {
          display: grid;
          gap: 10px;
        }

        .step {
          margin: 0;
          color: #9eb8e8;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 11px;
          font-weight: 700;
        }

        @media (max-width: 960px) {
          .hero,
          .splitBlock,
          .pillars,
          .faqGrid {
            grid-template-columns: 1fr;
          }

          .heroImage {
            min-height: 280px;
          }
        }

        @media (max-width: 760px) {
          .page {
            padding: 10px;
          }

          .topNav,
          .hero,
          .cardBlock {
            padding: 14px;
          }

          .ctaBtn,
          .ghostBtn {
            width: 100%;
          }

          .heroActions {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
