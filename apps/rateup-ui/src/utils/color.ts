/**
 * Colour arithmetic on six-digit hex values: hex in, hex out, so a result can go straight into
 * a data-driven `style`. `loyalty/onboarding/brand.ts` re-exports it.
 */

const HEX = /^#?([0-9a-f]{6})$/i;

/** A six-digit hex colour, `#` included — what the colour inputs and the API both accept. */
export const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const match = HEX.exec(hex.trim());
  if (!match) return null;
  const value = Number.parseInt(match[1], 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

export function toHex(r: number, g: number, b: number): string {
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
 * Ink that reads on the given background: brand navy on a light colour, white on a dark one.
 * The threshold is the point where white text stops clearing 4.5:1.
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
