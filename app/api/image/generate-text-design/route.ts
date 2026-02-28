import { readFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DEFAULT_MODELS = ['gemini-3-pro-image-preview', 'gemini-3.1-flash-image-preview'] as const;
const DEFAULT_MODEL = 'gemini-3.1-flash-image-preview';
const PROMPT_FILE_URL = new URL('../../../../prompts/gemini_text_design.txt', import.meta.url);
const PROMPT_SOURCE = 'prompts/gemini_text_design.txt';
const MAX_DATA_URL_LENGTH = 15_000_000;
const DEFAULT_COLOR_KEY = 'purple_gloss';

const MODEL_COST_1K_USD: Record<string, number> = {
  'gemini-3-pro-image-preview': 0.1344,
  'gemini-3.1-flash-image-preview': 0.0672
};

const MODEL_TOKENS_1K: Record<string, number> = {
  'gemini-3-pro-image-preview': 1120,
  'gemini-3.1-flash-image-preview': 1120
};

type GenerateTextDesignRequestBody = {
  model?: string;
  targetText?: string;
  colorKey?: string;
  referenceImageDataUrl?: string;
};

type ColorOption = {
  key: string;
  label: string;
  prompt: string;
};

type DataUrlImage = {
  mimeType: string;
  base64: string;
};

const COLOR_OPTIONS: ColorOption[] = [
  {
    key: 'purple_gloss',
    label: 'Purple Gloss',
    prompt:
      'Use a deep glossy purple palette: dark violet base, rich mid-purple body, and soft lavender/white highlight band. Keep white edge stroke and white glow.'
  },
  {
    key: 'royal_blue_gloss',
    label: 'Royal Blue',
    prompt:
      'Use a glossy royal blue palette: deep navy base, cobalt/royal blue midtones, and icy blue-white highlight band. Keep white edge stroke and white glow.'
  },
  {
    key: 'crimson_red_gloss',
    label: 'Crimson Red',
    prompt:
      'Use a glossy crimson palette: deep burgundy base, vivid crimson midtones, and soft pink-white highlight band. Keep white edge stroke and white glow.'
  },
  {
    key: 'emerald_green_gloss',
    label: 'Emerald Green',
    prompt:
      'Use a glossy emerald palette: deep forest base, emerald midtones, and mint-white highlight band. Keep white edge stroke and white glow.'
  },
  {
    key: 'gold_amber_gloss',
    label: 'Gold Amber',
    prompt:
      'Use a glossy gold/amber palette: dark bronze base, amber/gold midtones, and pale champagne highlight band. Keep white edge stroke and white glow.'
  },
  {
    key: 'black_silver_gloss',
    label: 'Black Silver',
    prompt:
      'Use a glossy monochrome palette: near-black base, charcoal/silver midtones, and bright silver-white highlight band. Keep white edge stroke and white glow.'
  }
];

function parseCsvModels(raw: string): string[] {
  return [...new Set(raw.split(',').map((item) => item.trim()).filter(Boolean))];
}

function getAllowedModels(): string[] {
  const fromEnv = parseCsvModels(process.env.GEMINI_IMAGE_MODELS ?? '');
  return fromEnv.length > 0 ? fromEnv : [...DEFAULT_MODELS];
}

function getDefaultModel(allowedModels: string[]): string {
  const envDefault = (process.env.GEMINI_IMAGE_DEFAULT_MODEL ?? '').trim();
  if (envDefault && allowedModels.includes(envDefault)) return envDefault;
  if (allowedModels.includes(DEFAULT_MODEL)) return DEFAULT_MODEL;
  return allowedModels[0] ?? DEFAULT_MODEL;
}

function getDefaultColorKey(): string {
  const envDefault = (process.env.GEMINI_TEXT_DESIGN_DEFAULT_COLOR ?? '').trim();
  if (envDefault && COLOR_OPTIONS.some((option) => option.key === envDefault)) return envDefault;
  if (COLOR_OPTIONS.some((option) => option.key === DEFAULT_COLOR_KEY)) return DEFAULT_COLOR_KEY;
  return COLOR_OPTIONS[0]?.key ?? DEFAULT_COLOR_KEY;
}

function resolveColorOption(key: string): ColorOption {
  const requested = key.trim();
  if (requested) {
    const found = COLOR_OPTIONS.find((option) => option.key === requested);
    if (found) return found;
  }
  const fallbackKey = getDefaultColorKey();
  return COLOR_OPTIONS.find((option) => option.key === fallbackKey) ?? COLOR_OPTIONS[0];
}

function parseDataUrlImage(value: string): DataUrlImage | null {
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    base64: match[2]
  };
}

function humanizeGeminiError(status: number, bodyText: string): string {
  const compact = bodyText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (status === 401 || status === 403) {
    return 'Gemini API key is invalid or missing permissions.';
  }
  if (status === 429) {
    return 'Gemini rate limit reached. Please try again shortly.';
  }
  if (status >= 500) {
    return 'Gemini service is temporarily unavailable. Please retry.';
  }
  if (!compact) {
    return `Gemini request failed with status ${status}.`;
  }
  return compact.length > 320 ? compact.slice(0, 320) : compact;
}

function extractGeneratedImageDataUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload as Record<string, unknown>;
  const candidates = Array.isArray(root.candidates) ? root.candidates : [];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const content = (candidate as Record<string, unknown>).content;
    if (!content || typeof content !== 'object') continue;
    const parts = Array.isArray((content as Record<string, unknown>).parts)
      ? ((content as Record<string, unknown>).parts as unknown[])
      : [];

    for (const part of parts) {
      if (!part || typeof part !== 'object') continue;
      const record = part as Record<string, unknown>;
      const inlineData = (record.inlineData ?? record.inline_data) as Record<string, unknown> | undefined;
      if (!inlineData) continue;
      const mimeType = String(inlineData.mimeType ?? inlineData.mime_type ?? '').trim();
      const data = String(inlineData.data ?? '').trim();
      if (!mimeType.startsWith('image/') || !data) continue;
      return `data:${mimeType};base64,${data}`;
    }
  }

  return null;
}

async function loadPromptTemplate(): Promise<string> {
  return readFile(PROMPT_FILE_URL, 'utf8');
}

function buildPrompt(template: string, targetText: string, colorPrompt: string): string {
  let prompt = template;
  if (prompt.includes('[TARGET_TEXT]')) {
    prompt = prompt.replace(/\[TARGET_TEXT\]/g, targetText);
  } else {
    prompt = `${prompt.trim()}\n\nReplace the text with: ${targetText}`;
  }

  if (prompt.includes('[COLOR_SCHEME]')) {
    prompt = prompt.replace(/\[COLOR_SCHEME\]/g, colorPrompt);
  } else {
    prompt = `${prompt.trim()}\n\nColor scheme:\n${colorPrompt}`;
  }
  return prompt;
}

export async function GET() {
  const allowedModels = getAllowedModels();
  const defaultModel = getDefaultModel(allowedModels);
  const defaultColorKey = getDefaultColorKey();
  return NextResponse.json({
    models: allowedModels,
    defaultModel,
    colorOptions: COLOR_OPTIONS.map(({ key, label }) => ({ key, label })),
    defaultColorKey,
    resolution: '1024x1024',
    cost1kUsdByModel: MODEL_COST_1K_USD,
    tokens1kByModel: MODEL_TOKENS_1K
  });
}

export async function POST(req: Request) {
  try {
    const apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
    if (!apiKey) {
      return new NextResponse('GEMINI_API_KEY is missing on server.', { status: 500 });
    }

    const body = (await req.json()) as GenerateTextDesignRequestBody;
    const allowedModels = getAllowedModels();
    const defaultModel = getDefaultModel(allowedModels);
    const model = (body.model ?? defaultModel).trim();
    const colorOption = resolveColorOption(body.colorKey ?? getDefaultColorKey());
    if (!allowedModels.includes(model)) {
      return new NextResponse(`Model is not allowed. Allowed: ${allowedModels.join(', ')}`, { status: 400 });
    }

    const targetText = (body.targetText ?? '').trim();
    if (!targetText) {
      return new NextResponse('targetText is required.', { status: 400 });
    }
    if (targetText.length > 120) {
      return new NextResponse('targetText is too long (max 120 chars).', { status: 400 });
    }

    const referenceImageDataUrl = (body.referenceImageDataUrl ?? '').trim();
    if (!referenceImageDataUrl) {
      return new NextResponse('referenceImageDataUrl is required.', { status: 400 });
    }
    if (referenceImageDataUrl.length > MAX_DATA_URL_LENGTH) {
      return new NextResponse('referenceImageDataUrl is too large.', { status: 400 });
    }
    const parsedReferenceImage = parseDataUrlImage(referenceImageDataUrl);
    if (!parsedReferenceImage) {
      return new NextResponse('referenceImageDataUrl must be a valid base64 image data URL.', { status: 400 });
    }

    let promptTemplate = '';
    try {
      promptTemplate = await loadPromptTemplate();
    } catch {
      return new NextResponse('Prompt file could not be loaded.', { status: 500 });
    }
    const prompt = buildPrompt(promptTemplate, targetText, colorOption.prompt);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: parsedReferenceImage.mimeType,
                      data: parsedReferenceImage.base64
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              responseModalities: ['IMAGE']
            }
          }),
          signal: controller.signal
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    const responseText = await response.text();
    if (!response.ok) {
      return new NextResponse(humanizeGeminiError(response.status, responseText), { status: 502 });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(responseText) as unknown;
    } catch {
      return new NextResponse('Gemini response is not valid JSON.', { status: 502 });
    }

    const generatedImageDataUrl = extractGeneratedImageDataUrl(payload);
    if (!generatedImageDataUrl) {
      return new NextResponse('Gemini did not return an image output.', { status: 502 });
    }

    return NextResponse.json({
      modelUsed: model,
      colorKeyUsed: colorOption.key,
      promptSource: PROMPT_SOURCE,
      resolution: '1024x1024',
      estimatedCostUsd: MODEL_COST_1K_USD[model] ?? null,
      estimatedTokens: MODEL_TOKENS_1K[model] ?? null,
      imageDataUrl: generatedImageDataUrl
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Text design generation failed.';
    if (/aborted|abort/i.test(message)) {
      return new NextResponse('Gemini request timed out.', { status: 504 });
    }
    return new NextResponse(message, { status: 500 });
  }
}
