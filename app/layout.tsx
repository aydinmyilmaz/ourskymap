import type { Metadata } from 'next';

const LOCAL_FONT_FACE_CSS = `
@font-face {
  font-family: 'Allura';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/Allura-Regular.ttf') format('truetype');
}
@font-face {
  font-family: 'Great Vibes';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/GreatVibes-Regular.ttf') format('truetype');
}
@font-face {
  font-family: 'Prata';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/Prata-Regular.ttf') format('truetype');
}
@font-face {
  font-family: 'Signika';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/Signika-Regular.ttf') format('truetype');
}
@font-face {
  font-family: 'Signika';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/fonts/Signika-Medium.ttf') format('truetype');
}
@font-face {
  font-family: 'Signika';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/Signika-Bold.ttf') format('truetype');
}
`;

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
        <style dangerouslySetInnerHTML={{ __html: LOCAL_FONT_FACE_CSS }} />
      </head>
      <body style={{ margin: 0, fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial' }}>
        {children}
      </body>
    </html>
  );
}
