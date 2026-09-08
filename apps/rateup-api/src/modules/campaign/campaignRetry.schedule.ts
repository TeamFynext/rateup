import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

import { log } from "../../utils/logger.js";
import { CampaignRetryStrategy } from "../../../generated/prisma/enums.js";
import type { CampaignRetryPolicy } from "../../../generated/prisma/client.js";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * When each automatic attempt fires.
 *
 * Pure date arithmetic, kept apart from the engine in `campaignRetry.service.ts`
 * so the shape of the schedule can be reasoned about — and tested — without a
 * database. Nothing here reads or writes anything.
 *
 * A SMART schedule is not a fixed table. It divides the campaign's own retry
 * window across the attempts the campaign was given, so a 7-day window is
 * actually seven days of retrying rather than twelve hours followed by six days
 * of nothing, and dropping to one attempt spends it at the end of the window
 * rather than 45 minutes in.
 */

/**
 * The earliest a retry may fire after the send it reacts to drained.
 *
 * This is a *settle delay*, and it is mandatory. When the queue drains, messages
 * Meta accepted are still `SENT` — they only flip to `FAILED` when the status
 * webhook lands. Building a cohort at drain time + 0 would find almost nothing to
 * retry and burn the attempt. 45 minutes is comfortably longer than a Cloud API
 * status webhook takes (seconds, to a few minutes when Meta is backed up), and is
 * what the product surfaces to the customer on the Retries step.
 *
 * It doubles as the minimum gap between attempts: two offsets that quiet hours
 * would otherwise land on the same 08:00 are held apart by it.
 */
export const SMART_SETTLE_MINUTES = 45;

/** Nothing may be scheduled sooner than this after a send drains. */
export const MINIMUM_SETTLE_MINUTES = 2;

/** A retry window may not extend further than this past the initial send. */
export const MAX_RETRY_WINDOW_DAYS = 7;

/**
 * The window a SMART policy divides when it was saved without one.
 *
 * The wizard always sends `windowEndsAt`, so this only covers policies written
 * straight through the API. Matching the wizard's own default keeps those on the
 * same schedule as everyone else, rather than on a second hardcoded one.
 */
export const DEFAULT_RETRY_WINDOW_DAYS = 3;

/** How far the day-walkers will go before giving up, in local days. */
const MAX_WALK_DAYS = MAX_RETRY_WINDOW_DAYS * 2 + 2;

/** A policy's quiet hours, resolved to minutes past local midnight. */
interface QuietHours {
  start: number;
  end: number;
  zone: string;
  /** 22:00–08:00 crosses midnight; 01:00–05:00 does not. */
  wraps: boolean;
}

type QuietHoursFields = Pick<CampaignRetryPolicy, "quietHoursStart" | "quietHoursEnd" | "timezone">;

type SmartFields = QuietHoursFields & Pick<CampaignRetryPolicy, "maxAttempts" | "windowEndsAt">;

/** `"HH:mm"` as minutes past local midnight, or null if unparseable. */
function parseClock(value: string | null): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** The policy's quiet hours, or null when it has none worth honouring. */
export function quietHoursOf(policy: QuietHoursFields): QuietHours | null {
  const start = parseClock(policy.quietHoursStart);
  const end = parseClock(policy.quietHoursEnd);
  // A half-open or empty window silently never applies; treat it as absent
  // rather than as a 24-hour blackout that would strand every retry.
  if (start === null || end === null || start === end) return null;
  return { start, end, zone: policy.timezone || "Etc/UTC", wraps: start > end };
}

/** `when` in the policy's zone, falling back to UTC for a zone we cannot load. */
function inZone(when: Date, zone: string): dayjs.Dayjs {
  try {
    return dayjs(when).tz(zone);
  } catch {
    // An unknown timezone must not stop a retry; UTC is the schema default.
    log.warn({ zone }, "Unknown timezone on retry policy — treating quiet hours as UTC");
    return dayjs(when).utc();
  }
}

/**
 * The stretches of one local day that are not quiet hours, as minute-of-day pairs.
 *
 * A wrapping window leaves one waking stretch in the middle of the day; a
 * non-wrapping one leaves the two ends.
 */
function wakingSpansOfDay(quiet: QuietHours | null): [number, number][] {
  if (!quiet) return [[0, 1440]];
  return quiet.wraps
    ? [[quiet.end, quiet.start]]
    : [
        [0, quiet.start],
        [quiet.end, 1440],
      ];
}

/**
 * Walk the waking stretches from `from` forward, local day by local day.
 *
 * Both callers below need the same walk and differ only in what they do with
 * each stretch, so it is one generator rather than two near-copies of the
 * day/DST handling. `.startOf("day")` in the policy's own zone is what keeps a
 * spring-forward day 23 hours long instead of silently 24.
 */
function* wakingSpans(from: Date, quiet: QuietHours | null): Generator<{ start: Date; end: Date }> {
  const zone = quiet?.zone ?? "Etc/UTC";
  let day = inZone(from, zone).startOf("day");
  const spans = wakingSpansOfDay(quiet);

  for (let walked = 0; walked <= MAX_WALK_DAYS; walked++) {
    for (const [openMinute, closeMinute] of spans) {
      const open = day.add(openMinute, "minute").toDate();
      const close = day.add(closeMinute, "minute").toDate();
      if (close <= from) continue;
      yield { start: open < from ? from : open, end: close };
    }
    day = day.add(1, "day").startOf("day");
  }
}

/**
 * Wall-clock minutes between `from` and `to` that are not quiet hours.
 *
 * This is the length a SMART schedule divides. Measuring the window in waking
 * time rather than wall-clock time is what stops a 22:00–08:00 quiet window from
 * quietly handing 10 of every 24 hours to a stretch of the schedule that can
 * never fire in it.
 */
export function wakingMinutesBetween(from: Date, to: Date, quiet: QuietHours | null): number {
  if (to <= from) return 0;
  if (!quiet) return (to.getTime() - from.getTime()) / 60_000;

  let total = 0;
  for (const span of wakingSpans(from, quiet)) {
    if (span.start >= to) break;
    const end = span.end < to ? span.end : to;
    if (end > span.start) total += (end.getTime() - span.start.getTime()) / 60_000;
  }
  return total;
}

/**
 * `from` advanced by `minutes` of waking time.
 *
 * The result is never inside quiet hours, which is the whole point: the offsets
 * are laid out in waking time and land already shifted, instead of being laid out
 * in wall-clock time and then bumped afterwards.
 */
export function addWakingMinutes(from: Date, minutes: number, quiet: QuietHours | null): Date {
  const wanted = Math.max(minutes, 0);
  if (!quiet) return new Date(from.getTime() + wanted * 60_000);

  let left = wanted;
  for (const span of wakingSpans(from, quiet)) {
    const length = (span.end.getTime() - span.start.getTime()) / 60_000;
    // `<`, not `<=`: a span's end is the first quiet minute, so landing exactly on
    // it means landing at the start of the next waking stretch instead. The two
    // are the same number of waking minutes away — only one of them can fire.
    if (left < length) return new Date(span.start.getTime() + left * 60_000);
    left -= length;
  }
  // Only reachable past MAX_WALK_DAYS, which the window clamp rules out. Falling
  // back to wall-clock is wrong but bounded; refusing to return a date is worse.
  return new Date(from.getTime() + wanted * 60_000);
}

/**
 * The waking-time offsets a SMART policy produces, one per attempt.
 *
 * Geometric from the settle delay to the end of the window: the first attempt
 * sits at 45 minutes because most frequency-cap rejections clear within the
 * first hour, the last sits at the customer's own deadline because a window they
 * chose should be a window we use, and the ones between decay smoothly rather
 * than clustering at either end. Trying at +5m and +10m would just spend three
 * attempts discovering the same cap.
 *
 * With a 3-day window and 3 attempts that reads 45m → 7h21m → 3d; with one
 * attempt it is a single try at the settle delay.
 */
export function smartOffsetMinutes(maxAttempts: number, wakingWindowMinutes: number): number[] {
  const attempts = Math.max(Math.trunc(maxAttempts), 1);
  const settle = SMART_SETTLE_MINUTES;
  // A window shorter than the settle delay cannot be divided into anything; every
  // attempt sits at the earliest honest time and the per-drain floor spaces them.
  if (!Number.isFinite(wakingWindowMinutes) || wakingWindowMinutes <= settle) {
    return Array.from({ length: attempts }, () => settle);
  }
  if (attempts === 1) return [settle];

  const ratio = (wakingWindowMinutes / settle) ** (1 / (attempts - 1));
  const offsets = Array.from({ length: attempts }, (_, index) =>
    Math.round(settle * ratio ** index),
  );
  // The last offset is the window end, to the minute. Rounding it up instead
  // would put the final attempt a few seconds past the customer's own deadline,
  // and `scheduleNextRetry` drops an attempt that lands outside the window — so
  // the one attempt the whole shape is built around would never fire.
  offsets[attempts - 1] = Math.floor(wakingWindowMinutes);
  return offsets;
}

/**
 * When attempt `attemptNo` should fire.
 *
 * `attemptNo` is the number of the attempt being scheduled: 1 is the first
 * automatic retry, so it takes the first offset.
 *
 * `anchor` is when the cycle's initial send drained — the point the window is
 * measured from — and `drainedAt` is when the send we are reacting to drained.
 * They are the same date for the first retry and diverge after it. A SMART
 * attempt is placed at its absolute offset from the anchor but never sooner than
 * the settle delay past the drain, so a slow attempt pushes the rest of the
 * schedule back instead of stacking on top of it.
 */
export function nextAttemptAt(
  policy: Pick<CampaignRetryPolicy, "strategy" | "intervalHours"> & SmartFields,
  attemptNo: number,
  anchor: Date,
  drainedAt: Date = anchor,
): Date {
  if (policy.strategy === CampaignRetryStrategy.FIXED_INTERVAL) {
    return dayjs(drainedAt).add(Math.max(policy.intervalHours, 1), "hour").toDate();
  }

  const quiet = quietHoursOf(policy);
  const windowEnd =
    policy.windowEndsAt ?? dayjs(anchor).add(DEFAULT_RETRY_WINDOW_DAYS, "day").toDate();

  const offsets = smartOffsetMinutes(
    policy.maxAttempts,
    wakingMinutesBetween(anchor, windowEnd, quiet),
  );
  // Past the end of the table (only reachable if an attempt outruns maxAttempts),
  // hold at the last, longest offset rather than firing immediately.
  const index = Math.min(Math.max(attemptNo - 1, 0), offsets.length - 1);

  const scheduled = addWakingMinutes(anchor, offsets[index] ?? SMART_SETTLE_MINUTES, quiet);
  const earliest = addWakingMinutes(drainedAt, SMART_SETTLE_MINUTES, quiet);
  return scheduled > earliest ? scheduled : earliest;
}

/**
 * Push a fire time out of the policy's quiet hours.
 *
 * A SMART time already lands outside them by construction; this still guards the
 * FIXED_INTERVAL schedule and the floors `scheduleNextRetry` applies afterwards.
 * A time inside the window is moved to the window's end on the appropriate day —
 * never earlier, so this can only ever delay a retry.
 */
export function shiftOutOfQuietHours(when: Date, policy: QuietHoursFields): Date {
  const quiet = quietHoursOf(policy);
  if (!quiet) return when;

  const local = inZone(when, quiet.zone);
  const minutes = local.hour() * 60 + local.minute();
  const inside = quiet.wraps
    ? minutes >= quiet.start || minutes < quiet.end
    : minutes >= quiet.start && minutes < quiet.end;
  if (!inside) return when;

  // The end of the window: today when we are in the pre-dawn tail of a wrapping
  // window, tomorrow when we are in the evening head of one.
  const endOfWindow = local
    .hour(Math.floor(quiet.end / 60))
    .minute(quiet.end % 60)
    .second(0)
    .millisecond(0);
  const resolved = quiet.wraps && minutes >= quiet.start ? endOfWindow.add(1, "day") : endOfWindow;
  return resolved.toDate();
}
