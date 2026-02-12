import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sky Chart Generator',
  description: 'Generate a printable sky chart for any location and time.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body style={{ margin: 0, fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial' }}>
        {children}
      </body>
    </html>
  );
}
