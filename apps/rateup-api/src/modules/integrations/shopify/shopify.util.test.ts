import { describe, expect, test } from "vitest";
import { toShopifyProvinceCode } from "./shopify.util.js";

describe("toShopifyProvinceCode", () => {
  test.each([
    ["Kerala", "KL"],
    ["tamil nadu", "TN"],
    ["Tamilnadu", "TN"],
    ["NEW DELHI", "DL"],
    ["Odisha", "OR"],
    ["Orissa", "OR"],
    ["Telangana", "TS"],
    ["Uttarakhand", "UK"],
    ["Chhattisgarh", "CG"],
    ["Pondicherry", "PY"],
    ["Jammu & Kashmir", "JK"],
    ["mh", "MH"],
  ])("resolves the free-text state %s to Shopify's code %s", (state, code) => {
    expect(toShopifyProvinceCode("IN", state)).toBe(code);
  });

  test("leaves out a state it can't resolve rather than sending a code Shopify rejects", () => {
    expect(toShopifyProvinceCode("IN", "Atlantis")).toBeUndefined();
    expect(toShopifyProvinceCode("IN", "")).toBeUndefined();
    expect(toShopifyProvinceCode("IN", undefined)).toBeUndefined();
  });

  test("defaults to India, the only country the address flow collects", () => {
    expect(toShopifyProvinceCode(undefined, "Karnataka")).toBe("KA");
  });

  test("passes a short code through for other countries and drops a name", () => {
    expect(toShopifyProvinceCode("AE", "du")).toBe("DU");
    expect(toShopifyProvinceCode("AE", "Dubai")).toBeUndefined();
  });
});
