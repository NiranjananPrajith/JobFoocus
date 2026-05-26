// Design System Tokens for JobHunt
// Mistral AI Design System

// ============================================
// COLORS
// ============================================

export const colors = {
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
} as const;

export type ColorName = keyof typeof colors;
export type ColorValue = (typeof colors)[ColorName];

// ============================================
// TYPOGRAPHY
// ============================================

export const typography = {
  "hero-display": {
    fontFamily: "PP Editorial Old, Times New Roman, Georgia, serif",
    fontSize: "84px",
    fontWeight: "400",
    lineHeight: "1.05",
    letterSpacing: "-1.5px",
  },
  "display-lg": {
    fontFamily: "PP Editorial Old, Times New Roman, Georgia, serif",
    fontSize: "64px",
    fontWeight: "400",
    lineHeight: "1.10",
    letterSpacing: "-1px",
  },
  "heading-1": {
    fontFamily: "PP Editorial Old, Times New Roman, Georgia, serif",
    fontSize: "52px",
    fontWeight: "400",
    lineHeight: "1.15",
    letterSpacing: "-0.5px",
  },
  "heading-2": {
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "36px",
    fontWeight: "500",
    lineHeight: "1.20",
    letterSpacing: "-0.5px",
  },
  "heading-3": {
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "28px",
    fontWeight: "500",
    lineHeight: "1.25",
  },
  "heading-4": {
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "22px",
    fontWeight: "500",
    lineHeight: "1.30",
  },
  "heading-5": {
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "18px",
    fontWeight: "500",
    lineHeight: "1.40",
  },
  subtitle: {
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "18px",
    fontWeight: "400",
    lineHeight: "1.50",
  },
  "body-md": {
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "16px",
    fontWeight: "400",
    lineHeight: "1.55",
  },
  "body-md-medium": {
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "16px",
    fontWeight: "500",
    lineHeight: "1.55",
  },
  "body-sm": {
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "14px",
    fontWeight: "400",
    lineHeight: "1.50",
  },
  "body-sm-medium": {
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "14px",
    fontWeight: "500",
    lineHeight: "1.50",
  },
  caption: {
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "13px",
    fontWeight: "400",
    lineHeight: "1.40",
  },
  "caption-bold": {
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "13px",
    fontWeight: "600",
    lineHeight: "1.40",
  },
  micro: {
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "12px",
    fontWeight: "500",
    lineHeight: "1.40",
  },
  "micro-uppercase": {
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "11px",
    fontWeight: "600",
    lineHeight: "1.40",
    letterSpacing: "1px",
  },
  "button-md": {
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "14px",
    fontWeight: "500",
    lineHeight: "1.30",
  },
  "stat-display": {
    fontFamily: "PP Editorial Old, Times New Roman, Georgia, serif",
    fontSize: "56px",
    fontWeight: "400",
    lineHeight: "1.10",
    letterSpacing: "-1px",
  },
  "code-md": {
    fontFamily: "JetBrains Mono, SF Mono, Menlo, Consolas, monospace",
    fontSize: "14px",
    fontWeight: "400",
    lineHeight: "1.50",
  },
} as const;

export type TypographyName = keyof typeof typography;
export type TypographyValue = (typeof typography)[TypographyName];

// ============================================
// SPACING
// ============================================

export const spacing = {
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
} as const;

export type SpacingName = keyof typeof spacing;
export type SpacingValue = (typeof spacing)[SpacingName];

// ============================================
// BORDER RADIUS
// ============================================

export const rounded = {
  xs: "4px",
  sm: "6px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  xxl: "20px",
  full: "9999px",
} as const;

export type RoundedName = keyof typeof rounded;
export type RoundedValue = (typeof rounded)[RoundedName];

// ============================================
// STATUS COLORS & LABELS
// ============================================

export const statusColors: Record<string, string> = {
  prospect: "#888888",
  applied: "#4a90e2",
  phone_screen: "#5ac8fa",
  interview: "#f5a623",
  offer: "#4caf50",
  rejected: "#e74c3c",
};

export const statusLabels: Record<string, string> = {
  prospect: "Prospect",
  applied: "Applied",
  phone_screen: "Phone Screen",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

export type StatusType = keyof typeof statusColors;

// ============================================
// CATEGORIES
// ============================================
// User-defined categories will replace these preset ones
// TODO: Allow users to create custom categories

export const categories = {} as const;

export type CategoryName = keyof typeof categories;
export type CategoryValue = (typeof categories)[CategoryName];

// ============================================
// DESIGN SYSTEM OBJECT (for convenience)
// ============================================

export const designSystem = {
  colors,
  typography,
  spacing,
  rounded,
  statusColors,
  statusLabels,
  categories,
} as const;

export default designSystem;