export type Theme = 'light' | 'dark';
export type StarMode = 'none' | 'constellations' | 'all';

export type RenderParams = {
  theme: Theme;
  showAzimuthScale: boolean;
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
  size: 'a4' | 'square' | '16x20' | '20x20';
  palette:
    | 'classic-black'
    | 'midnight'
    | 'navy-gold'
    | 'cream-ink'
    | 'forest'
    | 'emerald'
    | 'plum'
    | 'burgundy'
    | 'slate'
    | 'sand';
  inkColor: string;
  border: boolean;
  borderWidth: number;
  borderInset: number;
  chartDiameter: number;
  title: string;
  subtitle: string;
  dedication: string;
  showCoordinates: boolean;
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
