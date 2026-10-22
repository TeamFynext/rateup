import { describe, expect, test } from "vitest";

import { isFacebookOrigin } from "./facebookOrigin.ts";

describe("isFacebookOrigin", () => {
  test("accepts facebook.com and its subdomains over https", () => {
    expect(isFacebookOrigin("https://www.facebook.com")).toBe(true);
    expect(isFacebookOrigin("https://web.facebook.com")).toBe(true);
    expect(isFacebookOrigin("https://facebook.com")).toBe(true);
  });

  test("rejects look-alikes, other schemes and garbage", () => {
    expect(isFacebookOrigin("https://evilfacebook.com")).toBe(false);
    expect(isFacebookOrigin("https://facebook.com.evil.com")).toBe(false);
    expect(isFacebookOrigin("http://www.facebook.com")).toBe(false);
    expect(isFacebookOrigin("null")).toBe(false);
    expect(isFacebookOrigin("")).toBe(false);
  });
});
