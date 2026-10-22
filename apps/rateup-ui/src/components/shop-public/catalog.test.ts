import { describe, expect, it } from "vitest";

import type { StorefrontProduct, StorefrontVariant } from "@/backend/commerce/shop.api";

import {
  addToBag,
  findVariant,
  initialSelection,
  isValueAvailable,
  parseBag,
  productBadge,
  resolveBag,
  setBagQuantity,
  whatsappOrderLink,
} from "./catalog.ts";

const variant = (
  id: string,
  values: Record<string, string> | null,
  extra: Partial<StorefrontVariant> = {},
) => ({
  id,
  title: values ? Object.values(values).join(" / ") : "Default",
  sku: null,
  optionValues: values,
  price: 10,
  compareAtPrice: null,
  imageUrl: null,
  soldOut: false,
  lowStock: false,
  ...extra,
});

const candle: StorefrontProduct = {
  id: "p1",
  title: "Cedar candle",
  description: null,
  images: [],
  collectionIds: [],
  options: [
    { name: "Size", values: ["Small", "Large"] },
    { name: "Scent", values: ["Cedar", "Amber"] },
  ],
  variants: [
    variant("v1", { Size: "Small", Scent: "Cedar" }, { soldOut: true }),
    variant("v2", { Size: "Small", Scent: "Amber" }),
    variant("v3", { Size: "Large", Scent: "Cedar" }, { price: 24, lowStock: true }),
  ],
};

describe("variant picking", () => {
  it("opens on the first variant in stock", () => {
    expect(initialSelection(candle)).toEqual({ Size: "Small", Scent: "Amber" });
  });

  it("finds the variant matching every option, and none for a missing combination", () => {
    expect(findVariant(candle, { Size: "Large", Scent: "Cedar" })?.id).toBe("v3");
    expect(findVariant(candle, { Size: "Large", Scent: "Amber" })).toBeUndefined();
  });

  it("marks values that would land on a sold-out or missing variant", () => {
    const selection = { Size: "Small", Scent: "Amber" };
    expect(isValueAvailable(candle, selection, "Scent", "Cedar")).toBe(false);
    expect(isValueAvailable(candle, { Size: "Large", Scent: "Cedar" }, "Size", "Small")).toBe(
      false,
    );
    expect(isValueAvailable(candle, selection, "Size", "Large")).toBe(false);
    expect(isValueAvailable(candle, { Size: "Large", Scent: "Cedar" }, "Size", "Large")).toBe(true);
  });

  it("tags low stock before the option count, and sold out over both", () => {
    expect(productBadge(candle)).toEqual({ kind: "low_stock" });
    const gone = { ...candle, variants: candle.variants.map((v) => ({ ...v, soldOut: true })) };
    expect(productBadge(gone)).toEqual({ kind: "sold_out" });
  });
});

describe("bag", () => {
  it("drops malformed stored lines", () => {
    const raw = JSON.stringify([
      { productId: "p1", variantId: "v2", quantity: 2 },
      { productId: "p1", variantId: "v3", quantity: 0 },
      { productId: 1, variantId: "v3", quantity: 1 },
      "junk",
    ]);
    expect(parseBag(raw)).toEqual([{ productId: "p1", variantId: "v2", quantity: 2 }]);
    expect(parseBag("{not json")).toEqual([]);
  });

  it("merges a repeat add and removes at zero", () => {
    let lines = addToBag([], { productId: "p1", variantId: "v2", quantity: 1 });
    lines = addToBag(lines, { productId: "p1", variantId: "v2", quantity: 2 });
    expect(lines).toEqual([{ productId: "p1", variantId: "v2", quantity: 3 }]);
    expect(setBagQuantity(lines, "v2", 0)).toEqual([]);
  });

  it("prices against the live catalog and skips lines that sold out", () => {
    const bag = resolveBag(
      [
        { productId: "p1", variantId: "v1", quantity: 1 },
        { productId: "p1", variantId: "v3", quantity: 2 },
        { productId: "gone", variantId: "x", quantity: 1 },
      ],
      [candle],
    );
    expect(bag.count).toBe(2);
    expect(bag.total).toBe(48);
    expect(bag.dropped.map((l) => l.variantId)).toEqual(["v1", "x"]);
  });

  it("lists items and quantities in the WhatsApp message", () => {
    const { lines } = resolveBag([{ productId: "p1", variantId: "v3", quantity: 2 }], [candle]);
    const link = whatsappOrderLink("15550100", "Hi, I'd like to order:", lines, "Total: 48.00");
    expect(link.startsWith("https://wa.me/15550100?text=")).toBe(true);
    expect(decodeURIComponent(link.split("text=")[1])).toContain(
      "• 2 × Cedar candle (Large / Cedar)",
    );
  });
});
