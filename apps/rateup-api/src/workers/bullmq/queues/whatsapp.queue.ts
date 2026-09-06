import { Queue } from "bullmq";
import connection from "../../../utils/redisConnection.js";

/**
 * One job per outbound campaign message.
 *
 * Three attempts with a five-second exponential backoff — the fast tier of the
 * retry story. A Meta 429 or a 5xx clears in seconds and does not deserve the
 * scheduled retry engine's 90-minute settle delay; a frequency cap does, and is
 * handled there instead.
 *
 * This only does anything because `waMessage.processor.ts` rethrows on a
 * transient failure. It swallows everything else deliberately, so a permanent
 * rejection does not burn three attempts and three times the latency to reach
 * the same answer. Same reasoning as `notificationQueue`'s `attempts: 5`, which
 * likewise works only because its processor throws.
 */
export const waMessageQueue = new Queue("waMessageQueue", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
  },
});

// `wa-status-queue` and `wa-status-processor` used to be declared here. Neither
// ever had a consumer — the latter had a scheduler enqueueing one job a minute
// into a queue nobody read — so both were removed along with that scheduler.
// Delivery statuses are handled by the Kafka `status-events` consumer instead.

/** Ad-hoc single message sends and seeded inbox traffic. */
export const sendMessageQueue = new Queue("sendMessageQueue", { connection });
