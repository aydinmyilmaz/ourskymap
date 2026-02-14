export default function WhatIsStarMapPage() {
  const pageStyle = { maxWidth: 860, margin: '0 auto', padding: '40px 20px 64px', color: '#121826' } as const;
  const heroStyle = { marginBottom: 22 } as const;
  const eyebrowStyle = {
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontSize: 12,
    color: '#586074',
    margin: '0 0 10px'
  } as const;
  const h1Style = { margin: '0 0 12px', fontSize: 34, lineHeight: 1.2 } as const;
  const h2Style = { margin: '0 0 10px', fontSize: 22 } as const;
  const pStyle = { margin: 0, color: '#394150', lineHeight: 1.6 } as const;
  const cardStyle = {
    background: '#f7f9fc',
    border: '1px solid #d8e0ea',
    borderRadius: 16,
    padding: 18,
    marginTop: 14
  } as const;
  const listStyle = { margin: 0, paddingLeft: 20, color: '#2f3848', lineHeight: 1.8 } as const;
  const actionsStyle = { marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' } as const;
  const linkStyle = {
    textDecoration: 'none',
    border: '1px solid #cad4e2',
    background: '#fff',
    color: '#111827',
    borderRadius: 12,
    padding: '10px 14px',
    fontWeight: 600
  } as const;

  return (
    <main style={pageStyle}>
      <section style={heroStyle}>
        <p style={eyebrowStyle}>What is Star Map</p>
        <h1 style={h1Style}>A personalized map of the sky from your special moment.</h1>
        <p style={pStyle}>
          A star map poster recreates how the night sky looked from a selected location, date and time.
          It turns that exact sky into a clean print design that you can personalize with title, names,
          and location text.
        </p>
      </section>

      <section style={cardStyle}>
        <h2 style={h2Style}>How it works</h2>
        <ol style={listStyle}>
          <li>Choose a location and date/time.</li>
          <li>Generate the star map for that moment.</li>
          <li>Customize palette, frame, title and text lines.</li>
          <li>Export and print as a keepsake gift.</li>
        </ol>
      </section>

      <section style={cardStyle}>
        <h2 style={h2Style}>Popular occasions</h2>
        <ul style={listStyle}>
          <li>Weddings and anniversaries</li>
          <li>Birthdays and newborn gifts</li>
          <li>Engagements and first-date memories</li>
          <li>Housewarmings and long-distance keepsakes</li>
        </ul>
      </section>

      <section style={actionsStyle}>
        <a href="/design" style={linkStyle}>
          Open Designer
        </a>
        <a href="/faq" style={linkStyle}>
          Read FAQ
        </a>
      </section>
    </main>
  );
}
