import { readFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';
import Replicate from 'replicate';
import sharp from 'sharp';
import { MAX_REMOVE_BG_DATA_URL_LENGTH, RemoveBgHttpError, removeBackgroundImage } from '../../../../lib/image/removeBg';

export const runtime = 'nodejs';

const DEFAULT_GEMINI_MODELS = [
  'gemini-3-pro-image-preview',
  'gemini-3.1-flash-image-preview'
] as const;
const DISABLED_GEMINI_MODELS = new Set(['gemini-2.5-flash-image']);
const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-image-preview';
const GEMINI_BASE_ASPECT_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'] as const;
const GEMINI_FLASH_31_EXTRA_ASPECT_RATIOS = ['1:4', '4:1', '1:8', '8:1'] as const;
const GEMINI_IMAGE_SIZES_ALL = ['1K', '2K', '4K'] as const;
const GEMINI_IMAGE_SIZES_FLASH_31 = ['512px', ...GEMINI_IMAGE_SIZES_ALL] as const;
const DEFAULT_GEMINI_ASPECT_RATIO = '1:1';
const DEFAULT_GEMINI_IMAGE_SIZE = '1K';
const DEFAULT_REPLICATE_MODELS = ['black-forest-labs/flux-2-pro', 'bytedance/seedream-4'] as const;
const DEFAULT_REPLICATE_MODEL = 'black-forest-labs/flux-2-pro';
const PROMPT_FILE_URL = new URL('../../../../prompts/gemini_mockup_generate.txt', import.meta.url);
const PROMPT_SOURCE = 'prompts/gemini_mockup_generate.txt';
const MAX_PROMPT_LENGTH = 1500;
const MAX_FETCH_IMAGE_BYTES = 10_500_000;
const REQUEST_TIMEOUT_MS = 120_000;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500;
const GEMINI_MAX_IMAGE_SIDE_PX = 1536;

type PlacementPresetKey = 'center_chest' | 'full_front' | 'left_chest' | 'upper_center';
type PlacementMode = 'preset' | 'custom_rect';
type MockupProvider = 'gemini' | 'replicate';

type PlacementPreset = {
  key: PlacementPresetKey;
  label: string;
  hint: string;
};

type PlacementRect = {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
};

type GenerateMockupRequestBody = {
  provider?: string;
  model?: string;
  prompt?: string;
  designImageDataUrl?: string;
  sceneImageDataUrl?: string;
  aspectRatio?: string;
  imageSize?: string;
  placementMode?: PlacementMode;
  placementPreset?: PlacementPresetKey;
  placementRect?: PlacementRect;
  cleanDesignBackground?: boolean;
};

type DataUrlImage = {
  mimeType: string;
  base64: string;
};

class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
  }
}

const PLACEMENT_PRESETS: PlacementPreset[] = [
  {
    key: 'center_chest',
    label: 'Center Chest',
    hint: 'Place the design in a centered chest area, medium size, balanced and realistic.'
  },
  {
    key: 'full_front',
    label: 'Full Front',
    hint: 'Place the design large on the full front area of the product while keeping natural perspective.'
  },
  {
    key: 'left_chest',
    label: 'Left Chest',
    hint: 'Place the design on the left chest as a small logo print, realistic scale.'
  },
  {
    key: 'upper_center',
    label: 'Upper Center',
    hint: 'Place the design on the upper-center front, slightly above chest center.'
  }
];

const DEFAULT_PLACEMENT_PRESET: PlacementPresetKey = 'center_chest';

function parseCsvModels(raw: string): string[] {
  return [...new Set(raw.split(',').map((item) => item.trim()).filter(Boolean))];
}

function getGeminiAllowedModels(): string[] {
  const fromEnv = parseCsvModels(process.env.GEMINI_MOCKUP_MODELS ?? '');
  const merged = [...new Set([...fromEnv, ...DEFAULT_GEMINI_MODELS])];
  const filtered = merged.filter((model) => !DISABLED_GEMINI_MODELS.has(model));
  return filtered.length > 0 ? filtered : [...DEFAULT_GEMINI_MODELS];
}

function getGeminiDefaultModel(allowedModels: string[]): string {
  const envDefault = (process.env.GEMINI_MOCKUP_DEFAULT_MODEL ?? '').trim();
  if (envDefault && allowedModels.includes(envDefault)) return envDefault;
  if (allowedModels.includes(DEFAULT_GEMINI_MODEL)) return DEFAULT_GEMINI_MODEL;
  return allowedModels[0] ?? DEFAULT_GEMINI_MODEL;
}

function getGeminiAspectRatiosByModel(allowedModels: string[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const model of allowedModels) {
    if (model === 'gemini-3.1-flash-image-preview') {
      map[model] = [...GEMINI_BASE_ASPECT_RATIOS, ...GEMINI_FLASH_31_EXTRA_ASPECT_RATIOS];
      continue;
    }
    map[model] = [...GEMINI_BASE_ASPECT_RATIOS];
  }
  return map;
}

function getGeminiImageSizesByModel(allowedModels: string[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const model of allowedModels) {
    if (model === 'gemini-3.1-flash-image-preview') {
      map[model] = [...GEMINI_IMAGE_SIZES_FLASH_31];
      continue;
    }
    map[model] = [...GEMINI_IMAGE_SIZES_ALL];
  }
  return map;
}

function getGeminiDefaultAspectRatioByModel(allowedModels: string[]): Record<string, string> {
  const ratiosByModel = getGeminiAspectRatiosByModel(allowedModels);
  const map: Record<string, string> = {};
  for (const model of allowedModels) {
    const allowed = ratiosByModel[model] ?? [...GEMINI_BASE_ASPECT_RATIOS];
    map[model] = allowed.includes(DEFAULT_GEMINI_ASPECT_RATIO) ? DEFAULT_GEMINI_ASPECT_RATIO : allowed[0];
  }
  return map;
}

function getGeminiDefaultImageSizeByModel(allowedModels: string[]): Record<string, string> {
  const sizesByModel = getGeminiImageSizesByModel(allowedModels);
  const map: Record<string, string> = {};
  for (const model of allowedModels) {
    const allowed = sizesByModel[model] ?? [...GEMINI_IMAGE_SIZES_ALL];
    map[model] = allowed.includes(DEFAULT_GEMINI_IMAGE_SIZE) ? DEFAULT_GEMINI_IMAGE_SIZE : allowed[0];
  }
  return map;
}

function getReplicateAllowedModels(): string[] {
  const fromEnv = parseCsvModels(process.env.REPLICATE_MOCKUP_SCENE_MODELS ?? '');
  return fromEnv.length > 0 ? fromEnv : [...DEFAULT_REPLICATE_MODELS];
}

function getReplicateDefaultModel(allowedModels: string[]): string {
  const envDefault = (process.env.REPLICATE_MOCKUP_SCENE_DEFAULT_MODEL ?? '').trim();
  if (envDefault && allowedModels.includes(envDefault)) return envDefault;
  if (allowedModels.includes(DEFAULT_REPLICATE_MODEL)) return DEFAULT_REPLICATE_MODEL;
  return allowedModels[0] ?? DEFAULT_REPLICATE_MODEL;
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

function findPromptBlockReason(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const root = payload as Record<string, unknown>;
  const promptFeedback = (root.promptFeedback ?? root.prompt_feedback) as Record<string, unknown> | undefined;
  return String(promptFeedback?.blockReason ?? promptFeedback?.block_reason ?? '').trim();
}

function findFirstCandidateFinishReason(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const root = payload as Record<string, unknown>;
  const firstCandidate = Array.isArray(root.candidates) ? root.candidates[0] : null;
  const candidateRecord =
    firstCandidate && typeof firstCandidate === 'object' ? (firstCandidate as Record<string, unknown>) : null;
  return String(candidateRecord?.finishReason ?? candidateRecord?.finish_reason ?? '').trim();
}

function shouldRetryGeminiNoImage(payload: unknown): boolean {
  const blockReason = findPromptBlockReason(payload).toUpperCase();
  if (blockReason === 'OTHER') return true;
  const finishReason = findFirstCandidateFinishReason(payload).toUpperCase();
  return finishReason === 'IMAGE_OTHER' || finishReason === 'NO_IMAGE' || finishReason === 'OTHER';
}

function looksLikeBase64(value: string): boolean {
  return /^[A-Za-z0-9+/=]+$/.test(value);
}

function imageDataUrlFromRecord(record: Record<string, unknown>): string | null {
  const containers: unknown[] = [record.inlineData, record.inline_data, record];
  for (const container of containers) {
    if (!container || typeof container !== 'object') continue;
    const source = container as Record<string, unknown>;
    const mimeType = String(source.mimeType ?? source.mime_type ?? '').trim();
    const data = String(source.data ?? source.base64 ?? '').trim();
    if (mimeType.startsWith('image/') && data && looksLikeBase64(data)) {
      return `data:${mimeType};base64,${data}`;
    }
  }

  const b64Json = String(record.b64_json ?? '').trim();
  if (b64Json && looksLikeBase64(b64Json)) {
    return `data:image/png;base64,${b64Json}`;
  }

  return null;
}

function extractGeneratedImageDataUrl(payload: unknown): string | null {
  const seen = new Set<unknown>();
  const stack: unknown[] = [payload];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;
    if (seen.has(current)) continue;
    seen.add(current);

    if (Array.isArray(current)) {
      for (const item of current) stack.push(item);
      continue;
    }

    const record = current as Record<string, unknown>;
    const imageDataUrl = imageDataUrlFromRecord(record);
    if (imageDataUrl) return imageDataUrl;

    for (const value of Object.values(record)) {
      if (value && typeof value === 'object') {
        stack.push(value);
      }
    }
  }

  return null;
}

function buildFallbackPrompt(input: { userPrompt: string; placementHint: string; sceneMode: string }): string {
  return [
    'Create a realistic ecommerce product mockup image.',
    `User request: ${input.userPrompt}`,
    `Placement instruction: ${input.placementHint}`,
    `Scene instruction: ${input.sceneMode}`,
    'Keep the uploaded design visible and readable. Output image.'
  ].join('\n');
}

function resolveGeminiImageConfig(input: {
  model: string;
  requestedAspectRatio?: string;
  requestedImageSize?: string;
  strict: boolean;
  aspectRatiosByModel: Record<string, string[]>;
  imageSizesByModel: Record<string, string[]>;
  defaultAspectRatioByModel: Record<string, string>;
  defaultImageSizeByModel: Record<string, string>;
}): { aspectRatio: string; imageSize: string } {
  const allowedAspectRatios = input.aspectRatiosByModel[input.model] ?? [...GEMINI_BASE_ASPECT_RATIOS];
  const allowedImageSizes = input.imageSizesByModel[input.model] ?? [...GEMINI_IMAGE_SIZES_ALL];

  const requestedAspectRatio = (input.requestedAspectRatio ?? '').trim();
  const requestedImageSize = (input.requestedImageSize ?? '').trim();

  if (requestedAspectRatio && !allowedAspectRatios.includes(requestedAspectRatio)) {
    if (input.strict) {
      throw new HttpError(
        400,
        `aspectRatio is not allowed for model ${input.model}. Allowed: ${allowedAspectRatios.join(', ')}`
      );
    }
  }
  if (requestedImageSize && !allowedImageSizes.includes(requestedImageSize)) {
    if (input.strict) {
      throw new HttpError(
        400,
        `imageSize is not allowed for model ${input.model}. Allowed: ${allowedImageSizes.join(', ')}`
      );
    }
  }

  const fallbackAspect = input.defaultAspectRatioByModel[input.model] ?? allowedAspectRatios[0] ?? DEFAULT_GEMINI_ASPECT_RATIO;
  const fallbackImageSize = input.defaultImageSizeByModel[input.model] ?? allowedImageSizes[0] ?? DEFAULT_GEMINI_IMAGE_SIZE;
  const aspectRatio = requestedAspectRatio && allowedAspectRatios.includes(requestedAspectRatio) ? requestedAspectRatio : fallbackAspect;
  const imageSize = requestedImageSize && allowedImageSizes.includes(requestedImageSize) ? requestedImageSize : fallbackImageSize;

  return {
    aspectRatio,
    imageSize
  };
}

async function runGeminiImageRequest(input: {
  apiKey: string;
  model: string;
  prompt: string;
  images: DataUrlImage[];
  aspectRatio?: string;
  imageSize?: string;
}): Promise<unknown> {
  const parts: Array<Record<string, unknown>> = [];
  parts.push({ text: input.prompt });
  for (const image of input.images) {
    parts.push({
      inline_data: {
        mime_type: image.mimeType,
        data: image.base64
      }
    });
  }

  const imageConfig: Record<string, unknown> = {};
  if (input.aspectRatio) imageConfig.aspectRatio = input.aspectRatio;
  if (input.imageSize) imageConfig.imageSize = input.imageSize;
  const generationConfig: Record<string, unknown> = {
    responseModalities: ['TEXT', 'IMAGE']
  };
  if (Object.keys(imageConfig).length > 0) {
    generationConfig.imageConfig = imageConfig;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:generateContent?key=${encodeURIComponent(input.apiKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts
            }
          ],
          generationConfig
        }),
        signal: controller.signal
      }
    );
  } finally {
    clearTimeout(timeout);
  }

  const responseText = await response.text();
  if (!response.ok) {
    throw new HttpError(502, humanizeGeminiError(response.status, responseText));
  }

  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    throw new HttpError(502, 'Gemini response is not valid JSON.');
  }
}

async function normalizeForGemini(image: DataUrlImage): Promise<DataUrlImage> {
  const inputBuffer = Buffer.from(image.base64, 'base64');
  if (inputBuffer.length === 0) {
    throw new HttpError(400, 'Image bytes are empty.');
  }

  const pipeline = sharp(inputBuffer, { failOn: 'none' }).rotate();
  const metadata = await pipeline.metadata();
  const width = metadata.width ?? null;
  const height = metadata.height ?? null;

  if (width && height && (width > GEMINI_MAX_IMAGE_SIDE_PX || height > GEMINI_MAX_IMAGE_SIDE_PX)) {
    pipeline.resize({
      width: width >= height ? GEMINI_MAX_IMAGE_SIDE_PX : undefined,
      height: height > width ? GEMINI_MAX_IMAGE_SIDE_PX : undefined,
      fit: 'inside',
      withoutEnlargement: true
    });
  }

  const output = await pipeline.png({ compressionLevel: 8 }).toBuffer();
  return {
    mimeType: 'image/png',
    base64: output.toString('base64')
  };
}

function summarizeGeminiNoImage(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return 'Gemini did not return an image output. Response payload was empty.';
  }

  const root = payload as Record<string, unknown>;
  const promptFeedback = (root.promptFeedback ?? root.prompt_feedback) as Record<string, unknown> | undefined;
  const blockReason = String(promptFeedback?.blockReason ?? promptFeedback?.block_reason ?? '').trim();
  const blockMessage = String(promptFeedback?.blockReasonMessage ?? promptFeedback?.block_reason_message ?? '').trim();

  const firstCandidate = Array.isArray(root.candidates) ? root.candidates[0] : null;
  const candidateRecord = firstCandidate && typeof firstCandidate === 'object' ? (firstCandidate as Record<string, unknown>) : null;
  const finishReason = String(candidateRecord?.finishReason ?? candidateRecord?.finish_reason ?? '').trim();

  let firstText = '';
  const content = candidateRecord?.content;
  if (content && typeof content === 'object') {
    const parts = Array.isArray((content as Record<string, unknown>).parts)
      ? ((content as Record<string, unknown>).parts as unknown[])
      : [];
    for (const part of parts) {
      if (!part || typeof part !== 'object') continue;
      const text = String((part as Record<string, unknown>).text ?? '').trim();
      if (text) {
        firstText = text.length > 180 ? `${text.slice(0, 180)}...` : text;
        break;
      }
    }
  }

  const hints: string[] = ['Gemini did not return an image output.'];
  if (finishReason) hints.push(`finishReason=${finishReason}.`);
  if (blockReason) hints.push(`blockReason=${blockReason}.`);
  if (blockMessage) hints.push(`blockMessage=${blockMessage}.`);
  if (firstText) hints.push(`text=${firstText}`);
  hints.push('Ensure you selected an image-capable Gemini model.');
  return hints.join(' ');
}

async function loadPromptTemplate(): Promise<string> {
  return readFile(PROMPT_FILE_URL, 'utf8');
}

function toSafeRect(value: PlacementRect | undefined): PlacementRect {
  if (!value || typeof value !== 'object') {
    throw new HttpError(400, 'placementRect is required for custom_rect mode.');
  }
  const xPct = Number(value.xPct);
  const yPct = Number(value.yPct);
  const wPct = Number(value.wPct);
  const hPct = Number(value.hPct);
  const nums = [xPct, yPct, wPct, hPct];
  if (nums.some((n) => !Number.isFinite(n))) {
    throw new HttpError(400, 'placementRect fields must be valid numbers.');
  }
  if (xPct < 0 || yPct < 0 || wPct <= 0 || hPct <= 0) {
    throw new HttpError(400, 'placementRect values must be positive percentages.');
  }
  if (xPct >= 100 || yPct >= 100 || xPct + wPct > 100 || yPct + hPct > 100) {
    throw new HttpError(400, 'placementRect must stay inside 0-100 percentage bounds.');
  }
  return { xPct, yPct, wPct, hPct };
}

function resolvePlacementHint(body: GenerateMockupRequestBody, hasSceneImage: boolean): string {
  const placementMode = body.placementMode;
  if (placementMode !== 'preset' && placementMode !== 'custom_rect') {
    throw new HttpError(400, 'placementMode must be either preset or custom_rect.');
  }

  if (placementMode === 'preset') {
    const preset = PLACEMENT_PRESETS.find((item) => item.key === body.placementPreset);
    if (!preset) {
      throw new HttpError(
        400,
        `placementPreset must be one of: ${PLACEMENT_PRESETS.map((item) => item.key).join(', ')}`
      );
    }
    return preset.hint;
  }

  if (!hasSceneImage) {
    throw new HttpError(400, 'custom_rect mode requires sceneImageDataUrl.');
  }
  const rect = toSafeRect(body.placementRect);
  return [
    'Place the design using this normalized target rectangle on the scene:',
    `x=${rect.xPct.toFixed(2)}%, y=${rect.yPct.toFixed(2)}%, width=${rect.wPct.toFixed(2)}%, height=${rect.hPct.toFixed(2)}%.`,
    'Respect perspective, lighting and occlusion while preserving design readability.'
  ].join(' ');
}

function buildSceneModeText(hasSceneImage: boolean): string {
  if (hasSceneImage) {
    return 'A scene/background image is provided. Preserve its composition and style while applying the design.';
  }
  return 'No scene image is provided. Generate a realistic product scene based on the user prompt.';
}

function buildPrompt(template: string, replacements: { userPrompt: string; placementHint: string; sceneMode: string }): string {
  let prompt = template;

  if (prompt.includes('[USER_PROMPT]')) {
    prompt = prompt.replace(/\[USER_PROMPT\]/g, replacements.userPrompt);
  } else {
    prompt = `${prompt.trim()}\n\nUser prompt:\n${replacements.userPrompt}`;
  }

  if (prompt.includes('[PLACEMENT_HINT]')) {
    prompt = prompt.replace(/\[PLACEMENT_HINT\]/g, replacements.placementHint);
  } else {
    prompt = `${prompt.trim()}\n\nPlacement:\n${replacements.placementHint}`;
  }

  if (prompt.includes('[SCENE_MODE]')) {
    prompt = prompt.replace(/\[SCENE_MODE\]/g, replacements.sceneMode);
  } else {
    prompt = `${prompt.trim()}\n\nScene mode:\n${replacements.sceneMode}`;
  }

  return prompt;
}

function normalizePromptLanguageForGemini(value: string): string {
  const text = value.trim();
  if (!text) return text;
  const looksTurkish = /[ığüşöçİĞÜŞÖÇ]/.test(text);
  if (!looksTurkish) return text;
  return [
    'Interpret the following user request written in Turkish, and execute it in English while preserving intent.',
    text
  ].join('\n');
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

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientReplicateError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const msg = (e as { message?: string }).message ?? '';
  return /502|503|504|bad gateway|service unavailable|gateway timeout|temporarily unavailable/i.test(msg);
}

function humanizeReplicateError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e ?? '');
  const stripped = raw.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (/502|bad gateway/i.test(stripped)) {
    return 'Replicate service is temporarily unavailable (502 Bad Gateway). Please try again.';
  }
  if (/503|service unavailable/i.test(stripped)) {
    return 'Replicate service is temporarily unavailable (503). Please try again.';
  }
  if (/504|gateway timeout/i.test(stripped)) {
    return 'Replicate request timed out (504). Please try again.';
  }
  if (/timeout|timed out/i.test(stripped)) {
    return 'Replicate request timed out. Please try again.';
  }
  if (!stripped || stripped.length > 300) {
    return 'Replicate generation failed. Please try again.';
  }
  return stripped;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new HttpError(504, timeoutMessage)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function runReplicateMockupRequest(input: {
  token: string;
  model: string;
  prompt: string;
  images: string[];
}): Promise<unknown> {
  const replicate = new Replicate({ auth: input.token });
  const modelRef = input.model as `${string}/${string}` | `${string}/${string}:${string}`;
  const isSeedream = input.model.startsWith('bytedance/seedream-4');

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt += 1) {
    try {
      const requestInput: Record<string, unknown> = {
        prompt: input.prompt
      };
      if (input.images.length > 0) {
        if (isSeedream) {
          requestInput.image_input = input.images;
          requestInput.aspect_ratio = 'match_input_image';
        } else {
          requestInput.input_images = input.images;
          requestInput.aspect_ratio = 'match_input_image';
        }
      }

      return await withTimeout(
        replicate.run(modelRef, {
          input: requestInput
        }),
        REQUEST_TIMEOUT_MS,
        'Replicate request timed out.'
      );
    } catch (e) {
      lastError = e;
      if (attempt < RETRY_ATTEMPTS && isTransientReplicateError(e)) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      break;
    }
  }
  throw lastError;
}

async function fetchImageAsDataUrl(imageUrl: string): Promise<string> {
  const trimmed = imageUrl.trim();
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }
  if (!isAllowedHttpUrl(trimmed)) {
    throw new HttpError(502, 'Image URL is invalid.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  let res: Response;
  try {
    res = await fetch(trimmed, {
      method: 'GET',
      headers: { Accept: 'image/*,*/*;q=0.8' },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new HttpError(502, `Cleaned design image download failed (${res.status}).`);
  }

  const contentTypeHeader = (res.headers.get('content-type') ?? '').toLowerCase();
  const mimeType = contentTypeHeader.split(';')[0]?.trim() || 'image/png';
  if (!mimeType.startsWith('image/')) {
    throw new HttpError(502, 'Cleaned design URL did not return an image content type.');
  }

  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length === 0) {
    throw new HttpError(502, 'Cleaned design image is empty.');
  }
  if (bytes.length > MAX_FETCH_IMAGE_BYTES) {
    throw new HttpError(400, 'Cleaned design image is too large.');
  }

  return `data:${mimeType};base64,${bytes.toString('base64')}`;
}

export async function GET() {
  const geminiModels = getGeminiAllowedModels();
  const geminiDefaultModel = getGeminiDefaultModel(geminiModels);
  const geminiAspectRatiosByModel = getGeminiAspectRatiosByModel(geminiModels);
  const geminiImageSizesByModel = getGeminiImageSizesByModel(geminiModels);
  const geminiDefaultAspectRatioByModel = getGeminiDefaultAspectRatioByModel(geminiModels);
  const geminiDefaultImageSizeByModel = getGeminiDefaultImageSizeByModel(geminiModels);
  const replicateModels = getReplicateAllowedModels();
  const replicateDefaultModel = getReplicateDefaultModel(replicateModels);
  return NextResponse.json({
    provider: 'gemini',
    models: geminiModels,
    defaultModel: geminiDefaultModel,
    providers: ['gemini', 'replicate'],
    defaultProvider: 'gemini',
    modelsByProvider: {
      gemini: geminiModels,
      replicate: replicateModels
    },
    defaultModelsByProvider: {
      gemini: geminiDefaultModel,
      replicate: replicateDefaultModel
    },
    geminiAspectRatiosByModel,
    geminiImageSizesByModel,
    geminiDefaultAspectRatioByModel,
    geminiDefaultImageSizeByModel,
    placementPresets: PLACEMENT_PRESETS.map((item) => ({
      key: item.key,
      label: item.label,
      hint: item.hint
    })),
    defaultPlacementPreset: DEFAULT_PLACEMENT_PRESET,
    maxPromptLength: MAX_PROMPT_LENGTH,
    maxDataUrlLength: MAX_REMOVE_BG_DATA_URL_LENGTH,
    resolution: null
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateMockupRequestBody;
    const provider = (body.provider ?? 'gemini').trim().toLowerCase() as MockupProvider;
    if (provider !== 'gemini' && provider !== 'replicate') {
      return new NextResponse("provider must be 'gemini' or 'replicate'.", { status: 400 });
    }

    const userPrompt = (body.prompt ?? '').trim();
    if (!userPrompt) {
      return new NextResponse('prompt is required.', { status: 400 });
    }
    if (userPrompt.length > MAX_PROMPT_LENGTH) {
      return new NextResponse(`prompt is too long (max ${MAX_PROMPT_LENGTH} chars).`, { status: 400 });
    }

    const rawDesignImageDataUrl = (body.designImageDataUrl ?? '').trim();
    if (!rawDesignImageDataUrl) {
      return new NextResponse('designImageDataUrl is required.', { status: 400 });
    }
    if (rawDesignImageDataUrl.length > MAX_REMOVE_BG_DATA_URL_LENGTH) {
      return new NextResponse('designImageDataUrl is too large.', { status: 400 });
    }

    let sceneImageDataUrl = (body.sceneImageDataUrl ?? '').trim();
    if (sceneImageDataUrl && sceneImageDataUrl.length > MAX_REMOVE_BG_DATA_URL_LENGTH) {
      return new NextResponse('sceneImageDataUrl is too large.', { status: 400 });
    }

    let designImageDataUrl = rawDesignImageDataUrl;
    if (body.cleanDesignBackground === true) {
      const cleaned = await removeBackgroundImage({
        imageDataUrl: rawDesignImageDataUrl,
        source: 'mockup-design'
      });
      designImageDataUrl = await fetchImageAsDataUrl(cleaned.imageUrl);
    }

    const parsedDesign = parseDataUrlImage(designImageDataUrl);
    if (!parsedDesign) {
      return new NextResponse('designImageDataUrl must be a valid base64 image data URL.', { status: 400 });
    }

    let parsedScene = sceneImageDataUrl ? parseDataUrlImage(sceneImageDataUrl) : null;
    if (sceneImageDataUrl && !parsedScene) {
      return new NextResponse('sceneImageDataUrl must be a valid base64 image data URL.', { status: 400 });
    }

    const placementHint = resolvePlacementHint(body, !!parsedScene);
    const sceneMode = buildSceneModeText(!!parsedScene);

    let promptTemplate = '';
    try {
      promptTemplate = await loadPromptTemplate();
    } catch {
      return new NextResponse('Prompt file could not be loaded.', { status: 500 });
    }

    const prompt = buildPrompt(promptTemplate, {
      userPrompt: normalizePromptLanguageForGemini(userPrompt),
      placementHint,
      sceneMode
    });

    if (provider === 'replicate') {
      const token = (process.env.REPLICATE_API_TOKEN ?? '').trim();
      if (!token) {
        return new NextResponse('REPLICATE_API_TOKEN is missing on server.', { status: 500 });
      }

      const replicateModels = getReplicateAllowedModels();
      const replicateDefaultModel = getReplicateDefaultModel(replicateModels);
      const modelUsed = (body.model ?? replicateDefaultModel).trim();
      if (!replicateModels.includes(modelUsed)) {
        return new NextResponse(`Model is not allowed. Allowed: ${replicateModels.join(', ')}`, { status: 400 });
      }

      const replicateHint = [
        'Reference image usage:',
        '- Image 1 is the design artwork.',
        parsedScene
          ? '- Image 2 is the scene/background reference. Preserve scene composition while placing design.'
          : '- No scene reference image was provided. Generate a suitable product scene from prompt.',
        `Placement instruction: ${placementHint}`
      ].join('\n');

      const replicatePrompt = `${prompt}\n\n${replicateHint}`;

      const inputImages = parsedScene ? [designImageDataUrl, sceneImageDataUrl] : [designImageDataUrl];
      let output: unknown;
      try {
        output = await runReplicateMockupRequest({
          token,
          model: modelUsed,
          prompt: replicatePrompt,
          images: inputImages
        });
      } catch (e: unknown) {
        const friendly = humanizeReplicateError(e);
        const status = /timed out|timeout/i.test(friendly) ? 504 : 502;
        throw new HttpError(status, friendly);
      }

      const outputUrl = await extractOutputUrl(output);
      if (!outputUrl) {
        return new NextResponse('Replicate did not return an image output URL.', { status: 502 });
      }
      const generatedImageDataUrl = await fetchImageAsDataUrl(outputUrl);

      return NextResponse.json({
        imageDataUrl: generatedImageDataUrl,
        modelUsed,
        providerUsed: 'replicate',
        aspectRatioUsed: null,
        imageSizeUsed: null,
        resolution: null,
        promptSource: PROMPT_SOURCE
      });
    }

    const apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
    if (!apiKey) {
      return new NextResponse('GEMINI_API_KEY is missing on server.', { status: 500 });
    }
    const models = getGeminiAllowedModels();
    const defaultModel = getGeminiDefaultModel(models);
    const geminiAspectRatiosByModel = getGeminiAspectRatiosByModel(models);
    const geminiImageSizesByModel = getGeminiImageSizesByModel(models);
    const geminiDefaultAspectRatioByModel = getGeminiDefaultAspectRatioByModel(models);
    const geminiDefaultImageSizeByModel = getGeminiDefaultImageSizeByModel(models);
    let modelUsed = (body.model ?? defaultModel).trim();
    if (!models.includes(modelUsed)) {
      return new NextResponse(`Model is not allowed. Allowed: ${models.join(', ')}`, { status: 400 });
    }
    const requestedAspectRatio = (body.aspectRatio ?? '').trim();
    const requestedImageSize = (body.imageSize ?? '').trim();
    let geminiImageConfig = resolveGeminiImageConfig({
      model: modelUsed,
      requestedAspectRatio,
      requestedImageSize,
      strict: true,
      aspectRatiosByModel: geminiAspectRatiosByModel,
      imageSizesByModel: geminiImageSizesByModel,
      defaultAspectRatioByModel: geminiDefaultAspectRatioByModel,
      defaultImageSizeByModel: geminiDefaultImageSizeByModel
    });

    let normalizedDesign = parsedDesign;
    let normalizedScene = parsedScene;
    try {
      normalizedDesign = await normalizeForGemini(parsedDesign);
      if (parsedScene) {
        normalizedScene = await normalizeForGemini(parsedScene);
      }
    } catch {
      // Keep original payload if normalization fails for a specific input.
    }

    const allImages: DataUrlImage[] = normalizedScene ? [normalizedDesign, normalizedScene] : [normalizedDesign];
    let payload = await runGeminiImageRequest({
      apiKey,
      model: modelUsed,
      prompt,
      images: allImages,
      aspectRatio: geminiImageConfig.aspectRatio,
      imageSize: geminiImageConfig.imageSize
    });

    let generatedImageDataUrl = extractGeneratedImageDataUrl(payload);
    if (generatedImageDataUrl) {
      return NextResponse.json({
        imageDataUrl: generatedImageDataUrl,
        modelUsed,
        providerUsed: 'gemini',
        aspectRatioUsed: geminiImageConfig.aspectRatio,
        imageSizeUsed: geminiImageConfig.imageSize,
        resolution: null,
        promptSource: PROMPT_SOURCE
      });
    }

    const fallbackPrompt = buildFallbackPrompt({ userPrompt, placementHint, sceneMode });
    if (shouldRetryGeminiNoImage(payload)) {
      payload = await runGeminiImageRequest({
        apiKey,
        model: modelUsed,
        prompt: fallbackPrompt,
        images: allImages,
        aspectRatio: geminiImageConfig.aspectRatio,
        imageSize: geminiImageConfig.imageSize
      });
      generatedImageDataUrl = extractGeneratedImageDataUrl(payload);
      if (generatedImageDataUrl) {
        return NextResponse.json({
          imageDataUrl: generatedImageDataUrl,
          modelUsed,
          providerUsed: 'gemini',
          aspectRatioUsed: geminiImageConfig.aspectRatio,
          imageSizeUsed: geminiImageConfig.imageSize,
          resolution: null,
          promptSource: PROMPT_SOURCE
        });
      }

      if (parsedScene && shouldRetryGeminiNoImage(payload)) {
        const sceneReducedPrompt = [
          fallbackPrompt,
          'Fallback mode: generate using design image as primary reference if scene constraints are blocked.'
        ].join('\n');
        payload = await runGeminiImageRequest({
          apiKey,
          model: modelUsed,
          prompt: sceneReducedPrompt,
          images: [normalizedDesign],
          aspectRatio: geminiImageConfig.aspectRatio,
          imageSize: geminiImageConfig.imageSize
        });
        generatedImageDataUrl = extractGeneratedImageDataUrl(payload);
        if (generatedImageDataUrl) {
          return NextResponse.json({
            imageDataUrl: generatedImageDataUrl,
            modelUsed,
            providerUsed: 'gemini',
            aspectRatioUsed: geminiImageConfig.aspectRatio,
            imageSizeUsed: geminiImageConfig.imageSize,
            resolution: null,
            promptSource: PROMPT_SOURCE
          });
        }
      }
    }

    const backupModelCandidates = [...new Set([...DEFAULT_GEMINI_MODELS, ...models])].filter(
      (candidate) => candidate !== modelUsed
    );
    for (const backupModel of backupModelCandidates) {
      modelUsed = backupModel;
      geminiImageConfig = resolveGeminiImageConfig({
        model: modelUsed,
        requestedAspectRatio,
        requestedImageSize,
        strict: false,
        aspectRatiosByModel: geminiAspectRatiosByModel,
        imageSizesByModel: geminiImageSizesByModel,
        defaultAspectRatioByModel: geminiDefaultAspectRatioByModel,
        defaultImageSizeByModel: geminiDefaultImageSizeByModel
      });
      payload = await runGeminiImageRequest({
        apiKey,
        model: modelUsed,
        prompt: fallbackPrompt,
        images: allImages,
        aspectRatio: geminiImageConfig.aspectRatio,
        imageSize: geminiImageConfig.imageSize
      });
      generatedImageDataUrl = extractGeneratedImageDataUrl(payload);
      if (generatedImageDataUrl) {
        return NextResponse.json({
          imageDataUrl: generatedImageDataUrl,
          modelUsed,
          providerUsed: 'gemini',
          aspectRatioUsed: geminiImageConfig.aspectRatio,
          imageSizeUsed: geminiImageConfig.imageSize,
          resolution: null,
          promptSource: PROMPT_SOURCE
        });
      }

      if (parsedScene && shouldRetryGeminiNoImage(payload)) {
        const sceneReducedPrompt = [
          fallbackPrompt,
          'Fallback mode: generate using design image as primary reference if scene constraints are blocked.'
        ].join('\n');
        payload = await runGeminiImageRequest({
          apiKey,
          model: modelUsed,
          prompt: sceneReducedPrompt,
          images: [normalizedDesign],
          aspectRatio: geminiImageConfig.aspectRatio,
          imageSize: geminiImageConfig.imageSize
        });
        generatedImageDataUrl = extractGeneratedImageDataUrl(payload);
        if (generatedImageDataUrl) {
          return NextResponse.json({
            imageDataUrl: generatedImageDataUrl,
            modelUsed,
            providerUsed: 'gemini',
            aspectRatioUsed: geminiImageConfig.aspectRatio,
            imageSizeUsed: geminiImageConfig.imageSize,
            resolution: null,
            promptSource: PROMPT_SOURCE
          });
        }
      }
    }

    const summary = summarizeGeminiNoImage(payload);
    return new NextResponse(summary, { status: 502 });
  } catch (e: unknown) {
    if (e instanceof HttpError) {
      return new NextResponse(e.message, { status: e.status });
    }
    if (e instanceof RemoveBgHttpError) {
      return new NextResponse(e.message, { status: e.status });
    }
    const message = e instanceof Error ? e.message : 'Mockup generation failed.';
    if (/aborted|abort/i.test(message)) {
      return new NextResponse('Gemini request timed out.', { status: 504 });
    }
    if (/timed out|timeout/i.test(message)) {
      return new NextResponse('Replicate request timed out.', { status: 504 });
    }
    return new NextResponse(message, { status: 500 });
  }
}
