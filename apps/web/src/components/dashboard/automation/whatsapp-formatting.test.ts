import { describe, expect, it } from "vite-plus/test";

import { stripWhatsAppFormatting } from "./whatsapp-formatting.ts";

describe("stripWhatsAppFormatting", () => {
  it("drops each marker and keeps the words", () => {
    expect(stripWhatsAppFormatting("*Sale* ends _today_, ~was~ now ```CODE10```.")).toBe(
      "Sale ends today, was now CODE10.",
    );
  });

  it("leaves markers that are part of a word or link alone", () => {
    const text = "See https://example.com/a_b_c and order_id 2*3*4";
    expect(stripWhatsAppFormatting(text)).toBe(text);
  });

  it("does not join markers across lines", () => {
    expect(stripWhatsAppFormatting("* item one\n* item two")).toBe("* item one\n* item two");
  });
});
