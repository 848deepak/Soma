// ── Soma Design System Tokens ─────────────────────────────────────────────
// Aligned with Figma "Day (Cream)" and "Midnight (Dark)" themes

export const lightTheme = {
  // Backgrounds
  background: '#FFFDFB',  // Warm cream
  surface: '#FFFFFF',
  card: '#FFFFFF',
  // Brand colors
  primary: '#DDA7A5',     // Dusty rose — main CTA
  primaryDark: '#C89896', // Gradient end
  secondary: '#FFDAB9',   // Peach
  accent: '#9B7E8C',      // Mauve
  // Text
  textPrimary: '#2D2327', // Charcoal
  textSecondary: '#9B7E8C',
  // Borders
  border: 'rgba(221,167,165,0.2)',
  borderLight: 'rgba(255,255,255,0.6)',
  // Glow tint
  glow: '#F8EDE6',
};

export const darkTheme = {
  // Backgrounds
  background: '#0F1115',  // Deep blue-black
  surface: '#1A1D24',
  card: '#1E2128',
  // Brand colors (Figma Midnight theme accents)
  primary: '#A78BFA',     // Soft purple
  primaryDark: '#7C6BE8',
  secondary: '#818CF8',   // Periwinkle
  accent: '#F2F2F2',
  // Text
  textPrimary: '#F2F2F2',
  textSecondary: 'rgba(242,242,242,0.6)',
  // Borders
  border: 'rgba(255,255,255,0.1)',
  borderLight: 'rgba(255,255,255,0.08)',
  // Glow tint
  glow: '#4F46E5',
};

export type AppTheme = typeof lightTheme;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  // Figma standard padding
  screenH: 28, // Horizontal screen padding (Figma spec: 24-28px)
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  card: 28,
  cardLg: 32,
  pill: 999,
};

export const shadows = {
  soft: {
    shadowColor: '#DDA7A5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  glass: {
    shadowColor: '#DDA7A5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 6,
  },
  glow: {
    shadowColor: '#DDA7A5',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 12,
  },
  dark: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
  },
};
