'use client';

import Link from 'next/link';
import FallbackImage from '../../components/FallbackImage';

const FEATURED_POST = {
  title: 'The Science Behind Personalized Star Maps',
  excerpt:
    'How astronomical coordinates, date-time context, and location data become a visual memory object people keep for years.',
  category: 'Behind the Scenes',
  date: 'March 2026',
  readTime: '6 min read',
  image: '/blog-media/featured-science.png'
} as const;

const POSTS = [
  {
    title: 'How to Choose the Best Date for an Anniversary Star Map',
    excerpt: 'A quick framework for selecting the most emotional timestamp and framing the story around it.',
    category: 'Gift Ideas',
    date: 'February 2026',
    readTime: '4 min read',
    image: '/blog-media/best-date-anniversary.png'
  },
  {
    title: 'Typography Pairings That Work for Elegant Celestial Posters',
    excerpt: 'Balance script names, serif titles, and supporting lines without losing clarity.',
    category: 'Design',
    date: 'February 2026',
    readTime: '5 min read',
    image: '/blog-media/typography-pairings.png'
  },
  {
    title: 'Color Systems for Dark, Neutral, and White Star Map Backgrounds',
    excerpt: 'Practical contrast rules for text, constellations, and moon area harmony.',
    category: 'Styling',
    date: 'January 2026',
    readTime: '5 min read',
    image: '/blog-media/color-systems.png'
  },
  {
    title: 'From Checkout to Print: Avoiding Common Export Mistakes',
    excerpt: 'Simple checks before print to prevent spacing and scaling surprises.',
    category: 'Production',
    date: 'January 2026',
    readTime: '3 min read',
    image: '/blog-media/checkout-to-print.png'
  },
  {
    title: 'Writing Better Dedication Lines for Wedding Sky Posters',
    excerpt: 'Line structures and wording styles that feel timeless instead of generic.',
    category: 'Writing',
    date: 'December 2025',
    readTime: '4 min read',
    image: '/blog-media/dedication-lines.png'
  },
  {
    title: 'Why Star Maps Work So Well as Emotional Gifts',
    excerpt: 'The psychology behind date-based gifts and lasting sentimental value.',
    category: 'Insights',
    date: 'December 2025',
    readTime: '5 min read',
    image: '/blog-media/emotional-gifts.png'
  }
] as const;

export default function BlogPage() {
  return (
    <main className="blogPage">
      <div className="grain" aria-hidden="true" />
      <div className="shell">
        <header className="topBar reveal">
          <p className="brand">Celestial Journal</p>
          <nav>
            <Link href="/">Home</Link>
            <Link href="/what-is-star-map">What is Star Map?</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/contact">Contact</Link>
          </nav>
          <Link href="/ourskymap" className="btn btnPrimary">
            Open Editor
          </Link>
        </header>

        <section className="hero reveal delay1">
          <p className="eyebrow">OURSKYMAP BLOG</p>
          <h1>Ideas, craft, and emotion behind personalized sky posters.</h1>
          <p className="lead">
            Strategy notes and practical guides for designing star map products that look premium and feel deeply personal.
          </p>
        </section>

        <section className="featured reveal delay2">
          <div className="featuredMedia">
            <FallbackImage src={FEATURED_POST.image} alt={FEATURED_POST.title} fill sizes="(max-width: 980px) 100vw, 56vw" priority />
          </div>
          <article className="featuredCopy">
            <p className="meta">
              {FEATURED_POST.category} - {FEATURED_POST.date} - {FEATURED_POST.readTime}
            </p>
            <h2>{FEATURED_POST.title}</h2>
            <p>{FEATURED_POST.excerpt}</p>
            <Link href="/ourskymap" className="inlineLink">
              Apply this in the editor
            </Link>
          </article>
        </section>

        <section className="postGrid reveal delay3" aria-label="Blog article list">
          {POSTS.map((post) => (
            <article key={post.title} className="postCard">
              <div className="postImageWrap">
                <FallbackImage src={post.image} alt={post.title} fill sizes="(max-width: 980px) 100vw, 33vw" />
              </div>
              <p className="meta">
                {post.category} - {post.date} - {post.readTime}
              </p>
              <h3>{post.title}</h3>
              <p>{post.excerpt}</p>
              <Link href="/ourskymap" className="inlineLink">
                Design now
              </Link>
            </article>
          ))}
        </section>

        <section className="ctaBand reveal delay4">
          <div>
            <p className="eyebrow">NEXT STEP</p>
            <h2>Use these ideas in your own design flow now.</h2>
            <p>Start from date + location, then tailor every detail for your customer story.</p>
          </div>
          <div className="actions">
            <Link href="/ourskymap" className="btn btnPrimary">
              Start Designing
            </Link>
            <Link href="/what-is-star-map" className="btn btnGhost">
              Learn More
            </Link>
          </div>
        </section>
      </div>

      <style jsx>{`
        .blogPage {
          --ink: #1f2d44;
          --ink-soft: #55627a;
          --paper: #f4ede4;
          --card: rgba(255, 252, 247, 0.88);
          --line: rgba(64, 83, 117, 0.2);
          --accent: #b66424;
          min-height: 100vh;
          padding: 20px 14px 28px;
          background:
            radial-gradient(circle at 9% -1%, rgba(228, 191, 151, 0.36) 0%, transparent 30%),
            radial-gradient(circle at 88% 6%, rgba(176, 194, 219, 0.38) 0%, transparent 31%),
            linear-gradient(165deg, #f7f1e8 0%, #f0e8dc 50%, #ece2d4 100%);
          color: var(--ink);
          font-family: 'Signika', ui-sans-serif, system-ui;
          position: relative;
          overflow-x: clip;
        }

        .blogPage :global(a),
        .blogPage :global(a:visited) {
          color: #2d4268;
          text-decoration: none;
        }

        .grain {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(40, 56, 83, 0.06) 0.65px, transparent 0.65px);
          background-size: 3px 3px;
          opacity: 0.25;
          pointer-events: none;
        }

        .shell {
          width: min(1160px, 100%);
          margin: 0 auto;
          display: grid;
          gap: 12px;
          position: relative;
          z-index: 1;
        }

        .topBar,
        .hero,
        .featured,
        .postCard,
        .ctaBand {
          border: 1px solid var(--line);
          background: var(--card);
          border-radius: 18px;
          backdrop-filter: blur(6px);
        }

        .topBar {
          min-height: 72px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          position: sticky;
          top: 10px;
          z-index: 20;
        }

        .brand {
          margin: 0;
          font-family: 'Prata', Georgia, serif;
          font-size: 28px;
          color: #20314f;
        }

        nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          flex: 1;
          flex-wrap: wrap;
        }

        nav :global(a) {
          min-height: 36px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid transparent;
          color: #334a71;
          font-size: 13px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          display: inline-flex;
          align-items: center;
        }

        nav :global(a:hover) {
          background: rgba(145, 168, 203, 0.18);
          border-color: rgba(80, 104, 142, 0.28);
        }

        .hero {
          padding: 22px;
          display: grid;
          gap: 10px;
        }

        .eyebrow {
          margin: 0;
          color: #6d7f9e;
          font-size: 12px;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          font-weight: 700;
        }

        h1,
        h2,
        h3 {
          margin: 0;
          letter-spacing: -0.02em;
          color: #18263f;
        }

        h1,
        h2 {
          font-family: 'Prata', Georgia, serif;
        }

        h1 {
          font-size: clamp(38px, 5.4vw, 74px);
          line-height: 0.95;
          max-width: 980px;
        }

        .lead {
          margin: 0;
          color: var(--ink-soft);
          font-size: 18px;
          line-height: 1.45;
          max-width: 860px;
        }

        .featured {
          padding: 12px;
          display: grid;
          gap: 12px;
          grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
        }

        .featuredMedia {
          min-height: 330px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(90, 111, 146, 0.26);
          position: relative;
          background: #ecf2fb;
        }

        .featuredMedia :global(img),
        .postImageWrap :global(img) {
          object-fit: cover;
        }

        .featuredCopy {
          border-radius: 12px;
          border: 1px solid rgba(89, 111, 146, 0.2);
          background: rgba(249, 253, 255, 0.82);
          padding: 16px;
          display: grid;
          align-content: center;
          gap: 8px;
        }

        h2 {
          font-size: clamp(34px, 3.8vw, 50px);
          line-height: 0.98;
        }

        .featuredCopy p,
        .postCard p {
          margin: 0;
          color: #52607a;
          font-size: 14px;
          line-height: 1.46;
        }

        .meta {
          margin: 0;
          color: #6b7ea0;
          font-size: 11px;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          font-weight: 700;
        }

        .postGrid {
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .postCard {
          padding: 12px;
          display: grid;
          gap: 8px;
        }

        .postImageWrap {
          min-height: 170px;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid rgba(93, 115, 150, 0.24);
          position: relative;
          background: #ecf2fb;
        }

        h3 {
          font-size: 30px;
          line-height: 1.02;
        }

        .inlineLink {
          width: fit-content;
          color: #24406f;
          font-size: 14px;
          font-weight: 700;
        }

        .inlineLink:hover {
          color: #1d345a;
          text-decoration: underline;
          text-decoration-color: rgba(36, 64, 111, 0.45);
          text-decoration-thickness: 2px;
        }

        .btn {
          min-height: 42px;
          border-radius: 999px;
          padding: 0 15px;
          border: 1px solid transparent;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          transition: transform 0.16s ease;
        }

        .btn:hover {
          transform: translateY(-1px);
        }

        .btnPrimary {
          background: linear-gradient(122deg, #ba692a 0%, #a95a21 100%);
          color: #fff9f2;
          border-color: rgba(156, 84, 34, 0.35);
          box-shadow: 0 8px 20px rgba(169, 90, 33, 0.24);
        }

        .btnGhost {
          border-color: rgba(81, 103, 138, 0.32);
          color: #253d65;
          background: rgba(234, 242, 251, 0.72);
        }

        .ctaBand {
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          background:
            radial-gradient(circle at 18% 14%, rgba(227, 193, 157, 0.44) 0%, transparent 36%),
            linear-gradient(130deg, #f6ece0 0%, #f0dfcf 100%);
        }

        .ctaBand h2 {
          font-size: clamp(34px, 3.7vw, 50px);
          max-width: 760px;
        }

        .ctaBand p {
          margin: 6px 0 0;
          color: #56627c;
          font-size: 15px;
        }

        .actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .reveal {
          opacity: 0;
          transform: translateY(16px);
          animation: revealUp 0.55s ease forwards;
        }

        .delay1 {
          animation-delay: 0.07s;
        }

        .delay2 {
          animation-delay: 0.14s;
        }

        .delay3 {
          animation-delay: 0.21s;
        }

        .delay4 {
          animation-delay: 0.28s;
        }

        @keyframes revealUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 1080px) {
          .featured,
          .postGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .blogPage {
            padding: 10px;
          }

          .topBar,
          .hero,
          .featured,
          .postCard,
          .ctaBand {
            padding: 14px;
            border-radius: 14px;
          }

          .topBar {
            position: static;
          }

          .brand {
            font-size: 24px;
          }

          h1 {
            font-size: clamp(34px, 10vw, 52px);
          }

          h2 {
            font-size: clamp(30px, 8vw, 42px);
          }

          h3 {
            font-size: 27px;
          }

          .lead {
            font-size: 16px;
          }

          .actions,
          .actions .btn,
          .btn {
            width: 100%;
          }

          .featuredMedia {
            min-height: 260px;
          }
        }
      `}</style>
    </main>
  );
}
