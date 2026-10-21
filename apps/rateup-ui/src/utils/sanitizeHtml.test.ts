import { describe, expect, test } from "vitest";

import {
  escapeHtml,
  htmlToPlainText,
  isAllowedEmbedSrc,
  isSafeLinkHref,
  isSafeMediaSrc,
} from "./htmlSafety.ts";
import { sanitizeRichText } from "./sanitizeHtml.ts";

describe("URL guards", () => {
  test("links keep http(s), mailto, tel and relative URLs", () => {
    expect(isSafeLinkHref("https://rateup.app/x")).toBe(true);
    expect(isSafeLinkHref("http://example.com")).toBe(true);
    expect(isSafeLinkHref("mailto:a@b.co")).toBe(true);
    expect(isSafeLinkHref("tel:+911234")).toBe(true);
    expect(isSafeLinkHref("/pricing")).toBe(true);
  });

  test("links refuse script-capable schemes, however they are disguised", () => {
    expect(isSafeLinkHref("javascript:alert(1)")).toBe(false);
    expect(isSafeLinkHref(" JavaScript:alert(1)")).toBe(false);
    expect(isSafeLinkHref("java\tscript:alert(1)")).toBe(false);
    expect(isSafeLinkHref("java\nscript:alert(1)")).toBe(false);
    expect(isSafeLinkHref("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeLinkHref("vbscript:msgbox(1)")).toBe(false);
  });

  test("media sources are http(s) only", () => {
    expect(isSafeMediaSrc("https://cdn.rateup.app/a.png")).toBe(true);
    expect(isSafeMediaSrc("javascript:alert(1)")).toBe(false);
  });

  test("iframes embed only from known video hosts over https", () => {
    expect(isAllowedEmbedSrc("https://www.youtube.com/embed/abc")).toBe(true);
    expect(isAllowedEmbedSrc("https://www.youtube-nocookie.com/embed/abc")).toBe(true);
    expect(isAllowedEmbedSrc("https://player.vimeo.com/video/1")).toBe(true);
    expect(isAllowedEmbedSrc("http://www.youtube.com/embed/abc")).toBe(false);
    expect(isAllowedEmbedSrc("https://evil.com/embed")).toBe(false);
    expect(isAllowedEmbedSrc("https://www.youtube.com.evil.com/embed")).toBe(false);
    expect(isAllowedEmbedSrc("javascript:alert(1)")).toBe(false);
  });
});

describe("htmlToPlainText", () => {
  test("drops tags and script/style content, decodes entities", () => {
    expect(
      htmlToPlainText("<h3>Hello <strong>you</strong></h3><p>&amp; welcome&nbsp;back</p>"),
    ).toBe("Hello you & welcome back");
    expect(htmlToPlainText("<p>a</p><script>alert(1)</script><style>p{}</style>b")).toBe("a b");
    expect(htmlToPlainText('<img src=x onerror="alert(1)">Hi')).toBe("Hi");
    expect(htmlToPlainText(undefined)).toBe("");
  });

  test("an encoded tag stays text (it is rendered as a text node, never as HTML)", () => {
    expect(htmlToPlainText("&lt;img src=x onerror=alert(1)&gt;")).toBe(
      "<img src=x onerror=alert(1)>",
    );
  });
});

describe("sanitizeRichText without a DOM (server render, node tests)", () => {
  test("falls back to escaped plain text, so the result is always safe to inject", () => {
    const out = sanitizeRichText('<p>Hi <img src=x onerror="alert(1)"></p>&lt;script&gt;');
    expect(out).toBe("Hi &lt;script&gt;");
    expect(out).not.toContain("<");
  });

  test("empty input stays empty", () => {
    expect(sanitizeRichText(null)).toBe("");
    expect(sanitizeRichText("")).toBe("");
  });

  test("escapeHtml escapes every markup character", () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;",
    );
  });
});
