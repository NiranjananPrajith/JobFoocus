import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand & Accent
        primary: "var(--primary)",
        "primary-deep": "var(--primary-deep)",
        "on-primary": "var(--on-primary)",
        "sunshine-300": "var(--sunshine-300)",
        "sunshine-500": "var(--sunshine-500)",
        "sunshine-700": "var(--sunshine-700)",
        "sunshine-800": "var(--sunshine-800)",
        "sunshine-900": "var(--sunshine-900)",
        "yellow-saturated": "var(--yellow-saturated)",
        // Cream / Neutral Warm
        cream: "var(--cream)",
        "cream-light": "var(--cream-light)",
        "cream-deeper": "var(--cream-deeper)",
        "beige-deep": "var(--beige-deep)",
        // Surface
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        "surface-elevated": "var(--surface-elevated)",
        "surface-cream": "var(--surface-cream)",
        "surface-cream-soft": "var(--surface-cream-soft)",
        "surface-code": "var(--surface-code)",
        card: "var(--card)",
        // Text
        ink: "var(--ink)",
        "ink-tint": "var(--ink-tint)",
        charcoal: "var(--charcoal)",
        slate: "var(--slate)",
        steel: "var(--steel)",
        stone: "var(--stone)",
        muted: "var(--muted)",
        // Borders
        hairline: "var(--hairline)",
        "hairline-soft": "var(--hairline-soft)",
        "hairline-strong": "var(--hairline-strong)",
        // Semantic
        "on-dark": "var(--on-dark)",
        "on-dark-muted": "var(--on-dark-muted)",
        "on-cream": "var(--on-cream)",
        "footer-cream": "var(--footer-cream)",
        link: "var(--link)",
        scrim: "var(--scrim)",
        "input-bg": "var(--input-bg)",
        "toggle-off": "var(--toggle-off)",
        // Interactive states
        "active-bg": "var(--active-bg)",
        "active-text": "var(--active-text)",
        "hover-bg": "var(--hover-bg)",
        // Info / Blue (PII indicators, info panels)
        "info-bg": "var(--info-bg)",
        "info-bg-strong": "var(--info-bg-strong)",
        "info-bg-soft": "var(--info-bg-soft)",
        "info-border": "var(--info-border)",
        "info-border-strong": "var(--info-border-strong)",
        "info-text": "var(--info-text)",
        "info-text-strong": "var(--info-text-strong)",
        // Danger / Red (delete buttons, error containers)
        "danger-bg": "var(--danger-bg)",
        "danger-border": "var(--danger-border)",
        "danger-border-strong": "var(--danger-border-strong)",
        "danger-text": "var(--danger-text)",
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