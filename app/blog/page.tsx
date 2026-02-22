'use client';

import Image from 'next/image';
import Link from 'next/link';

const POSTS = [
  {
    title: 'How to Design Gift-Ready Star Map Posters',
    excerpt:
      'A practical framework for selecting date precision, typography hierarchy, and framing ratios that print cleanly.',
    category: 'Guides',
    date: 'January 2026',
    href: '/ourskymap',
    image: '/home/product-starmap.jpg'
  },
  {
    title: 'City Poster Print Checklist for Reliable Production',
    excerpt:
      'From zoom levels to text spacing, this checklist helps teams avoid common print and composition mistakes.',
    category: 'Production',
    date: 'December 2025',
    href: '/citymap',
    image: '/home/product-citymap.jpg'
  },
  {
    title: 'Turning Audio into Better Wall Art Products',
    excerpt:
      'Soundwave products perform better when waveform style, metadata, and QR experiences are designed together.',
    category: 'Product',
    date: 'November 2025',
    href: '/soundwave',
    image: '/home/product-soundwave.jpg'
  },
  {
    title: 'Building Premium Vinyl-Inspired Digital Posters',
    excerpt:
      'A breakdown of visual rhythm, material cues, and palette strategies for collectible-style digital products.',
    category: 'Creative Ops',
    date: 'October 2025',
    href: '/vinyl',
    image: '/home/product-vinyl.jpg'
  }
] as const;

export default function BlogPage() {
  return (
    <main className="blogPage">
      <div className="shell">
        <header className="hero">
          <p className="eyebrow">Blog</p>
          <h1>Insights for Better Digital Poster Products</h1>
          <p>
            Practical writing on design quality, workflow efficiency, and conversion-ready product experiences for custom poster
            businesses.
          </p>
        </header>

        <section className="postsGrid" aria-label="Blog posts">
          {POSTS.map((post) => (
            <article key={post.title} className="postCard">
              <div className="postImageWrap">
                <Image src={post.image} alt={post.title} fill sizes="(max-width: 920px) 100vw, 25vw" />
              </div>
              <p className="meta">
                {post.category} • {post.date}
              </p>
              <h2>{post.title}</h2>
              <p>{post.excerpt}</p>
              <Link href={post.href} className="postLink">
                Open related product
              </Link>
            </article>
          ))}
        </section>

        <section className="ctaBand" aria-label="Blog actions">
          <div>
            <p className="eyebrow">Next Step</p>
            <h2>Apply these insights directly in the product editor.</h2>
            <p>Start building and test these principles in real exports.</p>
          </div>
          <div className="actions">
            <Link href="/ourskymap" className="btn btnPrimary">
              Start Designing
            </Link>
            <Link href="/pricing" className="btn btnSecondary">
              View Pricing
            </Link>
          </div>
        </section>
      </div>

      <style jsx>{`
        .blogPage {
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
        .postCard,
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

        .postsGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .postCard {
          padding: 12px;
          display: grid;
          gap: 8px;
        }

        .postImageWrap {
          border-radius: 10px;
          border: 1px solid #d6e1f0;
          position: relative;
          overflow: hidden;
          min-height: 180px;
        }

        .postImageWrap :global(img) {
          object-fit: cover;
        }

        .meta {
          margin: 0;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #5e759b;
          font-weight: 700;
        }

        h2 {
          font-size: 30px;
          line-height: 1.02;
        }

        .postCard p {
          margin: 0;
          color: #4b6187;
          font-size: 15px;
          line-height: 1.45;
        }

        .postLink {
          text-decoration: none;
          color: #1f4f89;
          font-size: 14px;
          font-weight: 700;
          width: fit-content;
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
          .postsGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .blogPage {
            padding: 12px 10px 24px;
          }

          .hero,
          .postCard,
          .ctaBand {
            padding: 14px;
          }

          .hero p:last-child,
          .postCard p {
            font-size: 14px;
          }
        }
      `}</style>
    </main>
  );
}
