'use client';

import Image from 'next/image';
import Link from 'next/link';

const CHANNELS = [
  {
    title: 'Sales & Partnerships',
    email: 'sales@spacemap.studio',
    sla: 'Response within 1 business day',
    note: 'For bundle pricing, white-label workflows, and campaign requests.'
  },
  {
    title: 'Product Support',
    email: 'support@spacemap.studio',
    sla: 'Response within 12-24 hours',
    note: 'For rendering, export, checkout, and account-related technical issues.'
  },
  {
    title: 'Media & Collaboration',
    email: 'hello@spacemap.studio',
    sla: 'Response within 2 business days',
    note: 'For creator partnerships, interviews, and portfolio collaborations.'
  }
] as const;

const TOPICS = [
  'Order and export support',
  'Commercial and wholesale licensing',
  'Brand collaboration / white-label requests',
  'Custom workflow requirements'
] as const;

export default function ContactPage() {
  return (
    <main className="contactPage">
      <div className="shell">
        <header className="hero">
          <div>
            <p className="eyebrow">Contact</p>
            <h1>Let&apos;s Build Better Digital Poster Products Together</h1>
            <p>
              Reach out for product questions, plan recommendations, or partnership discussions. We reply with clear, practical next
              steps.
            </p>
            <div className="heroActions">
              <a href="mailto:sales@spacemap.studio" className="btn btnPrimary">
                Email Sales
              </a>
              <a href="mailto:support@spacemap.studio" className="btn btnSecondary">
                Contact Support
              </a>
            </div>
          </div>
          <div className="heroImage" aria-hidden="true">
            <Image src="/home/product-citymap.jpg" alt="Contact visual" fill sizes="(max-width: 920px) 100vw, 34vw" />
          </div>
        </header>

        <section className="channelGrid" aria-label="Communication channels">
          {CHANNELS.map((channel) => (
            <article key={channel.title} className="channelCard">
              <h2>{channel.title}</h2>
              <p className="email">{channel.email}</p>
              <p className="sla">{channel.sla}</p>
              <p>{channel.note}</p>
              <a href={`mailto:${channel.email}`} className="inlineLink">
                Send email
              </a>
            </article>
          ))}
        </section>

        <section className="sectionBlock">
          <div>
            <p className="eyebrow">Common Topics</p>
            <h2>What We Can Help You With</h2>
          </div>
          <ul>
            {TOPICS.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
        </section>

        <section className="sectionBlock sectionSplit">
          <div>
            <p className="eyebrow">Before You Reach Out</p>
            <h2>Helpful Resources</h2>
            <p>Most setup questions are already documented in the pages below.</p>
          </div>
          <div className="resourceLinks">
            <Link href="/faq">FAQ</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/ourskymap">Open StarMap</Link>
          </div>
        </section>
      </div>

      <style jsx>{`
        .contactPage {
          min-height: 100vh;
          background: linear-gradient(165deg, #ecf3fb 0%, #e8f0fb 100%);
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
        .channelCard,
        .sectionBlock {
          border-radius: 18px;
          border: 1px solid #c8d5e9;
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
          color: #4a6898;
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 700;
        }

        h1,
        h2 {
          margin: 8px 0 0;
          font-family: 'Prata', Georgia, serif;
          letter-spacing: -0.02em;
          color: #102142;
        }

        h1 {
          font-size: clamp(31px, 5vw, 54px);
          line-height: 1.02;
        }

        h2 {
          font-size: clamp(25px, 2.8vw, 36px);
        }

        .hero p {
          margin: 10px 0 0;
          color: #4f6180;
          font-size: 17px;
          line-height: 1.45;
          max-width: 680px;
        }

        .heroImage {
          min-height: 300px;
          border-radius: 12px;
          border: 1px solid #d4dfef;
          overflow: hidden;
          position: relative;
        }

        .heroImage :global(img) {
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
          border-color: #1b4275;
          color: #f7fbff;
        }

        .btnSecondary {
          background: #ffffff;
          border-color: #c0d2e8;
          color: #1d3f71;
        }

        .channelGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .channelCard {
          padding: 14px;
          display: grid;
          gap: 6px;
        }

        .channelCard h2 {
          margin: 0;
          font-size: 26px;
        }

        .channelCard p {
          margin: 0;
          color: #4b6187;
          font-size: 14px;
          line-height: 1.45;
        }

        .email {
          font-weight: 700;
          color: #1d3e6e;
          font-size: 15px;
        }

        .sla {
          font-size: 12px;
          color: #5d779f;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 700;
        }

        .inlineLink {
          text-decoration: none;
          color: #1f4f89;
          font-weight: 700;
          width: fit-content;
          margin-top: 2px;
        }

        .sectionBlock {
          padding: 16px;
          display: grid;
          gap: 10px;
        }

        .sectionBlock p {
          margin: 8px 0 0;
          color: #4f6283;
          font-size: 15px;
          line-height: 1.45;
        }

        .sectionBlock ul {
          margin: 0;
          padding-left: 20px;
          display: grid;
          gap: 7px;
          color: #415a80;
          font-size: 15px;
        }

        .sectionSplit {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .resourceLinks {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .resourceLinks :global(a) {
          min-height: 38px;
          border-radius: 10px;
          border: 1px solid #bfd1e8;
          background: #f8fbff;
          padding: 0 12px;
          text-decoration: none;
          color: #1d3f71;
          font-size: 13px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
        }

        @media (max-width: 980px) {
          .hero {
            grid-template-columns: 1fr;
          }

          .channelGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .contactPage {
            padding: 12px 10px 24px;
          }

          .hero,
          .channelCard,
          .sectionBlock {
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
