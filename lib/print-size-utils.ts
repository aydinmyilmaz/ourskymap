import type { PrintSizeKey } from './print-types';

const SUPPORTED_PRINT_SIZES: PrintSizeKey[] = [
  '8x12',
  '11x14',
  'a3',
  '12x12',
  '12x16',
  '16x20',
  'a2',
  '18x24',
  '20x20',
  '24x32'
];

const DESIGN_TO_PRINT_SIZE: Record<string, PrintSizeKey> = {
  'us-letter': '8x12',
  a4: '8x12',
  '11x14': '11x14',
  a3: 'a3',
  '12x12': '12x12',
  '12x16': '12x16',
  '16x20': '16x20',
  a2: 'a2',
  '18x24': '18x24',
  '20x20': '20x20',
  a1: '24x32',
  '24x32': '24x32'
};

export function mapDesignSizeToPrintSize(size: string | null | undefined): PrintSizeKey | null {
  const key = (size || '').trim().toLowerCase();
  if (!key) return null;
  return DESIGN_TO_PRINT_SIZE[key] ?? null;
}

export function isPrintSizeKey(value: string | null | undefined): value is PrintSizeKey {
  return SUPPORTED_PRINT_SIZES.includes((value || '').trim().toLowerCase() as PrintSizeKey);
}

export function parsePrintSizeFromZipName(input: string | null | undefined): PrintSizeKey | null {
  const raw = (input || '').trim();
  if (!raw) return null;
  let decoded = decodeURIComponent(raw);
  try {
    const url = new URL(decoded);
    decoded = url.pathname;
  } catch {
    // Input may already be a plain path/filename.
  }
  decoded = decoded.toLowerCase();
  const match = decoded.match(/(?:8x12|11x14|a3|12x12|12x16|16x20|a2|18x24|20x20|24x32)-\d+\.(?:zip|svg|png|pdf)$/);
  if (!match) return null;
  const [token] = match;
  const sizeToken = token.replace(/-\d+\.(?:zip|svg|png|pdf)$/, '');
  return isPrintSizeKey(sizeToken) ? sizeToken : null;
}

export function buildOrderFileToken(orderCode: string, size: PrintSizeKey | null): string {
  const safeCode = orderCode.replace(/[^a-zA-Z0-9_-]/g, '_');
  return size ? `${safeCode}-${size}` : safeCode;
}
