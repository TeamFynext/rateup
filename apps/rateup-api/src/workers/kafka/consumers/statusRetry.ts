// How long a skipped receipt waits before it is re-published.
//
// A receipt is skipped when its message row is not there yet — Meta's `sent`
// regularly lands before the send path has finished writing. Re-publishing it
// straight back onto the topic, as this consumer used to, turned 15 retries into
// well under a second of wall-clock: the row still was not there, and the receipt
// went to the dead-letter topic with the counters permanently short.
//
// Doubling from a quarter second and capped at 30s, the same 15 retries span
// about five minutes — long enough for any insert that is going to happen, short
// enough that a receipt for a message that truly never existed is not held all day.

export const MAX_RETRIES = 15;

const FIRST_DELAY_MS = 250;
const MAX_DELAY_MS = 30_000;

/** Delay before re-publishing a receipt that has already been retried `retryCount` times. */
export function retryDelayMs(retryCount: number): number {
  const attempt = Math.max(0, Math.floor(retryCount));
  return Math.min(FIRST_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
}
