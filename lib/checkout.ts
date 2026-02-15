import type { PosterRequest } from './types';

export const CHECKOUT_DRAFT_KEY = 'ourskymap_checkout_draft_v1';

export type CheckoutMapData = {
  city: string;
  date: string;
  time: string;
  title: string;
  names: string;
  font: string;
  showConstellations: boolean;
  showGraticule: boolean;
  palette: string;
  size: string;
  frameOn: boolean;
  lat: number;
  lon: number;
  locationLine: string;
};

export type CheckoutDraft = {
  createdAtIso: string;
  previewSvg: string;
  renderRequest: PosterRequest;
  mapData: CheckoutMapData;
};
