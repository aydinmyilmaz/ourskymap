import type { PosterRequest } from './types';

export const CHECKOUT_DRAFT_KEY = 'ourskymap_checkout_draft_v2';

export type CheckoutMapData = {
  city: string;
  date?: string;
  time?: string;
  title: string;
  names: string;
  font: string;
  showConstellations?: boolean;
  showStarNames?: boolean;
  showConstellationNames?: boolean;
  showPlanetNames?: boolean;
  showGraticule?: boolean;
  showTime?: boolean;
  companionPhoto?: boolean;
  palette: string;
  inkColor?: string;
  lineColor?: string;
  size: string;
  frameOn: boolean;
  lat: number;
  lon: number;
  locationLine: string;
};

export type CheckoutDraft = {
  createdAtIso: string;
  productType?: 'sky';
  previewSvg: string;
  renderRequest: PosterRequest;
  mapData: CheckoutMapData;
};
