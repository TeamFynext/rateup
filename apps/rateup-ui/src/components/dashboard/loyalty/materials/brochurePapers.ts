import { luminance, parseHex } from "../onboarding/brand.ts";

/**
 * The paper a brochure prints on.
 *
 * A background is paper *and* ink together, never paper alone. Letting a merchant pick a
 * background *and* its ink is how a card ends up with grey text on grey card — so the ink
 * is never chosen, only derived: `brochureTones` reads the background's luminance and
 * picks the ink and the accent from it, which is what lets the picker be a free colour
 * rather than a fixed list. The presets below are starting points for that picker, and
 * each resolves through the same function, so a preset and a hand-picked colour of the
 * same value print identically.
 *
 * Everything resolves to a plain hex or an `rgba()`. Nothing here may use `color-mix()`,
 * however tidy: the export rasteriser (html2canvas-pro) does not parse it, so a card that
 * looked right in the preview would download wrong. Mixing is done in JS for that reason.
 *
 * Print media, so nothing is themed: a brochure looks the same on paper whatever the
 * dashboard is set to.
 */

/* ── colour ─────────────────────────────────────────────────────────────────── */

export const BROCHURE_PAPERS = [
  "warm-white",
  "cool-grey",
  "cream",
  "sand",
  "blush",
  "sage",
  "mist",
  "slate",
  "deep-ink",
  "espresso",
  "brand-tint",
] as const;

export type BrochurePaper = (typeof BROCHURE_PAPERS)[number];

export function isBrochurePaper(value: unknown): value is BrochurePaper {
  return BROCHURE_PAPERS.some((paper) => paper === value);
}

/** The colours one background resolves to, once the brand colour is known. */
export interface PaperTones {
  /** The card's own background, always a plain colour. */
  paper: string;
  /** Body text. */
  ink: string;
  /** Secondary text — captions, terms, the powered-by line. */
  inkMuted: string;
  /** Hairlines and dotted leaders. */
  rule: string;
  /**
   * The accent to set points and pills in. Usually the brand colour, but on a dark paper
   * the brand colour can disappear into it, so it lightens to the paper's own ink instead.
   */
  accent: string;
}

/** Fixed inks. Print, so these are not tokens. */
const DARK_INK = "#0f2540";
const LIGHT_INK = "#fffdf8";

/** `amount` of `a` over `b`, as a plain hex. Not `color-mix` — see the module note. */
export function mixHex(a: string, b: string, amount: number): string {
  const from = parseHex(a);
  const to = parseHex(b);
  if (!from || !to) return b;
  const at = Math.min(1, Math.max(0, amount));
  const channel = (x: number, y: number) => Math.round(x * at + y * (1 - at));
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${hex(channel(from.r, to.r))}${hex(channel(from.g, to.g))}${hex(channel(from.b, to.b))}`;
}

/** `hex` at `alpha`, for the muted ink and the hairlines. */
function rgba(hex: string, alpha: number): string {
  const parsed = parseHex(hex);
  if (!parsed) return hex;
  return `rgba(${parsed.r},${parsed.g},${parsed.b},${alpha})`;
}

function tonesFor(paper: string, ink: string, accent: string): PaperTones {
  const onDark = ink === LIGHT_INK;
  return {
    paper,
    ink,
    inkMuted: rgba(ink, onDark ? 0.66 : 0.62),
    rule: rgba(ink, onDark ? 0.24 : 0.18),
    accent,
  };
}

const WARM_WHITE = "#fffdf8";

/** Light papers, in the order they appear in the picker. */
const LIGHT_PAPERS: Partial<Record<BrochurePaper, string>> = {
  "warm-white": WARM_WHITE,
  "cool-grey": "#f4f5f7",
  cream: "#faf3e3",
  sand: "#f3e9da",
  blush: "#fbeeee",
  sage: "#eaf1e8",
  mist: "#eaf0f6",
};

/** Dark papers. Each takes light ink, and gives up the brand accent for the same reason. */
const DARK_PAPERS: Partial<Record<BrochurePaper, string>> = {
  slate: "#2b3440",
  "deep-ink": "#12233b",
  espresso: "#2d211c",
};

/**
 * `paper` resolved against the programme's brand colour.
 *
 * The brand tint is the brand colour at about a tenth strength — light enough to read dark
 * ink on, and it keeps the card recognisably the merchant's without a solid colour field.
 * On a dark paper the brand colour is replaced by the paper's light ink: a navy accent on a
 * navy card is invisible, and a merchant should not have to discover that by printing it.
 */
export function paperTones(paper: BrochurePaper, brandColor: string): PaperTones {
  const dark = DARK_PAPERS[paper];
  if (dark) return tonesFor(dark, LIGHT_INK, LIGHT_INK);

  if (paper === "brand-tint") {
    const tint = mixHex(brandColor, "#fffdf8", 0.12);
    // The mix lands close to white, so dark ink is right unless the brand itself is pale
    // enough that even a tenth of it reads light.
    const ink = luminance(tint) < 0.4 ? LIGHT_INK : DARK_INK;
    return tonesFor(tint, ink, ink === LIGHT_INK ? LIGHT_INK : brandColor);
  }

  return tonesFor(LIGHT_PAPERS[paper] ?? WARM_WHITE, DARK_INK, brandColor);
}

/**
 * Tones for any background colour.
 *
 * The ink follows the background's luminance and the accent gives way on a dark one — the
 * same two rules the presets were built from, so `brochureTones(paperHex(p, brand), brand)`
 * equals `paperTones(p, brand)` for every preset (held by the tests). An unparseable value
 * falls back to warm white rather than rendering a card with no background at all.
 */
export function brochureTones(background: string, brandColor: string): PaperTones {
  const paper = parseHex(background) ? background.trim().toLowerCase() : WARM_WHITE;
  const ink = luminance(paper) < 0.4 ? LIGHT_INK : DARK_INK;
  return tonesFor(paper, ink, ink === LIGHT_INK ? LIGHT_INK : brandColor);
}

/** A preset's background colour on its own — for the picker's swatches, and for reading a
 * document stored before the background was a free colour. */
export function paperHex(paper: BrochurePaper, brandColor: string): string {
  return paperTones(paper, brandColor).paper;
}
