import type { PosterParams } from './types';

const INCH = 72;
const MM_TO_PX = INCH / 25.4;

export type OurskymapFixedSize = Exclude<PosterParams['size'], 'square'>;

type FixedSizeRow = {
  topMarginIn: number;
  bottomMarginIn: number;
  leftMarginIn: number;
  rightMarginIn: number;
  chartDiameterIn: number;
  ringInnerMm: number;
  ringOuterMm: number;
  ringVisibleGapMm: number;
  titleFont: number;
  namesFont: number;
  metaFont: number;
};

type CompanionFixedSizeRow = FixedSizeRow & {
  moonDiameterIn: number;
};

// Source: user-provided fixed-size table (2026-02-21)
export const ONLY_CHART_FIXED_INCH_MM: Record<OurskymapFixedSize, FixedSizeRow> = {
  'us-letter': {
    topMarginIn: 0.85,
    bottomMarginIn: 0.85,
    leftMarginIn: 0.85,
    rightMarginIn: 0.85,
    chartDiameterIn: 6.8,
    ringInnerMm: 1.87,
    ringOuterMm: 0.94,
    ringVisibleGapMm: 0.94,
    titleFont: 21.25,
    namesFont: 29.22,
    metaFont: 10.63,
  },
  a4: {
    topMarginIn: 1.3,
    bottomMarginIn: 1.3,
    leftMarginIn: 0.8,
    rightMarginIn: 0.8,
    chartDiameterIn: 6.4,
    ringInnerMm: 1.76,
    ringOuterMm: 0.88,
    ringVisibleGapMm: 0.88,
    titleFont: 20,
    namesFont: 27.5,
    metaFont: 10,
  },
  '11x14': {
    topMarginIn: 1.1,
    bottomMarginIn: 1.1,
    leftMarginIn: 1.1,
    rightMarginIn: 1.1,
    chartDiameterIn: 8.8,
    ringInnerMm: 2.43,
    ringOuterMm: 1.21,
    ringVisibleGapMm: 1.21,
    titleFont: 27.5,
    namesFont: 37.81,
    metaFont: 13.75,
  },
  a3: {
    topMarginIn: 1.9,
    bottomMarginIn: 1.9,
    leftMarginIn: 1.17,
    rightMarginIn: 1.17,
    chartDiameterIn: 9.35,
    ringInnerMm: 2.58,
    ringOuterMm: 1.29,
    ringVisibleGapMm: 1.29,
    titleFont: 29.23,
    namesFont: 40.18,
    metaFont: 14.61,
  },
  '12x12': {
    topMarginIn: 0.84,
    bottomMarginIn: 0.84,
    leftMarginIn: 1.8,
    rightMarginIn: 1.8,
    chartDiameterIn: 8.4,
    ringInnerMm: 2.31,
    ringOuterMm: 1.16,
    ringVisibleGapMm: 1.16,
    titleFont: 20.4,
    namesFont: 28.2,
    metaFont: 10.2,
  },
  '12x16': {
    topMarginIn: 1.2,
    bottomMarginIn: 1.2,
    leftMarginIn: 1.2,
    rightMarginIn: 1.2,
    chartDiameterIn: 9.6,
    ringInnerMm: 2.65,
    ringOuterMm: 1.32,
    ringVisibleGapMm: 1.32,
    titleFont: 30,
    namesFont: 41.25,
    metaFont: 15,
  },
  '16x20': {
    topMarginIn: 1.6,
    bottomMarginIn: 1.6,
    leftMarginIn: 1.6,
    rightMarginIn: 1.6,
    chartDiameterIn: 12.8,
    ringInnerMm: 3.53,
    ringOuterMm: 1.76,
    ringVisibleGapMm: 1.76,
    titleFont: 40,
    namesFont: 55,
    metaFont: 20,
  },
  a2: {
    topMarginIn: 2.69,
    bottomMarginIn: 2.69,
    leftMarginIn: 1.65,
    rightMarginIn: 1.65,
    chartDiameterIn: 13.22,
    ringInnerMm: 3.64,
    ringOuterMm: 1.82,
    ringVisibleGapMm: 1.82,
    titleFont: 41.33,
    namesFont: 56.82,
    metaFont: 20.66,
  },
  '18x24': {
    topMarginIn: 1.8,
    bottomMarginIn: 1.8,
    leftMarginIn: 1.8,
    rightMarginIn: 1.8,
    chartDiameterIn: 14.4,
    ringInnerMm: 3.69,
    ringOuterMm: 1.84,
    ringVisibleGapMm: 1.84,
    titleFont: 45,
    namesFont: 61.88,
    metaFont: 22.5,
  },
  '20x20': {
    topMarginIn: 1.4,
    bottomMarginIn: 1.4,
    leftMarginIn: 3,
    rightMarginIn: 3,
    chartDiameterIn: 14,
    ringInnerMm: 3.86,
    ringOuterMm: 1.93,
    ringVisibleGapMm: 1.93,
    titleFont: 34,
    namesFont: 47,
    metaFont: 17,
  },
  a1: {
    topMarginIn: 3.8,
    bottomMarginIn: 3.8,
    leftMarginIn: 2.34,
    rightMarginIn: 2.34,
    chartDiameterIn: 18.71,
    ringInnerMm: 4.79,
    ringOuterMm: 2.39,
    ringVisibleGapMm: 2.39,
    titleFont: 58.48,
    namesFont: 80.4,
    metaFont: 29.24,
  },
  '24x32': {
    topMarginIn: 2.4,
    bottomMarginIn: 2.4,
    leftMarginIn: 2.4,
    rightMarginIn: 2.4,
    chartDiameterIn: 19.2,
    ringInnerMm: 4.91,
    ringOuterMm: 2.46,
    ringVisibleGapMm: 2.46,
    titleFont: 60,
    namesFont: 82.5,
    metaFont: 30,
  },
};

export const STAR_CHART_MOON_FIXED_INCH_MM: Record<OurskymapFixedSize, CompanionFixedSizeRow> = {
  'us-letter': {
    topMarginIn: 0.85,
    bottomMarginIn: 0.85,
    leftMarginIn: 0.61,
    rightMarginIn: 0.61,
    moonDiameterIn: 4.84,
    chartDiameterIn: 4.84,
    ringInnerMm: 1.33,
    ringOuterMm: 0.67,
    ringVisibleGapMm: 0.67,
    titleFont: 22,
    namesFont: 30.25,
    metaFont: 11,
  },
  a4: {
    topMarginIn: 0.7,
    bottomMarginIn: 0.7,
    leftMarginIn: 1,
    rightMarginIn: 1,
    moonDiameterIn: 4.7,
    chartDiameterIn: 4.7,
    ringInnerMm: 1.3,
    ringOuterMm: 0.65,
    ringVisibleGapMm: 0.65,
    titleFont: 24,
    namesFont: 33,
    metaFont: 12,
  },
  '11x14': {
    topMarginIn: 1.1,
    bottomMarginIn: 1.1,
    leftMarginIn: 0.77,
    rightMarginIn: 0.77,
    moonDiameterIn: 6.16,
    chartDiameterIn: 6.16,
    ringInnerMm: 1.7,
    ringOuterMm: 0.85,
    ringVisibleGapMm: 0.85,
    titleFont: 28,
    namesFont: 38.5,
    metaFont: 14,
  },
  a3: {
    topMarginIn: 1.15,
    bottomMarginIn: 1.15,
    leftMarginIn: 1.15,
    rightMarginIn: 1.15,
    moonDiameterIn: 6.99,
    chartDiameterIn: 6.99,
    ringInnerMm: 1.93,
    ringOuterMm: 0.96,
    ringVisibleGapMm: 0.96,
    titleFont: 33.06,
    namesFont: 45.46,
    metaFont: 16.53,
  },
  '12x12': {
    topMarginIn: 1.86,
    bottomMarginIn: 1.86,
    leftMarginIn: 0.84,
    rightMarginIn: 0.84,
    moonDiameterIn: 5.1,
    chartDiameterIn: 5.1,
    ringInnerMm: 1.41,
    ringOuterMm: 0.7,
    ringVisibleGapMm: 0.7,
    titleFont: 24,
    namesFont: 33,
    metaFont: 12,
  },
  '12x16': {
    topMarginIn: 1.2,
    bottomMarginIn: 1.2,
    leftMarginIn: 0.88,
    rightMarginIn: 0.88,
    moonDiameterIn: 7.04,
    chartDiameterIn: 7.04,
    ringInnerMm: 1.94,
    ringOuterMm: 0.97,
    ringVisibleGapMm: 0.97,
    titleFont: 32,
    namesFont: 44,
    metaFont: 16,
  },
  '16x20': {
    topMarginIn: 1.6,
    bottomMarginIn: 1.6,
    leftMarginIn: 1.1,
    rightMarginIn: 1.1,
    moonDiameterIn: 8.8,
    chartDiameterIn: 8.8,
    ringInnerMm: 2.43,
    ringOuterMm: 1.21,
    ringVisibleGapMm: 1.21,
    titleFont: 40,
    namesFont: 55,
    metaFont: 20,
  },
  a2: {
    topMarginIn: 1.62,
    bottomMarginIn: 1.62,
    leftMarginIn: 1.62,
    rightMarginIn: 1.62,
    moonDiameterIn: 9.89,
    chartDiameterIn: 9.89,
    ringInnerMm: 2.73,
    ringOuterMm: 1.36,
    ringVisibleGapMm: 1.36,
    titleFont: 46.78,
    namesFont: 64.32,
    metaFont: 23.39,
  },
  '18x24': {
    topMarginIn: 1.8,
    bottomMarginIn: 1.8,
    leftMarginIn: 1.32,
    rightMarginIn: 1.32,
    moonDiameterIn: 10.56,
    chartDiameterIn: 10.56,
    ringInnerMm: 2.91,
    ringOuterMm: 1.46,
    ringVisibleGapMm: 1.46,
    titleFont: 48,
    namesFont: 66,
    metaFont: 24,
  },
  '20x20': {
    topMarginIn: 3.1,
    bottomMarginIn: 3.1,
    leftMarginIn: 1.4,
    rightMarginIn: 1.4,
    moonDiameterIn: 8.5,
    chartDiameterIn: 8.5,
    ringInnerMm: 2.34,
    ringOuterMm: 1.17,
    ringVisibleGapMm: 1.17,
    titleFont: 40,
    namesFont: 55,
    metaFont: 20,
  },
  a1: {
    topMarginIn: 2.3,
    bottomMarginIn: 2.3,
    leftMarginIn: 2.3,
    rightMarginIn: 2.3,
    moonDiameterIn: 14,
    chartDiameterIn: 14,
    ringInnerMm: 3.86,
    ringOuterMm: 1.93,
    ringVisibleGapMm: 1.93,
    titleFont: 66.22,
    namesFont: 91.05,
    metaFont: 33.11,
  },
  '24x32': {
    topMarginIn: 2.4,
    bottomMarginIn: 2.4,
    leftMarginIn: 1.76,
    rightMarginIn: 1.76,
    moonDiameterIn: 14.08,
    chartDiameterIn: 14.08,
    ringInnerMm: 3.6,
    ringOuterMm: 1.8,
    ringVisibleGapMm: 1.8,
    titleFont: 64,
    namesFont: 88,
    metaFont: 32,
  },
};

function toPosterPreset(row: FixedSizeRow | CompanionFixedSizeRow, withCompanionBorder = false): Partial<PosterParams> {
  const ringInnerWidth = row.ringInnerMm * MM_TO_PX;
  const ringOuterWidth = row.ringOuterMm * MM_TO_PX;
  const ringVisibleGap = row.ringVisibleGapMm * MM_TO_PX;
  const ringGap = ringVisibleGap + ringInnerWidth / 2 + ringOuterWidth / 2;
  const outerDiameter = row.chartDiameterIn * INCH;

  return {
    pageMargin: row.leftMarginIn * INCH,
    pageMarginRight: row.rightMarginIn * INCH,
    chartDiameter: outerDiameter,
    chartOuterDiameter: outerDiameter,
    ...('moonDiameterIn' in row ? { companionMoonDiameter: row.moonDiameterIn * INCH } : {}),
    ringInnerWidth,
    ringOuterWidth,
    ringGap,
    titleFontSize: row.titleFont,
    namesFontSize: row.namesFont,
    metaFontSize: row.metaFont,
    metaUppercase: true,
    ...(withCompanionBorder ? { borderWidth: ringOuterWidth } : {}),
  };
}

function mapBySize(
  source: Record<OurskymapFixedSize, FixedSizeRow>,
  withCompanionBorder = false,
): Record<OurskymapFixedSize, Partial<PosterParams>> {
  return {
    'us-letter': toPosterPreset(source['us-letter'], withCompanionBorder),
    a4: toPosterPreset(source.a4, withCompanionBorder),
    '11x14': toPosterPreset(source['11x14'], withCompanionBorder),
    a3: toPosterPreset(source.a3, withCompanionBorder),
    '12x12': toPosterPreset(source['12x12'], withCompanionBorder),
    '12x16': toPosterPreset(source['12x16'], withCompanionBorder),
    '16x20': toPosterPreset(source['16x20'], withCompanionBorder),
    a2: toPosterPreset(source.a2, withCompanionBorder),
    '18x24': toPosterPreset(source['18x24'], withCompanionBorder),
    '20x20': toPosterPreset(source['20x20'], withCompanionBorder),
    a1: toPosterPreset(source.a1, withCompanionBorder),
    '24x32': toPosterPreset(source['24x32'], withCompanionBorder),
  };
}

export const ONLY_CHART_FIXED_POSTER_PRESETS = mapBySize(ONLY_CHART_FIXED_INCH_MM);
export const STAR_CHART_MOON_FIXED_POSTER_PRESETS = mapBySize(STAR_CHART_MOON_FIXED_INCH_MM, true);

export function getFixedVerticalSpacingPx(
  size: PosterParams['size'],
  mode: 'single' | 'companion',
): { topMargin: number; bottomMargin: number } | null {
  if (size === 'square') return null;
  const row = mode === 'companion' ? STAR_CHART_MOON_FIXED_INCH_MM[size] : ONLY_CHART_FIXED_INCH_MM[size];
  if (!row) return null;
  return {
    topMargin: row.topMarginIn * INCH,
    bottomMargin: row.bottomMarginIn * INCH,
  };
}
