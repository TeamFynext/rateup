/**
 * Tokens lifted from the "RateUp Mobile Inbox" Claude Design project
 * (447ff03d-0634-4064-b362-5bebaaee8f90 → `RateUp Mobile Inbox.dc.html` +
 * `_ds/.../colors_and_type.css`).
 *
 * Light values are the design system's `:root` semantics; dark values are the
 * `.theme-dark` override the design file declares in its <helmet> block
 * (Material-style #121212 base + white elevation overlays).
 */

type Tone = { color: string; soft: string; fg: string };

export type InboxRowTheme = {
  pageBg: string;
  surface: string;
  surface2: string;
  border1: string;
  /** The row separator — the design uses `--ink-50`, lighter than `--border-1`. */
  rowDivider: string;
  brandSoft: string;
  fg1: string;
  fg2: string;
  fg3: string;
  fg4: string;
  brand: string;
  warm: string;
  success: string;
  danger: string;
  status: Record<InboxStatusTone, Tone>;
  /** `--bg-warm-soft` + `--warm-700`, used by the thread's unassigned banner. */
  warmSoft: string;
  warmStrong: string;
  /** The thread's internal-note card. */
  note: { bg: string; border: string; label: string; text: string };
};

export type InboxStatusTone = "open" | "pending" | "closed" | "spam";

const light: InboxRowTheme = {
  pageBg: "#FAFAF7",
  surface: "#FFFFFF",
  surface2: "#F4F5F2",
  border1: "#ECECEA",
  rowDivider: "#F4F5F2",
  brandSoft: "#EEF4FB",
  fg1: "#0A0B0A",
  fg2: "#2E302E",
  fg3: "#666864",
  fg4: "#8B8E8A",
  brand: "#1C518E",
  warm: "#F8951D",
  success: "#16A34A",
  danger: "#DC2626",
  status: {
    open: { color: "#16A34A", soft: "rgba(22,163,74,0.14)", fg: "#15803D" },
    pending: { color: "#F8951D", soft: "rgba(248,149,29,0.16)", fg: "#A85C07" },
    closed: { color: "#8B8E8A", soft: "rgba(139,142,138,0.16)", fg: "#5A5C58" },
    spam: { color: "#DC2626", soft: "rgba(220,38,38,0.12)", fg: "#B91C1C" },
  },
  warmSoft: "#FFF8E1",
  warmStrong: "#A85C07",
  note: {
    bg: "#FFF6DC",
    border: "#F1DFAE",
    label: "#B26A00",
    text: "#4A3A12",
  },
};

const dark: InboxRowTheme = {
  pageBg: "#121212",
  surface: "#1E1E1E",
  surface2: "#242424",
  border1: "rgba(255,255,255,0.12)",
  // The design file leaves the row divider on the literal `--ink-50`, which is a
  // near-white rule on #121212; dark takes the `.theme-dark` border token instead.
  rowDivider: "rgba(255,255,255,0.12)",
  brandSoft: "rgba(79,195,255,0.14)",
  fg1: "rgba(255,255,255,0.87)",
  fg2: "rgba(255,255,255,0.72)",
  fg3: "rgba(255,255,255,0.60)",
  fg4: "rgba(255,255,255,0.44)",
  brand: "#4FC3FF",
  warm: "#F8951D",
  success: "#16A34A",
  danger: "#CF6679",
  // The design file keeps one fixed status palette for both themes; those `fg`
  // values sit at ~2:1 on #121212, so dark lifts the label to the tone's own
  // hue and thickens the tint the same way `.theme-dark` does for its soft
  // backgrounds (0.12 → 0.14).
  status: {
    open: { color: "#16A34A", soft: "rgba(22,163,74,0.18)", fg: "#4ADE80" },
    pending: { color: "#F8951D", soft: "rgba(248,149,29,0.18)", fg: "#FBBF24" },
    closed: {
      color: "#8B8E8A",
      soft: "rgba(255,255,255,0.10)",
      fg: "rgba(255,255,255,0.60)",
    },
    spam: { color: "#CF6679", soft: "rgba(207,102,121,0.18)", fg: "#CF6679" },
  },
  // The design hardcodes the warm banner and the note card's cream (#FFF6DC),
  // which would be a full-brightness panel in dark. Dark keeps the amber hue at
  // the same tint depth `.theme-dark` uses for `--bg-warm-soft`.
  warmSoft: "rgba(248,149,29,0.14)",
  warmStrong: "#FBBF24",
  note: {
    bg: "rgba(248,149,29,0.12)",
    border: "rgba(248,149,29,0.28)",
    label: "#FBBF24",
    text: "rgba(255,255,255,0.87)",
  },
};

export const getInboxRowTheme = (isDark: boolean): InboxRowTheme =>
  isDark ? dark : light;

/**
 * The design's header/segment bar sits on `--bg-surface`. Light takes that
 * verbatim; dark uses this app's raised navy rather than the design's #1E1E1E,
 * so the bar doesn't clash with the rest of the app's dark chrome.
 */
export const getInboxHeaderBg = (isDark: boolean) =>
  isDark ? "#0D1E32" : "#FFFFFF";

/** Solid avatar fills used by the design's sample conversations. */
export const inboxAvatarColors = [
  "#0EA5E9",
  "#DD2A7B",
  "#16A34A",
  "#7C3AED",
  "#F59E0B",
  "#0891B2",
  "#DC2626",
  "#1C518E",
] as const;

/** Teammate chips (design `AG`). The current user gets the warm capsule. */
export const inboxAssigneeColors = [
  { bg: "#1C518E", fg: "#FFFFFF" },
  { bg: "#7C3AED", fg: "#FFFFFF" },
  { bg: "#0891B2", fg: "#FFFFFF" },
  { bg: "#0EA5E9", fg: "#FFFFFF" },
] as const;

export const inboxSelfAssigneeColor = { bg: "#F8951D", fg: "#081C3F" } as const;

/** Design `CH` — channel dot behind the avatar. */
export const inboxChannelColors: Record<string, string> = {
  WHATSAPP: "#25D366",
  INSTAGRAM: "#DD2A7B",
  FACEBOOK: "#1877F2",
  WEBCHAT: "#1C518E",
};

/** Stable index into a palette from an arbitrary id. */
export function paletteIndex(seed: string | undefined, size: number) {
  if (!seed) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % size;
}

/** `#RRGGBB` / `#RGB` → `rgba(r,g,b,alpha)`, for label chips whose hue is data. */
export function tint(hex: string | undefined, alpha: number, fallback: string) {
  if (!hex || hex[0] !== "#") return fallback;
  const body = hex.slice(1);
  const full =
    body.length === 3
      ? body
          .split("")
          .map((c) => c + c)
          .join("")
      : body;
  if (full.length !== 6) return fallback;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return fallback;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
