/**
 * Order arithmetic, kept pure so every surface (chat checkout, hosted checkout, staff-created
 * orders, the storefront) prices a cart the same way. Amounts are plain numbers in the store's
 * currency and every result is rounded to cents once, at the end of each step.
 */

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(n) ? n : 0;
}

export interface PricedLine {
  variantId: string | null;
  productId: string | null;
  collectionIds: string[];
  unitPrice: number;
  quantity: number;
}

export type DiscountRule =
  | { type: "PERCENTAGE"; value: number }
  | { type: "FIXED"; value: number }
  | { type: "FREE_SHIPPING"; cap: number | null }
  | { type: "BUY_X_GET_Y"; buyQty: number; getQty: number };

export interface DiscountScope {
  appliesTo: "ALL" | "COLLECTIONS" | "PRODUCTS";
  collectionIds: string[];
  productIds: string[];
}

export interface PricingInput {
  lines: PricedLine[];
  discount?: { rule: DiscountRule; scope: DiscountScope } | null;
  /** Money value of the points the customer chose to spend, before capping. */
  pointsValue?: number;
  shipping?: number;
  /** Percent. */
  taxRate?: number | null;
  pricesIncludeTax?: boolean;
}

export interface PricingResult {
  subtotal: number;
  discountTotal: number;
  pointsDiscount: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
}

function inScope(line: PricedLine, scope: DiscountScope): boolean {
  if (scope.appliesTo === "PRODUCTS")
    return !!line.productId && scope.productIds.includes(line.productId);
  if (scope.appliesTo === "COLLECTIONS")
    return line.collectionIds.some((id) => scope.collectionIds.includes(id));
  return true;
}

/** What the discount takes off the goods (free shipping is applied to shipping instead). */
export function discountOnGoods(lines: PricedLine[], rule: DiscountRule, scope: DiscountScope) {
  const eligible = lines.filter((l) => inScope(l, scope));
  const eligibleTotal = eligible.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  switch (rule.type) {
    case "PERCENTAGE":
      return round2((eligibleTotal * Math.min(Math.max(rule.value, 0), 100)) / 100);
    case "FIXED":
      return round2(Math.min(Math.max(rule.value, 0), eligibleTotal));
    case "BUY_X_GET_Y": {
      // Every (buy + get) eligible units, the cheapest `get` of them are free.
      const group = rule.buyQty + rule.getQty;
      if (rule.buyQty < 1 || rule.getQty < 1) return 0;
      const units = eligible
        .flatMap((l) => Array.from({ length: l.quantity }, () => l.unitPrice))
        .sort((a, b) => a - b);
      const freeUnits = Math.floor(units.length / group) * rule.getQty;
      return round2(units.slice(0, freeUnits).reduce((s, p) => s + p, 0));
    }
    case "FREE_SHIPPING":
      return 0;
  }
}

/**
 * `discountTotal` is what the code saved, whether on goods or on shipping; `shippingTotal` is
 * always the rate's own price, so the summary reads "Shipping $6 · Coupon −$6".
 */
export function priceOrder(input: PricingInput): PricingResult {
  const subtotal = round2(input.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0));
  const shippingTotal = round2(Math.max(input.shipping ?? 0, 0));

  let goodsDiscount = 0;
  let shippingDiscount = 0;
  if (input.discount) {
    const { rule, scope } = input.discount;
    if (rule.type === "FREE_SHIPPING") {
      shippingDiscount = round2(
        rule.cap === null ? shippingTotal : Math.min(rule.cap, shippingTotal),
      );
    } else {
      goodsDiscount = discountOnGoods(input.lines, rule, scope);
    }
  }

  const goodsAfterDiscount = round2(subtotal - goodsDiscount);
  const pointsDiscount = round2(Math.min(Math.max(input.pointsValue ?? 0, 0), goodsAfterDiscount));
  const taxable = round2(goodsAfterDiscount - pointsDiscount + shippingTotal - shippingDiscount);

  const rate = Math.max(input.taxRate ?? 0, 0) / 100;
  let taxTotal = 0;
  let total = taxable;
  if (rate > 0) {
    if (input.pricesIncludeTax ?? true) {
      taxTotal = round2(taxable - taxable / (1 + rate));
    } else {
      taxTotal = round2(taxable * rate);
      total = round2(taxable + taxTotal);
    }
  }

  return {
    subtotal,
    discountTotal: round2(goodsDiscount + shippingDiscount),
    pointsDiscount,
    shippingTotal,
    taxTotal,
    total: round2(total),
  };
}

/** Shipping for a rate given the goods value it is charged against. */
export function shippingFor(rate: { price: number; freeOver: number | null }, goods: number) {
  if (rate.freeOver !== null && goods >= rate.freeOver) return 0;
  return round2(rate.price);
}
