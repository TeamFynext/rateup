import { describe, expect, test } from "vitest";

import { draftMenuItem, isValidIceBreakers, isValidMenu } from "./messengerProfile.ts";

describe("Messenger profile drafts", () => {
  test("a menu row starts from the live item, keeping only its own field", () => {
    expect(draftMenuItem({ type: "web_url", title: "Shop", url: "https://shop.example" })).toEqual(
      expect.objectContaining({
        type: "web_url",
        title: "Shop",
        url: "https://shop.example",
        payload: "",
      }),
    );
    expect(draftMenuItem()).toEqual(expect.objectContaining({ type: "postback", title: "" }));
  });

  test("ice breakers need a question and a keyword each, at most 4", () => {
    const one = { question: "Hours?", payload: "HOURS" };
    expect(isValidIceBreakers([one])).toBe(true);
    expect(isValidIceBreakers([])).toBe(false);
    expect(isValidIceBreakers([{ question: "Hours?", payload: "" }])).toBe(false);
    expect(isValidIceBreakers([one, one, one, one, one])).toBe(false);
  });

  test.each([
    [{ type: "postback", title: "Agent", payload: "AGENT" }, true],
    [{ type: "web_url", title: "Shop", url: "https://shop.example" }, true],
    [{ type: "web_url", title: "Shop", url: "shop.example" }, false],
    [{ type: "postback", title: "x".repeat(31), payload: "A" }, false],
    [{ type: "postback", title: "Agent", payload: "" }, false],
  ] as const)("menu item %o is valid: %s", (item, expected) => {
    expect(isValidMenu([item])).toBe(expected);
  });
});
