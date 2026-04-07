// ── Soma Design System Tokens ─────────────────────────────────────────────
// Aligned with Figma "Day (Cream)" and "Midnight (Dark)" themes

export const lightTheme = {
  // Backgrounds
  background: "#FFFDFB", // Warm cream
  surface: "#FFFFFF",
  card: "#FFFFFF",
  // Brand colors
  primary: "#DDA7A5", // Dusty rose
  primaryDark: "#C89896",
  secondary: "#FFDAB9", // Peach
  accent: "#9B7E8C", // Mauve
  // Text
  textPrimary: "#2D2327", // Charcoal
  textSecondary: "#9B7E8C",
  // Borders
  border: "rgba(221,167,165,0.2)",
  borderLight: "rgba(255,255,255,0.6)",
  // Glow tint
  glow: "#F8EDE6",
};

export const darkTheme = {
  // Backgrounds
  background: "#0F1115", // Deep blue-black
  surface: "#1A1D24",
  card: "#1E2128",
  // Brand colors (Figma Midnight theme accents)
  primary: "#A78BFA", // Soft purple
  primaryDark: "#7C6BE8",
  secondary: "#6366F1", // Indigo
  accent: "#4F46E5",
  // Text
  textPrimary: "#F2F2F2",
  textSecondary: "rgba(242,242,242,0.6)",
  // Borders
  border: "rgba(255,255,255,0.1)",
  borderLight: "rgba(255,255,255,0.08)",
  // Glow tint
  glow: "#4F46E5",
};

export const lavenderTheme = {
  // Backgrounds
  background: "#F3F0FF",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  // Brand colors
  primary: "#9B8AC4",
  primaryDark: "#7C6B9E",
  secondary: "#C1BBDD",
  accent: "#7C6B9E",
  // Text
  textPrimary: "#2D2327",
  textSecondary: "#7C6B9E",
  // Borders
  border: "rgba(155,138,196,0.22)",
  borderLight: "rgba(255,255,255,0.68)",
  // Glow tint
  glow: "#E8E0F8",
};

export type ThemeType = "cream" | "midnight" | "lavender";

export const themeByType = {
  cream: lightTheme,
  midnight: darkTheme,
  lavender: lavenderTheme,
} as const;

export const isDarkThemeType = (theme: ThemeType): boolean =>
  theme === "midnight";

const cycleCalendarCream = {
    screenBackground: "#FAF7F4",
    panelBackground: "rgba(255,255,255,0.88)",
    legendBackground: "rgba(248,237,230,0.7)",
    detailBackground: "rgba(248,237,230,0.56)",
    periodFill: "#E8A0A0",
    predictedPeriodFill: "#E8A0A0",
    predictedPeriodBorder: "rgba(163,95,102,0.38)",
    fertileFill: "#F5D5A0",
    predictedFertileFill: "#F5D5A0",
    ovulationFill: "rgba(245,213,160,0.45)",
    ovulationBorder: "#D9A35D",
    todayRing: "#D94D57",
    selectedRing: "#B58A95",
  };

const cycleCalendarMidnight = {
    screenBackground: "#0F1115",
    panelBackground: "rgba(24,27,32,0.84)",
    legendBackground: "rgba(31,35,40,0.8)",
    detailBackground: "rgba(40,44,50,0.86)",
    periodFill: "rgba(194,130,136,0.78)",
    predictedPeriodFill: "rgba(194,130,136,0.42)",
    predictedPeriodBorder: "rgba(255,214,214,0.35)",
    fertileFill: "rgba(250,201,128,0.52)",
    predictedFertileFill: "rgba(250,201,128,0.3)",
    ovulationFill: "rgba(250,201,128,0.35)",
    ovulationBorder: "#E6B76F",
    todayRing: "#E9868E",
    selectedRing: "#B48B96",
};

const cycleCalendarLavender = {
  screenBackground: "#F3F0FF",
  panelBackground: "rgba(255,255,255,0.84)",
  legendBackground: "rgba(232,224,248,0.72)",
  detailBackground: "rgba(232,224,248,0.56)",
  periodFill: "rgba(155,138,196,0.72)",
  predictedPeriodFill: "rgba(155,138,196,0.42)",
  predictedPeriodBorder: "rgba(124,107,158,0.45)",
  fertileFill: "rgba(193,187,221,0.72)",
  predictedFertileFill: "rgba(193,187,221,0.46)",
  ovulationFill: "rgba(193,187,221,0.38)",
  ovulationBorder: "#7C6B9E",
  todayRing: "#C084FC",
  selectedRing: "#9B8AC4",
};

export const cycleCalendarTheme = {
  cream: cycleCalendarCream,
  midnight: cycleCalendarMidnight,
  lavender: cycleCalendarLavender,
  // Backward-compatible aliases for existing callers.
  light: cycleCalendarCream,
  dark: cycleCalendarMidnight,
};

export const cycleCalendarMotion = {
  swipeActivationDx: 8,
  swipeDistanceThreshold: 24,
  swipeVelocityThreshold: 0.3,
  swipeVelocityWeight: 140,
  todayIntroDelayMs: 150,
  todayIntroDamping: 16,
  todayIntroStiffness: 220,
  monthEnterOffsetX: 44,
  monthEnterOpacity: 0.55,
  monthSpringDamping: 20,
  monthSpringStiffness: 200,
  monthFadeDurationMs: 220,
  overviewDurationMs: 320,
  overviewFadeOutDurationMs: 280,
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
    shadowColor: "#DDA7A5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  glass: {
    shadowColor: "#DDA7A5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 6,
  },
  glow: {
    shadowColor: "#DDA7A5",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 12,
  },
  dark: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
  },
};
