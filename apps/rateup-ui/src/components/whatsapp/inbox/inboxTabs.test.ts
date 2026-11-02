import { describe, expect, test } from "vitest";

import { isLegacyInboxTab, normalizeInboxTab } from "./inboxTabs.ts";

describe("normalizeInboxTab", () => {
  test("maps the retired tab values onto their new names", () => {
    expect(normalizeInboxTab("new")).toBe("unassigned");
    expect(normalizeInboxTab("mine")).toBe("assigned");
    expect(normalizeInboxTab("favourites")).toBe("starred");
  });

  test("passes current and unknown values through, and drops non-strings", () => {
    expect(normalizeInboxTab("unassigned")).toBe("unassigned");
    expect(normalizeInboxTab("open")).toBe("open");
    // The legacy custom-status fallback is case-sensitive and must survive.
    expect(normalizeInboxTab("Assigned")).toBe("Assigned");
    expect(normalizeInboxTab("toString")).toBe("toString");
    expect(normalizeInboxTab(3)).toBeUndefined();
  });
});

describe("isLegacyInboxTab", () => {
  test("is true only for the retired values", () => {
    expect(isLegacyInboxTab("mine")).toBe(true);
    expect(isLegacyInboxTab("assigned")).toBe(false);
    expect(isLegacyInboxTab(undefined)).toBe(false);
  });
});
