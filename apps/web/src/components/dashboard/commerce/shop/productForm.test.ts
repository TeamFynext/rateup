import { describe, expect, it } from "vite-plus/test";

import {
  BLANK_PRODUCT,
  blankVariant,
  buildVariants,
  hasPhoto,
  productPayload,
} from "./productForm.ts";

describe("buildVariants", () => {
  it("makes one row per combination of option values", () => {
    const rows = buildVariants(
      [
        { name: "Size", values: ["S", "L"] },
        { name: "Colour", values: ["Red", "Blue"] },
      ],
      [blankVariant({ price: "24.00" })],
    );
    expect(rows.map((r) => r.title)).toEqual(["S / Red", "S / Blue", "L / Red", "L / Blue"]);
    expect(rows.every((r) => r.price === "24.00")).toBe(true);
  });

  it("keeps an existing variant's id and stock when its combination survives", () => {
    const existing = blankVariant({
      id: "v1",
      title: "S",
      optionValues: { Size: "S" },
      price: "10.00",
      currentStock: 7,
    });
    const rows = buildVariants([{ name: "Size", values: ["S", "M"] }], [existing]);
    expect(rows[0]).toMatchObject({ id: "v1", currentStock: 7, price: "10.00" });
    expect(rows[1].id).toBeUndefined();
  });

  it("falls back to a single default row when every option is removed", () => {
    const rows = buildVariants(
      [],
      [blankVariant({ id: "v1", optionValues: { Size: "S" }, price: "5.00" })],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "v1", optionValues: null, title: "Default" });
  });
});

describe("productPayload", () => {
  it("sends stock only for new variants", () => {
    const payload = productPayload({
      ...BLANK_PRODUCT,
      title: "Mug",
      variants: [
        blankVariant({ id: "v1", price: "12", stock: "9" }),
        blankVariant({ price: "14", stock: "3", trackInventory: true }),
      ],
    });
    expect(payload.variants[0].stock).toBeUndefined();
    expect(payload.variants[1].stock).toBe(3);
    expect(payload.options).toBeNull();
  });

  it("leaves a new variant with no stock number untracked", () => {
    const payload = productPayload({
      ...BLANK_PRODUCT,
      title: "Gift card",
      variants: [blankVariant({ price: "20" })],
    });
    expect(payload.variants[0]).toMatchObject({ trackInventory: false, stock: undefined });
  });
});

describe("hasPhoto", () => {
  it("counts a variant photo when the product has none of its own", () => {
    expect(hasPhoto({ images: [], variants: [{ imageUrl: null }] })).toBe(false);
    expect(hasPhoto({ images: [], variants: [{ imageUrl: "https://example.com/a.jpg" }] })).toBe(
      true,
    );
  });
});
