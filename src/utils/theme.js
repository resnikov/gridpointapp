// GridPoint design tokens — dark, utilitarian, radio-operator aesthetic
// Inspired by navigation instruments and radio equipment displays

export const colors = {
  bg: '#080c10',
  bgCard: '#0e1318',
  bgElevated: '#141c24',
  border: '#1e2d3d',
  borderSubtle: '#162030',

  accent: '#00e5ff',       // cyan — principal
  accentDim: '#0099bb',
  accentGlow: 'rgba(0,229,255,0.15)',
  accentGlow2: 'rgba(0,229,255,0.08)',

  amber: '#ffb300',        // amber — secondary / warnings
  amberDim: 'rgba(255,179,0,0.7)',
  amberGlow: 'rgba(255,179,0,0.12)',

  green: '#00e676',
  red: '#ff1744',

  text: '#e8f4f8',
  textMid: '#7a9ab0',
  textDim: '#3d5566',

  overlay: 'rgba(8,12,16,0.85)',
};

export const fonts = {
  mono: 'Courier',  // fallback; app should load SpaceMono
  display: 'System',
};

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 20,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
};
