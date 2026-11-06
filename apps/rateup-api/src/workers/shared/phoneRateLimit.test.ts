import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_WA_MESSAGES_PER_SECOND,
  acquirePhoneSendSlot,
  decideSlot,
  phoneRateKey,
  resolvePhoneRate,
} from "./phoneRateLimit.js";

describe("resolvePhoneRate", () => {
  it("falls back to the platform default when the column is unset", () => {
    expect(resolvePhoneRate(null)).toBe(DEFAULT_WA_MESSAGES_PER_SECOND);
    expect(resolvePhoneRate(undefined)).toBe(DEFAULT_WA_MESSAGES_PER_SECOND);
  });

  it("uses a positive override as-is", () => {
    expect(resolvePhoneRate(1000)).toBe(1000);
  });

  it("ignores a non-positive or non-numeric override rather than stalling the number", () => {
    expect(resolvePhoneRate(0)).toBe(DEFAULT_WA_MESSAGES_PER_SECOND);
    expect(resolvePhoneRate(-5)).toBe(DEFAULT_WA_MESSAGES_PER_SECOND);
    expect(resolvePhoneRate(Number.NaN)).toBe(DEFAULT_WA_MESSAGES_PER_SECOND);
  });
});

describe("decideSlot", () => {
  it("grants while the window's count is within the limit", () => {
    expect(decideSlot(1, 80, 1_000_000)).toEqual({ granted: true, retryAfterMs: 0 });
    expect(decideSlot(80, 80, 1_000_000)).toEqual({ granted: true, retryAfterMs: 0 });
  });

  it("denies past the limit and waits out the rest of the second", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    // 300ms into the second → 700ms until the next window.
    const decision = decideSlot(81, 80, 1_000_300);
    expect(decision.granted).toBe(false);
    expect(decision.retryAfterMs).toBe(700);
    vi.restoreAllMocks();
  });

  it("adds up to 100ms of jitter so delayed jobs do not wake together", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    const decision = decideSlot(81, 80, 1_000_300);
    expect(decision.retryAfterMs).toBe(799);
    vi.restoreAllMocks();
  });
});

describe("phoneRateKey", () => {
  it("buckets by whole second", () => {
    expect(phoneRateKey("123", 1_000_999)).toBe("waRate:123:1000");
    expect(phoneRateKey("123", 1_001_000)).toBe("waRate:123:1001");
  });
});

describe("acquirePhoneSendSlot", () => {
  it("increments the window key and grants under the limit", async () => {
    const redis = { eval: vi.fn().mockResolvedValue(5) };
    const decision = await acquirePhoneSendSlot(redis as never, "p1", 80, 42_000);
    expect(decision.granted).toBe(true);
    expect(redis.eval).toHaveBeenCalledWith(expect.any(String), 1, "waRate:p1:42", 2);
  });

  it("denies once the count passes the limit", async () => {
    const redis = { eval: vi.fn().mockResolvedValue(81) };
    const decision = await acquirePhoneSendSlot(redis as never, "p1", 80, 42_000);
    expect(decision.granted).toBe(false);
    expect(decision.retryAfterMs).toBeGreaterThan(0);
  });

  it("fails open when Redis is unavailable", async () => {
    const redis = { eval: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) };
    const decision = await acquirePhoneSendSlot(redis as never, "p1", 80);
    expect(decision).toEqual({ granted: true, retryAfterMs: 0 });
  });
});
