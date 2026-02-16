export type Theme = 'light' | 'dark';
export type StarMode = 'none' | 'constellations' | 'all';

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
    | 'deep-teal';
  inkColor: string;
  inkFinish?: 'flat' | 'texture';
  inkTexture?: 'gold' | 'silver';
  border: boolean;
  borderWidth: number;
  borderInset: number;
  pageMargin?: number;
  chartDiameter: number;
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
  moonPhaseImageUrl?: string;
  showCompanionPhoto?: boolean;
  companionPhotoImageUrl?: string;
  renderVariant?: 'normal' | 'ink-mask';
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

export type VinylParams = {
  size: 'a4' | 'square' | '16x20' | '20x20';
  palette: PosterParams['palette'];
  inkColor: string;
  backgroundTexture: 'solid' | 'paper' | 'marble' | 'noise';
  recordImageDataUrl?: string;
  labelImageDataUrl?: string;
  diskDiameter: number;
  ringCountMax: number;
  ringFontSize: number;
  ringLetterSpacing: number;
  ringLineGap: number;
  title: string;
  songTitle: string;
  artist: string;
  outerText: string;
  names: string;
  dateLine: string;
  showCenterGuides: boolean;
  titleFont: PosterParams['titleFont'];
  titleFontSize: number;
  titleArcCurvature: number;
  titleArcWidth: number;
  namesFont: PosterParams['namesFont'];
  namesFontSize: number;
  namesLetterSpacing: number;
  namesLineSpacing: number;
  namesYOffset: number;
  dateFont: PosterParams['metaFont'];
  dateFontSize: number;
  dateLetterSpacing: number;
  dateLineSpacing: number;
  dateYOffset: number;
  metaFont: PosterParams['metaFont'];
  metaFontSize: number;
};

export type VinylRequest = {
  vinyl: VinylParams;
};
