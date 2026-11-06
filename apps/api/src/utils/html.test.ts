import { describe, expect, test } from "vitest";

import { escapeHtml } from "./html.js";

describe("escapeHtml", () => {
  test("neutralises a tag so it renders as text", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  test("neutralises an anchor a submitter tried to smuggle into an email", () => {
    expect(escapeHtml('<a href="https://evil.example/login">Reset your password</a>')).toBe(
      "&lt;a href=&quot;https://evil.example/login&quot;&gt;Reset your password&lt;/a&gt;",
    );
  });

  test("escapes the ampersand first, so an escape cannot be double-encoded into markup", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });

  test("escapes both quote characters, for use inside a quoted attribute", () => {
    expect(escapeHtml(`he said "hi" and it's fine`)).toBe(
      "he said &quot;hi&quot; and it&#39;s fine",
    );
  });

  test("leaves ordinary text exactly as it was", () => {
    expect(escapeHtml("Analytical Engines Ltd")).toBe("Analytical Engines Ltd");
  });

  test("renders an absent value as nothing, not as the word undefined", () => {
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(null)).toBe("");
  });

  test("stringifies a non-string before escaping it", () => {
    expect(escapeHtml(2026)).toBe("2026");
    expect(escapeHtml(["<a>", "<b>"])).toBe("&lt;a&gt;,&lt;b&gt;");
  });
});
