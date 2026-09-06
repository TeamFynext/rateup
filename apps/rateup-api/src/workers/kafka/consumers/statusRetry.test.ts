import { describe, expect, it } from "vitest";

import { MAX_RETRIES, retryDelayMs } from "./statusRetry.js";

describe("status retry delay", () => {
  it("doubles from a quarter second", () => {
    expect(retryDelayMs(0)).toBe(250);
    expect(retryDelayMs(1)).toBe(500);
    expect(retryDelayMs(4)).toBe(4000);
  });

  it("is capped so a late receipt is not held all day", () => {
    expect(retryDelayMs(10)).toBe(30_000);
    expect(retryDelayMs(100)).toBe(30_000);
  });

  it("gives a skipped receipt minutes, not milliseconds, to find its row", () => {
    let total = 0;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) total += retryDelayMs(attempt);
    expect(total).toBeGreaterThan(4 * 60_000);
    expect(total).toBeLessThan(10 * 60_000);
  });
});
