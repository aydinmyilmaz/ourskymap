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
  | 'deep-teal';
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

export type VinylTitleFont = PosterParams['titleFont'] | 'big-shoulders';
export type VinylNamesFont = PosterParams['namesFont'] | 'amsterdam-four';
export type VinylMetaFont = PosterParams['metaFont'] | 'courier-prime' | 'big-shoulders';

export type VinylParams = {
  size: PosterParams['size'];
  palette: PosterParams['palette'];
  inkColor: string;
  lyricsFontPreset:
    | 'font-1'
    | 'font-2'
    | 'font-3'
    | 'font-4'
    | 'font-5'
    | 'font-6'
    | 'font-7'
    | 'font-8'
    | 'font-9'
    | 'font-10'
    | 'font-11'
    | 'font-12'
    | 'font-13'
    | 'font-14'
    | 'font-15';
  backgroundTexture: 'solid' | 'paper' | 'marble' | 'noise';
  recordImageDataUrl?: string;
  labelImageDataUrl?: string;
  backgroundImageDataUrl?: string;
  diskDiameter: number;
  ringCountMax: number;
  ringFontSize: number;
  ringLetterSpacing: number;
  ringLineGap: number;
  lyricsTextColor: string;
  labelTextColor: string;
  lyricsTextCase: 'original' | 'upper' | 'lower';
  title: string;
  songTitle: string;
  artist: string;
  outerText: string;
  names: string;
  dateLine: string;
  showDisk: boolean;
  showCenterLabel: boolean;
  showCenterGuides: boolean;
  showRuler: boolean;
  titleFont: VinylTitleFont;
  titleFontSize: number;
  titleArcCurvature: number;
  titleArcWidth: number;
  namesFont: VinylNamesFont;
  namesFontSize: number;
  namesLetterSpacing: number;
  namesLineSpacing: number;
  namesYOffset: number;
  dateFont: VinylMetaFont;
  dateFontSize: number;
  dateLetterSpacing: number;
  dateLineSpacing: number;
  dateYOffset: number;
  metaFont: VinylMetaFont;
  metaFontSize: number;
};

export type VinylRequest = {
  vinyl: VinylParams;
};

export type SoundwaveParams = {
  size:
    | '4x6'
    | '5x7'
    | '6x9'
    | '8x10'
    | '11x14'
    | '24x8'
    | '16x20'
    | '18x24'
    | '30x10'
    | '36x12'
    | '42x14'
    | '48x16'
    | '54x18';
  palette:
    | 'multicolor-1'
    | 'multicolor-2'
    | 'multicolor-3'
    | 'multicolor-4'
    | 'multicolor-5'
    | 'multicolor-6'
    | 'multicolor-7'
    | 'multicolor-8'
    | 'multicolor-9'
    | 'multicolor-10'
    | 'gold'
    | 'silver'
    | 'emerald-green'
    | 'black'
    | 'white'
    | 'sapphire'
    | 'emerald'
    | 'amethyst'
    | 'iridescent'
    | 'bronze'
    | 'copper'
    | 'ruby'
    | 'onyx'
    | 'seafoam'
    | 'apple'
    | 'cantaloupe'
    | 'ocean'
    | 'mauve'
    | 'after-dark'
    | 'magenta'
    | 'peacock'
    | 'spice'
    | 'rainbow-1'
    | 'rainbow-2'
    | 'sunset';
  fontPreset: 'f1' | 'f2' | 'f3' | 'f4' | 'f5' | 'f6' | 'f7' | 'f8';
  textCase: 'original' | 'upper' | 'lower';
  textColor: string;
  title: string;
  subtitle: string;
  caption: string;
  backgroundColor: string;
  peaks: number[];
  waveStyle: 'filled' | 'scanlines' | 'spikes' | 'brush-lines' | 'brush-spike';
  qrMode: 'none' | 'qr' | 'picture' | 'picture-qr';
  qrPosition?: 'bottom-right' | 'title-end';
  qrContent: string;
  qrImageDataUrl?: string;
  showSpotifyCode?: boolean;
  spotifyUri?: string;
  spotifyCodeImageDataUrl?: string;
  pictureImageDataUrl?: string;
  waveHeight: number;
  waveThickness: number;
  waveformOpacity: number;
  showFrame: boolean;
};

export type SoundwaveRequest = {
  soundwave: SoundwaveParams;
};
