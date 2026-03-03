export function isPayoneerEnabled(): boolean {
  return (process.env.PAYONEER_ENABLED ?? 'false').trim().toLowerCase() === 'true';
}

export type PayoneerCheckoutResult =
  | { enabled: false; message: string }
  | { enabled: true; redirectUrl: string };

export async function createPayoneerCheckoutSession(_args: {
  amount: number;
  currency: 'EUR' | 'USD';
  orderCode: string;
}): Promise<PayoneerCheckoutResult> {
  if (!isPayoneerEnabled()) {
    return {
      enabled: false,
      message: 'Payoneer is not configured for this deployment yet.'
    };
  }

  throw new Error('Payoneer integration is not implemented yet. Keep PAYONEER_ENABLED=false for now.');
}
