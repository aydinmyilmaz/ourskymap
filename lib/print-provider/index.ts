export type PrintProviderStatus = 'not_submitted' | 'submitted' | 'failed';

export type PrintProviderSubmitInput = {
  printOrderCode: string;
  artworkUrl: string;
  size: string;
  option: string;
  quantity: number;
};

export type PrintProviderSubmitResult = {
  providerOrderId: string | null;
  providerStatus: PrintProviderStatus;
};

export interface PrintProvider {
  submitOrder(input: PrintProviderSubmitInput): Promise<PrintProviderSubmitResult>;
}

export class NoopPrintProvider implements PrintProvider {
  async submitOrder(_input: PrintProviderSubmitInput): Promise<PrintProviderSubmitResult> {
    return {
      providerOrderId: null,
      providerStatus: 'not_submitted'
    };
  }
}

export function getPrintProvider(): PrintProvider {
  return new NoopPrintProvider();
}
