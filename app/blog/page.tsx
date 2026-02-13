const POSTS = [
  {
    title: 'Love in the Stars: How Celestial Art Captures Milestones',
    excerpt:
      'From first dates to anniversaries, personalized sky maps turn memories into meaningful wall art.',
    date: 'December 2025'
  },
  {
    title: 'A New Way to Gift Memories',
    excerpt:
      'Why custom night-sky posters are becoming a popular choice for weddings and birthdays.',
    date: 'August 2024'
  },
  {
    title: 'How to Choose the Best Star Map Layout',
    excerpt:
      'Tips for selecting size, frame, palette and typography for a balanced final print.',
    date: 'May 2024'
  }
];

export default function BlogPage() {
  const pageStyle = { maxWidth: 860, margin: '0 auto', padding: '40px 20px 64px', color: '#121826' } as const;
  const h1Style = { margin: '0 0 8px', fontSize: 34 } as const;
  const introStyle = { margin: '0 0 18px', color: '#5b6476' } as const;
  const postsStyle = { display: 'grid', gap: 14 } as const;
  const postStyle = {
    border: '1px solid #d9e1ec',
    background: '#ffffff',
    borderRadius: 14,
    padding: 16,
    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.05)'
  } as const;
  const dateStyle = {
    margin: '0 0 6px',
    fontSize: 12,
    color: '#73809a',
    textTransform: 'uppercase',
    letterSpacing: '0.06em'
  } as const;
  const h2Style = { margin: '0 0 8px', fontSize: 21, lineHeight: 1.35 } as const;
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
      <h1 style={h1Style}>Blog</h1>
      <p style={introStyle}>Stories, ideas and practical guides for personalized star map design.</p>

      <div style={postsStyle}>
        {POSTS.map((post) => (
          <article style={postStyle} key={post.title}>
            <p style={dateStyle}>{post.date}</p>
            <h2 style={h2Style}>{post.title}</h2>
            <p style={pStyle}>{post.excerpt}</p>
          </article>
        ))}
      </div>

      <a href="/design" style={backStyle}>
        Back to Designer
      </a>
    </main>
  );
}
