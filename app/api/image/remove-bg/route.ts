import { NextResponse } from 'next/server';
import Replicate from 'replicate';

export const runtime = 'nodejs';

const BACKGROUND_REMOVER_MODEL =
  '851-labs/background-remover:a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc';

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
    const output = await replicate.run(BACKGROUND_REMOVER_MODEL, {
      input: {
        image: imageInput
      }
    });

    const outputUrl = await extractOutputUrl(output);
    if (!outputUrl) {
      return new NextResponse('Replicate output URL could not be resolved.', { status: 502 });
    }

    return NextResponse.json({ imageUrl: outputUrl });
  } catch (e: any) {
    return new NextResponse(e?.message ?? 'Background removal failed.', { status: 500 });
  }
}
