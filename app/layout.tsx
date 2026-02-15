import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sky Chart Generator',
  description: 'Generate a printable sky chart for any location and time.',
  icons: {
    icon: '/logo_ourskymap_round.png',
    shortcut: '/logo_ourskymap_round.png',
    apple: '/logo_ourskymap_round.png'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Jimmy+Script&family=Prata&family=Signika:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial' }}>
        {children}
      </body>
    </html>
  );
}
