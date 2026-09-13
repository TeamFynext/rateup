import { describe, expect, test } from "vitest";

import { CARD_CODE_LENGTH, formatCardCode, parseCardCode } from "./cardCode.js";

describe("parseCardCode", () => {
  test("accepts a bare code", () => {
    expect(parseCardCode("ABCDEFGHJKLM")).toBe("ABCDEFGHJKLM");
  });

  test("accepts the grouped, spaced and lower-case forms", () => {
    expect(parseCardCode("ABCD-EFGH-JKLM")).toBe("ABCDEFGHJKLM");
    expect(parseCardCode("abcd efgh jklm")).toBe("ABCDEFGHJKLM");
    expect(parseCardCode("  ABCD-EFGH JKLM\n")).toBe("ABCDEFGHJKLM");
  });

  test("accepts a URL whose last segment is a code, with or without .png", () => {
    expect(parseCardCode("https://api.example.com/api/public/loyalty/cards/ABCDEFGHJKLM.png")).toBe(
      "ABCDEFGHJKLM",
    );
    expect(parseCardCode("https://example.com/c/abcdefghjklm?x=1")).toBe("ABCDEFGHJKLM");
  });

  test("rejects the wrong length, confusable letters and other QR payloads", () => {
    expect(parseCardCode("ABCDEFGHJKL")).toBeNull();
    expect(parseCardCode("ABCDEFGHJKLMN")).toBeNull();
    expect(parseCardCode("ABCDEFGHIJKL")).toBeNull(); // I
    expect(parseCardCode("ABCDEFGH0KLM")).toBeNull(); // 0
    expect(parseCardCode("https://wa.me/919000000000?text=join")).toBeNull();
    // A redemption code is `RU-` + ten characters from the same alphabet: twelve once the
    // dash is dropped, so only the 4-4-4 grouping may be unpicked.
    expect(parseCardCode("RU-ABCDEFGHJK")).toBeNull();
    expect(parseCardCode("ABCDEF-GHJKLM")).toBeNull();
    expect(parseCardCode("")).toBeNull();
    expect(parseCardCode(null)).toBeNull();
  });

  test("a formatted code round-trips", () => {
    const code = "ABCDEFGHJKLM";
    expect(code).toHaveLength(CARD_CODE_LENGTH);
    expect(formatCardCode(code)).toBe("ABCD-EFGH-JKLM");
    expect(parseCardCode(formatCardCode(code))).toBe(code);
  });
});
