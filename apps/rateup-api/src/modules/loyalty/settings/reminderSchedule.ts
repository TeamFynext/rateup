import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

import { LoyaltyEventType } from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * When a loyalty reminder is due.
 *
 * Pure date arithmetic, kept apart from the sweep in `reminderSweep.service.ts` so the
 * shape of the schedule can be reasoned about — and tested — without a database or a
 * mocked clock. Nothing here reads or writes anything.
 *
 * The reminders used to fire on four fixed daily jobs with no `tz`, which meant they went
 * out at the worker container's midnight: a Dubai venue's birthday message landed at 4am
 * local. The sweep now wakes every hour and asks each programme whether the hour it chose
 * has just struck where it actually is, which is what these helpers answer.
 */

/**
 * The hour a reminder goes out when the programme has not chosen one.
 *
 * Late morning, deliberately. A loyalty reminder is not urgent and a message that arrives
 * before the venue opens reads as spam; 10:00 local is inside the working day for every
 * business type the presets cover.
 */
export const DEFAULT_SEND_HOUR = 10;

/** The zone every calculation falls back to. Matches the rest of the codebase. */
export const FALLBACK_ZONE = "Etc/UTC";

/**
 * The local hour points are actually written off at.
 *
 * Expiry is a ledger write rather than a scheduled message, so it is not something a
 * merchant picks an hour for — but it still has to happen on the programme's own calendar
 * day, or the date a member was warned about slips by one. Early morning, before the venue
 * opens and before any reminder hour.
 */
export const POINTS_EXPIRY_LEDGER_HOUR = 1;

/** The occasions the reminder sweep owns — every loyalty event with a configurable *when*. */
export const SCHEDULED_EVENT_TYPES = [
  LoyaltyEventType.BIRTHDAY,
  LoyaltyEventType.SIGNUP_ANNIVERSARY,
  LoyaltyEventType.INACTIVITY_REMINDER,
  LoyaltyEventType.POINTS_EXPIRY_ALERT,
  LoyaltyEventType.POINTS_EXPIRED,
  LoyaltyEventType.TIER_AT_RISK,
  LoyaltyEventType.REWARD_EXPIRING,
] as const;

export type ScheduledEventType = (typeof SCHEDULED_EVENT_TYPES)[number];

export function isScheduledEventType(value: unknown): value is ScheduledEventType {
  return SCHEDULED_EVENT_TYPES.some((type) => type === value);
}

/**
 * How far ahead of a dated occasion each one sends when the programme has not said.
 *
 * The expiry-alert figure was hardcoded at 14 days in three places; it is a default now
 * rather than a constant. The occasions that land *on* a date rather than ahead of one get
 * zero, so a birthday greeting arrives on the birthday.
 */
export const DEFAULT_LEAD_DAYS: Record<ScheduledEventType, number> = {
  [LoyaltyEventType.BIRTHDAY]: 0,
  [LoyaltyEventType.SIGNUP_ANNIVERSARY]: 0,
  [LoyaltyEventType.INACTIVITY_REMINDER]: 0,
  [LoyaltyEventType.POINTS_EXPIRY_ALERT]: 14,
  [LoyaltyEventType.POINTS_EXPIRED]: 0,
  [LoyaltyEventType.TIER_AT_RISK]: 30,
  [LoyaltyEventType.REWARD_EXPIRING]: 3,
};

/** How long a member may be quiet before the inactivity nudge, absent a setting. */
export const DEFAULT_INACTIVITY_DAYS = 30;

/** `when` in `zone`, falling back to UTC for a zone we cannot load. */
export function inZone(when: Date, zone: string | null): dayjs.Dayjs {
  if (!zone) return dayjs(when).utc();
  try {
    const local = dayjs(when).tz(zone);
    // dayjs returns an invalid instance for some unusable zones rather than throwing.
    if (!local.isValid()) throw new Error("invalid");
    return local;
  } catch {
    // An unknown timezone must never stop a reminder going out.
    log.warn({ zone }, "Unknown timezone on loyalty programme — scheduling reminders in UTC");
    return dayjs(when).utc();
  }
}

/**
 * Whether a trigger's chosen local hour has just struck for its programme.
 *
 * The sweep runs on the hour, so this is an equality test on the hour rather than a range:
 * an occurrence missed while the worker was down is not made up, which is the right
 * behaviour here — a birthday greeting eight hours late is worse than none.
 */
export function isDueThisHour(
  program: { timezone: string | null },
  trigger: { sendHour: number | null },
  now: Date,
): boolean {
  const hour = normaliseSendHour(trigger.sendHour);
  return inZone(now, program.timezone).hour() === hour;
}

/** A stored hour, clamped to something sendable. */
export function normaliseSendHour(sendHour: number | null | undefined): number {
  if (sendHour === null || sendHour === undefined) return DEFAULT_SEND_HOUR;
  if (!Number.isInteger(sendHour) || sendHour < 0 || sendHour > 23) return DEFAULT_SEND_HOUR;
  return sendHour;
}

/** A stored lead time, falling back to the occasion's own default. */
export function leadDaysFor(
  eventType: ScheduledEventType,
  leadDays: number | null | undefined,
): number {
  if (leadDays === null || leadDays === undefined) return DEFAULT_LEAD_DAYS[eventType];
  if (!Number.isInteger(leadDays) || leadDays < 0) return DEFAULT_LEAD_DAYS[eventType];
  return leadDays;
}

/**
 * The programme's local calendar day for a sweep at `now` — the day whose month/day a
 * birthday or anniversary is matched against.
 */
export function localDay(
  program: { timezone: string | null },
  now: Date,
): { month: number; date: number; year: number; startOfDay: Date } {
  const local = inZone(now, program.timezone);
  return {
    // dayjs months are zero-based; Postgres `EXTRACT(MONTH …)` is not.
    month: local.month() + 1,
    date: local.date(),
    year: local.year(),
    startOfDay: local.startOf("day").toDate(),
  };
}

/**
 * The calendar day a lead-time reminder is looking at: `leadDays` ahead of the local today.
 * A reward expiring in three days is found by asking "what lapses on the day three days
 * from now", which keeps the comparison a date match rather than a range and so cannot
 * send twice for one occasion.
 */
export function targetDay(
  program: { timezone: string | null },
  now: Date,
  leadDays: number,
): { month: number; date: number; year: number; start: Date; end: Date } {
  const local = inZone(now, program.timezone).add(leadDays, "day");
  return {
    month: local.month() + 1,
    date: local.date(),
    year: local.year(),
    start: local.startOf("day").toDate(),
    end: local.endOf("day").toDate(),
  };
}
