import { describe, expect, test } from "vitest";

import { productSchema, shipmentSchema, storeUpdateSchema, webUrl } from "./shop.schema.js";

describe("links merchants type in", () => {
  test("http and https are accepted", () => {
    expect(webUrl().safeParse("https://instagram.com/fern").success).toBe(true);
    expect(webUrl().safeParse("http://tracking.test/1Z").success).toBe(true);
  });

  test("script and data URLs are refused", () => {
    for (const url of [
      "javascript:alert(1)",
      "JAVASCRIPT:alert(1)",
      "data:text/html,x",
      "vbscript:x",
    ])
      expect(webUrl().safeParse(url).success, url).toBe(false);
  });

  test("every commerce URL field uses it", () => {
    const bad = "javascript:alert(1)";
    expect(storeUpdateSchema.partial().safeParse({ logoUrl: bad }).success).toBe(false);
    expect(shipmentSchema.partial().safeParse({ trackingUrl: bad }).success).toBe(false);
    expect(productSchema.partial().safeParse({ productUrl: bad }).success).toBe(false);
    expect(productSchema.partial().safeParse({ images: [bad] }).success).toBe(false);
  });
});
