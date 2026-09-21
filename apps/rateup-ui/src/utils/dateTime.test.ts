import { describe, expect, test } from "vitest";

import { fromDateKey, toDateKey } from "./dateTime.ts";

describe("date keys", () => {
  test("formats a local date without shifting the day across a timezone", () => {
    // 1 October, late enough in the evening that `toISOString()` would say the 2nd east of UTC.
    expect(toDateKey(new Date(2026, 9, 1, 23, 30))).toBe("2026-10-01");
  });

  test("pads single-digit months and days", () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  test("round-trips a key back to the same local day", () => {
    const parsed = fromDateKey("2026-10-01");
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(9);
    expect(parsed?.getDate()).toBe(1);
    expect(toDateKey(parsed!)).toBe("2026-10-01");
  });

  test("an empty or unparseable key is undefined, so a picker shows its placeholder", () => {
    expect(fromDateKey("")).toBeUndefined();
    expect(fromDateKey(undefined)).toBeUndefined();
    expect(fromDateKey(null)).toBeUndefined();
    expect(fromDateKey("not-a-date")).toBeUndefined();
  });
});
