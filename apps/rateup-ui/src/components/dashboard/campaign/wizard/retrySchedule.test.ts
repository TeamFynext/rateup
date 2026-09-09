import { describe, expect, test } from "vitest";

import {
  addWakingMinutes,
  formatOffset,
  previewSchedule,
  quietHoursOf,
  SETTLE_MINUTES,
  smartOffsetMinutes,
} from "./retrySchedule.ts";

const DAY = 24 * 60;
const NIGHTS = quietHoursOf("22:00", "08:00", true);

describe("smartOffsetMinutes", () => {
  // These are the numbers rateup-api's campaignRetry.schedule.ts produces. The
  // timeline is only worth drawing if it is the schedule that will actually run,
  // so a divergence here is a divergence the customer sees.
  test("matches the engine for the wizard's defaults", () => {
    expect(smartOffsetMinutes(3, 3 * DAY)).toEqual([270, 1440, 4320]);
  });

  test("reproduces the 45m / 4h / 12h cadence the ladder is taken from", () => {
    expect(smartOffsetMinutes(3, 12 * 60)).toEqual([45, 240, 720]);
  });

  test("spends the whole window rather than finishing early in it", () => {
    const offsets = smartOffsetMinutes(3, 7 * DAY);
    expect(offsets[0]).toBe(Math.round((7 * DAY) / 16));
    expect(offsets[2]).toBe(7 * DAY);
  });

  test("puts a single attempt at the deadline", () => {
    expect(smartOffsetMinutes(1, 7 * DAY)).toEqual([7 * DAY]);
  });

  test("never previews an attempt before the settle delay", () => {
    expect(smartOffsetMinutes(3, 120)[0]).toBe(SETTLE_MINUTES);
  });

  test("holds every attempt at the settle delay when the window cannot be divided", () => {
    expect(smartOffsetMinutes(3, 20)).toEqual([45, 45, 45]);
  });
});

describe("quietHoursOf", () => {
  test("measures a window that wraps midnight", () => {
    expect(NIGHTS).toEqual({ start: 22 * 60, end: 8 * 60, wraps: true, length: 10 * 60 });
  });

  test("measures one that does not", () => {
    expect(quietHoursOf("12:00", "14:00", true)?.length).toBe(120);
  });

  test("is absent when off, half-open, empty or unparseable", () => {
    expect(quietHoursOf("22:00", "08:00", false)).toBeNull();
    expect(quietHoursOf("22:00", "", true)).toBeNull();
    expect(quietHoursOf("22:00", "22:00", true)).toBeNull();
    expect(quietHoursOf("nope", "08:00", true)).toBeNull();
  });
});

describe("addWakingMinutes", () => {
  test("is plain addition without quiet hours", () => {
    const at = addWakingMinutes(new Date(2026, 2, 1, 10, 0), 90, null);
    expect(at).toEqual(new Date(2026, 2, 1, 11, 30));
  });

  test("steps over a night rather than into it", () => {
    // 21:00 + 3 waking hours: one hour before 22:00, then two after 08:00.
    expect(addWakingMinutes(new Date(2026, 2, 1, 21, 0), 180, NIGHTS)).toEqual(
      new Date(2026, 2, 2, 10, 0),
    );
  });

  test("starts from the morning when the send itself is inside the night", () => {
    expect(addWakingMinutes(new Date(2026, 2, 1, 23, 0), 60, NIGHTS)).toEqual(
      new Date(2026, 2, 2, 9, 0),
    );
  });

  test("never lands inside the night", () => {
    const from = new Date(2026, 2, 1, 9, 0);
    for (const minutes of [60, 13 * 60, 20 * 60, 40 * 60, 3 * DAY]) {
      const hour = addWakingMinutes(from, minutes, NIGHTS).getHours();
      expect(hour).toBeGreaterThanOrEqual(8);
      expect(hour).toBeLessThan(22);
    }
  });
});

describe("previewSchedule", () => {
  test("reads as elapsed wall-clock time, which is what the label promises", () => {
    const from = new Date(2026, 2, 1, 10, 0);
    const attempts = previewSchedule(3, 3, null, from);
    expect(attempts.map((a) => a.elapsedMinutes)).toEqual([270, 1440, 4320]);
  });

  test("still ends on the deadline once quiet hours are taken out of the window", () => {
    // Quiet hours shrink the window to waking time, so a sixteenth of it is a
    // smaller slice and the first attempt comes sooner in wall-clock terms than
    // it would without them — but the last one still lands on the day the
    // customer chose, because that is what the window means.
    const from = new Date(2026, 2, 1, 10, 0);
    const withQuiet = previewSchedule(3, 3, NIGHTS, from);
    const without = previewSchedule(3, 3, null, from);
    expect(withQuiet[0].elapsedMinutes).toBe(158);
    expect(withQuiet[0].elapsedMinutes).toBeLessThan(without[0].elapsedMinutes);
    expect(withQuiet[2].elapsedMinutes).toBe(3 * DAY);
  });

  test("gives one attempt per configured attempt, whatever the window", () => {
    for (const attempts of [1, 2, 3]) {
      expect(previewSchedule(attempts, 7, NIGHTS).length).toBe(attempts);
    }
  });
});

describe("formatOffset", () => {
  test("reads in the unit a person plans around", () => {
    expect(formatOffset(45)).toBe("+45m");
    expect(formatOffset(441)).toBe("+7.4h");
    expect(formatOffset(12 * 60)).toBe("+12h");
    expect(formatOffset(3 * DAY)).toBe("+3d");
    expect(formatOffset(7 * DAY)).toBe("+7d");
  });

  test("never rounds a real wait down to nothing", () => {
    expect(formatOffset(0)).toBe("+1m");
  });
});
