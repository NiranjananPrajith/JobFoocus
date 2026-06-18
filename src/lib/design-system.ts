// Design System — Status Colors
//
// The runtime source of truth for all design tokens is src/styles/globals.css
// (CSS custom properties) and tailwind.config.ts (Tailwind utility mappings).
// This file exists only to provide TypeScript types for status colors used by
// Badge.tsx and other components that need the palette at build time.

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
