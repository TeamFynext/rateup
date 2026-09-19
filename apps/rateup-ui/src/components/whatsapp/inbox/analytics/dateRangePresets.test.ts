import dayjs from "dayjs";
import { describe, expect, it } from "vitest";

import { presetRange } from "./dateRangePresets";

/** A Wednesday afternoon, in whatever zone the tests run in. */
const NOW = dayjs("2026-09-16T15:42:10.500");

const local = (date: Date) => dayjs(date).format("YYYY-MM-DD HH:mm:ss.SSS");

describe("presetRange", () => {
  it("makes 'today' the whole of today", () => {
    expect(presetRange("today", NOW).map(local)).toEqual([
      "2026-09-16 00:00:00.000",
      "2026-09-16 23:59:59.999",
    ]);
  });

  it("makes 'yesterday' the whole of yesterday", () => {
    expect(presetRange("yesterday", NOW).map(local)).toEqual([
      "2026-09-15 00:00:00.000",
      "2026-09-15 23:59:59.999",
    ]);
  });

  it("makes 'last 7 days' today and the six days before it", () => {
    expect(presetRange("last7days", NOW).map(local)).toEqual([
      "2026-09-10 00:00:00.000",
      "2026-09-16 23:59:59.999",
    ]);
  });

  it("makes 'last 30 days' today and the twenty-nine days before it", () => {
    expect(presetRange("last30days", NOW).map(local)).toEqual([
      "2026-08-18 00:00:00.000",
      "2026-09-16 23:59:59.999",
    ]);
  });

  it("opens a custom range on the last sixty days", () => {
    expect(presetRange("custom-range", NOW).map(local)).toEqual([
      "2026-07-19 00:00:00.000",
      "2026-09-16 23:59:59.999",
    ]);
  });

  it("gives the same range all day, so the same preset is the same cache entry", () => {
    const morning = presetRange("last7days", dayjs("2026-09-16T00:00:01"));
    const night = presetRange("last7days", dayjs("2026-09-16T23:59:58"));

    expect(morning.map(local)).toEqual(night.map(local));
  });

  it("moves on at midnight", () => {
    const before = presetRange("today", dayjs("2026-09-16T23:59:59"));
    const after = presetRange("today", dayjs("2026-09-17T00:00:00"));

    expect(local(after[0]!)).not.toBe(local(before[0]!));
  });

  it("always gives both ends, in order", () => {
    for (const key of ["today", "yesterday", "last7days", "last30days", "custom-range"]) {
      const range = presetRange(key, NOW);

      expect(range).toHaveLength(2);
      expect(range[0]!.getTime()).toBeLessThan(range[1]!.getTime());
    }
  });

  it("gives nothing for a preset it does not know", () => {
    expect(presetRange("last-quarter", NOW)).toEqual([]);
  });
});
