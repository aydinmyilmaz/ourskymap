import type { PosterRequest } from './types';
import type { CityMapRequest } from './citymap';

export const CHECKOUT_DRAFT_KEY = 'ourskymap_checkout_draft_v1';

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
  mapShape?: 'rectangle' | 'circle';
  cityEditor?: {
    size: 'a2' | 'us-letter' | '16x20' | '18x24';
    frameOn: boolean;
    palette: string;
    cityQuery: string;
    locationLabel: string;
    lat: number;
    lon: number;
    fontPreset: string;
    textStyle: 'simplified' | 'uppercase' | 'classic';
    mapShape: 'rectangle' | 'circle';
    pinChoice: 'none' | 'classic' | 'love' | 'pushpin' | 'heart' | 'cross' | 'home' | 'graduation';
    mapThemeKey:
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
    zoom: number;
    baseStyle: 'streets' | 'light' | 'dark';
    mapColors: {
      bg: string;
      water: string;
      motorway: string;
      primary: string;
      minor: string;
      building: string;
    };
    motorwayWidth: number;
    primaryRoadWidth: number;
    minorRoadWidth: number;
    motorwayTone: number;
    primaryTone: number;
    minorTone: number;
    title: string;
    subtitle: string;
    textScalePercent: number;
    textYOffset: number;
  };
};

export type CheckoutDraft = {
  createdAtIso: string;
  productType?: 'sky' | 'city';
  previewSvg: string;
  renderRequest: PosterRequest | CityMapRequest;
  mapData: CheckoutMapData;
};
