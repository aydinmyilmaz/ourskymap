'use client';

import { useEffect, useState } from 'react';

type OrderStatusResponse = {
  success: boolean;
  message?: string;
  orderCode?: string;
  status?: 'pending' | 'completed';
  usedAt?: string | null;
  downloadUrl?: string | null;
  customerEmail?: string | null;
};

export default function DownloadPage() {
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [data, setData] = useState<OrderStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('orderCode') || '';
    setOrderCode(code.trim() || '');
  }, []);

  useEffect(() => {
    if (orderCode === null) return;
    if (!orderCode) {
      setLoading(false);
      setData({ success: false, message: 'Missing order code.' });
      return;
    }
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/order-status?orderCode=${encodeURIComponent(orderCode)}`);
        const json = (await res.json()) as OrderStatusResponse;
        setData(json);
      } catch {
        setData({ success: false, message: 'Could not load your order.' });
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [orderCode]);

  return (
    <div className="wrap">
      <div className="card">
        {loading ? <p>Loading your order...</p> : null}
        {!loading && data?.success ? (
          <>
            <div className="emoji">✓</div>
            <h1>Your Map is Ready!</h1>
            <p className="meta">Order: #{data.orderCode}</p>
            <p className="sub">
              {data.customerEmail ? `A copy is associated with ${data.customerEmail}.` : 'Your custom map file is ready for download.'}
            </p>
            <a
              href={data.orderCode ? `/api/download-order-file?orderCode=${encodeURIComponent(data.orderCode)}` : '#'}
              className={`downloadBtn ${data.orderCode ? '' : 'disabled'}`}
            >
              Download Files (ZIP)
            </a>
            <p className="tiny">You can open this page again later with your order code.</p>
          </>
        ) : null}

        {!loading && !data?.success ? (
          <>
            <div className="emoji">!</div>
            <h1>We couldn’t find your download</h1>
            <p className="sub">{data?.message || 'Please go back and try again.'}</p>
            <a href="/checkout" className="downloadBtn">
              Back to Checkout
            </a>
          </>
        ) : null}
      </div>

      <style jsx>{`
        .wrap {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          background: linear-gradient(140deg, #eef2ff 0%, #f8f8fb 52%, #eef5ff 100%);
        }
        .card {
          width: min(560px, 95vw);
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 20px 50px rgba(18, 28, 48, 0.15);
          padding: 36px 30px;
          text-align: center;
        }
        .emoji {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: #e9f6eb;
          color: #1b7f3d;
          display: grid;
          place-items: center;
          font-size: 34px;
          margin: 0 auto 14px;
          font-weight: 700;
        }
        h1 {
          margin: 0;
          font-size: 34px;
          color: #141821;
        }
        .meta {
          margin: 10px 0 0;
          color: #374157;
          font-size: 17px;
        }
        .sub {
          margin: 10px 0 22px;
          color: #55607a;
          font-size: 16px;
        }
        .downloadBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 52px;
          padding: 0 24px;
          border-radius: 11px;
          background: #171a22;
          color: #fff;
          text-decoration: none;
          font-size: 17px;
          font-weight: 600;
        }
        .downloadBtn.disabled {
          opacity: 0.45;
          pointer-events: none;
        }
        .tiny {
          margin: 14px 0 0;
          color: #7b8395;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}
