import { describe, expect, it } from "vitest";

import { safeReturnTo } from "./returnTo";

const ORIGIN = "https://admin.rateup.app";

describe("safeReturnTo", () => {
  it("keeps same-origin paths with search and hash", () => {
    expect(safeReturnTo("/orgs/123?tab=billing#plan", ORIGIN)).toBe("/orgs/123?tab=billing#plan");
    expect(safeReturnTo("/", ORIGIN)).toBe("/");
  });

  it("falls back to / for missing or relative values", () => {
    expect(safeReturnTo(undefined, ORIGIN)).toBe("/");
    expect(safeReturnTo("", ORIGIN)).toBe("/");
    expect(safeReturnTo("orgs", ORIGIN)).toBe("/");
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(safeReturnTo("https://evil.com", ORIGIN)).toBe("/");
    expect(safeReturnTo("//evil.com", ORIGIN)).toBe("/");
    expect(safeReturnTo("javascript:alert(1)", ORIGIN)).toBe("/");
  });

  it("rejects backslash tricks that browsers read as //host", () => {
    expect(safeReturnTo("/\\evil.com", ORIGIN)).toBe("/");
    expect(safeReturnTo("/\\/evil.com", ORIGIN)).toBe("/");
    expect(safeReturnTo("/orgs\\..\\x", ORIGIN)).toBe("/");
  });

  it("rejects control characters the URL parser strips", () => {
    expect(safeReturnTo("/\t/evil.com", ORIGIN)).toBe("/");
    expect(safeReturnTo("/\n/evil.com", ORIGIN)).toBe("/");
  });

  it("normalises dot segments but stays on the origin", () => {
    expect(safeReturnTo("/a/../b", ORIGIN)).toBe("/b");
  });
});
