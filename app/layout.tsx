import type { Metadata } from 'next';
import { buildLocalFontFaceCss } from '../lib/local-font-assets';

const LOCAL_FONT_FACE_CSS = buildLocalFontFaceCss();

export const metadata: Metadata = {
  title: 'MementoGifts',
  description: 'MementoGifts personalized design studio for star maps, city maps, soundwave, vinyl, and image products.',
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
