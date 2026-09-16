import { describe, expect, test } from "vitest";

import { brandGradient, darken, initialsOf, luminance, parseHex, readableTextOn } from "./brand";

describe("brand colour helpers", () => {
  test("parses six-digit hex with or without the hash", () => {
    expect(parseHex("#1c518e")).toEqual({ r: 28, g: 81, b: 142 });
    expect(parseHex("1C518E")).toEqual({ r: 28, g: 81, b: 142 });
    expect(parseHex("#fff")).toBeNull();
  });

  test("white text on the brand navy, navy text on the star amber", () => {
    expect(readableTextOn("#1c518e")).toBe("#ffffff");
    expect(readableTextOn("#f8951d")).toBe("#0f2540");
    expect(readableTextOn("#ffffff")).toBe("#0f2540");
  });

  test("luminance is ordered black < navy < white", () => {
    expect(luminance("#000000")).toBeLessThan(luminance("#1c518e"));
    expect(luminance("#1c518e")).toBeLessThan(luminance("#ffffff"));
  });

  test("darken moves towards black and leaves junk alone", () => {
    expect(darken("#ffffff", 0.5)).toBe("#808080");
    expect(darken("#1c518e", 0)).toBe("#1c518e");
    expect(darken("nope", 0.5)).toBe("nope");
  });

  test("gradient starts at the colour itself", () => {
    expect(brandGradient("#1c518e").startsWith("linear-gradient(135deg, #1c518e 0%")).toBe(true);
  });

  test("initials take the first two words, or two letters of one", () => {
    expect(initialsOf("Kettle & Co")).toBe("KC");
    expect(initialsOf("Bloom")).toBe("BL");
    expect(initialsOf("")).toBe("");
  });
});
