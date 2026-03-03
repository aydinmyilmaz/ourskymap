'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { PrintOrderStatusResponse } from '../../../lib/print-types';

function PrintOrderSuccessPageBody() {
  const search = useSearchParams();
  const printOrderCode = (search.get('printOrderCode') || '').trim();
  const isDevMode = search.get('dev') === '1';
  const sourceOrderCode = (search.get('sourceOrderCode') || '').trim();
  const currency = (search.get('currency') || 'EUR').toUpperCase();
  const total = (search.get('total') || '').trim();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PrintOrderStatusResponse | null>(null);

  useEffect(() => {
    if (!printOrderCode) {
      setData({ success: false, message: 'Missing print order code.' });
      setLoading(false);
      return;
    }

    if (isDevMode) {
      const parsedTotal = Number.parseFloat(total || '0');
      setData({
        success: true,
        printOrderCode,
        sourceOrderCode: sourceOrderCode || 'DEV-ORDER',
        paymentStatus: 'completed_mock',
        providerStatus: 'not_submitted',
        currency: currency === 'USD' ? 'USD' : 'EUR',
        total: Number.isFinite(parsedTotal) ? parsedTotal : 0
      });
      setLoading(false);
      return;
    }

    const run = async () => {
      try {
        const res = await fetch(`/api/print-orders/status?printOrderCode=${encodeURIComponent(printOrderCode)}`, {
          cache: 'no-store'
        });
        const json = (await res.json()) as PrintOrderStatusResponse;
        setData(json);
      } catch {
        setData({ success: false, message: 'Could not load print order status.' });
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [currency, isDevMode, printOrderCode, sourceOrderCode, total]);

  return (
    <div className="wrap">
      <div className="card">
        {loading ? <p>Loading your print order...</p> : null}

        {!loading && data?.success ? (
          <>
            <div className="ok">✓</div>
            <h1>Print Order Saved</h1>
            <p className="meta">Print Order: #{data.printOrderCode}</p>
            <p className="meta">Source Order: #{data.sourceOrderCode}</p>
            <p className="meta">Payment: {data.paymentStatus}</p>
            <p className="meta">Provider: {data.providerStatus}</p>
            <p className="meta">Estimated Total: {data.total?.toFixed(2)} {data.currency}</p>
            <p className="tiny">Payoneer is currently mocked. Your order is stored and ready for future provider integration.</p>
            <div className="actions">
              <a href={`/download?orderCode=${encodeURIComponent(data.sourceOrderCode || '')}${isDevMode ? '&dev=1' : ''}`}>Back to Download</a>
              <a href="/ourskymap">Create New Star Map</a>
            </div>
          </>
        ) : null}

        {!loading && !data?.success ? (
          <>
            <div className="bad">!</div>
            <h1>We couldn’t confirm this print order</h1>
            <p>{data?.message || 'Please try again.'}</p>
            <a href="/ourskymap">Go to Star Map</a>
          </>
        ) : null}
      </div>

      <style jsx>{`
        .wrap {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          background: linear-gradient(150deg, #eef3ff 0%, #f9fbff 100%);
          font-family: 'Signika', ui-sans-serif, system-ui;
        }
        .card {
          width: min(620px, 96vw);
          background: #fff;
          border-radius: 18px;
          border: 1px solid #d8e1f5;
          box-shadow: 0 18px 50px rgba(35, 48, 86, 0.14);
          padding: 30px;
          text-align: center;
        }
        .ok,
        .bad {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          margin: 0 auto 12px;
          font-size: 28px;
          font-weight: 800;
        }
        .ok {
          background: #e7f8eb;
          color: #1f8844;
        }
        .bad {
          background: #fde9e9;
          color: #c02a2a;
        }
        h1 {
          margin: 0;
          font-size: 34px;
        }
        .meta {
          margin: 8px 0 0;
          font-size: 16px;
          color: #2d3857;
        }
        .tiny {
          margin: 14px 0 0;
          font-size: 13px;
          color: #5f6780;
        }
        .actions {
          margin-top: 16px;
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
        }
        a {
          display: inline-flex;
          min-height: 44px;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          padding: 0 16px;
          text-decoration: none;
          background: #1f2535;
          color: #fff;
          font-size: 15px;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}

export default function PrintOrderSuccessPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>Loading...</div>}>
      <PrintOrderSuccessPageBody />
    </Suspense>
  );
}
