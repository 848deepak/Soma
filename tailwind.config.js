/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'media',
  presets: [require('nativewind/preset')],
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Light / Cream theme (Figma Day theme) ──────────────────────
        background: '#FFFDFB',     // Warm cream background
        surface: '#FFFFFF',
        card: '#FFFFFF',
        somaPeach: '#FFDAB9',     // Peach accent
        somaBlush: '#DDA7A5',     // Dusty rose — primary CTA
        somaBlushDark: '#C89896', // Darker dusty rose for gradients
        somaMauve: '#9B7E8C',     // Muted mauve — secondary text / icons
        somaCharcoal: '#2D2327',  // Primary text
        somaGlow: '#F8EDE6',      // Soft warm glow tint
        primary: '#DDA7A5',       // Figma primary = dusty rose
        secondary: '#FFDAB9',     // Figma secondary = peach
        accent: '#9B7E8C',        // Figma accent = mauve
        textPrimary: '#2D2327',   // Figma charcoal body text
        textSecondary: '#9B7E8C',
        border: 'rgba(221,167,165,0.2)',
        // ── Dark / Midnight theme (Figma Midnight theme) ───────────────
        darkBackground: '#0F1115',
        darkSurface: '#1A1D24',
        darkCard: '#1E2128',
        darkPrimary: '#A78BFA',    // Soft purple for dark mode
        darkSecondary: '#818CF8',  // Periwinkle
        darkAccent: '#F2F2F2',
        darkTextPrimary: '#F2F2F2',
        darkTextSecondary: 'rgba(242,242,242,0.6)',
        darkBorder: 'rgba(255,255,255,0.1)',
      },
      fontFamily: {
        sans: ['System'],
        serif: ['PlayfairDisplay-SemiBold'],
        serifRegular: ['PlayfairDisplay-Regular'],
      },
      boxShadow: {
        soft: '0px 8px 24px rgba(221,167,165,0.25)',
        glass: '0px 8px 32px rgba(221,167,165,0.15)',
        glow: '0px 12px 40px rgba(221,167,165,0.4)',
        dark: '0px 8px 24px rgba(0,0,0,0.3)',
      },
      borderRadius: {
        card: '28px',
        cardLg: '32px',
        pill: '999px',
      },
    },
  },
  plugins: [],
};
