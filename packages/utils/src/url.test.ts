import { describe, expect, it } from "vite-plus/test";
import { joinUrl, trimTrailingSlash } from "./url";

describe("trimTrailingSlash", () => {
  it("drops every trailing slash", () => {
    expect(trimTrailingSlash("https://cdn.example//")).toBe("https://cdn.example");
  });
  it("leaves a URL without one alone", () => {
    expect(trimTrailingSlash("https://cdn.example/a")).toBe("https://cdn.example/a");
  });
  it("turns a missing value into an empty string", () => {
    expect(trimTrailingSlash(undefined)).toBe("");
  });
});

describe("joinUrl", () => {
  it.each([
    ["https://cdn.example", "a.png"],
    ["https://cdn.example/", "a.png"],
    ["https://cdn.example", "/a.png"],
    ["https://cdn.example/", "/a.png"],
  ])("puts one slash between %s and %s", (base, path) => {
    expect(joinUrl(base, path)).toBe("https://cdn.example/a.png");
  });
  it("keeps a path under the base", () => {
    expect(joinUrl("https://cdn.example/uploads/", "x/y.png")).toBe(
      "https://cdn.example/uploads/x/y.png",
    );
  });
});
