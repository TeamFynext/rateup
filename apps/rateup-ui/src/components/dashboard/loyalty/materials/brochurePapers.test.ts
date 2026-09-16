import { describe, expect, test } from "vitest";

import { luminance } from "../onboarding/brand.ts";
import {
  BROCHURE_PAPERS,
  brochureTones,
  isBrochurePaper,
  mixHex,
  paperHex,
  paperTones,
} from "./brochurePapers.ts";

const BRAND = "#1c518e";
describe("paperTones", () => {
  // The whole reason a preset is paper *and* ink: picking a background on its own is how a
  // card ends up printing dark text on a dark card.
  test("a dark paper is given light ink, a light paper dark ink", () => {
    const dark = paperTones("deep-ink", BRAND);
    const light = paperTones("warm-white", BRAND);
    expect(luminance(dark.paper)).toBeLessThan(0.2);
    expect(luminance(dark.ink)).toBeGreaterThan(0.8);
    expect(luminance(light.ink)).toBeLessThan(0.2);
  });

  // A navy accent on a navy card is invisible, and a merchant should not find that out by
  // printing a hundred of them.
  test("the brand accent gives way on a dark paper", () => {
    expect(paperTones("deep-ink", BRAND).accent).not.toBe(BRAND);
    expect(paperTones("warm-white", BRAND).accent).toBe(BRAND);
    expect(paperTones("cream", BRAND).accent).toBe(BRAND);
  });

  // Mixed in JS to a plain hex, never `color-mix()`: the export rasteriser does not parse
  // that function, so a card using it previews correctly and downloads wrong.
  test("the brand tint is a plain hex, mixed towards the brand colour", () => {
    const tint = paperTones("brand-tint", BRAND).paper;
    expect(tint).toMatch(/^#[0-9a-f]{6}$/);
    expect(tint).not.toContain("color-mix");
    // A tenth of the brand over warm white: lighter than the brand, darker than the paper.
    expect(luminance(tint)).toBeGreaterThan(luminance(BRAND));
    expect(luminance(tint)).toBeLessThan(luminance("#fffdf8"));
    // Still light enough for dark ink.
    expect(luminance(paperTones("brand-tint", BRAND).ink)).toBeLessThan(0.2);
  });

  test("every paper resolves to a colour the rasteriser can parse", () => {
    for (const paper of BROCHURE_PAPERS) {
      expect(paperTones(paper, BRAND).paper).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  test("mixHex is a plain hex, and clamps", () => {
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mixHex("#000000", "#ffffff", 0)).toBe("#ffffff");
    expect(mixHex("#000000", "#ffffff", 1)).toBe("#000000");
    expect(mixHex("#000000", "#ffffff", 5)).toBe("#000000");
    // Unparseable input falls back to the base rather than producing "#NaNNaNNaN".
    expect(mixHex("not a colour", "#ffffff", 0.5)).toBe("#ffffff");
  });

  test("every paper carries a full set of tones", () => {
    for (const paper of BROCHURE_PAPERS) {
      const tones = paperTones(paper, BRAND);
      for (const value of [tones.paper, tones.ink, tones.inkMuted, tones.rule, tones.accent]) {
        expect(value).toBeTruthy();
      }
    }
  });

  test("an unknown paper falls back to warm white rather than rendering nothing", () => {
    // A document written by a later build, opened by this one.
    const tones = paperTones("letterpress" as never, BRAND);
    expect(tones.paper).toBe(paperTones("warm-white", BRAND).paper);
  });
});

describe("isBrochurePaper", () => {
  test("accepts what is stored, rejects what is not", () => {
    expect(isBrochurePaper("cream")).toBe(true);
    expect(isBrochurePaper("letterpress")).toBe(false);
    expect(isBrochurePaper(undefined)).toBe(false);
  });
});

describe("brochureTones", () => {
  // The picker is a free colour now. It stays safe only because the ink is derived, never
  // stored — so every preset has to come out of the general function exactly as it came
  // out of the preset table, or a saved document would shift the day it was migrated.
  test("reproduces every preset from its colour alone", () => {
    for (const paper of BROCHURE_PAPERS) {
      expect(brochureTones(paperHex(paper, BRAND), BRAND), paper).toEqual(paperTones(paper, BRAND));
    }
  });

  test("a hand-picked dark colour is given light ink and drops the brand accent", () => {
    const tones = brochureTones("#3b0a12", BRAND);
    expect(luminance(tones.ink)).toBeGreaterThan(0.8);
    expect(tones.accent).not.toBe(BRAND);
  });

  test("a hand-picked pale colour keeps dark ink and the brand accent", () => {
    const tones = brochureTones("#fdf2c9", BRAND);
    expect(luminance(tones.ink)).toBeLessThan(0.2);
    expect(tones.accent).toBe(BRAND);
  });

  test("case and whitespace do not change the card", () => {
    expect(brochureTones("  #FDF2C9 ", BRAND)).toEqual(brochureTones("#fdf2c9", BRAND));
  });

  test("a value that is not a colour falls back to warm white, not to nothing", () => {
    for (const junk of ["", "rebeccapurple", "#fff", "#12345"]) {
      expect(brochureTones(junk, BRAND).paper, junk).toBe(paperHex("warm-white", BRAND));
    }
  });

  test("every tone is a colour the export rasteriser can parse", () => {
    const tones = brochureTones("#3b0a12", BRAND);
    for (const value of [tones.paper, tones.ink, tones.inkMuted, tones.rule, tones.accent]) {
      expect(value).toMatch(/^(#[0-9a-f]{6}|rgba\([\d.,\s]+\))$/i);
    }
  });
});
