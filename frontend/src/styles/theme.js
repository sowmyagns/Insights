/**
 * Insights Iva design tokens — Masters → Products is the visual source of truth.
 * Prefer CSS variables from index.css; these JS exports mirror them for inline styles.
 */
export const theme = {
  bg: "#F5F5F5",
  surface: "#ffffff",
  surfaceMuted: "#f3f3f6",
  surfaceHover: "#ececf0",
  border: "#e4e4ea",
  borderSoft: "#e8e8ee",
  borderMuted: "#ececf0",
  text: "#1a1a1f",
  textSecondary: "#4a4a55",
  textMuted: "#6b6b76",
  textPlaceholder: "#a0a0ab",
  textFaint: "#8a8a96",
  textIcon: "#9a9aa5",
  cta: "#F5C518",
  ctaHover: "#e6b800",
  accent: "#5b5bd6",
  accentSoft: "#eef0ff",
  danger: "#ef4444",
  dangerSoft: "#fde8e8",
  success: "#15803d",
  successSoft: "#e8f8ef",
  radius: {
    sm: "0.5rem",
    md: "0.75rem",
    lg: "0.75rem", // Products cards use rounded-xl (~0.75rem in this scale)
    xl: "1rem",
    full: "9999px",
  },
  shadow: {
    card: "0 1px 2px rgba(26, 26, 31, 0.06)",
  },
};

export default theme;
