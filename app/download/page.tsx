'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DownloadPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderCode = (params.get('orderCode') || '').trim();
    const isDev = params.get('dev') === '1';

    if (!orderCode) {
      router.replace('/checkout');
      return;
    }

    const devSuffix = isDev ? '&dev=1' : '';
    router.replace(`/print-order?orderCode=${encodeURIComponent(orderCode)}${devSuffix}`);
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'Signika, ui-sans-serif, system-ui' }}>
      Redirecting to print options...
    </div>
  );
}
