'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CHECKOUT_DRAFT_KEY, type CheckoutDraft } from '../../lib/checkout';

type PaymentMethod = 'coupon' | 'paypal';

type RedeemResponse = {
  success: boolean;
  message: string;
  orderCode?: string;
  downloadUrl?: string | null;
};

export default function CheckoutPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);
  const [email, setEmail] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('coupon');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CHECKOUT_DRAFT_KEY);
      if (!raw) {
        router.replace('/ourskymap');
        return;
      }
      const parsed = JSON.parse(raw) as CheckoutDraft;
      if (!parsed?.previewSvg || !parsed?.renderRequest || !parsed?.mapData) {
        router.replace('/ourskymap');
        return;
      }
      setDraft(parsed);
    } catch {
      router.replace('/ourskymap');
    }
  }, [router]);

  const canSubmit = useMemo(() => {
    if (paymentMethod !== 'coupon') return false;
    return !!email.trim() && !!couponCode.trim() && !loading;
  }, [couponCode, email, loading, paymentMethod]);

  async function handleCouponSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setLoading(true);
    setError('');
    setInfo('');

    try {
      const res = await fetch('/api/redeem-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: couponCode.trim(),
          email: email.trim(),
          draft
        })
      });
      const data = (await res.json()) as RedeemResponse;
      if (!res.ok || !data.success) {
        setError(data.message || 'Coupon validation failed.');
        return;
      }

      router.push(`/download?orderCode=${encodeURIComponent(data.orderCode || couponCode.trim())}`);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!draft) {
    return <div className="loading">Loading checkout...</div>;
  }

  return (
    <div className="checkoutRoot">
      <div className="starsLayer" />
      <main className="container">
        <section className="left">
          <h1>Your Custom Sky Map</h1>
          <p>Capture your special moment under the stars with our personalized sky maps.</p>
          <div className="previewCard">
            <div className="previewMount" dangerouslySetInnerHTML={{ __html: draft.previewSvg }} />
          </div>
          <ul className="benefits">
            <li>High-quality digital sky map design</li>
            <li>Instant download after purchase</li>
            <li>Customized to your special date and location</li>
          </ul>
        </section>

        <section className="right">
          <h2>Complete Your Order</h2>
          <p className="sub">Enter your details to receive your custom sky map</p>

          <form onSubmit={handleCouponSubmit} className="form">
            <label>
              <span>Email</span>
              <input
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <small>We’ll send your sky map to this email</small>
            </label>

            <div className="field">
              <span>Payment Method</span>
              <div className="methodGrid">
                <button
                  type="button"
                  className={`method ${paymentMethod === 'coupon' ? 'active' : ''}`}
                  onClick={() => {
                    setPaymentMethod('coupon');
                    setInfo('');
                  }}
                >
                  Coupon Code
                </button>
                <button
                  type="button"
                  className={`method ${paymentMethod === 'paypal' ? 'active' : ''}`}
                  onClick={() => {
                    setPaymentMethod('paypal');
                    setInfo('PayPal will be enabled soon. For now, continue with coupon code.');
                  }}
                >
                  PayPal (€8.50)
                </button>
              </div>
            </div>

            {paymentMethod === 'coupon' ? (
              <label>
                <span>Coupon Code</span>
                <input
                  type="text"
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  required
                />
              </label>
            ) : null}

            {error ? <p className="error">{error}</p> : null}
            {info ? <p className="info">{info}</p> : null}

            <button type="submit" className="submitBtn" disabled={!canSubmit}>
              {loading ? 'Processing...' : 'Continue with Coupon'}
            </button>
          </form>

          <p className="terms">
            By completing this order, you agree to our Terms of Service and Privacy Policy.
          </p>
        </section>
      </main>

      <style jsx>{`
        .loading {
          min-height: 100vh;
          display: grid;
          place-items: center;
          font-size: 18px;
          color: #dbe4f4;
          background: #0c1633;
        }
        .checkoutRoot {
          min-height: 100vh;
          background: radial-gradient(1300px 800px at 20% 10%, #16336f 0%, #0c1f46 38%, #091630 100%);
          position: relative;
          color: #eef3ff;
          overflow: hidden;
        }
        .starsLayer {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image: radial-gradient(#ffffff 0.8px, transparent 0.8px);
          background-size: 220px 220px;
          opacity: 0.28;
        }
        .container {
          position: relative;
          z-index: 1;
          width: min(1240px, 94vw);
          margin: 0 auto;
          padding: 64px 0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 44px;
          align-items: start;
        }
        .left h1 {
          margin: 0;
          font-size: clamp(36px, 4vw, 56px);
          line-height: 1.05;
        }
        .left p {
          margin: 14px 0 30px;
          color: #bdcbec;
          font-size: 18px;
          max-width: 620px;
        }
        .previewCard {
          width: min(530px, 100%);
          background: rgba(255, 255, 255, 0.98);
          border: 1px solid rgba(146, 165, 209, 0.48);
          border-radius: 12px;
          padding: 14px;
        }
        .previewMount {
          display: grid;
          place-items: center;
          min-height: 460px;
          overflow: hidden;
        }
        .previewMount :global(svg) {
          max-width: 100%;
          max-height: 580px;
          width: auto;
          height: auto;
          display: block;
        }
        .benefits {
          list-style: none;
          padding: 0;
          margin: 26px 0 0;
          display: grid;
          gap: 10px;
          color: #d7e2ff;
          font-size: 18px;
        }
        .benefits li::before {
          content: '★';
          color: #f5c84f;
          margin-right: 10px;
        }
        .right {
          background: rgba(17, 32, 67, 0.84);
          border: 1px solid rgba(83, 112, 171, 0.5);
          border-radius: 18px;
          padding: 28px;
          backdrop-filter: blur(4px);
          box-shadow: 0 20px 60px rgba(4, 11, 30, 0.45);
        }
        .right h2 {
          margin: 0;
          font-size: 34px;
        }
        .sub {
          margin: 6px 0 22px;
          color: #b5c5e8;
          font-size: 17px;
        }
        .form {
          display: grid;
          gap: 16px;
        }
        label,
        .field {
          display: grid;
          gap: 8px;
        }
        span {
          font-size: 17px;
          font-weight: 600;
        }
        input {
          height: 52px;
          border-radius: 10px;
          border: 1px solid #486392;
          background: #2a3d60;
          color: #f3f7ff;
          padding: 0 14px;
          font-size: 16px;
          outline: none;
        }
        input::placeholder {
          color: #8ea3ca;
        }
        small {
          color: #9fb2d8;
          font-size: 13px;
        }
        .methodGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .method {
          height: 52px;
          border-radius: 10px;
          border: 1px solid #4e648e;
          background: #2b3f62;
          color: #dbe7ff;
          font-size: 16px;
          cursor: pointer;
        }
        .method.active {
          border-color: #5e4df3;
          background: linear-gradient(90deg, #4e38df 0%, #5f44f6 100%);
          color: #ffffff;
        }
        .submitBtn {
          margin-top: 8px;
          height: 54px;
          border-radius: 10px;
          border: 0;
          background: linear-gradient(90deg, #4c36de 0%, #5d42f2 100%);
          color: #fff;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
        }
        .submitBtn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .terms {
          margin: 20px 0 0;
          border-top: 1px solid rgba(120, 146, 194, 0.4);
          padding-top: 16px;
          color: #9fb2d8;
          font-size: 13px;
        }
        .error {
          margin: 0;
          color: #ff8f98;
          font-size: 13px;
        }
        .info {
          margin: 0;
          color: #b9c9ea;
          font-size: 13px;
        }
        @media (max-width: 1080px) {
          .container {
            grid-template-columns: 1fr;
          }
          .previewCard {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
