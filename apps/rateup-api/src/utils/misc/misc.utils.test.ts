import { describe, expect, test } from "vitest";
import { getNestedProperty } from "./obj.utils.js";
import {
  generateRandomAlphaId,
  generateRewardShortCode,
  getUniqueRandomAlphaId,
} from "./random.utils.js";

describe("getNestedProperty", () => {
  const source = {
    whatsapp: { active: true, conversation: { active: false, limit: 0 } },
    top: "value",
  };

  test("reads a top-level property", () => {
    expect(getNestedProperty(source, "top")).toBe("value");
  });

  test("walks a dotted path to a nested property", () => {
    expect(getNestedProperty(source, "whatsapp.conversation.active")).toBe(false);
  });

  test("returns the intermediate object when the path stops early", () => {
    expect(getNestedProperty(source, "whatsapp.conversation")).toEqual({
      active: false,
      limit: 0,
    });
  });

  test("preserves falsy values rather than treating them as missing", () => {
    expect(getNestedProperty(source, "whatsapp.conversation.limit")).toBe(0);
  });

  test("returns undefined for a property that does not exist", () => {
    expect(getNestedProperty(source, "whatsapp.missing")).toBeUndefined();
  });

  test("returns undefined rather than throwing when the path runs past a leaf", () => {
    expect(getNestedProperty(source, "top.deeper.still")).toBeUndefined();
  });

  test("returns undefined for a path into an empty object", () => {
    expect(getNestedProperty({}, "a.b")).toBeUndefined();
  });
});

describe("generateRandomAlphaId", () => {
  test("produces an id of the requested length", () => {
    expect(generateRandomAlphaId(10)).toHaveLength(10);
  });

  test("produces an empty string for a length of zero", () => {
    expect(generateRandomAlphaId(0)).toBe("");
  });

  test("uses only letters, never digits or symbols", () => {
    const sample = Array.from({ length: 200 }, () => generateRandomAlphaId(8)).join("");

    expect(sample).toMatch(/^[A-Za-z]+$/);
  });

  test("uses both upper and lower case", () => {
    const sample = Array.from({ length: 200 }, () => generateRandomAlphaId(8)).join("");

    expect(sample).toMatch(/[A-Z]/);
    expect(sample).toMatch(/[a-z]/);
  });
});

describe("getUniqueRandomAlphaId", () => {
  test("returns an id that is not already taken", () => {
    const existing = Array.from({ length: 50 }, () => generateRandomAlphaId(4));

    const id = getUniqueRandomAlphaId(4, existing);

    expect(existing).not.toContain(id);
    expect(id).toHaveLength(4);
  });

  test("returns straight away when nothing is taken", () => {
    expect(getUniqueRandomAlphaId(6, [])).toHaveLength(6);
  });
});

describe("generateRewardShortCode", () => {
  test("defaults to six characters", () => {
    expect(generateRewardShortCode()).toHaveLength(6);
  });

  test("honours a requested length", () => {
    expect(generateRewardShortCode(10)).toHaveLength(10);
  });

  test("uses only upper-case letters and digits", () => {
    const sample = Array.from({ length: 200 }, () => generateRewardShortCode()).join("");

    expect(sample).toMatch(/^[A-Z0-9]+$/);
  });

  test("does not repeat itself across calls", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateRewardShortCode(8)));

    expect(codes.size).toBe(100);
  });
});
