import { describe, expect, test } from "vite-plus/test";

import { safeHttpUrl } from "./safeRedirectUrl.ts";

describe("safeHttpUrl", () => {
  test("passes absolute http(s) URLs through", () => {
    expect(safeHttpUrl("https://example.com/menu?x=1")).toBe("https://example.com/menu?x=1");
    expect(safeHttpUrl(" http://example.com ")).toBe("http://example.com/");
  });

  test("refuses script-capable and relative values", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("JAVASCRIPT:alert(1)")).toBeNull();
    expect(safeHttpUrl("java\tscript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeHttpUrl("/relative")).toBeNull();
    expect(safeHttpUrl("")).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
  });
});
