import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { fillWaPlaceholders, formatWaText, visibleWaButtons } from "./wa-template-bubble.tsx";

describe("fillWaPlaceholders", () => {
  it("fills numbered and named placeholders, and keeps ones without a sample", () => {
    expect(
      fillWaPlaceholders("Hi {{1}}, order {{2}} for {{shop}}", { "1": "John", shop: "Acme" }),
    ).toBe("Hi John, order {{2}} for Acme");
  });
  it("treats a blank sample as missing", () => {
    expect(fillWaPlaceholders("Hi {{1}}", { "1": "  " })).toBe("Hi {{1}}");
  });
});

describe("formatWaText", () => {
  const html = (text: string) => renderToStaticMarkup(<>{formatWaText(text)}</>);
  it("renders WhatsApp's markers", () => {
    expect(html("*a* _b_ ~c~ ```d```")).toBe(
      '<strong>a</strong> <em>b</em> <del>c</del> <code class="font-mono text-[13px]">d</code>',
    );
  });
  it("leaves unpaired markers as text", () => {
    expect(html("2 * 3 = 6")).toBe("2 * 3 = 6");
  });
});

describe("visibleWaButtons", () => {
  const b = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ type: "QUICK_REPLY", text: `B${i}` }));
  it("shows up to three buttons", () => {
    expect(visibleWaButtons(b(3))).toEqual({ shown: b(3), overflow: false });
  });
  it("folds four or more into two and See all options", () => {
    expect(visibleWaButtons(b(4))).toEqual({ shown: b(2), overflow: true });
  });
});
