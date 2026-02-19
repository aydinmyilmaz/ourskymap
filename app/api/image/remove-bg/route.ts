import { NextResponse } from 'next/server';
import Replicate from 'replicate';

export const runtime = 'nodejs';

const BACKGROUND_REMOVER_MODEL =
  '851-labs/background-remover:a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc';
const BACKGROUND_REMOVER_FALLBACK_MODEL =
  'smoretalk/rembg-enhance:4067ee2a58f6c161d434a9c077cfa012820b8e076efa2772aa171e26557da919';

type RemoveBgRequestBody = {
  imageUrl?: string;
  imageDataUrl?: string;
};

function isValidDataUrl(value: string): boolean {
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value);
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
        // ignore and keep scanning
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

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500;

function isTransientError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const msg = (e as { message?: string }).message ?? '';
  return /502|503|504|bad gateway|service unavailable|gateway timeout/i.test(msg);
}

function humanizeReplicateError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e ?? '');
  // Strip HTML (e.g. "502 Bad Gateway" page body)
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
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
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

export async function POST(req: Request) {
  try {
    const token = (process.env.REPLICATE_API_TOKEN ?? '').trim();
    if (!token) {
      return new NextResponse('REPLICATE_API_TOKEN is missing on server.', { status: 500 });
    }

    const body = (await req.json()) as RemoveBgRequestBody;
    const imageUrlRaw = (body.imageUrl ?? '').trim();
    const imageDataUrlRaw = (body.imageDataUrl ?? '').trim();

    let imageInput = '';
    if (imageDataUrlRaw) {
      if (!isValidDataUrl(imageDataUrlRaw)) {
        return new NextResponse('imageDataUrl must be a valid base64 image data URL.', { status: 400 });
      }
      if (imageDataUrlRaw.length > 15_000_000) {
        return new NextResponse('imageDataUrl is too large.', { status: 400 });
      }
      imageInput = imageDataUrlRaw;
    } else if (imageUrlRaw) {
      if (!isAllowedHttpUrl(imageUrlRaw)) {
        return new NextResponse('imageUrl must be an http/https URL.', { status: 400 });
      }
      imageInput = imageUrlRaw;
    } else {
      return new NextResponse('imageUrl or imageDataUrl is required.', { status: 400 });
    }

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
      return new NextResponse('Replicate output URL could not be resolved.', { status: 502 });
    }

    return NextResponse.json({ imageUrl: outputUrl });
  } catch (e: unknown) {
    return new NextResponse(humanizeReplicateError(e), { status: 500 });
  }
}
