import redis from "../../../utils/redisConnection.js";
import { log } from "../../../utils/logger.js";

/**
 * "Meta already accepted this", remembered per job.
 *
 * A BullMQ job that stalls — the worker is killed, or misses its lock renewal —
 * after Graph accepted its message but before BullMQ marked it complete is run
 * again from the top, and used to call Graph a second time. The marker is
 * written the moment Graph returns a message id, so the rerun finds it and only
 * records the message instead.
 *
 * Seven days covers any stall-and-rerun by a wide margin and is long enough for
 * a delayed job to be retried by hand, while every key still expires on its own.
 */
export const SENT_MARKER_TTL_SECONDS = 7 * 24 * 60 * 60;

export const sentMarkerKey = (idempotencyKey: string) => `wa:sent:${idempotencyKey}`;

/**
 * The message id Meta gave a previous run of this job, if there was one.
 *
 * A failed read is treated as "none": the marker guards a rare rerun, and
 * refusing to send whenever Redis blinks would strand far more recipients than
 * it protects.
 */
export async function getSentMessageId(idempotencyKey: string): Promise<string | null> {
  try {
    return await redis.get(sentMarkerKey(idempotencyKey));
  } catch (err) {
    log.error({ err, idempotencyKey }, "Could not read the send marker; sending anyway");
    return null;
  }
}

/**
 * Remember that this job's message was accepted. `NX` so a racing duplicate
 * cannot replace the first message id with its own.
 *
 * Never throws. The message has already gone; a Redis failure here only loses
 * the protection for a rerun that probably never comes, and failing the send
 * over it would be the worse outcome.
 */
export async function markMessageSent(idempotencyKey: string, messageId: string): Promise<void> {
  try {
    await redis.set(sentMarkerKey(idempotencyKey), messageId, "EX", SENT_MARKER_TTL_SECONDS, "NX");
  } catch (err) {
    log.error({ err, idempotencyKey, messageId }, "Could not record the send marker");
  }
}
