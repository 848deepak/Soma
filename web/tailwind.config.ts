import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FFFDFB",
        charcoal: "#2D2327",
        rose: "#DDA7A5",
        peach: "#FFDAB9",
        mauve: "#9B7E8C",
        sage: "#8BA888",
        soma: {
          blush: "#DDA7A5",
          rose: "#DDA7A5",
          petal: "#FFDAB9",
          lavender: "#C4B5FD",
          lilac: "#DDD6FE",
          mauve: "#9B7E8C",
          cream: "#FFFDFB",
          sand: "#F5EDE8",
          plum: "#2D2327",
        },
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-soma":
          "linear-gradient(135deg, #FFFDFB 0%, #fdf0e8 40%, #f5edf5 100%)",
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        blob: "blob 10s infinite",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-15px)" },
        },
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
