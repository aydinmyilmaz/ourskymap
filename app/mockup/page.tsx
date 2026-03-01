'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

type EditorMode = 'auto_mockup' | 'scene_canvas';
type PlacementMode = 'preset' | 'custom_rect';
type PlacementPresetKey = 'center_chest' | 'full_front' | 'left_chest' | 'upper_center';

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

type MockupConfigResponse = {
  provider?: string;
  models?: string[];
  defaultModel?: string;
  providers?: string[];
  defaultProvider?: string;
  modelsByProvider?: Record<string, unknown>;
  defaultModelsByProvider?: Record<string, unknown>;
  geminiAspectRatiosByModel?: Record<string, unknown>;
  geminiImageSizesByModel?: Record<string, unknown>;
  geminiDefaultAspectRatioByModel?: Record<string, unknown>;
  geminiDefaultImageSizeByModel?: Record<string, unknown>;
  placementPresets?: Array<{ key?: string; label?: string; hint?: string }>;
  defaultPlacementPreset?: string;
  maxPromptLength?: number;
  maxDataUrlLength?: number;
  resolution?: string | null;
};

type SceneProviderKey = 'gemini' | 'replicate';

type SceneConfigResponse = {
  provider?: string;
  models?: string[];
  defaultModel?: string;
  providers?: string[];
  defaultProvider?: string;
  modelsByProvider?: Record<string, unknown>;
  defaultModelsByProvider?: Record<string, unknown>;
  geminiAspectRatiosByModel?: Record<string, unknown>;
  geminiImageSizesByModel?: Record<string, unknown>;
  geminiDefaultAspectRatioByModel?: Record<string, unknown>;
  geminiDefaultImageSizeByModel?: Record<string, unknown>;
  aspectRatiosByModel?: Record<string, unknown>;
  defaultAspectRatioByModel?: Record<string, unknown>;
  maxPromptLength?: number;
  resolution?: string | null;
};

type PlacementDragState = {
  pointerId: number;
  startXPct: number;
  startYPct: number;
};

type SceneDesignDragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startXPct: number;
  startYPct: number;
};

type PromptLibraryMode = 'auto_mockup' | 'scene_canvas' | 'both';
type SidebarPanelTab = 'editor' | 'prompts' | 'learning';
type HelpLanguage = 'en' | 'tr';

type PromptLibraryItem = {
  id: string;
  mode: PromptLibraryMode;
  category: string;
  title: string;
  prompt: string;
  productType?: 'tshirt';
  styleTag?: string;
  sceneTag?: string;
  weatherTag?: string;
  settingTag?: 'indoor' | 'outdoor';
};

type PromptLibraryTranslation = {
  category: string;
  title: string;
  prompt: string;
};

type LocalizedPromptTemplate = {
  item: PromptLibraryItem;
  category: string;
  title: string;
  prompt: string;
};

type PromptTypeFilter = 'all' | 'tshirt';
type PromptSettingFilter = 'all' | 'indoor' | 'outdoor';

const FALLBACK_MODELS = ['gemini-3-pro-image-preview', 'gemini-3.1-flash-image-preview'];
const FALLBACK_AUTO_PROVIDER_OPTIONS: SceneProviderKey[] = ['gemini', 'replicate'];
const FALLBACK_AUTO_MODELS_BY_PROVIDER: Record<SceneProviderKey, string[]> = {
  gemini: [...FALLBACK_MODELS],
  replicate: ['black-forest-labs/flux-2-pro', 'bytedance/seedream-4']
};
const FALLBACK_SCENE_MODELS_BY_PROVIDER: Record<SceneProviderKey, string[]> = {
  gemini: [...FALLBACK_MODELS],
  replicate: ['black-forest-labs/flux-2-pro', 'bytedance/seedream-4']
};
const FALLBACK_SCENE_PROVIDER_OPTIONS: SceneProviderKey[] = ['gemini', 'replicate'];
const FALLBACK_REPLICATE_ASPECT_RATIOS_BY_MODEL: Record<string, string[]> = {
  'black-forest-labs/flux-2-pro': ['1:1', '4:3', '3:4', '16:9', '9:16'],
  'bytedance/seedream-4': ['1:1', '4:3', '3:4', '16:9', '9:16']
};
const FALLBACK_GEMINI_ASPECT_RATIOS_BY_MODEL: Record<string, string[]> = {
  'gemini-3-pro-image-preview': ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'],
  'gemini-3.1-flash-image-preview': [
    '1:1',
    '1:4',
    '1:8',
    '2:3',
    '3:2',
    '3:4',
    '4:1',
    '4:3',
    '4:5',
    '5:4',
    '8:1',
    '9:16',
    '16:9',
    '21:9'
  ]
};
const FALLBACK_GEMINI_IMAGE_SIZES_BY_MODEL: Record<string, string[]> = {
  'gemini-3-pro-image-preview': ['1K', '2K', '4K'],
  'gemini-3.1-flash-image-preview': ['512px', '1K', '2K', '4K']
};
const FALLBACK_GEMINI_DEFAULT_ASPECT_RATIO_BY_MODEL: Record<string, string> = {
  'gemini-3-pro-image-preview': '1:1',
  'gemini-3.1-flash-image-preview': '1:1'
};
const FALLBACK_GEMINI_DEFAULT_IMAGE_SIZE_BY_MODEL: Record<string, string> = {
  'gemini-3-pro-image-preview': '1K',
  'gemini-3.1-flash-image-preview': '1K'
};
const FALLBACK_PRESETS: PlacementPreset[] = [
  {
    key: 'center_chest',
    label: 'Center Chest',
    hint: 'Place the design centered at chest level.'
  },
  {
    key: 'full_front',
    label: 'Full Front',
    hint: 'Place the design large on the full front area.'
  },
  {
    key: 'left_chest',
    label: 'Left Chest',
    hint: 'Place the design as a small left chest print.'
  },
  {
    key: 'upper_center',
    label: 'Upper Center',
    hint: 'Place the design on the upper center front area.'
  }
];

const DEFAULT_RECT: PlacementRect = { xPct: 24, yPct: 24, wPct: 52, hPct: 52 };
const DEFAULT_SCENE_FRAME: PlacementRect = { xPct: 34, yPct: 22, wPct: 32, hPct: 52 };
const DEFAULT_MAX_PROMPT = 1500;
const TOTAL_TSHIRT_PROMPT_TARGET = 100;
const EXISTING_CURATED_TSHIRT_PROMPT_COUNT = 21;
const ETSY_INSPIRED_TSHIRT_PROMPT_COUNT = TOTAL_TSHIRT_PROMPT_TARGET - EXISTING_CURATED_TSHIRT_PROMPT_COUNT;
const TOTAL_SCENE_CANVAS_TSHIRT_PROMPT_TARGET = 60;
const EXISTING_CURATED_SCENE_CANVAS_TSHIRT_PROMPT_COUNT = 9;
const ETSY_INSPIRED_SCENE_CANVAS_TSHIRT_PROMPT_COUNT =
  TOTAL_SCENE_CANVAS_TSHIRT_PROMPT_TARGET - EXISTING_CURATED_SCENE_CANVAS_TSHIRT_PROMPT_COUNT;

type EtsyInspiredTshirtStyle = {
  styleTag: string;
  title: string;
  styleDirection: string;
};

type EtsyInspiredTshirtScene = {
  sceneTag: string;
  title: string;
  settingTag: 'indoor' | 'outdoor';
  sceneDirection: string;
};

type EtsyInspiredTshirtWeather = {
  weatherTag: string;
  title: string;
  weatherDirection: string;
};

const ETSY_INSPIRED_TSHIRT_STYLES: EtsyInspiredTshirtStyle[] = [
  { styleTag: 'streetwear_oversized', title: 'Oversized Streetwear', styleDirection: 'bold oversized streetwear styling' },
  { styleTag: 'vintage_retro', title: 'Vintage Retro', styleDirection: 'vintage retro styling with worn-in authenticity' },
  { styleTag: 'minimal_brand', title: 'Minimal Brand', styleDirection: 'minimal premium branding style' },
  { styleTag: 'grunge_texture', title: 'Grunge Texture', styleDirection: 'grunge-influenced texture-rich styling' },
  { styleTag: 'athleisure_clean', title: 'Athleisure Clean', styleDirection: 'clean athleisure styling with active posture' },
  { styleTag: 'boho_lifestyle', title: 'Boho Lifestyle', styleDirection: 'boho lifestyle styling with natural attitude' },
  { styleTag: 'y2k_graphic', title: 'Y2K Graphic', styleDirection: 'Y2K-inspired graphic street styling' },
  { styleTag: 'techwear_modern', title: 'Techwear Modern', styleDirection: 'modern techwear styling with sharp silhouette' },
  { styleTag: 'editorial_fashion', title: 'Editorial Fashion', styleDirection: 'editorial fashion styling for lookbook quality' },
  { styleTag: 'casual_daily', title: 'Casual Daily', styleDirection: 'daily casual styling for relatable ecommerce presentation' }
];

const ETSY_INSPIRED_TSHIRT_SCENES: EtsyInspiredTshirtScene[] = [
  { sceneTag: 'urban_crosswalk', title: 'Urban Crosswalk', settingTag: 'outdoor', sceneDirection: 'busy downtown crosswalk scene' },
  { sceneTag: 'cozy_coffee_shop', title: 'Cozy Coffee Shop', settingTag: 'indoor', sceneDirection: 'cozy coffee shop environment' },
  { sceneTag: 'patio_friends', title: 'Patio Friends', settingTag: 'outdoor', sceneDirection: 'casual patio hangout setting' },
  { sceneTag: 'skatepark_concrete', title: 'Concrete Skatepark', settingTag: 'outdoor', sceneDirection: 'concrete skatepark backdrop' },
  { sceneTag: 'rooftop_city', title: 'City Rooftop', settingTag: 'outdoor', sceneDirection: 'city rooftop with skyline depth' },
  { sceneTag: 'gym_locker_corridor', title: 'Gym Corridor', settingTag: 'indoor', sceneDirection: 'gym locker corridor setting' },
  { sceneTag: 'record_store_aisle', title: 'Record Store', settingTag: 'indoor', sceneDirection: 'record store aisle with music culture vibe' },
  { sceneTag: 'boutique_rack', title: 'Boutique Rack', settingTag: 'indoor', sceneDirection: 'boutique fashion rack environment' },
  { sceneTag: 'industrial_warehouse', title: 'Industrial Warehouse', settingTag: 'indoor', sceneDirection: 'industrial warehouse scene with depth' },
  { sceneTag: 'cyclorama_studio', title: 'Cyclorama Studio', settingTag: 'indoor', sceneDirection: 'clean white cyclorama studio setup' },
  { sceneTag: 'exterior_shutter_wall', title: 'Exterior Shutter Wall', settingTag: 'outdoor', sceneDirection: 'street exterior shutter wall scene' },
  { sceneTag: 'brick_alley', title: 'Brick Alley', settingTag: 'outdoor', sceneDirection: 'urban brick alley location' },
  { sceneTag: 'subway_platform', title: 'Subway Platform', settingTag: 'indoor', sceneDirection: 'subway platform scene with commuter mood' },
  { sceneTag: 'campus_courtyard', title: 'Campus Courtyard', settingTag: 'outdoor', sceneDirection: 'college campus courtyard scene' },
  { sceneTag: 'beach_boardwalk', title: 'Beach Boardwalk', settingTag: 'outdoor', sceneDirection: 'coastal beach boardwalk setting' },
  { sceneTag: 'mountain_viewpoint', title: 'Mountain Viewpoint', settingTag: 'outdoor', sceneDirection: 'mountain viewpoint landscape scene' },
  { sceneTag: 'desert_festival_grounds', title: 'Desert Festival', settingTag: 'outdoor', sceneDirection: 'desert festival grounds environment' },
  { sceneTag: 'gallery_hall', title: 'Gallery Hall', settingTag: 'indoor', sceneDirection: 'minimal contemporary gallery hall' },
  { sceneTag: 'bookstore_corner', title: 'Bookstore Corner', settingTag: 'indoor', sceneDirection: 'bookstore corner lifestyle setting' },
  { sceneTag: 'arcade_neon', title: 'Arcade Neon', settingTag: 'indoor', sceneDirection: 'retro arcade with neon ambiance' }
];

const ETSY_INSPIRED_OUTDOOR_WEATHERS: EtsyInspiredTshirtWeather[] = [
  { weatherTag: 'clear_daylight', title: 'Clear Daylight', weatherDirection: 'clear natural daylight' },
  { weatherTag: 'golden_hour', title: 'Golden Hour', weatherDirection: 'golden hour sunlight' },
  { weatherTag: 'overcast_soft', title: 'Overcast Soft', weatherDirection: 'soft overcast lighting' },
  { weatherTag: 'cloudy_breeze', title: 'Cloudy Breeze', weatherDirection: 'cloudy breeze conditions' },
  { weatherTag: 'light_drizzle', title: 'Light Drizzle', weatherDirection: 'light drizzle with subtle wet reflections' },
  { weatherTag: 'misty_morning', title: 'Misty Morning', weatherDirection: 'misty morning atmosphere' },
  { weatherTag: 'windy_dusk', title: 'Windy Dusk', weatherDirection: 'windy dusk with directional light' },
  { weatherTag: 'sunset_glow', title: 'Sunset Glow', weatherDirection: 'sunset glow with warm highlights' },
  { weatherTag: 'night_neon_reflections', title: 'Night Neon', weatherDirection: 'night neon reflections' },
  { weatherTag: 'winter_snow', title: 'Winter Snow', weatherDirection: 'winter snowy atmosphere' }
];

const ETSY_INSPIRED_INDOOR_WEATHERS: EtsyInspiredTshirtWeather[] = [
  { weatherTag: 'window_soft_light', title: 'Window Soft Light', weatherDirection: 'soft window light' },
  { weatherTag: 'studio_softbox', title: 'Studio Softbox', weatherDirection: 'diffused studio softbox lighting' },
  { weatherTag: 'high_key_even', title: 'High-Key Even', weatherDirection: 'even high-key lighting' },
  { weatherTag: 'rim_light_controlled', title: 'Rim Light', weatherDirection: 'controlled rim lighting' },
  { weatherTag: 'warm_tungsten', title: 'Warm Tungsten', weatherDirection: 'warm tungsten practical lights' },
  { weatherTag: 'cool_fluorescent', title: 'Cool Fluorescent', weatherDirection: 'cool fluorescent ambient lights' },
  { weatherTag: 'gallery_spot', title: 'Gallery Spot', weatherDirection: 'focused gallery spot lighting' },
  { weatherTag: 'moody_ambient', title: 'Moody Ambient', weatherDirection: 'moody ambient low-key light' },
  { weatherTag: 'backstage_haze', title: 'Backstage Haze', weatherDirection: 'subtle backstage haze lighting' },
  { weatherTag: 'retail_daylight_mix', title: 'Retail Daylight Mix', weatherDirection: 'mixed retail daylight and fill light' }
];

function buildEtsyInspiredTshirtPrompts(count: number): PromptLibraryItem[] {
  return Array.from({ length: count }, (_, idx) => {
    const scene = ETSY_INSPIRED_TSHIRT_SCENES[idx % ETSY_INSPIRED_TSHIRT_SCENES.length];
    const style = ETSY_INSPIRED_TSHIRT_STYLES[(idx * 3 + 1) % ETSY_INSPIRED_TSHIRT_STYLES.length];
    const weatherPool = scene.settingTag === 'indoor' ? ETSY_INSPIRED_INDOOR_WEATHERS : ETSY_INSPIRED_OUTDOOR_WEATHERS;
    const weather = weatherPool[(idx * 5 + Math.floor(idx / 4)) % weatherPool.length];
    const idSerial = `${idx + 1}`.padStart(3, '0');

    return {
      id: `auto-tshirt-etsy-pack-${idSerial}`,
      mode: 'auto_mockup',
      category: scene.settingTag === 'indoor' ? 'T-Shirt On-Model | Indoor' : 'T-Shirt On-Model | Outdoor',
      title: `${style.title} ${scene.title} ${idSerial}`,
      prompt: [
        `Create a photorealistic t-shirt mockup with ${style.styleDirection} on a standing model wearing an oversized black t-shirt in a ${scene.sceneDirection}.`,
        `Use ${weather.weatherDirection}, keep cotton fabric folds physically believable, and integrate the uploaded design naturally on the chest print area.`,
        'Preserve typography and shape readability, keep proportions true, and avoid adding any extra text, logos, or watermark.'
      ].join(' '),
      productType: 'tshirt',
      styleTag: style.styleTag,
      sceneTag: scene.sceneTag,
      weatherTag: weather.weatherTag,
      settingTag: scene.settingTag
    };
  });
}

const ETSY_INSPIRED_TSHIRT_PROMPTS: PromptLibraryItem[] = buildEtsyInspiredTshirtPrompts(
  ETSY_INSPIRED_TSHIRT_PROMPT_COUNT
);

function buildEtsyInspiredSceneCanvasTshirtPrompts(count: number): PromptLibraryItem[] {
  return Array.from({ length: count }, (_, idx) => {
    const scene = ETSY_INSPIRED_TSHIRT_SCENES[idx % ETSY_INSPIRED_TSHIRT_SCENES.length];
    const style = ETSY_INSPIRED_TSHIRT_STYLES[(idx * 7 + 2) % ETSY_INSPIRED_TSHIRT_STYLES.length];
    const weatherPool = scene.settingTag === 'indoor' ? ETSY_INSPIRED_INDOOR_WEATHERS : ETSY_INSPIRED_OUTDOOR_WEATHERS;
    const weather = weatherPool[(idx * 3 + Math.floor(idx / 5)) % weatherPool.length];
    const idSerial = `${idx + 1}`.padStart(3, '0');

    return {
      id: `scene-tshirt-etsy-pack-${idSerial}`,
      mode: 'scene_canvas',
      category: scene.settingTag === 'indoor' ? 'Scene-Only T-Shirt | Indoor' : 'Scene-Only T-Shirt | Outdoor',
      title: `${style.title} ${scene.title} Scene ${idSerial}`,
      prompt: [
        `Generate a photorealistic commercial scene for t-shirt mockup compositing in a ${scene.sceneDirection}.`,
        `Apply ${style.styleDirection} and ${weather.weatherDirection}, with realistic depth and lens behavior.`,
        'Include one clear front-facing oversized black t-shirt placement target area for later manual design overlay in Scene Canvas. Keep the area unobstructed and readable.',
        'No logos, no random text, no watermark, no additional design prints on the shirt.'
      ].join(' '),
      productType: 'tshirt',
      styleTag: style.styleTag,
      sceneTag: scene.sceneTag,
      weatherTag: weather.weatherTag,
      settingTag: scene.settingTag
    };
  });
}

const ETSY_INSPIRED_SCENE_CANVAS_TSHIRT_PROMPTS: PromptLibraryItem[] = buildEtsyInspiredSceneCanvasTshirtPrompts(
  ETSY_INSPIRED_SCENE_CANVAS_TSHIRT_PROMPT_COUNT
);

const ETSY_STYLE_TITLE_TR: Record<string, string> = {
  streetwear_oversized: 'Oversized Streetwear',
  vintage_retro: 'Vintage Retro',
  minimal_brand: 'Minimal Marka',
  grunge_texture: 'Grunge Doku',
  athleisure_clean: 'Athleisure Temiz',
  boho_lifestyle: 'Boho Yasam Tarzi',
  y2k_graphic: 'Y2K Grafik',
  techwear_modern: 'Techwear Modern',
  editorial_fashion: 'Editorial Moda',
  casual_daily: 'Gunluk Casual'
};

const ETSY_SCENE_TITLE_TR: Record<string, string> = {
  urban_crosswalk: 'Sehir Gecidi',
  cozy_coffee_shop: 'Rahat Kahve Dukkani',
  patio_friends: 'Patio Bulusmasi',
  skatepark_concrete: 'Beton Skatepark',
  rooftop_city: 'Sehir Catisi',
  gym_locker_corridor: 'Spor Salonu Koridoru',
  record_store_aisle: 'Plakci Koridoru',
  boutique_rack: 'Butik Standi',
  industrial_warehouse: 'Endustriyel Depo',
  cyclorama_studio: 'Cyclorama Studyo',
  exterior_shutter_wall: 'Dis Mekan Kepenk Duvari',
  brick_alley: 'Tugla Sokak',
  subway_platform: 'Metro Peronu',
  campus_courtyard: 'Kampus Avlusu',
  beach_boardwalk: 'Sahil Yolu',
  mountain_viewpoint: 'Dag Seyir Noktasi',
  desert_festival_grounds: 'Col Festival Alani',
  gallery_hall: 'Galeri Salonu',
  bookstore_corner: 'Kitapci Kosesi',
  arcade_neon: 'Neon Arcade'
};

const ETSY_WEATHER_TITLE_TR: Record<string, string> = {
  clear_daylight: 'Acik Gun Isigi',
  golden_hour: 'Altin Saat',
  overcast_soft: 'Yumusak Kapali Hava',
  cloudy_breeze: 'Bulutlu Esinti',
  light_drizzle: 'Hafif Cise',
  misty_morning: 'Sisli Sabah',
  windy_dusk: 'Ruzgarli Alacakaranlik',
  sunset_glow: 'Gunbatimi Isiltisi',
  night_neon_reflections: 'Gece Neon Yansima',
  winter_snow: 'Kis Karyagisi',
  window_soft_light: 'Yumusak Pencere Isigi',
  studio_softbox: 'Studyo Softbox',
  high_key_even: 'Esit High-Key Isik',
  rim_light_controlled: 'Kontrollu Rim Isik',
  warm_tungsten: 'Sicak Tungsten',
  cool_fluorescent: 'Serin Floresan',
  gallery_spot: 'Galeri Spot Isik',
  moody_ambient: 'Moodlu Ambiyans',
  backstage_haze: 'Backstage Haze',
  retail_daylight_mix: 'Perakende Gun Isigi Karisimi'
};

function buildEtsyInspiredTshirtPromptTranslations(prompts: PromptLibraryItem[]): Record<string, PromptLibraryTranslation> {
  const result: Record<string, PromptLibraryTranslation> = {};

  for (const item of prompts) {
    const serialMatch = item.id.match(/(\d+)$/);
    const serial = serialMatch ? serialMatch[1] : '';
    const styleTitle = ETSY_STYLE_TITLE_TR[item.styleTag ?? ''] ?? formatFilterTagLabel(item.styleTag ?? '');
    const sceneTitle = ETSY_SCENE_TITLE_TR[item.sceneTag ?? ''] ?? formatFilterTagLabel(item.sceneTag ?? '');
    const weatherTitle = ETSY_WEATHER_TITLE_TR[item.weatherTag ?? ''] ?? formatFilterTagLabel(item.weatherTag ?? '');
    const category = item.settingTag === 'indoor' ? 'T-Shirt Model Uzerinde | Ic Mekan' : 'T-Shirt Model Uzerinde | Dis Mekan';

    result[item.id] = {
      category,
      title: `${styleTitle} ${sceneTitle}${serial ? ` ${serial}` : ''}`.trim(),
      prompt: [
        `Fotogercekci bir t-shirt mockupi olustur: ${styleTitle.toLowerCase()} yaklasiminda, ${sceneTitle.toLowerCase()} sahnesinde ayakta duran model oversized siyah t-shirt giysin.`,
        `${weatherTitle.toLowerCase()} kosullarini kullan, yuklenen tasarimi gogus baski alanina dogal sekilde yerlestir.`,
        'Kumas kirisimlarini fiziksel olarak gercekci tut, tipografi ve sekil okunurlugunu koru, ekstra yazi, logo veya watermark ekleme.'
      ].join(' ')
    };
  }

  return result;
}

const ETSY_INSPIRED_TSHIRT_PROMPTS_TR: Record<string, PromptLibraryTranslation> =
  buildEtsyInspiredTshirtPromptTranslations(ETSY_INSPIRED_TSHIRT_PROMPTS);

function buildEtsyInspiredSceneCanvasPromptTranslations(
  prompts: PromptLibraryItem[]
): Record<string, PromptLibraryTranslation> {
  const result: Record<string, PromptLibraryTranslation> = {};

  for (const item of prompts) {
    const serialMatch = item.id.match(/(\d+)$/);
    const serial = serialMatch ? serialMatch[1] : '';
    const styleTitle = ETSY_STYLE_TITLE_TR[item.styleTag ?? ''] ?? formatFilterTagLabel(item.styleTag ?? '');
    const sceneTitle = ETSY_SCENE_TITLE_TR[item.sceneTag ?? ''] ?? formatFilterTagLabel(item.sceneTag ?? '');
    const weatherTitle = ETSY_WEATHER_TITLE_TR[item.weatherTag ?? ''] ?? formatFilterTagLabel(item.weatherTag ?? '');
    const category = item.settingTag === 'indoor' ? 'Sadece Sahne | T-Shirt | Ic Mekan' : 'Sadece Sahne | T-Shirt | Dis Mekan';

    result[item.id] = {
      category,
      title: `${styleTitle} ${sceneTitle} Sahne${serial ? ` ${serial}` : ''}`.trim(),
      prompt: [
        `${sceneTitle.toLowerCase()} ortaminda t-shirt mockup birlestirmesi icin fotogercekci ticari bir sahne uret.`,
        `${styleTitle.toLowerCase()} sanat yonu ve ${weatherTitle.toLowerCase()} isik/hava karakterini uygula; derinlik ve lens davranisi gercekci olsun.`,
        'Scene Canvas icin daha sonra manuel tasarim overlay yapilabilecek, onde net gorunen oversized siyah t-shirt hedef alani birak.',
        'Tisort uzerinde logo, rastgele yazi, watermark veya ekstra baski olmasin.'
      ].join(' ')
    };
  }

  return result;
}

const ETSY_INSPIRED_SCENE_CANVAS_TSHIRT_PROMPTS_TR: Record<string, PromptLibraryTranslation> =
  buildEtsyInspiredSceneCanvasPromptTranslations(ETSY_INSPIRED_SCENE_CANVAS_TSHIRT_PROMPTS);

const PROMPT_LIBRARY: PromptLibraryItem[] = [
  {
    id: 'auto-studio-product',
    mode: 'auto_mockup',
    category: 'Commercial Product Shot',
    title: 'Studio Product Photo',
    prompt:
      'A high-resolution, studio-lit product photograph of this design on a minimalist matte black ceramic mug. Three-point softbox lighting, clean polished surface, 45-degree camera angle, sharp focus, premium ecommerce style, square composition.'
  },
  {
    id: 'auto-tshirt-streetwear',
    mode: 'auto_mockup',
    category: 'T-Shirt On-Model',
    title: 'Streetwear Lifestyle',
    prompt:
      'Create a photorealistic streetwear mockup: oversized black t-shirt on a standing model in an urban outdoor scene. Place the uploaded design naturally on the chest area, keep fabric folds realistic, preserve design readability, avoid extra text or logos.',
    productType: 'tshirt',
    styleTag: 'streetwear',
    sceneTag: 'urban',
    weatherTag: 'neutral_daylight',
    settingTag: 'outdoor'
  },
  {
    id: 'auto-tshirt-urban-golden-hour',
    mode: 'auto_mockup',
    category: 'T-Shirt On-Model | Outdoor',
    title: 'Urban Golden Hour',
    prompt:
      'Create a photorealistic oversized black t-shirt mockup on a standing model at a downtown crosswalk during golden hour. Place the uploaded design naturally on the chest print area, keep fabric folds and shadows physically realistic, preserve full readability, and do not add extra text or logos.',
    productType: 'tshirt',
    styleTag: 'streetwear',
    sceneTag: 'urban',
    weatherTag: 'golden_hour',
    settingTag: 'outdoor'
  },
  {
    id: 'auto-tshirt-neon-rain',
    mode: 'auto_mockup',
    category: 'T-Shirt On-Model | Outdoor',
    title: 'Neon Rain Night',
    prompt:
      'Generate a photorealistic oversized black t-shirt mockup on a model in a rainy night street scene with reflected neon lights. Integrate the uploaded design on the chest area with realistic wet-fabric behavior, perspective, and lighting while keeping the design readable. No extra text, no added logos.',
    productType: 'tshirt',
    styleTag: 'night_streetwear',
    sceneTag: 'urban_night',
    weatherTag: 'rainy',
    settingTag: 'outdoor'
  },
  {
    id: 'auto-tshirt-skate-overcast',
    mode: 'auto_mockup',
    category: 'T-Shirt On-Model | Outdoor',
    title: 'Skatepark Overcast',
    prompt:
      'Create a photorealistic skater-style mockup: model standing at a concrete skatepark under overcast daylight wearing an oversized black t-shirt. Apply the uploaded design naturally to the chest print zone, keep cloth wrinkles realistic, maintain sharp readability, and avoid extra graphics or logos.',
    productType: 'tshirt',
    styleTag: 'skater',
    sceneTag: 'skatepark',
    weatherTag: 'overcast',
    settingTag: 'outdoor'
  },
  {
    id: 'auto-tshirt-rooftop-windy',
    mode: 'auto_mockup',
    category: 'T-Shirt On-Model | Outdoor',
    title: 'Rooftop Windy Dusk',
    prompt:
      'Create a photorealistic mockup of a model on a city rooftop at windy dusk wearing an oversized black t-shirt. Place the uploaded design on the chest area with natural perspective and subtle fabric tension from wind, preserve design clarity, and do not introduce additional text or logos.',
    productType: 'tshirt',
    styleTag: 'techwear',
    sceneTag: 'rooftop',
    weatherTag: 'windy_dusk',
    settingTag: 'outdoor'
  },
  {
    id: 'auto-tshirt-winter-snow',
    mode: 'auto_mockup',
    category: 'T-Shirt On-Model | Outdoor',
    title: 'Winter City Snow',
    prompt:
      'Generate a photorealistic winter streetwear mockup with a standing model in a snowy city sidewalk scene, wearing an oversized black t-shirt layered for cold weather. Keep the uploaded design naturally placed on chest level, protect readability, preserve realistic folds, and add no extra text or logos.',
    productType: 'tshirt',
    styleTag: 'winter_streetwear',
    sceneTag: 'city_sidewalk',
    weatherTag: 'snowy',
    settingTag: 'outdoor'
  },
  {
    id: 'auto-tshirt-beach-boardwalk',
    mode: 'auto_mockup',
    category: 'T-Shirt On-Model | Outdoor',
    title: 'Beach Boardwalk Sunny',
    prompt:
      'Create a photorealistic lifestyle mockup on a model standing on a sunny beach boardwalk, wearing an oversized black t-shirt. Apply the uploaded design naturally on the chest print area with realistic fabric drape and sunlight shadows, keep the artwork readable, and avoid extra logos or text.',
    productType: 'tshirt',
    styleTag: 'coastal',
    sceneTag: 'boardwalk',
    weatherTag: 'sunny',
    settingTag: 'outdoor'
  },
  {
    id: 'auto-tshirt-desert-festival',
    mode: 'auto_mockup',
    category: 'T-Shirt On-Model | Outdoor',
    title: 'Desert Festival Sunset',
    prompt:
      'Create a photorealistic oversized black t-shirt mockup with a standing model in an open desert festival environment at sunset. Place the uploaded design naturally on chest position with realistic dust-light interaction and fabric texture, preserve print readability, and do not add any extra text or branding.',
    productType: 'tshirt',
    styleTag: 'festival',
    sceneTag: 'desert',
    weatherTag: 'sunset',
    settingTag: 'outdoor'
  },
  {
    id: 'auto-tshirt-forest-mist',
    mode: 'auto_mockup',
    category: 'T-Shirt On-Model | Outdoor',
    title: 'Forest Trail Misty Morning',
    prompt:
      'Generate a photorealistic mockup of a model standing on a forest trail in misty morning light, wearing an oversized black t-shirt. Embed the uploaded chest design naturally with realistic folds and moisture-softened lighting, keep design details readable, and include no extra text or logos.',
    productType: 'tshirt',
    styleTag: 'outdoor_minimal',
    sceneTag: 'forest_trail',
    weatherTag: 'misty_morning',
    settingTag: 'outdoor'
  },
  {
    id: 'auto-tshirt-mountain-clear',
    mode: 'auto_mockup',
    category: 'T-Shirt On-Model | Outdoor',
    title: 'Mountain Lookout Clear Noon',
    prompt:
      'Create a photorealistic t-shirt mockup with a standing model on a mountain lookout under clear noon light. Keep the oversized black t-shirt realistic, place the uploaded design on chest area with accurate perspective and folds, preserve readability, and avoid additional text, logos, or watermarks.',
    productType: 'tshirt',
    styleTag: 'adventure',
    sceneTag: 'mountain',
    weatherTag: 'clear_noon',
    settingTag: 'outdoor'
  },
  {
    id: 'auto-tshirt-lakeside-cloudy',
    mode: 'auto_mockup',
    category: 'T-Shirt On-Model | Outdoor',
    title: 'Lakeside Cloudy Breeze',
    prompt:
      'Generate a photorealistic oversized black t-shirt mockup on a model standing by a lakeside path in cool cloudy weather. Integrate the uploaded design naturally on the chest print zone, keep fabric behavior realistic in light breeze, preserve artwork legibility, and do not add any extra logos or text.',
    productType: 'tshirt',
    styleTag: 'minimal',
    sceneTag: 'lakeside',
    weatherTag: 'cloudy',
    settingTag: 'outdoor'
  },
  {
    id: 'auto-tshirt-cyclorama-softbox',
    mode: 'auto_mockup',
    category: 'T-Shirt On-Model | Indoor',
    title: 'Cyclorama Softbox Studio',
    prompt:
      'Create a photorealistic oversized black t-shirt mockup in a white cyclorama studio with softbox lighting and a standing model facing camera. Place the uploaded design naturally on chest level, keep cotton wrinkles realistic, maintain high readability, and add no extra text or logos.',
    productType: 'tshirt',
    styleTag: 'studio_clean',
    sceneTag: 'cyclorama',
    weatherTag: 'controlled_softbox',
    settingTag: 'indoor'
  },
  {
    id: 'auto-tshirt-dark-studio-rim',
    mode: 'auto_mockup',
    category: 'T-Shirt On-Model | Indoor',
    title: 'Dark Studio Rim Light',
    prompt:
      'Generate a photorealistic mockup in a dark photo studio with controlled rim lighting, featuring a standing model wearing an oversized black t-shirt. Apply the uploaded design to the chest area with realistic shading and cloth depth, keep the design readable, and avoid extra branding or text.',
    productType: 'tshirt',
    styleTag: 'editorial_dark',
    sceneTag: 'dark_studio',
    weatherTag: 'controlled_rim_light',
    settingTag: 'indoor'
  },
  {
    id: 'auto-tshirt-concrete-loft-editorial',
    mode: 'auto_mockup',
    category: 'T-Shirt On-Model | Indoor',
    title: 'Concrete Loft Editorial',
    prompt:
      'Create a photorealistic editorial fashion mockup in an industrial concrete loft interior with side daylight. The standing model wears an oversized black t-shirt; place the uploaded design naturally on the chest print area, keep folds authentic, preserve readability, and include no extra text or logos.',
    productType: 'tshirt',
    styleTag: 'editorial',
    sceneTag: 'loft',
    weatherTag: 'window_daylight',
    settingTag: 'indoor'
  },
  {
    id: 'auto-tshirt-warehouse-tungsten',
    mode: 'auto_mockup',
    category: 'T-Shirt On-Model | Indoor',
    title: 'Warehouse Tungsten Mood',
    prompt:
      'Generate a photorealistic oversized black t-shirt mockup in a warehouse interior with warm tungsten practical lights. Keep the model standing naturally, place the uploaded design on chest area with accurate perspective and textile shadows, maintain readability, and avoid extra text or logos.',
    productType: 'tshirt',
    styleTag: 'grunge',
    sceneTag: 'warehouse',
    weatherTag: 'warm_tungsten',
    settingTag: 'indoor'
  },
  {
    id: 'auto-tshirt-highkey-ecom',
    mode: 'auto_mockup',
    category: 'T-Shirt On-Model | Indoor',
    title: 'High-Key Ecommerce',
    prompt:
      'Create a high-key ecommerce mockup with a front-facing standing model in an evenly lit indoor studio, wearing an oversized black t-shirt. Integrate the uploaded chest design naturally with clean fabric detail, keep proportions true and readable, and add no extra logos or text.',
    productType: 'tshirt',
    styleTag: 'ecommerce',
    sceneTag: 'studio_ecommerce',
    weatherTag: 'controlled_high_key',
    settingTag: 'indoor'
  },
  {
    id: 'auto-tshirt-cafe-window',
    mode: 'auto_mockup',
    category: 'T-Shirt On-Model | Indoor',
    title: 'Cafe Window Light',
    prompt:
      'Generate a photorealistic lifestyle mockup in a cozy cafe interior with soft window light. The model stands naturally wearing an oversized black t-shirt; place the uploaded design on chest position with believable folds and shadows, keep artwork readable, and avoid any extra text or logos.',
    productType: 'tshirt',
    styleTag: 'casual_lifestyle',
    sceneTag: 'cafe',
    weatherTag: 'window_soft_light',
    settingTag: 'indoor'
  },
  {
    id: 'auto-tshirt-record-store',
    mode: 'auto_mockup',
    category: 'T-Shirt On-Model | Indoor',
    title: 'Record Store Aisle',
    prompt:
      'Create a photorealistic street-culture mockup inside a record store aisle with moody ambient lighting. Show a standing model in an oversized black t-shirt, apply the uploaded design naturally on the chest area, preserve print readability, keep fabric realism, and add no extra logos or text.',
    productType: 'tshirt',
    styleTag: 'street_culture',
    sceneTag: 'record_store',
    weatherTag: 'indoor_ambient',
    settingTag: 'indoor'
  },
  {
    id: 'auto-tshirt-apartment-mirror',
    mode: 'auto_mockup',
    category: 'T-Shirt On-Model | Indoor',
    title: 'Apartment Mirror Casual',
    prompt:
      'Generate a photorealistic casual indoor mockup in a modern apartment mirror setup, with a standing model wearing an oversized black t-shirt. Place the uploaded design on the chest print zone naturally with realistic cloth tension and perspective, maintain legibility, and avoid extra text or logos.',
    productType: 'tshirt',
    styleTag: 'casual',
    sceneTag: 'apartment',
    weatherTag: 'indoor_daylight',
    settingTag: 'indoor'
  },
  {
    id: 'auto-tshirt-gym-locker',
    mode: 'auto_mockup',
    category: 'T-Shirt On-Model | Indoor',
    title: 'Gym Locker Corridor',
    prompt:
      'Create a photorealistic athleisure mockup in a gym locker corridor with a standing model wearing an oversized black t-shirt. Integrate the uploaded design on chest level with realistic folds, sweat-free clean textile detail, and controlled lighting. Keep readability high and add no extra logos or text.',
    productType: 'tshirt',
    styleTag: 'athleisure',
    sceneTag: 'gym',
    weatherTag: 'controlled_fluorescent',
    settingTag: 'indoor'
  },
  {
    id: 'auto-tshirt-gallery-minimal',
    mode: 'auto_mockup',
    category: 'T-Shirt On-Model | Indoor',
    title: 'Minimal Gallery Interior',
    prompt:
      'Generate a photorealistic minimal-fashion mockup inside a contemporary gallery interior. The model stands in an oversized black t-shirt; place the uploaded design naturally in the chest area, keep clean drape and realistic folds, preserve readability, and avoid extra text, logos, or branding.',
    productType: 'tshirt',
    styleTag: 'minimal_fashion',
    sceneTag: 'gallery',
    weatherTag: 'controlled_gallery_light',
    settingTag: 'indoor'
  },
  ...ETSY_INSPIRED_TSHIRT_PROMPTS,
  {
    id: 'auto-wall-art-interior',
    mode: 'auto_mockup',
    category: 'Wall Art',
    title: 'Modern Interior Frame',
    prompt:
      'Generate a premium wall art mockup in a modern living room with neutral tones and soft daylight. Apply the uploaded design inside a framed poster area on the wall, realistic frame shadow, clean interior styling, marketplace-ready photo.'
  },
  {
    id: 'auto-flatlay',
    mode: 'auto_mockup',
    category: 'Flat Lay',
    title: 'Flat Lay Ecommerce',
    prompt:
      'Create a flat-lay ecommerce mockup with a neatly arranged garment on a simple textured surface. Place the uploaded design realistically on the front print area, maintain true proportions, sharp focus, clean composition, no clutter.'
  },
  {
    id: 'auto-detail-preserve',
    mode: 'auto_mockup',
    category: 'Detail Preservation',
    title: 'High-Fidelity Design Lock',
    prompt:
      'Preserve the uploaded design exactly: composition, typography, symbols, and colors must remain unchanged. Integrate it naturally onto the product surface with realistic perspective and lighting. Do not add any random text, logos, or extra graphics.'
  },
  {
    id: 'auto-multi-reference',
    mode: 'auto_mockup',
    category: 'Multi-Reference',
    title: 'Design + Scene Composite',
    prompt:
      'Use image 1 as the exact design artwork and image 2 as the target environment reference. Create one realistic commercial mockup that keeps the scene identity while embedding the design naturally with proper shadows, perspective, and surface interaction.'
  },
  {
    id: 'auto-add-element-edit',
    mode: 'auto_mockup',
    category: 'Image Editing',
    title: 'Add or Remove Elements',
    prompt:
      'Using the provided source image, add one subtle commercial prop that matches lighting and perspective. Keep the original composition and product unchanged. No extra text, no watermark, no random logos.'
  },
  {
    id: 'auto-style-transfer',
    mode: 'auto_mockup',
    category: 'Style Transfer',
    title: 'Style Transfer (Keep Layout)',
    prompt:
      'Transform the provided scene into a stylized visual treatment while preserving the original composition and key object positions. Keep the primary product area readable and clean for ecommerce presentation.'
  },
  {
    id: 'auto-fashion-composition',
    mode: 'auto_mockup',
    category: 'Advanced Composition',
    title: 'Two-Image Product Composition',
    prompt:
      'Create one professional ecommerce composition: use image 1 as the product/design source and image 2 as the model/environment source. Blend them naturally with realistic shadows and color matching. Final output should look like a real product photo.'
  },
  {
    id: 'auto-logo-preservation',
    mode: 'auto_mockup',
    category: 'Detail Preservation',
    title: 'Logo Fidelity Transfer',
    prompt:
      'Take image 1 as the base subject and image 2 as the exact logo/art element. Preserve subject identity and facial/body features completely. Apply the logo naturally to the target surface, following perspective and material folds without distortion.'
  },
  {
    id: 'auto-character-consistency',
    mode: 'auto_mockup',
    category: 'Consistency',
    title: 'Character Angle Variant',
    prompt:
      'Keep this same person/character identity and generate a new angle variant (right profile studio shot). Preserve facial structure, hairstyle, and accessories while changing only pose/camera direction.'
  },
  {
    id: 'auto-step-by-step-scene',
    mode: 'auto_mockup',
    category: 'Best Practice',
    title: 'Step-by-Step Composition Prompt',
    prompt:
      'Step 1: create a clean commercial background with soft natural light. Step 2: place the main product surface in the foreground with realistic depth. Step 3: apply the uploaded design to the target area with accurate perspective and shadows. Step 4: refine texture and readability for marketplace quality.'
  },
  {
    id: 'auto-camera-control',
    mode: 'auto_mockup',
    category: 'Camera Direction',
    title: 'Camera-Controlled Product Shot',
    prompt:
      'Generate a photorealistic commercial shot using a 45-degree camera angle, medium focal length look, shallow depth of field, and soft three-point lighting. Keep the main product centered and crisp, with clean negative space.'
  },
  ...ETSY_INSPIRED_SCENE_CANVAS_TSHIRT_PROMPTS,
  {
    id: 'scene-living-room-wall',
    mode: 'scene_canvas',
    category: 'Scene-Only Background',
    title: 'Living Room Poster Wall',
    prompt:
      'Photorealistic modern living room with a clean beige wall and a clear rectangular poster area at eye level. Soft natural window light, minimal decor, balanced composition, no text, no logos, no watermark.'
  },
  {
    id: 'scene-studio-tabletop',
    mode: 'scene_canvas',
    category: 'Scene-Only Background',
    title: 'Studio Tabletop',
    prompt:
      'Professional product photography background: neutral studio environment, subtle concrete tabletop, smooth gradient backdrop, soft diffused lighting, strong depth separation, clean central placement zone, no branding elements.'
  },
  {
    id: 'scene-cafe-shelf',
    mode: 'scene_canvas',
    category: 'Scene-Only Background',
    title: 'Cafe Shelf Mood',
    prompt:
      'Photorealistic cozy cafe interior with warm morning light and a clean empty display shelf area in the foreground for product placement. Commercial lifestyle look, natural shadows, no text, no logos, no watermark.'
  },
  {
    id: 'scene-boutique-hanger',
    mode: 'scene_canvas',
    category: 'Scene-Only Background',
    title: 'Boutique Clothing Scene',
    prompt:
      'Create a clean boutique clothing environment with one plain t-shirt hanging front-facing on a rack as a clear placement target. Editorial ecommerce lighting, realistic texture, uncluttered background, no logos or text.'
  },
  {
    id: 'scene-gallery-wall',
    mode: 'scene_canvas',
    category: 'Scene-Only Background',
    title: 'Gallery Wall',
    prompt:
      'Minimal contemporary gallery interior with a single empty framed canvas area on a white wall. Soft museum lighting, high realism, centered composition, no text, no brand marks, no additional artwork.'
  },
  {
    id: 'scene-semantic-negative',
    mode: 'scene_canvas',
    category: 'Best Practice',
    title: 'Semantic Negative Example',
    prompt:
      'An empty, calm studio interior with no signs of crowding or distractions, clean floor and wall, central product staging zone, balanced natural lighting, and no visible branding elements.'
  },
  {
    id: 'auto-product-packshot',
    mode: 'auto_mockup',
    category: 'Commercial Product Shot',
    title: '45-Degree Packshot',
    prompt:
      'Create a high-resolution studio product photo for ecommerce. Use a 45-degree camera angle, three-point diffused lighting, clean polished surface, and realistic shadows. Place the uploaded design naturally on the product and keep all design details sharp and unchanged.'
  },
  {
    id: 'auto-detail-lock-explicit',
    mode: 'auto_mockup',
    category: 'High-Fidelity',
    title: 'Critical Detail Lock',
    prompt:
      'Preserve critical details with zero drift: logo edges, letterforms, spacing, line thickness, and color values must remain intact. Integrate the design onto the target surface with physically plausible folds, shading, and perspective. No extra text, no watermark, no random labels.'
  },
  {
    id: 'auto-advanced-composition',
    mode: 'auto_mockup',
    category: 'Advanced Composition',
    title: 'Reference Merge Composition',
    prompt:
      'Create one commercial mockup from multiple references: keep image 1 as the exact design source and image 2 as the environment source. Match scene lighting and camera feel, then blend the design naturally with realistic contact shadows and surface interaction.'
  },
  {
    id: 'auto-iterative-refine',
    mode: 'auto_mockup',
    category: 'Iteration',
    title: 'Small-Change Iteration',
    prompt:
      'Keep everything the same as the previous concept, but apply only one controlled refinement: slightly warmer lighting and cleaner negative space around the product. Do not change design placement, scale, typography, or logo fidelity.'
  },
  {
    id: 'scene-gallery-lighting',
    mode: 'scene_canvas',
    category: 'Scene-Only Background',
    title: 'Gallery Spot Lighting',
    prompt:
      'Photorealistic gallery wall scene with soft spot lighting and one clean empty presentation zone in the center for later design placement. Keep geometry straight, textures realistic, and composition uncluttered. No text, no logos, no watermark.'
  },
  {
    id: 'scene-commercial-set',
    mode: 'scene_canvas',
    category: 'Scene-Only Background',
    title: 'Commercial Set Design',
    prompt:
      'Generate a premium commercial set with controlled studio lighting, subtle depth cues, and a clear foreground placement zone for product compositing. Use realistic materials and camera optics. Avoid visual noise, branding marks, and random typography.'
  },
  {
    id: 'scene-step-by-step',
    mode: 'scene_canvas',
    category: 'Best Practice',
    title: 'Step-by-Step Scene Prompt',
    prompt:
      'Step 1: create a clean photoreal background with balanced natural light. Step 2: add a clear foreground placement surface with believable perspective. Step 3: refine depth and material realism. Step 4: keep center area unobstructed for later design overlay.'
  }
];

const PROMPT_LIBRARY_TR: Record<string, PromptLibraryTranslation> = {
  ...ETSY_INSPIRED_TSHIRT_PROMPTS_TR,
  ...ETSY_INSPIRED_SCENE_CANVAS_TSHIRT_PROMPTS_TR,
  'auto-studio-product': {
    category: 'Ticari Urun Cekimi',
    title: 'Studyo Urun Fotografi',
    prompt:
      'Bu tasarimin minimalist mat siyah seramik kupa uzerinde yuksek cozunurlukte, studyo isiklandirmali urun fotografini olustur. Uc nokta softbox isik duzeni, temiz parlak zemin, 45 derece kamera acisi, keskin odak ve premium e-ticaret gorunumu kullan. Kare kompozisyon.'
  },
  'auto-tshirt-streetwear': {
    category: 'T-Shirt Model Uzerinde',
    title: 'Streetwear Yasam Tarzi',
    prompt:
      'Fotogercekci bir streetwear mockup olustur: sehir dis mekaninda ayakta duran modelin uzerindeki oversized siyah tisorte yuklenen tasarimi gogus bolgesine dogal sekilde yerlestir. Kumas kirisimlarini gercekci tut, tasarim okunurlugunu koru, ekstra yazi veya logo ekleme.'
  },
  'auto-tshirt-urban-golden-hour': {
    category: 'T-Shirt Model Uzerinde | Dis Mekan',
    title: 'Sehirde Altin Saat',
    prompt:
      'Fotogercekci bir oversized siyah t-shirt mockupi olustur: model sehir gecidinde altin saat isiginda ayakta dursun. Yuklenen tasarimi gogus baski alanina dogal sekilde yerlestir, kumas kirisimlari ve golgeleri gercekci tut, okunurlugu koru, ekstra yazi veya logo ekleme.'
  },
  'auto-tshirt-neon-rain': {
    category: 'T-Shirt Model Uzerinde | Dis Mekan',
    title: 'Yagmurlu Neon Gece',
    prompt:
      'Yagisli gece sokaginda neon yansimalarla fotogercekci oversized siyah t-shirt mockupi uret. Model ayakta olsun, yuklenen tasarimi gogus alanina dogal sekilde entegre et, isik ve islak kumas etkilerini gercekci tut, tasarim okunurlugunu koru, ekstra logo veya yazi ekleme.'
  },
  'auto-tshirt-skate-overcast': {
    category: 'T-Shirt Model Uzerinde | Dis Mekan',
    title: 'Kapali Havada Skatepark',
    prompt:
      'Bulutlu gunduzde beton skateparkta fotogercekci skater tarz oversized siyah t-shirt mockupi olustur. Tasarimi gogus bolgesine dogal yerlestir, kumas kirisimlarini gercekci koru, baski okunurlugunu dusurme, ekstra grafik, yazi veya logo ekleme.'
  },
  'auto-tshirt-rooftop-windy': {
    category: 'T-Shirt Model Uzerinde | Dis Mekan',
    title: 'Ruzgarli Cati Alacakaranligi',
    prompt:
      'Sehir catısında ruzgarli alacakaranlikta ayakta duran modelle fotogercekci oversized siyah t-shirt mockupi olustur. Yuklenen tasarimi gogus alanina perspektife uygun ve dogal sekilde uygula, ruzgarin yarattigi hafif gerilimi gercekci yansit, okunurlugu koru, ekstra yazi/logo ekleme.'
  },
  'auto-tshirt-winter-snow': {
    category: 'T-Shirt Model Uzerinde | Dis Mekan',
    title: 'Kis Sehir Karda',
    prompt:
      'Karli sehir kaldiriminda fotogercekci kis streetwear mockupi olustur; model oversized siyah t-shirt ile ayakta dursun. Tasarimi gogus seviyesinde dogal yerlestir, kumas dokusu ve kirisimlari gercekci tut, okunurlugu koru, ekstra yazi veya logo ekleme.'
  },
  'auto-tshirt-beach-boardwalk': {
    category: 'T-Shirt Model Uzerinde | Dis Mekan',
    title: 'Gunesli Sahil Yolu',
    prompt:
      'Gunesli sahil boardwalk sahnesinde fotogercekci lifestyle t-shirt mockupi olustur. Model oversized siyah t-shirt giysin; yuklenen tasarimi gogus baski alanina dogal sekilde yerlestir, gun isigi golgelerini ve kumas dokusunu gercekci tut, ekstra logo/yazi ekleme.'
  },
  'auto-tshirt-desert-festival': {
    category: 'T-Shirt Model Uzerinde | Dis Mekan',
    title: 'Col Festival Gunbatimi',
    prompt:
      'Gunbatiminda acik col festival ortaminda fotogercekci oversized siyah t-shirt mockupi uret. Model ayakta olsun, tasarimi gogus bolgesine dogal entegre et, tozlu isik etkisini gercekci yansit, baski okunurlugunu koru, ekstra metin veya marka ekleme.'
  },
  'auto-tshirt-forest-mist': {
    category: 'T-Shirt Model Uzerinde | Dis Mekan',
    title: 'Sisli Orman Sabah',
    prompt:
      'Sisli sabah isiginda orman patikasinda fotogercekci model t-shirt mockupi olustur. Oversized siyah t-shirt uzerine yuklenen tasarimi gogus alanina dogal uygula, yumusak isikla kumas kirisimlarini gercekci tut, tasarim okunurlugunu koru, ekstra logo/yazi ekleme.'
  },
  'auto-tshirt-mountain-clear': {
    category: 'T-Shirt Model Uzerinde | Dis Mekan',
    title: 'Dag Zirvesi Acik Oglen',
    prompt:
      'Acik oglen isiginda dag manzarasi noktasi uzerinde ayakta duran modelle fotogercekci t-shirt mockupi olustur. Oversized siyah tisortte tasarimi gogus alanina perspektife uygun ve dogal yerlestir, kirisimlari gercekci tut, ekstra logo, yazi veya watermark ekleme.'
  },
  'auto-tshirt-lakeside-cloudy': {
    category: 'T-Shirt Model Uzerinde | Dis Mekan',
    title: 'Bulutlu Gol Kenari',
    prompt:
      'Serin bulutlu havada gol kenarinda fotogercekci oversized siyah t-shirt mockupi olustur. Model ayakta dursun, yuklenen tasarimi gogus baski bolgesine dogal sekilde uygula, hafif esintiye uygun kumas davranisini koru, okunurlugu yuksek tut, ekstra yazi/logo ekleme.'
  },
  'auto-tshirt-cyclorama-softbox': {
    category: 'T-Shirt Model Uzerinde | Ic Mekan',
    title: 'Cyclorama Softbox Studyo',
    prompt:
      'Beyaz cyclorama studyoda yumusak softbox isikla fotogercekci oversized siyah t-shirt mockupi olustur. Model kameraya donuk ayakta olsun; tasarimi gogus bolgesine dogal yerlestir, kumas kirisimlarini gercekci tut, okunurlugu koru, ekstra text veya logo ekleme.'
  },
  'auto-tshirt-dark-studio-rim': {
    category: 'T-Shirt Model Uzerinde | Ic Mekan',
    title: 'Koyu Studyo Rim Isik',
    prompt:
      'Karanlik fotograf studyosunda kontrollu rim isikla fotogercekci oversized siyah t-shirt mockupi uret. Model ayakta dursun, tasarimi gogus alanina dogal sekilde uygula, golgelendirme ve kumas derinligini gercekci tut, ekstra logo veya yazi ekleme.'
  },
  'auto-tshirt-concrete-loft-editorial': {
    category: 'T-Shirt Model Uzerinde | Ic Mekan',
    title: 'Beton Loft Editorial',
    prompt:
      'Yandan gun isigi alan endustriyel beton loftta fotogercekci editorial model mockupi olustur. Oversized siyah t-shirt uzerine yuklenen tasarimi gogus baski alanina dogal sekilde yerlestir, kirisimlari gercekci tut, okunurlugu koru, ekstra yazi/logo ekleme.'
  },
  'auto-tshirt-warehouse-tungsten': {
    category: 'T-Shirt Model Uzerinde | Ic Mekan',
    title: 'Depo Tungsten Atmosfer',
    prompt:
      'Sicak tungsten pratik isiklarla aydinlatilmis depo ic mekaninda fotogercekci oversized siyah t-shirt mockupi olustur. Model ayakta olsun, tasarimi gogus bolgesine perspektife uygun uygula, kumas golgelerini gercekci tut, okunurlugu koru, ekstra branding ekleme.'
  },
  'auto-tshirt-highkey-ecom': {
    category: 'T-Shirt Model Uzerinde | Ic Mekan',
    title: 'High-Key E-Ticaret',
    prompt:
      'Esit dagilmis isiga sahip ic mekan studyoda one bakan modelle high-key e-ticaret t-shirt mockupi olustur. Oversized siyah t-shirtte tasarimi gogus alanina dogal yerlestir, oranlari ve netligi koru, ekstra yazi veya logo ekleme.'
  },
  'auto-tshirt-cafe-window': {
    category: 'T-Shirt Model Uzerinde | Ic Mekan',
    title: 'Kafe Pencere Isigi',
    prompt:
      'Yumusak pencere isigi alan rahat bir kafe ic mekaninda fotogercekci lifestyle t-shirt mockupi olustur. Model oversized siyah tisortle ayakta olsun; tasarimi gogus bolgesine dogal sekilde yerlestir, kirisim ve golgeleri gercekci tut, ekstra yazi/logo ekleme.'
  },
  'auto-tshirt-record-store': {
    category: 'T-Shirt Model Uzerinde | Ic Mekan',
    title: 'Plakci Koridoru',
    prompt:
      'Moodlu ambiyans isiga sahip bir plakci koridorunda fotogercekci street-culture t-shirt mockupi uret. Model oversized siyah t-shirt giysin; yuklenen tasarimi gogus alanina dogal uygula, baski okunurlugunu koru, kumas dokusunu gercekci tut, ekstra logo/yazi ekleme.'
  },
  'auto-tshirt-apartment-mirror': {
    category: 'T-Shirt Model Uzerinde | Ic Mekan',
    title: 'Daire Ayna Casual',
    prompt:
      'Modern dairede ayna kurulumlu casual bir ic mekan sahnesinde fotogercekci t-shirt mockupi olustur. Model oversized siyah t-shirt giysin; tasarimi gogus bolgesine dogal perspektifle uygula, kumas gerilimlerini gercekci tut, okunurlugu koru, ekstra yazi/logo ekleme.'
  },
  'auto-tshirt-gym-locker': {
    category: 'T-Shirt Model Uzerinde | Ic Mekan',
    title: 'Spor Salonu Koridoru',
    prompt:
      'Spor salonu locker koridorunda fotogercekci athleisure t-shirt mockupi olustur. Ayakta duran model oversized siyah t-shirt giysin; tasarimi gogus seviyesine dogal sekilde yerlestir, kumas detayini temiz ve gercekci tut, okunurlugu yuksek tut, ekstra text/logo ekleme.'
  },
  'auto-tshirt-gallery-minimal': {
    category: 'T-Shirt Model Uzerinde | Ic Mekan',
    title: 'Minimal Galeri Ic Mekan',
    prompt:
      'Cagdas minimal galeri ic mekaninda fotogercekci fashion t-shirt mockupi uret. Model oversized siyah t-shirt ile ayakta dursun; yuklenen tasarimi gogus alanina dogal sekilde uygula, drape ve kirisimlari gercekci tut, okunurlugu koru, ekstra yazi/logo ekleme.'
  },
  'auto-wall-art-interior': {
    category: 'Duvar Sanati',
    title: 'Modern Icer Mekan Cerceve',
    prompt:
      'Notr tonlarda ve yumusak gun isiginda modern bir oturma odasinda premium duvar sanati mockupi uret. Yuklenen tasarimi duvardaki cerceveli poster alanina gercekci golge ile uygula. Temiz ic mekan stili ve pazar yeri kalitesinde fotograf sonucu ver.'
  },
  'auto-flatlay': {
    category: 'Flat Lay',
    title: 'E-Ticaret Flat Lay',
    prompt:
      'Duzenli yerlestirilmis bir urunu sade dokulu zemin uzerinde flat-lay e-ticaret mockup olarak olustur. Yuklenen tasarimi on baski alanina gercekci sekilde uygula, oranlari koru, odagi net tut ve kompozisyonu temiz birak.'
  },
  'auto-detail-preserve': {
    category: 'Detay Koruma',
    title: 'Yuksek Sadakat Tasarim Kilidi',
    prompt:
      'Yuklenen tasarimi birebir koru: kompozisyon, tipografi, semboller ve renkler degismemeli. Tasarimi urun yuzeyine gercekci perspektif ve isik ile dogal bicimde entegre et. Rastgele yazi, logo veya ekstra grafik ekleme.'
  },
  'auto-multi-reference': {
    category: 'Coklu Referans',
    title: 'Tasarim + Sahne Birlestirme',
    prompt:
      '1. gorseli birebir tasarim kaynagi, 2. gorseli hedef ortam referansi olarak kullan. Sahne kimligini korurken tasarimi dogal golge, perspektif ve yuzey etkisiyle entegre ederek tek bir gercekci ticari mockup olustur.'
  },
  'auto-add-element-edit': {
    category: 'Gorsel Duzenleme',
    title: 'Oge Ekle veya Cikar',
    prompt:
      'Verilen kaynak gorselde isik ve perspektifle uyumlu tek bir ticari prop ekle. Orijinal kompozisyonu ve ana urunu degistirme. Ekstra yazi, watermark veya rastgele logo ekleme.'
  },
  'auto-style-transfer': {
    category: 'Stil Transferi',
    title: 'Stil Transferi (Duzeni Koru)',
    prompt:
      'Verilen sahneyi farkli bir sanatsal stile donustururken orijinal kompozisyonu ve ana nesne konumlarini koru. E-ticaret sunumu icin ana urun alanini okunur ve temiz tut.'
  },
  'auto-fashion-composition': {
    category: 'Gelismis Kompozisyon',
    title: 'Iki Gorselle Urun Kompozisyonu',
    prompt:
      'Tek bir profesyonel e-ticaret kompozisyonu olustur: 1. gorseli urun/tasarim kaynagi, 2. gorseli model/ortam kaynagi olarak kullan. Gercekci golge ve renk uyumuyla dogal birlestir ve sonucun gercek urun fotografi gibi gorunmesini sagla.'
  },
  'auto-logo-preservation': {
    category: 'Detay Koruma',
    title: 'Logo Sadakatli Transfer',
    prompt:
      '1. gorseli ana konu, 2. gorseli birebir logo/sanat ogesi olarak kullan. Konunun kimligini ve yuz-vucut ozelliklerini tamamen koru. Logoyu hedef yuzeye perspektif ve malzeme kirisimlarini takip edecek sekilde dogal uygula.'
  },
  'auto-character-consistency': {
    category: 'Tutarlilik',
    title: 'Karakter Aci Varyasyonu',
    prompt:
      'Ayni kisi/karakter kimligini koruyarak yeni bir aci varyasyonu uret (studyoda saga bakan profil). Yuz yapisi, sac stili ve aksesuarlar korunmali; sadece poz/kamera yonu degissin.'
  },
  'auto-step-by-step-scene': {
    category: 'En Iyi Pratik',
    title: 'Adim Adim Kompozisyon Promptu',
    prompt:
      'Adim 1: yumusak dogal isikla temiz ticari arka plan olustur. Adim 2: on planda ana urun yuzeyini gercekci derinlikle yerlestir. Adim 3: yuklenen tasarimi hedef alana dogru perspektif ve golgelerle uygula. Adim 4: dokuyu ve okunurlugu pazar yeri kalitesine getir.'
  },
  'auto-camera-control': {
    category: 'Kamera Yonlendirmesi',
    title: 'Kamera Kontrollu Urun Cekimi',
    prompt:
      '45 derece kamera acisi, orta odak uzakligi gorunumu, alan derinligi ve yumusak uc nokta isikla fotogercekci ticari cekim olustur. Ana urunu merkezde ve net tut, temiz negatif bosluk birak.'
  },
  'scene-living-room-wall': {
    category: 'Sadece Sahne Arka Plani',
    title: 'Oturma Odasi Poster Duvari',
    prompt:
      'Modern bir oturma odasinda goz hizasinda net dikdortgen poster alani olan temiz bej duvarli fotogercekci sahne olustur. Yumusak gun isigı, minimal dekor, dengeli kompozisyon; yazi, logo ve watermark olmasin.'
  },
  'scene-studio-tabletop': {
    category: 'Sadece Sahne Arka Plani',
    title: 'Studyo Masaustu',
    prompt:
      'Profesyonel urun fotografciligi icin arka plan olustur: notr studyo ortamı, hafif beton masaustu, yumusak gecisli fon, difuz isik, belirgin derinlik ayrimi ve temiz merkezi yerlestirme alani. Marka ogesi olmasin.'
  },
  'scene-cafe-shelf': {
    category: 'Sadece Sahne Arka Plani',
    title: 'Kafe Raf Atmosferi',
    prompt:
      'Sicak sabah isigi alan rahat bir kafe ic mekanı olustur. On planda urun yerlestirmesi icin temiz ve bos bir raf alani bulunsun. Ticari yasam tarzi gorunumu, dogal golgeler; yazi, logo ve watermark olmasin.'
  },
  'scene-boutique-hanger': {
    category: 'Sadece Sahne Arka Plani',
    title: 'Butik Askili Sahne',
    prompt:
      'Temiz bir butik giyim ortami olustur; askida onde gorunen duz bir tisort, net bir yerlestirme hedefi olsun. Editoryal e-ticaret isigi, gercekci doku, kalabaliksiz arka plan; logo ve yazi olmasin.'
  },
  'scene-gallery-wall': {
    category: 'Sadece Sahne Arka Plani',
    title: 'Galeri Duvari',
    prompt:
      'Beyaz duvar uzerinde tek bos cerceveli kanvas alani bulunan minimal cagdas galeri ic mekani olustur. Yumusak muze isigi, yuksek gerceklik, merkez kompozisyon; yazi, marka ve ekstra sanat eseri olmasin.'
  },
  'scene-semantic-negative': {
    category: 'En Iyi Pratik',
    title: 'Anlamsal Negatif Ornegi',
    prompt:
      'Kalabalik ve dikkat dagitici ogelerden arinmis, sakin ve bos bir studyo ic mekani olustur. Temiz zemin ve duvar, merkez urun sahneleme alani, dengeli dogal isik ve gorunen marka ogeleri olmasin.'
  },
  'auto-product-packshot': {
    category: 'Ticari Urun Cekimi',
    title: '45 Derece Packshot',
    prompt:
      'E-ticaret icin yuksek cozunurlukte studyo urun fotografi olustur. 45 derece kamera acisi, uc nokta difuz isik, temiz parlak yuzey ve gercekci golge kullan. Yuklenen tasarimi urune dogal sekilde uygula; tasarim detaylari net ve degismeden kalsin.'
  },
  'auto-detail-lock-explicit': {
    category: 'Yuksek Sadakat',
    title: 'Kritik Detay Kilidi',
    prompt:
      'Kritik detaylari kayipsiz koru: logo kenarlari, harf formlari, bosluklar, cizgi kalinligi ve renk degerleri degismemeli. Tasarimi hedef yuzeye fiziksel olarak tutarli kirisim, golge ve perspektifle entegre et. Ekstra yazi, watermark veya rastgele etiket ekleme.'
  },
  'auto-advanced-composition': {
    category: 'Gelismis Kompozisyon',
    title: 'Referans Birlestirme Kompozisyonu',
    prompt:
      'Birden fazla referanstan tek bir ticari mockup olustur: 1. gorseli birebir tasarim kaynagi, 2. gorseli ortam kaynagi olarak kullan. Sahnenin isik ve kamera hissini koru, tasarimi temas golgeleri ve yuzey etkileriyle dogal bicimde birlestir.'
  },
  'auto-iterative-refine': {
    category: 'Iterasyon',
    title: 'Kucuk Degisiklik Iterasyonu',
    prompt:
      'Onceki konsepti aynen koru ve sadece tek bir kontrollu iyilestirme yap: isigi hafif daha sicak yap ve urun etrafindaki negatif boslugu temizle. Tasarim konumu, olcek, tipografi ve logo sadakati degismesin.'
  },
  'scene-gallery-lighting': {
    category: 'Sadece Sahne Arka Plani',
    title: 'Galeri Spot Isik',
    prompt:
      'Merkezde sonraki tasarim yerlestirmesi icin temiz bos bir sunum alani bulunan, yumusak spot isikli fotogercekci galeri duvari olustur. Geometriyi duzgun, dokulari gercekci ve kompozisyonu sade tut. Yazi, logo, watermark olmasin.'
  },
  'scene-commercial-set': {
    category: 'Sadece Sahne Arka Plani',
    title: 'Ticari Set Tasarimi',
    prompt:
      'Kontrollu studyo isigi, hafif derinlik etkileri ve urun kompozitleme icin net on plan yerlestirme bolgesi olan premium ticari set olustur. Gercekci malzeme ve kamera optigi kullan. Gorsel gurultu, marka izi ve rastgele tipografi olmasin.'
  },
  'scene-step-by-step': {
    category: 'En Iyi Pratik',
    title: 'Adim Adim Sahne Promptu',
    prompt:
      'Adim 1: dengeli dogal isikla temiz fotogercekci arka plan kur. Adim 2: on planda inandirici perspektife sahip net bir yerlestirme yuzeyi ekle. Adim 3: derinlik ve malzeme gercekligini iyilestir. Adim 4: sonraki tasarim overlay icin merkezi alanı engelsiz birak.'
  }
};

const SHORT_LEARNING_TIPS = [
  'Be hyper-specific: describe material, lighting, camera angle, and intended commercial use.',
  'For complex scenes, use step-by-step instructions (background -> foreground -> design placement -> refinement).',
  'Use semantic negatives with positive language (for example: "clean empty area") instead of long "do not" lists.',
  'Control camera with photo terms: 45-degree shot, macro, low-angle, shallow depth of field.',
  'Iterate in small changes: keep all same, then only modify one parameter each run.',
  'Preserve critical assets explicitly: call out logo edges, letter spacing, and exact color fidelity.',
  'For composition tasks, define reference roles clearly: image 1 = design, image 2 = scene/model.',
  'Start with 1K for speed, then upscale to 2K/4K only for final deliverables.',
  'Use clean commercial intent language: "marketplace-ready, uncluttered, readable focal area."',
  'When editing, ask for one atomic change per iteration to avoid drift.'
];

const SHORT_LEARNING_TIPS_TR = [
  'Cok spesifik ol: malzeme, isik, kamera acisi ve ticari amaci acikca tarif et.',
  'Karmasik sahnelerde adim adim yaz: arka plan -> on plan -> tasarim yerlestirme -> iyilestirme.',
  'Uzun "yasak" listeleri yerine anlamsal negatif kullan: ornegin "temiz ve bos alan".',
  'Kamerayi fotograf terimleriyle yonet: 45 derece cekim, macro, low-angle, shallow depth of field.',
  'Kucuk iterasyonlarla ilerle: her denemede tek parametreyi degistir.',
  'Kritik varliklari acikca kilitle: logo kenarlari, harf araliklari ve renk sadakati korunmali.',
  'Kompozisyon islerinde referans rollerini net yaz: 1. gorsel = tasarim, 2. gorsel = sahne/model.',
  'Hiz icin 1K ile basla, final teslimde gerekirse 2K/4K kullan.',
  'Ticari niyeti net ifade et: "pazar yeri hazir, sade, okunur odak alani".',
  'Duzenleme adimlarinda kaymayi azaltmak icin her iterasyonda tek bir atomik degisiklik iste.'
];

const SHORT_LEARNING_LIMITS = [
  'Best consistency is usually with English prompts.',
  'Gemini image models may not always follow exact output count requests; keep single-output expectation.',
  'For multiple references, use only high-value inputs to reduce conflicts.',
  'gemini-3.1-flash-image-preview: high-fidelity up to 10 object refs + up to 4 character-consistency refs.',
  'gemini-3-pro-image-preview: high-fidelity up to 6 object refs + up to 5 character-consistency refs.',
  'Image generation currently supports image inputs, not audio/video inputs.',
  'Text-heavy outputs improve when you first generate/refine text, then request the final image render.',
  'Ultra-wide aspect ratios (1:8 or 8:1) are model-dependent and may need fallback to a standard ratio.',
  'Higher resolutions cost more; 4K should be reserved for final export, not every iteration.',
  'All generated images include SynthID watermarking.'
];

const SHORT_LEARNING_LIMITS_TR = [
  'En yuksek tutarlilik genelde Ingilizce promptlarda elde edilir.',
  'Gemini image modelleri her zaman istenen cikti adedini birebir takip etmeyebilir; tek cikti varsayimiyla ilerle.',
  'Coklu referansta cakisma riskini azaltmak icin sadece kritik gorselleri kullan.',
  'gemini-3.1-flash-image-preview: yuksek sadakatte en fazla 10 nesne + 4 karakter tutarliligi referansi.',
  'gemini-3-pro-image-preview: yuksek sadakatte en fazla 6 nesne + 5 karakter tutarliligi referansi.',
  'Image generation su an ses/video girdisini desteklemez; gorsel girdiler desteklenir.',
  'Yazi agirlikli gorsellerde once metni uretip netlestir, sonra nihai gorsel render iste.',
  'Asiri genis oranlar (1:8 veya 8:1) modele baglidir; gerekirse standart orana geri don.',
  'Yuksek cozunurluk daha maliyetlidir; 4K her iterasyonda degil, final exportta kullanilmali.',
  'Uretilen tum gorsellerde SynthID watermark bulunur.'
];

function formatFilterTagLabel(value: string): string {
  return value
    .split('_')
    .map((part) => {
      if (!part) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
}

function uniqueSortedTags(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => !!value))).sort((a, b) => a.localeCompare(b));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isPlacementPresetKey(value: string): value is PlacementPresetKey {
  return value === 'center_chest' || value === 'full_front' || value === 'left_chest' || value === 'upper_center';
}

function isSceneProviderKey(value: string): value is SceneProviderKey {
  return value === 'gemini' || value === 'replicate';
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const data = typeof reader.result === 'string' ? reader.result : '';
      if (!data.startsWith('data:image/')) {
        reject(new Error('File could not be converted to image data URL.'));
        return;
      }
      resolve(data);
    };
    reader.onerror = () => reject(new Error('File read failed.'));
    reader.readAsDataURL(file);
  });
}

async function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image could not be loaded.'));
    image.src = src;
  });
}

async function convertDataUrlToJpeg(dataUrl: string): Promise<string> {
  const image = await loadImageElement(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas is not supported.');
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.92);
}

function triggerDownload(href: string, fileName: string): void {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function nowStamp(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  const hh = `${date.getHours()}`.padStart(2, '0');
  const mm = `${date.getMinutes()}`.padStart(2, '0');
  const ss = `${date.getSeconds()}`.padStart(2, '0');
  return `${y}${m}${d}-${hh}${mm}${ss}`;
}

export default function MockupPage() {
  const [editorMode, setEditorMode] = useState<EditorMode>('auto_mockup');
  const [sidebarPanelTab, setSidebarPanelTab] = useState<SidebarPanelTab>('editor');
  const [helpLanguage, setHelpLanguage] = useState<HelpLanguage>('en');
  const [promptTypeFilter, setPromptTypeFilter] = useState<PromptTypeFilter>('all');
  const [promptSettingFilter, setPromptSettingFilter] = useState<PromptSettingFilter>('all');
  const [promptStyleFilter, setPromptStyleFilter] = useState('all');
  const [promptSceneFilter, setPromptSceneFilter] = useState('all');
  const [promptWeatherFilter, setPromptWeatherFilter] = useState('all');
  const [autoHelpExpanded, setAutoHelpExpanded] = useState(true);
  const [sceneHelpExpanded, setSceneHelpExpanded] = useState(false);

  const [autoProviderOptions, setAutoProviderOptions] = useState<SceneProviderKey[]>([...FALLBACK_AUTO_PROVIDER_OPTIONS]);
  const [autoProvider, setAutoProvider] = useState<SceneProviderKey>('gemini');
  const [autoModelsByProvider, setAutoModelsByProvider] = useState<Record<SceneProviderKey, string[]>>({
    gemini: [...FALLBACK_AUTO_MODELS_BY_PROVIDER.gemini],
    replicate: [...FALLBACK_AUTO_MODELS_BY_PROVIDER.replicate]
  });
  const [autoGeminiAspectRatiosByModel, setAutoGeminiAspectRatiosByModel] = useState<Record<string, string[]>>({
    ...FALLBACK_GEMINI_ASPECT_RATIOS_BY_MODEL
  });
  const [autoGeminiImageSizesByModel, setAutoGeminiImageSizesByModel] = useState<Record<string, string[]>>({
    ...FALLBACK_GEMINI_IMAGE_SIZES_BY_MODEL
  });
  const [selectedModel, setSelectedModel] = useState<string>(FALLBACK_MODELS[1] ?? FALLBACK_MODELS[0] ?? '');
  const [autoAspectRatio, setAutoAspectRatio] = useState('1:1');
  const [autoImageSize, setAutoImageSize] = useState('1K');
  const [placementPresets, setPlacementPresets] = useState<PlacementPreset[]>([...FALLBACK_PRESETS]);
  const [selectedPreset, setSelectedPreset] = useState<PlacementPresetKey>('center_chest');
  const [placementMode, setPlacementMode] = useState<PlacementMode>('preset');
  const [placementRect, setPlacementRect] = useState<PlacementRect>(DEFAULT_RECT);
  const [placementDragState, setPlacementDragState] = useState<PlacementDragState | null>(null);
  const [maxPromptLength, setMaxPromptLength] = useState(DEFAULT_MAX_PROMPT);

  const [designName, setDesignName] = useState('');
  const [designImageDataUrl, setDesignImageDataUrl] = useState('');
  const [sceneName, setSceneName] = useState('');
  const [sceneImageDataUrl, setSceneImageDataUrl] = useState('');

  const [userPrompt, setUserPrompt] = useState('');
  const [cleanDesignBackground, setCleanDesignBackground] = useState(false);

  const [sceneProviderOptions, setSceneProviderOptions] = useState<SceneProviderKey[]>([...FALLBACK_SCENE_PROVIDER_OPTIONS]);
  const [sceneProvider, setSceneProvider] = useState<SceneProviderKey>('gemini');
  const [sceneModelsByProvider, setSceneModelsByProvider] = useState<Record<SceneProviderKey, string[]>>({
    gemini: [...FALLBACK_SCENE_MODELS_BY_PROVIDER.gemini],
    replicate: [...FALLBACK_SCENE_MODELS_BY_PROVIDER.replicate]
  });
  const [sceneGeminiAspectRatiosByModel, setSceneGeminiAspectRatiosByModel] = useState<Record<string, string[]>>({
    ...FALLBACK_GEMINI_ASPECT_RATIOS_BY_MODEL
  });
  const [sceneGeminiImageSizesByModel, setSceneGeminiImageSizesByModel] = useState<Record<string, string[]>>({
    ...FALLBACK_GEMINI_IMAGE_SIZES_BY_MODEL
  });
  const [sceneAspectRatiosByModel, setSceneAspectRatiosByModel] = useState<Record<string, string[]>>({
    ...FALLBACK_REPLICATE_ASPECT_RATIOS_BY_MODEL
  });
  const [sceneSelectedModel, setSceneSelectedModel] = useState<string>(
    FALLBACK_SCENE_MODELS_BY_PROVIDER.gemini[1] ?? FALLBACK_SCENE_MODELS_BY_PROVIDER.gemini[0] ?? ''
  );
  const [sceneAspectRatio, setSceneAspectRatio] = useState('4:3');
  const [sceneImageSize, setSceneImageSize] = useState('1K');

  const [scenePrompt, setScenePrompt] = useState('');
  const [sceneGenerating, setSceneGenerating] = useState(false);
  const [sceneProviderUsed, setSceneProviderUsed] = useState<SceneProviderKey | ''>('');
  const [sceneModelUsed, setSceneModelUsed] = useState('');
  const [sceneAspectRatioUsed, setSceneAspectRatioUsed] = useState('');
  const [sceneImageSizeUsed, setSceneImageSizeUsed] = useState('');
  const [sceneUseFrame, setSceneUseFrame] = useState(false);
  const [sceneFrameRect, setSceneFrameRect] = useState<PlacementRect>(DEFAULT_SCENE_FRAME);
  const [sceneDesignXPct, setSceneDesignXPct] = useState(50);
  const [sceneDesignYPct, setSceneDesignYPct] = useState(50);
  const [sceneDesignScalePct, setSceneDesignScalePct] = useState(80);
  const [sceneDesignRotationDeg, setSceneDesignRotationDeg] = useState(0);
  const [sceneDesignDragState, setSceneDesignDragState] = useState<SceneDesignDragState | null>(null);

  const [configLoading, setConfigLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copiedPromptId, setCopiedPromptId] = useState('');
  const [resultImageDataUrl, setResultImageDataUrl] = useState('');
  const [resultModelUsed, setResultModelUsed] = useState('');
  const [resultAspectRatioUsed, setResultAspectRatioUsed] = useState('');
  const [resultImageSizeUsed, setResultImageSizeUsed] = useState('');
  const [downloadingJpg, setDownloadingJpg] = useState(false);
  const [downloadingSceneJpg, setDownloadingSceneJpg] = useState(false);

  const designInputRef = useRef<HTMLInputElement>(null);
  const sceneInputRef = useRef<HTMLInputElement>(null);
  const customRectBoardRef = useRef<HTMLDivElement>(null);
  const placementDragRef = useRef<PlacementDragState | null>(null);
  const sceneStageRef = useRef<HTMLDivElement>(null);
  const sceneFrameRef = useRef<HTMLDivElement>(null);
  const sceneDesignDragRef = useRef<SceneDesignDragState | null>(null);

  const promptRemaining = maxPromptLength - userPrompt.length;
  const scenePromptRemaining = maxPromptLength - scenePrompt.length;
  const autoModelOptions = autoModelsByProvider[autoProvider] ?? [];
  const autoGeminiAspectRatioOptions = autoProvider === 'gemini' ? (autoGeminiAspectRatiosByModel[selectedModel] ?? []) : [];
  const autoGeminiImageSizeOptions = autoProvider === 'gemini' ? (autoGeminiImageSizesByModel[selectedModel] ?? []) : [];
  const sceneModelOptions = sceneModelsByProvider[sceneProvider] ?? [];
  const sceneReplicateAspectRatioOptions =
    sceneProvider === 'replicate' ? (sceneAspectRatiosByModel[sceneSelectedModel] ?? []) : [];
  const sceneGeminiAspectRatioOptions =
    sceneProvider === 'gemini' ? (sceneGeminiAspectRatiosByModel[sceneSelectedModel] ?? []) : [];
  const sceneGeminiImageSizeOptions =
    sceneProvider === 'gemini' ? (sceneGeminiImageSizesByModel[sceneSelectedModel] ?? []) : [];
  const canGenerate = !!designImageDataUrl && !!userPrompt.trim() && !generating;
  const canGenerateScene = !!scenePrompt.trim() && !!sceneSelectedModel && !sceneGenerating;
  const canDownloadSceneComposite = !!sceneImageDataUrl && !!designImageDataUrl && !sceneGenerating;

  const selectedPresetHint = useMemo(
    () => placementPresets.find((item) => item.key === selectedPreset)?.hint ?? '',
    [placementPresets, selectedPreset]
  );
  const activePromptTemplates = useMemo(
    () => PROMPT_LIBRARY.filter((item) => item.mode === editorMode || item.mode === 'both'),
    [editorMode]
  );
  const localizedPromptTemplates = useMemo<LocalizedPromptTemplate[]>(
    () =>
      activePromptTemplates.map((item) => {
        if (helpLanguage === 'tr') {
          const tr = PROMPT_LIBRARY_TR[item.id];
          if (tr) return { item, category: tr.category, title: tr.title, prompt: tr.prompt };
        }
        return { item, category: item.category, title: item.title, prompt: item.prompt };
      }),
    [activePromptTemplates, helpLanguage]
  );
  const promptStyleOptions = useMemo(
    () => uniqueSortedTags(activePromptTemplates.map((item) => item.styleTag)),
    [activePromptTemplates]
  );
  const promptSceneOptions = useMemo(
    () => uniqueSortedTags(activePromptTemplates.map((item) => item.sceneTag)),
    [activePromptTemplates]
  );
  const promptWeatherOptions = useMemo(
    () => uniqueSortedTags(activePromptTemplates.map((item) => item.weatherTag)),
    [activePromptTemplates]
  );
  const filteredPromptTemplates = useMemo(() => {
    return localizedPromptTemplates.filter(({ item }) => {
      if (promptTypeFilter === 'tshirt' && item.productType !== 'tshirt') return false;
      if (promptSettingFilter !== 'all' && item.settingTag !== promptSettingFilter) return false;
      if (promptStyleFilter !== 'all' && item.styleTag !== promptStyleFilter) return false;
      if (promptSceneFilter !== 'all' && item.sceneTag !== promptSceneFilter) return false;
      if (promptWeatherFilter !== 'all' && item.weatherTag !== promptWeatherFilter) return false;
      return true;
    });
  }, [
    localizedPromptTemplates,
    promptSceneFilter,
    promptSettingFilter,
    promptStyleFilter,
    promptTypeFilter,
    promptWeatherFilter
  ]);
  const groupedPromptTemplates = useMemo(() => {
    const groups = new Map<string, LocalizedPromptTemplate[]>();
    for (const template of filteredPromptTemplates) {
      const current = groups.get(template.category) ?? [];
      current.push(template);
      groups.set(template.category, current);
    }
    return Array.from(groups.entries()).map(([category, items]) => ({ category, items }));
  }, [filteredPromptTemplates]);
  const localizedLearningTips = useMemo(
    () => (helpLanguage === 'tr' ? SHORT_LEARNING_TIPS_TR : SHORT_LEARNING_TIPS),
    [helpLanguage]
  );
  const localizedLearningLimits = useMemo(
    () => (helpLanguage === 'tr' ? SHORT_LEARNING_LIMITS_TR : SHORT_LEARNING_LIMITS),
    [helpLanguage]
  );

  useEffect(() => {
    setSidebarPanelTab('editor');
  }, [editorMode]);

  const handleUsePromptTemplate = useCallback(
    (prompt: string) => {
      setError('');
      if (editorMode === 'auto_mockup') {
        setUserPrompt(prompt);
      } else {
        setScenePrompt(prompt);
      }
      setSidebarPanelTab('editor');
    },
    [editorMode]
  );

  const handleCopyPromptTemplate = useCallback(async (id: string, prompt: string) => {
    setError('');
    try {
      if (!navigator.clipboard?.writeText) {
        setError('Clipboard is not available in this browser.');
        return;
      }
      await navigator.clipboard.writeText(prompt);
      setCopiedPromptId(id);
      window.setTimeout(() => {
        setCopiedPromptId((current) => (current === id ? '' : current));
      }, 1200);
    } catch {
      setError('Prompt could not be copied.');
    }
  }, []);

  useEffect(() => {
    placementDragRef.current = placementDragState;
  }, [placementDragState]);

  useEffect(() => {
    sceneDesignDragRef.current = sceneDesignDragState;
  }, [sceneDesignDragState]);

  useEffect(() => {
    let cancelled = false;
    const loadConfig = async () => {
      setConfigLoading(true);
      try {
        const res = await fetch('/api/mockup/generate', { cache: 'no-store' });
        if (res.ok) {
          const payload = (await res.json()) as MockupConfigResponse;
          if (cancelled) return;

          const providers = Array.isArray(payload.providers)
            ? payload.providers
                .filter((item): item is string => typeof item === 'string')
                .map((item) => item.trim())
                .filter((item): item is SceneProviderKey => isSceneProviderKey(item))
            : [];
          if (providers.length > 0) {
            setAutoProviderOptions(providers);
          }

          const parsedModelsByProvider: Record<SceneProviderKey, string[]> = {
            gemini: [...FALLBACK_AUTO_MODELS_BY_PROVIDER.gemini],
            replicate: [...FALLBACK_AUTO_MODELS_BY_PROVIDER.replicate]
          };
          const rawModelsByProvider = payload.modelsByProvider;
          if (rawModelsByProvider && typeof rawModelsByProvider === 'object') {
            for (const provider of FALLBACK_AUTO_PROVIDER_OPTIONS) {
              const raw = (rawModelsByProvider as Record<string, unknown>)[provider];
              const parsed =
                Array.isArray(raw)
                  ? raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
                  : [];
              if (parsed.length > 0) {
                parsedModelsByProvider[provider] = parsed;
              }
            }
          }
          const legacyProvider = typeof payload.provider === 'string' ? payload.provider.trim() : '';
          if (isSceneProviderKey(legacyProvider)) {
            const legacyModels = Array.isArray(payload.models)
              ? payload.models
                  .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
                  .map((item) => item.trim())
              : [];
            if (legacyModels.length > 0) {
              parsedModelsByProvider[legacyProvider] = legacyModels;
            }
          }
          setAutoModelsByProvider(parsedModelsByProvider);

          const parsedGeminiAspectRatiosByModel: Record<string, string[]> = {
            ...FALLBACK_GEMINI_ASPECT_RATIOS_BY_MODEL
          };
          const rawGeminiAspectRatiosByModel = payload.geminiAspectRatiosByModel;
          if (rawGeminiAspectRatiosByModel && typeof rawGeminiAspectRatiosByModel === 'object') {
            for (const [modelKey, rawRatios] of Object.entries(rawGeminiAspectRatiosByModel)) {
              const parsed =
                Array.isArray(rawRatios)
                  ? rawRatios
                      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
                      .map((item) => item.trim())
                  : [];
              if (parsed.length > 0) {
                parsedGeminiAspectRatiosByModel[modelKey] = parsed;
              }
            }
          }
          setAutoGeminiAspectRatiosByModel(parsedGeminiAspectRatiosByModel);

          const parsedGeminiImageSizesByModel: Record<string, string[]> = {
            ...FALLBACK_GEMINI_IMAGE_SIZES_BY_MODEL
          };
          const rawGeminiImageSizesByModel = payload.geminiImageSizesByModel;
          if (rawGeminiImageSizesByModel && typeof rawGeminiImageSizesByModel === 'object') {
            for (const [modelKey, rawSizes] of Object.entries(rawGeminiImageSizesByModel)) {
              const parsed =
                Array.isArray(rawSizes)
                  ? rawSizes
                      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
                      .map((item) => item.trim())
                  : [];
              if (parsed.length > 0) {
                parsedGeminiImageSizesByModel[modelKey] = parsed;
              }
            }
          }
          setAutoGeminiImageSizesByModel(parsedGeminiImageSizesByModel);

          const parsedGeminiDefaultAspectRatioByModel: Record<string, string> = {
            ...FALLBACK_GEMINI_DEFAULT_ASPECT_RATIO_BY_MODEL
          };
          const rawGeminiDefaultAspectRatioByModel = payload.geminiDefaultAspectRatioByModel;
          if (rawGeminiDefaultAspectRatioByModel && typeof rawGeminiDefaultAspectRatioByModel === 'object') {
            for (const [modelKey, rawValue] of Object.entries(rawGeminiDefaultAspectRatioByModel)) {
              const value = typeof rawValue === 'string' ? rawValue.trim() : '';
              const allowed = parsedGeminiAspectRatiosByModel[modelKey] ?? [];
              if (value && allowed.includes(value)) {
                parsedGeminiDefaultAspectRatioByModel[modelKey] = value;
              }
            }
          }

          const parsedGeminiDefaultImageSizeByModel: Record<string, string> = {
            ...FALLBACK_GEMINI_DEFAULT_IMAGE_SIZE_BY_MODEL
          };
          const rawGeminiDefaultImageSizeByModel = payload.geminiDefaultImageSizeByModel;
          if (rawGeminiDefaultImageSizeByModel && typeof rawGeminiDefaultImageSizeByModel === 'object') {
            for (const [modelKey, rawValue] of Object.entries(rawGeminiDefaultImageSizeByModel)) {
              const value = typeof rawValue === 'string' ? rawValue.trim() : '';
              const allowed = parsedGeminiImageSizesByModel[modelKey] ?? [];
              if (value && allowed.includes(value)) {
                parsedGeminiDefaultImageSizeByModel[modelKey] = value;
              }
            }
          }

          let nextProvider: SceneProviderKey = 'gemini';
          const preferredProvider = typeof payload.defaultProvider === 'string' ? payload.defaultProvider.trim() : '';
          if (isSceneProviderKey(preferredProvider)) {
            nextProvider = preferredProvider;
          } else if (providers.length > 0) {
            nextProvider = providers[0];
          }
          if (!(parsedModelsByProvider[nextProvider]?.length > 0)) {
            nextProvider = parsedModelsByProvider.gemini.length > 0 ? 'gemini' : 'replicate';
          }
          setAutoProvider(nextProvider);

          const providerModels = parsedModelsByProvider[nextProvider] ?? [];
          const rawDefaultModelsByProvider = payload.defaultModelsByProvider;
          const preferredModelRaw =
            rawDefaultModelsByProvider && typeof rawDefaultModelsByProvider === 'object'
              ? (rawDefaultModelsByProvider as Record<string, unknown>)[nextProvider]
              : undefined;
          const preferredModel =
            typeof preferredModelRaw === 'string'
              ? preferredModelRaw.trim()
              : nextProvider === 'gemini' && typeof payload.defaultModel === 'string'
                ? payload.defaultModel.trim()
                : '';
          const nextModel = preferredModel && providerModels.includes(preferredModel) ? preferredModel : (providerModels[0] ?? '');
          setSelectedModel(nextModel);
          const nextGeminiAspectOptions = parsedGeminiAspectRatiosByModel[nextModel] ?? [];
          const nextGeminiImageSizeOptions = parsedGeminiImageSizesByModel[nextModel] ?? [];
          const nextAutoAspect =
            parsedGeminiDefaultAspectRatioByModel[nextModel] && nextGeminiAspectOptions.includes(parsedGeminiDefaultAspectRatioByModel[nextModel])
              ? parsedGeminiDefaultAspectRatioByModel[nextModel]
              : (nextGeminiAspectOptions[0] ?? '1:1');
          const nextAutoImageSize =
            parsedGeminiDefaultImageSizeByModel[nextModel] && nextGeminiImageSizeOptions.includes(parsedGeminiDefaultImageSizeByModel[nextModel])
              ? parsedGeminiDefaultImageSizeByModel[nextModel]
              : (nextGeminiImageSizeOptions[0] ?? '1K');
          setAutoAspectRatio(nextAutoAspect);
          setAutoImageSize(nextAutoImageSize);

          const presets = Array.isArray(payload.placementPresets)
            ? payload.placementPresets
                .map((item) => {
                  const key = typeof item?.key === 'string' ? item.key.trim() : '';
                  const label = typeof item?.label === 'string' ? item.label.trim() : '';
                  const hint = typeof item?.hint === 'string' ? item.hint.trim() : '';
                  if (!isPlacementPresetKey(key) || !label || !hint) return null;
                  return { key, label, hint } as PlacementPreset;
                })
                .filter((item): item is PlacementPreset => !!item)
            : [];
          if (presets.length > 0) {
            setPlacementPresets(presets);
            const preferred = typeof payload.defaultPlacementPreset === 'string' ? payload.defaultPlacementPreset.trim() : '';
            if (isPlacementPresetKey(preferred) && presets.some((item) => item.key === preferred)) {
              setSelectedPreset(preferred);
            } else {
              setSelectedPreset(presets[0].key);
            }
          }

          if (typeof payload.maxPromptLength === 'number' && Number.isFinite(payload.maxPromptLength)) {
            setMaxPromptLength(Math.max(80, Math.round(payload.maxPromptLength)));
          }
        }

        const sceneRes = await fetch('/api/mockup/generate-scene', { cache: 'no-store' });
        if (sceneRes.ok) {
          const scenePayload = (await sceneRes.json()) as SceneConfigResponse;
          if (cancelled) return;

          if (typeof scenePayload.maxPromptLength === 'number' && Number.isFinite(scenePayload.maxPromptLength)) {
            setMaxPromptLength((prev) => Math.max(prev, Math.max(80, Math.round(scenePayload.maxPromptLength as number))));
          }

          const providers = Array.isArray(scenePayload.providers)
            ? scenePayload.providers
                .filter((item): item is string => typeof item === 'string')
                .map((item) => item.trim())
                .filter((item): item is SceneProviderKey => isSceneProviderKey(item))
            : [];
          if (providers.length > 0) {
            setSceneProviderOptions(providers);
          }

          const parsedModelsByProvider: Record<SceneProviderKey, string[]> = {
            gemini: [...FALLBACK_SCENE_MODELS_BY_PROVIDER.gemini],
            replicate: [...FALLBACK_SCENE_MODELS_BY_PROVIDER.replicate]
          };
          const parsedReplicateAspectRatiosByModel: Record<string, string[]> = {
            ...FALLBACK_REPLICATE_ASPECT_RATIOS_BY_MODEL
          };
          const parsedGeminiAspectRatiosByModel: Record<string, string[]> = {
            ...FALLBACK_GEMINI_ASPECT_RATIOS_BY_MODEL
          };
          const parsedGeminiImageSizesByModel: Record<string, string[]> = {
            ...FALLBACK_GEMINI_IMAGE_SIZES_BY_MODEL
          };

          const rawModelsByProvider = scenePayload.modelsByProvider;
          if (rawModelsByProvider && typeof rawModelsByProvider === 'object') {
            for (const provider of FALLBACK_SCENE_PROVIDER_OPTIONS) {
              const raw = (rawModelsByProvider as Record<string, unknown>)[provider];
              const parsed =
                Array.isArray(raw)
                  ? raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
                  : [];
              if (parsed.length > 0) {
                parsedModelsByProvider[provider] = parsed;
              }
            }
          }

          const rawAspectRatiosByModel = scenePayload.aspectRatiosByModel;
          if (rawAspectRatiosByModel && typeof rawAspectRatiosByModel === 'object') {
            for (const [modelKey, rawRatios] of Object.entries(rawAspectRatiosByModel as Record<string, unknown>)) {
              const parsed =
                Array.isArray(rawRatios)
                  ? rawRatios
                      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
                      .map((item) => item.trim())
                  : [];
              if (parsed.length > 0) {
                parsedReplicateAspectRatiosByModel[modelKey] = parsed;
              }
            }
          }

          const rawGeminiAspectRatiosByModel = scenePayload.geminiAspectRatiosByModel;
          if (rawGeminiAspectRatiosByModel && typeof rawGeminiAspectRatiosByModel === 'object') {
            for (const [modelKey, rawRatios] of Object.entries(rawGeminiAspectRatiosByModel as Record<string, unknown>)) {
              const parsed =
                Array.isArray(rawRatios)
                  ? rawRatios
                      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
                      .map((item) => item.trim())
                  : [];
              if (parsed.length > 0) {
                parsedGeminiAspectRatiosByModel[modelKey] = parsed;
              }
            }
          }

          const rawGeminiImageSizesByModel = scenePayload.geminiImageSizesByModel;
          if (rawGeminiImageSizesByModel && typeof rawGeminiImageSizesByModel === 'object') {
            for (const [modelKey, rawSizes] of Object.entries(rawGeminiImageSizesByModel as Record<string, unknown>)) {
              const parsed =
                Array.isArray(rawSizes)
                  ? rawSizes
                      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
                      .map((item) => item.trim())
                  : [];
              if (parsed.length > 0) {
                parsedGeminiImageSizesByModel[modelKey] = parsed;
              }
            }
          }

          const legacyProvider = typeof scenePayload.provider === 'string' ? scenePayload.provider.trim() : '';
          if (isSceneProviderKey(legacyProvider)) {
            const legacyModels = Array.isArray(scenePayload.models)
              ? scenePayload.models
                  .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
                  .map((item) => item.trim())
              : [];
            if (legacyModels.length > 0) {
              parsedModelsByProvider[legacyProvider] = legacyModels;
            }
          }
          setSceneModelsByProvider(parsedModelsByProvider);
          setSceneAspectRatiosByModel(parsedReplicateAspectRatiosByModel);
          setSceneGeminiAspectRatiosByModel(parsedGeminiAspectRatiosByModel);
          setSceneGeminiImageSizesByModel(parsedGeminiImageSizesByModel);

          const parsedGeminiDefaultAspectRatioByModel: Record<string, string> = {
            ...FALLBACK_GEMINI_DEFAULT_ASPECT_RATIO_BY_MODEL
          };
          const rawGeminiDefaultAspectRatioByModel = scenePayload.geminiDefaultAspectRatioByModel;
          if (rawGeminiDefaultAspectRatioByModel && typeof rawGeminiDefaultAspectRatioByModel === 'object') {
            for (const [modelKey, rawValue] of Object.entries(rawGeminiDefaultAspectRatioByModel)) {
              const value = typeof rawValue === 'string' ? rawValue.trim() : '';
              const allowed = parsedGeminiAspectRatiosByModel[modelKey] ?? [];
              if (value && allowed.includes(value)) {
                parsedGeminiDefaultAspectRatioByModel[modelKey] = value;
              }
            }
          }

          const parsedGeminiDefaultImageSizeByModel: Record<string, string> = {
            ...FALLBACK_GEMINI_DEFAULT_IMAGE_SIZE_BY_MODEL
          };
          const rawGeminiDefaultImageSizeByModel = scenePayload.geminiDefaultImageSizeByModel;
          if (rawGeminiDefaultImageSizeByModel && typeof rawGeminiDefaultImageSizeByModel === 'object') {
            for (const [modelKey, rawValue] of Object.entries(rawGeminiDefaultImageSizeByModel)) {
              const value = typeof rawValue === 'string' ? rawValue.trim() : '';
              const allowed = parsedGeminiImageSizesByModel[modelKey] ?? [];
              if (value && allowed.includes(value)) {
                parsedGeminiDefaultImageSizeByModel[modelKey] = value;
              }
            }
          }

          let nextProvider: SceneProviderKey = 'gemini';
          const preferredProvider = typeof scenePayload.defaultProvider === 'string' ? scenePayload.defaultProvider.trim() : '';
          if (isSceneProviderKey(preferredProvider)) {
            nextProvider = preferredProvider;
          } else if (providers.length > 0) {
            nextProvider = providers[0];
          }
          if (!(parsedModelsByProvider[nextProvider]?.length > 0)) {
            nextProvider = parsedModelsByProvider.gemini.length > 0 ? 'gemini' : 'replicate';
          }
          setSceneProvider(nextProvider);

          const providerModels = parsedModelsByProvider[nextProvider] ?? [];
          const rawDefaultModelsByProvider = scenePayload.defaultModelsByProvider;
          const rawDefaultReplicateAspectRatioByModel = scenePayload.defaultAspectRatioByModel;
          const preferredModelRaw =
            rawDefaultModelsByProvider && typeof rawDefaultModelsByProvider === 'object'
              ? (rawDefaultModelsByProvider as Record<string, unknown>)[nextProvider]
              : undefined;
          const preferredModel =
            typeof preferredModelRaw === 'string'
              ? preferredModelRaw.trim()
              : nextProvider === 'gemini' && typeof scenePayload.defaultModel === 'string'
                ? scenePayload.defaultModel.trim()
                : '';
          const nextModel = preferredModel && providerModels.includes(preferredModel) ? preferredModel : (providerModels[0] ?? '');
          setSceneSelectedModel(nextModel);
          if (nextProvider === 'replicate') {
            const nextReplicateRatios = parsedReplicateAspectRatiosByModel[nextModel] ?? [];
            const preferredAspectRaw =
              rawDefaultReplicateAspectRatioByModel && typeof rawDefaultReplicateAspectRatioByModel === 'object'
                ? (rawDefaultReplicateAspectRatioByModel as Record<string, unknown>)[nextModel]
                : undefined;
            const preferredAspect = typeof preferredAspectRaw === 'string' ? preferredAspectRaw.trim() : '';
            setSceneAspectRatio(
              preferredAspect && nextReplicateRatios.includes(preferredAspect) ? preferredAspect : (nextReplicateRatios[0] ?? '4:3')
            );
            setSceneImageSize('1K');
          } else {
            const nextGeminiRatios = parsedGeminiAspectRatiosByModel[nextModel] ?? [];
            const nextGeminiSizes = parsedGeminiImageSizesByModel[nextModel] ?? [];
            const nextGeminiAspect =
              parsedGeminiDefaultAspectRatioByModel[nextModel] &&
              nextGeminiRatios.includes(parsedGeminiDefaultAspectRatioByModel[nextModel])
                ? parsedGeminiDefaultAspectRatioByModel[nextModel]
                : (nextGeminiRatios[0] ?? '4:3');
            const nextGeminiSize =
              parsedGeminiDefaultImageSizeByModel[nextModel] &&
              nextGeminiSizes.includes(parsedGeminiDefaultImageSizeByModel[nextModel])
                ? parsedGeminiDefaultImageSizeByModel[nextModel]
                : (nextGeminiSizes[0] ?? '1K');
            setSceneAspectRatio(nextGeminiAspect);
            setSceneImageSize(nextGeminiSize);
          }
        }
      } catch {
        // Keep static fallback values.
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    };

    void loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!autoModelOptions.includes(selectedModel)) {
      setSelectedModel(autoModelOptions[0] ?? '');
    }
  }, [autoModelOptions, selectedModel]);

  useEffect(() => {
    if (!autoProviderOptions.includes(autoProvider)) {
      setAutoProvider(autoProviderOptions[0] ?? 'gemini');
    }
  }, [autoProvider, autoProviderOptions]);

  useEffect(() => {
    if (!sceneModelOptions.includes(sceneSelectedModel)) {
      setSceneSelectedModel(sceneModelOptions[0] ?? '');
    }
  }, [sceneModelOptions, sceneSelectedModel]);

  useEffect(() => {
    if (autoProvider !== 'gemini') return;
    if (!autoGeminiAspectRatioOptions.includes(autoAspectRatio)) {
      setAutoAspectRatio(autoGeminiAspectRatioOptions[0] ?? '1:1');
    }
  }, [autoAspectRatio, autoGeminiAspectRatioOptions, autoProvider]);

  useEffect(() => {
    if (autoProvider !== 'gemini') return;
    if (!autoGeminiImageSizeOptions.includes(autoImageSize)) {
      setAutoImageSize(autoGeminiImageSizeOptions[0] ?? '1K');
    }
  }, [autoGeminiImageSizeOptions, autoImageSize, autoProvider]);

  useEffect(() => {
    if (sceneProvider === 'replicate') {
      if (!sceneReplicateAspectRatioOptions.includes(sceneAspectRatio)) {
        setSceneAspectRatio(sceneReplicateAspectRatioOptions[0] ?? '4:3');
      }
      return;
    }
    if (!sceneGeminiAspectRatioOptions.includes(sceneAspectRatio)) {
      setSceneAspectRatio(sceneGeminiAspectRatioOptions[0] ?? '4:3');
    }
  }, [sceneAspectRatio, sceneGeminiAspectRatioOptions, sceneProvider, sceneReplicateAspectRatioOptions]);

  useEffect(() => {
    if (sceneProvider !== 'gemini') return;
    if (!sceneGeminiImageSizeOptions.includes(sceneImageSize)) {
      setSceneImageSize(sceneGeminiImageSizeOptions[0] ?? '1K');
    }
  }, [sceneGeminiImageSizeOptions, sceneImageSize, sceneProvider]);

  useEffect(() => {
    if (!sceneProviderOptions.includes(sceneProvider)) {
      setSceneProvider(sceneProviderOptions[0] ?? 'gemini');
    }
  }, [sceneProvider, sceneProviderOptions]);

  useEffect(() => {
    if (!sceneImageDataUrl && placementMode === 'custom_rect') {
      setPlacementMode('preset');
    }
  }, [placementMode, sceneImageDataUrl]);

  const handleDesignFile = useCallback(async (file: File | null | undefined) => {
    setError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Design file must be an image.');
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setDesignName(file.name);
      setDesignImageDataUrl(dataUrl);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not read design file.');
    }
  }, []);

  const handleSceneFile = useCallback(async (file: File | null | undefined) => {
    setError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Scene file must be an image.');
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setSceneName(file.name);
      setSceneImageDataUrl(dataUrl);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not read scene file.');
    }
  }, []);

  const clearScene = useCallback(() => {
    setSceneName('');
    setSceneImageDataUrl('');
    setPlacementMode('preset');
    setSceneProviderUsed('');
    setSceneModelUsed('');
    setSceneAspectRatioUsed('');
    setSceneImageSizeUsed('');
    setSceneUseFrame(false);
  }, []);

  const getPointPct = useCallback((clientX: number, clientY: number): { xPct: number; yPct: number } | null => {
    const board = customRectBoardRef.current;
    if (!board) return null;
    const bounds = board.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return null;
    return {
      xPct: clamp(((clientX - bounds.left) / bounds.width) * 100, 0, 100),
      yPct: clamp(((clientY - bounds.top) / bounds.height) * 100, 0, 100)
    };
  }, []);

  const handleCustomRectPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      if (!sceneImageDataUrl) return;
      const point = getPointPct(e.clientX, e.clientY);
      if (!point) return;
      setError('');
      const start: PlacementDragState = {
        pointerId: e.pointerId,
        startXPct: point.xPct,
        startYPct: point.yPct
      };
      setPlacementDragState(start);
      placementDragRef.current = start;
      setPlacementRect({
        xPct: point.xPct,
        yPct: point.yPct,
        wPct: 0.1,
        hPct: 0.1
      });
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [getPointPct, sceneImageDataUrl]
  );

  const handleCustomRectPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = placementDragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      const point = getPointPct(e.clientX, e.clientY);
      if (!point) return;
      const xPct = Math.min(drag.startXPct, point.xPct);
      const yPct = Math.min(drag.startYPct, point.yPct);
      const wPct = Math.abs(point.xPct - drag.startXPct);
      const hPct = Math.abs(point.yPct - drag.startYPct);
      setPlacementRect({
        xPct,
        yPct,
        wPct: clamp(wPct, 0.1, 100 - xPct),
        hPct: clamp(hPct, 0.1, 100 - yPct)
      });
    },
    [getPointPct]
  );

  const handleCustomRectPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = placementDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    placementDragRef.current = null;
    setPlacementDragState(null);
    setPlacementRect((prev) => {
      const minPct = 2;
      if (prev.wPct < minPct || prev.hPct < minPct) {
        return DEFAULT_RECT;
      }
      return prev;
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!designImageDataUrl) {
      setError('Please upload a design image first.');
      return;
    }
    if (!userPrompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }
    if (placementMode === 'custom_rect' && !sceneImageDataUrl) {
      setError('Custom rectangle mode requires a scene image.');
      return;
    }

    setGenerating(true);
    setError('');
    setResultImageDataUrl('');
    setResultModelUsed('');
    setResultAspectRatioUsed('');
    setResultImageSizeUsed('');

    try {
      const body: Record<string, unknown> = {
        provider: autoProvider,
        model: selectedModel,
        prompt: userPrompt.trim(),
        designImageDataUrl,
        sceneImageDataUrl: sceneImageDataUrl || undefined,
        placementMode,
        placementPreset: placementMode === 'preset' ? selectedPreset : undefined,
        placementRect: placementMode === 'custom_rect' ? placementRect : undefined,
        aspectRatio: autoProvider === 'gemini' ? autoAspectRatio : undefined,
        imageSize: autoProvider === 'gemini' ? autoImageSize : undefined,
        cleanDesignBackground
      };

      const res = await fetch('/api/mockup/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        throw new Error((await res.text()) || 'Mockup generation failed.');
      }

      const payload = (await res.json()) as {
        imageDataUrl?: string;
        modelUsed?: string;
        aspectRatioUsed?: string | null;
        imageSizeUsed?: string | null;
      };

      if (!payload?.imageDataUrl) {
        throw new Error('No image output returned from mockup API.');
      }

      setResultImageDataUrl(payload.imageDataUrl);
      setResultModelUsed(payload.modelUsed ?? selectedModel);
      setResultAspectRatioUsed(typeof payload.aspectRatioUsed === 'string' ? payload.aspectRatioUsed : '');
      setResultImageSizeUsed(typeof payload.imageSizeUsed === 'string' ? payload.imageSizeUsed : '');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Mockup generation failed.';
      setError(message);
    } finally {
      setGenerating(false);
    }
  }, [
    cleanDesignBackground,
    autoAspectRatio,
    autoImageSize,
    autoProvider,
    designImageDataUrl,
    placementMode,
    placementRect,
    sceneImageDataUrl,
    selectedModel,
    selectedPreset,
    userPrompt
  ]);

  const handleGenerateScene = useCallback(async () => {
    if (!scenePrompt.trim()) {
      setError('Please enter a scene prompt.');
      return;
    }
    if (!sceneSelectedModel) {
      setError('Please select a valid scene model.');
      return;
    }

    setSceneGenerating(true);
    setError('');
    setSceneAspectRatioUsed('');
    setSceneImageSizeUsed('');

    try {
      const res = await fetch('/api/mockup/generate-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: sceneProvider,
          model: sceneSelectedModel,
          prompt: scenePrompt.trim(),
          aspectRatio: sceneAspectRatio,
          imageSize: sceneProvider === 'gemini' ? sceneImageSize : undefined
        })
      });

      if (!res.ok) {
        throw new Error((await res.text()) || 'Scene generation failed.');
      }

      const payload = (await res.json()) as {
        imageDataUrl?: string;
        providerUsed?: string;
        modelUsed?: string;
        aspectRatioUsed?: string;
        imageSizeUsed?: string | null;
      };

      if (!payload?.imageDataUrl) {
        throw new Error('No scene image returned by API.');
      }

      setSceneImageDataUrl(payload.imageDataUrl);
      setSceneName(`AI Scene ${nowStamp()}`);
      const providerUsedRaw = typeof payload.providerUsed === 'string' ? payload.providerUsed.trim().toLowerCase() : '';
      setSceneProviderUsed(isSceneProviderKey(providerUsedRaw) ? providerUsedRaw : sceneProvider);
      setSceneModelUsed(payload.modelUsed ?? sceneSelectedModel);
      setSceneAspectRatioUsed(typeof payload.aspectRatioUsed === 'string' ? payload.aspectRatioUsed : '');
      setSceneImageSizeUsed(typeof payload.imageSizeUsed === 'string' ? payload.imageSizeUsed : '');
      if (placementMode === 'custom_rect' && !placementDragState) {
        setPlacementMode('preset');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Scene generation failed.';
      setError(message);
    } finally {
      setSceneGenerating(false);
    }
  }, [placementDragState, placementMode, sceneAspectRatio, sceneImageSize, scenePrompt, sceneProvider, sceneSelectedModel]);

  const handleDownloadPng = useCallback(() => {
    if (!resultImageDataUrl) return;
    triggerDownload(resultImageDataUrl, `mockup-${nowStamp()}.png`);
  }, [resultImageDataUrl]);

  const handleDownloadJpg = useCallback(async () => {
    if (!resultImageDataUrl) return;
    setDownloadingJpg(true);
    try {
      const jpgDataUrl = await convertDataUrlToJpeg(resultImageDataUrl);
      triggerDownload(jpgDataUrl, `mockup-${nowStamp()}.jpg`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'JPG conversion failed.';
      setError(message);
    } finally {
      setDownloadingJpg(false);
    }
  }, [resultImageDataUrl]);

  const getScenePointPct = useCallback((container: HTMLDivElement | null, clientX: number, clientY: number) => {
    if (!container) return null;
    const bounds = container.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return null;
    return {
      xPct: clamp(((clientX - bounds.left) / bounds.width) * 100, 0, 100),
      yPct: clamp(((clientY - bounds.top) / bounds.height) * 100, 0, 100)
    };
  }, []);

  const startSceneDesignDrag = useCallback(
    (
      captureTarget: HTMLDivElement,
      pointerId: number,
      clientX: number,
      clientY: number,
      startXPct: number,
      startYPct: number
    ) => {
      const drag: SceneDesignDragState = {
        pointerId,
        startClientX: clientX,
        startClientY: clientY,
        startXPct,
        startYPct
      };
      setSceneDesignDragState(drag);
      sceneDesignDragRef.current = drag;
      captureTarget.setPointerCapture(pointerId);
    },
    []
  );

  const handleSceneDesignPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (!sceneImageDataUrl || !designImageDataUrl) return;
      setError('');
      const captureTarget = (sceneUseFrame ? sceneFrameRef.current : sceneStageRef.current) ?? e.currentTarget;
      startSceneDesignDrag(
        captureTarget,
        e.pointerId,
        e.clientX,
        e.clientY,
        sceneDesignXPct,
        sceneDesignYPct
      );
      e.stopPropagation();
    },
    [designImageDataUrl, sceneDesignXPct, sceneDesignYPct, sceneImageDataUrl, sceneUseFrame, startSceneDesignDrag]
  );

  const handleScenePlacementPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (!sceneImageDataUrl || !designImageDataUrl) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('.sceneDesignLayer')) return;
      const container = sceneUseFrame ? sceneFrameRef.current : sceneStageRef.current;
      const point = getScenePointPct(container, e.clientX, e.clientY);
      if (!point) return;
      setError('');
      setSceneDesignXPct(point.xPct);
      setSceneDesignYPct(point.yPct);
      startSceneDesignDrag(e.currentTarget, e.pointerId, e.clientX, e.clientY, point.xPct, point.yPct);
    },
    [designImageDataUrl, getScenePointPct, sceneImageDataUrl, sceneUseFrame, startSceneDesignDrag]
  );

  const handleSceneDesignPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = sceneDesignDragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      const container = sceneUseFrame ? sceneFrameRef.current : sceneStageRef.current;
      if (!container) return;
      const bounds = container.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;

      const deltaXPct = ((e.clientX - drag.startClientX) / bounds.width) * 100;
      const deltaYPct = ((e.clientY - drag.startClientY) / bounds.height) * 100;
      setSceneDesignXPct(clamp(drag.startXPct + deltaXPct, 0, 100));
      setSceneDesignYPct(clamp(drag.startYPct + deltaYPct, 0, 100));
    },
    [sceneUseFrame]
  );

  const handleSceneDesignPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = sceneDesignDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setSceneDesignDragState(null);
    sceneDesignDragRef.current = null;
  }, []);

  const resetScenePlacement = useCallback(() => {
    setSceneFrameRect(DEFAULT_SCENE_FRAME);
    setSceneDesignXPct(50);
    setSceneDesignYPct(50);
    setSceneDesignScalePct(80);
    setSceneDesignRotationDeg(0);
  }, []);

  const composeSceneCanvasDataUrl = useCallback(
    async (format: 'png' | 'jpeg'): Promise<string> => {
      if (!sceneImageDataUrl) {
        throw new Error('No scene image available to export.');
      }
      if (!designImageDataUrl) {
        throw new Error('No design image available to export.');
      }

      const [sceneImage, designImage] = await Promise.all([
        loadImageElement(sceneImageDataUrl),
        loadImageElement(designImageDataUrl)
      ]);

      const width = sceneImage.naturalWidth || sceneImage.width;
      const height = sceneImage.naturalHeight || sceneImage.height;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas is not supported in this browser.');
      }

      if (format === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(sceneImage, 0, 0, width, height);

      const frameX = (sceneFrameRect.xPct / 100) * width;
      const frameY = (sceneFrameRect.yPct / 100) * height;
      const frameW = (sceneFrameRect.wPct / 100) * width;
      const frameH = (sceneFrameRect.hPct / 100) * height;
      const areaX = sceneUseFrame ? frameX : 0;
      const areaY = sceneUseFrame ? frameY : 0;
      const areaW = sceneUseFrame ? frameW : width;
      const areaH = sceneUseFrame ? frameH : height;

      const designCenterX = areaX + (sceneDesignXPct / 100) * areaW;
      const designCenterY = areaY + (sceneDesignYPct / 100) * areaH;
      const drawW = (sceneDesignScalePct / 100) * areaW;
      const designRatio = (designImage.naturalHeight || designImage.height) / Math.max(1, designImage.naturalWidth || designImage.width);
      const drawH = drawW * designRatio;

      ctx.save();
      if (sceneUseFrame) {
        ctx.beginPath();
        ctx.rect(frameX, frameY, frameW, frameH);
        ctx.clip();
      }
      ctx.translate(designCenterX, designCenterY);
      ctx.rotate((sceneDesignRotationDeg * Math.PI) / 180);
      ctx.drawImage(designImage, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      return format === 'png' ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.92);
    },
    [
      designImageDataUrl,
      sceneDesignRotationDeg,
      sceneDesignScalePct,
      sceneDesignXPct,
      sceneDesignYPct,
      sceneFrameRect,
      sceneImageDataUrl,
      sceneUseFrame
    ]
  );

  const handleDownloadScenePng = useCallback(async () => {
    try {
      setError('');
      const pngDataUrl = await composeSceneCanvasDataUrl('png');
      triggerDownload(pngDataUrl, `scene-canvas-${nowStamp()}.png`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Scene PNG export failed.';
      setError(message);
    }
  }, [composeSceneCanvasDataUrl]);

  const handleDownloadSceneJpg = useCallback(async () => {
    setDownloadingSceneJpg(true);
    try {
      setError('');
      const jpgDataUrl = await composeSceneCanvasDataUrl('jpeg');
      triggerDownload(jpgDataUrl, `scene-canvas-${nowStamp()}.jpg`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Scene JPG export failed.';
      setError(message);
    } finally {
      setDownloadingSceneJpg(false);
    }
  }, [composeSceneCanvasDataUrl]);

  return (
    <div className="mockupRoot">
      <header className="topbar">
        <div className="brand">
          <strong>MOCKUP</strong>
          <span>Studio</span>
        </div>
        <nav>
          <a href="/">Home</a>
        </nav>
      </header>

      <main className="layout">
        <section className="previewPanel">
          <div className="panelHead">
            <h2>{editorMode === 'auto_mockup' ? 'Result Preview' : 'Scene Canvas'}</h2>
            <span>{(editorMode === 'auto_mockup' ? autoProvider : sceneProvider).toUpperCase()}</span>
          </div>

          {editorMode === 'auto_mockup' ? (
            <>
              <div className="resultStage">
                {resultImageDataUrl ? (
                  <img src={resultImageDataUrl} alt="Generated mockup result" className="resultImage" />
                ) : (
                  <div className="resultPlaceholder">
                    <p>No result yet.</p>
                    <p>Upload design, set prompt, then generate.</p>
                  </div>
                )}
              </div>

              <div className="downloadRow">
                <button type="button" className="ghostBtn" disabled={!resultImageDataUrl} onClick={handleDownloadPng}>
                  Download PNG
                </button>
                <button
                  type="button"
                  className="ghostBtn"
                  disabled={!resultImageDataUrl || downloadingJpg}
                  onClick={() => void handleDownloadJpg()}
                >
                  {downloadingJpg ? 'Converting...' : 'Download JPG'}
                </button>
              </div>

              <div className="metaGrid">
                <div>
                  <label>Design</label>
                  <p>{designName || '-'}</p>
                </div>
                <div>
                  <label>Scene</label>
                  <p>{sceneName || 'None (AI scene)'}</p>
                </div>
                <div>
                  <label>Placement</label>
                  <p>{placementMode === 'preset' ? selectedPreset : 'custom_rect'}</p>
                </div>
                <div>
                  <label>Model</label>
                  <p>{resultModelUsed || selectedModel || '-'}</p>
                </div>
                <div>
                  <label>Aspect Ratio</label>
                  <p>{resultAspectRatioUsed || (autoProvider === 'gemini' ? autoAspectRatio : '-')}</p>
                </div>
                <div>
                  <label>Image Size</label>
                  <p>{resultImageSizeUsed || (autoProvider === 'gemini' ? autoImageSize : '-')}</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="resultStage sceneCanvasResultStage">
                {sceneImageDataUrl ? (
                  <div
                    ref={sceneStageRef}
                    className={`sceneCanvasStage${sceneUseFrame ? ' hasFrame' : ''}${sceneDesignDragState ? ' dragging' : ''}`}
                    onPointerDown={!sceneUseFrame ? handleScenePlacementPointerDown : undefined}
                    onPointerMove={!sceneUseFrame ? handleSceneDesignPointerMove : undefined}
                    onPointerUp={!sceneUseFrame ? handleSceneDesignPointerUp : undefined}
                    onPointerCancel={!sceneUseFrame ? handleSceneDesignPointerUp : undefined}
                  >
                    <img src={sceneImageDataUrl} alt="Generated scene" className="sceneCanvasBg" />
                    {sceneUseFrame ? (
                      <div
                        ref={sceneFrameRef}
                        className={`sceneFrameBox${sceneDesignDragState ? ' dragging' : ''}`}
                        style={{
                          left: `${sceneFrameRect.xPct}%`,
                          top: `${sceneFrameRect.yPct}%`,
                          width: `${sceneFrameRect.wPct}%`,
                          height: `${sceneFrameRect.hPct}%`
                        }}
                        onPointerDown={handleScenePlacementPointerDown}
                        onPointerMove={handleSceneDesignPointerMove}
                        onPointerUp={handleSceneDesignPointerUp}
                        onPointerCancel={handleSceneDesignPointerUp}
                      >
                        <span className="sceneFrameLabel">Frame Area</span>
                        {designImageDataUrl ? (
                          <div
                            className={`sceneDesignLayer${sceneDesignDragState ? ' dragging' : ''}`}
                            style={{
                              left: `${sceneDesignXPct}%`,
                              top: `${sceneDesignYPct}%`,
                              width: `${sceneDesignScalePct}%`,
                              transform: `translate(-50%, -50%) rotate(${sceneDesignRotationDeg}deg)`
                            }}
                            onPointerDown={handleSceneDesignPointerDown}
                          >
                            <img src={designImageDataUrl} alt="Placed design" draggable={false} />
                          </div>
                        ) : (
                          <div className="sceneFrameEmpty">Upload design to place into frame.</div>
                        )}
                      </div>
                    ) : designImageDataUrl ? (
                      <div
                        className={`sceneDesignLayer${sceneDesignDragState ? ' dragging' : ''}`}
                        style={{
                          left: `${sceneDesignXPct}%`,
                          top: `${sceneDesignYPct}%`,
                          width: `${sceneDesignScalePct}%`,
                          transform: `translate(-50%, -50%) rotate(${sceneDesignRotationDeg}deg)`
                        }}
                        onPointerDown={handleSceneDesignPointerDown}
                      >
                        <img src={designImageDataUrl} alt="Placed design" draggable={false} />
                      </div>
                    ) : (
                      <div className="sceneStageEmpty">Upload design to place on scene.</div>
                    )}
                  </div>
                ) : (
                  <div className="resultPlaceholder">
                    <p>No scene yet.</p>
                    <p>Generate scene from prompt or upload a scene image.</p>
                  </div>
                )}
              </div>

              <div className="downloadRow">
                <button
                  type="button"
                  className="ghostBtn"
                  disabled={!canDownloadSceneComposite}
                  onClick={() => void handleDownloadScenePng()}
                >
                  Download PNG
                </button>
                <button
                  type="button"
                  className="ghostBtn"
                  disabled={!canDownloadSceneComposite || downloadingSceneJpg}
                  onClick={() => void handleDownloadSceneJpg()}
                >
                  {downloadingSceneJpg ? 'Converting...' : 'Download JPG'}
                </button>
              </div>

              <div className="metaGrid">
                <div>
                  <label>Scene Engine</label>
                  <p>
                    {sceneProviderUsed || sceneProvider} / {sceneModelUsed || sceneSelectedModel || '-'}
                  </p>
                </div>
                <div>
                  <label>Design</label>
                  <p>{designName || '-'}</p>
                </div>
                <div>
                  <label>Placement Area</label>
                  <p>
                    {sceneUseFrame
                      ? `${sceneFrameRect.xPct.toFixed(0)}/${sceneFrameRect.yPct.toFixed(0)} ${sceneFrameRect.wPct.toFixed(0)}x${sceneFrameRect.hPct.toFixed(0)}`
                      : 'Full scene'}
                  </p>
                </div>
                <div>
                  <label>Transform</label>
                  <p>
                    scale({sceneDesignScalePct.toFixed(0)}%) rotate({sceneDesignRotationDeg.toFixed(0)}°)
                  </p>
                </div>
                <div>
                  <label>Aspect Ratio</label>
                  <p>{sceneAspectRatioUsed || sceneAspectRatio || '-'}</p>
                </div>
                <div>
                  <label>Image Size</label>
                  <p>{sceneImageSizeUsed || (sceneProvider === 'gemini' ? sceneImageSize : '-')}</p>
                </div>
              </div>
            </>
          )}
        </section>

        <aside className="controlPanel">
          <div className="editorTabs">
            <div className="editorTabWrap">
              <button
                type="button"
                className={`editorTab${editorMode === 'auto_mockup' ? ' active' : ''}`}
                onClick={() => setEditorMode('auto_mockup')}
              >
                Auto Mockup
              </button>
            </div>
            <div className="editorTabWrap">
              <button
                type="button"
                className={`editorTab${editorMode === 'scene_canvas' ? ' active' : ''}`}
                onClick={() => setEditorMode('scene_canvas')}
              >
                Scene Canvas
              </button>
            </div>
          </div>

          <div className="sidebarTabs">
            <button
              type="button"
              className={`sidebarTab${sidebarPanelTab === 'editor' ? ' active' : ''}`}
              onClick={() => setSidebarPanelTab('editor')}
            >
              Editor
            </button>
            <button
              type="button"
              className={`sidebarTab${sidebarPanelTab === 'prompts' ? ' active' : ''}`}
              onClick={() => setSidebarPanelTab('prompts')}
            >
              Prompts
            </button>
            <button
              type="button"
              className={`sidebarTab${sidebarPanelTab === 'learning' ? ' active' : ''}`}
              onClick={() => setSidebarPanelTab('learning')}
            >
              Learning
            </button>
          </div>

          {sidebarPanelTab === 'learning' && editorMode === 'auto_mockup' ? (
            <div className="helpExpander">
              <button
                type="button"
                className="helpExpanderToggle"
                onClick={() => setAutoHelpExpanded((prev) => !prev)}
                aria-expanded={autoHelpExpanded}
              >
                <span className="helpExpanderIcon" aria-hidden>
                  <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 16v-4" />
                    <circle cx="12" cy="8" r="0.9" className="dot" />
                  </svg>
                </span>
                <span>Auto Mockup Rehberi</span>
                <span className={`helpChevron${autoHelpExpanded ? ' open' : ''}`} aria-hidden>
                  ▾
                </span>
              </button>
              {autoHelpExpanded ? (
                <div className="helpExpanderBody">
                  <p className="infoText">
                    Bu mod tek adimda otomatik mockup uretir. Tasarim, prompt ve opsiyonel sahneyi AI modeline gonderir;
                    model tasarimi sahneye yerlestirip final gorseli olusturur.
                  </p>
                  <p className="infoTitle">Ne zaman kullanilir?</p>
                  <ul className="infoList">
                    <li>Hizli sekilde tek cikti almak istiyorsan.</li>
                    <li>Yerlesimi elle yapmak yerine AI karar versin istiyorsan.</li>
                    <li>Bir urun icin farkli promptlarla hizli deneme yapmak istiyorsan.</li>
                  </ul>
                  <p className="infoTitle">Scene Canvas ile farki</p>
                  <ul className="infoList">
                    <li>Auto Mockup tam otomatik birlestirme yapar.</li>
                    <li>Scene Canvas sahneyi uretir ama yerlestirmeyi sen yaparsin.</li>
                  </ul>
                  <p className="infoTitle">Inputlar ne ise yarar?</p>
                  <ul className="infoList">
                    <li>Upload Design: ana tasarim gorseli (zorunlu).</li>
                    <li>Upload Scene: modelin sadik kalacagi arka plan referansi (opsiyonel).</li>
                    <li>Prompt: sahne stili, urun tipi, kamera, isik gibi talimatlar.</li>
                    <li>Provider / Model: uretim motoru ve kalite-hiz tercihi.</li>
                    <li>Placement: preset veya custom rect ile hedef bolge secimi.</li>
                    <li>Aspect Ratio / Image Size: kompozisyon orani ve cikti boyutu.</li>
                    <li>Clean Design Background: tasarim arka planini temizleyip daha net baski etkisi verir.</li>
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {sidebarPanelTab === 'learning' && editorMode === 'scene_canvas' ? (
            <div className="helpExpander">
              <button
                type="button"
                className="helpExpanderToggle"
                onClick={() => setSceneHelpExpanded((prev) => !prev)}
                aria-expanded={sceneHelpExpanded}
              >
                <span className="helpExpanderIcon" aria-hidden>
                  <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 16v-4" />
                    <circle cx="12" cy="8" r="0.9" className="dot" />
                  </svg>
                </span>
                <span>Scene Canvas Rehberi</span>
                <span className={`helpChevron${sceneHelpExpanded ? ' open' : ''}`} aria-hidden>
                  ▾
                </span>
              </button>
              {sceneHelpExpanded ? (
                <div className="helpExpanderBody">
                  <p className="infoText">
                    Bu mod once sadece sahne uretir veya sahne yukler. Sonra tasarimi kanvas ustunde elle surukleyip
                    yerlestirirsin. Konum, olcek ve rotasyon uzerinde tam kontrol verir.
                  </p>
                  <p className="infoTitle">Ne zaman kullanilir?</p>
                  <ul className="infoList">
                    <li>Tasarim yerlesimini manuel yonetmek istiyorsan.</li>
                    <li>Ayni sahnede farkli varyasyonlar deneyeceksen.</li>
                    <li>AI yerlesimi yerine goz karari final istiyorsan.</li>
                  </ul>
                  <p className="infoTitle">Auto Mockup ile farki</p>
                  <ul className="infoList">
                    <li>Scene Canvas sahneyi uretir, yerlestirmeyi kullanici yapar.</li>
                    <li>Auto Mockup tek API adiminda sahne + tasarim birlestirir.</li>
                  </ul>
                  <p className="infoTitle">Inputlar ne ise yarar?</p>
                  <ul className="infoList">
                    <li>Scene Prompt: arka planin mekan/stil/isik tanimi.</li>
                    <li>Provider / Model: sahne uretim motoru.</li>
                    <li>Aspect Ratio / Image Size: sahne cikti ayarlari.</li>
                    <li>Upload Scene: disaridan hazir arka plan kullanmak icin.</li>
                    <li>Upload Design: sahneye yerlestirilecek tasarim.</li>
                    <li>Scale / Rotation: manuel transform ayarlari.</li>
                    <li>Drag on canvas: tasarimi istedigin noktaya tasima.</li>
                    <li>Use frame area: istersen yerlestirmeyi belirli bolgeye kilitleme.</li>
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {sidebarPanelTab === 'editor' ? (
            <div className="panelBlock">
            <h3>Uploads</h3>
            <input
              ref={designInputRef}
              type="file"
              accept="image/*"
              className="hiddenInput"
              onChange={(e) => {
                void handleDesignFile(e.target.files?.[0] ?? null);
                e.currentTarget.value = '';
              }}
            />
            <input
              ref={sceneInputRef}
              type="file"
              accept="image/*"
              className="hiddenInput"
              onChange={(e) => {
                void handleSceneFile(e.target.files?.[0] ?? null);
                e.currentTarget.value = '';
              }}
            />
            <div className="buttonRow">
              <button type="button" className="primaryBtn" onClick={() => designInputRef.current?.click()}>
                Upload Design
              </button>
              <button type="button" className="ghostBtn" onClick={() => sceneInputRef.current?.click()}>
                Upload Scene
              </button>
              <button type="button" className="ghostBtn" onClick={clearScene} disabled={!sceneImageDataUrl}>
                Clear Scene
              </button>
            </div>

            <div className="thumbRow">
              <div className="thumbCard">
                <label>Design</label>
                <div className="thumbWrap">
                  {designImageDataUrl ? <img src={designImageDataUrl} alt="Design preview" /> : <span>Empty</span>}
                </div>
              </div>
              <div className="thumbCard">
                <label>Scene</label>
                <div className="thumbWrap">
                  {sceneImageDataUrl ? <img src={sceneImageDataUrl} alt="Scene preview" /> : <span>Optional</span>}
                </div>
              </div>
            </div>
            </div>
          ) : null}

          {sidebarPanelTab === 'prompts' ? (
            <div className="panelBlock scrollPanel">
            <div className="promptLibraryHead">
              <h3>{helpLanguage === 'tr' ? 'Prompt Kutuphanesi' : 'Prompt Library'}</h3>
              <span>{editorMode === 'auto_mockup' ? 'Auto Mockup' : 'Scene Canvas'}</span>
            </div>
            <div className="languageRow">
              <div className="languageToggle">
                <button
                  type="button"
                  className={helpLanguage === 'en' ? 'active' : ''}
                  onClick={() => setHelpLanguage('en')}
                >
                  EN
                </button>
                <button
                  type="button"
                  className={helpLanguage === 'tr' ? 'active' : ''}
                  onClick={() => setHelpLanguage('tr')}
                >
                  TR
                </button>
              </div>
            </div>
            <p className="hint">
              {helpLanguage === 'tr'
                ? 'Bir sablon sec, gerekirse prompt alaninda duzenle.'
                : 'Pick a template, then edit in the prompt box if needed.'}
            </p>
            <div className="promptFilterGrid">
              <div className="filterField">
                <label>{helpLanguage === 'tr' ? 'Urun' : 'Product'}</label>
                <select value={promptTypeFilter} onChange={(e) => setPromptTypeFilter(e.target.value as PromptTypeFilter)}>
                  <option value="all">{helpLanguage === 'tr' ? 'Tum Promptlar' : 'All prompts'}</option>
                  <option value="tshirt">{helpLanguage === 'tr' ? 'Sadece T-Shirt' : 'T-Shirt only'}</option>
                </select>
              </div>
              <div className="filterField">
                <label>{helpLanguage === 'tr' ? 'Mekan' : 'Setting'}</label>
                <select
                  value={promptSettingFilter}
                  onChange={(e) => setPromptSettingFilter(e.target.value as PromptSettingFilter)}
                >
                  <option value="all">{helpLanguage === 'tr' ? 'Tum Mekanlar' : 'All settings'}</option>
                  <option value="indoor">{helpLanguage === 'tr' ? 'Ic Mekan' : 'Indoor'}</option>
                  <option value="outdoor">{helpLanguage === 'tr' ? 'Dis Mekan' : 'Outdoor'}</option>
                </select>
              </div>
              <div className="filterField">
                <label>{helpLanguage === 'tr' ? 'Stil' : 'Style'}</label>
                <select value={promptStyleFilter} onChange={(e) => setPromptStyleFilter(e.target.value)}>
                  <option value="all">{helpLanguage === 'tr' ? 'Tum Stiller' : 'All styles'}</option>
                  {promptStyleOptions.map((option) => (
                    <option key={option} value={option}>
                      {formatFilterTagLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filterField">
                <label>{helpLanguage === 'tr' ? 'Sahne' : 'Scene'}</label>
                <select value={promptSceneFilter} onChange={(e) => setPromptSceneFilter(e.target.value)}>
                  <option value="all">{helpLanguage === 'tr' ? 'Tum Sahneler' : 'All scenes'}</option>
                  {promptSceneOptions.map((option) => (
                    <option key={option} value={option}>
                      {formatFilterTagLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filterField">
                <label>{helpLanguage === 'tr' ? 'Hava' : 'Weather'}</label>
                <select value={promptWeatherFilter} onChange={(e) => setPromptWeatherFilter(e.target.value)}>
                  <option value="all">{helpLanguage === 'tr' ? 'Tum Hava Kosullari' : 'All weather'}</option>
                  {promptWeatherOptions.map((option) => (
                    <option key={option} value={option}>
                      {formatFilterTagLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="hint">
              {helpLanguage === 'tr'
                ? `${filteredPromptTemplates.length} sablon listeleniyor.`
                : `${filteredPromptTemplates.length} templates shown.`}
            </p>
            <div className="promptLibraryList">
              {groupedPromptTemplates.length === 0 ? (
                <p className="hint">{helpLanguage === 'tr' ? 'Filtreye uygun prompt yok.' : 'No prompts match filters.'}</p>
              ) : (
                groupedPromptTemplates.map(({ category, items }) => (
                  <section key={category} className="promptGroup">
                    <div className="promptGroupHead">
                      <strong>{category}</strong>
                      <span>{items.length}</span>
                    </div>
                    <div className="promptGroupList">
                      {items.map(({ item, title, prompt }) => (
                        <article key={item.id} className="promptCard">
                          <div className="promptCardHead">
                            <strong>{title}</strong>
                            <label>{category}</label>
                          </div>
                          {item.styleTag || item.sceneTag || item.weatherTag || item.settingTag ? (
                            <div className="promptMetaRow">
                              {item.styleTag ? (
                                <span>{`${helpLanguage === 'tr' ? 'Stil' : 'Style'}: ${formatFilterTagLabel(item.styleTag)}`}</span>
                              ) : null}
                              {item.sceneTag ? (
                                <span>{`${helpLanguage === 'tr' ? 'Sahne' : 'Scene'}: ${formatFilterTagLabel(item.sceneTag)}`}</span>
                              ) : null}
                              {item.weatherTag ? (
                                <span>{`${helpLanguage === 'tr' ? 'Hava' : 'Weather'}: ${formatFilterTagLabel(item.weatherTag)}`}</span>
                              ) : null}
                              {item.settingTag ? (
                                <span>
                                  {`${helpLanguage === 'tr' ? 'Mekan' : 'Setting'}: ${
                                    item.settingTag === 'indoor'
                                      ? helpLanguage === 'tr'
                                        ? 'Ic Mekan'
                                        : 'Indoor'
                                      : helpLanguage === 'tr'
                                        ? 'Dis Mekan'
                                        : 'Outdoor'
                                  }`}
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                          <p>{prompt}</p>
                          <div className="buttonRow">
                            <button type="button" className="ghostBtn" onClick={() => handleUsePromptTemplate(prompt)}>
                              {helpLanguage === 'tr' ? 'Kullan' : 'Use'}
                            </button>
                            <button
                              type="button"
                              className="ghostBtn"
                              onClick={() => void handleCopyPromptTemplate(item.id, prompt)}
                            >
                              {copiedPromptId === item.id
                                ? helpLanguage === 'tr'
                                  ? 'Kopyalandi'
                                  : 'Copied'
                                : helpLanguage === 'tr'
                                  ? 'Kopyala'
                                  : 'Copy'}
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>
            </div>
          ) : null}

          {sidebarPanelTab === 'learning' ? (
            <div className="panelBlock scrollPanel">
            <div className="promptLibraryHead">
              <h3>{helpLanguage === 'tr' ? 'Kisa Ogrenme' : 'Short Learning'}</h3>
              <div className="languageToggle">
                <button
                  type="button"
                  className={helpLanguage === 'en' ? 'active' : ''}
                  onClick={() => setHelpLanguage('en')}
                >
                  EN
                </button>
                <button
                  type="button"
                  className={helpLanguage === 'tr' ? 'active' : ''}
                  onClick={() => setHelpLanguage('tr')}
                >
                  TR
                </button>
              </div>
            </div>
            <div className="learningGroup">
              <p className="learningTitle">{helpLanguage === 'tr' ? 'En Iyi Pratikler' : 'Best Practices'}</p>
              <ul className="learningList">
                {localizedLearningTips.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="learningGroup">
              <p className="learningTitle">{helpLanguage === 'tr' ? 'Sinirlar' : 'Limits'}</p>
              <ul className="learningList">
                {localizedLearningLimits.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            </div>
          ) : null}

          {sidebarPanelTab === 'editor' ? (
            editorMode === 'auto_mockup' ? (
            <>
              <div className="panelBlock">
                <h3>Prompt</h3>
                <textarea
                  value={userPrompt}
                  maxLength={maxPromptLength}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="Example: Place this vintage design naturally on an oversized black t-shirt in a streetwear lifestyle scene."
                />
                <p className={`hint ${promptRemaining < 0 ? 'danger' : ''}`}>{promptRemaining} chars remaining</p>
              </div>

              <div className="panelBlock">
                <h3>Generation</h3>
                <div className="field">
                  <label htmlFor="auto-provider">Provider</label>
                  <select
                    id="auto-provider"
                    value={autoProvider}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (!isSceneProviderKey(next)) return;
                      setAutoProvider(next);
                      const nextModels = autoModelsByProvider[next] ?? [];
                      setSelectedModel((prev) => (nextModels.includes(prev) ? prev : (nextModels[0] ?? '')));
                    }}
                    disabled={configLoading || generating}
                  >
                    {autoProviderOptions.map((provider) => (
                      <option key={provider} value={provider}>
                        {provider === 'gemini' ? 'Gemini' : 'Replicate'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="model">Model</label>
                  <select
                    id="model"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={configLoading || generating}
                  >
                    {autoModelOptions.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>

                {autoProvider === 'gemini' ? (
                  <>
                    <div className="field">
                      <label htmlFor="auto-aspect-ratio">Aspect Ratio</label>
                      <select
                        id="auto-aspect-ratio"
                        value={autoAspectRatio}
                        onChange={(e) => setAutoAspectRatio(e.target.value)}
                        disabled={configLoading || generating || autoGeminiAspectRatioOptions.length === 0}
                      >
                        {autoGeminiAspectRatioOptions.map((ratio) => (
                          <option key={ratio} value={ratio}>
                            {ratio}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label htmlFor="auto-image-size">Image Size</label>
                      <select
                        id="auto-image-size"
                        value={autoImageSize}
                        onChange={(e) => setAutoImageSize(e.target.value)}
                        disabled={configLoading || generating || autoGeminiImageSizeOptions.length === 0}
                      >
                        {autoGeminiImageSizeOptions.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : null}

                <label className="toggleRow">
                  <input
                    type="checkbox"
                    checked={cleanDesignBackground}
                    onChange={(e) => setCleanDesignBackground(e.target.checked)}
                    disabled={generating}
                  />
                  <span>Clean design background before generate</span>
                </label>
              </div>

              <div className="panelBlock">
                <h3>Placement</h3>
                <div className="modeRow">
                  <label>
                    <input
                      type="radio"
                      name="placementMode"
                      value="preset"
                      checked={placementMode === 'preset'}
                      onChange={() => setPlacementMode('preset')}
                      disabled={generating}
                    />
                    <span>Preset</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="placementMode"
                      value="custom_rect"
                      checked={placementMode === 'custom_rect'}
                      onChange={() => setPlacementMode('custom_rect')}
                      disabled={generating || !sceneImageDataUrl}
                    />
                    <span>Custom Rect</span>
                  </label>
                </div>

                {placementMode === 'preset' ? (
                  <>
                    <select
                      value={selectedPreset}
                      onChange={(e) => {
                        const key = e.target.value;
                        if (isPlacementPresetKey(key)) setSelectedPreset(key);
                      }}
                      disabled={generating}
                    >
                      {placementPresets.map((preset) => (
                        <option key={preset.key} value={preset.key}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                    <p className="hint">{selectedPresetHint}</p>
                  </>
                ) : (
                  <>
                    <p className="hint">Drag on scene preview to set placement area.</p>
                    <div
                      ref={customRectBoardRef}
                      className="customRectBoard"
                      onPointerDown={handleCustomRectPointerDown}
                      onPointerMove={handleCustomRectPointerMove}
                      onPointerUp={handleCustomRectPointerUp}
                      onPointerCancel={handleCustomRectPointerUp}
                    >
                      {sceneImageDataUrl ? <img src={sceneImageDataUrl} alt="Scene placement board" draggable={false} /> : null}
                      <div
                        className={`rectOverlay ${placementDragState ? 'drawing' : ''}`}
                        style={{
                          left: `${placementRect.xPct}%`,
                          top: `${placementRect.yPct}%`,
                          width: `${placementRect.wPct}%`,
                          height: `${placementRect.hPct}%`
                        }}
                      />
                    </div>
                    <p className="hint mono">
                      x:{placementRect.xPct.toFixed(1)} y:{placementRect.yPct.toFixed(1)} w:{placementRect.wPct.toFixed(1)} h:
                      {placementRect.hPct.toFixed(1)}
                    </p>
                  </>
                )}
              </div>

              <div className="actionRow">
                <button type="button" className="primaryBtn" disabled={!canGenerate} onClick={() => void handleGenerate()}>
                  {generating ? 'Generating...' : 'Generate Mockup'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="panelBlock">
                <h3>Scene Prompt</h3>
                <textarea
                  value={scenePrompt}
                  maxLength={maxPromptLength}
                  onChange={(e) => setScenePrompt(e.target.value)}
                  placeholder="Example: A modern living room with beige wall, framed poster space, soft daylight, realistic interior photo style."
                />
                <p className={`hint ${scenePromptRemaining < 0 ? 'danger' : ''}`}>{scenePromptRemaining} chars remaining</p>

                <div className="field">
                  <label htmlFor="scene-provider">Provider</label>
                  <select
                    id="scene-provider"
                    value={sceneProvider}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (!isSceneProviderKey(next)) return;
                      setSceneProvider(next);
                      const nextModels = sceneModelsByProvider[next] ?? [];
                      setSceneSelectedModel((prev) => (nextModels.includes(prev) ? prev : (nextModels[0] ?? '')));
                    }}
                    disabled={configLoading || sceneGenerating}
                  >
                    {sceneProviderOptions.map((provider) => (
                      <option key={provider} value={provider}>
                        {provider === 'gemini' ? 'Gemini' : 'Replicate'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="scene-model">Model</label>
                  <select
                    id="scene-model"
                    value={sceneSelectedModel}
                    onChange={(e) => setSceneSelectedModel(e.target.value)}
                    disabled={configLoading || sceneGenerating}
                  >
                    {sceneModelOptions.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>

                {sceneProvider === 'replicate' ? (
                  <div className="field">
                    <label htmlFor="scene-aspect-ratio">Aspect Ratio</label>
                    <select
                      id="scene-aspect-ratio"
                      value={sceneAspectRatio}
                      onChange={(e) => setSceneAspectRatio(e.target.value)}
                      disabled={configLoading || sceneGenerating || sceneReplicateAspectRatioOptions.length === 0}
                    >
                      {sceneReplicateAspectRatioOptions.map((ratio) => (
                        <option key={ratio} value={ratio}>
                          {ratio}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {sceneProvider === 'gemini' ? (
                  <>
                    <div className="field">
                      <label htmlFor="scene-gemini-aspect-ratio">Aspect Ratio</label>
                      <select
                        id="scene-gemini-aspect-ratio"
                        value={sceneAspectRatio}
                        onChange={(e) => setSceneAspectRatio(e.target.value)}
                        disabled={configLoading || sceneGenerating || sceneGeminiAspectRatioOptions.length === 0}
                      >
                        {sceneGeminiAspectRatioOptions.map((ratio) => (
                          <option key={ratio} value={ratio}>
                            {ratio}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label htmlFor="scene-gemini-image-size">Image Size</label>
                      <select
                        id="scene-gemini-image-size"
                        value={sceneImageSize}
                        onChange={(e) => setSceneImageSize(e.target.value)}
                        disabled={configLoading || sceneGenerating || sceneGeminiImageSizeOptions.length === 0}
                      >
                        {sceneGeminiImageSizeOptions.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : null}

                <div className="actionRow">
                  <button
                    type="button"
                    className="primaryBtn"
                    disabled={!canGenerateScene}
                    onClick={() => void handleGenerateScene()}
                  >
                    {sceneGenerating ? 'Generating Scene...' : 'Generate Scene Only'}
                  </button>
                </div>
              </div>

              <div className="panelBlock">
                <h3>Design Transform</h3>
                <label className="toggleRow">
                  <input
                    type="checkbox"
                    checked={sceneUseFrame}
                    onChange={(e) => setSceneUseFrame(e.target.checked)}
                    disabled={!sceneImageDataUrl}
                  />
                  <span>Use frame area (advanced)</span>
                </label>
                <p className="hint">
                  {sceneUseFrame
                    ? 'Frame mode is on. Drag design inside frame.'
                    : 'Free mode is on. Drag design anywhere on scene.'}
                </p>
                <div className="rangeField">
                  <label>Scale ({sceneDesignScalePct.toFixed(0)}%)</label>
                  <input
                    type="range"
                    min={0}
                    max={220}
                    value={Math.round(sceneDesignScalePct)}
                    onChange={(e) => setSceneDesignScalePct(clamp(Number(e.target.value), 0, 220))}
                  />
                </div>
                <div className="rangeField">
                  <label>Rotation ({sceneDesignRotationDeg.toFixed(0)}°)</label>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    value={Math.round(sceneDesignRotationDeg)}
                    onChange={(e) => setSceneDesignRotationDeg(clamp(Number(e.target.value), -180, 180))}
                  />
                </div>

                <div className="buttonRow">
                  <button type="button" className="ghostBtn" onClick={resetScenePlacement}>
                    Reset Placement
                  </button>
                </div>
              </div>

              {sceneUseFrame ? (
                <div className="panelBlock">
                  <h3>Frame (Advanced)</h3>
                  <div className="rangeField">
                    <label>Frame X ({sceneFrameRect.xPct.toFixed(0)}%)</label>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, Math.round(100 - sceneFrameRect.wPct))}
                      value={Math.round(sceneFrameRect.xPct)}
                      onChange={(e) => {
                        const nextX = Number(e.target.value);
                        setSceneFrameRect((prev) => ({ ...prev, xPct: clamp(nextX, 0, 100 - prev.wPct) }));
                      }}
                    />
                  </div>
                  <div className="rangeField">
                    <label>Frame Y ({sceneFrameRect.yPct.toFixed(0)}%)</label>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, Math.round(100 - sceneFrameRect.hPct))}
                      value={Math.round(sceneFrameRect.yPct)}
                      onChange={(e) => {
                        const nextY = Number(e.target.value);
                        setSceneFrameRect((prev) => ({ ...prev, yPct: clamp(nextY, 0, 100 - prev.hPct) }));
                      }}
                    />
                  </div>
                  <div className="rangeField">
                    <label>Frame Width ({sceneFrameRect.wPct.toFixed(0)}%)</label>
                    <input
                      type="range"
                      min={10}
                      max={Math.max(10, Math.round(100 - sceneFrameRect.xPct))}
                      value={Math.round(sceneFrameRect.wPct)}
                      onChange={(e) => {
                        const nextW = Number(e.target.value);
                        setSceneFrameRect((prev) => ({ ...prev, wPct: clamp(nextW, 10, 100 - prev.xPct) }));
                      }}
                    />
                  </div>
                  <div className="rangeField">
                    <label>Frame Height ({sceneFrameRect.hPct.toFixed(0)}%)</label>
                    <input
                      type="range"
                      min={10}
                      max={Math.max(10, Math.round(100 - sceneFrameRect.yPct))}
                      value={Math.round(sceneFrameRect.hPct)}
                      onChange={(e) => {
                        const nextH = Number(e.target.value);
                        setSceneFrameRect((prev) => ({ ...prev, hPct: clamp(nextH, 10, 100 - prev.yPct) }));
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </>
            )
          ) : null}

          {error ? <p className="error">{error}</p> : null}
        </aside>
      </main>

      <style jsx>{`
        .mockupRoot {
          height: 100vh;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          background:
            radial-gradient(circle at 12% 5%, rgba(116, 183, 239, 0.2), transparent 38%),
            radial-gradient(circle at 88% 0%, rgba(161, 213, 202, 0.2), transparent 34%),
            linear-gradient(165deg, #eef3fa 0%, #e9f1f8 48%, #e5ebf3 100%);
          color: #12213a;
          padding: 16px;
          font-family: 'Signika', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
          overflow: hidden;
        }

        .topbar {
          width: min(1320px, 100%);
          margin: 0 auto 14px auto;
          padding: 10px 14px;
          border: 1px solid #c9d7eb;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .brand {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .brand strong {
          font-size: 18px;
          letter-spacing: 0.08em;
        }

        .brand span {
          color: #3f5375;
          font-size: 13px;
        }

        nav {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        nav a {
          border: 1px solid #c8d6ea;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 10px;
          padding: 6px 10px;
          color: #16325a;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
        }

        .layout {
          width: min(1320px, 100%);
          margin: 0 auto;
          flex: 1;
          min-height: 0;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 430px;
          gap: 14px;
          align-items: start;
          overflow: hidden;
        }

        .previewPanel {
          border: 1px solid #cad8ec;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.88);
          padding: 14px;
          display: grid;
          gap: 12px;
          min-height: 0;
          height: 100%;
          overflow: hidden;
        }

        .panelHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .panelHead h2 {
          margin: 0;
          font-size: 18px;
          color: #1b2f53;
        }

        .panelHead span {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #30507e;
          border: 1px solid #c6d7ec;
          border-radius: 999px;
          padding: 4px 9px;
          background: #edf5ff;
        }

        .resultStage {
          border: 1px dashed #b7c9e2;
          border-radius: 14px;
          min-height: 520px;
          background: linear-gradient(165deg, #f7fbff 0%, #eff6ff 100%);
          display: grid;
          place-items: center;
          overflow: hidden;
          position: relative;
        }

        .sceneCanvasResultStage {
          min-height: 580px;
        }

        .resultImage {
          max-width: 100%;
          max-height: 680px;
          width: auto;
          height: auto;
          display: block;
          object-fit: contain;
        }

        .sceneCanvasStage {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 560px;
          overflow: hidden;
          background: #e8f0fb;
          touch-action: none;
          cursor: grab;
        }

        .sceneCanvasStage.hasFrame {
          cursor: default;
        }

        .sceneCanvasStage.dragging {
          cursor: grabbing;
        }

        .sceneCanvasBg {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
          position: absolute;
          inset: 0;
          user-select: none;
          pointer-events: none;
        }

        .sceneFrameBox {
          position: absolute;
          border: 2px dashed rgba(37, 96, 152, 0.95);
          box-shadow: 0 0 0 9999px rgba(13, 34, 61, 0.14);
          overflow: hidden;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.05);
          touch-action: none;
          cursor: grab;
        }

        .sceneFrameBox.dragging {
          cursor: grabbing;
        }

        .sceneFrameLabel {
          position: absolute;
          left: 6px;
          top: 6px;
          font-size: 11px;
          color: #ffffff;
          background: rgba(20, 51, 86, 0.75);
          border-radius: 999px;
          padding: 2px 7px;
          z-index: 4;
          letter-spacing: 0.03em;
        }

        .sceneFrameEmpty {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          color: rgba(255, 255, 255, 0.86);
          font-size: 12px;
          text-align: center;
          padding: 8px;
          z-index: 3;
        }

        .sceneStageEmpty {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          color: #3c5679;
          font-size: 13px;
          text-align: center;
          padding: 12px;
          z-index: 2;
        }

        .sceneDesignLayer {
          position: absolute;
          transform-origin: center center;
          touch-action: none;
          cursor: grab;
          z-index: 3;
        }

        .sceneDesignLayer.dragging {
          cursor: grabbing;
        }

        .sceneDesignLayer img {
          width: 100%;
          height: auto;
          display: block;
          user-select: none;
          pointer-events: none;
          filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.32));
        }

        .resultPlaceholder {
          color: #54698d;
          text-align: center;
          display: grid;
          gap: 4px;
        }

        .resultPlaceholder p {
          margin: 0;
        }

        .downloadRow {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .metaGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          border-top: 1px solid #d3deee;
          padding-top: 10px;
        }

        .metaGrid label {
          display: block;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #5e7396;
          margin-bottom: 3px;
        }

        .metaGrid p {
          margin: 0;
          font-size: 13px;
          color: #173153;
          word-break: break-word;
        }

        .controlPanel {
          border: 1px solid #cad8ec;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.9);
          padding: 12px 12px 28px 12px;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 10px;
          height: 100%;
          max-height: 100%;
          overflow-y: auto;
          overflow-x: visible;
          scroll-padding-bottom: 36px;
          position: relative;
          z-index: 30;
        }

        .controlPanel::after {
          content: '';
          display: block;
          min-height: 16px;
          flex-shrink: 0;
        }

        .editorTabs {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .editorTabWrap {
          display: block;
          min-width: 0;
        }

        .editorTab {
          width: 100%;
          border: 1px solid #c4d4e8;
          border-radius: 10px;
          background: #ffffff;
          color: #234c7a;
          font-size: 13px;
          font-weight: 700;
          padding: 9px 10px;
          cursor: pointer;
        }

        .editorTab.active {
          color: #f2f7ff;
          background: linear-gradient(130deg, #20578d 0%, #2b72ac 100%);
          border-color: #20578d;
        }

        .helpExpander {
          border: 1px solid #d2deef;
          border-radius: 12px;
          background: #f8fbff;
          overflow: hidden;
          min-height: 0;
        }

        .helpExpanderToggle {
          width: 100%;
          border: 0;
          border-bottom: 1px solid #d9e4f2;
          background: #f2f8ff;
          color: #1e4770;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          text-align: left;
        }

        .helpExpanderIcon {
          width: 18px;
          height: 18px;
          min-width: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #2a669f;
        }

        .helpExpanderIcon svg {
          width: 18px;
          height: 18px;
          stroke: currentColor;
          fill: none;
          stroke-width: 1.8;
        }

        .helpExpanderIcon svg .dot {
          fill: currentColor;
          stroke: none;
        }

        .helpChevron {
          margin-left: auto;
          color: #2f5f90;
          transition: transform 0.16s ease;
        }

        .helpChevron.open {
          transform: rotate(180deg);
        }

        .helpExpanderBody {
          padding: 10px 10px 11px 10px;
          display: grid;
          gap: 8px;
          max-height: none;
          overflow: visible;
          padding-bottom: 18px;
        }

        .sidebarTabs {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          align-items: stretch;
        }

        .sidebarTab {
          border: 1px solid #c7d7eb;
          border-radius: 10px;
          background: #ffffff;
          color: #2b4f78;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.03em;
          padding: 0 8px;
          height: 40px;
          min-height: 40px;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
          cursor: pointer;
        }

        .sidebarTab.active {
          color: #f4f8ff;
          background: linear-gradient(130deg, #2c679f 0%, #3a7cb8 100%);
          border-color: #2b6298;
        }

        .panelBlock {
          border: 1px solid #d2deef;
          border-radius: 12px;
          padding: 10px;
          background: #f8fbff;
          display: grid;
          gap: 8px;
        }

        .scrollPanel {
          max-height: min(70vh, 700px);
          overflow-y: auto;
          overscroll-behavior: auto;
          -webkit-overflow-scrolling: touch;
          padding-right: 8px;
          padding-bottom: 12px;
        }

        .panelBlock h3 {
          margin: 0;
          font-size: 14px;
          color: #1d355d;
        }

        .infoText {
          margin: 0;
          font-size: 13px;
          line-height: 1.5;
          color: #1f446b;
        }

        .infoTitle {
          margin: 0;
          font-size: 12px;
          font-weight: 700;
          color: #173e66;
        }

        .infoList {
          margin: 0;
          padding-left: 16px;
          display: grid;
          gap: 5px;
          color: #24496f;
          font-size: 12.5px;
          line-height: 1.42;
        }

        .promptLibraryHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .promptLibraryHead span {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: #2f5f91;
          border: 1px solid #c8d8ed;
          border-radius: 999px;
          padding: 3px 8px;
          background: #eef5ff;
        }

        .languageRow {
          display: flex;
          justify-content: flex-end;
        }

        .promptFilterGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .filterField {
          display: grid;
          gap: 4px;
        }

        .filterField label {
          font-size: 11px;
          font-weight: 700;
          color: #35587f;
          letter-spacing: 0.02em;
        }

        .filterField select {
          width: 100%;
          border: 1px solid #c8d9ef;
          border-radius: 8px;
          background: #ffffff;
          color: #274b73;
          padding: 6px 8px;
          font-size: 12px;
        }

        .languageToggle {
          display: inline-flex;
          border: 1px solid #c9d9ed;
          border-radius: 999px;
          overflow: hidden;
          background: #ffffff;
        }

        .languageToggle button {
          border: 0;
          background: transparent;
          color: #2f5885;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          padding: 4px 8px;
          cursor: pointer;
        }

        .languageToggle button.active {
          background: linear-gradient(130deg, #2b699f 0%, #3a81bb 100%);
          color: #f3f8ff;
        }

        .promptLibraryList {
          display: grid;
          gap: 8px;
          max-height: none;
          overflow: visible;
          padding-right: 2px;
        }

        .promptGroup {
          display: grid;
          gap: 6px;
        }

        .promptGroupHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          border: 1px solid #d2e0f1;
          border-radius: 9px;
          background: #edf4ff;
          padding: 6px 8px;
        }

        .promptGroupHead strong {
          font-size: 11px;
          color: #274c78;
          letter-spacing: 0.02em;
        }

        .promptGroupHead span {
          font-size: 10px;
          font-weight: 700;
          color: #42658d;
          border: 1px solid #c4d8f0;
          border-radius: 999px;
          padding: 2px 6px;
          background: #ffffff;
        }

        .promptGroupList {
          display: grid;
          gap: 8px;
        }

        .promptCard {
          border: 1px solid #cfdced;
          border-radius: 10px;
          background: #ffffff;
          padding: 8px;
          display: grid;
          gap: 6px;
        }

        .promptCardHead {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }

        .promptCardHead strong {
          font-size: 12px;
          color: #1d365b;
          line-height: 1.25;
        }

        .promptCardHead label {
          font-size: 10px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #58779f;
          border: 1px solid #d7e3f2;
          border-radius: 999px;
          padding: 2px 6px;
          white-space: nowrap;
        }

        .promptCard p {
          margin: 0;
          font-size: 12px;
          line-height: 1.35;
          color: #304f77;
          white-space: pre-wrap;
        }

        .promptMetaRow {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .promptMetaRow span {
          font-size: 10px;
          color: #3d618c;
          border: 1px solid #d3e1f1;
          border-radius: 999px;
          padding: 2px 6px;
          background: #f3f8ff;
        }

        .learningGroup {
          display: grid;
          gap: 6px;
        }

        .learningTitle {
          margin: 0;
          font-size: 12px;
          font-weight: 700;
          color: #274c78;
          letter-spacing: 0.02em;
        }

        .learningList {
          margin: 0;
          padding-left: 16px;
          display: grid;
          gap: 4px;
          color: #355a84;
          font-size: 12px;
          line-height: 1.35;
        }

        .buttonRow {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .actionRow {
          display: grid;
          padding-bottom: 10px;
        }

        .primaryBtn,
        .ghostBtn {
          border-radius: 10px;
          border: 1px solid #b9cbe4;
          padding: 9px 12px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .primaryBtn {
          color: #f4f8ff;
          background: linear-gradient(125deg, #1d4f85 0%, #2a6ca7 100%);
          border-color: #204e82;
        }

        .ghostBtn {
          color: #204771;
          background: #ffffff;
        }

        .primaryBtn:hover:not(:disabled),
        .ghostBtn:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .primaryBtn:disabled,
        .ghostBtn:disabled,
        .editorTab:disabled {
          cursor: not-allowed;
          opacity: 0.6;
          transform: none;
        }

        .hiddenInput {
          display: none;
        }

        .thumbRow {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .thumbCard {
          display: grid;
          gap: 4px;
        }

        .thumbCard label {
          font-size: 12px;
          color: #496387;
        }

        .thumbWrap {
          border: 1px solid #ccdaeb;
          border-radius: 8px;
          background: #f0f6ff;
          aspect-ratio: 1 / 1;
          display: grid;
          place-items: center;
          overflow: hidden;
          color: #5b7394;
          font-size: 12px;
        }

        .thumbWrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .field {
          display: grid;
          gap: 4px;
        }

        .field label {
          font-size: 12px;
          color: #4f6789;
          font-weight: 600;
        }

        .rangeField {
          display: grid;
          gap: 4px;
        }

        .rangeField label {
          font-size: 12px;
          color: #3f5e87;
          font-weight: 600;
        }

        select,
        textarea,
        input[type='range'] {
          width: 100%;
          box-sizing: border-box;
        }

        select,
        textarea {
          border: 1px solid #c3d4ea;
          border-radius: 10px;
          padding: 9px;
          font-size: 13px;
          font-family: inherit;
          color: #173357;
          background: #ffffff;
        }

        textarea {
          min-height: 92px;
          resize: vertical;
        }

        .hint {
          margin: 0;
          font-size: 12px;
          color: #5d7394;
        }

        .hint.danger {
          color: #b03030;
        }

        .hint.mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }

        .toggleRow {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 13px;
          color: #27466f;
        }

        .toggleRow input {
          margin-top: 2px;
        }

        .modeRow {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .modeRow label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #26476f;
        }

        .customRectBoard {
          position: relative;
          border: 1px solid #c6d7ea;
          border-radius: 10px;
          overflow: hidden;
          background: #f2f7ff;
          min-height: 210px;
          touch-action: none;
        }

        .customRectBoard img {
          width: 100%;
          height: auto;
          max-height: 360px;
          display: block;
          object-fit: contain;
          user-select: none;
          pointer-events: none;
        }

        .rectOverlay {
          position: absolute;
          border: 2px solid #2f72a8;
          background: rgba(47, 114, 168, 0.15);
          border-radius: 8px;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.45) inset;
        }

        .rectOverlay.drawing {
          border-style: dashed;
        }

        .error {
          margin: 0;
          border: 1px solid #f2bbbb;
          background: #fff1f1;
          color: #9b1c1c;
          border-radius: 10px;
          padding: 8px 10px;
          font-size: 13px;
        }

        @media (max-width: 1080px) {
          .layout {
            grid-template-columns: minmax(0, 1fr);
            overflow: auto;
          }

          .previewPanel {
            min-height: 480px;
            height: auto;
          }

          .sceneCanvasStage {
            min-height: 460px;
          }

          .controlPanel {
            height: auto;
            max-height: 68vh;
            overflow-y: auto;
            padding-bottom: 24px;
          }

          .promptFilterGrid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
