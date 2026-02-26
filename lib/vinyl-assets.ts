export type VinylImagePreset = {
  key: string;
  label: string;
  src: string;
};

export const VINYL_BACKGROUND_PRESETS: VinylImagePreset[] = [
  { key: 'bg-a', label: 'Background A', src: '/vinyl/backgrounds/a.jpg' },
  { key: 'bg-b', label: 'Background B', src: '/vinyl/backgrounds/b.jpg' },
  { key: 'bg-c', label: 'Background C', src: '/vinyl/backgrounds/c.jpg' },
  { key: 'bg-d', label: 'Background D', src: '/vinyl/backgrounds/d.jpg' },
  { key: 'bg-e', label: 'Background E', src: '/vinyl/backgrounds/e.jpg' },
  { key: 'bg-f', label: 'Background F', src: '/vinyl/backgrounds/f.jpg' },
  { key: 'bg-7', label: 'Background 7', src: '/vinyl/backgrounds/7.jpg' },
  { key: 'bg-8', label: 'Background 8', src: '/vinyl/backgrounds/8.jpg' },
  { key: 'bg-9', label: 'Background 9', src: '/vinyl/backgrounds/9.jpg' },
  { key: 'bg-10', label: 'Background 10', src: '/vinyl/backgrounds/10.jpg' },
  { key: 'bg-11', label: 'Background 11', src: '/vinyl/backgrounds/11.jpg' },
  { key: 'bg-12', label: 'Background 12', src: '/vinyl/backgrounds/12.jpg' }
];

export const VINYL_DISK_PRESETS: VinylImagePreset[] = [
  { key: 'disk-vintage-black', label: 'Vintage Black', src: '/vinyl/labels/disk-vintage-black.png' },
  { key: 'disk-vintage-blue', label: 'Vintage Blue', src: '/vinyl/labels/disk-vintage-blue.png' },
  { key: 'disk-vintage-brass', label: 'Vintage Brass', src: '/vinyl/labels/disk-vintage-brass.png' },
  { key: 'disk-vintage-gold', label: 'Vintage Gold', src: '/vinyl/labels/disk-vintage-gold.png' },
  { key: 'disk-vintage-grey', label: 'Vintage Grey', src: '/vinyl/labels/disk-vintage-grey.png' },
  { key: 'disk-vintage-retro-black', label: 'Vintage Retro Black', src: '/vinyl/labels/disk-vintage-retro-black.png' },
  { key: 'disk-vintage-rose', label: 'Vintage Rose', src: '/vinyl/labels/disk-vintage-rose.png' },
  { key: 'disk-vintage-turkuaz', label: 'Vintage Turkuaz', src: '/vinyl/labels/disk-vintage-turkuaz.png' },
  { key: 'disk-vintage-yellow', label: 'Vintage Yellow', src: '/vinyl/labels/disk-vintage-yellow.png' }
];

export const VINYL_LABEL_PRESETS: VinylImagePreset[] = [
  { key: 'label-silver', label: 'Silver', src: '/vinyl/labels/label-silver.png' },
  { key: 'label-gold', label: 'Gold', src: '/vinyl/labels/label-gold.png' },
  { key: 'label-rose', label: 'Rose', src: '/vinyl/labels/label-rose.png' }
];
