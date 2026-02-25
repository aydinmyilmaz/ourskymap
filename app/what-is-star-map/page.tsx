import styles from './page.module.css';

const features = [
  {
    title: 'Precise Location',
    text: 'Enter any city in the world and we render the exact sky alignment for that place.'
  },
  {
    title: 'Moment in Time',
    text: 'Pick any date and time, past or future, and freeze that celestial moment forever.'
  },
  {
    title: 'Heartfelt Message',
    text: 'Personalize your design with names, title and a meaningful line that tells your story.'
  }
];

const testimonials = [
  '"The print came out amazing and the quality felt premium. It became our favorite wall piece."',
  '"Fast delivery, beautiful design and very easy customization. Perfect gift for anniversaries."',
  '"I ordered one for my sister and she cried when she opened it. Highly recommended."'
];

const faq = [
  {
    q: 'Are the sky maps astronomically accurate?',
    a: 'Yes. We use real sky data to display stars and constellations for your selected location, date and time.'
  },
  {
    q: 'What information do I need to provide?',
    a: 'Only a location and date. Time is optional, and you can add title, names and custom text lines.'
  },
  {
    q: 'How are the files delivered?',
    a: 'After checkout you can download high-quality digital files instantly. A copy can also be emailed.'
  },
  {
    q: 'Can I create one for a future date?',
    a: 'Absolutely. You can generate designs for past, present or future moments.'
  }
];

export default function WhatIsStarMapPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>What is StarMap?</p>
          <h1>
            Written in the stars,
            <br />
            <span>Your core memories.</span>
          </h1>
          <p>
            Capture the celestial beauty of your most cherished moments with bespoke sky maps, showing
            the exact alignment of stars when your story began.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryBtn} href="/ourskymap">
              Create Your StarMap
            </a>
            <div className={styles.rating}>4.9/5 from 200+ reviews</div>
          </div>
        </div>
        <div className={styles.heroOrbWrap} aria-hidden>
          <div className={styles.heroOrb} />
        </div>
      </section>

      <section className={styles.centerIntro}>
        <h2>
          What is a <span>StarMap?</span>
        </h2>
        <p>
          A sky map is a unique representation of the night sky from a specific place and time. Whether
          it marks when you met, got married, or welcomed new life, it turns that exact sky into a
          timeless keepsake.
        </p>
      </section>

      <section className={styles.features}>
        {features.map((item) => (
          <article key={item.title} className={styles.featureCard}>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </section>

      <section className={styles.testimonials}>
        {testimonials.map((quote) => (
          <blockquote key={quote} className={styles.quoteCard}>
            {quote}
          </blockquote>
        ))}
      </section>

      <section className={styles.journey}>
        <h2>
          The <span>Journey</span>
        </h2>
        <p>Creating your personalized celestial keepsake is simple and magical.</p>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <h4>Select Your Moment</h4>
            <p>Choose the date, time, and location that matter most.</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <h4>Customize Your Design</h4>
            <p>Pick style, palette, frame and typography for your story.</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <h4>Receive Your Keepsake</h4>
            <p>Download your print-ready file instantly after checkout.</p>
          </div>
        </div>
      </section>

      <section className={styles.faq}>
        <h2>
          Questions &amp; <span>Answers</span>
        </h2>
        {faq.map((item) => (
          <article key={item.q} className={styles.faqItem}>
            <h3>{item.q}</h3>
            <p>{item.a}</p>
          </article>
        ))}
      </section>

      <section className={styles.bottomCta}>
        <h2>Your moment deserves a sky of its own.</h2>
        <div className={styles.heroActions}>
          <a className={styles.primaryBtn} href="/ourskymap">
            Start Designing
          </a>
          <a className={styles.ghostBtn} href="/faq">
            Read FAQ
          </a>
        </div>
      </section>
    </main>
  );
}
