/**
 * The schedule a SMART retry policy produces, for the wizard's preview.
 *
 * Mirrors `campaignRetry.schedule.ts` in rateup-api — deliberately, because the
 * point of drawing the timeline is that it is what will actually happen. The two
 * are separate deployables with no shared package, so keep them in step: the
 * offsets are geometric from the settle delay to the end of the retry window,
 * laid out in *waking* time so quiet hours change the shape rather than merely
 * bumping each attempt afterwards.
 */

/**
 * The earliest a retry may fire after the send it reacts to drained.
 *
 * A settle delay, not a preference: when the queue drains, messages Meta accepted
 * are still `SENT` and only flip to `FAILED` when the status webhook lands, so an
 * earlier attempt would find nothing to re-attempt.
 */
export const SETTLE_MINUTES = 45;

/** Retries stop this far out regardless of attempts left; the API clamps to it too. */
export const MAX_WINDOW_DAYS = 7;

const DAY_MINUTES = 24 * 60;

/** `"HH:mm"` as minutes past midnight, or null if unparseable. */
function parseClock(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export interface QuietHours {
  start: number;
  end: number;
  /** 22:00–08:00 crosses midnight; 01:00–05:00 does not. */
  wraps: boolean;
  /** Minutes of the day the window covers. */
  length: number;
}

/** The quiet window, or null when it is off, half-open or empty. */
export function quietHoursOf(start: string, end: string, on: boolean): QuietHours | null {
  if (!on) return null;
  const from = parseClock(start);
  const to = parseClock(end);
  if (from === null || to === null || from === to) return null;
  const wraps = from > to;
  return { start: from, end: to, wraps, length: wraps ? DAY_MINUTES - from + to : to - from };
}

/**
 * The waking-time offsets, one per attempt.
 *
 * Geometric from the settle delay to the end of the window: the first attempt
 * sits at 45 minutes because most frequency caps lift within the first hour, the
 * last sits on the customer's own deadline, and the ones between decay smoothly.
 */
export function smartOffsetMinutes(maxAttempts: number, wakingWindowMinutes: number): number[] {
  const attempts = Math.max(Math.trunc(maxAttempts), 1);
  if (!Number.isFinite(wakingWindowMinutes) || wakingWindowMinutes <= SETTLE_MINUTES) {
    return Array.from({ length: attempts }, () => SETTLE_MINUTES);
  }
  if (attempts === 1) return [SETTLE_MINUTES];

  const ratio = (wakingWindowMinutes / SETTLE_MINUTES) ** (1 / (attempts - 1));
  const offsets = Array.from({ length: attempts }, (_, index) =>
    Math.round(SETTLE_MINUTES * ratio ** index),
  );
  offsets[attempts - 1] = Math.floor(wakingWindowMinutes);
  return offsets;
}

/** Minutes past local midnight for `when`. */
function minuteOfDay(when: Date): number {
  return when.getHours() * 60 + when.getMinutes();
}

/** Whether `minute` falls inside the quiet window. */
function isQuiet(minute: number, quiet: QuietHours): boolean {
  return quiet.wraps
    ? minute >= quiet.start || minute < quiet.end
    : minute >= quiet.start && minute < quiet.end;
}

/**
 * Move `at` to the end of the quiet window if it is inside one.
 *
 * A time on the boundary counts as inside: the window's start is its first quiet
 * minute, so landing exactly on it means landing at the next morning instead.
 */
function shiftToWaking(at: Date, quiet: QuietHours): void {
  const minute = minuteOfDay(at);
  if (!isQuiet(minute, quiet)) return;
  // The evening head of a wrapping window ends tomorrow morning; its pre-dawn
  // tail, and any window that does not wrap, ends later the same day.
  const tomorrow = quiet.wraps && minute >= quiet.start;
  at.setHours(Math.floor(quiet.end / 60), quiet.end % 60, 0, 0);
  if (tomorrow) at.setDate(at.getDate() + 1);
}

/** Minutes from `minute` until the quiet window next opens. */
function minutesUntilQuiet(minute: number, quiet: QuietHours): number {
  return minute < quiet.start ? quiet.start - minute : DAY_MINUTES - minute + quiet.start;
}

/**
 * `from` advanced by `minutes` of waking time.
 *
 * Jumps stretch by stretch rather than minute by minute, so a week-long window
 * costs a handful of steps. The result is never inside quiet hours — including
 * when the count runs out exactly on the boundary, which is the case that would
 * otherwise put two attempts on the same 22:00.
 */
export function addWakingMinutes(from: Date, minutes: number, quiet: QuietHours | null): Date {
  const wanted = Math.max(minutes, 0);
  if (!quiet) return new Date(from.getTime() + wanted * 60_000);

  const at = new Date(from);
  shiftToWaking(at, quiet);

  let left = wanted;
  while (left > 0) {
    const step = Math.min(left, minutesUntilQuiet(minuteOfDay(at), quiet));
    at.setMinutes(at.getMinutes() + step);
    left -= step;
    shiftToWaking(at, quiet);
  }
  return at;
}

/** One attempt of the previewed schedule. */
export interface ScheduledAttempt {
  /** Waking minutes past the send. Unique per attempt, so it works as a key. */
  offsetMinutes: number;
  /** Wall-clock minutes past the send — what the label reads. */
  elapsedMinutes: number;
}

/**
 * The attempts a policy would produce for a send starting `from`.
 *
 * Offsets are divided in waking time and then measured back in wall-clock time,
 * which is the number a person can act on: with 22:00–08:00 quiet hours, "seven
 * waking hours" from an evening send is most of a day away.
 */
export function previewSchedule(
  maxAttempts: number,
  windowDays: number,
  quiet: QuietHours | null,
  from: Date = new Date(),
): ScheduledAttempt[] {
  const wakingWindow = windowDays * (DAY_MINUTES - (quiet?.length ?? 0));
  return smartOffsetMinutes(maxAttempts, wakingWindow).map((offsetMinutes) => ({
    offsetMinutes,
    elapsedMinutes: Math.round(
      (addWakingMinutes(from, offsetMinutes, quiet).getTime() - from.getTime()) / 60_000,
    ),
  }));
}

/** A duration as the timeline draws it: `+45m`, `+7h`, `+3d`. */
export function formatOffset(minutes: number): string {
  if (minutes < 60) return `+${Math.max(Math.round(minutes), 1)}m`;
  if (minutes < DAY_MINUTES) {
    const hours = minutes / 60;
    // One decimal below 10 hours, where the difference between 7h and 7.4h is
    // still a difference a person plans around.
    return `+${hours < 10 ? Math.round(hours * 10) / 10 : Math.round(hours)}h`;
  }
  const days = minutes / DAY_MINUTES;
  return `+${days < 10 ? Math.round(days * 10) / 10 : Math.round(days)}d`;
}
