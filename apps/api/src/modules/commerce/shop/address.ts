import type { ShopAddress } from "./shop.types.js";

/** A stored address as display lines, skipping the parts that are empty. */
export function addressLines(raw: unknown): string[] {
  const a = (raw ?? {}) as ShopAddress;
  const regionLine = [a.region, a.postalCode].filter(Boolean).join(" ");
  const cityLine = [a.city, regionLine].filter(Boolean).join(", ");
  return [a.line1, a.line2, cityLine, a.country].filter((l): l is string => !!l && !!l.trim());
}
