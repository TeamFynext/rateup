import { describe, expect, test, vi } from "vitest";

vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), trace: vi.fn() },
}));

import {
  addWakingMinutes,
  nextAttemptAt,
  quietHoursOf,
  shiftOutOfQuietHours,
  smartOffsetMinutes,
  wakingMinutesBetween,
} from "./campaignRetry.schedule.js";
import type { CampaignRetryStrategy } from "../../../generated/prisma/enums.js";

/** A policy with everything off except the switch, so each test names its own knobs. */
function policy(overrides: Record<string, unknown> = {}) {
  return {
    enabled: true,
    strategy: "SMART" as CampaignRetryStrategy,
    maxAttempts: 3,
    intervalHours: 24,
    windowEndsAt: null,
    quietHoursStart: null,
    quietHoursEnd: null,
    timezone: "Etc/UTC",
    ...overrides,
  };
}

const NIGHTS = { quietHoursStart: "22:00", quietHoursEnd: "08:00" };
const DAY = 24 * 60;

describe("smartOffsetMinutes", () => {
  test("reproduces the 45m / 4h / 12h cadence on a 12-hour window", () => {
    // The shape the ladder is taken from: 45m is a sixteenth of twelve hours and
    // 4h is a third of it, so the reference window returns the cadence exactly.
    expect(smartOffsetMinutes(3, 12 * 60)).toEqual([45, 240, 720]);
  });

  test("stretches the same proportions across a longer window", () => {
    // 3 days: a sixteenth is 4h30m and a third is 24h. The shape is unchanged —
    // only its scale — which is what separates this from the geometric division
    // it replaced, where three days came out 45m / 7h21m / 3d.
    expect(smartOffsetMinutes(3, 3 * DAY)).toEqual([270, 1440, 4320]);
  });

  test("spends a longer window instead of finishing early in it", () => {
    // 7 days of window is 7 days of retrying, not twelve hours of retrying and
    // six days of nothing.
    const [first, , last] = smartOffsetMinutes(3, 7 * DAY);
    expect(first).toBe(Math.round((7 * DAY) / 16));
    expect(last).toBe(7 * DAY);
  });

  test("spends a single attempt at the deadline", () => {
    // One attempt is one chance. The window end is the moment a frequency cap is
    // likeliest to have lifted, and a window the customer chose is one to use.
    expect(smartOffsetMinutes(1, 7 * DAY)).toEqual([7 * DAY]);
  });

  test("drops the middle rung for two attempts, keeping both ends", () => {
    expect(smartOffsetMinutes(2, 12 * 60)).toEqual([45, 720]);
    expect(smartOffsetMinutes(2, 3 * DAY)).toEqual([270, 4320]);
  });

  test("never places an attempt before the settle delay", () => {
    // A sixteenth of a two-hour window is seven minutes, and at seven minutes the
    // messages this would retry are still SENT — there is nothing to re-attempt.
    expect(smartOffsetMinutes(3, 120)[0]).toBe(45);
  });

  test("holds every attempt at the settle delay when the window is shorter than it", () => {
    // Nothing to divide. The per-drain floor in nextAttemptAt is what keeps these
    // apart; scheduling them all at once here would be arithmetic, not a schedule.
    expect(smartOffsetMinutes(3, 20)).toEqual([45, 45, 45]);
  });

  test("lands the last attempt inside the window, never a rounding past it", () => {
    // A final offset rounded up puts the attempt past the customer's deadline,
    // and scheduleNextRetry drops an attempt outside the window — so the one the
    // whole shape is built around would never fire.
    for (const minutes of [1234, 4321, 10079, 10081]) {
      const offsets = smartOffsetMinutes(3, minutes);
      expect(offsets[offsets.length - 1]).toBeLessThanOrEqual(minutes);
    }
  });
});

describe("waking time", () => {
  const quiet = quietHoursOf(policy(NIGHTS));

  test("counts a full day as its waking hours only", () => {
    const from = new Date("2026-03-01T08:00:00Z");
    const to = new Date("2026-03-02T08:00:00Z");
    expect(wakingMinutesBetween(from, to, quiet)).toBe(14 * 60);
  });

  test("counts wall-clock time when there are no quiet hours", () => {
    const from = new Date("2026-03-01T08:00:00Z");
    const to = new Date("2026-03-02T08:00:00Z");
    expect(wakingMinutesBetween(from, to, null)).toBe(DAY);
  });

  test("ignores the quiet part of a span that starts inside one", () => {
    // 23:00 is quiet, so the span really begins at 08:00 the next morning.
    const from = new Date("2026-03-01T23:00:00Z");
    const to = new Date("2026-03-02T10:00:00Z");
    expect(wakingMinutesBetween(from, to, quiet)).toBe(2 * 60);
  });

  test("advances over a night rather than into it", () => {
    // 21:00 + 3 waking hours: one hour before 22:00, then two after 08:00.
    const at = addWakingMinutes(new Date("2026-03-01T21:00:00Z"), 3 * 60, quiet);
    expect(at.toISOString()).toBe("2026-03-02T10:00:00.000Z");
  });

  test("never lands inside quiet hours", () => {
    // Which is what stops two offsets from both being bumped onto the same 08:00.
    const from = new Date("2026-03-01T09:00:00Z");
    for (const minutes of [60, 12 * 60, 13 * 60, 20 * 60, 40 * 60]) {
      const at = addWakingMinutes(from, minutes, quiet);
      expect(shiftOutOfQuietHours(at, policy(NIGHTS))).toEqual(at);
    }
  });

  test("round-trips: adding n waking minutes puts n waking minutes behind you", () => {
    const from = new Date("2026-03-01T09:00:00Z");
    for (const minutes of [30, 600, 1500, 5000]) {
      expect(wakingMinutesBetween(from, addWakingMinutes(from, minutes, quiet), quiet)).toBe(
        minutes,
      );
    }
  });

  test("measures the day in the policy's own zone, not the server's", () => {
    const kolkata = quietHoursOf(policy({ ...NIGHTS, timezone: "Asia/Kolkata" }));
    // 14:00 UTC is 19:30 in Kolkata — still awake there, so an hour is an hour.
    expect(addWakingMinutes(new Date("2026-03-01T14:00:00Z"), 60, kolkata).toISOString()).toBe(
      "2026-03-01T15:00:00.000Z",
    );
    // 18:00 UTC is 23:30 in Kolkata — the middle of the night, though it would be
    // broad daylight under the same clock read as UTC. The hour is spent after
    // the local 08:00, which is 02:30 UTC.
    expect(addWakingMinutes(new Date("2026-03-01T18:00:00Z"), 60, kolkata).toISOString()).toBe(
      "2026-03-02T03:30:00.000Z",
    );
  });
});

describe("nextAttemptAt", () => {
  const ANCHOR = new Date("2026-03-01T10:00:00Z");
  const threeDays = policy({ windowEndsAt: new Date("2026-03-04T10:00:00Z") });

  test("lays the ladder's proportions across the window and ends on it", () => {
    // A sixteenth, then a third, then the deadline — 4h30m, 24h, 3d.
    expect(nextAttemptAt(threeDays, 1, ANCHOR).toISOString()).toBe("2026-03-01T14:30:00.000Z");
    expect(nextAttemptAt(threeDays, 2, ANCHOR).toISOString()).toBe("2026-03-02T10:00:00.000Z");
    expect(nextAttemptAt(threeDays, 3, ANCHOR).toISOString()).toBe("2026-03-04T10:00:00.000Z");
  });

  test("reads as the familiar cadence on a twelve-hour window", () => {
    const halfDay = policy({ windowEndsAt: new Date("2026-03-01T22:00:00Z") });
    expect(nextAttemptAt(halfDay, 1, ANCHOR).toISOString()).toBe("2026-03-01T10:45:00.000Z");
    expect(nextAttemptAt(halfDay, 2, ANCHOR).toISOString()).toBe("2026-03-01T14:00:00.000Z");
    expect(nextAttemptAt(halfDay, 3, ANCHOR).toISOString()).toBe("2026-03-01T22:00:00.000Z");
  });

  test("stretches with the window rather than ignoring it", () => {
    const sevenDays = policy({ windowEndsAt: new Date("2026-03-08T10:00:00Z") });
    expect(nextAttemptAt(sevenDays, 3, ANCHOR).toISOString()).toBe("2026-03-08T10:00:00.000Z");
    // The first attempt moves out with the window rather than staying pinned to
    // 45 minutes: a sixteenth of seven days is 10h30m. This is what "proportional"
    // costs, and it is the point — the shape is the same at every scale.
    expect(nextAttemptAt(sevenDays, 1, ANCHOR).toISOString()).toBe("2026-03-01T20:30:00.000Z");
  });

  test("re-divides when the campaign is given fewer attempts", () => {
    const two = policy({ maxAttempts: 2, windowEndsAt: new Date("2026-03-04T10:00:00Z") });
    expect(nextAttemptAt(two, 2, ANCHOR).toISOString()).toBe("2026-03-04T10:00:00.000Z");
  });

  test("divides the window's waking hours, and lands outside quiet hours", () => {
    const nightly = policy({ ...NIGHTS, windowEndsAt: new Date("2026-03-04T10:00:00Z") });
    for (const attemptNo of [1, 2, 3]) {
      const at = nextAttemptAt(nightly, attemptNo, ANCHOR);
      expect(shiftOutOfQuietHours(at, nightly)).toEqual(at);
    }
  });

  test("holds the schedule back when the previous attempt drained late", () => {
    // On a 12-hour window attempt 2's absolute slot is 14:00, but attempt 1 only
    // drained at 15:00, so its statuses have not landed. The settle delay wins and
    // the schedule moves with it instead of stacking on top of it.
    const halfDay = policy({ windowEndsAt: new Date("2026-03-01T22:00:00Z") });
    const drained = new Date("2026-03-01T15:00:00Z");
    expect(nextAttemptAt(halfDay, 2, ANCHOR, drained).toISOString()).toBe(
      "2026-03-01T15:45:00.000Z",
    );
  });

  test("falls back to the default window when the policy has none", () => {
    // Only reachable through the API — the wizard always sends one — so it lands
    // on the same schedule as a wizard default rather than a second hardcoded one.
    expect(nextAttemptAt(policy(), 3, ANCHOR).toISOString()).toBe("2026-03-04T10:00:00.000Z");
  });

  test("holds at the last offset past the end of the table", () => {
    // Only reachable if an attempt outruns maxAttempts. Firing immediately would
    // be the wrong failure mode.
    expect(nextAttemptAt(threeDays, 9, ANCHOR).toISOString()).toBe("2026-03-04T10:00:00.000Z");
  });

  test("spaces fixed-interval attempts uniformly, from the last drain", () => {
    const fixed = policy({
      strategy: "FIXED_INTERVAL" as CampaignRetryStrategy,
      intervalHours: 24,
    });
    expect(nextAttemptAt(fixed, 1, ANCHOR).toISOString()).toBe("2026-03-02T10:00:00.000Z");
    expect(nextAttemptAt(fixed, 3, ANCHOR).toISOString()).toBe("2026-03-02T10:00:00.000Z");
  });

  test("never lets a zero or negative interval collapse to no wait", () => {
    const broken = policy({
      strategy: "FIXED_INTERVAL" as CampaignRetryStrategy,
      intervalHours: 0,
    });
    expect(nextAttemptAt(broken, 1, ANCHOR).getTime()).toBeGreaterThan(ANCHOR.getTime());
  });
});

describe("shiftOutOfQuietHours", () => {
  test("leaves a time outside the window alone", () => {
    const when = new Date("2026-03-01T12:00:00Z");
    expect(shiftOutOfQuietHours(when, policy(NIGHTS))).toEqual(when);
  });

  test("moves the evening head of a wrapping window to the next morning", () => {
    const shifted = shiftOutOfQuietHours(new Date("2026-03-01T23:30:00Z"), policy(NIGHTS));
    expect(shifted.toISOString()).toBe("2026-03-02T08:00:00.000Z");
  });

  test("moves the pre-dawn tail of a wrapping window to the same morning", () => {
    const shifted = shiftOutOfQuietHours(new Date("2026-03-02T03:00:00Z"), policy(NIGHTS));
    expect(shifted.toISOString()).toBe("2026-03-02T08:00:00.000Z");
  });

  test("handles a window that does not wrap midnight", () => {
    const shifted = shiftOutOfQuietHours(
      new Date("2026-03-01T13:00:00Z"),
      policy({ quietHoursStart: "12:00", quietHoursEnd: "14:00" }),
    );
    expect(shifted.toISOString()).toBe("2026-03-01T14:00:00.000Z");
  });

  test("respects the policy's own timezone, not the server's", () => {
    // 23:30 UTC is 05:00 next day in Kolkata — inside 22:00-08:00 local, and the
    // shift has to land on the local 08:00, i.e. 02:30 UTC.
    const shifted = shiftOutOfQuietHours(
      new Date("2026-03-01T23:30:00Z"),
      policy({ ...NIGHTS, timezone: "Asia/Kolkata" }),
    );
    expect(shifted.toISOString()).toBe("2026-03-02T02:30:00.000Z");
  });

  test("only ever delays — an unparseable or empty window is a no-op", () => {
    const when = new Date("2026-03-01T23:30:00Z");
    expect(shiftOutOfQuietHours(when, policy({ quietHoursStart: "22:00" }))).toEqual(when);
    expect(
      shiftOutOfQuietHours(when, policy({ quietHoursStart: "nope", quietHoursEnd: "08:00" })),
    ).toEqual(when);
    expect(
      shiftOutOfQuietHours(when, policy({ quietHoursStart: "22:00", quietHoursEnd: "22:00" })),
    ).toEqual(when);
  });
});
