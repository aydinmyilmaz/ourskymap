import Replicate from 'replicate';
import sharp from 'sharp';

const BACKGROUND_REMOVER_MODEL =
  '851-labs/background-remover:a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc';
const BACKGROUND_REMOVER_FALLBACK_MODEL =
  'smoretalk/rembg-enhance:4067ee2a58f6c161d434a9c077cfa012820b8e076efa2772aa171e26557da919';

export const MAX_REMOVE_BG_DATA_URL_LENGTH = 15_000_000;
const CHECKER_NEUTRAL_TOLERANCE = 26;
const CHECKER_MIN_CLUSTER_SHARE = 0.12;
const CHECKER_MIN_COMBINED_SHARE = 0.45;
const CHECKER_MIN_LUMA_DIFF = 16;
const CHECKER_MAX_LUMA_DIFF = 140;
const BACKGROUND_MATCH_DISTANCE_SQ = 42 * 42;
const MIN_BACKGROUND_MASK_SHARE = 0.08;
const MAX_PREPROCESS_PIXELS = 2_200_000;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500;

export type RemoveBgInput = {
  imageUrl?: string;
  imageDataUrl?: string;
  source?: string;
  replicateToken?: string;
};

export type RemoveBgResult = {
  imageUrl: string;
};

type ParsedDataUrlImage = {
  mimeType: string;
  base64: string;
};

type Rgb = {
  r: number;
  g: number;
  b: number;
};

export class RemoveBgHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'RemoveBgHttpError';
  }
}

function parseImageDataUrl(value: string): ParsedDataUrlImage | null {
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

function isValidDataUrl(value: string): boolean {
  return parseImageDataUrl(value) !== null;
}

function toImageDataUrl(mimeType: string, bytes: Buffer): string {
  return `data:${mimeType};base64,${bytes.toString('base64')}`;
}

function quantizeColorKey(r: number, g: number, b: number): number {
  const qr = (r >>> 4) & 0x0f;
  const qg = (g >>> 4) & 0x0f;
  const qb = (b >>> 4) & 0x0f;
  return (qr << 8) | (qg << 4) | qb;
}

function dequantizeColor(key: number): Rgb {
  const r = ((key >>> 8) & 0x0f) * 16 + 8;
  const g = ((key >>> 4) & 0x0f) * 16 + 8;
  const b = (key & 0x0f) * 16 + 8;
  return { r, g, b };
}

function luminance(color: Rgb): number {
  return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}

function isNearNeutral(color: Rgb): boolean {
  const min = Math.min(color.r, color.g, color.b);
  const max = Math.max(color.r, color.g, color.b);
  return max - min <= CHECKER_NEUTRAL_TOLERANCE;
}

function rgbDistanceSq(r: number, g: number, b: number, target: Rgb): number {
  const dr = r - target.r;
  const dg = g - target.g;
  const db = b - target.b;
  return dr * dr + dg * dg + db * db;
}

function detectCheckerboardPalette(data: Buffer, width: number, height: number, channels: number): Rgb[] | null {
  if (width < 32 || height < 32) return null;
  const borderThickness = Math.max(4, Math.min(28, Math.round(Math.min(width, height) * 0.03)));
  const hist = new Map<number, number>();
  let sampleCount = 0;

  for (let y = 0; y < height; y += 1) {
    const isBorderY = y < borderThickness || y >= height - borderThickness;
    for (let x = 0; x < width; x += 1) {
      if (!isBorderY && x >= borderThickness && x < width - borderThickness) continue;
      const offset = (y * width + x) * channels;
      const alpha = channels >= 4 ? data[offset + 3] : 255;
      if (alpha < 230) continue;
      const key = quantizeColorKey(data[offset], data[offset + 1], data[offset + 2]);
      hist.set(key, (hist.get(key) ?? 0) + 1);
      sampleCount += 1;
    }
  }

  if (sampleCount < 300 || hist.size < 2) return null;
  const sorted = [...hist.entries()].sort((a, b) => b[1] - a[1]);
  const [top1, top2] = sorted;
  if (!top1 || !top2) return null;

  const share1 = top1[1] / sampleCount;
  const share2 = top2[1] / sampleCount;
  if (share1 < CHECKER_MIN_CLUSTER_SHARE || share2 < CHECKER_MIN_CLUSTER_SHARE) return null;
  if (share1 + share2 < CHECKER_MIN_COMBINED_SHARE) return null;

  const color1 = dequantizeColor(top1[0]);
  const color2 = dequantizeColor(top2[0]);
  if (!isNearNeutral(color1) || !isNearNeutral(color2)) return null;

  const lumaDelta = Math.abs(luminance(color1) - luminance(color2));
  if (lumaDelta < CHECKER_MIN_LUMA_DIFF || lumaDelta > CHECKER_MAX_LUMA_DIFF) return null;

  return [color1, color2];
}

function matteBorderConnectedBackground(input: {
  data: Buffer;
  width: number;
  height: number;
  channels: number;
  palette: Rgb[];
}): { changed: boolean; data: Buffer } {
  const { data, width, height, channels, palette } = input;
  const totalPixels = width * height;
  const visited = new Uint8Array(totalPixels);
  const mask = new Uint8Array(totalPixels);
  const queue = new Uint32Array(totalPixels);
  let queueHead = 0;
  let queueTail = 0;
  let maskCount = 0;

  const isBackgroundPixel = (idx: number): boolean => {
    const offset = idx * channels;
    const alpha = channels >= 4 ? data[offset + 3] : 255;
    if (alpha < 230) return false;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    return (
      rgbDistanceSq(r, g, b, palette[0]) <= BACKGROUND_MATCH_DISTANCE_SQ ||
      rgbDistanceSq(r, g, b, palette[1]) <= BACKGROUND_MATCH_DISTANCE_SQ
    );
  };

  const tryVisit = (idx: number) => {
    if (idx < 0 || idx >= totalPixels) return;
    if (visited[idx]) return;
    visited[idx] = 1;
    if (!isBackgroundPixel(idx)) return;
    mask[idx] = 1;
    queue[queueTail] = idx;
    queueTail += 1;
    maskCount += 1;
  };

  for (let x = 0; x < width; x += 1) {
    tryVisit(x);
    tryVisit((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    tryVisit(y * width);
    tryVisit(y * width + (width - 1));
  }

  while (queueHead < queueTail) {
    const idx = queue[queueHead];
    queueHead += 1;
    const x = idx % width;
    const y = (idx / width) | 0;
    if (x > 0) tryVisit(idx - 1);
    if (x + 1 < width) tryVisit(idx + 1);
    if (y > 0) tryVisit(idx - width);
    if (y + 1 < height) tryVisit(idx + width);
  }

  if (maskCount / totalPixels < MIN_BACKGROUND_MASK_SHARE) {
    return { changed: false, data };
  }

  const output = Buffer.from(data);
  for (let idx = 0; idx < totalPixels; idx += 1) {
    if (!mask[idx]) continue;
    const offset = idx * channels;
    output[offset] = 0;
    output[offset + 1] = 0;
    output[offset + 2] = 0;
    if (channels >= 4) output[offset + 3] = 255;
  }

  return { changed: true, data: output };
}

async function preprocessAiTextDesignDataUrl(imageDataUrl: string): Promise<string> {
  const parsed = parseImageDataUrl(imageDataUrl);
  if (!parsed) return imageDataUrl;

  const inputBytes = Buffer.from(parsed.base64, 'base64');
  if (inputBytes.length === 0) return imageDataUrl;

  const source = sharp(inputBytes, { failOn: 'none' });
  const metadata = await source.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (!width || !height || width * height > MAX_PREPROCESS_PIXELS) {
    return imageDataUrl;
  }

  const { data, info } = await source.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const palette = detectCheckerboardPalette(data, info.width, info.height, info.channels);
  if (!palette) return imageDataUrl;

  const matted = matteBorderConnectedBackground({
    data,
    width: info.width,
    height: info.height,
    channels: info.channels,
    palette
  });
  if (!matted.changed) return imageDataUrl;

  const outputPng = await sharp(matted.data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels
    }
  })
    .png({ compressionLevel: 9 })
    .toBuffer();

  return toImageDataUrl('image/png', outputPng);
}

function isAllowedHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

async function extractOutputUrl(output: unknown): Promise<string | null> {
  if (!output) return null;

  if (typeof output === 'string') {
    return output;
  }

  if (Array.isArray(output)) {
    for (const item of output) {
      const found = await extractOutputUrl(item);
      if (found) return found;
    }
    return null;
  }

  if (typeof output === 'object') {
    const record = output as Record<string, unknown>;
    const directUrl = record.url;
    if (typeof directUrl === 'string') return directUrl;

    if (typeof directUrl === 'function') {
      try {
        const fnResult = await (directUrl as () => unknown)();
        const nested = await extractOutputUrl(fnResult);
        if (nested) return nested;
      } catch {
        // Keep scanning.
      }
    }

    const directHref = record.href;
    if (typeof directHref === 'string') return directHref;

    const nestedKeys = ['output', 'image', 'file', 'files'];
    for (const key of nestedKeys) {
      const found = await extractOutputUrl(record[key]);
      if (found) return found;
    }
  }

  return null;
}

function isTransientError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const msg = (e as { message?: string }).message ?? '';
  return /502|503|504|bad gateway|service unavailable|gateway timeout/i.test(msg);
}

function humanizeReplicateError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e ?? '');
  const stripped = raw.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (/502|bad gateway/i.test(stripped)) {
    return 'Replicate service is temporarily unavailable (502 Bad Gateway). Please try again in a moment.';
  }
  if (/503|service unavailable/i.test(stripped)) {
    return 'Replicate service is temporarily unavailable (503). Please try again in a moment.';
  }
  if (/504|gateway timeout/i.test(stripped)) {
    return 'Replicate request timed out (504). Please try again in a moment.';
  }
  if (!stripped || stripped.length > 300) {
    return 'Background removal failed. Please try again.';
  }
  return stripped;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWithRetry(
  replicate: Replicate,
  model: string,
  input: Record<string, unknown>
): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await replicate.run(model as `${string}/${string}:${string}`, { input });
    } catch (e) {
      lastError = e;
      if (attempt < RETRY_ATTEMPTS && isTransientError(e)) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      break;
    }
  }
  throw lastError;
}

function resolveReplicateToken(input: RemoveBgInput): string {
  const token = (input.replicateToken ?? process.env.REPLICATE_API_TOKEN ?? '').trim();
  if (!token) {
    throw new RemoveBgHttpError(500, 'REPLICATE_API_TOKEN is missing on server.');
  }
  return token;
}

async function resolveImageInput(input: RemoveBgInput): Promise<string> {
  const imageUrlRaw = (input.imageUrl ?? '').trim();
  const imageDataUrlRaw = (input.imageDataUrl ?? '').trim();
  const source = (input.source ?? '').trim().toLowerCase();

  if (imageDataUrlRaw) {
    if (!isValidDataUrl(imageDataUrlRaw)) {
      throw new RemoveBgHttpError(400, 'imageDataUrl must be a valid base64 image data URL.');
    }
    if (imageDataUrlRaw.length > MAX_REMOVE_BG_DATA_URL_LENGTH) {
      throw new RemoveBgHttpError(400, 'imageDataUrl is too large.');
    }
    if (source === 'ai-text-design') {
      try {
        return await preprocessAiTextDesignDataUrl(imageDataUrlRaw);
      } catch {
        return imageDataUrlRaw;
      }
    }
    return imageDataUrlRaw;
  }

  if (imageUrlRaw) {
    if (!isAllowedHttpUrl(imageUrlRaw)) {
      throw new RemoveBgHttpError(400, 'imageUrl must be an http/https URL.');
    }
    return imageUrlRaw;
  }

  throw new RemoveBgHttpError(400, 'imageUrl or imageDataUrl is required.');
}

export async function removeBackgroundImage(input: RemoveBgInput): Promise<RemoveBgResult> {
  const token = resolveReplicateToken(input);
  const imageInput = await resolveImageInput(input);

  try {
    const replicate = new Replicate({ auth: token });
    let output: unknown;
    try {
      output = await runWithRetry(replicate, BACKGROUND_REMOVER_MODEL, {
        image: imageInput
      });
    } catch {
      output = await runWithRetry(replicate, BACKGROUND_REMOVER_FALLBACK_MODEL, {
        image: imageInput
      });
    }

    const outputUrl = await extractOutputUrl(output);
    if (!outputUrl) {
      throw new RemoveBgHttpError(502, 'Replicate output URL could not be resolved.');
    }

    return { imageUrl: outputUrl };
  } catch (e: unknown) {
    if (e instanceof RemoveBgHttpError) {
      throw e;
    }
    throw new RemoveBgHttpError(500, humanizeReplicateError(e));
  }
}
