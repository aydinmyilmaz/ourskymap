'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PosterParams } from '../../lib/types';
import type { CityMapRequest } from '../../lib/citymap';
import { CHECKOUT_DRAFT_KEY, type CheckoutDraft } from '../../lib/checkout';

type CitySize = 'a2' | 'us-letter' | '16x20' | '18x24';
type FontPresetKey =
  | 'urban-sans'
  | 'poster-bold'
  | 'elegant-serif'
  | 'high-contrast'
  | 'mono-modern'
  | 'signature'
  | 'atlas'
  | 'timeless';
type BaseStyleKey = 'streets' | 'light' | 'dark';
type TextStyleKey = 'simplified' | 'uppercase' | 'classic';
type PinChoiceKey = 'none' | 'classic' | 'love' | 'pushpin' | 'heart' | 'cross' | 'home' | 'graduation';
type MapShapeKey = 'rectangle' | 'circle';
type MapThemeKey =
  | 'classic'
  | 'ice-blue'
  | 'black'
  | 'grey'
  | 'light-blue'
  | 'dark-blue'
  | 'green'
  | 'light-green'
  | 'retro'
  | 'retro-2'
  | 'beige'
  | 'pink'
  | 'navy'
  | 'military'
  | 'sunset'
  | 'arctic'
  | 'rosewood'
  | 'desert-gold'
  | 'violet-night'
  | 'ember';

type GeocodeResult = {
  lat: number;
  lon: number;
  label: string;
};

type MapPreviewColors = {
  bg: string;
  water: string;
  motorway: string;
  primary: string;
  minor: string;
  building: string;
};

type PreviewCacheEntry = {
  version: 3;
  svg: string;
  mapThemeKey: MapThemeKey;
  baseStyle: BaseStyleKey;
  mapShape: MapShapeKey;
};

const MAPBOX_BASE_STYLES: Record<BaseStyleKey, string> = {
  streets: 'mapbox://styles/mapbox/streets-v11',
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11'
};

const MIN_MAP_ZOOM = 10;
const MAX_MAP_ZOOM = 18;
const DEFAULT_MAP_ZOOM = 12;
const ZOOM_WARNING_THRESHOLD = 11;
const PREVIEW_POSTER_SIZE: CitySize = '16x20';
const PREVIEW_CACHE_KEY = 'citymap_preview_cache_v3';
const RESUME_AFTER_CHECKOUT_KEY = 'citymap_resume_after_checkout_v1';
const BACKGROUND_COLLAPSED_COUNT = 8;
const MAP_THEME_COLLAPSED_COUNT = 8;
const PREVIEW_VIEWBOX_W = 16 * 72;
const PREVIEW_VIEWBOX_H = 20 * 72;
const PREVIEW_FRAME_INSET = 14;
const PREVIEW_MARGIN = 72;
const PREVIEW_CHART_TOP_OFFSET = 18;
const PREVIEW_MAP_X = PREVIEW_MARGIN + PREVIEW_FRAME_INSET;
const PREVIEW_MAP_Y = PREVIEW_MARGIN + PREVIEW_FRAME_INSET + PREVIEW_CHART_TOP_OFFSET;
const PREVIEW_MAP_W = PREVIEW_VIEWBOX_W - 2 * (PREVIEW_MARGIN + PREVIEW_FRAME_INSET);
const PREVIEW_MAP_H = Math.max(220, PREVIEW_VIEWBOX_H * 0.57);
const PREVIEW_CIRCLE_RADIUS_SCALE = 0.97;
const PREVIEW_CIRCLE_SHIFT_RATIO = 0.03;
const MERCATOR_MAX_LAT = 85.05112878;

const PRESET_MAP_COLORS: Record<'minimal' | 'blueprint' | 'sepia', MapPreviewColors> = {
  minimal: {
    bg: '#aeb6af',
    water: '#f0f0f0',
    motorway: '#3b3b3b',
    primary: '#565656',
    minor: '#8c8c8c',
    building: '#dfdfdf'
  },
  blueprint: {
    bg: '#0f1730',
    water: '#1a2c5a',
    motorway: '#f6f8ff',
    primary: '#c4d3ff',
    minor: '#90a5e7',
    building: '#273c76'
  },
  sepia: {
    bg: '#f3e8d8',
    water: '#d7c8b1',
    motorway: '#3a2b1f',
    primary: '#5d4736',
    minor: '#8e7762',
    building: '#e7d7bf'
  }
};

const SIZE_PRESETS: { key: CitySize; title: string; sub: string; compact?: boolean }[] = [
  { key: 'a2', title: 'A2', sub: '420 x 594 mm' },
  { key: 'us-letter', title: 'US Letter', sub: '8.5 x 11 in', compact: true },
  { key: '16x20', title: '16 x 20', sub: '16 x 20 in', compact: true },
  { key: '18x24', title: '18 x 24', sub: '18 x 24 in', compact: true }
];

const FONT_PRESETS: { key: FontPresetKey; label: string }[] = [
  { key: 'urban-sans', label: 'Aa' },
  { key: 'poster-bold', label: 'Aa' },
  { key: 'elegant-serif', label: 'Aa' },
  { key: 'high-contrast', label: 'Aa' },
  { key: 'mono-modern', label: 'Aa' },
  { key: 'signature', label: 'Aa' },
  { key: 'atlas', label: 'Aa' },
  { key: 'timeless', label: 'AA' }
];

const CITY_PALETTES: { key: PosterParams['palette']; label: string; bg: string; ink: string; tone: 'dark' | 'light' }[] = [
  { key: 'sand', label: 'Sand', bg: '#f7f3e8', ink: '#1b1b1b', tone: 'light' },
  { key: 'pearl', label: 'Pearl', bg: '#f2f0ea', ink: '#202020', tone: 'light' },
  { key: 'cream-ink', label: 'Cream', bg: '#fbf5ea', ink: '#1b1b1b', tone: 'light' },
  { key: 'slate', label: 'Slate', bg: '#111827', ink: '#d9d9d9', tone: 'dark' },
  { key: 'storm-gray', label: 'Storm', bg: '#2a2f39', ink: '#e8e9ee', tone: 'dark' },
  { key: 'midnight', label: 'Midnight', bg: '#0b1020', ink: '#ffffff', tone: 'dark' },
  { key: 'soft-sage', label: 'Sage', bg: '#25352f', ink: '#d8e7de', tone: 'dark' },
  { key: 'blush-night', label: 'Blush', bg: '#3a2733', ink: '#f5d7e2', tone: 'dark' },
  { key: 'twilight-blue', label: 'Twilight', bg: '#1f2a44', ink: '#d7e3ff', tone: 'dark' },
  { key: 'mocha', label: 'Mocha', bg: '#3b2d2a', ink: '#f2d8c8', tone: 'dark' },
  { key: 'forest', label: 'Forest', bg: '#0e1f16', ink: '#d9d9d9', tone: 'dark' },
  { key: 'emerald', label: 'Emerald', bg: '#0b3d2e', ink: '#d9d9d9', tone: 'dark' },
  { key: 'plum', label: 'Plum', bg: '#1c1230', ink: '#d9d9d9', tone: 'dark' },
  { key: 'burgundy', label: 'Burgundy', bg: '#2a0f1a', ink: '#d9d9d9', tone: 'dark' },
  { key: 'classic-black', label: 'Classic', bg: '#0b0b0d', ink: '#f6f6f7', tone: 'dark' }
];

const BACKGROUND_OPTIONS: PosterParams['palette'][] = [
  'sand',
  'pearl',
  'cream-ink',
  'classic-black',
  'midnight',
  'twilight-blue',
  'storm-gray',
  'slate',
  'soft-sage',
  'blush-night',
  'mocha',
  'forest',
  'emerald',
  'plum',
  'burgundy'
];

const PIN_OPTIONS: { key: PinChoiceKey; label: string; glyph: string }[] = [
  { key: 'none', label: 'no pin', glyph: 'no pin' },
  { key: 'classic', label: 'pin', glyph: '📍' },
  { key: 'love', label: 'love', glyph: '💗' },
  { key: 'pushpin', label: 'push', glyph: '📌' },
  { key: 'heart', label: 'heart', glyph: '❤' },
  { key: 'cross', label: 'cross', glyph: '✕' },
  { key: 'home', label: 'home', glyph: '⌂' },
  { key: 'graduation', label: 'grad', glyph: '🎓' }
];

const TEXT_STYLE_OPTIONS: { key: TextStyleKey; label: string }[] = [
  { key: 'simplified', label: 'Simplified' },
  { key: 'uppercase', label: 'Uppercase' },
  { key: 'classic', label: 'Classic' }
];

const MAP_SHAPE_OPTIONS: { key: MapShapeKey; label: string }[] = [
  { key: 'rectangle', label: 'Rectangle' },
  { key: 'circle', label: 'Circle' }
];

const FONT_CARD_STYLE: Record<FontPresetKey, string> = {
  'urban-sans': "'Signika', 'Montserrat', ui-sans-serif, system-ui",
  'poster-bold': "'Arial Black', Impact, sans-serif",
  'elegant-serif': "'Prata', Georgia, serif",
  'high-contrast': "Didot, 'Bodoni MT', 'Times New Roman', serif",
  'mono-modern': "'IBM Plex Mono', 'JetBrains Mono', ui-monospace, monospace",
  signature: 'Great Vibes, Allura, Brush Script MT, cursive',
  atlas: "'Garamond', 'Palatino Linotype', serif",
  timeless: "'Times New Roman', Georgia, serif"
};

const MAP_THEME_OPTIONS: {
  key: MapThemeKey;
  label: string;
  swatchA: string;
  swatchB: string;
  stroke: string;
  baseStyle: BaseStyleKey;
  colors: MapPreviewColors;
  motorwayWidth: number;
  primaryRoadWidth: number;
  minorRoadWidth: number;
}[] = [
  {
    key: 'classic',
    label: 'Classic',
    swatchA: '#ececec',
    swatchB: '#f8f8f8',
    stroke: '#1f1f1f',
    baseStyle: 'streets',
    colors: PRESET_MAP_COLORS.minimal,
    motorwayWidth: 5.9,
    primaryRoadWidth: 3.4,
    minorRoadWidth: 1.15
  },
  {
    key: 'ice-blue',
    label: 'Ice Blue',
    swatchA: '#c9dadd',
    swatchB: '#eef5f6',
    stroke: '#212121',
    baseStyle: 'light',
    colors: { bg: '#dbe7ea', water: '#f2f6f8', motorway: '#2d2d2d', primary: '#5b6165', minor: '#9ea6ab', building: '#d9e4e7' },
    motorwayWidth: 5.6,
    primaryRoadWidth: 3.1,
    minorRoadWidth: 1.2
  },
  {
    key: 'black',
    label: 'Black',
    swatchA: '#e8e8e8',
    swatchB: '#2f2f2f',
    stroke: '#f2f2f2',
    baseStyle: 'streets',
    colors: { bg: '#efefef', water: '#f7f7f7', motorway: '#222', primary: '#3f3f3f', minor: '#8f8f8f', building: '#dbdbdb' },
    motorwayWidth: 6.0,
    primaryRoadWidth: 3.5,
    minorRoadWidth: 1.2
  },
  {
    key: 'grey',
    label: 'Grey',
    swatchA: '#bfd2d6',
    swatchB: '#5a5d61',
    stroke: '#f2f2f2',
    baseStyle: 'streets',
    colors: { bg: '#cfd8d7', water: '#e7eeee', motorway: '#5a5d61', primary: '#777d82', minor: '#9da3a8', building: '#dde4e3' },
    motorwayWidth: 5.8,
    primaryRoadWidth: 3.3,
    minorRoadWidth: 1.2
  },
  {
    key: 'light-blue',
    label: 'Light blue',
    swatchA: '#ffffff',
    swatchB: '#7ba8c4',
    stroke: '#ffffff',
    baseStyle: 'light',
    colors: { bg: '#e8f0f5', water: '#f8fbff', motorway: '#5d7892', primary: '#7ba8c4', minor: '#9bb9cd', building: '#e2edf5' },
    motorwayWidth: 5.5,
    primaryRoadWidth: 3.2,
    minorRoadWidth: 1.1
  },
  {
    key: 'dark-blue',
    label: 'Dark Blue',
    swatchA: '#2f4e61',
    swatchB: '#1a4958',
    stroke: '#f0f0f0',
    baseStyle: 'dark',
    colors: { bg: '#2b4655', water: '#24404f', motorway: '#dce7ed', primary: '#9bb2c0', minor: '#6f8795', building: '#375868' },
    motorwayWidth: 5.3,
    primaryRoadWidth: 3.0,
    minorRoadWidth: 1.1
  },
  {
    key: 'green',
    label: 'Green',
    swatchA: '#124e4a',
    swatchB: '#337f82',
    stroke: '#f1f1f1',
    baseStyle: 'dark',
    colors: { bg: '#214f4f', water: '#275d5d', motorway: '#dfe8e6', primary: '#9fc8c0', minor: '#78a39e', building: '#2d6664' },
    motorwayWidth: 5.4,
    primaryRoadWidth: 3.1,
    minorRoadWidth: 1.2
  },
  {
    key: 'light-green',
    label: 'Light Green',
    swatchA: '#a9b9a4',
    swatchB: '#d7d4ce',
    stroke: '#8aa182',
    baseStyle: 'light',
    colors: { bg: '#dde2d6', water: '#eef1eb', motorway: '#657a60', primary: '#7f9480', minor: '#9fb19d', building: '#d0d8cd' },
    motorwayWidth: 5.2,
    primaryRoadWidth: 3.0,
    minorRoadWidth: 1.1
  },
  {
    key: 'retro',
    label: 'Retro',
    swatchA: '#1fa2a0',
    swatchB: '#e9e1c2',
    stroke: '#ff4d4d',
    baseStyle: 'streets',
    colors: { bg: '#efe5cb', water: '#34b5ad', motorway: '#ff5f5f', primary: '#ff7b71', minor: '#d39c77', building: '#f3ecd8' },
    motorwayWidth: 4.2,
    primaryRoadWidth: 2.0,
    minorRoadWidth: 0.45
  },
  {
    key: 'retro-2',
    label: 'Retro 2',
    swatchA: '#9fc2b8',
    swatchB: '#efe9df',
    stroke: '#d08f71',
    baseStyle: 'streets',
    colors: { bg: '#efe8dd', water: '#9fc2b8', motorway: '#ca8f71', primary: '#a0896e', minor: '#c5b197', building: '#f4eee7' },
    motorwayWidth: 5.4,
    primaryRoadWidth: 3.1,
    minorRoadWidth: 1.1
  },
  {
    key: 'beige',
    label: 'Beige',
    swatchA: '#e5e1de',
    swatchB: '#f7f5f2',
    stroke: '#3f3f3f',
    baseStyle: 'light',
    colors: { bg: '#ede8e3', water: '#f5f1ec', motorway: '#3f3f3f', primary: '#6f6f6f', minor: '#9d9d9d', building: '#e1ddd8' },
    motorwayWidth: 5.4,
    primaryRoadWidth: 3.1,
    minorRoadWidth: 1.1
  },
  {
    key: 'pink',
    label: 'Pink',
    swatchA: '#f0eef2',
    swatchB: '#e9cdd7',
    stroke: '#c1456d',
    baseStyle: 'light',
    colors: { bg: '#f3e7ec', water: '#f7f0f3', motorway: '#b6496c', primary: '#cf6f8f', minor: '#dca2b8', building: '#ecd9e2' },
    motorwayWidth: 5.0,
    primaryRoadWidth: 2.8,
    minorRoadWidth: 1.0
  },
  {
    key: 'navy',
    label: 'Navy',
    swatchA: '#f2c94c',
    swatchB: '#1a2a54',
    stroke: '#ffffff',
    baseStyle: 'dark',
    colors: {
      bg: '#0f1d44',
      water: '#f2c94c',
      motorway: '#ffffff',
      primary: '#ffffff',
      minor: '#ffffff',
      building: '#2a3f73'
    },
    motorwayWidth: 5.6,
    primaryRoadWidth: 3.1,
    minorRoadWidth: 1.1
  },
  {
    key: 'military',
    label: 'Military',
    swatchA: '#4c747b',
    swatchB: '#7f8d83',
    stroke: '#dbd2c8',
    baseStyle: 'dark',
    colors: { bg: '#5a7477', water: '#6f898c', motorway: '#ddd2c5', primary: '#c2b3a1', minor: '#9fa79c', building: '#6a8385' },
    motorwayWidth: 5.5,
    primaryRoadWidth: 3.0,
    minorRoadWidth: 1.1
  },
  {
    key: 'sunset',
    label: 'Sunset',
    swatchA: '#ffe2d1',
    swatchB: '#ff7f6b',
    stroke: '#9f2f2f',
    baseStyle: 'light',
    colors: { bg: '#ffeede', water: '#f8c6a7', motorway: '#d4544a', primary: '#e27365', minor: '#c79d8a', building: '#fff5ea' },
    motorwayWidth: 5.2,
    primaryRoadWidth: 2.9,
    minorRoadWidth: 1.0
  },
  {
    key: 'arctic',
    label: 'Arctic',
    swatchA: '#e9f5fb',
    swatchB: '#89b8d2',
    stroke: '#2e4c5f',
    baseStyle: 'light',
    colors: { bg: '#edf7fd', water: '#d4ebf6', motorway: '#385b70', primary: '#668ea5', minor: '#9db7c7', building: '#e7f1f7' },
    motorwayWidth: 5.7,
    primaryRoadWidth: 3.2,
    minorRoadWidth: 1.1
  },
  {
    key: 'rosewood',
    label: 'Rosewood',
    swatchA: '#efe4e7',
    swatchB: '#6d2f3d',
    stroke: '#31131e',
    baseStyle: 'dark',
    colors: { bg: '#6d2f3d', water: '#4c1f2a', motorway: '#f3ecef', primary: '#d7c1c8', minor: '#a98891', building: '#7f4151' },
    motorwayWidth: 5.4,
    primaryRoadWidth: 3.0,
    minorRoadWidth: 1.05
  },
  {
    key: 'desert-gold',
    label: 'Desert',
    swatchA: '#ecd8ab',
    swatchB: '#7f5e2d',
    stroke: '#3e2c14',
    baseStyle: 'streets',
    colors: { bg: '#efe0bc', water: '#d4bf8e', motorway: '#5f4622', primary: '#8f6a34', minor: '#b89966', building: '#e7d6af' },
    motorwayWidth: 5.3,
    primaryRoadWidth: 3.0,
    minorRoadWidth: 1.1
  },
  {
    key: 'violet-night',
    label: 'Violet',
    swatchA: '#2a2248',
    swatchB: '#7a6ccf',
    stroke: '#f1edff',
    baseStyle: 'dark',
    colors: { bg: '#2a2248', water: '#3b3263', motorway: '#e8e3ff', primary: '#bdb2ef', minor: '#8e84c7', building: '#3f3668' },
    motorwayWidth: 5.5,
    primaryRoadWidth: 3.0,
    minorRoadWidth: 1.1
  },
  {
    key: 'ember',
    label: 'Ember',
    swatchA: '#2d2723',
    swatchB: '#d56f37',
    stroke: '#ffe9d9',
    baseStyle: 'dark',
    colors: { bg: '#2d2723', water: '#201b17', motorway: '#ffe9d9', primary: '#e9b08f', minor: '#b98d71', building: '#3d3530' },
    motorwayWidth: 5.6,
    primaryRoadWidth: 3.1,
    minorRoadWidth: 1.15
  }
];

const CITY_SIZE_KEYS: CitySize[] = ['a2', 'us-letter', '16x20', '18x24'];
const FONT_PRESET_KEYS: FontPresetKey[] = [
  'urban-sans',
  'poster-bold',
  'elegant-serif',
  'high-contrast',
  'mono-modern',
  'signature',
  'atlas',
  'timeless'
];
const TEXT_STYLE_KEYS: TextStyleKey[] = ['simplified', 'uppercase', 'classic'];
const MAP_SHAPE_KEYS: MapShapeKey[] = ['rectangle', 'circle'];
const PIN_CHOICE_KEYS: PinChoiceKey[] = ['none', 'classic', 'love', 'pushpin', 'heart', 'cross', 'home', 'graduation'];
const MAP_THEME_KEYS: MapThemeKey[] = [
  'classic',
  'ice-blue',
  'black',
  'grey',
  'light-blue',
  'dark-blue',
  'green',
  'light-green',
  'retro',
  'retro-2',
  'beige',
  'pink',
  'navy',
  'military',
  'sunset',
  'arctic',
  'rosewood',
  'desert-gold',
  'violet-night',
  'ember'
];
const BASE_STYLE_KEYS: BaseStyleKey[] = ['streets', 'light', 'dark'];

function includesValue<T extends string>(arr: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (arr as readonly string[]).includes(value);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function findPalette(paletteKey: PosterParams['palette']) {
  return CITY_PALETTES.find((p) => p.key === paletteKey) ?? CITY_PALETTES[0];
}

function mapFontPreset(fontPreset: FontPresetKey): {
  titleFont: 'prata' | 'serif' | 'sans' | 'mono';
  namesFont: 'jimmy-script' | 'serif' | 'sans';
  metaFont: 'signika' | 'serif' | 'sans' | 'mono';
} {
  switch (fontPreset) {
    case 'signature':
      return { titleFont: 'prata', namesFont: 'jimmy-script', metaFont: 'signika' };
    case 'elegant-serif':
    case 'high-contrast':
    case 'atlas':
    case 'timeless':
      return { titleFont: 'serif', namesFont: 'serif', metaFont: 'serif' };
    case 'poster-bold':
    case 'urban-sans':
      return { titleFont: 'sans', namesFont: 'sans', metaFont: 'sans' };
    case 'mono-modern':
      return { titleFont: 'mono', namesFont: 'sans', metaFont: 'mono' };
    default:
      return { titleFont: 'sans', namesFont: 'sans', metaFont: 'sans' };
  }
}

function normalizePlaceLabel(label: string): string {
  const chunk = label
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  if (chunk.length === 0) return '';
  if (chunk.length === 1) return chunk[0];
  return `${chunk[0]}, ${chunk[chunk.length - 1]}`;
}

function formatCoordMeta(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${ns} - ${Math.abs(lon).toFixed(4)}° ${ew}`;
}

function clampLat(lat: number): number {
  return Math.max(-MERCATOR_MAX_LAT, Math.min(MERCATOR_MAX_LAT, lat));
}

function normalizeLon(lon: number): number {
  let n = lon;
  while (n > 180) n -= 360;
  while (n < -180) n += 360;
  return n;
}

function lngLatToWorld(lng: number, lat: number, zoom: number): { x: number; y: number; size: number } {
  const size = 512 * 2 ** zoom;
  const x = ((lng + 180) / 360) * size;
  const phi = (clampLat(lat) * Math.PI) / 180;
  const y = (0.5 - Math.log((1 + Math.sin(phi)) / (1 - Math.sin(phi))) / (4 * Math.PI)) * size;
  return { x, y, size };
}

function worldToLngLat(x: number, y: number, size: number): { lon: number; lat: number } {
  const lon = normalizeLon((x / size) * 360 - 180);
  const n = Math.PI - (2 * Math.PI * y) / size;
  const lat = clampLat((180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
  return { lon, lat };
}

function panCenterByPixels(centerLon: number, centerLat: number, zoom: number, dxPx: number, dyPx: number): { lon: number; lat: number } {
  const world = lngLatToWorld(centerLon, centerLat, zoom);
  const x = world.x - dxPx;
  const y = world.y - dyPx;
  return worldToLngLat(x, y, world.size);
}

function getPosterMapRenderSize(size: CitySize): { width: number; height: number } {
  const frameInset = 14;
  if (size === 'a2') {
    const mapW = 1191 - 2 * (96 + frameInset);
    const mapH = Math.max(220, 1684 * 0.57);
    return { width: 1200, height: Math.round((1200 * mapH) / mapW) };
  }
  if (size === 'us-letter') {
    const mapW = 612 - 2 * (46 + frameInset);
    const mapH = Math.max(220, 792 * 0.57);
    return { width: 980, height: Math.round((980 * mapH) / mapW) };
  }
  if (size === '18x24') {
    const mapW = 18 * 72 - 2 * (80 + frameInset);
    const mapH = Math.max(220, 24 * 72 * 0.57);
    return { width: 1200, height: Math.round((1200 * mapH) / mapW) };
  }
  const mapW = 16 * 72 - 2 * (72 + frameInset);
  const mapH = Math.max(220, 20 * 72 * 0.57);
  return { width: 1100, height: Math.round((1100 * mapH) / mapW) };
}

function getBaseTextSizes(targetSize: CitySize): { title: number; names: number; meta: number } {
  if (targetSize === 'us-letter') return { title: 34, names: 20, meta: 11 };
  if (targetSize === 'a2') return { title: 64, names: 34, meta: 18 };
  return { title: 50, names: 28, meta: 15 };
}

function layerFlags(layer: any) {
  const id = String(layer?.id || '').toLowerCase();
  const sourceLayer = String(layer?.['source-layer'] || '').toLowerCase();
  const filterText = JSON.stringify(layer?.filter ?? '').toLowerCase();
  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hasInIdOrSource = (...tokens: string[]) => tokens.some((token) => id.includes(token) || sourceLayer.includes(token));
  const hasInFilter = (...tokens: string[]) =>
    tokens.some((token) => new RegExp(`(^|[^a-z0-9_])${escapeRegex(token)}($|[^a-z0-9_])`, 'i').test(filterText));
  const hasAny = (...tokens: string[]) => hasInIdOrSource(...tokens) || hasInFilter(...tokens);

  const isMotorway = hasAny('motorway', 'trunk', 'motorway_link', 'trunk_link');
  const isPrimary = !isMotorway && hasAny('primary', 'secondary', 'primary_link', 'secondary_link');
  const isMinorRoad =
    !isMotorway &&
    !isPrimary &&
    hasAny(
      'tertiary',
      'tertiary_link',
      'road',
      'street',
      'path',
      'service',
      'track',
      'residential',
      'living_street',
      'pedestrian',
      'unclassified'
    );
  const isRoad = hasAny(
    'motorway',
    'trunk',
    'primary',
    'secondary',
    'tertiary',
    'road',
    'street',
    'path',
    'service',
    'track',
    'residential',
    'living_street',
    'pedestrian',
    'unclassified',
    'link'
  );

  return {
    isMotorway,
    isPrimary,
    isMinorRoad,
    isRoad,
    isWater: hasAny('water', 'waterway', 'marine'),
    isWaterLabel: hasAny('waterway-label', 'marine-label'),
    isBuilding: hasAny('building'),
    isBoundary: hasAny('boundary', 'admin'),
    isLand: hasAny('landuse', 'landcover', 'park', 'green')
  };
}

function widthExpr(base: number) {
  return ['interpolate', ['linear'], ['zoom'], 10, base * 0.5, 14, base * 1.15, 18, base * 2.45];
}

function roadClassWidthExpr(motorway: number, primary: number, minor: number) {
  const byClass = [
    'match',
    ['coalesce', ['get', 'class'], ['get', 'type'], ''],
    'motorway',
    motorway,
    'trunk',
    motorway,
    'motorway_link',
    motorway * 0.86,
    'trunk_link',
    motorway * 0.86,
    'primary',
    primary,
    'secondary',
    primary,
    'primary_link',
    primary * 0.9,
    'secondary_link',
    primary * 0.85,
    'tertiary',
    minor,
    'tertiary_link',
    minor * 0.9,
    'street',
    minor,
    'street_limited',
    minor * 0.92,
    'residential',
    minor,
    'living_street',
    minor * 0.9,
    'service',
    minor * 0.85,
    'track',
    minor * 0.78,
    'path',
    minor * 0.72,
    'pedestrian',
    minor * 0.78,
    'unclassified',
    minor,
    minor
  ];
  return ['interpolate', ['linear'], ['zoom'], 10, ['*', 0.5, byClass], 14, ['*', 1.15, byClass], 18, ['*', 2.45, byClass]];
}

function roadClassColorExpr(motorway: string, primary: string, minor: string) {
  return [
    'match',
    ['coalesce', ['get', 'class'], ['get', 'type'], ''],
    'motorway',
    motorway,
    'trunk',
    motorway,
    'motorway_link',
    motorway,
    'trunk_link',
    motorway,
    'primary',
    primary,
    'secondary',
    primary,
    'primary_link',
    primary,
    'secondary_link',
    primary,
    'tertiary',
    minor,
    'tertiary_link',
    minor,
    'street',
    minor,
    'street_limited',
    minor,
    'residential',
    minor,
    'living_street',
    minor,
    'service',
    minor,
    'track',
    minor,
    'path',
    minor,
    'pedestrian',
    minor,
    'unclassified',
    minor,
    minor
  ];
}

function parseHexColor(input: string): [number, number, number] | null {
  const hex = input.trim();
  if (!hex.startsWith('#')) return null;
  const body = hex.slice(1);
  if (body.length === 3) {
    const r = Number.parseInt(body[0] + body[0], 16);
    const g = Number.parseInt(body[1] + body[1], 16);
    const b = Number.parseInt(body[2] + body[2], 16);
    if ([r, g, b].some((x) => Number.isNaN(x))) return null;
    return [r, g, b];
  }
  if (body.length === 6) {
    const r = Number.parseInt(body.slice(0, 2), 16);
    const g = Number.parseInt(body.slice(2, 4), 16);
    const b = Number.parseInt(body.slice(4, 6), 16);
    if ([r, g, b].some((x) => Number.isNaN(x))) return null;
    return [r, g, b];
  }
  return null;
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function shiftColorTone(hex: string, darkness: number): string {
  const rgb = parseHexColor(hex);
  if (!rgb) return hex;
  const d = clamp(darkness, -1, 1);
  const [r, g, b] = rgb;
  if (d === 0) return hex;
  if (d > 0) {
    const t = d;
    return rgbToHex(r * (1 - t), g * (1 - t), b * (1 - t));
  }
  const t = -d;
  return rgbToHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
}

export default function CityMapPage() {
  const router = useRouter();
  const [size, setSize] = useState<CitySize>('16x20');
  const [frameOn, setFrameOn] = useState(true);
  const [palette, setPalette] = useState<PosterParams['palette']>('soft-sage');
  const [cityQuery, setCityQuery] = useState('New York, USA');
  const [locationLabel, setLocationLabel] = useState('New York, USA');
  const [lat, setLat] = useState(40.7128);
  const [lon, setLon] = useState(-74.006);
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [fontPreset, setFontPreset] = useState<FontPresetKey>('urban-sans');
  const [textStyle, setTextStyle] = useState<TextStyleKey>('simplified');
  const [mapShape, setMapShape] = useState<MapShapeKey>('rectangle');
  const [pinChoice, setPinChoice] = useState<PinChoiceKey>('none');
  const [mapThemeKey, setMapThemeKey] = useState<MapThemeKey>('classic');
  const [pendingAction, setPendingAction] = useState<null | 'map-theme' | 'background'>(null);
  const [title, setTitle] = useState('New York');
  const [subtitle, setSubtitle] = useState('United States');
  const [textScalePercent, setTextScalePercent] = useState(100);
  const [textYOffset, setTextYOffset] = useState(0);
  const [zoom, setZoom] = useState(DEFAULT_MAP_ZOOM);
  const [baseStyle, setBaseStyle] = useState<BaseStyleKey>('streets');
  const [mapColors, setMapColors] = useState<MapPreviewColors>(PRESET_MAP_COLORS.minimal);
  const [motorwayWidth, setMotorwayWidth] = useState(5.9);
  const [primaryRoadWidth, setPrimaryRoadWidth] = useState(3.4);
  const [minorRoadWidth, setMinorRoadWidth] = useState(1.15);
  const [motorwayTone, setMotorwayTone] = useState(0);
  const [primaryTone, setPrimaryTone] = useState(0);
  const [minorTone, setMinorTone] = useState(0);
  const [posterSvg, setPosterSvg] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [error, setError] = useState('');
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [hydrationDone, setHydrationDone] = useState(false);
  const [backgroundExpanded, setBackgroundExpanded] = useState(false);
  const [mapThemesExpanded, setMapThemesExpanded] = useState(false);
  const latestRequestRef = useRef(0);
  const hiddenMapsRef = useRef<Partial<Record<BaseStyleKey, any>>>({});
  const hiddenMapContainersRef = useRef<Partial<Record<BaseStyleKey, HTMLDivElement>>>({});
  const lastSnapshotStateRef = useRef<{
    baseStyle: BaseStyleKey;
    lon: number;
    lat: number;
    zoom: number;
    paintSig: string;
  } | null>(null);
  const prewarmedStylesRef = useRef(false);
  const mapboxModuleRef = useRef<any | null>(null);
  const mapboxTokenRef = useRef<string | null>(null);
  const initialGenerateSkipRef = useRef(false);
  const paperRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startLon: number;
    startLat: number;
    svgWidth: number;
    svgHeight: number;
  } | null>(null);

  const selectedPalette = useMemo(() => findPalette(palette), [palette]);
  const effectiveTheme = selectedPalette.tone;

  const previewBg = useMemo(
    () =>
      effectiveTheme === 'dark'
        ? 'radial-gradient(1200px 700px at 50% 30%, #eceff3 0%, #d8dde5 55%, #ced4de 100%)'
        : 'radial-gradient(1200px 700px at 50% 30%, #ffffff 0%, #f4f5f6 55%, #eceeef 100%)',
    [effectiveTheme]
  );

  const roadColors = useMemo(
    () => ({
      motorway: shiftColorTone(mapColors.motorway, motorwayTone / 100),
      primary: shiftColorTone(mapColors.primary, primaryTone / 100),
      minor: shiftColorTone(mapColors.minor, minorTone / 100)
    }),
    [mapColors.minor, mapColors.motorway, mapColors.primary, minorTone, motorwayTone, primaryTone]
  );

  const visibleBackgroundOptions = useMemo(
    () => (backgroundExpanded ? BACKGROUND_OPTIONS : BACKGROUND_OPTIONS.slice(0, BACKGROUND_COLLAPSED_COUNT)),
    [backgroundExpanded]
  );
  const visibleMapThemes = useMemo(
    () => (mapThemesExpanded ? MAP_THEME_OPTIONS : MAP_THEME_OPTIONS.slice(0, MAP_THEME_COLLAPSED_COUNT)),
    [mapThemesExpanded]
  );

  useEffect(() => {
    try {
      // Remove old preview keys that could contain non-minimal legacy render output.
      window.localStorage.removeItem('citymap_preview_svg_v1');
      window.localStorage.removeItem('citymap_preview_svg_v2');

      let restoredFromCheckout = false;
      const shouldResumeFromCheckout = window.sessionStorage.getItem(RESUME_AFTER_CHECKOUT_KEY) === '1';
      const checkoutRaw =
        window.localStorage.getItem(CHECKOUT_DRAFT_KEY) ??
        window.sessionStorage.getItem(CHECKOUT_DRAFT_KEY);

      if (checkoutRaw && shouldResumeFromCheckout) {
        const draft = JSON.parse(checkoutRaw) as CheckoutDraft;
        if (draft?.productType === 'city' && typeof draft.previewSvg === 'string' && draft.previewSvg.includes('<svg')) {
          const render = draft.renderRequest as CityMapRequest;
          const editor = draft.mapData?.cityEditor;

          const themeFromEditor = includesValue(MAP_THEME_KEYS, editor?.mapThemeKey)
            ? MAP_THEME_OPTIONS.find((t) => t.key === editor.mapThemeKey) ?? MAP_THEME_OPTIONS[0]
            : MAP_THEME_OPTIONS[0];

          setMapThemeKey(themeFromEditor.key);
          setBaseStyle(themeFromEditor.baseStyle);
          setMapColors(themeFromEditor.colors);
          setMotorwayWidth(themeFromEditor.motorwayWidth);
          setPrimaryRoadWidth(themeFromEditor.primaryRoadWidth);
          setMinorRoadWidth(themeFromEditor.minorRoadWidth);
          setMotorwayTone(0);
          setPrimaryTone(0);
          setMinorTone(0);

          const sizeValue = editor?.size ?? draft.mapData?.size ?? render?.size;
          if (includesValue(CITY_SIZE_KEYS, sizeValue)) setSize(sizeValue);

          const paletteValue = editor?.palette ?? render?.palette;
          if (typeof paletteValue === 'string' && CITY_PALETTES.some((p) => p.key === paletteValue)) {
            setPalette(paletteValue as PosterParams['palette']);
          }

          const shapeValue = editor?.mapShape ?? draft.mapData?.mapShape ?? render?.mapShape;
          if (includesValue(MAP_SHAPE_KEYS, shapeValue)) setMapShape(shapeValue);

          const pinValue = editor?.pinChoice ?? (render?.showMarker === false ? 'none' : render?.pinStyle ?? 'classic');
          if (includesValue(PIN_CHOICE_KEYS, pinValue)) setPinChoice(pinValue);

          const fontValue = editor?.fontPreset ?? draft.mapData?.font;
          if (includesValue(FONT_PRESET_KEYS, fontValue)) setFontPreset(fontValue);

          const textStyleValue = editor?.textStyle ?? (render?.uppercaseTitle ? 'uppercase' : 'simplified');
          if (includesValue(TEXT_STYLE_KEYS, textStyleValue)) setTextStyle(textStyleValue);

          const latValue = Number(editor?.lat ?? render?.latitude ?? draft.mapData?.lat);
          const lonValue = Number(editor?.lon ?? render?.longitude ?? draft.mapData?.lon);
          if (Number.isFinite(latValue) && Number.isFinite(lonValue)) {
            setLat(Number(clampLat(latValue).toFixed(6)));
            setLon(Number(normalizeLon(lonValue).toFixed(6)));
          }

          const locationValue =
            (typeof editor?.locationLabel === 'string' && editor.locationLabel.trim()) ||
            (typeof render?.locationLabel === 'string' && render.locationLabel.trim()) ||
            (typeof draft.mapData?.city === 'string' && draft.mapData.city.trim()) ||
            '';
          if (locationValue) {
            setLocationLabel(locationValue);
            setCityQuery(locationValue);
          }

          const zoomValue = Number(editor?.zoom ?? render?.zoom);
          if (Number.isFinite(zoomValue)) {
            setZoom(Math.round(clamp(zoomValue, MIN_MAP_ZOOM, MAX_MAP_ZOOM)));
          }

          const frameValue = editor?.frameOn ?? render?.border ?? draft.mapData?.frameOn;
          if (typeof frameValue === 'boolean') setFrameOn(frameValue);

          const titleValue = typeof editor?.title === 'string' ? editor.title : render?.title;
          const subtitleValue = typeof editor?.subtitle === 'string' ? editor.subtitle : render?.subtitle;
          if (typeof titleValue === 'string' && titleValue.length > 0) setTitle(titleValue);
          if (typeof subtitleValue === 'string' && subtitleValue.length > 0) setSubtitle(subtitleValue);

          const textScaleValue = Number(editor?.textScalePercent);
          if (Number.isFinite(textScaleValue)) {
            setTextScalePercent(Math.round(clamp(textScaleValue, 80, 400)));
          }
          const textYOffsetValue = Number(editor?.textYOffset ?? render?.textYOffset);
          if (Number.isFinite(textYOffsetValue)) {
            setTextYOffset(Math.round(clamp(textYOffsetValue, -120, 120)));
          }

          if (includesValue(BASE_STYLE_KEYS, editor?.baseStyle)) {
            setBaseStyle(editor.baseStyle);
          }
          if (editor?.mapColors && typeof editor.mapColors === 'object') {
            const c = editor.mapColors;
            if (
              typeof c.bg === 'string' &&
              typeof c.water === 'string' &&
              typeof c.motorway === 'string' &&
              typeof c.primary === 'string' &&
              typeof c.minor === 'string' &&
              typeof c.building === 'string'
            ) {
              setMapColors(c);
            }
          }

          const mw = Number(editor?.motorwayWidth);
          const pw = Number(editor?.primaryRoadWidth);
          const nw = Number(editor?.minorRoadWidth);
          if (Number.isFinite(mw)) setMotorwayWidth(clamp(mw, 0.1, 10));
          if (Number.isFinite(pw)) setPrimaryRoadWidth(clamp(pw, 0.1, 8));
          if (Number.isFinite(nw)) setMinorRoadWidth(clamp(nw, 0.1, 4));

          const mt = Number(editor?.motorwayTone);
          const pt = Number(editor?.primaryTone);
          const nt = Number(editor?.minorTone);
          if (Number.isFinite(mt)) setMotorwayTone(Math.round(clamp(mt, -80, 80)));
          if (Number.isFinite(pt)) setPrimaryTone(Math.round(clamp(pt, -80, 80)));
          if (Number.isFinite(nt)) setMinorTone(Math.round(clamp(nt, -80, 80)));

          setPosterSvg(draft.previewSvg);
          initialGenerateSkipRef.current = true;
          restoredFromCheckout = true;
        }
        window.sessionStorage.removeItem(RESUME_AFTER_CHECKOUT_KEY);
      }

      if (!restoredFromCheckout) {
        const raw = window.localStorage.getItem(PREVIEW_CACHE_KEY);
        if (raw) {
          const cached = JSON.parse(raw) as PreviewCacheEntry;
          if (
            cached &&
            cached.version === 3 &&
            typeof cached.svg === 'string' &&
            cached.svg.includes('<svg') &&
            cached.mapThemeKey === 'classic' &&
            cached.baseStyle === 'streets' &&
            cached.mapShape === 'rectangle'
          ) {
            setPosterSvg(cached.svg);
            initialGenerateSkipRef.current = true;
          }
        }
      }
    } catch {
      // ignore hydration errors; fall back to live generation
    } finally {
      setHydrationDone(true);
    }
  }, []);

  useEffect(() => {
    const q = cityQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const data = (await res.json()) as GeocodeResult[];
        setSuggestions(data.slice(0, 4));
      } catch {
        setSuggestions([]);
      }
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [cityQuery]);

  const applySuggestion = useCallback((item: GeocodeResult) => {
    setCityQuery(item.label);
    setLocationLabel(item.label);
    setLat(item.lat);
    setLon(item.lon);
    setSuggestionsOpen(false);
  }, []);

  const applyMapTheme = useCallback((key: MapThemeKey) => {
    const theme = MAP_THEME_OPTIONS.find((item) => item.key === key);
    if (!theme) return;
    setPendingAction('map-theme');
    setMapThemeKey(key);
    setBaseStyle(theme.baseStyle);
    setMapColors(theme.colors);
    setMotorwayWidth(theme.motorwayWidth);
    setPrimaryRoadWidth(theme.primaryRoadWidth);
    setMinorRoadWidth(theme.minorRoadWidth);
    setMotorwayTone(0);
    setPrimaryTone(0);
    setMinorTone(0);
  }, []);

  const increaseZoom = useCallback(() => {
    setZoom((prev) => clamp(prev + 1, MIN_MAP_ZOOM, MAX_MAP_ZOOM));
  }, []);

  const decreaseZoom = useCallback(() => {
    setZoom((prev) => clamp(prev - 1, MIN_MAP_ZOOM, MAX_MAP_ZOOM));
  }, []);

  const getMapboxToken = useCallback(async (): Promise<string | null> => {
    if (mapboxTokenRef.current) return mapboxTokenRef.current;
    const publicToken = (process.env.NEXT_PUBLIC_MAPBOX_API_KEY || '').trim();
    if (publicToken) {
      mapboxTokenRef.current = publicToken;
      return publicToken;
    }
    try {
      const res = await fetch('/api/mapbox-token', { cache: 'no-store' });
      if (!res.ok) return null;
      const data = (await res.json()) as { token?: string };
      const token = (data.token || '').trim();
      if (!token) return null;
      mapboxTokenRef.current = token;
      return token;
    } catch {
      return null;
    }
  }, []);

  const waitForMapEvent = useCallback((map: any, eventName: string, timeoutMs = 15000) => {
    return new Promise<void>((resolve, reject) => {
      let done = false;
      const timer = window.setTimeout(() => {
        if (done) return;
        done = true;
        reject(new Error(`Map event timeout: ${eventName}`));
      }, timeoutMs);

      map.once(eventName, () => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        resolve();
      });
    });
  }, []);

  const waitForMapSettled = useCallback((map: any, timeoutMs = 18000) => {
    return new Promise<void>((resolve, reject) => {
      const started = performance.now();
      const tick = () => {
        const styleReady = typeof map.isStyleLoaded === 'function' ? map.isStyleLoaded() : true;
        const tilesReady = typeof map.areTilesLoaded === 'function' ? map.areTilesLoaded() : true;
        if (styleReady && tilesReady) {
          resolve();
          return;
        }
        if (performance.now() - started >= timeoutMs) {
          reject(new Error('Map settle timeout'));
          return;
        }
        window.requestAnimationFrame(tick);
      };
      tick();
    });
  }, []);

  const waitForMapRenderFrames = useCallback((map: any, frames = 2, timeoutMs = 1200) => {
    return new Promise<void>((resolve) => {
      let remaining = Math.max(1, frames);
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        resolve();
      };
      const timer = window.setTimeout(finish, timeoutMs);
      const onRender = () => {
        if (done) return;
        remaining -= 1;
        if (remaining <= 0) {
          finish();
          return;
        }
        map.once('render', onRender);
        map.triggerRepaint();
      };
      map.once('render', onRender);
      map.triggerRepaint();
    });
  }, []);

  const applyLiveMapboxStyle = useCallback(
    (map: any) => {
      const trySetLayout = (id: string, prop: string, value: unknown) => {
        try {
          if (map.getLayer(id)) map.setLayoutProperty(id, prop, value as any);
        } catch {}
      };
      const trySetPaint = (id: string, prop: string, value: unknown) => {
        try {
          if (map.getLayer(id)) map.setPaintProperty(id, prop, value as any);
        } catch {}
      };

      const style = map.getStyle();
      if (!style || !style.layers) return;

      for (const layer of style.layers) {
        const id = String(layer.id || '');
        const f = layerFlags(layer);

        if (layer.type === 'symbol' || layer.type === 'raster' || layer.type === 'fill-extrusion') {
          trySetLayout(id, 'visibility', 'none');
          continue;
        }
        if (f.isBoundary) {
          trySetLayout(id, 'visibility', 'none');
          continue;
        }

        if (layer.type === 'background') {
          trySetPaint(id, 'background-color', mapColors.bg);
          continue;
        }

        if (layer.type === 'fill') {
          if (f.isWater) {
            trySetPaint(id, 'fill-color', mapColors.water);
            trySetPaint(id, 'fill-opacity', 1);
            continue;
          }
          if (f.isBuilding) {
            trySetPaint(id, 'fill-color', mapColors.building);
            trySetPaint(id, 'fill-opacity', 0.3);
            continue;
          }
          if (f.isLand) {
            trySetPaint(id, 'fill-color', mapColors.bg);
            trySetPaint(id, 'fill-opacity', 0.92);
            continue;
          }
        }

        if (layer.type === 'line') {
          if (f.isWater && !f.isWaterLabel) {
            trySetPaint(id, 'line-color', mapColors.water);
            trySetPaint(id, 'line-width', widthExpr(0.8));
            trySetPaint(id, 'line-opacity', 0.95);
            continue;
          }
          if (f.isRoad || f.isMotorway || f.isPrimary || f.isMinorRoad) {
            trySetPaint(id, 'line-color', roadClassColorExpr(roadColors.motorway, roadColors.primary, roadColors.minor));
            trySetPaint(id, 'line-width', roadClassWidthExpr(motorwayWidth, primaryRoadWidth, minorRoadWidth));
            trySetPaint(id, 'line-opacity', 0.92);
            continue;
          }
        }
      }
    },
    [mapColors, motorwayWidth, primaryRoadWidth, minorRoadWidth, roadColors.minor, roadColors.motorway, roadColors.primary]
  );

  const ensureHiddenMap = useCallback(async (styleKey: BaseStyleKey): Promise<any> => {
    const token = await getMapboxToken();
    if (!token) {
      throw new Error('MAPBOX token not found');
    }

    const viewport = getPosterMapRenderSize(PREVIEW_POSTER_SIZE);

    const existingMap = hiddenMapsRef.current[styleKey];
    const existingContainer = hiddenMapContainersRef.current[styleKey];
    if (existingMap && existingContainer) {
      existingContainer.style.width = `${viewport.width}px`;
      existingContainer.style.height = `${viewport.height}px`;
      existingMap.resize();
      return existingMap;
    }

    const mod = mapboxModuleRef.current ?? (await import('mapbox-gl'));
    mapboxModuleRef.current = mod;
    const mapboxgl = mod.default;
    mapboxgl.accessToken = token;

    const mount = document.createElement('div');
    mount.style.width = `${viewport.width}px`;
    mount.style.height = `${viewport.height}px`;
    mount.style.position = 'fixed';
    mount.style.left = '-20000px';
    mount.style.top = '-20000px';
    mount.style.pointerEvents = 'none';
    mount.style.opacity = '0';
    mount.style.zIndex = '-1';
    document.body.appendChild(mount);

    const map = new mapboxgl.Map({
      container: mount,
      style: MAPBOX_BASE_STYLES[styleKey],
      center: [lon, lat],
      zoom,
      maxZoom: MAX_MAP_ZOOM,
      minZoom: MIN_MAP_ZOOM,
      interactive: false,
      attributionControl: false,
      preserveDrawingBuffer: true,
      fadeDuration: 0
    });

    await waitForMapEvent(map, 'load', 18000);
    hiddenMapsRef.current[styleKey] = map;
    hiddenMapContainersRef.current[styleKey] = mount;
    return map;
  }, [getMapboxToken, lat, lon, waitForMapEvent, zoom]);

  const renderMapboxSnapshot = useCallback(async (captureSize: CitySize = PREVIEW_POSTER_SIZE): Promise<string> => {
    const map = await ensureHiddenMap(baseStyle);
    const viewport = getPosterMapRenderSize(captureSize);
    const container = hiddenMapContainersRef.current[baseStyle];

    if (!container) {
      throw new Error('Hidden map container is missing');
    }

    container.style.width = `${viewport.width}px`;
    container.style.height = `${viewport.height}px`;
    map.resize();

    const paintSig = [
      mapThemeKey,
      baseStyle,
      mapColors.bg,
      mapColors.water,
      mapColors.motorway,
      mapColors.primary,
      mapColors.minor,
      roadColors.motorway,
      roadColors.primary,
      roadColors.minor,
      mapColors.building,
      motorwayWidth.toFixed(2),
      primaryRoadWidth.toFixed(2),
      minorRoadWidth.toFixed(2),
      motorwayTone.toFixed(0),
      primaryTone.toFixed(0),
      minorTone.toFixed(0)
    ].join('|');

    const prev = lastSnapshotStateRef.current;
    const needsTileWait =
      !prev ||
      prev.baseStyle !== baseStyle ||
      Math.abs(prev.lon - lon) > 1e-6 ||
      Math.abs(prev.lat - lat) > 1e-6 ||
      Math.abs(prev.zoom - zoom) > 1e-6;
    const paintChanged = !prev || prev.paintSig !== paintSig;

    map.jumpTo({ center: [lon, lat], zoom });
    if (needsTileWait) {
      try {
        await waitForMapSettled(map, 5000);
      } catch {
        // Keep preview responsive even if some tiles are still streaming.
      }
    }

    applyLiveMapboxStyle(map);
    await waitForMapRenderFrames(map, paintChanged ? 2 : 1, paintChanged ? 650 : 380);

    const dataUrl = map.getCanvas().toDataURL('image/jpeg', 0.88);
    if (!/^data:image\/(png|jpeg|jpg);base64,/i.test(dataUrl)) {
      throw new Error('Mapbox canvas capture failed');
    }
    lastSnapshotStateRef.current = { baseStyle, lon, lat, zoom, paintSig };
    return dataUrl;
  }, [
    applyLiveMapboxStyle,
    baseStyle,
    ensureHiddenMap,
    lat,
    lon,
    mapColors.bg,
    mapColors.building,
    mapColors.minor,
    mapColors.motorway,
    mapColors.primary,
    mapColors.water,
    mapThemeKey,
    minorRoadWidth,
    minorTone,
    motorwayWidth,
    motorwayTone,
    primaryRoadWidth,
    primaryTone,
    roadColors.minor,
    roadColors.motorway,
    roadColors.primary,
    waitForMapRenderFrames,
    waitForMapSettled,
    zoom
  ]);

  const generate = useCallback(async () => {
    setBusy(true);
    setError('');
    const reqId = ++latestRequestRef.current;

    try {
      const mappedFont = mapFontPreset(fontPreset);
      const cleanPlace = normalizePlaceLabel(locationLabel || cityQuery);
      const uppercaseTitle = textStyle === 'uppercase';
      const renderedTitle = title;
      const renderedSubtitle = textStyle === 'uppercase' ? subtitle.toUpperCase() : subtitle;
      const textScale = clamp(textScalePercent / 100, 0.7, 4.0);
      const baseTextSizes = getBaseTextSizes(PREVIEW_POSTER_SIZE);
      const mapImageDataUrl = await renderMapboxSnapshot();
      const payload: CityMapRequest = {
        latitude: lat,
        longitude: lon,
        locationLabel: cleanPlace || 'Custom location',
        size: PREVIEW_POSTER_SIZE,
        palette,
        inkColor: selectedPalette.ink,
        mapShape,
        border: frameOn,
        borderWidth: 2,
        borderInset: 14,
        zoom,
        mapImageDataUrl,
        showMarker: pinChoice !== 'none',
        pinStyle: pinChoice,
        uppercaseTitle,
        title: renderedTitle,
        subtitle: renderedSubtitle,
        metaText: formatCoordMeta(lat, lon),
        textYOffset,
        motorwayWidth,
        primaryRoadWidth,
        minorRoadWidth,
        ...mappedFont,
        titleFontSize: baseTextSizes.title * textScale,
        namesFontSize: baseTextSizes.names * textScale,
        metaFontSize: baseTextSizes.meta * textScale
      };

      const res = await fetch('/api/citymap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error((await res.text()) || 'City map generation failed');
      }

      const svg = await res.text();
      if (reqId !== latestRequestRef.current) return;
      setPosterSvg(svg);
      try {
        const cacheEntry: PreviewCacheEntry = {
          version: 3,
          svg,
          mapThemeKey,
          baseStyle,
          mapShape
        };
        window.localStorage.setItem(PREVIEW_CACHE_KEY, JSON.stringify(cacheEntry));
      } catch {}
    } catch (e: any) {
      if (reqId !== latestRequestRef.current) return;
      setError(e?.message ?? String(e));
    } finally {
      if (reqId === latestRequestRef.current) {
        setBusy(false);
        setPendingAction(null);
      }
    }
  }, [
    cityQuery,
    baseStyle,
    fontPreset,
    frameOn,
    lat,
    locationLabel,
    lon,
    minorRoadWidth,
    motorwayWidth,
    mapShape,
    mapThemeKey,
    pinChoice,
    palette,
    primaryRoadWidth,
    selectedPalette.ink,
    subtitle,
    textScalePercent,
    textYOffset,
    textStyle,
    title,
    renderMapboxSnapshot,
    zoom
  ]);

  const handleCheckout = useCallback(async () => {
    setCheckoutBusy(true);
    setError('');
    try {
      const mappedFont = mapFontPreset(fontPreset);
      const cleanPlace = normalizePlaceLabel(locationLabel || cityQuery);
      const uppercaseTitle = textStyle === 'uppercase';
      const renderedTitle = title;
      const renderedSubtitle = textStyle === 'uppercase' ? subtitle.toUpperCase() : subtitle;
      const textScale = clamp(textScalePercent / 100, 0.7, 4.0);
      const baseTextSizes = getBaseTextSizes(size);
      const mapImageDataUrl = await renderMapboxSnapshot(size);

      const renderRequest: CityMapRequest = {
        latitude: lat,
        longitude: lon,
        locationLabel: cleanPlace || 'Custom location',
        size,
        palette,
        inkColor: selectedPalette.ink,
        mapShape,
        border: frameOn,
        borderWidth: 2,
        borderInset: 14,
        zoom,
        mapImageDataUrl,
        showMarker: pinChoice !== 'none',
        pinStyle: pinChoice,
        uppercaseTitle,
        title: renderedTitle,
        subtitle: renderedSubtitle,
        metaText: formatCoordMeta(lat, lon),
        textYOffset,
        motorwayWidth,
        primaryRoadWidth,
        minorRoadWidth,
        ...mappedFont,
        titleFontSize: baseTextSizes.title * textScale,
        namesFontSize: baseTextSizes.names * textScale,
        metaFontSize: baseTextSizes.meta * textScale
      };

      const posterRes = await fetch('/api/citymap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(renderRequest)
      });
      if (!posterRes.ok) {
        throw new Error((await posterRes.text()) || 'Poster generation failed');
      }
      const svg = await posterRes.text();
      setPosterSvg(svg);

      const now = new Date();
      const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const localTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const checkoutRenderRequest: CityMapRequest = {
        ...renderRequest,
        // Prevent duplicate huge payload in storage; previewSvg already contains the rendered map image.
        mapImageDataUrl: ''
      };

      const draft: CheckoutDraft = {
        createdAtIso: now.toISOString(),
        productType: 'city',
        previewSvg: svg,
        renderRequest: checkoutRenderRequest,
        mapData: {
          city: cleanPlace || 'Custom location',
          date: localDate,
          time: localTime,
          title: renderedTitle,
          names: renderedSubtitle,
          font: fontPreset,
          showConstellations: false,
          showGraticule: false,
          palette,
          size,
          frameOn,
          lat,
          lon,
          locationLine: formatCoordMeta(lat, lon),
          mapShape,
          cityEditor: {
            size,
            frameOn,
            palette,
            cityQuery,
            locationLabel: cleanPlace || 'Custom location',
            lat,
            lon,
            fontPreset,
            textStyle,
            mapShape,
            pinChoice,
            mapThemeKey,
            zoom,
            baseStyle,
            mapColors,
            motorwayWidth,
            primaryRoadWidth,
            minorRoadWidth,
            motorwayTone,
            primaryTone,
            minorTone,
            title: renderedTitle,
            subtitle: renderedSubtitle,
            textScalePercent,
            textYOffset
          }
        }
      };
      const draftRaw = JSON.stringify(draft);
      try {
        // Free space from city preview cache before writing checkout payload.
        window.localStorage.removeItem(PREVIEW_CACHE_KEY);
        window.localStorage.setItem(CHECKOUT_DRAFT_KEY, draftRaw);
      } catch {
        // Fallback for quota issues in localStorage.
        window.sessionStorage.setItem(CHECKOUT_DRAFT_KEY, draftRaw);
      }
      window.sessionStorage.setItem(RESUME_AFTER_CHECKOUT_KEY, '1');
      router.push('/checkout');
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setCheckoutBusy(false);
    }
  }, [
    baseStyle,
    cityQuery,
    fontPreset,
    frameOn,
    lat,
    locationLabel,
    lon,
    mapColors,
    mapThemeKey,
    mapShape,
    minorRoadWidth,
    minorTone,
    motorwayWidth,
    motorwayTone,
    palette,
    pinChoice,
    primaryRoadWidth,
    primaryTone,
    renderMapboxSnapshot,
    router,
    selectedPalette.ink,
    size,
    subtitle,
    textScalePercent,
    textStyle,
    textYOffset,
    title,
    zoom
  ]);

  useEffect(() => {
    if (!hydrationDone) return;
    if (initialGenerateSkipRef.current) {
      initialGenerateSkipRef.current = false;
      return;
    }
    void generate();
  }, [generate, hydrationDone]);

  useEffect(() => {
    if (prewarmedStylesRef.current) return;
    prewarmedStylesRef.current = true;
    let cancelled = false;

    void (async () => {
      try {
        await ensureHiddenMap(baseStyle);
      } catch {}
    })();

    window.setTimeout(() => {
      void (async () => {
        const styles = (['streets', 'light', 'dark'] as BaseStyleKey[]).filter((s) => s !== baseStyle);
        for (const key of styles) {
          if (cancelled) return;
          try {
            await ensureHiddenMap(key);
          } catch {
            return;
          }
        }
      })();
    }, 1200);

    return () => {
      cancelled = true;
    };
  }, [baseStyle, ensureHiddenMap]);

  useEffect(() => {
    return () => {
      for (const styleKey of Object.keys(hiddenMapsRef.current) as BaseStyleKey[]) {
        try {
          hiddenMapsRef.current[styleKey]?.remove();
        } catch {}
        hiddenMapsRef.current[styleKey] = undefined;
      }
      for (const styleKey of Object.keys(hiddenMapContainersRef.current) as BaseStyleKey[]) {
        hiddenMapContainersRef.current[styleKey]?.remove();
        hiddenMapContainersRef.current[styleKey] = undefined;
      }
    };
  }, []);

  const handlePosterPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!paperRef.current || !posterSvg) return;
      const svg = paperRef.current.querySelector('svg');
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const viewX = ((e.clientX - rect.left) / rect.width) * PREVIEW_VIEWBOX_W;
      const viewY = ((e.clientY - rect.top) / rect.height) * PREVIEW_VIEWBOX_H;
      const insideRect =
        viewX >= PREVIEW_MAP_X &&
        viewX <= PREVIEW_MAP_X + PREVIEW_MAP_W &&
        viewY >= PREVIEW_MAP_Y &&
        viewY <= PREVIEW_MAP_Y + PREVIEW_MAP_H;
      if (!insideRect) return;

      let insideMap = true;
      if (mapShape === 'circle') {
        const circleBaseR = Math.min(PREVIEW_MAP_W, PREVIEW_MAP_H) / 2;
        const circleR = circleBaseR * PREVIEW_CIRCLE_RADIUS_SCALE;
        const circleShiftY = circleBaseR * PREVIEW_CIRCLE_SHIFT_RATIO;
        const cx = PREVIEW_MAP_X + PREVIEW_MAP_W / 2;
        const cy = PREVIEW_MAP_Y + PREVIEW_MAP_H / 2 + circleShiftY;
        const dx = viewX - cx;
        const dy = viewY - cy;
        insideMap = dx * dx + dy * dy <= circleR * circleR;
      }
      if (!insideMap) return;

      dragStateRef.current = {
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startLon: lon,
        startLat: lat,
        svgWidth: rect.width,
        svgHeight: rect.height
      };
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDraggingMap(true);
    },
    [lat, lon, mapShape, posterSvg]
  );

  const handlePosterPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragStateRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;

      const dxScreen = e.clientX - drag.startClientX;
      const dyScreen = e.clientY - drag.startClientY;
      dragStateRef.current = null;
      setIsDraggingMap(false);
      e.currentTarget.releasePointerCapture(e.pointerId);

      if (Math.abs(dxScreen) < 2 && Math.abs(dyScreen) < 2) return;

      const capture = getPosterMapRenderSize(PREVIEW_POSTER_SIZE);
      const dxView = dxScreen * (PREVIEW_VIEWBOX_W / drag.svgWidth);
      const dyView = dyScreen * (PREVIEW_VIEWBOX_H / drag.svgHeight);
      const dxCapture = dxView * (capture.width / PREVIEW_MAP_W);
      const dyCapture = dyView * (capture.height / PREVIEW_MAP_H);
      const next = panCenterByPixels(drag.startLon, drag.startLat, zoom, dxCapture, dyCapture);
      setLon(Number(next.lon.toFixed(6)));
      setLat(Number(next.lat.toFixed(6)));
      setLocationLabel(cityQuery);
    },
    [cityQuery, zoom]
  );

  const handlePosterPointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragStateRef.current = null;
    setIsDraggingMap(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  const selectedSizeMeta = useMemo(() => SIZE_PRESETS.find((item) => item.key === size) ?? SIZE_PRESETS[2], [size]);
  const showZoomWarning = zoom <= ZOOM_WARNING_THRESHOLD;

  return (
    <div className="designRoot">
      <header className="topbar">
        <div className="brand">
          <div className="brandMark">*</div>
          <div className="brandText">
            <div className="brandMain">CITY MAP</div>
            <div className="brandSub">STUDIO</div>
          </div>
        </div>
        <div className="heroPlaceholder" aria-hidden="true">
          <div className="heroMapCard">
            <svg className="heroMapSvg" viewBox="0 0 820 56" xmlns="http://www.w3.org/2000/svg" role="presentation">
              <rect x="0" y="0" width="820" height="56" rx="12" fill="#efe5cb" />
              <path
                d="M244 2 C252 12,248 24,256 34 C266 44,270 53,278 56 L348 56 C338 45,334 31,326 19 C317 8,314 2,306 0 Z"
                fill="#2cb4ad"
                opacity="0.96"
              />
              <path
                d="M540 -2 C552 10,554 21,564 34 C571 43,579 50,592 56 L640 56 C627 42,621 30,612 18 C603 6,595 1,583 0 Z"
                fill="#2cb4ad"
                opacity="0.9"
              />
              <g stroke="#ff6f67" strokeLinecap="round" fill="none">
                <path d="M8 46 L140 8 L298 46 L444 10 L605 44 L738 12" strokeWidth="3.2" />
                <path d="M14 24 L122 34 L234 16 L342 30 L458 18 L579 34 L708 20" strokeWidth="2.4" opacity="0.95" />
                <path d="M72 4 L96 52" strokeWidth="1.6" opacity="0.85" />
                <path d="M166 2 L186 54" strokeWidth="1.6" opacity="0.85" />
                <path d="M404 2 L394 54" strokeWidth="1.7" opacity="0.85" />
                <path d="M674 2 L658 54" strokeWidth="1.6" opacity="0.85" />
                <path d="M760 5 L734 52" strokeWidth="1.5" opacity="0.8" />
              </g>
              <g stroke="#ff9c97" strokeWidth="1.1" opacity="0.75">
                <path d="M20 16 H206" />
                <path d="M22 36 H206" />
                <path d="M284 10 H504" />
                <path d="M282 26 H518" />
                <path d="M280 42 H510" />
                <path d="M618 14 H798" />
                <path d="M616 36 H796" />
              </g>
              <rect x="652" y="7" width="153" height="42" rx="10" fill="#1f2a44" opacity="0.94" />
              <text x="728.5" y="33.5" textAnchor="middle" fill="#f3f2ef" fontSize="15" letterSpacing="0.15em" fontFamily="'Signika', ui-sans-serif, system-ui">
                NY RETRO
              </text>
            </svg>
          </div>
        </div>
      </header>

      <main className="layout">
        <section className="previewPanel" style={{ background: previewBg }}>
          <div
            ref={paperRef}
            className={`paper fixedPreview ${isDraggingMap ? 'dragging' : 'draggable'}`}
            onPointerDown={handlePosterPointerDown}
            onPointerUp={handlePosterPointerUp}
            onPointerCancel={handlePosterPointerCancel}
          >
            <div className="posterZoomTools">
              <button type="button" className="posterZoomBtn" onClick={increaseZoom} aria-label="Zoom in">
                +
              </button>
              <button type="button" className="posterZoomBtn" onClick={decreaseZoom} aria-label="Zoom out">
                -
              </button>
            </div>
            {posterSvg ? (
              <div className="svgMount" dangerouslySetInnerHTML={{ __html: posterSvg }} />
            ) : (
              <div className="loadingPoster">{busy ? 'Preparing preview...' : 'Preview loading...'}</div>
            )}
          </div>
          <p className="previewNote">Drag map area to pan. Poster stays fixed. Download size: {selectedSizeMeta.title}</p>
        </section>

        <aside className="controlPanel">
          <div className="controlScroll">
            <section className="panelHeader">
              <h2>Location Map</h2>
              <div className="pricePlaceholder">Price placeholder</div>
            </section>

            <section className="panelBlock">
              <div className="stackField">
                <label>Select Poster Size</label>
                <select className="dashedInput" value={size} onChange={(e) => setSize(e.target.value as CitySize)}>
                  {SIZE_PRESETS.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.title} - {item.sub}
                    </option>
                  ))}
                </select>
                <p className="microHint">Selected size is used for downloadable file output only.</p>
              </div>

            <div className="stackField">
              <label>Map Format</label>
              <select className="dashedInput" value={mapShape} onChange={(e) => setMapShape(e.target.value as MapShapeKey)}>
                {MAP_SHAPE_OPTIONS.map((shape) => (
                  <option key={shape.key} value={shape.key}>
                    {shape.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="stackField">
              <label>Search for a city</label>
              <div className="cityWrap">
                <input
                  className="dashedInput"
                  value={cityQuery}
                  onChange={(e) => {
                    setCityQuery(e.target.value);
                    setSuggestionsOpen(true);
                  }}
                  onFocus={() => setSuggestionsOpen(true)}
                  placeholder="San Antonio, TX, USA"
                />

                {suggestionsOpen && suggestions.length > 0 ? (
                  <div className="suggestions">
                    {suggestions.map((item) => (
                      <button key={`${item.lat}_${item.lon}`} type="button" onClick={() => applySuggestion(item)}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="stackField">
              <div className="fieldLabelRow">
                <label>Background Color</label>
                {BACKGROUND_OPTIONS.length > BACKGROUND_COLLAPSED_COUNT ? (
                  <button
                    type="button"
                    className="expandBtn"
                    onClick={() => setBackgroundExpanded((prev) => !prev)}
                    aria-expanded={backgroundExpanded}
                  >
                    <span className={`expandGlyph ${backgroundExpanded ? 'open' : ''}`} aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <span />
                    </span>
                    <span>{backgroundExpanded ? 'Compact' : 'Explore'}</span>
                  </button>
                ) : null}
              </div>
              <div className="bgGrid">
                {visibleBackgroundOptions.map((key) => {
                  const p = findPalette(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`bgCard ${palette === key ? 'active' : ''}`}
                      onClick={() => {
                        setPendingAction('background');
                        setPalette(key);
                      }}
                      title={p.label}
                    >
                      <span className="bgSwatch" style={{ background: p.bg }} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="stackField">
              <div className="fieldLabelRow">
                <label>Map Colors</label>
                <div className="fieldActions">
                  {busy && pendingAction === 'map-theme' ? <span className="inlineBusy">Updating...</span> : null}
                  {MAP_THEME_OPTIONS.length > MAP_THEME_COLLAPSED_COUNT ? (
                    <button
                      type="button"
                      className="expandBtn"
                      onClick={() => setMapThemesExpanded((prev) => !prev)}
                      aria-expanded={mapThemesExpanded}
                    >
                      <span className={`expandGlyph ${mapThemesExpanded ? 'open' : ''}`} aria-hidden="true">
                        <span />
                        <span />
                        <span />
                        <span />
                      </span>
                      <span>{mapThemesExpanded ? 'Compact' : 'Explore'}</span>
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="themeGrid">
                {visibleMapThemes.map((theme) => (
                  <button
                    key={theme.key}
                    type="button"
                    className={`themeCard ${mapThemeKey === theme.key ? 'active' : ''}`}
                    disabled={busy && pendingAction === 'map-theme'}
                    onClick={() => applyMapTheme(theme.key)}
                  >
                    <span
                      className="themeSwatch"
                      style={{ background: `linear-gradient(45deg, ${theme.swatchA} 0 48%, ${theme.swatchB} 52% 100%)` }}
                    >
                      <span style={{ background: theme.stroke }} />
                    </span>
                    <span>{theme.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="stackField">
              <label>Zoom</label>
              <input
                type="range"
                min={MIN_MAP_ZOOM}
                max={MAX_MAP_ZOOM}
                step={1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
              <p className="microHint">Zoom: {zoom}</p>
              {showZoomWarning ? (
                <p className="zoomWarning">
                  Low zoom can reduce city detail and may create too much empty space in poster composition.
                </p>
              ) : null}
            </div>

            <div className="stackField">
              <label>Road Thickness</label>
              <div className="roadControlRow">
                <div className="miniSlider">
                  <span>Motorway</span>
                  <input type="range" min={0.1} max={10} step={0.1} value={motorwayWidth} onChange={(e) => setMotorwayWidth(Number(e.target.value))} />
                  <b>{motorwayWidth.toFixed(1)} px</b>
                </div>
                <div className="miniSlider toneSlider">
                  <span>Tone</span>
                  <input type="range" min={-80} max={80} step={1} value={motorwayTone} onChange={(e) => setMotorwayTone(Number(e.target.value))} />
                  <b>{motorwayTone > 0 ? `+${motorwayTone}` : motorwayTone}%</b>
                </div>
              </div>
              <div className="roadControlRow">
                <div className="miniSlider">
                  <span>Primary</span>
                  <input type="range" min={0.1} max={8} step={0.1} value={primaryRoadWidth} onChange={(e) => setPrimaryRoadWidth(Number(e.target.value))} />
                  <b>{primaryRoadWidth.toFixed(1)} px</b>
                </div>
                <div className="miniSlider toneSlider">
                  <span>Tone</span>
                  <input type="range" min={-80} max={80} step={1} value={primaryTone} onChange={(e) => setPrimaryTone(Number(e.target.value))} />
                  <b>{primaryTone > 0 ? `+${primaryTone}` : primaryTone}%</b>
                </div>
              </div>
              <div className="roadControlRow">
                <div className="miniSlider">
                  <span>Minor</span>
                  <input type="range" min={0.1} max={4} step={0.1} value={minorRoadWidth} onChange={(e) => setMinorRoadWidth(Number(e.target.value))} />
                  <b>{minorRoadWidth.toFixed(1)} px</b>
                </div>
                <div className="miniSlider toneSlider">
                  <span>Tone</span>
                  <input type="range" min={-80} max={80} step={1} value={minorTone} onChange={(e) => setMinorTone(Number(e.target.value))} />
                  <b>{minorTone > 0 ? `+${minorTone}` : minorTone}%</b>
                </div>
              </div>
            </div>
            </section>

            <section className="panelBlock">
            <div className="stackField">
              <label>Pin</label>
              <div className="iconGrid">
                {PIN_OPTIONS.map((pin) => (
                  <button
                    key={pin.key}
                    type="button"
                    className={`iconCard ${pinChoice === pin.key ? 'active' : ''}`}
                    onClick={() => setPinChoice(pin.key)}
                    title={pin.label}
                  >
                    <span className={`pinGlyph ${pin.key === 'none' ? 'textOnly' : ''}`}>{pin.glyph}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="stackField">
              <label>Text Style</label>
              <select className="dashedInput" value={textStyle} onChange={(e) => setTextStyle(e.target.value as TextStyleKey)}>
                {TEXT_STYLE_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="stackField">
              <label>Line 1</label>
              <input className="dashedInput" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="stackField">
              <label>Line 2</label>
              <input className="dashedInput" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
            </div>

            <div className="stackField">
              <label>Text Adjust</label>
              <div className="miniSlider">
                <span>Size</span>
                <input
                  type="range"
                  min={80}
                  max={400}
                  step={1}
                  value={textScalePercent}
                  onChange={(e) => setTextScalePercent(Number(e.target.value))}
                />
                <b>{textScalePercent}%</b>
              </div>
              <div className="miniSlider">
                <span>Position</span>
                <input type="range" min={-120} max={120} step={2} value={textYOffset} onChange={(e) => setTextYOffset(Number(e.target.value))} />
                <b>{textYOffset > 0 ? `+${textYOffset}` : textYOffset}px</b>
              </div>
              <p className="microHint">Use size and vertical position only. Keep layout clean.</p>
            </div>

            <div className="stackField">
              <label>Choose Font</label>
              <div className="fontGrid">
                {FONT_PRESETS.map((font) => (
                  <button
                    key={font.key}
                    type="button"
                    className={`fontCard ${fontPreset === font.key ? 'active' : ''}`}
                    onClick={() => setFontPreset(font.key)}
                    style={{ fontFamily: FONT_CARD_STYLE[font.key] }}
                  >
                    {font.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="stackField">
              <label>Add Border/Outline?</label>
              <select className="dashedInput" value={frameOn ? 'yes' : 'no'} onChange={(e) => setFrameOn(e.target.value === 'yes')}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            </section>
          </div>
          <div className="panelFooter">
            <button type="button" className="previewBtn" onClick={() => void generate()} disabled={busy || checkoutBusy}>
              {busy ? 'Updating...' : 'Update Preview'}
            </button>
            <button type="button" className="checkoutBtn" onClick={() => void handleCheckout()} disabled={busy || checkoutBusy}>
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
          height: 100vh;
          overflow: hidden;
          background: #ece9e4;
          color: #121317;
        }

        .topbar {
          height: 92px;
          position: fixed;
          inset: 0 0 auto 0;
          z-index: 50;
          background: #020726;
          display: grid;
          grid-template-columns: auto 1fr;
          align-items: center;
          gap: 20px;
          padding: 0 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brandMark {
          width: 44px;
          height: 44px;
          border: 2px solid rgba(255, 255, 255, 0.82);
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 18px;
          line-height: 1;
          color: #fff;
        }

        .brandMain {
          font-size: 20px;
          letter-spacing: 0.1em;
          line-height: 1;
          font-weight: 700;
          color: #fff;
          font-family: 'Signika', ui-sans-serif, system-ui;
        }

        .brandSub {
          font-size: 9px;
          letter-spacing: 0.34em;
          margin-top: 2px;
          color: rgba(255, 255, 255, 0.85);
          font-family: 'Signika', ui-sans-serif, system-ui;
        }

        .heroPlaceholder {
          height: 56px;
          border-radius: 16px;
          border: 1px dashed rgba(255, 255, 255, 0.24);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02));
          padding: 4px;
          overflow: hidden;
        }

        .heroMapCard {
          width: 100%;
          height: 100%;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);
          background: #efe5cb;
        }

        .heroMapSvg {
          width: 100%;
          height: 100%;
          display: block;
        }

        .layout {
          height: calc(100vh - 92px);
          margin-top: 92px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) clamp(360px, 34vw, 520px);
          min-width: 0;
        }

        .previewPanel {
          display: grid;
          place-items: center;
          padding: 12px 16px 10px;
          min-width: 0;
          overflow: hidden;
        }

        .paper {
          width: min(100%, 560px, calc((100vh - 220px) * 0.8));
          aspect-ratio: 4 / 5;
          border-radius: 0;
          border: 1px solid rgba(210, 205, 198, 0.9);
          background: rgba(255, 255, 255, 0.7);
          box-shadow: 0 16px 36px rgba(26, 26, 26, 0.12);
          padding: 10px;
          display: grid;
          place-items: center;
          position: relative;
          overflow: hidden;
          touch-action: none;
        }

        .fixedPreview {
          max-height: calc(100vh - 214px);
        }

        .paper.draggable {
          cursor: grab;
        }

        .paper.dragging {
          cursor: grabbing;
        }

        .posterZoomTools {
          position: absolute;
          top: 18px;
          right: 18px;
          z-index: 3;
          display: grid;
          gap: 8px;
        }

        .posterZoomBtn {
          height: 42px;
          min-width: 42px;
          border: 1px solid #d6d8db;
          border-radius: 6px;
          background: #ffffff;
          color: #121317;
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.16);
        }

        .svgMount {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
        }

        .svgMount :global(svg) {
          width: 100%;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
          display: block;
          filter: drop-shadow(0 18px 36px rgba(15, 20, 28, 0.24));
        }

        .loadingPoster {
          color: #5f6368;
          font-size: 14px;
        }

        .previewNote {
          margin: 6px 0 0;
          font-size: 12px;
          color: #686b72;
          font-weight: 500;
        }

        .controlPanel {
          border-left: 1px solid #ddd6ce;
          background: #f1f1f1;
          padding: 16px 16px 12px;
          overflow: hidden;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
        }

        .controlScroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          display: grid;
          gap: 14px;
          padding-right: 2px;
        }

        .panelFooter {
          position: sticky;
          bottom: 0;
          z-index: 8;
          display: grid;
          gap: 10px;
          padding-top: 12px;
          margin-top: 10px;
          border-top: 1px solid #d8dce2;
          background: linear-gradient(180deg, rgba(241, 241, 241, 0.5), #f1f1f1 28%);
        }

        .panelHeader h2 {
          margin: 0;
          font-size: 28px;
          line-height: 1.1;
          letter-spacing: -0.01em;
          font-family: 'Signika', ui-sans-serif, system-ui;
          font-weight: 700;
          color: #1a1b2a;
        }

        .pricePlaceholder {
          margin-top: 10px;
          min-height: 30px;
          display: grid;
          place-items: center start;
          padding: 0 8px;
          border-radius: 8px;
          border: 1px dashed #c7ccd4;
          background: rgba(255, 255, 255, 0.45);
          font-family: 'Signika', ui-sans-serif, system-ui;
          font-size: 12px;
          color: #7a818c;
        }

        .panelBlock {
          background: transparent;
          border: 0;
          border-radius: 0;
          padding: 0;
          display: grid;
          gap: 12px;
        }

        .stackField {
          display: grid;
          gap: 8px;
        }

        .stackField label {
          margin: 0;
          font-size: 13px;
          line-height: 1.08;
          font-weight: 700;
          color: #1a1b2a;
        }

        .fieldLabelRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .fieldActions {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .inlineBusy {
          font-size: 11px;
          color: #2f74ff;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .expandBtn {
          border: 1px solid #b9c1cf;
          border-radius: 999px;
          min-height: 30px;
          padding: 0 10px 0 8px;
          background: #f7f9ff;
          color: #26324a;
          font-size: 11px;
          font-weight: 700;
          font-family: 'Signika', ui-sans-serif, system-ui;
          letter-spacing: 0.03em;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          cursor: pointer;
        }

        .expandGlyph {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 1px solid #98a3b8;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2px;
          padding: 3px;
          background: #ffffff;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .expandGlyph span {
          border-radius: 50%;
          background: #4d6287;
          opacity: 0.95;
        }

        .expandGlyph.open {
          transform: rotate(45deg);
          border-color: #556fa3;
        }

        .dashedInput,
        .stackField :global(input),
        .stackField :global(select) {
          width: 100%;
          min-height: 46px;
          border-radius: 14px;
          border: 1.5px dashed #747982;
          background: transparent;
          padding: 0 14px;
          font-size: 13px;
          line-height: 1.2;
          color: #4a4f56;
          outline: none;
          font-family: 'Signika', ui-sans-serif, system-ui;
        }

        .microHint {
          margin: 0;
          font-size: 12px;
          color: #6d7076;
        }

        .zoomWarning {
          margin: 0;
          padding: 8px 10px;
          border-radius: 10px;
          border: 1px solid #f1c57c;
          background: #fff3db;
          color: #7d4f10;
          font-size: 12px;
          line-height: 1.35;
        }

        .cityWrap {
          position: relative;
        }

        .suggestions {
          position: absolute;
          top: 52px;
          left: 0;
          right: 0;
          z-index: 7;
          background: #fff;
          border: 1px solid #d7d8db;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 12px 22px rgba(17, 17, 17, 0.12);
        }

        .suggestions button {
          width: 100%;
          text-align: left;
          border: 0;
          border-top: 1px solid #efefef;
          background: #fff;
          padding: 10px 12px;
          font-size: 13px;
          cursor: pointer;
        }

        .suggestions button:first-child {
          border-top: 0;
        }

        .bgGrid,
        .themeGrid,
        .iconGrid,
        .fontGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .bgCard,
        .themeCard,
        .iconCard,
        .fontCard {
          border: 1px solid #e5e5e5;
          border-radius: 16px;
          background: #f7f7f7;
          min-height: 86px;
          display: grid;
          place-items: center;
          padding: 8px;
          cursor: pointer;
          transition: box-shadow 0.15s ease, border-color 0.15s ease;
        }

        .themeCard:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        .bgCard.active,
        .themeCard.active,
        .iconCard.active,
        .fontCard.active {
          border-color: #b9b9b9;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .bgSwatch {
          width: 48px;
          height: 48px;
          border-radius: 999px;
          border: 2px solid rgba(0, 0, 0, 0.12);
        }

        .themeCard {
          align-content: start;
          gap: 6px;
          padding-top: 8px;
        }

        .themeCard span:last-child {
          font-size: 12px;
          font-family: 'Signika', ui-sans-serif, system-ui;
          color: #1f2230;
          text-align: center;
        }

        .themeSwatch {
          width: 48px;
          height: 48px;
          border-radius: 999px;
          border: 2px solid rgba(0, 0, 0, 0.16);
          position: relative;
          overflow: hidden;
        }

        .themeSwatch span {
          position: absolute;
          inset: 0;
          margin: auto;
          width: 3px;
          height: 100%;
          transform: rotate(-45deg);
        }

        .previewBtn {
          border: 1px solid #4a5678;
          border-radius: 10px;
          min-height: 48px;
          font-size: 16px;
          font-family: 'Signika', ui-sans-serif, system-ui;
          font-weight: 700;
          background: #313d61;
          color: #f3f6ff;
          cursor: pointer;
        }

        .previewBtn:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        .checkoutBtn {
          border: 0;
          border-radius: 10px;
          min-height: 48px;
          font-size: 16px;
          font-family: 'Signika', ui-sans-serif, system-ui;
          cursor: pointer;
          margin-top: 0;
        }

        .checkoutBtn {
          background: #101926;
          color: #fff;
        }

        .checkoutBtn:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        .error {
          margin: 0;
          color: #b91c1c;
          font-size: 14px;
        }

        .pinGlyph {
          font-size: 32px;
          line-height: 1;
          color: #e21f26;
          font-family: 'Signika', ui-sans-serif, system-ui;
        }

        .pinGlyph.textOnly {
          font-size: 22px;
          color: #111;
          text-align: center;
        }

        .fontCard {
          font-size: 40px;
          color: #131521;
          font-weight: 500;
          line-height: 1;
        }

        .miniSlider {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 10px;
          align-items: center;
        }

        .roadControlRow {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .toneSlider b {
          min-width: 42px;
          text-align: right;
        }

        .miniSlider span,
        .miniSlider b {
          font-family: 'Signika', ui-sans-serif, system-ui;
          font-size: 13px;
          color: #2d3240;
        }

        .miniSlider input[type='range'] {
          width: 100%;
        }

        @media (max-width: 1240px) {
          .layout {
            grid-template-columns: 1fr;
            grid-template-rows: minmax(300px, 46vh) minmax(0, 1fr);
          }

          .paper {
            width: min(100%, 470px, calc((100vh - 250px) * 0.8));
          }

          .controlPanel {
            border-left: 0;
            border-top: 1px solid #ddd6ce;
          }

          .panelFooter {
            position: sticky;
            bottom: 0;
          }
        }

        @media (max-width: 760px) {
          .topbar {
            grid-template-columns: 1fr;
            height: 106px;
            gap: 10px;
            padding: 10px 14px;
          }

          .layout {
            margin-top: 106px;
            height: calc(100vh - 106px);
          }

          .controlPanel {
            padding: 14px;
          }

          .panelFooter {
            margin-top: 8px;
            padding-top: 10px;
          }

          .panelHeader h2 {
            font-size: 22px;
          }

          .pricePlaceholder {
            font-size: 11px;
            min-height: 28px;
          }

          .dashedInput,
          .stackField :global(input),
          .stackField :global(select) {
            min-height: 44px;
            font-size: 12px;
          }

          .bgGrid,
          .themeGrid,
          .iconGrid,
          .fontGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .roadControlRow {
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .fontCard {
            font-size: 34px;
          }
        }
      `}</style>
    </div>
  );
}
