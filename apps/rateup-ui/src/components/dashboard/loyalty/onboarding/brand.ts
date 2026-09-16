/**
 * Colour arithmetic for the merchant's brand colour. Everything here works on a six-digit
 * hex and returns a hex, so the result can go straight into a data-driven `style`.
 */

const HEX = /^#?([0-9a-f]{6})$/i;

export function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const match = HEX.exec(hex.trim());
  if (!match) return null;
  const value = Number.parseInt(match[1], 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/**
 * Ink that reads on the given background: brand navy on a light colour, white on a dark
 * one. The threshold is the point where white text stops clearing 4.5:1.
 */
export function readableTextOn(hex: string): string {
  return luminance(hex) > 0.35 ? "#0f2540" : "#ffffff";
}

/** The colour shifted towards black by `amount` (0–1). Used for gradient end stops. */
export function darken(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const k = 1 - Math.max(0, Math.min(1, amount));
  return toHex(rgb.r * k, rgb.g * k, rgb.b * k);
}

/** A hero-band gradient when there is no hero image: the brand colour into its shade. */
export function brandGradient(hex: string): string {
  return `linear-gradient(135deg, ${hex} 0%, ${darken(hex, 0.35)} 100%)`;
}

/** Two-letter initials for the logo fallback: "Kettle & Co" → "KC". */
export function initialsOf(name: string): string {
  const words = name
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
