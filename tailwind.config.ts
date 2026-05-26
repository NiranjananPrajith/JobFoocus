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
        // Brand & Accent
        primary: "#fa520f",
        "primary-deep": "#cc3a05",
        "on-primary": "#ffffff",
        "sunshine-300": "#ffd06a",
        "sunshine-500": "#ffb83e",
        "sunshine-700": "#ffa110",
        "sunshine-800": "#ff8105",
        "sunshine-900": "#ff8a00",
        "yellow-saturated": "#ffd900",
        // Cream / Neutral Warm
        cream: "#fff8e0",
        "cream-light": "#fffaeb",
        "cream-deeper": "#fff0c2",
        "beige-deep": "#e6d5a8",
        "block-5": "#ffe295",
        "block-6": "#ffd900",
        "block-7": "#ff8105",
        // Surface
        canvas: "#ffffff",
        surface: "#fafafa",
        "surface-cream": "#fff8e0",
        "surface-cream-soft": "#fffaeb",
        "surface-code": "#1c1c1e",
        // Text
        ink: "#1f1f1f",
        "ink-tint": "#3d3d3d",
        charcoal: "#2c2c2c",
        slate: "#4a4a4a",
        steel: "#6a6a6a",
        stone: "#8a8a8a",
        muted: "#a8a8a8",
        // Borders
        hairline: "#e5e5e5",
        "hairline-soft": "#ededed",
        "hairline-strong": "#c7c7c7",
        // Semantic
        "on-dark": "#ffffff",
        "on-dark-muted": "#a8a8a8",
        "on-cream": "#1f1f1f",
        "footer-cream": "#fff8e0",
        link: "#fa520f",
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        xxl: "20px",
        full: "9999px",
      },
      spacing: {
        xxs: "4px",
        xs: "8px",
        sm: "12px",
        md: "16px",
        lg: "20px",
        xl: "24px",
        xxl: "32px",
        xxxl: "40px",
        "section-sm": "48px",
        section: "64px",
        "section-lg": "96px",
        hero: "120px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["PP Editorial Old", "Georgia", "Times New Roman", "serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
        "3xl": "32px",
      },
    },
  },
  plugins: [],
};

export default config;