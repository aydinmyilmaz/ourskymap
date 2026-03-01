import { NextResponse } from 'next/server';
import { RemoveBgHttpError, removeBackgroundImage } from '../../../../lib/image/removeBg';

export const runtime = 'nodejs';

type RemoveBgRequestBody = {
  imageUrl?: string;
  imageDataUrl?: string;
  source?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RemoveBgRequestBody;
    const result = await removeBackgroundImage({
      imageUrl: body.imageUrl,
      imageDataUrl: body.imageDataUrl,
      source: body.source
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    if (e instanceof RemoveBgHttpError) {
      return new NextResponse(e.message, { status: e.status });
    }
    const message = e instanceof Error ? e.message : 'Background removal failed. Please try again.';
    return new NextResponse(message, { status: 500 });
  }
}
