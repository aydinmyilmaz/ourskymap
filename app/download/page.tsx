'use client';

import { useEffect, useState } from 'react';
import { buildDevZipBlob, loadDevDownloadDraft, triggerBlobDownload } from '../../lib/dev-download';
import { buildOrderFileToken } from '../../lib/print-size-utils';

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
  const [isDevMode, setIsDevMode] = useState(false);
  const [data, setData] = useState<OrderStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPrintPrompt, setShowPrintPrompt] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('orderCode') || '';
    setIsDevMode(params.get('dev') === '1');
    setOrderCode(code.trim() || '');
  }, []);

  useEffect(() => {
    if (orderCode === null) return;
    if (!orderCode) {
      setLoading(false);
      setData({ success: false, message: 'Missing order code.' });
      return;
    }

    if (isDevMode) {
      const draft = loadDevDownloadDraft();
      if (!draft || draft.orderCode !== orderCode) {
        setData({ success: false, message: 'Missing dev download data. Start again from checkout Dev Quick Download.' });
        setLoading(false);
        return;
      }
      setData({
        success: true,
        orderCode,
        status: 'completed',
        customerEmail: draft.email || null
      });
      setLoading(false);
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
  }, [isDevMode, orderCode]);

  function handleDownloadClick() {
    setShowPrintPrompt(true);
  }

  function handleGoPrintOrder() {
    if (!data?.orderCode) return;
    const devSuffix = isDevMode ? '&dev=1' : '';
    window.location.href = `/print-order?orderCode=${encodeURIComponent(data.orderCode)}${devSuffix}`;
  }

  async function handleDevDownloadClick() {
    if (!data?.orderCode) return;
    const draft = loadDevDownloadDraft();
    if (!draft || draft.orderCode !== data.orderCode) {
      setData({ success: false, message: 'Missing dev draft for download. Go back to checkout and retry.' });
      return;
    }
    const zipBlob = await buildDevZipBlob(draft.previewSvg, draft.orderCode, draft.sourcePrintSize || null);
    const token = buildOrderFileToken(draft.orderCode, draft.sourcePrintSize || null);
    triggerBlobDownload(zipBlob, `ourskymap-${token}.zip`);
    setShowPrintPrompt(true);
  }

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
            {isDevMode ? (
              <button type="button" className="downloadBtn" onClick={() => void handleDevDownloadClick()}>
                Download Files (ZIP)
              </button>
            ) : (
              <a
                href={data.orderCode ? `/api/download-order-file?orderCode=${encodeURIComponent(data.orderCode)}` : '#'}
                className={`downloadBtn ${data.orderCode ? '' : 'disabled'}`}
                onClick={handleDownloadClick}
              >
                Download Files (ZIP)
              </a>
            )}
            <p className="tiny">You can open this page again later with your order code.</p>

            {showPrintPrompt ? (
              <div className="printPrompt">
                <p>Do you also want a physical printout from us?</p>
                <div className="promptActions">
                  <button type="button" onClick={handleGoPrintOrder}>
                    Yes, continue
                  </button>
                  <button type="button" className="ghost" onClick={() => setShowPrintPrompt(false)}>
                    No thanks
                  </button>
                </div>
              </div>
            ) : null}
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
          border: 0;
          cursor: pointer;
        }
        .downloadBtn.disabled {
          opacity: 0.45;
          pointer-events: none;
        }
        .printPrompt {
          margin-top: 16px;
          border: 1px solid #d8deef;
          background: #f7f9ff;
          border-radius: 12px;
          padding: 14px;
        }
        .printPrompt p {
          margin: 0;
          color: #28324a;
          font-size: 15px;
          font-weight: 600;
        }
        .promptActions {
          margin-top: 10px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .promptActions button {
          min-height: 42px;
          border: 0;
          border-radius: 9px;
          background: #1a1e2b;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }
        .promptActions button.ghost {
          background: #e8ecf8;
          color: #253257;
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
