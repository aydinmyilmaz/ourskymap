import type {
  PricingPayload,
  PrintCurrency,
  PrintOptionDefinition,
  PrintOptionKey,
  PrintSizeDefinition,
  PrintSizeKey,
  PrintTotals
} from './print-types';

export const PRINT_SIZE_OPTIONS: PrintSizeDefinition[] = [
  { key: '8x12', rank: 0, label: '8x12" (A4 21x29.7cm) (€11,50 - €63,68)', minEur: 11.5, maxEur: 63.68 },
  { key: '11x14', rank: 1, label: '11x14" (27x35cm) (€11,50 - €78,42)', minEur: 11.5, maxEur: 78.42 },
  { key: 'a3', rank: 2, label: 'A3 29.7x42cm (€11,50 - €84,50)', minEur: 11.5, maxEur: 84.5 },
  { key: '12x12', rank: 3, label: '12x12" (30x30cm) (€11,50 - €71,56)', minEur: 11.5, maxEur: 71.56 },
  { key: '12x16', rank: 4, label: '12x16" (30x40cm) (€11,50 - €80,19)', minEur: 11.5, maxEur: 80.19 },
  { key: '16x20', rank: 5, label: '16x20" (40x50cm) (€11,50 - €100,94)', minEur: 11.5, maxEur: 100.94 },
  { key: 'a2', rank: 6, label: 'A2 42x59.4cm (€11,50 - €120,29)', minEur: 11.5, maxEur: 120.29 },
  { key: '18x24', rank: 7, label: '18x24" (45x60) (€11,50 - €120,29)', minEur: 11.5, maxEur: 120.29 },
  { key: '20x20', rank: 8, label: '20x20" (50x50cm) (€11,50 - €122,05)', minEur: 11.5, maxEur: 122.05 },
  { key: '24x32', rank: 9, label: '24x32" (60x80cm) (€11,50 - €172,17)', minEur: 11.5, maxEur: 172.17 }
];

export const PRINT_OPTION_OPTIONS: PrintOptionDefinition[] = [
  { key: 'unframed_poster', label: 'Unframed Poster (€33,61 - €63,68)', minEur: 33.61, maxEur: 63.68 },
  { key: 'framed_black_wood', label: 'Framed- Black Wood (€63,68 - €172,17)', minEur: 63.68, maxEur: 172.17 },
  { key: 'framed_natural_wood', label: 'Framed-Natural Wood (€63,68 - €172,17)', minEur: 63.68, maxEur: 172.17 },
  { key: 'framed_white_wood', label: 'Framed-White Wood (€63,68 - €172,17)', minEur: 63.68, maxEur: 172.17 },
  { key: 'canvas', label: 'Canvas (€63,68 - €172,17)', minEur: 63.68, maxEur: 172.17 }
];

const USD_RATE = 1.08;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function asCurrency(valueEur: number, currency: PrintCurrency): number {
  if (currency === 'USD') return roundMoney(valueEur * USD_RATE);
  return roundMoney(valueEur);
}

function interpolate(min: number, max: number, ratio: number): number {
  return min + (max - min) * ratio;
}

export function parsePrintCurrency(input: string | null | undefined): PrintCurrency {
  return input?.toUpperCase() === 'USD' ? 'USD' : 'EUR';
}

export function formatMoney(value: number, currency: PrintCurrency): string {
  if (currency === 'USD') {
    return `$${value.toFixed(2)}`;
  }
  return `€${value.toFixed(2).replace('.', ',')}`;
}

export function calculateEstimatedUnitPriceEur(size: PrintSizeKey, option: PrintOptionKey): number {
  const sizeMeta = PRINT_SIZE_OPTIONS.find((item) => item.key === size) ?? PRINT_SIZE_OPTIONS[0];
  const maxRank = Math.max(1, PRINT_SIZE_OPTIONS.length - 1);
  const ratio = sizeMeta.rank / maxRank;

  if (option === 'unframed_poster') {
    return roundMoney(interpolate(33.61, 63.68, ratio));
  }
  return roundMoney(Math.max(63.68, sizeMeta.maxEur));
}

export function calculatePrintTotals(args: {
  size: PrintSizeKey;
  option: PrintOptionKey;
  quantity: number;
  currency: PrintCurrency;
}): PrintTotals {
  const safeQuantity = Number.isFinite(args.quantity) ? Math.min(50, Math.max(1, Math.floor(args.quantity))) : 1;
  const unitEur = calculateEstimatedUnitPriceEur(args.size, args.option);
  const shippingEur = safeQuantity > 1 ? 6.9 : 4.9;
  const unit = asCurrency(unitEur, args.currency);
  const shipping = asCurrency(shippingEur, args.currency);
  const subtotal = roundMoney(unit * safeQuantity);
  const total = roundMoney(subtotal + shipping);

  return {
    unit,
    subtotal,
    shipping,
    total
  };
}

export function buildPricingPayload(currency: PrintCurrency): PricingPayload {
  return {
    currency,
    sizes: PRINT_SIZE_OPTIONS.map((size) => ({
      key: size.key,
      label: currency === 'EUR' ? size.label : `${size.key} (${formatMoney(asCurrency(size.minEur, currency), currency)} - ${formatMoney(asCurrency(size.maxEur, currency), currency)})`,
      min: asCurrency(size.minEur, currency),
      max: asCurrency(size.maxEur, currency)
    })),
    printOptions: PRINT_OPTION_OPTIONS.map((option) => ({
      key: option.key,
      label:
        currency === 'EUR'
          ? option.label
          : `${option.key.replaceAll('_', ' ').toUpperCase()} (${formatMoney(asCurrency(option.minEur, currency), currency)} - ${formatMoney(asCurrency(option.maxEur, currency), currency)})`,
      min: asCurrency(option.minEur, currency),
      max: asCurrency(option.maxEur, currency)
    })),
    quantityOptions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    estimateNote: 'Estimated total. Final exact pricing table will be applied later.'
  };
}
