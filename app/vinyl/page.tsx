'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CHECKOUT_DRAFT_KEY, type CheckoutDraft } from '../../lib/checkout';
import type { VinylParams } from '../../lib/types';

type PaletteItem = {
  key: VinylParams['palette'];
  label: string;
  bg: string;
};

const VINYL_LABEL_IMAGE_KEY = 'space_map_vinyl_label_image_v1';
const VINYL_BACKGROUND_IMAGE_KEY = 'space_map_vinyl_background_image_v1';

const PALETTES: PaletteItem[] = [
  // Popular + visually distinct first four for compact mode.
  { key: 'classic-black', label: 'Classic Black', bg: '#0b0b0d' },
  { key: 'cream-ink', label: 'Cream', bg: '#f3ecdc' },
  { key: 'emerald', label: 'Emerald', bg: '#0b3d2e' },
  { key: 'classic-burgundy', label: 'Classic Burgundy', bg: '#4d1f2a' },
  { key: 'navy-blue', label: 'Navy Blue', bg: '#0f1c42' },
  { key: 'midnight', label: 'Midnight', bg: '#0b1020' },
  { key: 'deep-navy', label: 'Deep Navy', bg: '#121b34' },
  { key: 'royal-blue', label: 'Royal Blue', bg: '#1f3f86' },
  { key: 'ocean-teal', label: 'Ocean Teal', bg: '#125f67' },
  { key: 'deep-teal', label: 'Deep Teal', bg: '#0f4f5a' },
  { key: 'dark-green', label: 'Dark Green', bg: '#132a1f' },
  { key: 'forest', label: 'Forest', bg: '#0e1f16' },
  { key: 'mustard-gold', label: 'Mustard Gold', bg: '#886820' },
  { key: 'night-gold', label: 'Night Gold', bg: '#24283a' },
  { key: 'burnt-orange', label: 'Burnt Orange', bg: '#8d4f1f' },
  { key: 'terracotta-red', label: 'Terracotta Red', bg: '#8f3c34' },
  { key: 'plum', label: 'Plum', bg: '#1c1230' },
  { key: 'storm-gray', label: 'Storm Gray', bg: '#2c3341' },
  { key: 'sand', label: 'Sand', bg: '#efe3cb' },
  { key: 'pearl', label: 'Pearl', bg: '#ececed' }
];
const PALETTE_KEYS = PALETTES.map((p) => p.key) as readonly VinylParams['palette'][];

const VINYL_SIZE_OPTIONS: { key: VinylParams['size']; label: string }[] = [
  { key: 'a4', label: '8x12\" (A4 21x29.7 cm)' },
  { key: '11x14', label: '11x14\" (27x35 cm)' },
  { key: 'a3', label: 'A3 (29.7x42 cm)' },
  { key: '12x12', label: '12x12\" (30x30 cm)' },
  { key: '12x16', label: '12x16\" (30x40 cm)' },
  { key: '16x20', label: '16x20\" (40x50 cm)' },
  { key: 'a2', label: 'A2 (42x59.4 cm)' },
  { key: '18x24', label: '18x24\" (45x60 cm)' },
  { key: '20x20', label: '20x20\" (50x50 cm)' },
  { key: '24x32', label: '24x32\" (60x80 cm)' }
];

const VINYL_SIZE_KEYS: readonly VinylParams['size'][] = [
  ...VINYL_SIZE_OPTIONS.map((s) => s.key),
  'square',
  'us-letter',
  'a1'
];

const LYRICS_FONT_OPTIONS: Array<{ key: VinylParams['lyricsFontPreset']; label: string }> = [
  { key: 'font-1', label: '1 - Cormorant Garamond Light' },
  { key: 'font-2', label: '2 - Cormorant Garamond Regular' },
  { key: 'font-3', label: '3 - Allura' },
  { key: 'font-4', label: '4 - Playfair Display Italic' },
  { key: 'font-5', label: '5 - Alex Brush' },
  { key: 'font-6', label: '6 - Cormorant Garamond Italic' },
  { key: 'font-7', label: '7 - Montserrat Bold' },
  { key: 'font-8', label: '8 - Great Vibes' },
  { key: 'font-9', label: '9 - Cormorant Garamond' },
  { key: 'font-10', label: '10 - Cinzel' },
  { key: 'font-11', label: '11 - Cinzel Bold' },
  { key: 'font-12', label: '12 - Playfair Display SC' },
  { key: 'font-13', label: '13 - Cormorant Garamond Light' },
  { key: 'font-14', label: '14 - Cormorant Garamond Regular' },
  { key: 'font-15', label: '15 - Cormorant Garamond Medium' }
];

const LYRICS_FONT_KEYS = LYRICS_FONT_OPTIONS.map((o) => o.key) as readonly VinylParams['lyricsFontPreset'][];

const LYRICS_FONT_PREVIEW_FAMILY: Record<VinylParams['lyricsFontPreset'], string> = {
  'font-1': "Prata, Georgia, 'Times New Roman', serif",
  'font-2': "Georgia, 'Times New Roman', serif",
  'font-3': "Allura, 'Great Vibes', cursive, serif",
  'font-4': "Georgia, 'Times New Roman', serif",
  'font-5': "'Great Vibes', Allura, cursive, serif",
  'font-6': "Prata, Georgia, 'Times New Roman', serif",
  'font-7': 'Signika, Arial, sans-serif',
  'font-8': "Allura, 'Great Vibes', cursive, serif",
  'font-9': 'Signika, Arial, sans-serif',
  'font-10': "Prata, Georgia, 'Times New Roman', serif",
  'font-11': 'Signika, Arial, sans-serif',
  'font-12': "Prata, Georgia, 'Times New Roman', serif",
  'font-13': "Georgia, 'Times New Roman', serif",
  'font-14': "Georgia, 'Times New Roman', serif",
  'font-15': 'Signika, Arial, sans-serif'
};

const LYRICS_TEXT_COLORS: Array<{ key: string; label: string }> = [
  { key: '#f2f2f4', label: 'Snow' },
  { key: '#111111', label: 'Jet Black' },
  { key: '#d7ae4f', label: 'Gold' },
  { key: '#1f376b', label: 'Navy' },
  { key: '#d6d8dc', label: 'Silver' },
  { key: '#ece4cf', label: 'Cream' },
  { key: '#0f6b5a', label: 'Emerald' },
  { key: '#6f2536', label: 'Burgundy' },
  { key: '#d07486', label: 'Rose' },
  { key: '#5f9ecf', label: 'Sky' },
  { key: '#5f4c92', label: 'Purple' },
  { key: '#b27148', label: 'Copper' }
];

const LYRICS_CASE_OPTIONS: Array<{ key: VinylParams['lyricsTextCase']; label: string }> = [
  { key: 'original', label: 'Original' },
  { key: 'upper', label: 'UPPERCASE' },
  { key: 'lower', label: 'lowercase' }
];

const LEGACY_VINYL_LYRICS_PLACEHOLDER =
  'Put your lyrics here. The text will wrap into multiple rings around the record. You can paste multiple lines and we will distribute them from outside to inside.';

const STAND_BY_ME_LYRICS = `Verse 1
When the night has come
And the land is dark
And the moon is the only light we'll see
No, I won't be afraid
Oh, I won't be afraid
Just as long as you stand, stand by me

Chorus
So darlin', darlin', stand by me
Oh, stand by me
Oh, stand, stand by me
Stand by me

Verse 2
If the sky that we look upon
Should tumble and fall
Or the mountains should crumble to the sea
I won't cry, I won't cry
No, I won't shed a tear
Just as long as you stand, stand by me

Chorus
Darlin', darlin', stand by me
Oh, stand by me
Oh, stand now
Stand by me, stand by me

Outro
Whenever you're in trouble, won't you stand by me?
Oh, stand by me
Oh, stand, stand by me
Stand by me`
;

const defaultVinyl: VinylParams = {
  size: '16x20',
  palette: 'classic-black',
  inkColor: '#e6e6ea',
  lyricsFontPreset: 'font-2',
  lyricsTextColor: '#f2f2f4',
  backgroundTexture: 'solid',
  recordImageDataUrl: '',
  labelImageDataUrl: '',
  backgroundImageDataUrl: '',
  diskDiameter: 13.7 * 72,
  ringCountMax: 9,
  ringFontSize: 14,
  ringLetterSpacing: 1.2,
  ringLineGap: 3,
  title: 'YOUR TITLE HERE',
  lyricsTextCase: 'original',
  songTitle: 'SONG TITLE',
  artist: 'ARTIST',
  outerText: STAND_BY_ME_LYRICS,
  names: '',
  dateLine: '',
  showDisk: true,
  showCenterLabel: true,
  showCenterGuides: false,
  titleFont: 'prata',
  titleFontSize: 40,
  titleArcCurvature: 0.8,
  titleArcWidth: 0.73,
  namesFont: 'jimmy-script',
  namesFontSize: 64,
  namesLetterSpacing: 0,
  namesLineSpacing: 1.2,
  namesYOffset: 0,
  dateFont: 'signika',
  dateFontSize: 18,
  dateLetterSpacing: 0,
  dateLineSpacing: 1.2,
  dateYOffset: 74,
  metaFont: 'signika',
  metaFontSize: 18
};

function parseNum(v: string | null, fallback: number): number {
  if (v === null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseEnum<T extends string>(v: string | null, allowed: readonly T[], fallback: T): T {
  if (!v) return fallback;
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

function parseBool(v: string | null, fallback: boolean): boolean {
  if (v === null) return fallback;
  if (v === '1' || v.toLowerCase() === 'true') return true;
  if (v === '0' || v.toLowerCase() === 'false') return false;
  return fallback;
}

function parseHexColor(v: string | null, fallback: string): string {
  if (!v) return fallback;
  const m = v.trim().match(/^#?([0-9a-fA-F]{6})$/);
  return m ? `#${m[1].toLowerCase()}` : fallback;
}

function decodeVinylFromQuery(search: string): Partial<VinylParams> {
  const sp = new URLSearchParams(search);
  const vs = sp.get('vs');
  const vp = sp.get('vp');
  const vtx = sp.get('vtx');
  const vlf = sp.get('vlf');
  const vlc = sp.get('vlc');
  const vlcs = sp.get('vlcs');
  const vdk = sp.get('vdk');
  const vcl = sp.get('vcl');
  const oldVinylLetterSpacing = parseNum(sp.get('vmls'), defaultVinyl.dateLetterSpacing);
  const oldVinylLineSpacing = parseNum(sp.get('vmlh'), defaultVinyl.dateLineSpacing);
  const oldVinylYOffset = parseNum(sp.get('vmy'), defaultVinyl.dateYOffset);
  const queryOuterText = (sp.get('vot') ?? '').trim();

  return {
    size: parseEnum(vs, VINYL_SIZE_KEYS, defaultVinyl.size),
    palette: parseEnum(vp, PALETTE_KEYS, defaultVinyl.palette),
    inkColor: sp.get('vic') ?? defaultVinyl.inkColor,
    lyricsFontPreset: parseEnum(vlf, LYRICS_FONT_KEYS, defaultVinyl.lyricsFontPreset),
    lyricsTextColor: parseHexColor(vlc, defaultVinyl.lyricsTextColor),
    lyricsTextCase: parseEnum(vlcs, ['original', 'upper', 'lower'] as const, defaultVinyl.lyricsTextCase),
    backgroundTexture: parseEnum(
      vtx,
      ['solid', 'paper', 'marble', 'noise'] as const,
      defaultVinyl.backgroundTexture
    ),
    diskDiameter: parseNum(sp.get('vdd'), defaultVinyl.diskDiameter),
    ringCountMax: parseNum(sp.get('vrc'), defaultVinyl.ringCountMax),
    ringFontSize: parseNum(sp.get('vrfs'), defaultVinyl.ringFontSize),
    ringLetterSpacing: parseNum(sp.get('vrls'), defaultVinyl.ringLetterSpacing),
    ringLineGap: parseNum(sp.get('vrlg'), defaultVinyl.ringLineGap),
    title: sp.get('vt') ?? defaultVinyl.title,
    songTitle: sp.get('vst') ?? defaultVinyl.songTitle,
    artist: sp.get('var') ?? defaultVinyl.artist,
    outerText:
      !queryOuterText || queryOuterText === LEGACY_VINYL_LYRICS_PLACEHOLDER
        ? defaultVinyl.outerText
        : queryOuterText,
    names: sp.get('vn') ?? defaultVinyl.names,
    dateLine: sp.get('vdl') ?? defaultVinyl.dateLine,
    showDisk: parseBool(vdk, defaultVinyl.showDisk),
    showCenterLabel: parseBool(vcl, defaultVinyl.showCenterLabel),
    showCenterGuides: false,
    titleFont: parseEnum(sp.get('vtf'), ['serif', 'sans', 'mono', 'prata'] as const, defaultVinyl.titleFont),
    titleFontSize: parseNum(sp.get('vtfs'), defaultVinyl.titleFontSize),
    titleArcCurvature: parseNum(sp.get('vtac'), defaultVinyl.titleArcCurvature),
    titleArcWidth: parseNum(sp.get('vtaw'), defaultVinyl.titleArcWidth),
    namesFont: parseEnum(
      sp.get('vnf'),
      ['serif', 'sans', 'cursive', 'jimmy-script'] as const,
      defaultVinyl.namesFont
    ),
    namesFontSize: parseNum(sp.get('vnfs'), defaultVinyl.namesFontSize),
    namesLetterSpacing: parseNum(sp.get('vnsls'), defaultVinyl.namesLetterSpacing),
    namesLineSpacing: parseNum(sp.get('vnslh'), defaultVinyl.namesLineSpacing),
    namesYOffset: parseNum(sp.get('vnsy'), defaultVinyl.namesYOffset),
    dateFont: parseEnum(sp.get('vdf'), ['sans', 'serif', 'mono', 'signika'] as const, defaultVinyl.dateFont),
    dateFontSize: parseNum(sp.get('vdfs'), defaultVinyl.dateFontSize),
    dateLetterSpacing: parseNum(sp.get('vdls'), oldVinylLetterSpacing),
    dateLineSpacing: parseNum(sp.get('vdlh'), oldVinylLineSpacing),
    dateYOffset: parseNum(sp.get('vdy'), oldVinylYOffset),
    metaFont: parseEnum(sp.get('vmf'), ['sans', 'serif', 'mono', 'signika'] as const, defaultVinyl.metaFont),
    metaFontSize: parseNum(sp.get('vmfs'), defaultVinyl.metaFontSize)
  };
}

function encodeVinylToQuery(v: VinylParams): string {
  const sp = new URLSearchParams();
  sp.set('view', 'vinyl');
  sp.set('vs', v.size);
  sp.set('vp', v.palette);
  sp.set('vic', v.inkColor);
  sp.set('vlf', v.lyricsFontPreset);
  sp.set('vlc', v.lyricsTextColor);
  sp.set('vlcs', v.lyricsTextCase);
  sp.set('vtx', v.backgroundTexture);
  sp.set('vdd', String(v.diskDiameter));
  sp.set('vrc', String(v.ringCountMax));
  sp.set('vrfs', String(v.ringFontSize));
  sp.set('vrls', String(v.ringLetterSpacing));
  sp.set('vrlg', String(v.ringLineGap));
  sp.set('vt', v.title);
  sp.set('vst', v.songTitle);
  sp.set('var', v.artist);
  if (v.outerText.length <= 1200) sp.set('vot', v.outerText);
  sp.set('vn', v.names);
  sp.set('vdl', v.dateLine);
  sp.set('vdk', v.showDisk ? '1' : '0');
  sp.set('vcl', v.showCenterLabel ? '1' : '0');
  sp.set('vtf', v.titleFont);
  sp.set('vtfs', String(v.titleFontSize));
  sp.set('vtac', String(v.titleArcCurvature));
  sp.set('vtaw', String(v.titleArcWidth));
  sp.set('vnf', v.namesFont);
  sp.set('vnfs', String(v.namesFontSize));
  sp.set('vnsls', String(v.namesLetterSpacing));
  sp.set('vnslh', String(v.namesLineSpacing));
  sp.set('vnsy', String(v.namesYOffset));
  sp.set('vdf', v.dateFont);
  sp.set('vdfs', String(v.dateFontSize));
  sp.set('vdls', String(v.dateLetterSpacing));
  sp.set('vdlh', String(v.dateLineSpacing));
  sp.set('vdy', String(v.dateYOffset));
  sp.set('vmf', v.metaFont);
  sp.set('vmfs', String(v.metaFontSize));
  return sp.toString();
}

async function downscaleImageToDataUrl(file: File, maxSize: number): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = url;
    });

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const scale = Math.min(1, maxSize / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');

    ctx.drawImage(img, 0, 0, cw, ch);
    return canvas.toDataURL('image/jpeg', 0.9);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function VinylPage() {
  const router = useRouter();
  const [vinyl, setVinyl] = useState<VinylParams>(defaultVinyl);
  const [vinylSvg, setVinylSvg] = useState('');
  const [error, setError] = useState('');
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [showAllBackgroundColors, setShowAllBackgroundColors] = useState(false);
  const [showAllLyricsFonts, setShowAllLyricsFonts] = useState(false);
  const [showAllLyricsColors, setShowAllLyricsColors] = useState(false);

  const backgroundInputRef = useRef<HTMLInputElement | null>(null);
  const labelInputRef = useRef<HTMLInputElement | null>(null);
  const hasInitializedRef = useRef(false);

  const visiblePalettes = useMemo(() => {
    if (showAllBackgroundColors) return PALETTES;
    const firstFour = PALETTES.slice(0, 4);
    if (firstFour.some((x) => x.key === vinyl.palette)) return firstFour;
    const selected = PALETTES.find((x) => x.key === vinyl.palette);
    return selected ? [firstFour[0], firstFour[1], firstFour[2], selected] : firstFour;
  }, [showAllBackgroundColors, vinyl.palette]);

  const visibleLyricsFontOptions = useMemo(() => {
    if (showAllLyricsFonts) return LYRICS_FONT_OPTIONS;
    const firstFour = LYRICS_FONT_OPTIONS.slice(0, 4);
    if (firstFour.some((x) => x.key === vinyl.lyricsFontPreset)) return firstFour;
    const selected = LYRICS_FONT_OPTIONS.find((x) => x.key === vinyl.lyricsFontPreset);
    return selected ? [firstFour[0], firstFour[1], firstFour[2], selected] : firstFour;
  }, [showAllLyricsFonts, vinyl.lyricsFontPreset]);

  const visibleLyricsColors = useMemo(() => {
    if (showAllLyricsColors) return LYRICS_TEXT_COLORS;
    const firstFour = LYRICS_TEXT_COLORS.slice(0, 4);
    if (firstFour.some((x) => x.key === vinyl.lyricsTextColor)) return firstFour;
    const selected = LYRICS_TEXT_COLORS.find((x) => x.key === vinyl.lyricsTextColor);
    return selected ? [firstFour[0], firstFour[1], firstFour[2], selected] : firstFour;
  }, [showAllLyricsColors, vinyl.lyricsTextColor]);

  const activeLyricsFontLabel = useMemo(() => {
    return LYRICS_FONT_OPTIONS.find((x) => x.key === vinyl.lyricsFontPreset)?.label ?? '1 - Cormorant Garamond Light';
  }, [vinyl.lyricsFontPreset]);

  const previewBg = useMemo(() => {
    return `radial-gradient(1200px 700px at 10% -10%, #ffffff 0%, #eff3f9 32%, #dde4ef 100%)`;
  }, []);

  const fetchVinylSvg = useCallback(async (reqVinyl: VinylParams): Promise<string> => {
    const res = await fetch('/api/vinyl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vinyl: reqVinyl })
    });
    if (!res.ok) throw new Error((await res.text()) || 'Vinyl generation failed');
    return res.text();
  }, []);

  const generateVinyl = useCallback(
    async (reqVinyl: VinylParams, syncUrl = true) => {
      setError('');
      try {
        const svg = await fetchVinylSvg(reqVinyl);
        setVinylSvg(svg);

        if (syncUrl && typeof window !== 'undefined') {
          const qs = encodeVinylToQuery(reqVinyl);
          const nextPath = `${window.location.pathname}?${qs}`;
          window.history.replaceState(null, '', nextPath);
        }
      } catch (e: any) {
        setError(e?.message ?? String(e));
      }
    },
    [fetchVinylSvg]
  );

  const persistCheckoutDraft = useCallback((draftRaw: string): boolean => {
    if (typeof window === 'undefined') return false;
    const storages = [window.localStorage, window.sessionStorage];
    for (const storage of storages) {
      try {
        storage.removeItem(CHECKOUT_DRAFT_KEY);
      } catch {
        // ignore cleanup errors
      }
    }
    for (const storage of storages) {
      try {
        storage.setItem(CHECKOUT_DRAFT_KEY, draftRaw);
        return true;
      } catch {
        // try next storage
      }
    }
    return false;
  }, []);

  const handleCheckout = useCallback(async () => {
    if (checkoutBusy) return;
    setCheckoutBusy(true);
    setError('');
    try {
      const svg = await fetchVinylSvg(vinyl);
      setVinylSvg(svg);
      if (!svg.trim().startsWith('<')) {
        throw new Error('Preview is not ready yet. Please try again.');
      }

      const draft: CheckoutDraft = {
        createdAtIso: new Date().toISOString(),
        productType: 'vinyl',
        previewSvg: svg,
        renderRequest: {
          vinyl: {
            ...vinyl,
            recordImageDataUrl: ''
          }
        },
        mapData: {
          city: 'Vinyl Studio',
          title: vinyl.title || 'Vinyl Poster',
          names: vinyl.names || vinyl.artist || '',
          font: vinyl.titleFont,
          palette: vinyl.palette,
          inkColor: vinyl.inkColor,
          size: vinyl.size,
          frameOn: false,
          lat: 0,
          lon: 0,
          locationLine: vinyl.dateLine || '',
          date: vinyl.dateLine || '',
          time: '',
          showConstellations: false,
          showStarNames: false,
          showConstellationNames: false,
          showPlanetNames: false,
          showGraticule: false,
          showTime: false
        }
      };

      const draftRaw = JSON.stringify(draft);
      if (!persistCheckoutDraft(draftRaw)) {
        throw new Error('Browser storage is full. Please clear site data and try again.');
      }
      router.push('/checkout');
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setCheckoutBusy(false);
    }
  }, [checkoutBusy, fetchVinylSvg, persistCheckoutDraft, router, vinyl]);

  const onLabelFile = useCallback(async (file?: File) => {
    if (!file) return;
    try {
      const dataUrl = await downscaleImageToDataUrl(file, 1200);
      setVinyl((v) => ({ ...v, labelImageDataUrl: dataUrl }));
      window.localStorage.setItem(VINYL_LABEL_IMAGE_KEY, dataUrl);
    } catch (e: any) {
      setError(e?.message ?? 'Label image upload failed.');
    }
  }, []);

  const onBackgroundFile = useCallback(async (file?: File) => {
    if (!file) return;
    try {
      const dataUrl = await downscaleImageToDataUrl(file, 2000);
      setVinyl((v) => ({ ...v, backgroundImageDataUrl: dataUrl }));
      window.localStorage.setItem(VINYL_BACKGROUND_IMAGE_KEY, dataUrl);
    } catch (e: any) {
      setError(e?.message ?? 'Background image upload failed.');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const queryVinyl = decodeVinylFromQuery(window.location.search);
    const savedLabel = window.localStorage.getItem(VINYL_LABEL_IMAGE_KEY) || '';
    const savedBackground = window.localStorage.getItem(VINYL_BACKGROUND_IMAGE_KEY) || '';

    const next: VinylParams = {
      ...defaultVinyl,
      ...queryVinyl,
      recordImageDataUrl: '',
      labelImageDataUrl: savedLabel,
      backgroundImageDataUrl: savedBackground
    };

    setVinyl(next);
    hasInitializedRef.current = true;
  }, [generateVinyl]);

  useEffect(() => {
    if (!hasInitializedRef.current) return;
    const timer = window.setTimeout(() => {
      void generateVinyl(vinyl, true);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [vinyl, generateVinyl]);

  return (
    <div className="designRoot">
      <header className="topbar">
        <div className="brand">
          <div className="brandMark vinylLogo" aria-hidden="true">
            <span className="vinylLogoCore" />
            <span className="vinylLogoHole" />
          </div>
          <div className="brandTitle">VINYL STUDIO</div>
        </div>

        <nav className="menu">
          <a href="/ourskymap">Sky Map</a>
          <a href="/playground?view=vinyl">Playground</a>
          <a href="/citymap">City Map</a>
        </nav>

        <button type="button" className="cityMapCta cityMapCtaBtn" onClick={() => void handleCheckout()} disabled={checkoutBusy}>
          {checkoutBusy ? 'Preparing...' : 'Checkout'}
        </button>
      </header>

      <main className="layout">
        <section className="previewPanel" style={{ background: previewBg }}>
          <div className="paper">
            {vinylSvg ? (
              <div className="svgMount" dangerouslySetInnerHTML={{ __html: vinylSvg }} />
            ) : (
              <div className="emptyState">Rendering vinyl preview...</div>
            )}
          </div>
        </section>

        <aside className="rightPanel">
          <div className="panelBlock sizeFrameBlock">
            <div className="cardTitleWrap">
              <p className="cardEyebrow">Setup</p>
              <h3 className="cardTitle">Canvas & Background</h3>
              <p className="cardSupport">Configure size, background and optional images.</p>
            </div>

            <div className="stackField frameSection">
              <label className="sizeCardLabel">Size</label>
              <select
                className="dashedInput"
                value={vinyl.size}
                onChange={(e) => {
                  setVinyl((v) => ({ ...v, size: e.target.value as VinylParams['size'] }));
                }}
              >
                {VINYL_SIZE_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="surfaceOptionHead">Poster Style</div>
              <div className="surfaceOptionRow">
                <button
                  type="button"
                  className={`surfaceToggleBtn ${!vinyl.showDisk ? 'active' : ''}`}
                  onClick={() => setVinyl((v) => ({ ...v, showDisk: !v.showDisk }))}
                >
                  No Disk
                </button>
                <button
                  type="button"
                  className={`surfaceToggleBtn ${!vinyl.showCenterLabel ? 'active' : ''}`}
                  onClick={() => setVinyl((v) => ({ ...v, showCenterLabel: !v.showCenterLabel }))}
                >
                  No Label
                </button>
              </div>
            </div>

            <div className="stackField frameSection">
              <div className="fieldHead">
                <label className="sizeCardLabel">Background Color</label>
                <div className="paletteHead">
                  <button
                    type="button"
                    className="exploreBtn"
                    onClick={() => setShowAllBackgroundColors((prev) => !prev)}
                  >
                    <span className="exploreDots" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                      <i />
                    </span>
                    {showAllBackgroundColors ? 'Compact' : 'Explore'}
                  </button>
                </div>
              </div>
              <div className="palettePickerWrap">
                <div className={`palettePicker ${showAllBackgroundColors ? 'expanded' : 'compact'}`}>
                  {visiblePalettes.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={`paletteBtn ${vinyl.palette === item.key ? 'active' : ''}`}
                      onClick={() => {
                        setVinyl((v) => ({ ...v, palette: item.key }));
                      }}
                      title={item.label}
                    >
                      <span className="swatch" style={{ background: item.bg }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="stackField frameSection">
              <label className="sizeCardLabel">Background Image (optional)</label>
              <input
                ref={backgroundInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="uploadInputHidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  void onBackgroundFile(file);
                  e.currentTarget.value = '';
                }}
              />

              <div className="uploadActions">
                <button type="button" className="uploadBtn" onClick={() => backgroundInputRef.current?.click()}>
                  {vinyl.backgroundImageDataUrl ? 'Replace Background' : 'Upload Background'}
                </button>
                {vinyl.backgroundImageDataUrl ? (
                  <button
                    type="button"
                    className="uploadGhostBtn"
                    onClick={() => {
                      setVinyl((v) => ({ ...v, backgroundImageDataUrl: '' }));
                      window.localStorage.removeItem(VINYL_BACKGROUND_IMAGE_KEY);
                    }}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>

            <div className="stackField frameSection">
              <label className="sizeCardLabel">Center Label Image (optional)</label>
              <input
                ref={labelInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="uploadInputHidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  void onLabelFile(file);
                  e.currentTarget.value = '';
                }}
              />

              <div className="uploadActions">
                <button type="button" className="uploadBtn" onClick={() => labelInputRef.current?.click()}>
                  {vinyl.labelImageDataUrl ? 'Replace Label' : 'Upload Label'}
                </button>
                {vinyl.labelImageDataUrl ? (
                  <button
                    type="button"
                    className="uploadGhostBtn"
                    onClick={() => {
                      setVinyl((v) => ({ ...v, labelImageDataUrl: '' }));
                      window.localStorage.removeItem(VINYL_LABEL_IMAGE_KEY);
                    }}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="panelBlock softB contentCard">
            <div className="cardTitleWrap">
              <p className="cardEyebrow">Typography</p>
              <h3 className="cardTitle">Label Text Settings</h3>
              <p className="cardSupport">Title, song, artist, names and date line in one card.</p>
            </div>

            <div className="contentGrid">
              <div className="stackField">
                <label>Title</label>
                <input value={vinyl.title} onChange={(e) => setVinyl((v) => ({ ...v, title: e.target.value }))} />
              </div>

              <div className="stackField twoCol">
                <div className="stackField">
                  <label>Song</label>
                  <input
                    value={vinyl.songTitle}
                    onChange={(e) => setVinyl((v) => ({ ...v, songTitle: e.target.value }))}
                  />
                </div>

                <div className="stackField">
                  <label>Artist</label>
                  <input value={vinyl.artist} onChange={(e) => setVinyl((v) => ({ ...v, artist: e.target.value }))} />
                </div>
              </div>

              <div className="compactMetaGrid">
                <div className="stackField">
                  <label>Names</label>
                  <textarea
                    className="compactTextarea"
                    rows={2}
                    value={vinyl.names}
                    onChange={(e) => setVinyl((v) => ({ ...v, names: e.target.value }))}
                  />
                </div>

                <div className="stackField">
                  <label>Date Line</label>
                  <textarea
                    className="compactTextarea"
                    rows={2}
                    value={vinyl.dateLine}
                    onChange={(e) => setVinyl((v) => ({ ...v, dateLine: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="signatureControlShell">
              <div className="fieldHead">
                <label>Title, Names & Date Typography</label>
              </div>
              <div className="ringControlGrid">
                <div className="stackField controlTile">
                  <label>Title Font</label>
                  <select
                    value={vinyl.titleFont}
                    onChange={(e) =>
                      setVinyl((v) => ({ ...v, titleFont: e.target.value as VinylParams['titleFont'] }))
                    }
                  >
                    <option value="prata">Prata</option>
                    <option value="serif">Serif</option>
                    <option value="sans">Sans</option>
                    <option value="mono">Mono</option>
                  </select>
                </div>

                <div className="stackField controlTile">
                  <label>Title Size</label>
                  <div className="spinbox">
                    <input
                      className="spinboxInput"
                      type="number"
                      min={8}
                      max={84}
                      step={1}
                      value={Math.round(vinyl.titleFontSize)}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (!Number.isFinite(n)) return;
                        setVinyl((v) => ({ ...v, titleFontSize: Math.max(8, Math.min(84, Math.round(n))) }));
                      }}
                    />
                    <div className="spinboxButtons">
                      <button
                        type="button"
                        className="spinboxBtn"
                        onClick={() =>
                          setVinyl((v) => ({ ...v, titleFontSize: Math.max(8, Math.min(84, Math.round(v.titleFontSize) + 1)) }))
                        }
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="spinboxBtn"
                        onClick={() =>
                          setVinyl((v) => ({ ...v, titleFontSize: Math.max(8, Math.min(84, Math.round(v.titleFontSize) - 1)) }))
                        }
                      >
                        -
                      </button>
                    </div>
                  </div>
                </div>

                <div className="stackField controlTile">
                  <label>Names Font</label>
                  <select
                    value={vinyl.namesFont}
                    onChange={(e) =>
                      setVinyl((v) => ({ ...v, namesFont: e.target.value as VinylParams['namesFont'] }))
                    }
                  >
                    <option value="jimmy-script">Jimmy Script</option>
                    <option value="cursive">Cursive</option>
                    <option value="serif">Serif</option>
                    <option value="sans">Sans</option>
                  </select>
                </div>

                <div className="stackField controlTile">
                  <label>Names Size</label>
                  <div className="spinbox">
                    <input
                      className="spinboxInput"
                      type="number"
                      min={18}
                      max={96}
                      step={1}
                      value={Math.round(vinyl.namesFontSize)}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (!Number.isFinite(n)) return;
                        setVinyl((v) => ({ ...v, namesFontSize: Math.max(18, Math.min(96, Math.round(n))) }));
                      }}
                    />
                    <div className="spinboxButtons">
                      <button
                        type="button"
                        className="spinboxBtn"
                        onClick={() =>
                          setVinyl((v) => ({ ...v, namesFontSize: Math.max(18, Math.min(96, Math.round(v.namesFontSize) + 1)) }))
                        }
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="spinboxBtn"
                        onClick={() =>
                          setVinyl((v) => ({ ...v, namesFontSize: Math.max(18, Math.min(96, Math.round(v.namesFontSize) - 1)) }))
                        }
                      >
                        -
                      </button>
                    </div>
                  </div>
                </div>

                <div className="stackField controlTile">
                  <label>Date Font</label>
                  <select
                    value={vinyl.dateFont}
                    onChange={(e) =>
                      setVinyl((v) => ({ ...v, dateFont: e.target.value as VinylParams['dateFont'] }))
                    }
                  >
                    <option value="signika">Signika</option>
                    <option value="sans">Sans</option>
                    <option value="serif">Serif</option>
                    <option value="mono">Mono</option>
                  </select>
                </div>

                <div className="stackField controlTile">
                  <label>Date Size</label>
                  <div className="spinbox">
                    <input
                      className="spinboxInput"
                      type="number"
                      min={10}
                      max={42}
                      step={1}
                      value={Math.round(vinyl.dateFontSize)}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (!Number.isFinite(n)) return;
                        setVinyl((v) => ({ ...v, dateFontSize: Math.max(10, Math.min(42, Math.round(n))) }));
                      }}
                    />
                    <div className="spinboxButtons">
                      <button
                        type="button"
                        className="spinboxBtn"
                        onClick={() =>
                          setVinyl((v) => ({ ...v, dateFontSize: Math.max(10, Math.min(42, Math.round(v.dateFontSize) + 1)) }))
                        }
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="spinboxBtn"
                        onClick={() =>
                          setVinyl((v) => ({ ...v, dateFontSize: Math.max(10, Math.min(42, Math.round(v.dateFontSize) - 1)) }))
                        }
                      >
                        -
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="panelBlock softD lyricsCard">
            <div className="cardTitleWrap">
              <p className="cardEyebrow">Typography</p>
              <h3 className="cardTitle">Lyrics Settings</h3>
              <p className="cardSupport">Select style first, then tune how lyrics flow on the disk.</p>
            </div>

            <div className="lyricsSection">
              <div className="fieldHead">
                <label>Lyrics Text</label>
              </div>
              <textarea
                className="lyricsEditor"
                rows={8}
                value={vinyl.outerText}
                onChange={(e) => setVinyl((v) => ({ ...v, outerText: e.target.value }))}
              />
            </div>

            <div className="lyricsQuickSummary">
              <div className="summaryPill">
                <span className="summaryKey">Font</span>
                <span className="summaryVal">{activeLyricsFontLabel}</span>
              </div>
            </div>

            <div className="lyricsSection">
              <div className="fieldHead">
                <label>Lyrics Font</label>
                <button
                  type="button"
                  className="exploreBtn"
                  onClick={() => setShowAllLyricsFonts((prev) => !prev)}
                >
                  <span className="exploreDots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  {showAllLyricsFonts ? 'Compact' : 'Explore'}
                </button>
              </div>
              <div className="lyricsCaseRow" role="group" aria-label="Lyrics letter case">
                {LYRICS_CASE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`lyricsCaseBtn ${vinyl.lyricsTextCase === opt.key ? 'active' : ''}`}
                    onClick={() => setVinyl((v) => ({ ...v, lyricsTextCase: opt.key }))}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="fontOptionGrid">
                {visibleLyricsFontOptions.map((opt) => {
                  const active = vinyl.lyricsFontPreset === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      className={`fontOptionBtn${active ? ' active' : ''}`}
                      onClick={() => setVinyl((v) => ({ ...v, lyricsFontPreset: opt.key }))}
                    >
                      <span className="fontGlyph" style={{ fontFamily: LYRICS_FONT_PREVIEW_FAMILY[opt.key] }}>
                        Aa
                      </span>
                      <span className="fontOptionLabel">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lyricsSection">
              <div className="fieldHead">
                <label>Text Color</label>
                <button
                  type="button"
                  className="exploreBtn"
                  onClick={() => setShowAllLyricsColors((prev) => !prev)}
                >
                  <span className="exploreDots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  {showAllLyricsColors ? 'Compact' : 'Explore'}
                </button>
              </div>
              <div className={`palettePicker ${showAllLyricsColors ? 'lyricsExpanded' : 'compact'}`}>
                {visibleLyricsColors.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`paletteBtn ${vinyl.lyricsTextColor === item.key ? 'active' : ''}`}
                    onClick={() => setVinyl((v) => ({ ...v, lyricsTextColor: item.key }))}
                    title={item.label}
                  >
                    <span className="swatch" style={{ background: item.key }} />
                  </button>
                ))}
              </div>
            </div>

            <div className="ringControlShell">
              <div className="ringControlGrid">
                <div className="stackField controlTile ringCountTile">
                  <label>Ring Count</label>
                  <div className="spinbox">
                    <input
                      className="spinboxInput"
                      type="number"
                      min={1}
                      step={1}
                      value={Math.max(1, Math.round(vinyl.ringCountMax))}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (!Number.isFinite(n)) return;
                        setVinyl((v) => ({ ...v, ringCountMax: Math.max(1, Math.round(n)) }));
                      }}
                    />
                    <div className="spinboxButtons">
                      <button
                        type="button"
                        className="spinboxBtn"
                        onClick={() =>
                          setVinyl((v) => ({
                            ...v,
                            ringCountMax: Math.max(1, Math.round(v.ringCountMax) + 1)
                          }))
                        }
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="spinboxBtn"
                        onClick={() =>
                          setVinyl((v) => ({
                            ...v,
                            ringCountMax: Math.max(1, Math.round(v.ringCountMax) - 1)
                          }))
                        }
                      >
                        -
                      </button>
                    </div>
                  </div>
                </div>

                <div className="stackField controlTile">
                  <label>Ring Font Size</label>
                  <div className="spinbox">
                    <input
                      className="spinboxInput"
                      type="number"
                      min={10}
                      max={34}
                      step={1}
                      value={Math.round(vinyl.ringFontSize)}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (!Number.isFinite(n)) return;
                        setVinyl((v) => ({ ...v, ringFontSize: Math.max(10, Math.min(34, Math.round(n))) }));
                      }}
                    />
                    <div className="spinboxButtons">
                      <button
                        type="button"
                        className="spinboxBtn"
                        onClick={() =>
                          setVinyl((v) => ({ ...v, ringFontSize: Math.max(10, Math.min(34, Math.round(v.ringFontSize) + 1)) }))
                        }
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="spinboxBtn"
                        onClick={() =>
                          setVinyl((v) => ({ ...v, ringFontSize: Math.max(10, Math.min(34, Math.round(v.ringFontSize) - 1)) }))
                        }
                      >
                        -
                      </button>
                    </div>
                  </div>
                </div>

                <div className="stackField controlTile">
                  <label>Ring Letter Spacing</label>
                  <div className="spinbox">
                    <input
                      className="spinboxInput"
                      type="number"
                      min={-2}
                      max={20}
                      step={0.1}
                      value={Number(vinyl.ringLetterSpacing.toFixed(1))}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (!Number.isFinite(n)) return;
                        setVinyl((v) => ({
                          ...v,
                          ringLetterSpacing: Math.max(-2, Math.min(20, Math.round(n * 10) / 10))
                        }));
                      }}
                    />
                    <div className="spinboxButtons">
                      <button
                        type="button"
                        className="spinboxBtn"
                        onClick={() =>
                          setVinyl((v) => ({
                            ...v,
                            ringLetterSpacing: Math.max(-2, Math.min(20, Math.round((v.ringLetterSpacing + 0.1) * 10) / 10))
                          }))
                        }
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="spinboxBtn"
                        onClick={() =>
                          setVinyl((v) => ({
                            ...v,
                            ringLetterSpacing: Math.max(-2, Math.min(20, Math.round((v.ringLetterSpacing - 0.1) * 10) / 10))
                          }))
                        }
                      >
                        -
                      </button>
                    </div>
                  </div>
                </div>

                <div className="stackField controlTile">
                  <label>Ring Line Gap</label>
                  <div className="spinbox">
                    <input
                      className="spinboxInput"
                      type="number"
                      min={0}
                      max={16}
                      step={1}
                      value={Math.round(vinyl.ringLineGap)}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (!Number.isFinite(n)) return;
                        setVinyl((v) => ({ ...v, ringLineGap: Math.max(0, Math.min(16, Math.round(n))) }));
                      }}
                    />
                    <div className="spinboxButtons">
                      <button
                        type="button"
                        className="spinboxBtn"
                        onClick={() =>
                          setVinyl((v) => ({ ...v, ringLineGap: Math.max(0, Math.min(16, Math.round(v.ringLineGap) + 1)) }))
                        }
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="spinboxBtn"
                        onClick={() =>
                          setVinyl((v) => ({ ...v, ringLineGap: Math.max(0, Math.min(16, Math.round(v.ringLineGap) - 1)) }))
                        }
                      >
                        -
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="panelBlock softC">
            <button type="button" className="checkoutBtn" onClick={() => void handleCheckout()} disabled={checkoutBusy}>
              {checkoutBusy ? 'Preparing...' : 'Checkout'}
            </button>

            {error ? <p className="error">{error}</p> : null}
          </div>
        </aside>
      </main>

      <style jsx>{`
        .designRoot :global(*),
        .designRoot :global(*::before),
        .designRoot :global(*::after) {
          box-sizing: border-box;
        }

        .designRoot {
          height: 100dvh;
          background: #dfe3ea;
          color: #121317;
          overflow: hidden;
        }

        .topbar {
          height: 84px;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          background: linear-gradient(90deg, #0f172a 0%, #13203f 52%, #1b2a4d 100%);
          color: #fff;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          padding: 0 24px;
          overflow: hidden;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          justify-self: start;
        }

        .brandMark {
          width: 44px;
          height: 44px;
          border: 2px solid rgba(255, 255, 255, 0.82);
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.06);
          position: relative;
          display: grid;
          place-items: center;
        }

        .vinylLogo {
          background: radial-gradient(circle at 36% 30%, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.02) 40%),
            #0a0b10;
        }

        .vinylLogo::before {
          content: '';
          position: absolute;
          inset: 5px;
          border-radius: 50%;
          border: 1.2px solid rgba(255, 255, 255, 0.16);
          box-shadow:
            inset 0 0 0 4px rgba(255, 255, 255, 0.03),
            inset 0 0 0 9px rgba(255, 255, 255, 0.03);
        }

        .vinylLogoCore {
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background: #c79f56;
          border: 1px solid rgba(255, 255, 255, 0.55);
          position: relative;
          z-index: 1;
        }

        .vinylLogoHole {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #0d111b;
          border: 1px solid rgba(255, 255, 255, 0.55);
          position: absolute;
          z-index: 2;
        }

        .brandTitle {
          font-size: 15px;
          letter-spacing: 0.2em;
          line-height: 1;
          font-weight: 700;
          font-family: 'Signika', ui-sans-serif, system-ui;
          white-space: nowrap;
        }

        .menu {
          display: flex;
          align-items: center;
          justify-self: center;
          gap: 22px;
        }

        .menu a {
          color: rgba(255, 255, 255, 0.84);
          text-decoration: none;
          font-size: 15px;
          letter-spacing: 0.01em;
        }

        .cityMapCta {
          display: inline-flex;
          align-items: center;
          justify-self: end;
          text-align: left;
          color: rgba(255, 255, 255, 0.92);
          text-decoration: none;
          font-size: 15px;
          letter-spacing: 0.01em;
          white-space: nowrap;
        }

        .cityMapCtaBtn {
          border: 0;
          background: transparent;
          cursor: pointer;
        }

        .cityMapCtaBtn:disabled {
          opacity: 0.75;
          cursor: wait;
        }

        .layout {
          height: calc(100dvh - 84px);
          margin-top: 84px;
          display: grid;
          grid-template-columns: minmax(520px, 1fr) 430px;
          overflow: hidden;
        }

        .previewPanel {
          display: grid;
          place-items: center;
          padding: 28px;
          min-width: 0;
          min-height: 0;
          overflow: hidden;
        }

        .paper {
          width: min(100%, 980px);
          height: 100%;
          max-height: 100%;
          min-height: 0;
          display: grid;
          place-items: center;
          border-radius: 24px;
          border: 1px solid rgba(209, 216, 226, 0.9);
          background: rgba(255, 255, 255, 0.78);
          box-shadow: 0 24px 80px rgba(10, 17, 32, 0.14);
          padding: clamp(12px, 2vw, 28px);
          overflow: hidden;
        }

        .emptyState {
          color: #6b7280;
          font-size: 14px;
        }

        .svgMount {
          width: 100%;
          height: 100%;
          min-height: 0;
          display: grid;
          place-items: center;
          overflow: hidden;
        }

        .svgMount :global(svg) {
          width: 100%;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
          display: block;
          filter: drop-shadow(0 18px 36px rgba(15, 20, 28, 0.24));
        }

        .rightPanel {
          padding: 28px;
          background: linear-gradient(180deg, #e7ebf1 0%, #dee3ea 100%);
          border-left: 1px solid #cfd6e2;
          display: grid;
          align-content: start;
          gap: 16px;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .panelBlock {
          background: #f7f9fc;
          border: 1px solid #d3dce8;
          border-radius: 16px;
          padding: 16px;
          display: grid;
          gap: 14px;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.07);
        }

        .panelBlock.sizeFrameBlock {
          background: linear-gradient(180deg, #f7f4fc 0%, #f1ecf8 100%);
          border-color: #d8cde9;
          box-shadow: 0 14px 30px rgba(70, 42, 110, 0.12);
        }

        .panelBlock.softB {
          background: #f8f6fb;
          border-color: #d9d2e8;
        }

        .panelBlock.softC {
          background: #f6faf7;
          border-color: #d2e1d7;
        }

        .panelBlock.softD {
          background: linear-gradient(180deg, #f7f4fc 0%, #f1ecf8 100%);
          border-color: #d8cde9;
          box-shadow: 0 14px 30px rgba(70, 42, 110, 0.12);
        }

        .cardTitleWrap {
          display: grid;
          gap: 4px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e0d5ef;
        }

        .cardEyebrow {
          margin: 0;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #6d5a8e;
          font-weight: 700;
        }

        .cardTitle {
          margin: 0;
          font-size: 17px;
          line-height: 1.2;
          color: #1e1430;
          font-family: 'Prata', ui-serif, Georgia, 'Times New Roman', serif;
        }

        .cardSupport {
          margin: 0;
          font-size: 12px;
          line-height: 1.35;
          color: #6f6781;
          font-weight: 500;
        }

        .contentCard {
          gap: 12px;
          order: 2;
        }

        .contentGrid {
          display: grid;
          gap: 10px;
        }

        .lyricsEditor {
          min-height: 150px;
        }

        .compactMetaGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .compactTextarea {
          min-height: 76px;
          resize: none;
        }

        .lyricsCard {
          gap: 12px;
          order: 1;
        }

        .panelBlock.softC {
          order: 3;
        }

        .lyricsQuickSummary {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .summaryPill {
          min-height: 36px;
          border: 1px solid #d9cdea;
          border-radius: 10px;
          background: #fdfbff;
          padding: 6px 10px;
          display: grid;
          gap: 2px;
          align-content: center;
        }

        .summaryKey {
          font-size: 10px;
          line-height: 1;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #7a6b94;
          font-weight: 700;
        }

        .summaryVal {
          font-size: 12px;
          font-weight: 700;
          color: #2d2046;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: normal;
          overflow: visible;
          text-overflow: clip;
          line-height: 1.25;
        }

        .lyricsSection {
          display: grid;
          gap: 8px;
          border: 1px solid #dacced;
          border-radius: 12px;
          background: #fcf9ff;
          padding: 10px;
        }

        .ringControlShell {
          display: grid;
          gap: 10px;
          border: 1px solid #d7c7eb;
          border-radius: 12px;
          background: #fff;
          padding: 12px;
        }

        .signatureControlShell {
          display: grid;
          gap: 10px;
          border: 1px solid #d5cbe6;
          border-radius: 12px;
          background: linear-gradient(180deg, #fdfbff 0%, #f8f4ff 100%);
          padding: 12px;
        }

        .controlHint {
          margin: 0;
          font-size: 11px;
          line-height: 1.35;
          color: #6e6880;
        }

        .ringControlGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .controlTile {
          border: 1px solid #e0d8ef;
          border-radius: 10px;
          background: #fbf9ff;
          padding: 8px;
          gap: 6px;
          min-width: 0;
        }

        label {
          font-size: 14px;
          font-weight: 600;
          color: #1c1f27;
        }

        .fieldGroup {
          display: grid;
          grid-template-columns: 90px 1fr;
          align-items: start;
          gap: 10px;
        }

        .stackField {
          display: grid;
          gap: 8px;
        }

        .fieldHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .exploreBtn {
          min-height: 32px;
          border: 1px solid #b8c4d8;
          border-radius: 999px;
          background: linear-gradient(180deg, #f3f6fb 0%, #e6edf8 100%);
          color: #253554;
          font-weight: 700;
          font-size: 12px;
          padding: 0 11px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .exploreBtn:hover {
          border-color: #9eb0cc;
          background: linear-gradient(180deg, #f8fbff 0%, #eaf2ff 100%);
        }

        .exploreDots {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 1px solid #afbdd3;
          background: #fff;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2px;
          align-items: center;
          justify-items: center;
          padding: 4px;
        }

        .exploreDots i {
          width: 3px;
          height: 3px;
          border-radius: 999px;
          background: #4e6289;
        }

        .fontOptionGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .lyricsCaseRow {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .lyricsCaseBtn {
          min-height: 34px;
          border-radius: 10px;
          border: 1px solid #c8b9de;
          background: #fff;
          color: #4d356f;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }

        .lyricsCaseBtn:hover {
          border-color: #b79fd7;
          background: #f8f4ff;
        }

        .lyricsCaseBtn.active {
          border-color: #7b56c1;
          box-shadow: inset 0 0 0 1px #7b56c1;
          background: #f8f4ff;
          color: #4d2f83;
        }

        .fontOptionBtn {
          min-height: 72px;
          border: 1px solid #cfbfdc;
          border-radius: 12px;
          background: #fff;
          color: #1c1f27;
          padding: 8px 10px;
          display: grid;
          gap: 3px;
          align-content: center;
          text-align: left;
          cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
        }

        .fontOptionBtn:hover {
          transform: translateY(-1px);
          border-color: #b79fd7;
        }

        .fontOptionBtn.active {
          border-color: #7b56c1;
          box-shadow: inset 0 0 0 1px #7b56c1;
          background: #f8f4ff;
        }

        .fontGlyph {
          font-size: 24px;
          line-height: 1;
          color: #1b1230;
        }

        .fontOptionLabel {
          font-size: 11px;
          color: #4a3b64;
          line-height: 1.2;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .lyricsCard .fontOptionGrid {
          gap: 10px;
        }

        .lyricsCard .fontOptionBtn {
          min-height: 68px;
          border-color: #cebddd;
          background: #fff;
          padding: 7px 9px;
          gap: 2px;
        }

        .lyricsCard .fontGlyph {
          font-size: 20px;
        }

        .spinbox {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 38px;
          border: 1px solid #cdc0e2;
          border-radius: 12px;
          background: #ffffff;
          overflow: hidden;
          min-height: 44px;
        }

        .spinboxInput {
          width: 100%;
          border: 0;
          border-radius: 0;
          min-height: 0;
          background: transparent;
          text-align: center;
          font-size: 21px;
          font-weight: 700;
          color: #2c1d48;
          padding: 0 10px;
          outline: none;
        }

        .spinboxButtons {
          display: grid;
          grid-template-rows: 1fr 1fr;
          border-left: 1px solid #d8cee9;
          background: linear-gradient(180deg, #fbf9ff 0%, #f4effb 100%);
        }

        .spinboxBtn {
          border: 0;
          border-bottom: 1px solid #ddd3ee;
          background: transparent;
          color: #4f3c75;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          line-height: 1;
          padding: 0;
        }

        .spinboxBtn:last-child {
          border-bottom: 0;
        }

        .spinboxBtn:hover {
          background: rgba(123, 86, 193, 0.12);
        }

        .twoCol {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        input,
        textarea,
        select {
          width: 100%;
          max-width: 100%;
          border: 1px solid #cdd2da;
          border-radius: 12px;
          min-height: 44px;
          background: #fff;
          font-size: 13px;
          color: #1a1d23;
          padding: 0 14px;
          outline: none;
        }

        textarea {
          min-height: 96px;
          padding: 12px 14px;
          resize: vertical;
        }

        .dashedInput {
          width: 100%;
          min-height: 46px;
          border-radius: 14px;
          border: 1.5px dashed #747982;
          background: transparent;
          padding: 0 14px;
          font-size: 13px;
          color: #4a4f56;
          font-family: 'Signika', ui-sans-serif, system-ui;
        }

        .palettePickerWrap {
          display: grid;
          gap: 8px;
        }

        .paletteModeLabel {
          font-size: 12px;
          color: #586274;
          font-weight: 600;
        }

        .palettePicker {
          display: grid;
          gap: 8px;
        }

        .palettePicker.compact {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .palettePicker.expanded {
          grid-template-columns: repeat(5, minmax(0, 1fr));
        }

        .palettePicker.lyricsExpanded {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .paletteBtn {
          width: 44px;
          height: 44px;
          justify-self: center;
          display: grid;
          place-items: center;
          border-radius: 999px;
          border: 1px solid rgba(73, 52, 109, 0.24);
          background: #ffffff;
          padding: 0;
          cursor: pointer;
          position: relative;
          overflow: visible;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.75),
            0 4px 10px rgba(26, 20, 43, 0.14);
        }

        .paletteBtn:hover {
          transform: translateY(-1px) scale(1.03);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.8),
            0 7px 14px rgba(26, 20, 43, 0.2);
        }

        .paletteBtn.active {
          border-color: #7b56c1;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.85),
            0 0 0 2px rgba(123, 86, 193, 0.3),
            0 8px 16px rgba(83, 45, 150, 0.26);
        }

        .paletteBtn .swatch {
          display: block;
          width: 100%;
          height: 100%;
          border-radius: 999px;
          transform: none;
          border: 1px solid rgba(15, 18, 28, 0.2);
          background-blend-mode: soft-light;
          box-shadow:
            inset 0 2px 4px rgba(255, 255, 255, 0.38),
            inset 0 -4px 6px rgba(0, 0, 0, 0.2);
        }

        .lyricsCard .paletteBtn {
          width: 42px;
          height: 42px;
        }

        .surfaceOptionHead {
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #6d5a8e;
          font-weight: 700;
          margin-top: 2px;
        }

        .sizeCardLabel {
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #6d5a8e;
          font-weight: 700;
        }

        .frameSection {
          border: 1px solid #dacced;
          border-radius: 12px;
          background: #fcf9ff;
          padding: 10px;
          gap: 8px;
        }

        .surfaceOptionRow {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .paletteHead {
          justify-content: flex-end;
        }

        .surfaceToggleBtn {
          min-height: 36px;
          border-radius: 10px;
          border: 1px solid #c8b9de;
          background: #fff;
          color: #4d356f;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }

        .surfaceToggleBtn.active {
          border-color: #7b56c1;
          box-shadow: inset 0 0 0 1px #7b56c1;
          background: #f8f4ff;
          color: #4d2f83;
        }

        .surfaceToggleBtn:hover {
          border-color: #b79fd7;
        }

        .inkPicker {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .inkBtn {
          min-height: 42px;
          border-radius: 10px;
          border: 1px solid #cbd3df;
          background: #fff;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 10px;
          cursor: pointer;
          color: #1f2937;
          font-size: 13px;
          font-weight: 600;
        }

        .inkBtn.active {
          border-color: #2f74ff;
          box-shadow: inset 0 0 0 1px #2f74ff;
          background: #edf3ff;
        }

        .inkSwatch {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          border: 1px solid rgba(15, 23, 42, 0.25);
          flex: 0 0 auto;
        }

        .microHint {
          margin: 0;
          font-size: 12px;
          color: #6d7076;
        }

        .hint {
          margin: 0;
          font-size: 12px;
          color: #6f7481;
          padding-left: 100px;
          line-height: 1.35;
        }

        .uploadInputHidden {
          display: none;
        }

        .uploadActions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .uploadBtn,
        .uploadGhostBtn,
        .ghostBtn {
          min-height: 40px;
          border-radius: 10px;
          border: 1px solid #bfc9d7;
          background: #fff;
          color: #1f2937;
          font-size: 13px;
          font-weight: 600;
          padding: 0 12px;
          cursor: pointer;
        }

        .uploadBtn {
          border-color: #2f74ff;
          color: #1844a6;
          background: #eef4ff;
        }

        .sizeFrameBlock .dashedInput {
          border: 1px solid #c8b9de;
          background: #fff;
          color: #2d2046;
          font-weight: 600;
        }

        .sizeFrameBlock .paletteBtn.active {
          border-color: #7b56c1;
          box-shadow: inset 0 0 0 1px #7b56c1;
        }

        .sizeFrameBlock .uploadBtn {
          border-color: #7b56c1;
          color: #4d2f83;
          background: #f4effd;
        }

        .sizeFrameBlock .uploadGhostBtn {
          border-color: #c8b9de;
          color: #4d356f;
          background: #fff;
        }

        .actionRow {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .checkoutBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          border: 0;
          border-radius: 12px;
          min-height: 50px;
          font-size: 18px;
          background: #101215;
          color: #fff;
          cursor: pointer;
        }

        .checkoutBtn:disabled,
        .ghostBtn:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        .error {
          margin: 0;
          color: #b91c1c;
          font-size: 13px;
        }

        @media (max-width: 1220px) {
          .layout {
            grid-template-columns: minmax(0, 1fr) 390px;
          }

          .menu {
            gap: 14px;
          }

          .menu a,
          .cityMapCta {
            font-size: 14px;
          }
        }

        @media (max-width: 980px) {
          .designRoot {
            height: auto;
            min-height: 100vh;
            overflow: auto;
          }

          .topbar {
            position: sticky;
            height: auto;
            grid-template-columns: 1fr;
            gap: 10px;
            padding: 12px;
          }

          .menu {
            justify-self: start;
            gap: 12px;
            flex-wrap: wrap;
          }

          .cityMapCta {
            justify-self: start;
          }

          .layout {
            margin-top: 0;
            height: auto;
            display: grid;
            grid-template-columns: 1fr;
            overflow: visible;
          }

          .previewPanel {
            min-height: 52vh;
            padding: 14px;
          }

          .paper {
            min-height: 0;
            height: min(70dvh, 620px);
            padding: 14px;
          }

          .rightPanel {
            padding: 14px;
            border-left: 0;
            border-top: 1px solid #cfd6e2;
          }

          .fieldGroup {
            grid-template-columns: 1fr;
          }

          .hint {
            padding-left: 0;
          }

          .compactMetaGrid {
            grid-template-columns: 1fr;
          }

          .twoCol {
            grid-template-columns: 1fr;
          }

          .lyricsQuickSummary {
            grid-template-columns: 1fr;
          }

          .ringControlGrid {
            grid-template-columns: 1fr;
          }

          .palettePicker.expanded {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .fontOptionGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </div>
  );
}
