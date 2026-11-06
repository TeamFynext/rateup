import { describe, expect, test } from "vite-plus/test";

import {
  isExpiredShopifyClaim,
  parseShopifyCallbackSearch,
  shopifyCallbackPath,
} from "./shopify.claim.ts";

describe("parseShopifyCallbackSearch", () => {
  test("reads shop and claim", () => {
    expect(parseShopifyCallbackSearch({ shop: "a.myshopify.com", claim: "body.sig" })).toEqual({
      shop: "a.myshopify.com",
      claim: "body.sig",
    });
  });

  test("drops missing, empty and non-string values", () => {
    expect(parseShopifyCallbackSearch({ shop: "", claim: 42 })).toEqual({
      shop: undefined,
      claim: undefined,
    });
  });
});

describe("shopifyCallbackPath", () => {
  test("keeps the claim, encoded", () => {
    expect(shopifyCallbackPath("a.myshopify.com", "ab+c/d=.e_f")).toBe(
      "/auth/shopify?shop=a.myshopify.com&claim=ab%2Bc%2Fd%3D.e_f",
    );
  });

  test("round-trips through URLSearchParams", () => {
    const path = shopifyCallbackPath("a.myshopify.com", "x.y");
    const params = new URLSearchParams(path.split("?")[1]);
    expect(params.get("claim")).toBe("x.y");
  });

  test("omits the claim when there is none", () => {
    expect(shopifyCallbackPath("a.myshopify.com", undefined)).toBe(
      "/auth/shopify?shop=a.myshopify.com",
    );
  });
});

describe("isExpiredShopifyClaim", () => {
  test("a 404 means the link can no longer be used", () => {
    expect(isExpiredShopifyClaim({ response: { status: 404 } })).toBe(true);
  });

  test("other failures are not", () => {
    expect(isExpiredShopifyClaim({ response: { status: 409 } })).toBe(false);
    expect(isExpiredShopifyClaim(new Error("network"))).toBe(false);
  });
});
