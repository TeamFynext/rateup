/**
 * The app-wide palette. The surfaces and the ink ramp are the design system's
 * semantic tokens (`_ds2/tokens/themes.css` in the "RateUp Mobile Inbox" Claude
 * Design project) — `:root` for light, `[data-theme="dark"]` for dark — so that
 * a screen painted from here and a row painted from `inboxDesign` sit on the
 * same base.
 *
 * Dark used to be a navy (#091522 / #0D1E32) invented for the app; it made every
 * dark screen read warmer and more saturated than the design. The design's dark
 * is a cool near-black, and that is what these are now.
 *
 * The `rgba(255,255,255,…)` entries below are overlays rather than colours —
 * they compose against whatever base they land on, so they did not move.
 */
export const Colors = {
  brand: {
    blue: "#1C518E",
    blueLight: "#4C7FBC",
    navy: "#091522",
    navySec: "#0D1E32",
    navyDeep: "#0E2B52",
  },
  accent: {
    cyan: "#4FC3FF",
    orange: "#F8951D",
    whatsapp: "#25D366",
  },
  dark: {
    // `--canvas` / `--surface`.
    bg: "#0B0F14",
    surface: "#111720",
    border: "rgba(255,255,255,0.06)",
    borderLight: "rgba(255,255,255,0.08)",
    // `--fg` … `--fg-4`. Pure white was never in the ramp; #EDF0F4 is the
    // design's brightest ink and stops dark text from glaring.
    textPrimary: "#EDF0F4",
    textSecondary: "#B7C0CC",
    textMuted: "#5F6979",
    textSubtle: "#8B95A3",
    textPlaceholder: "rgba(255,255,255,0.26)",
    inactive: "rgba(255,255,255,0.32)",
    pillBorder: "rgba(255,255,255,0.14)",
    pillText: "rgba(255,255,255,0.62)",
    unreadBg: "rgba(28,81,142,0.15)",
    statusBg: "rgba(255,255,255,0.07)",
    statusText: "rgba(255,255,255,0.38)",
    cyanBg: "rgba(79,195,255,0.13)",
    cyanBorder: "rgba(79,195,255,0.28)",
    cyanBgLight: "rgba(79,195,255,0.15)",
    cyanBorderLight: "rgba(79,195,255,0.22)",
    botBg: "rgba(79,195,255,0.12)",
    inputBg: "rgba(255,255,255,0.07)",
    inputBorder: "rgba(255,255,255,0.1)",
    msgToggleActiveBg: "rgba(28,81,142,0.38)",
  },
  light: {
    // `--canvas` / `--surface-2` / `--surface` / `--border`, then `--fg` … `--fg-4`.
    // The old light base was a warm off-white (#FAFAF7) with a near-black ink;
    // the design's is cool, and its ink stops at #1B2027 rather than black.
    bg: "#FCFCFD",
    surface: "#F7F8FA",
    card: "#FFFFFF",
    border: "#E4E7EC",
    textPrimary: "#1B2027",
    textSecondary: "#434A55",
    textMuted: "#9BA3AF",
    textSubtle: "#6B7480",
    textPlaceholder: "#9BA3AF",
    inactive: "#9BA3AF",
    pillText: "#434A55",
    unreadBg: "rgba(28,81,142,0.05)",
    statusBg: "#F7F8FA",
    statusText: "#6B7480",
    activeBg: "#F1F6FC",
    activeBorder: "#BDD2EC",
    botBg: "#F1F6FC",
    botBorder: "#BDD2EC",
    inputBg: "#F7F8FA",
    systemBg: "rgba(0,0,0,0.07)",
    msgShadow: "rgba(28,81,142,0.2)",
  },
} as const;

export const avatarGradients = [
  ["#4C7FBC", "#1C518E"],
  ["#174678", "#0B2548"],
  ["#1C518E", "#4C7FBC"],
  ["#0E2B52", "#1C518E"],
] as const;
