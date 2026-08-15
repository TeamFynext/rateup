import { Queue } from "bullmq";
import connection from "../../../utils/redisConnection.js";

/** One job per outbound campaign message. */
export const waMessageQueue = new Queue("waMessageQueue", { connection });

// `wa-status-queue` and `wa-status-processor` used to be declared here. Neither
// ever had a consumer — the latter had a scheduler enqueueing one job a minute
// into a queue nobody read — so both were removed along with that scheduler.
// Delivery statuses are handled by the Kafka `status-events` consumer instead.

/** Ad-hoc single message sends and seeded inbox traffic. */
export const sendMessageQueue = new Queue("sendMessageQueue", { connection });
