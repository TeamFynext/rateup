import { describe, expect, it } from "vite-plus/test";

import { toText } from "./toText";

describe("toText", () => {
  it("passes strings through and stringifies primitives", () => {
    expect(toText("hi")).toBe("hi");
    expect(toText(0)).toBe("0");
    expect(toText(false)).toBe("false");
    expect(toText(10n)).toBe("10");
  });

  it("uses the fallback for null and undefined only", () => {
    expect(toText(null)).toBe("");
    expect(toText(undefined, "NA")).toBe("NA");
    expect(toText("", "NA")).toBe("");
  });

  it("joins arrays the way String() does", () => {
    expect(toText(["a", 1, null])).toBe("a,1,");
  });

  it("writes objects as JSON instead of [object Object]", () => {
    expect(toText({ a: 1 })).toBe('{"a":1}');
  });

  it("does not throw on circular objects", () => {
    const loop: Record<string, unknown> = {};
    loop.self = loop;
    expect(toText(loop, "x")).toBe("x");
  });
});
