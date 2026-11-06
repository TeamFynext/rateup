import { describe, expect, test } from "vitest";

import { CARD_CODE_LENGTH, formatCardCode, parseCardCode } from "./cardCode.js";

describe("parseCardCode", () => {
  test("accepts a bare code", () => {
    expect(parseCardCode("ABCDEFGHJ")).toBe("ABCDEFGHJ");
  });

  test("accepts the grouped, spaced and lower-case forms", () => {
    expect(parseCardCode("ABC-DEF-GHJ")).toBe("ABCDEFGHJ");
    expect(parseCardCode("abc def ghj")).toBe("ABCDEFGHJ");
    expect(parseCardCode("  ABC - DEF - GHJ\n")).toBe("ABCDEFGHJ");
  });

  test("accepts a URL whose last segment is a code, with or without .png", () => {
    expect(parseCardCode("https://api.example.com/api/public/loyalty/cards/ABCDEFGHJ.png")).toBe(
      "ABCDEFGHJ",
    );
    expect(parseCardCode("https://example.com/c/abcdefghj?x=1")).toBe("ABCDEFGHJ");
  });

  test("rejects the wrong length, confusable letters and other QR payloads", () => {
    expect(parseCardCode("ABCDE")).toBeNull();
    expect(parseCardCode("ABCDEFGHJK")).toBeNull();
    expect(parseCardCode("ABCDEFGHI")).toBeNull(); // I
    expect(parseCardCode("ABCDEFGH0")).toBeNull(); // 0
    expect(parseCardCode("ABC-DEFGHJ")).toBeNull();
    expect(parseCardCode("https://wa.me/919000000000?text=join")).toBeNull();
    expect(parseCardCode("RU-ABCDEFGHJK")).toBeNull();
    expect(parseCardCode("")).toBeNull();
    expect(parseCardCode(null)).toBeNull();
  });

  test("a formatted code round-trips", () => {
    const code = "ABCDEFGHJ";
    expect(code).toHaveLength(CARD_CODE_LENGTH);
    expect(formatCardCode(code)).toBe("ABC-DEF-GHJ");
    expect(parseCardCode(formatCardCode(code))).toBe(code);
  });
});
