export type TemplateSlot = {
  index: number;
  x: number;
  y: number;
  scale: number;
  zIndex: number;
};

export type TextStyleKey =
  | 'varsity'
  | 'impact'
  | 'elegant'
  | 'script'
  | 'classic'
  | 'chrome-3d'
  | 'emboss-3d'
  | 'neon-script';

export type TextSlot = {
  index: number;
  x: number;
  y: number;
  fontSize: number;
  styleKey: TextStyleKey;
  color: string;
  text: string;
};

export type DesignTemplate = {
  id: string;
  name: string;
  thumbnail: string;
  backgroundUrl: string;
  slots: TemplateSlot[];
  textSlots: TextSlot[];
};

// Add new templates here. Assets go in /public/templates/.
export const DESIGN_TEMPLATES: DesignTemplate[] = [
  {
    id: 'custom-lightning-5',
    name: 'Custom Lightning (5-person)',
    thumbnail: '/templates/custom-lightning-thumb.jpg',
    backgroundUrl: '/templates/custom-lightning-bg.jpg',
    slots: [
      { index: 0, x: 310, y: 480, scale: 1.0, zIndex: 5 },
      { index: 1, x: 150, y: 390, scale: 0.75, zIndex: 4 },
      { index: 2, x: 470, y: 390, scale: 0.75, zIndex: 3 },
      { index: 3, x: 120, y: 580, scale: 0.65, zIndex: 2 },
      { index: 4, x: 500, y: 580, scale: 0.65, zIndex: 1 },
    ],
    textSlots: [
      { index: 0, x: 310, y: 80,  fontSize: 96, styleKey: 'chrome-3d', color: '#ff6ec7', text: 'CUSTOM' },
      { index: 1, x: 310, y: 720, fontSize: 36, styleKey: 'varsity',   color: '#ffffff', text: 'Your Text Here' },
    ],
  },
];
