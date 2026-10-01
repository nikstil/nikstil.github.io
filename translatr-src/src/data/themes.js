// Site themes. The chosen id goes on <html data-theme="…">; src/themes.css does the rest.
// `chrome` is the browser UI colour (meta theme-color); `cursor` picks the cursor set.

// In order of the era each one comes from: a short history of interface design, ending with the
// internet being nostalgic about all of it. Luna, Aqua and Vaporwave are the nikstilOS themes
// (nikstil.com); the ids match, so a pick carries over between the two.
export const THEMES = [
  { id: 'retro', name: 'Retro 95', blurb: 'Beige boxes, pixels, a 56k modem (1995)', swatch: ['#008080', '#cfc8b6', '#000080'], chrome: '#008080', cursor: 'pixel' },
  { id: 'y2k', name: 'Y2K Cyber-Goth', blurb: 'Chrome, barbed wire, dial-up angst (1999)', swatch: ['#07070b', '#c9ced8', '#b6ff1a'], chrome: '#07070b', cursor: 'chrome' },
  { id: 'luna', name: 'Luna', blurb: 'A green Start button and a very green hill (2001)', swatch: ['#245edb', '#3c9a3c', '#8cc2f5'], chrome: '#245edb', cursor: 'aero' },
  { id: 'aqua', name: 'Aqua', blurb: 'Pinstripes, gel and traffic lights (2002)', swatch: ['#1d63d3', '#ececec', '#ff5f57'], chrome: '#1d63d3', cursor: 'stark' },
  { id: 'aero', name: 'Aero', blurb: 'Glass, gloss and optimism (2009)', swatch: ['#1360b9', '#9fd6f5', '#7fcf55'], chrome: '#1a73c4', cursor: 'aero' },
  { id: 'skeuo', name: 'Skeuomorphism', blurb: 'Leather, brushed metal, real fake stitching (2010)', swatch: ['#6b4327', '#d6d6d6', '#d4a93f'], chrome: '#5a3a22', cursor: 'brass' },
  { id: 'metro', name: 'Metro', blurb: 'Flat tiles, loud colours, no Start button (2012)', swatch: ['#5133ab', '#2d89ef', '#00a300'], chrome: '#2b1361', cursor: 'stark' },
  { id: 'minimal', name: 'Minimalist', blurb: 'Nothing. Beautifully. Still has ads. (2013)', swatch: ['#ffffff', '#000000', '#ffffff'], chrome: '#ffffff', cursor: 'stark' },
  { id: 'vapor', name: 'Vaporwave', blurb: 'Ａ Ｅ Ｓ Ｔ Ｈ Ｅ Ｔ Ｉ Ｃ sunsets on a neon grid (199X, forever)', swatch: ['#ff71ce', '#b967ff', '#01cdfe'], chrome: '#2b0f4f', cursor: 'pixel' },
  { id: 'glass', name: 'Liquid Glass', blurb: 'Every surface is a lens now (2025)', swatch: ['#7fe3ff', '#ffffff', '#ff9ad5'], chrome: '#5b7cff', cursor: 'aero' },
]

export const THEME_IDS = THEMES.map((t) => t.id)
export const DEFAULT_THEME = 'luna' // the look new players get
export const themeById = (id) => THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === DEFAULT_THEME)
