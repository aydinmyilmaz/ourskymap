'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { CHECKOUT_DRAFT_KEY, type CheckoutDraft } from '../../lib/checkout';
import type { SoundwaveParams } from '../../lib/types';
import templatePeaksRaw from '../../data/soundwave-template-peaks.json';

type SizeOption = { key: SoundwaveParams['size']; label: string };
type ColorOption = { key: SoundwaveParams['palette']; label: string; colors: string[] };
type BackgroundColorOption = { key: string; label: string; value: string };
type TextColorOption = { key: string; label: string; value: string };
type FontOption = { key: SoundwaveParams['fontPreset']; label: string; previewFamily: string };
type MediaMode = SoundwaveParams['qrMode'];
type PeaksCacheRow = {
  key: string;
  peaks: number[];
  durationSec: number;
  label: string;
  updatedAt: number;
};

const SOUNDWAVE_PICTURE_IMAGE_KEY = 'space_map_soundwave_picture_image_v1';
const SOUNDWAVE_CACHE_DB = 'space_map_soundwave_cache_v1';
const SOUNDWAVE_CACHE_STORE = 'peaks';
const SOUNDWAVE_FILE_CACHE_PREFIX = 'file:';
const TEMPLATE_AUDIO_LABEL = 'Bryan Adams - Have You Ever Really Loved A Woman (Classic Version) - Bryan Adams.mp3';
const TEMPLATE_SONG_TITLE = 'Have You Ever Really Loved A Woman';

const TEMPLATE_PEAKS: number[] = Array.isArray(templatePeaksRaw)
  ? (templatePeaksRaw as unknown[])
      .map((v) => (typeof v === 'number' ? Math.max(0, Math.min(1, v)) : 0))
      .filter((v) => Number.isFinite(v))
      .slice(0, 2200)
  : [];

const SIZE_OPTIONS: SizeOption[] = [
  { key: '4x6', label: '4x6 inches' },
  { key: '5x7', label: '5x7 inches' },
  { key: '6x9', label: '6x9 inches' },
  { key: '8x10', label: '8x10 inches' },
  { key: '11x14', label: '11x14 inches' },
  { key: '24x8', label: '24x8 inches' },
  { key: '16x20', label: '16x20 inches' },
  { key: '18x24', label: '18x24 inches' },
  { key: '30x10', label: '30x10 inches' },
  { key: '36x12', label: '36x12 inches' },
  { key: '42x14', label: '42x14 inches' },
  { key: '48x16', label: '48x16 inches' },
  { key: '54x18', label: '54x18 inches' }
];

const COLOR_OPTIONS: ColorOption[] = [
  { key: 'multicolor-1', label: 'Multicolor - 1', colors: ['#9d4fa8', '#f270a8', '#4f59d8'] },
  { key: 'multicolor-2', label: 'Multicolor - 2', colors: ['#f5a7de', '#be72dd', '#6f90f0'] },
  { key: 'multicolor-3', label: 'Multicolor - 3', colors: ['#40be63', '#d2d63a', '#f56a45'] },
  { key: 'multicolor-4', label: 'Multicolor - 4', colors: ['#f7945d', '#efbe52', '#f1d67b'] },
  { key: 'multicolor-5', label: 'Multicolor - 5', colors: ['#e85842', '#f2ca46', '#46a4dd', '#764bc7'] },
  { key: 'multicolor-6', label: 'Multicolor - 6', colors: ['#2f84d3', '#5ac8e0'] },
  { key: 'multicolor-7', label: 'Multicolor - 7', colors: ['#932e58', '#f08d4f', '#4a39b5'] },
  { key: 'multicolor-8', label: 'Multicolor - 8', colors: ['#0f649c', '#217cbc'] },
  { key: 'multicolor-9', label: 'Multicolor - 9', colors: ['#cf2430', '#111', '#cf2430'] },
  { key: 'multicolor-10', label: 'Multicolor - 10', colors: ['#f43030', '#d42424'] },
  { key: 'gold', label: 'Gold', colors: ['#ebd594', '#cb9f44'] },
  { key: 'silver', label: 'Silver', colors: ['#cfd2d7', '#a2a8b1'] },
  { key: 'emerald-green', label: 'Emerald Green', colors: ['#0f9d5f', '#0c6d40'] },
  { key: 'black', label: 'Black', colors: ['#111111', '#000000'] },
  { key: 'white', label: 'White', colors: ['#f9f9f9', '#ebebeb'] },
  { key: 'sapphire', label: 'SAPPHIRE', colors: ['#11408f', '#2d7fd1'] },
  { key: 'emerald', label: 'EMERALD', colors: ['#116a45', '#24b67e'] },
  { key: 'amethyst', label: 'AMETHYST', colors: ['#6945a9', '#aa81db'] },
  { key: 'iridescent', label: 'IRIDESCENT', colors: ['#5f8fe0', '#c57acf', '#e5b47c', '#7dd0b4'] },
  { key: 'bronze', label: 'BRONZE', colors: ['#8e6a3f', '#ba8a46'] },
  { key: 'copper', label: 'COPPER', colors: ['#a45636', '#ce7a53'] },
  { key: 'ruby', label: 'RUBY', colors: ['#8f2236', '#d74b68'] },
  { key: 'onyx', label: 'ONYX', colors: ['#111', '#303030'] },
  { key: 'seafoam', label: 'Seafoam', colors: ['#2d4d7a', '#25b585', '#3ba9e1'] },
  { key: 'apple', label: 'Apple', colors: ['#b88715', '#d95d1c', '#b32222'] },
  { key: 'cantaloupe', label: 'Cantaloupe', colors: ['#db8f8f', '#e98f44', '#efc46a'] },
  { key: 'ocean', label: 'Ocean', colors: ['#0f7a6f', '#18a2b8', '#1e84d5'] },
  { key: 'mauve', label: 'Mauve', colors: ['#6f5d8f', '#4d477a', '#5871a8'] },
  { key: 'after-dark', label: 'After Dark', colors: ['#090f22', '#0d2d52', '#183f6a'] },
  { key: 'magenta', label: 'Magenta', colors: ['#7a0f50', '#a3157a', '#ca2f87'] },
  { key: 'peacock', label: 'Peacock', colors: ['#0a4f73', '#0d3f85', '#0b5aa1'] },
  { key: 'spice', label: 'Spice', colors: ['#8a2d0a', '#7b3a12', '#7a5b1e'] },
  { key: 'rainbow-1', label: 'Rainbow #1', colors: ['#d43b2a', '#e89f1d', '#f1d52f', '#45b94d', '#34a5e3', '#7d45d2'] },
  { key: 'rainbow-2', label: 'Rainbow #2', colors: ['#b34ad8', '#5d5fdc', '#35b6ea', '#43bb6f', '#f0b82f', '#e0612c'] },
  { key: 'sunset', label: 'Sunset', colors: ['#2c4c96', '#ef5fa8', '#f0c02f'] }
];

const BACKGROUND_COLOR_OPTIONS: BackgroundColorOption[] = [
  { key: 'warm-paper', label: 'Warm Paper', value: '#f2ede8' },
  { key: 'classic-black', label: 'Classic Black', value: '#0b0b0d' },
  { key: 'cream', label: 'Cream', value: '#f3ecdc' },
  { key: 'emerald', label: 'Emerald', value: '#0b3d2e' },
  { key: 'burgundy', label: 'Burgundy', value: '#4d1f2a' },
  { key: 'navy-blue', label: 'Navy Blue', value: '#0f1c42' },
  { key: 'midnight', label: 'Midnight', value: '#0b1020' },
  { key: 'deep-navy', label: 'Deep Navy', value: '#121b34' },
  { key: 'royal-blue', label: 'Royal Blue', value: '#1f3f86' },
  { key: 'ocean-teal', label: 'Ocean Teal', value: '#125f67' },
  { key: 'deep-teal', label: 'Deep Teal', value: '#0f4f5a' },
  { key: 'dark-green', label: 'Dark Green', value: '#132a1f' },
  { key: 'forest', label: 'Forest', value: '#0e1f16' },
  { key: 'mustard-gold', label: 'Mustard Gold', value: '#886820' },
  { key: 'burnt-orange', label: 'Burnt Orange', value: '#8d4f1f' },
  { key: 'terracotta', label: 'Terracotta', value: '#8f3c34' },
  { key: 'plum', label: 'Plum', value: '#1c1230' },
  { key: 'storm-gray', label: 'Storm Gray', value: '#2c3341' },
  { key: 'sand', label: 'Sand', value: '#efe3cb' },
  { key: 'pearl', label: 'Pearl', value: '#ececed' }
];

const TEXT_COLOR_OPTIONS: TextColorOption[] = [
  { key: 'ink-charcoal', label: 'Charcoal', value: '#2a2431' },
  { key: 'ink-black', label: 'Black', value: '#111111' },
  { key: 'ink-navy', label: 'Navy', value: '#1f2f53' },
  { key: 'ink-gold', label: 'Gold', value: '#b48b3c' },
  { key: 'ink-cream', label: 'Cream', value: '#f1ead8' },
  { key: 'ink-silver', label: 'Silver', value: '#c7ccd4' },
  { key: 'ink-ruby', label: 'Ruby', value: '#8f2236' },
  { key: 'ink-emerald', label: 'Emerald', value: '#0f6a4a' },
  { key: 'ink-amethyst', label: 'Amethyst', value: '#6242a1' },
  { key: 'ink-copper', label: 'Copper', value: '#a05d3f' },
  { key: 'ink-onyx', label: 'Onyx', value: '#2d2f33' },
  { key: 'ink-snow', label: 'Snow', value: '#f3f4f6' }
];

const FONT_OPTIONS: FontOption[] = [
  { key: 'f1', label: 'F1 - Script', previewFamily: "Great Vibes, Allura, cursive, serif" },
  { key: 'f2', label: 'F2 - Bold Sans', previewFamily: 'Signika, Arial, sans-serif' },
  { key: 'f3', label: 'F3 - Allura', previewFamily: "Allura, 'Great Vibes', cursive, serif" },
  { key: 'f4', label: 'F4 - Serif', previewFamily: "Prata, Georgia, 'Times New Roman', serif" },
  { key: 'f5', label: 'F5 - Elegant Script', previewFamily: "Great Vibes, Allura, cursive, serif" },
  { key: 'f6', label: 'F6 - Classic Serif', previewFamily: "Prata, Georgia, 'Times New Roman', serif" },
  { key: 'f7', label: 'F7 - Light Script', previewFamily: "Allura, 'Great Vibes', cursive, serif" },
  { key: 'f8', label: 'F8 - Default Font', previewFamily: 'Signika, Arial, sans-serif' }
];

const TEXT_CASE_OPTIONS: Array<{ key: SoundwaveParams['textCase']; label: string }> = [
  { key: 'original', label: 'Original' },
  { key: 'upper', label: 'UPPERCASE' },
  { key: 'lower', label: 'lowercase' }
];

const WAVE_STYLE_OPTIONS: Array<{ key: SoundwaveParams['waveStyle']; label: string; hint: string }> = [
  { key: 'filled', label: 'Classic Fill', hint: 'Solid mirrored shape' },
  { key: 'scanlines', label: 'Fine Lines', hint: 'Dense thin vertical lines' },
  { key: 'spikes', label: 'Needle Lines', hint: 'Long needle-style spikes' },
  { key: 'brush-lines', label: 'Brush Fade', hint: 'Soft feathered waveform texture' },
  { key: 'brush-spike', label: 'Brush Spike', hint: 'Sharper textured brush spikes' }
];

const MEDIA_MODE_OPTIONS: Array<{ key: MediaMode; label: string }> = [
  { key: 'none', label: 'No QR / Picture' },
  { key: 'qr', label: 'QR Only' },
  { key: 'picture', label: 'Picture Only' },
  { key: 'picture-qr', label: 'Picture + QR' }
];

const QR_POSITION_OPTIONS: Array<{ key: NonNullable<SoundwaveParams['qrPosition']>; label: string }> = [
  { key: 'bottom-right', label: 'Bottom Right' },
  { key: 'title-end', label: 'After Song Title' }
];

const defaultSoundwave: SoundwaveParams = {
  size: '16x20',
  palette: 'multicolor-1',
  fontPreset: 'f8',
  textCase: 'original',
  textColor: '#2a2431',
  title: TEMPLATE_SONG_TITLE,
  subtitle: '',
  caption: '',
  backgroundColor: '#f2ede8',
  peaks: TEMPLATE_PEAKS.slice(0, 1500),
  waveStyle: 'filled',
  qrMode: 'none',
  qrPosition: 'bottom-right',
  qrContent: 'https://example.com/your-song-link',
  qrImageDataUrl: '',
  showSpotifyCode: false,
  spotifyUri: 'https://open.spotify.com/track/5CQ30WqJwcep0pYcV4AMNc',
  spotifyCodeImageDataUrl: '',
  pictureImageDataUrl: '',
  waveHeight: 1,
  waveThickness: 2.2,
  waveformOpacity: 0.94,
  showFrame: true
};

function gradientFromColors(colors: string[]): string {
  if (!colors.length) return '#000';
  if (colors.length === 1) return colors[0];
  return `linear-gradient(90deg, ${colors.join(', ')})`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function resampleArray(arr: number[], targetCount: number): number[] {
  if (!arr.length) return [];
  if (arr.length === targetCount) return arr;
  const out: number[] = [];
  const last = arr.length - 1;
  for (let i = 0; i < targetCount; i++) {
    const t = (i / Math.max(1, targetCount - 1)) * last;
    const i0 = Math.floor(t);
    const i1 = Math.min(last, i0 + 1);
    const f = t - i0;
    out.push(arr[i0] * (1 - f) + arr[i1] * f);
  }
  return out;
}

function smoothArray(arr: number[], radius: number): number[] {
  if (radius <= 0 || arr.length < 3) return arr;
  const out = new Array<number>(arr.length).fill(0);
  for (let i = 0; i < arr.length; i++) {
    let sum = 0;
    let cnt = 0;
    for (let d = -radius; d <= radius; d++) {
      const j = i + d;
      if (j < 0 || j >= arr.length) continue;
      sum += arr[j];
      cnt += 1;
    }
    out[i] = cnt ? sum / cnt : arr[i];
  }
  return out;
}

function openSoundwaveDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return Promise.resolve(null);
  return new Promise((resolve) => {
    const req = window.indexedDB.open(SOUNDWAVE_CACHE_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SOUNDWAVE_CACHE_STORE)) {
        db.createObjectStore(SOUNDWAVE_CACHE_STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
}

async function readPeaksCacheRow(key: string): Promise<PeaksCacheRow | null> {
  const db = await openSoundwaveDb();
  if (!db) return null;
  return await new Promise((resolve) => {
    const tx = db.transaction(SOUNDWAVE_CACHE_STORE, 'readonly');
    const store = tx.objectStore(SOUNDWAVE_CACHE_STORE);
    const req = store.get(key);
    req.onsuccess = () => {
      const row = req.result as PeaksCacheRow | undefined;
      resolve(row ?? null);
    };
    req.onerror = () => resolve(null);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}

async function writePeaksCacheRow(row: PeaksCacheRow): Promise<void> {
  const db = await openSoundwaveDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(SOUNDWAVE_CACHE_STORE, 'readwrite');
    const store = tx.objectStore(SOUNDWAVE_CACHE_STORE);
    store.put(row);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      resolve();
    };
  });
}

async function extractAudioPeaks(file: File, bins = 1400): Promise<{ peaks: number[]; durationSec: number }> {
  const ab = await file.arrayBuffer();
  const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as
    | (new () => AudioContext)
    | undefined;
  if (!Ctx) {
    throw new Error('AudioContext is not supported in this browser.');
  }
  const ctx = new Ctx();
  try {
    const decoded = await ctx.decodeAudioData(ab.slice(0));
    const channels = decoded.numberOfChannels;
    const length = decoded.length;
    const block = Math.max(1, Math.floor(length / bins));
    const skip = Math.max(1, Math.floor(block / 96));
    const peaks = new Array<number>(bins).fill(0);

    for (let i = 0; i < bins; i++) {
      const start = i * block;
      const end = i === bins - 1 ? length : Math.min(length, (i + 1) * block);
      let maxAmp = 0;
      for (let c = 0; c < channels; c++) {
        const data = decoded.getChannelData(c);
        for (let j = start; j < end; j += skip) {
          const v = Math.abs(data[j] || 0);
          if (v > maxAmp) maxAmp = v;
        }
      }
      peaks[i] = maxAmp;
    }

    // Trim leading/trailing silence using a dynamic threshold.
    const sorted = peaks.slice().sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    const silenceThreshold = Math.max(0.015, p95 * 0.08);
    let first = 0;
    while (first < peaks.length && peaks[first] < silenceThreshold) first++;
    let last = peaks.length - 1;
    while (last > first && peaks[last] < silenceThreshold) last--;
    const trimmed = first < last ? peaks.slice(first, last + 1) : peaks;

    const maxPeak = trimmed.reduce((m, v) => (v > m ? v : m), 0);
    const normalized = maxPeak > 0 ? trimmed.map((v) => clamp(v / maxPeak, 0, 1)) : trimmed;
    // Gentle dynamic compression so low sections stay visible.
    const compressed = normalized.map((v) => Math.pow(v, 0.72));
    const resampled = resampleArray(compressed, bins);
    const smoothed = smoothArray(resampled, 1).map((v) => clamp(v, 0, 1));

    if (!smoothed.some((v) => v > 0.001)) {
      throw new Error('Could not extract audible waveform from this file.');
    }
    return { peaks: smoothed, durationSec: decoded.duration || 0 };
  } finally {
    void ctx.close();
  }
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

function parseSpotifyUri(input: string): string {
  const raw = input.trim();
  if (!raw) return '';
  if (raw.startsWith('spotify:')) return raw;
  try {
    const u = new URL(raw);
    if (!/spotify\.com$/i.test(u.hostname) && !/open\.spotify\.com$/i.test(u.hostname)) return '';
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return '';
    const type = parts[0];
    const id = (parts[1] || '').split('?')[0];
    if (!type || !id) return '';
    return `spotify:${type}:${id}`;
  } catch {
    return '';
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read generated image.'));
    reader.readAsDataURL(blob);
  });
}

async function buildSpotifyCodeDataUrl(input: string): Promise<string> {
  const spotifyUri = parseSpotifyUri(input);
  if (!spotifyUri) throw new Error('Please enter a valid Spotify URL or spotify: URI.');
  const endpoint = `https://scannables.scdn.co/uri/plain/png/000000/white/640/${encodeURIComponent(spotifyUri)}`;
  const res = await fetch(endpoint, { method: 'GET' });
  if (!res.ok) throw new Error('Could not fetch Spotify code image.');
  const blob = await res.blob();
  return await blobToDataUrl(blob);
}

export default function SoundwavePage() {
  const router = useRouter();
  const [soundwave, setSoundwave] = useState<SoundwaveParams>(defaultSoundwave);
  const [soundwaveSvg, setSoundwaveSvg] = useState('');
  const [error, setError] = useState('');
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [isBuildingQr, setIsBuildingQr] = useState(false);
  const [isBuildingSpotifyCode, setIsBuildingSpotifyCode] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [audioFileLabel, setAudioFileLabel] = useState(TEMPLATE_AUDIO_LABEL);
  const [audioDurationSec, setAudioDurationSec] = useState(0);
  const [showAllBackgroundColors, setShowAllBackgroundColors] = useState(false);
  const [showAllColors, setShowAllColors] = useState(false);
  const [showAllFonts, setShowAllFonts] = useState(false);
  const [showAllTextColors, setShowAllTextColors] = useState(false);

  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const pictureInputRef = useRef<HTMLInputElement | null>(null);

  const visibleColors = useMemo(() => {
    if (showAllColors) return COLOR_OPTIONS;
    const firstFour = COLOR_OPTIONS.slice(0, 4);
    if (firstFour.some((x) => x.key === soundwave.palette)) return firstFour;
    const selected = COLOR_OPTIONS.find((x) => x.key === soundwave.palette);
    return selected ? [firstFour[0], firstFour[1], firstFour[2], selected] : firstFour;
  }, [showAllColors, soundwave.palette]);

  const visibleBackgroundColors = useMemo(() => {
    if (showAllBackgroundColors) return BACKGROUND_COLOR_OPTIONS;
    const firstFour = BACKGROUND_COLOR_OPTIONS.slice(0, 4);
    if (firstFour.some((x) => x.value === soundwave.backgroundColor)) return firstFour;
    const selected = BACKGROUND_COLOR_OPTIONS.find((x) => x.value === soundwave.backgroundColor);
    return selected ? [firstFour[0], firstFour[1], firstFour[2], selected] : firstFour;
  }, [showAllBackgroundColors, soundwave.backgroundColor]);

  const visibleFonts = useMemo(() => {
    if (showAllFonts) return FONT_OPTIONS;
    const firstFour = FONT_OPTIONS.slice(0, 4);
    if (firstFour.some((x) => x.key === soundwave.fontPreset)) return firstFour;
    const selected = FONT_OPTIONS.find((x) => x.key === soundwave.fontPreset);
    return selected ? [firstFour[0], firstFour[1], firstFour[2], selected] : firstFour;
  }, [showAllFonts, soundwave.fontPreset]);

  const visibleTextColors = useMemo(() => {
    if (showAllTextColors) return TEXT_COLOR_OPTIONS;
    const firstFour = TEXT_COLOR_OPTIONS.slice(0, 4);
    if (firstFour.some((x) => x.value === soundwave.textColor)) return firstFour;
    const selected = TEXT_COLOR_OPTIONS.find((x) => x.value === soundwave.textColor);
    return selected ? [firstFour[0], firstFour[1], firstFour[2], selected] : firstFour;
  }, [showAllTextColors, soundwave.textColor]);

  const fetchSoundwaveSvg = useCallback(async (req: SoundwaveParams): Promise<string> => {
    const res = await fetch('/api/soundwave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ soundwave: req })
    });
    if (!res.ok) throw new Error((await res.text()) || 'Soundwave generation failed');
    return res.text();
  }, []);

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

  const generatePreview = useCallback(
    async (req: SoundwaveParams) => {
      setError('');
      try {
        const svg = await fetchSoundwaveSvg(req);
        setSoundwaveSvg(svg);
      } catch (e: any) {
        setError(e?.message ?? String(e));
      }
    },
    [fetchSoundwaveSvg]
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      void generatePreview(soundwave);
    }, 100);
    return () => window.clearTimeout(id);
  }, [soundwave, generatePreview]);

  useEffect(() => {
    const wantsQr = soundwave.qrMode === 'qr' || soundwave.qrMode === 'picture-qr';
    const content = soundwave.qrContent.trim();
    if (!wantsQr || !content) {
      if (soundwave.qrImageDataUrl) {
        setSoundwave((v) => ({ ...v, qrImageDataUrl: '' }));
      }
      setIsBuildingQr(false);
      return;
    }
    let cancelled = false;
    setIsBuildingQr(true);
    void QRCode.toDataURL(content, {
      margin: 0,
      width: 512,
      color: { dark: '#111111', light: '#ffffff' }
    })
      .then((dataUrl: string) => {
        if (cancelled) return;
        setSoundwave((v) => (v.qrImageDataUrl === dataUrl ? v : { ...v, qrImageDataUrl: dataUrl }));
      })
      .catch(() => {
        if (cancelled) return;
        setError('Could not generate QR code from this link.');
      })
      .finally(() => {
        if (!cancelled) setIsBuildingQr(false);
      });
    return () => {
      cancelled = true;
    };
  }, [soundwave.qrMode, soundwave.qrContent, soundwave.qrImageDataUrl]);

  useEffect(() => {
    const enabled = !!soundwave.showSpotifyCode;
    const source = (soundwave.spotifyUri || '').trim();
    if (!enabled || !source) {
      if (soundwave.spotifyCodeImageDataUrl) {
        setSoundwave((v) => ({ ...v, spotifyCodeImageDataUrl: '' }));
      }
      setIsBuildingSpotifyCode(false);
      return;
    }
    let cancelled = false;
    setIsBuildingSpotifyCode(true);
    void buildSpotifyCodeDataUrl(source)
      .then((dataUrl) => {
        if (cancelled) return;
        setSoundwave((v) => (v.spotifyCodeImageDataUrl === dataUrl ? v : { ...v, spotifyCodeImageDataUrl: dataUrl }));
      })
      .catch(() => {
        if (cancelled) return;
        setError('Could not generate Spotify code. Check Spotify URL/URI.');
      })
      .finally(() => {
        if (!cancelled) setIsBuildingSpotifyCode(false);
      });
    return () => {
      cancelled = true;
    };
  }, [soundwave.showSpotifyCode, soundwave.spotifyUri, soundwave.spotifyCodeImageDataUrl]);

  const onAudioFile = useCallback(async (file?: File) => {
    if (!file) return;
    setIsUploadingAudio(true);
    setError('');
    try {
      const fileKey = `${SOUNDWAVE_FILE_CACHE_PREFIX}${file.name}:${file.size}:${file.lastModified}`;
      const cachedRow = await readPeaksCacheRow(fileKey);
      if (cachedRow?.peaks?.length) {
        setSoundwave((v) => ({ ...v, peaks: cachedRow.peaks }));
        setAudioFileLabel(`${file.name} (cached)`);
        setAudioDurationSec(cachedRow.durationSec || 0);
        return;
      }

      const { peaks, durationSec } = await extractAudioPeaks(file, 1500);
      setSoundwave((v) => ({ ...v, peaks }));
      setAudioFileLabel(file.name);
      setAudioDurationSec(durationSec);
      const row: PeaksCacheRow = {
        key: fileKey,
        peaks,
        durationSec,
        label: file.name,
        updatedAt: Date.now()
      };
      await writePeaksCacheRow(row);
    } catch (e: any) {
      setError(e?.message ?? 'Unable to decode audio');
    } finally {
      setIsUploadingAudio(false);
    }
  }, []);

  const onPictureFile = useCallback(async (file?: File) => {
    if (!file) return;
    setIsUploadingPicture(true);
    setError('');
    try {
      const dataUrl = await downscaleImageToDataUrl(file, 860);
      setSoundwave((v) => ({ ...v, pictureImageDataUrl: dataUrl }));
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SOUNDWAVE_PICTURE_IMAGE_KEY, dataUrl);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Could not process picture.');
    } finally {
      setIsUploadingPicture(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const cached = window.localStorage.getItem(SOUNDWAVE_PICTURE_IMAGE_KEY);
      if (!cached) return;
      setSoundwave((v) => ({ ...v, pictureImageDataUrl: cached }));
    } catch {
      // ignore
    }
  }, []);

  const handleCheckout = useCallback(async () => {
    if (checkoutBusy) return;
    setCheckoutBusy(true);
    setError('');
    try {
      const wantsQr = soundwave.qrMode === 'qr' || soundwave.qrMode === 'picture-qr';
      const wantsSpotifyCode = !!soundwave.showSpotifyCode;
      if (wantsQr && !soundwave.qrContent.trim()) {
        throw new Error('Please enter a valid link for QR mode.');
      }
      if (wantsQr && isBuildingQr) {
        throw new Error('QR is still being generated. Please try again in a moment.');
      }
      if (wantsSpotifyCode && !(soundwave.spotifyUri || '').trim()) {
        throw new Error('Please enter a valid Spotify URL/URI.');
      }
      if (wantsSpotifyCode && isBuildingSpotifyCode) {
        throw new Error('Spotify code is still being generated. Please try again in a moment.');
      }

      let requestSoundwave = { ...soundwave };
      if (wantsQr && !requestSoundwave.qrImageDataUrl) {
        requestSoundwave.qrImageDataUrl = await QRCode.toDataURL(requestSoundwave.qrContent.trim(), {
          margin: 0,
          width: 512,
          color: { dark: '#111111', light: '#ffffff' }
        });
        setSoundwave(requestSoundwave);
      }
      if (wantsSpotifyCode && !requestSoundwave.spotifyCodeImageDataUrl) {
        requestSoundwave.spotifyCodeImageDataUrl = await buildSpotifyCodeDataUrl(requestSoundwave.spotifyUri || '');
        setSoundwave(requestSoundwave);
      }

      const svg = await fetchSoundwaveSvg(requestSoundwave);
      setSoundwaveSvg(svg);
      if (!svg.trim().startsWith('<')) {
        throw new Error('Preview is not ready yet. Please try again.');
      }

      const draft: CheckoutDraft = {
        createdAtIso: new Date().toISOString(),
        productType: 'soundwave',
        previewSvg: svg,
        renderRequest: { soundwave: requestSoundwave },
        mapData: {
          city: 'Soundwave Studio',
          title: requestSoundwave.title || 'Soundwave Poster',
          names: requestSoundwave.subtitle || '',
          font: requestSoundwave.fontPreset,
          palette: requestSoundwave.palette,
          size: requestSoundwave.size,
          frameOn: requestSoundwave.showFrame,
          lat: 0,
          lon: 0,
          locationLine: requestSoundwave.caption || '',
          date: '',
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
  }, [checkoutBusy, fetchSoundwaveSvg, isBuildingQr, isBuildingSpotifyCode, persistCheckoutDraft, router, soundwave]);

  const previewBg = useMemo(() => {
    return `radial-gradient(1200px 700px at 10% -10%, #ffffff 0%, #eff3f9 32%, #dde4ef 100%)`;
  }, []);

  return (
    <div className="designRoot">
      <header className="topbar">
        <div className="brand">
          <div className="brandMark soundwaveLogo" aria-hidden="true">
            <span className="soundwaveBars">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
          </div>
          <strong className="brandTitle">SOUNDWAVE STUDIO</strong>
        </div>
        <nav className="menu">
          <a href="/ourskymap">Sky Map</a>
          <a href="/vinyl">Vinyl</a>
          <a href="/image">T-Shirt Design</a>
          <a href="/soundwave">Soundwave</a>
        </nav>
      </header>

      <main className="layout">
        <section className="previewPanel" style={{ background: previewBg }}>
          <div className="paper">
            {soundwaveSvg ? (
              <div className="svgMount" dangerouslySetInnerHTML={{ __html: soundwaveSvg }} />
            ) : (
              <div className="emptyState">Rendering soundwave preview...</div>
            )}
          </div>
        </section>

        <aside className="rightPanel">
          <div className="panelBlock sizeFrameBlock">
            <div className="cardTitleWrap">
              <p className="cardEyebrow">Setup</p>
              <h3 className="cardTitle">Audio & Canvas</h3>
              <p className="cardSupport">Upload audio, choose print size and waveform color option.</p>
            </div>

            <div className="stackField frameSection">
              <label className="sizeCardLabel">Size</label>
              <select
                className="dashedInput"
                value={soundwave.size}
                onChange={(e) => setSoundwave((v) => ({ ...v, size: e.target.value as SoundwaveParams['size'] }))}
              >
                {SIZE_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="stackField frameSection">
              <label className="sizeCardLabel">Audio File</label>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                className="uploadInputHidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  void onAudioFile(file);
                  e.currentTarget.value = '';
                }}
              />
              <div className="uploadActions">
                <button
                  type="button"
                  className="uploadBtn"
                  disabled={isUploadingAudio}
                  onClick={() => audioInputRef.current?.click()}
                >
                  {isUploadingAudio ? 'Analyzing...' : 'Upload Audio'}
                </button>
              </div>
              <p className="microHint">
                {audioFileLabel}
                {audioDurationSec > 0 ? ` • ${audioDurationSec.toFixed(1)}s` : ''}
              </p>
            </div>

            <div className="stackField frameSection">
              <label className="sizeCardLabel">QR / Picture Option</label>
              <div className="mediaModeGrid">
                {MEDIA_MODE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`modeBtn ${soundwave.qrMode === opt.key ? 'active' : ''}`}
                    onClick={() => setSoundwave((v) => ({ ...v, qrMode: opt.key }))}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="spotifyCodeRow">
                <button
                  type="button"
                  className={`surfaceToggleBtn ${soundwave.showSpotifyCode ? 'active' : ''}`}
                  onClick={() => setSoundwave((v) => ({ ...v, showSpotifyCode: !v.showSpotifyCode }))}
                >
                  {soundwave.showSpotifyCode ? 'Spotify Code On' : 'Spotify Code Off'}
                </button>
              </div>

              {(soundwave.qrMode === 'qr' || soundwave.qrMode === 'picture-qr') ? (
                <div className="stackField">
                  <label className="tinyLabel">Song / Spotify / YouTube Link</label>
                  <input
                    value={soundwave.qrContent}
                    placeholder="https://open.spotify.com/..."
                    onChange={(e) => setSoundwave((v) => ({ ...v, qrContent: e.target.value }))}
                  />
                  <p className="microHint">{isBuildingQr ? 'Generating QR...' : 'QR updates automatically from this link.'}</p>
                  <div className="inlineChoiceRow">
                    {QR_POSITION_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        className={`modeBtn ${((soundwave.qrPosition ?? 'bottom-right') === opt.key) ? 'active' : ''}`}
                        onClick={() => setSoundwave((v) => ({ ...v, qrPosition: opt.key }))}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {soundwave.showSpotifyCode ? (
                <div className="stackField">
                  <label className="tinyLabel">Spotify URL or URI</label>
                  <input
                    value={soundwave.spotifyUri || ''}
                    placeholder="https://open.spotify.com/track/... or spotify:track:..."
                    onChange={(e) => setSoundwave((v) => ({ ...v, spotifyUri: e.target.value }))}
                  />
                  <p className="microHint">
                    {isBuildingSpotifyCode
                      ? 'Generating Spotify code...'
                      : 'Spotify code is fetched from scannables.scdn.co and placed beside QR.'}
                  </p>
                </div>
              ) : null}

              {(soundwave.qrMode === 'picture' || soundwave.qrMode === 'picture-qr') ? (
                <div className="stackField">
                  <input
                    ref={pictureInputRef}
                    type="file"
                    accept="image/*"
                    className="uploadInputHidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      void onPictureFile(file);
                      e.currentTarget.value = '';
                    }}
                  />
                  <div className="uploadActions">
                    <button
                      type="button"
                      className="uploadBtn"
                      disabled={isUploadingPicture}
                      onClick={() => pictureInputRef.current?.click()}
                    >
                      {isUploadingPicture ? 'Processing...' : soundwave.pictureImageDataUrl ? 'Replace Picture' : 'Upload Picture'}
                    </button>
                    {soundwave.pictureImageDataUrl ? (
                      <button
                        type="button"
                        className="ghostBtn"
                        onClick={() => {
                          setSoundwave((v) => ({ ...v, pictureImageDataUrl: '' }));
                          if (typeof window !== 'undefined') {
                            window.localStorage.removeItem(SOUNDWAVE_PICTURE_IMAGE_KEY);
                          }
                        }}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="stackField frameSection">
              <div className="fieldHead">
                <label className="sizeCardLabel">Background Color</label>
                <button type="button" className="exploreBtn" onClick={() => setShowAllBackgroundColors((v) => !v)}>
                  <span className="exploreDots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  {showAllBackgroundColors ? 'Compact' : 'Explore'}
                </button>
              </div>
              <div className={`palettePicker ${showAllBackgroundColors ? 'expanded' : 'compact'}`}>
                {visibleBackgroundColors.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`paletteBtn ${soundwave.backgroundColor === item.value ? 'active' : ''}`}
                    onClick={() => setSoundwave((v) => ({ ...v, backgroundColor: item.value }))}
                    title={item.label}
                  >
                    <span className="swatch" style={{ background: item.value }} />
                  </button>
                ))}
              </div>
            </div>

            <div className="stackField frameSection">
              <div className="fieldHead">
                <label className="sizeCardLabel">Wave Color</label>
                <button type="button" className="exploreBtn" onClick={() => setShowAllColors((v) => !v)}>
                  <span className="exploreDots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  {showAllColors ? 'Compact' : 'Explore'}
                </button>
              </div>
              <div className={`palettePicker ${showAllColors ? 'expanded' : 'compact'}`}>
                {visibleColors.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`paletteBtn ${soundwave.palette === item.key ? 'active' : ''}`}
                    onClick={() => setSoundwave((v) => ({ ...v, palette: item.key }))}
                    title={item.label}
                  >
                    <span className="swatch" style={{ background: gradientFromColors(item.colors) }} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="panelBlock softD lyricsCard">
            <div className="cardTitleWrap">
              <p className="cardEyebrow">Typography</p>
              <h3 className="cardTitle">Text & Fonts</h3>
              <p className="cardSupport">Choose font style and personalize the soundwave title text.</p>
            </div>

            <div className="lyricsSection">
              <div className="fieldHead">
                <label>Font Options</label>
                <button type="button" className="exploreBtn" onClick={() => setShowAllFonts((v) => !v)}>
                  <span className="exploreDots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  {showAllFonts ? 'Compact' : 'Explore'}
                </button>
              </div>
              <div className="fontOptionGrid">
                {visibleFonts.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`fontOptionBtn ${soundwave.fontPreset === opt.key ? 'active' : ''}`}
                    onClick={() => setSoundwave((v) => ({ ...v, fontPreset: opt.key }))}
                  >
                    <span className="fontGlyph" style={{ fontFamily: opt.previewFamily }}>
                      Aa
                    </span>
                    <span className="fontOptionLabel">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="lyricsSection">
              <label>Text Case</label>
              <div className="lyricsCaseRow">
                {TEXT_CASE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`lyricsCaseBtn ${soundwave.textCase === opt.key ? 'active' : ''}`}
                    onClick={() => setSoundwave((v) => ({ ...v, textCase: opt.key }))}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="lyricsSection">
              <div className="fieldHead">
                <label>Text Color</label>
                <button type="button" className="exploreBtn" onClick={() => setShowAllTextColors((v) => !v)}>
                  <span className="exploreDots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  {showAllTextColors ? 'Compact' : 'Explore'}
                </button>
              </div>
              <div className={`palettePicker ${showAllTextColors ? 'expanded' : 'compact'}`}>
                {visibleTextColors.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`paletteBtn ${soundwave.textColor === item.value ? 'active' : ''}`}
                    onClick={() => setSoundwave((v) => ({ ...v, textColor: item.value }))}
                    title={item.label}
                  >
                    <span className="swatch" style={{ background: item.value }} />
                  </button>
                ))}
              </div>
            </div>

            <div className="contentGrid">
              <div className="stackField">
                <label>Title</label>
                <input value={soundwave.title} onChange={(e) => setSoundwave((v) => ({ ...v, title: e.target.value }))} />
              </div>
              <div className="stackField">
                <label>Subtitle</label>
                <input
                  value={soundwave.subtitle}
                  onChange={(e) => setSoundwave((v) => ({ ...v, subtitle: e.target.value }))}
                />
              </div>
              <div className="stackField">
                <label>Caption</label>
                <input
                  value={soundwave.caption}
                  onChange={(e) => setSoundwave((v) => ({ ...v, caption: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="panelBlock softB contentCard">
            <div className="cardTitleWrap">
              <p className="cardEyebrow">Wave</p>
              <h3 className="cardTitle">Soundwave Controls</h3>
            </div>
            <div className="waveStyleGrid">
              {WAVE_STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`waveStyleBtn ${soundwave.waveStyle === opt.key ? 'active' : ''}`}
                  onClick={() => setSoundwave((v) => ({ ...v, waveStyle: opt.key }))}
                  title={opt.hint}
                >
                  <span className="waveStyleTitle">{opt.label}</span>
                  <span className="waveStyleHint">{opt.hint}</span>
                </button>
              ))}
            </div>
            <div className="ringControlGrid">
              <div className="stackField controlTile">
                <label>Wave Height</label>
                <div className="spinbox">
                  <input
                    className="spinboxInput"
                    type="number"
                    min={0.4}
                    max={1.6}
                    step={0.1}
                    value={Number(soundwave.waveHeight.toFixed(1))}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isFinite(n)) return;
                      setSoundwave((v) => ({ ...v, waveHeight: Math.max(0.4, Math.min(1.6, Math.round(n * 10) / 10)) }));
                    }}
                  />
                  <div className="spinboxButtons">
                    <button
                      type="button"
                      className="spinboxBtn"
                      onClick={() =>
                        setSoundwave((v) => ({
                          ...v,
                          waveHeight: Math.max(0.4, Math.min(1.6, Math.round((v.waveHeight + 0.1) * 10) / 10))
                        }))
                      }
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="spinboxBtn"
                      onClick={() =>
                        setSoundwave((v) => ({
                          ...v,
                          waveHeight: Math.max(0.4, Math.min(1.6, Math.round((v.waveHeight - 0.1) * 10) / 10))
                        }))
                      }
                    >
                      -
                    </button>
                  </div>
                </div>
              </div>

              <div className="stackField controlTile">
                <label>Line Thickness</label>
                <div className="spinbox">
                  <input
                    className="spinboxInput"
                    type="number"
                    min={0.6}
                    max={8}
                    step={0.1}
                    value={Number(soundwave.waveThickness.toFixed(1))}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isFinite(n)) return;
                      setSoundwave((v) => ({
                        ...v,
                        waveThickness: Math.max(0.6, Math.min(8, Math.round(n * 10) / 10))
                      }));
                    }}
                  />
                  <div className="spinboxButtons">
                    <button
                      type="button"
                      className="spinboxBtn"
                      onClick={() =>
                        setSoundwave((v) => ({
                          ...v,
                          waveThickness: Math.max(0.6, Math.min(8, Math.round((v.waveThickness + 0.1) * 10) / 10))
                        }))
                      }
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="spinboxBtn"
                      onClick={() =>
                        setSoundwave((v) => ({
                          ...v,
                          waveThickness: Math.max(0.6, Math.min(8, Math.round((v.waveThickness - 0.1) * 10) / 10))
                        }))
                      }
                    >
                      -
                    </button>
                  </div>
                </div>
              </div>

              <div className="stackField controlTile">
                <label>Opacity</label>
                <div className="spinbox">
                  <input
                    className="spinboxInput"
                    type="number"
                    min={0.2}
                    max={1}
                    step={0.05}
                    value={Number(soundwave.waveformOpacity.toFixed(2))}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isFinite(n)) return;
                      setSoundwave((v) => ({ ...v, waveformOpacity: Math.max(0.2, Math.min(1, n)) }));
                    }}
                  />
                  <div className="spinboxButtons">
                    <button
                      type="button"
                      className="spinboxBtn"
                      onClick={() =>
                        setSoundwave((v) => ({ ...v, waveformOpacity: Math.max(0.2, Math.min(1, v.waveformOpacity + 0.05)) }))
                      }
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="spinboxBtn"
                      onClick={() =>
                        setSoundwave((v) => ({ ...v, waveformOpacity: Math.max(0.2, Math.min(1, v.waveformOpacity - 0.05)) }))
                      }
                    >
                      -
                    </button>
                  </div>
                </div>
              </div>

              <div className="stackField controlTile">
                <label>Poster Frame</label>
                <button
                  type="button"
                  className={`surfaceToggleBtn ${soundwave.showFrame ? 'active' : ''}`}
                  onClick={() => setSoundwave((v) => ({ ...v, showFrame: !v.showFrame }))}
                >
                  {soundwave.showFrame ? 'Frame On' : 'Frame Off'}
                </button>
              </div>
            </div>
          </div>

          <div className="panelBlock checkoutCard">
            <button type="button" className="checkoutBtn" onClick={() => void handleCheckout()} disabled={checkoutBusy}>
              {checkoutBusy ? 'Preparing...' : 'Checkout'}
            </button>
          </div>

          {error ? <p className="error">{error}</p> : null}
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
          grid-template-columns: auto 1fr;
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
          border: 1px solid rgba(220, 233, 255, 0.7);
          border-radius: 50%;
          background: radial-gradient(circle at 32% 25%, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0.02) 42%),
            linear-gradient(145deg, #141d33 0%, #0d172b 100%);
          position: relative;
          display: grid;
          place-items: center;
          box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.1),
            0 8px 18px rgba(2, 8, 23, 0.35);
        }

        .soundwaveLogo::before {
          content: '';
          position: absolute;
          inset: 5px;
          border-radius: 50%;
          border: 1px solid rgba(189, 210, 255, 0.4);
          box-shadow: inset 0 0 0 1px rgba(125, 211, 252, 0.12);
        }

        .soundwaveBars {
          width: 22px;
          height: 16px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 1.5px;
          z-index: 2;
        }

        .soundwaveBars i {
          display: block;
          width: 2px;
          border-radius: 999px;
          background: linear-gradient(180deg, #e0eeff 0%, #9bc1ff 48%, #6a84cc 100%);
          box-shadow: 0 0 3px rgba(125, 211, 252, 0.35);
        }

        .soundwaveBars i:nth-child(1),
        .soundwaveBars i:nth-child(9) {
          height: 4px;
        }

        .soundwaveBars i:nth-child(2),
        .soundwaveBars i:nth-child(8) {
          height: 6px;
        }

        .soundwaveBars i:nth-child(3),
        .soundwaveBars i:nth-child(7) {
          height: 9px;
        }

        .soundwaveBars i:nth-child(4),
        .soundwaveBars i:nth-child(6) {
          height: 12px;
        }

        .soundwaveBars i:nth-child(5) {
          height: 15px;
          background: linear-gradient(180deg, #dffbff 0%, #8dd8ff 45%, #f4b466 100%);
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

        .frameSection {
          border: 1px solid #dacced;
          border-radius: 12px;
          background: #fcf9ff;
          padding: 10px;
          gap: 8px;
        }

        .sizeCardLabel {
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #6d5a8e;
          font-weight: 700;
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

        .tinyLabel {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #7d6a9c;
          font-weight: 700;
        }

        .mediaModeGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .spotifyCodeRow {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .inlineChoiceRow {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .modeBtn {
          min-height: 34px;
          border-radius: 10px;
          border: 1px solid #c8b9de;
          background: #fff;
          color: #4d356f;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          padding: 0 8px;
        }

        .modeBtn.active {
          border-color: #7b56c1;
          box-shadow: inset 0 0 0 1px #7b56c1;
          background: #f8f4ff;
          color: #4d2f83;
        }

        .lyricsSection {
          display: grid;
          gap: 8px;
          border: 1px solid #dacced;
          border-radius: 12px;
          background: #fcf9ff;
          padding: 10px;
        }

        .contentGrid {
          display: grid;
          gap: 10px;
        }

        .waveStyleGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .waveStyleBtn {
          min-height: 58px;
          border-radius: 10px;
          border: 1px solid #d7ceeb;
          background: #fff;
          color: #2f2447;
          padding: 8px;
          display: grid;
          align-content: center;
          justify-items: start;
          gap: 2px;
          cursor: pointer;
          text-align: left;
        }

        .waveStyleBtn.active {
          border-color: #7b56c1;
          box-shadow: inset 0 0 0 1px #7b56c1;
          background: #f8f4ff;
          color: #4d2f83;
        }

        .waveStyleTitle {
          font-size: 12px;
          font-weight: 700;
          line-height: 1.2;
        }

        .waveStyleHint {
          font-size: 10px;
          color: #706186;
          line-height: 1.25;
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
        }

        .lyricsCaseBtn.active {
          border-color: #7b56c1;
          box-shadow: inset 0 0 0 1px #7b56c1;
          background: #f8f4ff;
          color: #4d2f83;
        }

        .checkoutCard {
          background: #eef3f9;
          border-color: #d0dae8;
        }

        label {
          font-size: 14px;
          font-weight: 600;
          color: #1c1f27;
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

        .dashedInput {
          width: 100%;
          min-height: 46px;
          border-radius: 14px;
          border: 1px solid #c8b9de;
          background: #fff;
          padding: 0 14px;
          font-size: 13px;
          color: #2d2046;
          font-family: 'Signika', ui-sans-serif, system-ui;
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
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.75),
            0 4px 10px rgba(26, 20, 43, 0.14);
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
          border: 1px solid rgba(15, 18, 28, 0.2);
          box-shadow:
            inset 0 2px 4px rgba(255, 255, 255, 0.38),
            inset 0 -4px 6px rgba(0, 0, 0, 0.2);
        }

        .fontOptionGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .fontOptionBtn {
          min-height: 68px;
          border: 1px solid #cebddd;
          border-radius: 12px;
          background: #fff;
          padding: 7px 9px;
          display: grid;
          gap: 2px;
          align-content: center;
          text-align: left;
          cursor: pointer;
        }

        .fontOptionBtn.active {
          border-color: #7b56c1;
          box-shadow: inset 0 0 0 1px #7b56c1;
          background: #f8f4ff;
        }

        .fontGlyph {
          font-size: 20px;
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
          font-size: 18px;
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

        .surfaceToggleBtn {
          min-height: 36px;
          border-radius: 10px;
          border: 1px solid #c8b9de;
          background: #fff;
          color: #4d356f;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .surfaceToggleBtn.active {
          border-color: #7b56c1;
          box-shadow: inset 0 0 0 1px #7b56c1;
          background: #f8f4ff;
          color: #4d2f83;
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

        .uploadBtn {
          min-height: 40px;
          border-radius: 10px;
          border: 1px solid #7b56c1;
          color: #4d2f83;
          background: #f4effd;
          font-size: 13px;
          font-weight: 600;
          padding: 0 12px;
          cursor: pointer;
        }

        .uploadBtn:disabled {
          opacity: 0.8;
          cursor: wait;
        }

        .ghostBtn {
          min-height: 40px;
          border-radius: 10px;
          border: 1px solid #c8b9de;
          color: #4d356f;
          background: #fff;
          font-size: 13px;
          font-weight: 600;
          padding: 0 12px;
          cursor: pointer;
        }

        .checkoutBtn {
          min-height: 48px;
          border-radius: 12px;
          border: 1px solid #1f2f4d;
          background: linear-gradient(180deg, #0f172a 0%, #111e35 100%);
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 0.01em;
          cursor: pointer;
        }

        .checkoutBtn:disabled {
          opacity: 0.72;
          cursor: wait;
        }

        .microHint {
          margin: 0;
          font-size: 12px;
          color: #6d7076;
        }

        .error {
          margin: 0;
          color: #b91c1c;
          font-size: 13px;
          background: #fff1f2;
          border: 1px solid #fecdd3;
          border-radius: 10px;
          padding: 10px 12px;
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

          .ringControlGrid {
            grid-template-columns: 1fr;
          }

          .waveStyleGrid {
            grid-template-columns: 1fr;
          }

          .fontOptionGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .palettePicker.expanded {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .mediaModeGrid {
            grid-template-columns: 1fr;
          }

          .inlineChoiceRow {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
