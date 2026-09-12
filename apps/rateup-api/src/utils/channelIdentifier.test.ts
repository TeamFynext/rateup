import { describe, expect, test } from "vitest";

import {
  channelDigits,
  channelIdentifierSpellings,
  normalizeSourceIdentifier,
} from "./channelIdentifier.js";

describe("channelDigits", () => {
  // Every spelling of one number that production actually holds.
  test("reduces each spelling of a number to the same digits", () => {
    const spellings = [
      "96550334145",
      "+96550334145",
      "+965 50334145",
      "+9655-033-4145",
      "9655-033-4145",
      "+965 5033 4145",
    ];

    expect(new Set(spellings.map(channelDigits))).toEqual(new Set(["96550334145"]));
  });

  test("treats an absent identifier as no digits rather than throwing", () => {
    expect(channelDigits(null)).toBe("");
    expect(channelDigits(undefined)).toBe("");
    expect(channelDigits("")).toBe("");
  });

  test("keeps two different numbers apart", () => {
    expect(channelDigits("+9655-033-4145")).not.toBe(channelDigits("+965 2228 4525"));
  });
});

describe("normalizeSourceIdentifier", () => {
  test("normalises WhatsApp numbers", () => {
    expect(normalizeSourceIdentifier("+9655-033-4145", "WHATSAPP")).toBe("96550334145");
  });

  // `internal` shares this column and is matched as a literal.
  test("leaves the internal marker alone", () => {
    expect(normalizeSourceIdentifier("internal", "INTERNAL")).toBe("internal");
  });

  // An IG account id is already digits, but it is an opaque id — never a number
  // to be reformatted.
  test("passes Instagram and Facebook account ids through untouched", () => {
    expect(normalizeSourceIdentifier("17841476126718028", "INSTAGRAM")).toBe("17841476126718028");
    expect(normalizeSourceIdentifier("page-1", "FACEBOOK")).toBe("page-1");
  });

  // `phone-1` stripped to its digits is `1` — not a tidier spelling of the same
  // channel but a different, plausible-looking one. A phone id stored where a
  // number would go is the real case this protects.
  test("leaves an identifier that is not a number alone", () => {
    expect(normalizeSourceIdentifier("phone-1", "WHATSAPP")).toBe("phone-1");
    expect(normalizeSourceIdentifier("1218749261331967", "WHATSAPP")).toBe("1218749261331967");
  });

  test("still reduces every way a number is actually written", () => {
    for (const spelling of ["+9655-033-4145", "+965 5033 4145", "(965) 5033-4145"]) {
      expect(normalizeSourceIdentifier(spelling, "WHATSAPP")).toBe("96550334145");
    }
  });

  test("tells an absent identifier from one that normalises to nothing", () => {
    expect(normalizeSourceIdentifier(null)).toBeUndefined();
    expect(normalizeSourceIdentifier("")).toBeUndefined();
    // No digits at all, so the original is kept rather than reduced to "".
    expect(normalizeSourceIdentifier("internal")).toBe("internal");
  });
});

describe("channelIdentifierSpellings", () => {
  /**
   * Each entry is a spelling a real write path produced: `WhatsappSettings.phone`
   * verbatim (the campaign worker), that value with only the `+` removed (the old
   * inbox send path), digits (current code), and digits with a `+` (the webhook).
   */
  test("covers every spelling a write path has produced for a number", () => {
    expect(channelIdentifierSpellings("+1555-132-3034").sort()).toEqual(
      ["+1555-132-3034", "1555-132-3034", "15551323034", "+15551323034"].sort(),
    );
  });

  test("finds the formatted spellings from a bare number too", () => {
    // The inbox sends the channel filter's value, not the settings row, so the
    // needle is as likely to be the bare form as the formatted one.
    expect(channelIdentifierSpellings("15551323034").sort()).toEqual(
      ["15551323034", "+15551323034"].sort(),
    );
  });

  test("does not collapse two different numbers together", () => {
    const a = channelIdentifierSpellings("+1555-132-3034");
    const b = channelIdentifierSpellings("+1555-900-4766");

    expect(a.some((spelling) => b.includes(spelling))).toBe(false);
  });

  test("takes several channels at once without repeating a spelling", () => {
    const spellings = channelIdentifierSpellings(
      "+15551323034",
      "15551323034",
      null,
      undefined,
      "",
    );

    expect(spellings.sort()).toEqual(["+15551323034", "15551323034"].sort());
  });

  // An empty entry matches nothing useful and only bloats the query parameter.
  test("never yields an empty spelling", () => {
    expect(channelIdentifierSpellings("+")).toEqual([]);
    expect(channelIdentifierSpellings(null, undefined, "")).toEqual([]);
  });
});
