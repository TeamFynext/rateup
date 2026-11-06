/**
 * Brand presentation for the merchant's colour and name. The colour arithmetic lives in
 * `@/utils/color.ts` and is re-exported here so the loyalty callers keep their import.
 */

import { darken } from "@/utils/color.ts";

export { darken, luminance, parseHex, readableTextOn, toHex } from "@/utils/color.ts";

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
