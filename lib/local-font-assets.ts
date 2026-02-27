export type LocalFontAsset = {
  family: string;
  weight: number;
  style: 'normal' | 'italic';
  fileName: string;
};

// Centralized local font registry used by both runtime CSS and export workers.
export const LOCAL_FONT_ASSETS: LocalFontAsset[] = [
  { family: 'Allura', weight: 400, style: 'normal', fileName: 'Allura-Regular.ttf' },
  { family: 'Great Vibes', weight: 400, style: 'normal', fileName: 'GreatVibes-Regular.ttf' },
  { family: 'Prata', weight: 400, style: 'normal', fileName: 'Prata-Regular.ttf' },
  { family: 'Signika', weight: 400, style: 'normal', fileName: 'Signika-Regular.ttf' },
  { family: 'Signika', weight: 500, style: 'normal', fileName: 'Signika-Medium.ttf' },
  { family: 'Signika', weight: 700, style: 'normal', fileName: 'Signika-Bold.ttf' },

  // Vinyl text fonts from spec.
  { family: 'Big Shoulders Display', weight: 400, style: 'normal', fileName: 'BigShouldersDisplay-Variable.ttf' },
  { family: 'Big Shoulders Display', weight: 700, style: 'normal', fileName: 'BigShouldersDisplay-Variable.ttf' },
  { family: 'Big Shoulders Display', weight: 800, style: 'normal', fileName: 'BigShouldersDisplay-Variable.ttf' },
  { family: 'Courier Prime', weight: 400, style: 'normal', fileName: 'CourierPrime-Regular.ttf' },
  { family: 'Courier Prime', weight: 700, style: 'normal', fileName: 'CourierPrime-Bold.ttf' },
  { family: 'Amsterdam Four', weight: 400, style: 'normal', fileName: 'AlexBrush-Regular.ttf' },
  { family: 'Corinthia', weight: 400, style: 'normal', fileName: 'Corinthia-Regular.ttf' },
  { family: 'Meow Script', weight: 400, style: 'normal', fileName: 'MeowScript-Regular.ttf' },
  { family: 'Mrs Saint Delafield', weight: 400, style: 'normal', fileName: 'MrsSaintDelafield-Regular.ttf' },
  { family: 'WindSong', weight: 400, style: 'normal', fileName: 'WindSong-Regular.ttf' },
  { family: 'Sacramento', weight: 400, style: 'normal', fileName: 'Sacramento-Regular.ttf' },
  { family: 'Montez', weight: 400, style: 'normal', fileName: 'Montez-Regular.ttf' },

  // Vinyl lyrics font family aliases.
  { family: 'Rage Italic', weight: 400, style: 'italic', fileName: 'RougeScript-Regular.ttf' },
  { family: 'Lucida Handwriting', weight: 400, style: 'normal', fileName: 'DancingScript-Variable.ttf' },
  { family: 'Vladimir Script', weight: 400, style: 'normal', fileName: 'Parisienne-Regular.ttf' },
  { family: 'Ink Free', weight: 500, style: 'normal', fileName: 'PatrickHand-Regular.ttf' },
  { family: 'Viner Hand ITC', weight: 500, style: 'normal', fileName: 'PermanentMarker-Regular.ttf' },
  { family: 'Pristina', weight: 500, style: 'normal', fileName: 'Satisfy-Regular.ttf' },
  { family: 'Bodoni MT', weight: 500, style: 'normal', fileName: 'BodoniModa-Variable.ttf' },
  { family: 'Felix Titling', weight: 600, style: 'normal', fileName: 'Cinzel-Variable.ttf' },
  { family: 'Engravers MT', weight: 700, style: 'normal', fileName: 'CinzelDecorative-Regular.ttf' },
  { family: 'Algerian', weight: 700, style: 'normal', fileName: 'AlmendraDisplay-Regular.ttf' },
  { family: 'Harrington', weight: 500, style: 'normal', fileName: 'MarcellusSC-Regular.ttf' },
  { family: 'Imprint MT Shadow', weight: 500, style: 'normal', fileName: 'BungeeShade-Regular.ttf' },
  { family: 'Poor Richard', weight: 500, style: 'normal', fileName: 'IMFellEnglishSC-Regular.ttf' }
];

export function buildLocalFontFaceCss(): string {
  return LOCAL_FONT_ASSETS.map((asset) =>
    [
      '@font-face {',
      `  font-family: '${asset.family}';`,
      `  font-style: ${asset.style};`,
      `  font-weight: ${asset.weight};`,
      '  font-display: swap;',
      `  src: url('/fonts/${asset.fileName}') format('truetype');`,
      '}'
    ].join('\n')
  ).join('\n');
}
