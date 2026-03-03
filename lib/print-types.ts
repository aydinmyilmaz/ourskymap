export type PrintSizeKey =
  | '8x12'
  | '11x14'
  | 'a3'
  | '12x12'
  | '12x16'
  | '16x20'
  | 'a2'
  | '18x24'
  | '20x20'
  | '24x32';

export type PrintOptionKey =
  | 'unframed_poster'
  | 'framed_black_wood'
  | 'framed_natural_wood'
  | 'framed_white_wood'
  | 'canvas';

export type PrintCurrency = 'EUR' | 'USD';

export type PrintSizeDefinition = {
  key: PrintSizeKey;
  rank: number;
  label: string;
  minEur: number;
  maxEur: number;
};

export type PrintOptionDefinition = {
  key: PrintOptionKey;
  label: string;
  minEur: number;
  maxEur: number;
};

export type PricingOptionDto = {
  key: string;
  label: string;
  min: number;
  max: number;
};

export type PricingPayload = {
  currency: PrintCurrency;
  sizes: PricingOptionDto[];
  printOptions: PricingOptionDto[];
  quantityOptions: number[];
  estimateNote: string;
};

export type PrintTotals = {
  unit: number;
  subtotal: number;
  shipping: number;
  total: number;
};

export type PrintOrderCheckoutInput = {
  orderCode: string;
  size: PrintSizeKey;
  printOption: PrintOptionKey;
  quantity: number;
  currency: PrintCurrency;
  customerEmail?: string;
  shippingName: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateRegion?: string;
  postalCode: string;
  countryCode: string;
};

export type PrintOrderStatusResponse = {
  success: boolean;
  message?: string;
  printOrderCode?: string;
  sourceOrderCode?: string;
  paymentStatus?: string;
  providerStatus?: string;
  currency?: PrintCurrency;
  total?: number;
  createdAt?: string;
};
