import { describe, expect, test } from "vitest";

import { normalisePhone, parsePhoneforWa } from "./util.js";

describe("normalisePhone", () => {
  test("returns E.164 digits without the plus, the form Contact.phone stores", () => {
    expect(normalisePhone("+91 90000 00001", "IN")).toBe("919000000001");
  });

  test("reads a local number in the programme's country", () => {
    expect(normalisePhone("09000000001", "IN")).toBe("919000000001");
    expect(normalisePhone("(415) 555-2671", "US")).toBe("14155552671");
  });

  test("an international number overrides the programme's country", () => {
    expect(normalisePhone("+44 7911 123456", "IN")).toBe("447911123456");
  });

  test("junk is null, not a stored contact", () => {
    expect(normalisePhone("12345", "IN")).toBeNull();
    expect(normalisePhone("not a number", "IN")).toBeNull();
    expect(normalisePhone("", "IN")).toBeNull();
  });

  test("matches what the WhatsApp path does to the same number", () => {
    expect(normalisePhone("+919000000001", "IN")).toBe(parsePhoneforWa("+919000000001"));
  });
});
