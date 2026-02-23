import type { VinylParams } from './types';

export type VinylLayoutPreset = {
  W: number;
  H: number;
  topMargin: number;
  bottomMargin: number;
  leftMargin: number;
  rightMargin: number;
  recordDiameter: number;
  titleFontSize: number;
  songFontSize: number;
  artistFontSize: number;
  namesFontSize: number;
  dateFontSize: number;
};

const INCH = 72;

function inch(v: number): number {
  return v * INCH;
}

export const VINYL_LAYOUT_PRESETS: Record<VinylParams['size'], VinylLayoutPreset> = {
  'us-letter': {
    W: 612,
    H: 792,
    topMargin: inch(0.85),
    bottomMargin: inch(0.85),
    leftMargin: inch(0.85),
    rightMargin: inch(0.85),
    recordDiameter: inch(6.8),
    titleFontSize: 19.13,
    songFontSize: 14.88,
    artistFontSize: 11.16,
    namesFontSize: 31.88,
    dateFontSize: 15.94
  },
  a4: {
    W: 576,
    H: 864,
    topMargin: inch(1.3),
    bottomMargin: inch(1.3),
    leftMargin: inch(0.8),
    rightMargin: inch(0.8),
    recordDiameter: inch(6.4),
    titleFontSize: 18,
    songFontSize: 14,
    artistFontSize: 10.5,
    namesFontSize: 30,
    dateFontSize: 15
  },
  '11x14': {
    W: 792,
    H: 1008,
    topMargin: inch(1.1),
    bottomMargin: inch(1.1),
    leftMargin: inch(1.1),
    rightMargin: inch(1.1),
    recordDiameter: inch(8.8),
    titleFontSize: 24.75,
    songFontSize: 19.25,
    artistFontSize: 14.44,
    namesFontSize: 41.25,
    dateFontSize: 20.63
  },
  a3: {
    W: 842,
    H: 1190,
    topMargin: inch(1.9),
    bottomMargin: inch(1.9),
    leftMargin: inch(1.17),
    rightMargin: inch(1.17),
    recordDiameter: inch(9.35),
    titleFontSize: 26.3,
    songFontSize: 20.46,
    artistFontSize: 15.34,
    namesFontSize: 43.84,
    dateFontSize: 21.92
  },
  '12x12': {
    W: 864,
    H: 864,
    topMargin: inch(0.84),
    bottomMargin: inch(0.84),
    leftMargin: inch(1.8),
    rightMargin: inch(1.8),
    recordDiameter: inch(8.4),
    titleFontSize: 23.63,
    songFontSize: 18.38,
    artistFontSize: 13.78,
    namesFontSize: 26.4,
    dateFontSize: 13.2
  },
  '12x16': {
    W: 864,
    H: 1152,
    topMargin: inch(1.2),
    bottomMargin: inch(1.2),
    leftMargin: inch(1.2),
    rightMargin: inch(1.2),
    recordDiameter: inch(9.6),
    titleFontSize: 27,
    songFontSize: 21,
    artistFontSize: 15.75,
    namesFontSize: 45,
    dateFontSize: 22.5
  },
  '16x20': {
    W: 1152,
    H: 1440,
    topMargin: inch(1.6),
    bottomMargin: inch(1.6),
    leftMargin: inch(1.6),
    rightMargin: inch(1.6),
    recordDiameter: inch(12.8),
    titleFontSize: 36,
    songFontSize: 28,
    artistFontSize: 21,
    namesFontSize: 60,
    dateFontSize: 30
  },
  a2: {
    W: 1190,
    H: 1684,
    topMargin: inch(2.69),
    bottomMargin: inch(2.69),
    leftMargin: inch(1.65),
    rightMargin: inch(1.65),
    recordDiameter: inch(13.22),
    titleFontSize: 37.19,
    songFontSize: 28.93,
    artistFontSize: 21.7,
    namesFontSize: 61.99,
    dateFontSize: 30.99
  },
  '18x24': {
    W: 1296,
    H: 1728,
    topMargin: inch(1.8),
    bottomMargin: inch(1.8),
    leftMargin: inch(1.8),
    rightMargin: inch(1.8),
    recordDiameter: inch(14.4),
    titleFontSize: 40.5,
    songFontSize: 31.5,
    artistFontSize: 23.63,
    namesFontSize: 67.5,
    dateFontSize: 33.75
  },
  '20x20': {
    W: 1440,
    H: 1440,
    topMargin: inch(1.4),
    bottomMargin: inch(1.4),
    leftMargin: inch(3),
    rightMargin: inch(3),
    recordDiameter: inch(14),
    titleFontSize: 39.38,
    songFontSize: 30.63,
    artistFontSize: 22.97,
    namesFontSize: 44,
    dateFontSize: 22
  },
  a1: {
    W: 1684,
    H: 2384,
    topMargin: inch(3.8),
    bottomMargin: inch(3.8),
    leftMargin: inch(2.34),
    rightMargin: inch(2.34),
    recordDiameter: inch(18.71),
    titleFontSize: 52.63,
    songFontSize: 40.93,
    artistFontSize: 30.7,
    namesFontSize: 87.71,
    dateFontSize: 43.86
  },
  '24x32': {
    W: 1728,
    H: 2304,
    topMargin: inch(2.4),
    bottomMargin: inch(2.4),
    leftMargin: inch(2.4),
    rightMargin: inch(2.4),
    recordDiameter: inch(19.2),
    titleFontSize: 54,
    songFontSize: 42,
    artistFontSize: 31.5,
    namesFontSize: 90,
    dateFontSize: 45
  },
  square: {
    W: 1024,
    H: 1024,
    topMargin: 70,
    bottomMargin: 70,
    leftMargin: 70,
    rightMargin: 70,
    recordDiameter: inch(10.8),
    titleFontSize: 32,
    songFontSize: 24,
    artistFontSize: 18,
    namesFontSize: 48,
    dateFontSize: 22
  }
};

export function getVinylLayoutPreset(size: VinylParams['size']): VinylLayoutPreset {
  return VINYL_LAYOUT_PRESETS[size] ?? VINYL_LAYOUT_PRESETS['16x20'];
}
