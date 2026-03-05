export type Theme = 'light' | 'dark';
export type StarMode = 'none' | 'constellations' | 'all';
export type ConstellationLanguage = 'latin' | 'en' | 'de' | 'es';

export type RenderParams = {
  theme: Theme;
  showAzimuthScale: boolean;
  showCoordinateGrid: boolean;
  coordinateGridStepDeg: number;
  labelPlacementStrategy: 'none' | 'smart';
  labelCollisionPadding: number;
  labelMaxShift: number;
  maxConstellationLabels: number;
  maxStarLabels: number;
  labelStarNames: boolean;
  labelConstellations: boolean;
  labelSolarSystem: boolean;
  mirrorHorizontal: boolean;
  showSolarSystem: boolean;
  showDeepSky: boolean;
  labelDeepSky: boolean;
  starMode: StarMode;
  magnitudeLimit: number;
  minStarSize: number;
  starSizeMin: number;
  starSizeMax: number;
  starSizeGamma: number;
  starAlpha: number;
  emphasizeVertices: boolean;
  vertexSizeMin: number;
  vertexSizeMax: number;
  vertexSizeGamma: number;
  vertexAlpha: number;
  constellationLineWidth: number;
  constellationLineAlpha: number;
  eclipticAlpha: number;
  azimuthRingInnerWidth: number;
  azimuthRingOuterWidth: number;
  constellationLanguage?: ConstellationLanguage;
};

export type ChartRequest = {
  latitude: number;
  longitude: number;
  timeUtcIso: string;
  timeZone?: string;
  timeLocal?: string;
  locationLabel: string;
  params: RenderParams;
};

export type PosterParams = {
  size:
  | 'a4'
  | 'square'
  | '16x20'
  | '20x20'
  | 'a2'
  | 'us-letter'
  | '18x24'
  | '11x14'
  | 'a3'
  | '12x12'
  | '12x16'
  | 'a1'
  | '24x32';
  palette:
  | 'classic-black'
  | 'graphite'
  | 'deep-navy'
  | 'royal-blue'
  | 'ocean-teal'
  | 'mustard-gold'
  | 'burnt-orange'
  | 'terracotta-red'
  | 'midnight'
  | 'navy-gold'
  | 'cream-ink'
  | 'night-gold'
  | 'twilight-blue'
  | 'storm-gray'
  | 'mocha'
  | 'soft-sage'
  | 'blush-night'
  | 'forest'
  | 'emerald'
  | 'plum'
  | 'burgundy'
  | 'slate'
  | 'sand'
  | 'pearl'
  | 'navy-blue'
  | 'gold-black'
  | 'dark-green'
  | 'classic-burgundy'
  | 'deep-teal'
  | 'minimal-white';
  inkColor: string;
  inkPreset?: 'gold' | 'silver';
  border: boolean;
  borderWidth: number;
  borderInset: number;
  pageMargin?: number;
  pageMarginRight?: number;
  chartDiameter: number;
  chartOuterDiameter?: number;
  companionMoonDiameter?: number;
  title: string;
  subtitle: string;
  dedication: string;
  showCoordinates: boolean;
  coordsInline: boolean;
  showTime: boolean;
  includeAzimuthScale: boolean;
  showCardinals: boolean;
  ringInnerWidth: number;
  ringGap: number;
  ringOuterWidth: number;
  titleFont: 'serif' | 'sans' | 'mono' | 'prata';
  titleFontSize: number;
  namesFont: 'serif' | 'sans' | 'cursive' | 'jimmy-script';
  namesFontSize: number;
  metaFont: 'sans' | 'serif' | 'mono' | 'signika';
  metaFontSize: number;
  metaText: string;
  metaFontWeight: 400 | 500 | 700;
  metaLetterSpacing: number;
  metaLineSpacing: number;
  metaUppercase: boolean;
  showMoonPhase?: boolean;
  moonPhaseOnly?: boolean;
  moonPhaseImageUrl?: string;
  showCompanionPhoto?: boolean;
  companionPhotoImageUrl?: string;
  showRuler?: boolean;
  posterVariant?: 'classic' | 'galaxy';
  backgroundMode?: 'solid' | 'image';
  backgroundImageUrl?: string;
};

export type PosterRequest = {
  latitude: number;
  longitude: number;
  timeUtcIso: string;
  timeZone?: string;
  timeLocal?: string;
  locationLabel: string;
  params: RenderParams;
  poster: PosterParams;
};
