/**
 * Per-phone-number send throttle for the campaign dispatcher.
 *
 * Meta rate-limits outbound messages *per phone number* — 80 messages a second
 * by default, more for numbers it has upgraded. That is the only throughput
 * ceiling that matters, and it is per number, not per process: several orgs
 * sending at once each get their own full allowance, and one org's 50k campaign
 * must not slow another org's number. A single worker-wide `concurrency` cannot
 * express that, so the dispatcher asks this module for a slot on the specific
 * number before every Graph call and delays the job when the second is spent.
 *
 * The bucket is a fixed one-second window in Redis: `INCR` on
 * `waRate:<phoneId>:<second>`, expiring two seconds later. A fixed window can
 * admit up to 2× the limit across a window boundary in the worst case; Meta's
 * own limiter is tolerant of short bursts and the retry engine handles a 429
 * anyway, so the simpler scheme is preferred over a sliding log at this rate.
 * Everything is one Lua call so 250 concurrent jobs cannot race the check.
 */
import type { Redis } from "ioredis";

/** Meta's baseline throughput for a Cloud API phone number. */
export const DEFAULT_WA_MESSAGES_PER_SECOND = 80;

const KEY_PREFIX = "waRate";

/** What the caller should do with the slot it asked for. */
export interface SlotDecision {
  /** True when the job may send right now. */
  granted: boolean;
  /**
   * When not granted, how long to wait before asking again — the remainder of
   * the current second plus a little jitter so 250 delayed jobs do not all wake
   * on the same millisecond and refill the queue in one burst.
   */
  retryAfterMs: number;
}

/**
 * The per-second limit for a number, given whatever the settings row carries.
 *
 * `null`/`undefined` (no override) and anything non-positive fall back to the
 * platform default, so a bad value in the column can never stall a number.
 */
export function resolvePhoneRate(messagesPerSecond: number | null | undefined): number {
  if (typeof messagesPerSecond !== "number" || !Number.isFinite(messagesPerSecond)) {
    return DEFAULT_WA_MESSAGES_PER_SECOND;
  }
  const rate = Math.floor(messagesPerSecond);
  return rate > 0 ? rate : DEFAULT_WA_MESSAGES_PER_SECOND;
}

/**
 * Pure window arithmetic, split out so it can be tested without Redis.
 *
 * `count` is the value the window's counter has *after* this request's
 * increment; `nowMs` the current time. Denied requests wait for the window to
 * roll over.
 */
export function decideSlot(count: number, limit: number, nowMs: number): SlotDecision {
  if (count <= limit) return { granted: true, retryAfterMs: 0 };
  const msIntoWindow = nowMs % 1000;
  const untilNextWindow = 1000 - msIntoWindow;
  // Up to 100ms of jitter. Without it every job delayed in the same second is
  // promoted together and the next window starts with a burst that is itself
  // over the limit.
  const jitter = Math.floor(Math.random() * 100);
  return { granted: false, retryAfterMs: untilNextWindow + jitter };
}

// KEYS[1] = window key; ARGV[1] = window ttl (seconds).
// Returns the count after this increment.
const ACQUIRE_LUA = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("EXPIRE", KEYS[1], tonumber(ARGV[1]))
end
return count
`;

export function phoneRateKey(phoneId: string, nowMs: number): string {
  return `${KEY_PREFIX}:${phoneId}:${Math.floor(nowMs / 1000)}`;
}

/**
 * Ask for one send slot on `phoneId` in the current second.
 *
 * Never throws on a Redis failure: a limiter that is down must fail *open* —
 * Meta will 429 an over-limit burst and the queue's transient retry handles
 * that — rather than fail closed and halt every campaign on the platform.
 */
export async function acquirePhoneSendSlot(
  redis: Redis,
  phoneId: string,
  limit: number,
  nowMs: number = Date.now(),
): Promise<SlotDecision> {
  try {
    const count = Number(await redis.eval(ACQUIRE_LUA, 1, phoneRateKey(phoneId, nowMs), 2));
    return decideSlot(count, limit, nowMs);
  } catch {
    return { granted: true, retryAfterMs: 0 };
  }
}
