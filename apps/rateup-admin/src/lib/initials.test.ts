import { describe, expect, test } from "vitest";

import { getAvatarInitials, getInitials, isEmojiName } from "./initials";

describe("getInitials", () => {
  test("first letter of up to two words, upper-cased", () => {
    expect(getInitials("john ronald tolkien")).toBe("JR");
    expect(getInitials("  Maya  ")).toBe("M");
  });

  test("an emoji name is the emoji itself", () => {
    expect(getInitials("🔥 Team")).toBe("🔥");
    expect(getInitials("👨‍👩‍👧 Family")).toBe("👨‍👩‍👧");
  });

  test("skips words that start with a symbol", () => {
    expect(getInitials("Bob 🔥")).toBe("B");
  });

  test("nothing in, nothing out", () => {
    expect(getInitials(null)).toBe("");
    expect(getInitials("   ")).toBe("");
  });
});

describe("getAvatarInitials", () => {
  test("first and last word", () => {
    expect(getAvatarInitials("John Ronald Tolkien")).toBe("JT");
    expect(getAvatarInitials("Lena")).toBe("L");
  });

  test("a trailing emoji is not an initial", () => {
    expect(getAvatarInitials("Bob 🔥")).toBe("B");
  });
});

test("isEmojiName looks at the first grapheme only", () => {
  expect(isEmojiName("🧌")).toBe(true);
  expect(isEmojiName("Bob 🔥")).toBe(false);
});
