import type { StorefrontProduct, StorefrontVariant } from "@/backend/commerce/shop.api";

export type OptionSelection = Record<string, string>;

/** The variant whose option values match every option the product declares. */
export function findVariant(
  product: StorefrontProduct,
  selection: OptionSelection,
): StorefrontVariant | undefined {
  const options = product.options ?? [];
  if (!options.length) return product.variants[0];
  return product.variants.find((variant) =>
    options.every((option) => variant.optionValues?.[option.name] === selection[option.name]),
  );
}

/** Starts on the first variant that can be bought, so the sheet never opens on "Sold out". */
export function initialSelection(product: StorefrontProduct): OptionSelection {
  const variant = product.variants.find((v) => !v.soldOut) ?? product.variants[0];
  return { ...variant?.optionValues };
}

/** Whether picking `value` for `name`, keeping the other picks, lands on a variant in stock. */
export function isValueAvailable(
  product: StorefrontProduct,
  selection: OptionSelection,
  name: string,
  value: string,
): boolean {
  const variant = findVariant(product, { ...selection, [name]: value });
  return Boolean(variant && !variant.soldOut);
}

export function priceRange(product: StorefrontProduct): { min: number; max: number } {
  const prices = product.variants.map((v) => v.price);
  if (!prices.length) return { min: 0, max: 0 };
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export type ProductBadge =
  | { kind: "sold_out" }
  | { kind: "low_stock" }
  | { kind: "options"; count: number }
  | null;

export function productBadge(product: StorefrontProduct): ProductBadge {
  if (product.variants.length && product.variants.every((v) => v.soldOut)) {
    return { kind: "sold_out" };
  }
  if (product.variants.some((v) => v.lowStock)) return { kind: "low_stock" };
  if (product.variants.length > 1) return { kind: "options", count: product.variants.length };
  return null;
}

export function matchesSearch(product: StorefrontProduct, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    product.title.toLowerCase().includes(needle) ||
    (product.description ?? "").toLowerCase().includes(needle)
  );
}

// ─── Bag ─────────────────────────────────────────────────────────────────────

export interface BagLine {
  productId: string;
  variantId: string;
  quantity: number;
}

export const MAX_LINE_QUANTITY = 99;

/** Reads a stored bag, dropping anything malformed: storage is user-editable. */
export function parseBag(raw: string | null): BagLine[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const lines: BagLine[] = [];
  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) continue;
    const { productId, variantId, quantity } = entry as Record<string, unknown>;
    if (typeof productId !== "string" || typeof variantId !== "string") continue;
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) continue;
    lines.push({ productId, variantId, quantity: Math.min(quantity, MAX_LINE_QUANTITY) });
  }
  return lines;
}

export function addToBag(lines: readonly BagLine[], line: BagLine): BagLine[] {
  const existing = lines.find((l) => l.variantId === line.variantId);
  if (!existing) return [...lines, line];
  return lines.map((l) =>
    l.variantId === line.variantId
      ? { ...l, quantity: Math.min(l.quantity + line.quantity, MAX_LINE_QUANTITY) }
      : l,
  );
}

export function setBagQuantity(
  lines: readonly BagLine[],
  variantId: string,
  quantity: number,
): BagLine[] {
  if (quantity < 1) return lines.filter((l) => l.variantId !== variantId);
  return lines.map((l) =>
    l.variantId === variantId ? { ...l, quantity: Math.min(quantity, MAX_LINE_QUANTITY) } : l,
  );
}

export interface ResolvedBagLine extends BagLine {
  product: StorefrontProduct;
  variant: StorefrontVariant;
  lineTotal: number;
}

/** Joins the bag to the live catalog; lines whose product left the shop or sold out are dropped. */
export function resolveBag(
  lines: readonly BagLine[],
  products: readonly StorefrontProduct[],
): { lines: ResolvedBagLine[]; count: number; total: number } {
  const resolved: ResolvedBagLine[] = [];
  for (const line of lines) {
    const product = products.find((p) => p.id === line.productId);
    const variant = product?.variants.find((v) => v.id === line.variantId);
    if (!product || !variant || variant.soldOut) continue;
    resolved.push({ ...line, product, variant, lineTotal: variant.price * line.quantity });
  }
  return {
    lines: resolved,
    count: resolved.reduce((sum, l) => sum + l.quantity, 0),
    total: resolved.reduce((sum, l) => sum + l.lineTotal, 0),
  };
}

export function variantLabel(variant: StorefrontVariant): string | null {
  if (variant.optionValues && Object.keys(variant.optionValues).length) {
    return Object.values(variant.optionValues).join(" / ");
  }
  return variant.title && variant.title !== "Default" ? variant.title : null;
}

/** A wa.me link whose prefilled text lists the bag, for shops that take orders in chat. */
export function whatsappOrderLink(
  whatsappNumber: string,
  intro: string,
  lines: readonly ResolvedBagLine[],
  totalLine: string,
): string {
  const items = lines.map((l) => {
    const label = variantLabel(l.variant);
    return `• ${l.quantity} × ${l.product.title}${label ? ` (${label})` : ""}`;
  });
  const text = [intro, "", ...items, "", totalLine].join("\n");
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
}
