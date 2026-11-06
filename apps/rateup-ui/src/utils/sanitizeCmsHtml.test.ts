import { describe, expect, test } from "vite-plus/test";

import { sanitizeCmsHtml } from "./sanitizeCmsHtml.ts";

describe("sanitizeCmsHtml", () => {
  test("keeps typical Ghost markup", () => {
    const html =
      '<h2 id="why-it-matters">Why it <em>matters</em></h2><p>Read the <a href="https://rateup.app/pricing">pricing</a> &amp; more&hellip;</p>' +
      '<figure class="kg-card kg-image-card"><img src="https://blog.rateup.app/content/images/a.png" class="kg-image" alt="A" loading="lazy" width="2000" height="1000" srcset="https://blog.rateup.app/a-600.png 600w, https://blog.rateup.app/a.png 2000w" sizes="(min-width: 720px) 720px"><figcaption><span style="white-space: pre-wrap;">Caption</span></figcaption></figure>';
    expect(sanitizeCmsHtml(html)).toBe(
      '<h2 id="why-it-matters">Why it <em>matters</em></h2><p>Read the <a href="https://rateup.app/pricing" rel="noopener noreferrer">pricing</a> &amp; more&hellip;</p>' +
        '<figure class="kg-card kg-image-card"><img src="https://blog.rateup.app/content/images/a.png" class="kg-image" alt="A" loading="lazy" width="2000" height="1000" srcset="https://blog.rateup.app/a-600.png 600w, https://blog.rateup.app/a.png 2000w" sizes="(min-width: 720px) 720px"><figcaption><span style="white-space: pre-wrap;">Caption</span></figcaption></figure>',
    );
  });

  test("keeps YouTube embeds and drops other iframes' src", () => {
    expect(
      sanitizeCmsHtml(
        '<figure class="kg-embed-card"><iframe width="200" height="113" src="https://www.youtube.com/embed/xyz?feature=oembed" frameborder="0" allowfullscreen title="Video"></iframe></figure>',
      ),
    ).toBe(
      '<figure class="kg-embed-card"><iframe width="200" height="113" src="https://www.youtube.com/embed/xyz?feature=oembed" frameborder="0" allowfullscreen="" title="Video"></iframe></figure>',
    );
    expect(sanitizeCmsHtml('<iframe src="https://evil.com/x"></iframe>')).toBe("<iframe></iframe>");
    expect(sanitizeCmsHtml('<iframe srcdoc="<script>alert(1)</script>"></iframe>')).toBe(
      "<iframe></iframe>",
    );
  });

  test("drops scripts, styles and their content", () => {
    expect(sanitizeCmsHtml("<p>a</p><script>alert(1)</script><p>b</p>")).toBe("<p>a</p><p>b</p>");
    expect(sanitizeCmsHtml("<SCRIPT >alert(1)</script >x")).toBe("x");
    expect(sanitizeCmsHtml("<style>body{display:none}</style>x")).toBe("x");
    expect(sanitizeCmsHtml("<svg><script>alert(1)</script></svg>x")).toBe("x");
    expect(sanitizeCmsHtml("<script>never closed")).toBe("");
  });

  test("drops event handlers and unknown attributes", () => {
    expect(sanitizeCmsHtml('<img src="https://a.co/x.png" onerror="alert(1)">')).toBe(
      '<img src="https://a.co/x.png">',
    );
    expect(sanitizeCmsHtml('<p onclick=alert(1) data-x="1">x</p>')).toBe("<p>x</p>");
  });

  test("refuses script URLs, including entity-encoded ones", () => {
    expect(sanitizeCmsHtml('<a href="javascript:alert(1)">x</a>')).toBe(
      '<a rel="noopener noreferrer">x</a>',
    );
    expect(sanitizeCmsHtml('<a href="&#106;avascript:alert(1)">x</a>')).toBe(
      '<a rel="noopener noreferrer">x</a>',
    );
    expect(sanitizeCmsHtml('<a href="java&#x09;script:alert(1)">x</a>')).toBe(
      '<a rel="noopener noreferrer">x</a>',
    );
    // An entity the decoder does not know is re-escaped, so the browser sees it literally.
    expect(sanitizeCmsHtml('<a href="javascript&colon;alert(1)">x</a>')).toBe(
      '<a href="javascript&amp;colon;alert(1)" rel="noopener noreferrer">x</a>',
    );
    expect(sanitizeCmsHtml('<img src="data:text/html,hi">')).toBe("<img>");
  });

  test("drops tags it does not allow but keeps their text", () => {
    expect(sanitizeCmsHtml("<form><input value=1></form><marquee>hi</marquee>")).toBe("hi");
    expect(sanitizeCmsHtml("<object data=x></object><p>ok</p>")).toBe("<p>ok</p>");
  });

  test("anything that is not a well-formed tag becomes text", () => {
    expect(sanitizeCmsHtml("<img/src=x/onerror=alert(1)>")).toBe(
      "&lt;img/src=x/onerror=alert(1)&gt;",
    );
    expect(sanitizeCmsHtml("a < b > c")).toBe("a &lt; b &gt; c");
    expect(sanitizeCmsHtml('<p title="a>b">x</p>')).toBe('<p title="a&gt;b">x</p>');
    expect(sanitizeCmsHtml("<p title='\"><script>alert(1)</script>'>x</p>")).toBe(
      '<p title="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;">x</p>',
    );
  });

  test("comments and doctypes are removed", () => {
    expect(sanitizeCmsHtml("<!-- <img src=x onerror=alert(1)> -->x<!doctype html>")).toBe("x");
    expect(sanitizeCmsHtml("<!-- unterminated <script>")).toBe("");
  });

  test("closes what it opened and ignores stray end tags", () => {
    expect(sanitizeCmsHtml("<p><strong>x")).toBe("<p><strong>x</strong></p>");
    expect(sanitizeCmsHtml("</div></p>x")).toBe("x");
    expect(sanitizeCmsHtml("<ul><li>a<li>b</ul>")).toBe("<ul><li>a<li>b</li></li></ul>");
  });

  test("links always get rel=noopener noreferrer and a constrained target", () => {
    expect(sanitizeCmsHtml('<a href="/x" target="_blank" rel="opener">x</a>')).toBe(
      '<a href="/x" target="_blank" rel="noopener noreferrer">x</a>',
    );
    expect(sanitizeCmsHtml('<a href="/x" target="other">x</a>')).toBe(
      '<a href="/x" rel="noopener noreferrer">x</a>',
    );
  });

  test("empty input", () => {
    expect(sanitizeCmsHtml(null)).toBe("");
    expect(sanitizeCmsHtml(undefined)).toBe("");
  });
});
