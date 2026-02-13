const FAQS = [
  {
    q: 'What is a star map poster?',
    a: 'It is a custom sky map generated for a specific date, time and location.'
  },
  {
    q: 'Can I choose any location?',
    a: 'Yes. You can search city names or enter latitude and longitude directly.'
  },
  {
    q: 'Do I need exact time?',
    a: 'No. Midnight works, but exact time improves accuracy for your moment.'
  },
  {
    q: 'Can I change fonts and colors?',
    a: 'Yes. You can select palette, typography, frame options and text content.'
  },
  {
    q: 'Is this suitable for gifts?',
    a: 'Yes. Star maps are commonly used for weddings, anniversaries and birthdays.'
  }
];

export default function FaqPage() {
  const pageStyle = { maxWidth: 860, margin: '0 auto', padding: '40px 20px 64px', color: '#121826' } as const;
  const h1Style = { margin: '0 0 8px', fontSize: 34 } as const;
  const introStyle = { margin: '0 0 18px', color: '#5b6476' } as const;
  const listStyle = { display: 'grid', gap: 12 } as const;
  const cardStyle = { border: '1px solid #d9e1ec', background: '#f8fafe', borderRadius: 14, padding: 16 } as const;
  const h2Style = { margin: '0 0 8px', fontSize: 19 } as const;
  const pStyle = { margin: 0, color: '#374256', lineHeight: 1.55 } as const;
  const backStyle = {
    marginTop: 18,
    display: 'inline-block',
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
      <h1 style={h1Style}>Frequently Asked Questions</h1>
      <p style={introStyle}>Quick answers about creating and customizing star map posters.</p>

      <div style={listStyle}>
        {FAQS.map((item) => (
          <article style={cardStyle} key={item.q}>
            <h2 style={h2Style}>{item.q}</h2>
            <p style={pStyle}>{item.a}</p>
          </article>
        ))}
      </div>

      <a href="/design" style={backStyle}>
        Back to Designer
      </a>
    </main>
  );
}
