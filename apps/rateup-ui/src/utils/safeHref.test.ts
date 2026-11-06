import { describe, expect, test } from "vite-plus/test";

import { safeHref } from "./safeHref";

describe("safeHref", () => {
  test("keeps http and https links", () => {
    expect(safeHref("https://shop.test/a")).toBe("https://shop.test/a");
    expect(safeHref("http://shop.test")).toBe("http://shop.test");
  });

  test("drops every other scheme and anything that isn't a URL", () => {
    for (const url of [
      "javascript:alert(1)",
      " JavaScript:alert(1)",
      "data:text/html,<script>",
      "vbscript:x",
      "/relative",
      "",
      null,
      undefined,
    ])
      expect(safeHref(url)).toBeUndefined();
  });
});
