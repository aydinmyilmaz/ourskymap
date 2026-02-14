export type Theme = 'light' | 'dark';
export type StarMode = 'none' | 'constellations' | 'all';

export type RenderParams = {
  theme: Theme;
  showAzimuthScale: boolean;
  showCoordinateGrid: boolean;
  coordinateGridStepDeg: number;
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
  size: 'a4' | 'square' | '16x20' | '20x20' | 'a2' | 'us-letter' | '18x24';
  palette:
    | 'classic-black'
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
    | 'pearl';
  inkColor: string;
  border: boolean;
  borderWidth: number;
  borderInset: number;
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
