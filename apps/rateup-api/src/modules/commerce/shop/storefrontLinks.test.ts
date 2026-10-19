import { describe, expect, test } from "vitest";

import { productHandle, storefrontProductUrl } from "./storefrontLinks.js";

const id = "3f9a2b1c-77aa-4c1e-9d2f-0a1b2c3d4e5f";

describe("product handles", () => {
  test("read as the title, then the start of the id", () => {
    expect(productHandle({ id, title: "Ethiopia Guji — Single Origin (250 g)" })).toBe(
      "ethiopia-guji-single-origin-250-g-3f9a2b1c",
    );
  });

  test("drop accents but keep letters from any script", () => {
    expect(productHandle({ id, title: "Crème Brûlée" })).toBe("creme-brulee-3f9a2b1c");
    expect(productHandle({ id, title: "抹茶 ラテ" })).toBe("抹茶-ラテ-3f9a2b1c");
  });

  test("fall back to the id when the title has no letters", () => {
    expect(productHandle({ id, title: "★★★" })).toBe("3f9a2b1c");
  });

  test("keep long titles short without a trailing dash", () => {
    const handle = productHandle({ id, title: `${"a".repeat(59)} b c` });
    expect(handle).toBe(`${"a".repeat(59)}-3f9a2b1c`);
  });

  test("build an encoded storefront address", () => {
    expect(storefrontProductUrl("jin", { id, title: "抹茶" })).toMatch(
      /\/s\/jin\/p\/%E6%8A%B9%E8%8C%B6-3f9a2b1c$/,
    );
  });
});
