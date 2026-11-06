import { describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), trace: vi.fn() },
}));

import { LoyaltyEventType } from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";
import {
  DEFAULT_LEAD_DAYS,
  DEFAULT_SEND_HOUR,
  inZone,
  isDueThisHour,
  isScheduledEventType,
  leadDaysFor,
  localDay,
  normaliseSendHour,
  SCHEDULED_EVENT_TYPES,
  targetDay,
} from "./reminderSchedule.js";

/** 2026-06-15T06:00:00Z — 10:00 in Dubai (UTC+4), 06:00 in UTC. */
const JUNE_15_0600Z = new Date("2026-06-15T06:00:00.000Z");

describe("isDueThisHour", () => {
  // The whole point of the rewrite: a venue's reminders go out at its own local hour, not
  // the worker container's. Dubai is UTC+4 and does not observe DST.
  test("a Dubai programme sending at 10:00 is due at 06:00 UTC, not 10:00 UTC", () => {
    const program = { timezone: "Asia/Dubai" };
    expect(isDueThisHour(program, { sendHour: 10 }, JUNE_15_0600Z)).toBe(true);
    expect(isDueThisHour(program, { sendHour: 10 }, new Date("2026-06-15T10:00:00.000Z"))).toBe(
      false,
    );
  });

  test("a UTC programme sending at 10:00 is due at 10:00 UTC", () => {
    const program = { timezone: "Etc/UTC" };
    expect(isDueThisHour(program, { sendHour: 10 }, new Date("2026-06-15T10:00:00.000Z"))).toBe(
      true,
    );
    expect(isDueThisHour(program, { sendHour: 10 }, JUNE_15_0600Z)).toBe(false);
  });

  test("a programme west of UTC crosses the date line correctly", () => {
    // 2026-06-15T02:00Z is 2026-06-14 22:00 in New York (EDT, UTC-4).
    const program = { timezone: "America/New_York" };
    expect(isDueThisHour(program, { sendHour: 22 }, new Date("2026-06-15T02:00:00.000Z"))).toBe(
      true,
    );
  });

  test("no send hour set falls back to the default", () => {
    const program = { timezone: "Etc/UTC" };
    const atDefault = new Date(`2026-06-15T${String(DEFAULT_SEND_HOUR).padStart(2, "0")}:00:00Z`);
    expect(isDueThisHour(program, { sendHour: null }, atDefault)).toBe(true);
  });

  // A programme that never finished the onboarding profile step has no timezone.
  test("a null timezone is treated as UTC and does not throw", () => {
    expect(isDueThisHour({ timezone: null }, { sendHour: 6 }, JUNE_15_0600Z)).toBe(true);
  });

  test("an unknown timezone warns and falls back to UTC rather than blocking the send", () => {
    vi.mocked(log.warn).mockClear();
    expect(isDueThisHour({ timezone: "Mars/Olympus_Mons" }, { sendHour: 6 }, JUNE_15_0600Z)).toBe(
      true,
    );
    expect(log.warn).toHaveBeenCalled();
  });
});

describe("inZone across a DST boundary", () => {
  // London goes forward on 2026-03-29 at 01:00 UTC. A zone-naive calculation drifts by an
  // hour either side of that, which is how a 10:00 reminder becomes a 09:00 one.
  test("London is UTC+1 in summer and UTC+0 in winter", () => {
    expect(inZone(new Date("2026-07-01T09:00:00.000Z"), "Europe/London").hour()).toBe(10);
    expect(inZone(new Date("2026-01-01T10:00:00.000Z"), "Europe/London").hour()).toBe(10);
  });

  test("a programme sending at 10:00 London is due at both offsets", () => {
    const program = { timezone: "Europe/London" };
    expect(isDueThisHour(program, { sendHour: 10 }, new Date("2026-07-01T09:00:00.000Z"))).toBe(
      true,
    );
    expect(isDueThisHour(program, { sendHour: 10 }, new Date("2026-01-01T10:00:00.000Z"))).toBe(
      true,
    );
  });
});

describe("normaliseSendHour", () => {
  test("keeps a sendable hour", () => {
    expect(normaliseSendHour(0)).toBe(0);
    expect(normaliseSendHour(23)).toBe(23);
  });

  test("falls back for anything unsendable", () => {
    for (const bad of [null, undefined, -1, 24, 99, 10.5]) {
      expect(normaliseSendHour(bad)).toBe(DEFAULT_SEND_HOUR);
    }
  });
});

describe("leadDaysFor", () => {
  // The 14-day expiry lead used to be hardcoded in three places. It is a default now.
  test("the stored lead wins over the occasion default", () => {
    expect(leadDaysFor(LoyaltyEventType.POINTS_EXPIRY_ALERT, 30)).toBe(30);
    expect(leadDaysFor(LoyaltyEventType.POINTS_EXPIRY_ALERT, null)).toBe(14);
  });

  test("zero is a real answer, not a missing one", () => {
    expect(leadDaysFor(LoyaltyEventType.REWARD_EXPIRING, 0)).toBe(0);
  });

  test("nonsense falls back to the occasion default", () => {
    expect(leadDaysFor(LoyaltyEventType.TIER_AT_RISK, -5)).toBe(DEFAULT_LEAD_DAYS.TIER_AT_RISK);
    expect(leadDaysFor(LoyaltyEventType.TIER_AT_RISK, 1.5)).toBe(DEFAULT_LEAD_DAYS.TIER_AT_RISK);
  });

  test("occasions that land on a date lead by nothing", () => {
    expect(leadDaysFor(LoyaltyEventType.BIRTHDAY, null)).toBe(0);
    expect(leadDaysFor(LoyaltyEventType.SIGNUP_ANNIVERSARY, null)).toBe(0);
  });
});

describe("localDay", () => {
  test("months come back one-based, to match Postgres EXTRACT", () => {
    expect(localDay({ timezone: "Etc/UTC" }, JUNE_15_0600Z)).toMatchObject({
      month: 6,
      date: 15,
      year: 2026,
    });
  });

  test("the local date can differ from the UTC date", () => {
    // 22:00 on the 14th in New York is the 15th in UTC.
    expect(
      localDay({ timezone: "America/New_York" }, new Date("2026-06-15T02:00:00Z")),
    ).toMatchObject({ month: 6, date: 14 });
  });
});

describe("targetDay", () => {
  test("looks the lead time ahead, and wraps the month", () => {
    expect(targetDay({ timezone: "Etc/UTC" }, new Date("2026-06-28T10:00:00Z"), 5)).toMatchObject({
      month: 7,
      date: 3,
    });
  });

  test("a zero lead is today", () => {
    expect(targetDay({ timezone: "Etc/UTC" }, JUNE_15_0600Z, 0)).toMatchObject({
      month: 6,
      date: 15,
    });
  });

  test("start and end bracket the local day", () => {
    const day = targetDay({ timezone: "Etc/UTC" }, JUNE_15_0600Z, 0);
    expect(day.start.toISOString()).toBe("2026-06-15T00:00:00.000Z");
    expect(day.end.getTime()).toBeGreaterThan(day.start.getTime());
    expect(day.end.getTime() - day.start.getTime()).toBeLessThan(24 * 60 * 60 * 1000);
  });
});

describe("the scheduled occasions", () => {
  test("seven occasions, each with a lead-time default", () => {
    expect(SCHEDULED_EVENT_TYPES).toHaveLength(7);
    for (const type of SCHEDULED_EVENT_TYPES) {
      expect(DEFAULT_LEAD_DAYS[type]).toBeGreaterThanOrEqual(0);
    }
  });

  // TIER_UPGRADED fires when a tier actually changes, so it has no *when* to configure and
  // belongs with the transaction notifications rather than on the Reminders page.
  test("a tier upgrade is not a scheduled occasion", () => {
    expect(isScheduledEventType(LoyaltyEventType.TIER_UPGRADED)).toBe(false);
    expect(isScheduledEventType(LoyaltyEventType.POINTS_ISSUED)).toBe(false);
    expect(isScheduledEventType(LoyaltyEventType.BIRTHDAY)).toBe(true);
    expect(isScheduledEventType("NOT_AN_EVENT")).toBe(false);
  });
});
