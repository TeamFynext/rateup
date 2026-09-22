import { describe, expect, test } from "vitest";

import { CARD_CODE_LENGTH, cardSendMessage, formatCardCode, parseCardCode } from "./cardCode";

describe("parseCardCode", () => {
  test("accepts a bare code and the grouped, spaced and lower-case forms", () => {
    expect(parseCardCode("ABCDEFGHJKLM")).toBe("ABCDEFGHJKLM");
    expect(parseCardCode("ABCD-EFGH-JKLM")).toBe("ABCDEFGHJKLM");
    expect(parseCardCode("abcd efgh jklm")).toBe("ABCDEFGHJKLM");
    expect(parseCardCode("  ABCD-EFGH JKLM\n")).toBe("ABCDEFGHJKLM");
  });

  test("accepts a URL whose last segment is a code", () => {
    expect(parseCardCode("https://api.example.com/api/public/loyalty/cards/ABCDEFGHJKLM.png")).toBe(
      "ABCDEFGHJKLM",
    );
  });

  // The camera will be pointed at other QRs: a wa.me join poster, a redemption code, a
  // payment QR. None of them may open a customer.
  test("rejects everything that is not a card", () => {
    expect(parseCardCode("ABCDEFGHJKL")).toBeNull();
    expect(parseCardCode("ABCDEFGHIJKL")).toBeNull();
    expect(parseCardCode("RU-ABCDEFGHJK")).toBeNull();
    expect(parseCardCode("ABCDEF-GHJKLM")).toBeNull();
    expect(parseCardCode("https://wa.me/919000000000?text=join")).toBeNull();
    expect(parseCardCode("upi://pay?pa=x@bank")).toBeNull();
    expect(parseCardCode("")).toBeNull();
    expect(parseCardCode(undefined)).toBeNull();
  });

  test("a formatted code round-trips", () => {
    const code = "ABCDEFGHJKLM";
    expect(code).toHaveLength(CARD_CODE_LENGTH);
    expect(formatCardCode(code)).toBe("ABCD-EFGH-JKLM");
    expect(parseCardCode(formatCardCode(code))).toBe(code);
  });
});

describe("cardSendMessage", () => {
  const outcome = (over: Partial<Parameters<typeof cardSendMessage>[0]>) => ({
    sent: false,
    skippedReason: null,
    cardCode: "ABCDEFGHJKLM",
    cardSentAt: null,
    ...over,
  });

  test("a send is confirmed, and every skip says what to do", () => {
    expect(cardSendMessage(outcome({ sent: true }))).toMatch(/sent/i);
    expect(cardSendMessage(outcome({ skippedReason: "session_closed" }))).toMatch(/message you/i);
    expect(cardSendMessage(outcome({ skippedReason: "send_failed" }))).toMatch(/try again/i);
    expect(cardSendMessage(outcome({ skippedReason: "not_active" }))).toMatch(/active/i);
    expect(cardSendMessage(outcome({ skippedReason: "no_public_url" }))).toMatch(/admin/i);
    expect(cardSendMessage(outcome({}))).toMatch(/not sent/i);
  });
});
