// Simple mobile theme using 5 colors (meets the design guideline)
// Colors: primary blue, white, near-black, gray-500, red for alerts.
export const Colors = {
  primary: "#0A66C2",
  background: "#FFFFFF",
  foreground: "#111827",
  muted: "#6B7280",
  alert: "#DC2626",
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
}

export const Typography = {
  title: { fontSize: 20, fontWeight: "600" as const, lineHeight: 28 },
  body: { fontSize: 16, fontWeight: "400" as const, lineHeight: 22 },
  small: { fontSize: 14, fontWeight: "400" as const, lineHeight: 18 },
}
