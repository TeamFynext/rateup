import { describe, expect, test } from "vitest";

import {
  BROCHURE_DESIGNS,
  brochureDesign,
  brochureDesigns,
  isBrochureDesign,
  QR_PLACEMENT,
} from "./brochureDesigns.ts";

const t = ((key: string) => key) as unknown as Parameters<typeof brochureDesigns>[0];

describe("brochureDesigns", () => {
  test("four designs, each named and described", () => {
    const designs = brochureDesigns(t);
    expect(designs).toHaveLength(4);
    expect(designs.map((d) => d.kind)).toEqual([...BROCHURE_DESIGNS]);
    for (const design of designs) {
      expect(design.label).toBeTruthy();
      expect(design.description).toBeTruthy();
    }
  });

  // The menu card is the design every existing brochure was drawn as, so it has to stay
  // first: it is what a programme with nothing stored falls back to.
  test("the menu card leads", () => {
    expect(BROCHURE_DESIGNS[0]).toBe("menu");
    expect(brochureDesigns(t)[0]?.kind).toBe("menu");
  });

  test("a design this build does not know still resolves to something printable", () => {
    expect(brochureDesign(t, "trifold" as never).kind).toBe("menu");
  });
});

describe("QR placement", () => {
  // Placement is the design's decision, not a setting — on a table tent the scan is the
  // whole point, while on a menu card it belongs after the rewards have persuaded.
  test("the table tent features the code; the rest footer it", () => {
    expect(QR_PLACEMENT.tent).toBe("feature");
    expect(QR_PLACEMENT.menu).toBe("footer");
    expect(QR_PLACEMENT.poster).toBe("footer");
    expect(QR_PLACEMENT.typeset).toBe("footer");
  });

  test("the table and the metadata agree", () => {
    for (const design of brochureDesigns(t)) {
      expect(QR_PLACEMENT[design.kind]).toBe(design.qrPlacement);
    }
  });

  test("every design places its code somewhere", () => {
    for (const design of BROCHURE_DESIGNS) {
      expect(["footer", "feature"]).toContain(QR_PLACEMENT[design]);
    }
  });
});

describe("isBrochureDesign", () => {
  test("accepts what is stored, rejects what is not", () => {
    expect(isBrochureDesign("poster")).toBe(true);
    expect(isBrochureDesign("trifold")).toBe(false);
    expect(isBrochureDesign(undefined)).toBe(false);
  });
});
