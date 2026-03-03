# Mockup MVP Technical Documentation

This document covers the `/mockup` route plus `/api/mockup/generate` and `/api/mockup/generate-scene` APIs in the MVP, with optional Replicate providers.

## 1. Scope

### UI Route
- `app/mockup/page.tsx`
- User flow:
  - `Auto Mockup` tab:
    - Upload `design` image (required)
    - Upload `scene/background` image (optional)
    - Enter prompt
    - Choose provider/model (`gemini` or `replicate`)
    - Choose placement mode (`preset` or `custom_rect`)
    - Optional `clean design background`
    - Generate one image
    - Download PNG/JPG
  - `Scene Canvas` tab:
    - Generate scene-only background from prompt (or upload scene)
    - Free placement by default (drag/scale/rotate on full scene)
    - Optional frame mode (advanced) with frame sliders
    - Download composed PNG/JPG

### API Route
- `app/api/mockup/generate/route.ts`
- GET: UI config (models, defaults, presets, limits)
- POST: request validation + optional design clean + Gemini/Replicate generation
- `app/api/mockup/generate-scene/route.ts`
- GET: scene config (provider, models, default, limits)
- POST: prompt-only scene/background generation via Gemini or Replicate

## 2. Runtime and Dependencies

- API runtime: `nodejs`
- Gemini access via direct HTTP to `generativelanguage.googleapis.com`
- Replicate access via official `replicate` npm SDK
- Background cleaning uses shared service:
  - `lib/image/removeBg.ts`
  - same Replicate logic as `/api/image/remove-bg`

## 3. Environment Variables

Required:
- `GEMINI_API_KEY`
- `REPLICATE_API_TOKEN` (needed for `cleanDesignBackground=true` and `provider=replicate` in scene generation)

Optional:
- `GEMINI_MOCKUP_MODELS` (CSV allowlist)
- `GEMINI_MOCKUP_DEFAULT_MODEL`
- `REPLICATE_MOCKUP_SCENE_MODELS` (CSV allowlist for `/api/mockup/generate-scene`, provider=replicate)
- `REPLICATE_MOCKUP_SCENE_DEFAULT_MODEL`

Replicate scene model examples:
- `black-forest-labs/flux-2-pro`
- `bytedance/seedream-4`
Replicate aspect ratio options (model allowlist-driven):
- `1:1`, `4:3`, `3:4`, `16:9`, `9:16`

Defaults:
- models fallback: `gemini-3-pro-image-preview, gemini-3.1-flash-image-preview`
- default model fallback: `gemini-3.1-flash-image-preview`

## 4. API Contract

### GET `/api/mockup/generate`

Response includes:
- `provider`
- `models`
- `defaultModel`
- `providers`
- `modelsByProvider`
- `defaultModelsByProvider`
- `geminiAspectRatiosByModel`
- `geminiImageSizesByModel`
- `geminiDefaultAspectRatioByModel`
- `geminiDefaultImageSizeByModel`
- `placementPresets`
- `defaultPlacementPreset`
- `maxPromptLength`
- `maxDataUrlLength`
- `resolution` (`null` in MVP)

### POST `/api/mockup/generate`

Request body:
- `provider?: 'gemini' | 'replicate'` (defaults to `gemini`)
- `model?: string`
- `prompt: string`
- `designImageDataUrl: string`
- `sceneImageDataUrl?: string`
- `aspectRatio?: string` (Gemini model allowlist-validated)
- `imageSize?: '512px' | '1K' | '2K' | '4K'` (Gemini model allowlist-validated)
- `placementMode: 'preset' | 'custom_rect'`
- `placementPreset?: 'center_chest' | 'full_front' | 'left_chest' | 'upper_center'`
- `placementRect?: { xPct:number; yPct:number; wPct:number; hPct:number }`
- `cleanDesignBackground?: boolean` (default false)

Validation notes:
- provider must be `gemini` or `replicate`
- model must be in allowlist
- prompt required and bounded
- `designImageDataUrl` required and valid image data URL
- `sceneImageDataUrl` optional but required when `placementMode=custom_rect`
- custom rect must be within `%` bounds and positive size

Response:
- `imageDataUrl`
- `modelUsed`
- `providerUsed` (`gemini` or `replicate`)
- `aspectRatioUsed` (`string | null`)
- `imageSizeUsed` (`string | null`)
- `resolution` (`null`)
- `promptSource` (`prompts/gemini_mockup_generate.txt`)

Provider behavior:
- `provider='gemini'`: image+prompt driven full mockup generation (existing flow)
  - when Gemini returns no image with `blockReason=OTHER` or `finishReason` such as `IMAGE_OTHER`, route retries with fallback prompt and backup models automatically
- `provider='replicate'`:
  - prompt + uploaded images are sent to Replicate model as direct model input
  - when scene is provided, both design and scene are sent as reference images
  - when scene is missing, design image is sent and model generates full scene+placement

### GET `/api/mockup/generate-scene`

Response includes:
- `provider`
- `models`
- `defaultModel`
- `providers`
- `modelsByProvider`
- `defaultModelsByProvider`
- `geminiAspectRatiosByModel`
- `geminiImageSizesByModel`
- `geminiDefaultAspectRatioByModel`
- `geminiDefaultImageSizeByModel`
- `maxPromptLength`
- `resolution` (`null` in MVP)

### POST `/api/mockup/generate-scene`

Request body:
- `provider?: 'gemini' | 'replicate'` (defaults to `gemini`)
- `model?: string`
- `prompt: string`
- `aspectRatio?: string` (validated for selected provider/model)
- `imageSize?: '512px' | '1K' | '2K' | '4K'` (Gemini only, validated per model)

Response:
- `imageDataUrl`
- `modelUsed`
- `providerUsed` (`gemini` or `replicate`)
- `aspectRatioUsed`
- `imageSizeUsed` (Gemini only, otherwise `null`)
- `resolution` (`null`)
- `promptSource` (`prompts/gemini_scene_generate.txt`)

## 5. Prompt Pipeline

Prompt file:
- `prompts/gemini_mockup_generate.txt`

Placeholders:
- `[USER_PROMPT]`
- `[PLACEMENT_HINT]`
- `[SCENE_MODE]`

Composition:
1. Resolve placement hint from preset/custom rect.
2. Resolve scene mode text based on scene image existence.
3. Inject placeholders and send as first Gemini part.
4. Attach design image as inline image part.
5. Attach scene image as second inline image part when present.

Scene-only prompt file:
- `prompts/gemini_scene_generate.txt`
- placeholder: `[SCENE_PROMPT]`

## 6. Shared Remove-Background Service

File:
- `lib/image/removeBg.ts`

Exports:
- `removeBackgroundImage(...)`
- `RemoveBgHttpError`
- `MAX_REMOVE_BG_DATA_URL_LENGTH`

Refactored route using service:
- `app/api/image/remove-bg/route.ts`

This keeps previous route behavior while allowing reuse in `/api/mockup/generate`.

## 7. UI Behavior Notes

- `custom_rect` mode is disabled unless scene image exists.
- User defines custom rect by drag on scene preview board.
- If drag area is too tiny, rect resets to default safe rectangle.
- Result preview is client-side only; no persistence in MVP.
- `Scene Canvas` mode keeps generation and compositing separate:
  - scene is generated/uploaded first
  - design is transformed manually on scene (free mode default)
  - optional frame mode clips design into selected frame area
  - final PNG/JPG export is composed client-side

## 8. Error Handling

- Validation failures return `400`
- Gemini upstream failures mapped to user-friendly `502`
- Gemini timeout returns `504`
- Replicate upstream failures mapped to user-friendly `502`
- Replicate timeout returns `504`
- remove-bg errors bubble with explicit status/message

## 9. Smoke Test Checklist

1. Generate with design + prompt only (no scene) succeeds.
2. Generate with design + prompt + scene succeeds.
3. All four preset values are accepted.
4. `custom_rect` without scene returns `400`.
5. `cleanDesignBackground=true` path works with Replicate token.
6. `provider=openai` returns `400`.
7. Invalid data URL returns `400`.
8. Generate timeout path returns `504` message.
9. PNG and JPG downloads work from result preview.
10. Desktop/mobile layouts render without overflow breakage.
11. Scene-only generate works from `/api/mockup/generate-scene`.
12. Scene Canvas mode supports move/scale/rotate + PNG/JPG export.
13. Scene-only provider switch `gemini` and `replicate` works.
14. Replicate model allowlist validation works (`400` on invalid model).
15. Replicate aspect ratio selection works and invalid ratio returns `400`.
