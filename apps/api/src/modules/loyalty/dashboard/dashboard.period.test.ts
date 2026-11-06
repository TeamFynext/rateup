import { describe, expect, test } from "vitest";

import { bucketIndexForDay, periodKeyFromDays, resolvePeriod } from "./dashboard.period.js";

const NOW = new Date("2026-09-03T10:00:00Z");

describe("resolvePeriod", () => {
  test("30d ends at tomorrow's midnight and the previous window abuts it", () => {
    const p = resolvePeriod("30d", NOW, "UTC");

    expect(p.current.start.toISOString()).toBe("2026-08-05T00:00:00.000Z");
    expect(p.current.end.toISOString()).toBe("2026-09-04T00:00:00.000Z");
    expect(p.previous.start.toISOString()).toBe("2026-07-06T00:00:00.000Z");
    expect(p.previous.end).toEqual(p.current.start);
    expect(p.granularity).toBe("week");
    expect(p.label).toBe("Last 30 days");
    expect(p.comparisonLabel).toBe("vs 6 Jul – 4 Aug");
  });

  test("weekly buckets are anchored on the window start, the last one partial", () => {
    const p = resolvePeriod("30d", NOW, "UTC");

    expect(p.buckets).toHaveLength(5);
    expect(p.buckets[0]).toEqual({ start: new Date("2026-08-05T00:00:00Z"), label: "5 Aug" });
    expect(p.buckets[4].start.toISOString()).toBe("2026-09-02T00:00:00.000Z");
  });

  test("90d has thirteen weekly buckets", () => {
    expect(resolvePeriod("90d", NOW, "UTC").buckets).toHaveLength(13);
  });

  test("12m is month-aligned with twelve monthly buckets", () => {
    const p = resolvePeriod("12m", NOW, "UTC");

    expect(p.current.start.toISOString()).toBe("2025-10-01T00:00:00.000Z");
    expect(p.current.end.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(p.previous.start.toISOString()).toBe("2024-10-01T00:00:00.000Z");
    expect(p.granularity).toBe("month");
    expect(p.buckets).toHaveLength(12);
    expect(p.buckets[0].label).toBe("Oct 2025");
    expect(p.buckets[11].label).toBe("Sep 2026");
    expect(p.comparisonLabel).toBe("vs Oct 2024 – Sep 2025");
  });

  test("cuts the day in the caller's zone", () => {
    const p = resolvePeriod("30d", NOW, "Asia/Kolkata");

    // Midnight IST is 18:30 UTC the day before.
    expect(p.current.start.toISOString()).toBe("2026-08-04T18:30:00.000Z");
    expect(p.tz).toBe("Asia/Kolkata");
  });

  test("an unknown zone falls back to UTC rather than throwing", () => {
    const p = resolvePeriod("30d", NOW, "Mars/Olympus");

    expect(p.tz).toBe("UTC");
    expect(p.current.start.toISOString()).toBe("2026-08-05T00:00:00.000Z");
  });
});

describe("periodKeyFromDays", () => {
  test("maps legacy day counts onto the nearest period", () => {
    expect(periodKeyFromDays(undefined)).toBeUndefined();
    expect(periodKeyFromDays(7)).toBe("30d");
    expect(periodKeyFromDays(30)).toBe("30d");
    expect(periodKeyFromDays(90)).toBe("90d");
    expect(periodKeyFromDays(365)).toBe("12m");
  });
});

describe("bucketIndexForDay", () => {
  test("places a local day in its weekly bucket and rejects days outside the window", () => {
    const p = resolvePeriod("30d", NOW, "UTC");

    expect(bucketIndexForDay(p, "2026-08-05")).toBe(0);
    expect(bucketIndexForDay(p, "2026-08-11")).toBe(0);
    expect(bucketIndexForDay(p, "2026-08-12")).toBe(1);
    expect(bucketIndexForDay(p, "2026-09-03")).toBe(4);
    expect(bucketIndexForDay(p, "2026-08-04")).toBe(-1);
    expect(bucketIndexForDay(p, "2026-09-04")).toBe(-1);
    expect(bucketIndexForDay(p, "not-a-day")).toBe(-1);
  });

  test("places a local day in its monthly bucket", () => {
    const p = resolvePeriod("12m", NOW, "UTC");

    expect(bucketIndexForDay(p, "2025-10-15")).toBe(0);
    expect(bucketIndexForDay(p, "2026-09-30")).toBe(11);
    expect(bucketIndexForDay(p, "2025-09-30")).toBe(-1);
  });
});
