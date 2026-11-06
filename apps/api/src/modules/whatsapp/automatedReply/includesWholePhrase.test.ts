import { describe, it, expect } from "vitest";
import { includesWholePhrase } from "./wa_automatedReply.utils.js";

describe("includesWholePhrase", () => {
  it("matches a standalone word", () => {
    expect(includesWholePhrase("hi re", "hi")).toBe(true);
  });

  it("does not match partial words", () => {
    expect(includesWholePhrase("hire", "hi")).toBe(false);
    expect(includesWholePhrase("high", "hi")).toBe(false);
    expect(includesWholePhrase("ohio", "hi")).toBe(false);
  });

  it("matches words with punctuation", () => {
    expect(includesWholePhrase("say hi!", "hi")).toBe(true);
    expect(includesWholePhrase("say hi!", "hi!")).toBe(true);
  });

  it("matches multi-word phrases", () => {
    expect(includesWholePhrase("hello hi there", "hi there")).toBe(true);
    expect(includesWholePhrase("hello hithere", "hi there")).toBe(false);
  });

  it("is case-insensitive by default", () => {
    expect(includesWholePhrase("Hello HI There", "hi")).toBe(true);
  });

  it("supports case-sensitive matching", () => {
    expect(includesWholePhrase("Hello HI There", "hi", true)).toBe(false);
    expect(includesWholePhrase("Hello HI There", "HI", true)).toBe(true);
  });

  it("escapes regex special characters", () => {
    expect(includesWholePhrase("price is $5.00", "$5.00")).toBe(true);
    expect(includesWholePhrase("Hi 🥹", "🥹")).toBe(true);
  });
});
