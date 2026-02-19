export type TemplateSlot = {
  index: number;  // 0-based; maps to the Nth extracted person in order
  x: number;      // canvas x in design units (0–620)
  y: number;      // canvas y in design units (0–780)
  scale: number;  // initial scale, e.g. 0.8
  zIndex: number; // stacking order (higher = in front)
};

export type DesignTemplate = {
  id: string;
  name: string;
  thumbnail: string;    // path relative to /public, e.g. /templates/custom-lightning-thumb.jpg
  backgroundUrl: string; // path relative to /public, e.g. /templates/custom-lightning-bg.jpg
  slots: TemplateSlot[];
};

// Add new templates here. Assets go in /public/templates/.
export const DESIGN_TEMPLATES: DesignTemplate[] = [
  {
    id: 'custom-lightning-5',
    name: 'Custom Lightning (5-person)',
    thumbnail: '/templates/custom-lightning-thumb.jpg',
    backgroundUrl: '/templates/custom-lightning-bg.jpg',
    slots: [
      // Center (largest, front)
      { index: 0, x: 310, y: 480, scale: 1.0, zIndex: 5 },
      // #1 top-left
      { index: 1, x: 150, y: 390, scale: 0.75, zIndex: 4 },
      // #2 top-right
      { index: 2, x: 470, y: 390, scale: 0.75, zIndex: 3 },
      // #3 bottom-left
      { index: 3, x: 120, y: 580, scale: 0.65, zIndex: 2 },
      // #4 bottom-right
      { index: 4, x: 500, y: 580, scale: 0.65, zIndex: 1 },
    ],
  },
];
