import { describe, expect, test } from "vitest";

import { plainTextFromRichText, toRichText } from "./richText";

describe("richText", () => {
  test("round-trips multi-line text, blank lines included", () => {
    const text = "Hi {{1}}!\n\nYour code is {{2}}.";
    expect(plainTextFromRichText(toRichText(text))).toBe(text);
  });

  test("reads a legacy string and an empty document", () => {
    expect(plainTextFromRichText("plain")).toBe("plain");
    expect(plainTextFromRichText(null)).toBe("");
    expect(plainTextFromRichText({ type: "doc", content: [] })).toBe("");
  });
});
