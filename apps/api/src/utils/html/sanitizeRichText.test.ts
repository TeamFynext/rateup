import { describe, expect, test } from "vite-plus/test";

import { neutralizePlainText, sanitizeRichText } from "./sanitizeRichText.js";

describe("sanitizeRichText — script is removed", () => {
  test.each([
    ["<script>alert(1)</script>ok", "ok"],
    ["<SCRIPT >alert(1)</SCRIPT>ok", "ok"],
    ["<script>never closed", ""],
    ["<style>body{display:none}</style>ok", "ok"],
    ['<svg onload="alert(1)"><circle/></svg>ok', "ok"],
    ["<math><mi>x</mi></math>ok", "ok"],
    ['<form action="https://evil"><button>go</button></form>ok', "ok"],
    ['<object data="x.swf"></object>ok', "ok"],
    ['<embed src="x.swf">ok', "ok"],
    ["<template><img src=x onerror=alert(1)></template>ok", "ok"],
    // The tokeniser ends noscript at the first `</noscript>`, like a scripting browser; what
    // follows is re-serialised (handler gone), never passed through.
    [
      '<noscript><p title="</noscript><img src=x onerror=alert(1)>"></noscript>ok',
      '<img src="x">">ok',
    ],
    ["<!-- <script>alert(1)</script> -->ok", "ok"],
    ["<![CDATA[x]]>ok", "ok"],
    ["<?xml version=1?>ok", "ok"],
  ])("%s", (input, expected) => {
    expect(sanitizeRichText(input)).toBe(expected);
  });

  test("unknown tags are dropped but their text is kept", () => {
    expect(sanitizeRichText("<marquee>hi</marquee> <meta http-equiv=refresh>x")).toBe("hi x");
    expect(sanitizeRichText('<input value="a"><select><option>b</option></select>c')).toBe("c");
  });
});

describe("sanitizeRichText — event handlers and dangerous attributes", () => {
  test("on* handlers are stripped in every quoting style", () => {
    expect(sanitizeRichText('<img src="https://x/a.png" onerror="alert(1)">')).toBe(
      '<img src="https://x/a.png">',
    );
    expect(sanitizeRichText("<img src=x onerror=alert(1)>")).toBe('<img src="x">');
    expect(sanitizeRichText("<p onclick='alert(1)' ONMOUSEOVER=x>t</p>")).toBe("<p>t</p>");
  });

  test("attributes outside the allow-list are dropped", () => {
    expect(
      sanitizeRichText(
        '<p id="x" data-foo="1" srcdoc="<script>" formaction="javascript:1" xlink:href="x">t</p>',
      ),
    ).toBe("<p>t</p>");
  });

  test("a duplicated attribute keeps only its first value", () => {
    expect(sanitizeRichText('<a href="https://ok" href="javascript:alert(1)">x</a>')).toBe(
      '<a href="https://ok" rel="noopener noreferrer">x</a>',
    );
  });

  test("an attribute value cannot break out of its quotes", () => {
    expect(sanitizeRichText(`<p title='a"><script>alert(1)</script>'>t</p>`)).toBe(
      '<p title="a&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;">t</p>',
    );
  });

  test("styles that only ever did harm are dropped, ordinary ones kept", () => {
    expect(sanitizeRichText('<span style="color: red; text-align: center">x</span>')).toBe(
      '<span style="color: red; text-align: center">x</span>',
    );
    expect(sanitizeRichText('<span style="width: expression(alert(1))">x</span>')).toBe(
      "<span>x</span>",
    );
    expect(sanitizeRichText('<span style="background:url(javascript:alert(1))">x</span>')).toBe(
      "<span>x</span>",
    );
    expect(sanitizeRichText('<span style="background:url(java\\script:alert(1))">x</span>')).toBe(
      "<span>x</span>",
    );
  });
});

describe("sanitizeRichText — URLs", () => {
  test.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    " javascript:alert(1)",
    "java\tscript:alert(1)",
    "javascript&colon;alert(1)",
    "&#106;avascript:alert(1)",
    "&#x6A;avascript:alert(1)",
    "&#106avascript:alert(1)",
    "vbscript:msgbox(1)",
    "data:text/html,<script>alert(1)</script>",
  ])("href %s is removed", (href) => {
    expect(sanitizeRichText(`<a href="${href}">x</a>`)).toBe('<a rel="noopener noreferrer">x</a>');
  });

  test("http(s), mailto, tel and relative links are kept, with rel forced", () => {
    for (const href of [
      "https://rateup.app/a?b=1",
      "http://x.io",
      "mailto:a@b.co",
      "tel:+911",
      "/x",
    ]) {
      expect(sanitizeRichText(`<a href="${href}" target="_blank" rel="opener">x</a>`)).toBe(
        `<a href="${href}" target="_blank" rel="noopener noreferrer">x</a>`,
      );
    }
  });

  test("an unexpected link target is dropped", () => {
    expect(sanitizeRichText('<a href="/x" target="evilframe">x</a>')).toBe(
      '<a href="/x" rel="noopener noreferrer">x</a>',
    );
  });

  test("img keeps http(s) and data:image sources only", () => {
    expect(sanitizeRichText('<img src="data:image/png;base64,AAAA" alt="a">')).toBe(
      '<img src="data:image/png;base64,AAAA" alt="a">',
    );
    expect(sanitizeRichText('<img src="data:text/html;base64,AAAA">')).toBe("<img>");
    expect(sanitizeRichText('<img src="javascript:alert(1)">')).toBe("<img>");
  });

  test("video keeps http(s) only; data: is not an image here", () => {
    expect(sanitizeRichText('<video src="https://cdn/x.mp4" controls="true"></video>')).toBe(
      '<video src="https://cdn/x.mp4" controls="true"></video>',
    );
    expect(sanitizeRichText('<video src="data:image/png;base64,AA"></video>')).toBe(
      "<video></video>",
    );
  });

  test("only YouTube / Vimeo https iframes keep their src, and their content is dropped", () => {
    const yt =
      '<div data-youtube-video=""><iframe width="640" height="480" allowfullscreen="true" autoplay="false" src="https://www.youtube.com/embed/abc"></iframe></div>';
    expect(sanitizeRichText(yt)).toBe(
      '<div data-youtube-video=""><iframe width="640" height="480" allowfullscreen="true" src="https://www.youtube.com/embed/abc"></iframe></div>',
    );
    expect(sanitizeRichText('<iframe src="https://evil.example/x"><p>a</p></iframe>')).toBe(
      "<iframe></iframe>",
    );
    expect(sanitizeRichText('<iframe src="http://www.youtube.com/embed/abc"></iframe>')).toBe(
      "<iframe></iframe>",
    );
  });

  test("URL values are written fully decoded and re-escaped", () => {
    expect(sanitizeRichText('<a href="https://x.io/?a=1&b=2">x</a>')).toBe(
      '<a href="https://x.io/?a=1&amp;b=2" rel="noopener noreferrer">x</a>',
    );
  });
});

describe("sanitizeRichText — formatting the editors produce is kept", () => {
  test.each([
    "<p>Hello <strong>World</strong></p>",
    '<h3 style="text-align: center">Welcome</h3><p style="text-align: center">Welcome to the survey</p>',
    '<p><span style="color: rgb(255, 0, 0)">red</span> <em>i</em> <u>u</u> <s>s</s> <b>b</b> <i>i</i> <strike>x</strike></p>',
    "<ul><li><p>one</p></li><li><p>two</p></li></ul><ol><li>three</li></ol>",
    "<blockquote><p>q</p></blockquote><pre><code>let a = 1;</code></pre><hr>",
    "<h1>1</h1><h2>2</h2><h4>4</h4><h5>5</h5><h6>6</h6>",
    "<p>line<br>break</p>",
    '<p class="ProseMirror-x">c</p>',
    '<p><a target="_blank" href="https://rateup.app" rel="noopener noreferrer">link</a></p>',
    '<img src="https://images.unsplash.com/x.jpg" alt="cover" width="300" height="200">',
    "<p>Tom &amp; Jerry &lt;3 &nbsp; ✓ नमस्ते 😀</p>",
  ])("%s", (html) => {
    expect(sanitizeRichText(html)).toBe(html);
  });

  test("tag names are lower-cased and self-closing slashes normalised", () => {
    expect(sanitizeRichText("<P>a<BR/>b</P>")).toBe("<p>a<br>b</p>");
    expect(sanitizeRichText("<p/>x")).toBe("<p></p>x");
  });

  test("unclosed tags are closed and stray end tags dropped", () => {
    expect(sanitizeRichText("<p><b>x</p></i>y")).toBe("<p><b>x</b></p>y");
    expect(sanitizeRichText("<p>open")).toBe("<p>open</p>");
  });
});

describe("sanitizeRichText — text", () => {
  test("plain text without a `<` is returned byte for byte (no double escaping)", () => {
    for (const text of [
      "How was your visit?",
      "Tom & Jerry",
      "5 > 3",
      `"quoted" and 'single'`,
      "already &amp; escaped &lt;b&gt;",
      "रेटिंग दें ⭐",
    ]) {
      expect(sanitizeRichText(text)).toBe(text);
    }
  });

  test("a `<` that is not a tag is escaped, and only once", () => {
    expect(sanitizeRichText("a < b")).toBe("a &lt; b");
    expect(sanitizeRichText("a &lt; b")).toBe("a &lt; b");
    expect(sanitizeRichText("<3")).toBe("&lt;3");
  });

  test("dropping a tag cannot glue a new one together", () => {
    const out = sanitizeRichText("<<x>script>alert(1)<</x>/script>");
    expect(out).not.toMatch(/<script/i);
    expect(out).toBe("&lt;script>alert(1)&lt;/script>");
  });

  test("a tag the tokeniser cannot parse is written out as text", () => {
    expect(sanitizeRichText('<img src="x" onerror="alert(1)"')).toBe(
      '&lt;img src="x" onerror="alert(1)"',
    );
  });

  test("non-strings and empty strings pass through", () => {
    expect(sanitizeRichText("")).toBe("");
    expect(sanitizeRichText(null)).toBeNull();
    expect(sanitizeRichText(undefined)).toBeUndefined();
    expect(sanitizeRichText(5 as unknown)).toBe(5);
  });
});

describe("sanitizeRichText — idempotent", () => {
  test.each([
    '<p>Hi<img src=x onerror="alert(1)"></p>&lt;script&gt;',
    "<P>a<BR/>b<p/>",
    '<a href="https://x.io/?a=1&b=2" rel="nofollow">x</a>',
    "<p><b>x</p></i>y < z",
    '<div data-youtube-video><iframe src="https://www.youtube.com/embed/a" allowfullscreen>junk</iframe></div>',
    `<p title='a"b' style="color:red">t</p>`,
    "<<x>script>alert(1)<</x>/script>",
    "Tom & Jerry <3",
  ])("sanitising the output again changes nothing: %s", (input) => {
    const once = sanitizeRichText(input);
    expect(sanitizeRichText(once)).toBe(once);
  });
});

describe("neutralizePlainText", () => {
  test("ordinary text is untouched", () => {
    for (const text of ["Rate us <3", "a < b", "5>3", "Tom & Jerry", "&amp;", "<", "x <= y"]) {
      expect(neutralizePlainText(text)).toBe(text);
    }
  });

  test("a `<` that would open a tag, end tag or comment is escaped", () => {
    expect(neutralizePlainText("<img src=x onerror=alert(1)>")).toBe(
      "&lt;img src=x onerror=alert(1)>",
    );
    expect(neutralizePlainText("</p><!-- x --><?php")).toBe("&lt;/p>&lt;!-- x -->&lt;?php");
    expect(neutralizePlainText("<<script>")).toBe("<&lt;script>");
  });

  test("is idempotent and passes non-strings through", () => {
    const once = neutralizePlainText("<b>x</b>");
    expect(neutralizePlainText(once)).toBe(once);
    expect(neutralizePlainText(null)).toBeNull();
  });
});
