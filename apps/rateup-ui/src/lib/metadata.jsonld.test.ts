import { describe, expect, test } from "vitest";

import { serializeJsonLd } from "./metadata.ts";

describe("serializeJsonLd", () => {
  test("cannot close the surrounding <script>", () => {
    const out = serializeJsonLd({ headline: "</script><script>alert(1)</script> & <!--" });
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(JSON.parse(out)).toEqual({ headline: "</script><script>alert(1)</script> & <!--" });
  });

  test("escapes the JS line terminators", () => {
    const out = serializeJsonLd({ a: "x y z" });
    expect(out).toBe('{"a":"x\\u2028y\\u2029z"}');
    expect(JSON.parse(out)).toEqual({ a: "x y z" });
  });
});
