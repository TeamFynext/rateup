/**
 * Tokens lifted from the "RateUp Mobile Inbox" Claude Design project
 * (447ff03d-0634-4064-b362-5bebaaee8f90 → `RateUp Mobile Inbox.dc.html` +
 * `_ds2/tokens/themes.css`).
 *
 * Both themes are now the design's semantic tokens verbatim — `:root` for light,
 * `[data-theme="dark"]` for dark. Dark used to be a re-tint of those values into
 * the navy the app's chrome was built from (`Colors.dark.bg` = #091522), on the
 * grounds that the design's dark base clashed with it. That base is no longer
 * Material's #121212: `_ds2` bases dark on the cool near-black #0B0F14, and
 * `Colors.dark` has moved onto it, so the re-tint had nothing left to reconcile
 * and only made the inbox read warmer and more saturated than the design.
 *
 * Keep it that way: a value here should be traceable to a token in
 * `_ds2/tokens/themes.css`, and a deliberate deviation says so in a comment.
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
  /**
   * The fixed RateUp navy, for a surface that is filled with the brand rather than
   * tinted by it — the cashier's balance panel is the only one so far.
   *
   * `brand` flips to a bright cyan in dark so it can be read *as text* on the dark base;
   * white on that cyan is ~2:1, so a filled panel cannot use it. This stays navy in
   * both themes, where white sits at ~7.5:1 and the panel reads as brand either way.
   */
  brandInk: string;
  /**
   * `--on-accent`: the foreground for a chip *filled* with `brand` or `success`,
   * i.e. the unread badge. White in light, but near-black in dark — dark's
   * `success` is a light mint that white sits on at ~1.9:1.
   */
  onAccent: string;
  warm: string;
  success: string;
  danger: string;
  status: Record<InboxStatusTone, Tone>;
  /**
   * Error surfaces — the cashier's inline errors and the outbox's failure banner.
   *
   * Deliberately not a fourth `status` tone: `InboxStatusTone` is the row's *lifecycle*
   * (`getDerivedStatus`), a nothing-went-wrong axis, and `STATUS_LABEL` in `ChatBox`
   * maps it exhaustively. A failure is not a lifecycle state, so it sits beside them.
   * `danger` above is the flat colour for a glyph or a line of text; this is the pair a
   * tinted panel needs.
   */
  dangerTone: Tone;
  /**
   * Fill behind a New (unassigned) row whose newest message is under 24h old —
   * the design's `isFreshNew`, see `isWithinLastDay` in `ChatBox`. An older New
   * row loses the fill *and* the warm left edge, and reads as New from its chip.
   *
   * The design's `--warm-soft`, so the same value as `status.new.soft`. It used
   * to be deepened (`--ru-amber-100`) on the grounds that `--warm-soft` vanished
   * as a full-width row on a phone — but that was while *every* unclaimed ticket
   * was painted. Now that it marks only the fresh ones, the design's tint is
   * enough, and the deeper amber read as a warning the row was not making.
   */
  newRowBg: string;
  /** `--bg-warm-soft` + `--warm-700`, used by the thread's unassigned banner. */
  warmSoft: string;
  warmStrong: string;
  /** The thread's internal-note card. */
  note: { bg: string; border: string; label: string; text: string };
};

/**
 * The row's lifecycle status, derived rather than stored — see `getDerivedStatus`.
 * Same three states as the web inbox and the design's `ST` table.
 */
export type InboxStatusTone = "new" | "assigned" | "closed";

const light: InboxRowTheme = {
  // `_ds2/tokens/themes.css` `:root`.
  pageBg: "#FCFCFD",
  surface: "#FFFFFF",
  surface2: "#F7F8FA",
  border1: "#E4E7EC",
  rowDivider: "#EDEFF3",
  brandSoft: "#F1F6FC",
  fg1: "#1B2027",
  fg2: "#434A55",
  fg3: "#6B7480",
  fg4: "#9BA3AF",
  brand: "#1C518E",
  brandInk: "#1C518E",
  onAccent: "#FFFFFF",
  warm: "#F8951D",
  success: "#17915A",
  danger: "#C4342C",
  // New is `--warm-*`, Assigned `--accent*`, Closed `--success*`, exactly as the
  // design's `ST` table maps them.
  status: {
    new: { color: "#AE5D07", soft: "#FFF8EC", fg: "#AE5D07" },
    assigned: { color: "#1C518E", soft: "#F1F6FC", fg: "#1C518E" },
    closed: { color: "#17915A", soft: "#E9F7EF", fg: "#17915A" },
  },
  // `--error*`.
  dangerTone: { color: "#C4342C", soft: "#FCEEEC", fg: "#C4342C" },
  newRowBg: "#FFF8EC",
  warmSoft: "#FFF8EC",
  warmStrong: "#AE5D07",
  // The design's note card: `--warm-soft` on `--warm-border`, label `--warm-fg`,
  // body `--fg`.
  note: {
    bg: "#FFF8EC",
    border: "#FCD68F",
    label: "#AE5D07",
    text: "#1B2027",
  },
};

const dark: InboxRowTheme = {
  // `_ds2/tokens/themes.css` `[data-theme="dark"]`.
  pageBg: "#0B0F14",
  surface: "#111720",
  surface2: "#161D27",
  border1: "#232C38",
  rowDivider: "#1A222C",
  brandSoft: "rgba(90,140,198,0.14)",
  fg1: "#EDF0F4",
  fg2: "#B7C0CC",
  fg3: "#8B95A3",
  fg4: "#5F6979",
  brand: "#5A8CC6",
  brandInk: "#1C518E",
  onAccent: "#07131F",
  warm: "#F8951D",
  success: "#4ECB8B",
  danger: "#F08078",
  status: {
    new: { color: "#FBC05C", soft: "rgba(248,149,29,0.11)", fg: "#FBC05C" },
    assigned: { color: "#5A8CC6", soft: "rgba(90,140,198,0.14)", fg: "#5A8CC6" },
    closed: { color: "#4ECB8B", soft: "rgba(78,203,139,0.12)", fg: "#4ECB8B" },
  },
  dangerTone: { color: "#F08078", soft: "rgba(240,128,120,0.12)", fg: "#F08078" },
  newRowBg: "rgba(248,149,29,0.11)",
  warmSoft: "rgba(248,149,29,0.11)",
  warmStrong: "#FBC05C",
  note: {
    bg: "rgba(248,149,29,0.11)",
    border: "rgba(248,149,29,0.3)",
    label: "#FBC05C",
    text: "#EDF0F4",
  },
};

export const getInboxRowTheme = (isDark: boolean): InboxRowTheme => (isDark ? dark : light);

/**
 * The design's header/segment bar sits on `--bg-surface`, which is what both
 * themes return here — dark's `surface` is now that same raised navy, so this
 * is kept only for the call sites that name the header bar directly.
 */
export const getInboxHeaderBg = (isDark: boolean) => (isDark ? dark.surface : light.surface);

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
