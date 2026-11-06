import { describe, expect, test } from "vite-plus/test";

import { mMeLink } from "./mMeLink.ts";

describe("mMeLink", () => {
  test("opens a chat with the Page", () => {
    expect(mMeLink("1924381580960288")).toBe("https://m.me/1924381580960288");
  });

  test("carries the ref the link rule answers", () => {
    expect(mMeLink("1924381580960288", " summer_sale ")).toBe(
      "https://m.me/1924381580960288?ref=summer_sale",
    );
  });

  test("leaves a blank ref off", () => {
    expect(mMeLink("1924381580960288", "  ")).toBe("https://m.me/1924381580960288");
  });

  test("is empty until a Page is picked", () => {
    expect(mMeLink(undefined, "summer_sale")).toBe("");
  });
});
