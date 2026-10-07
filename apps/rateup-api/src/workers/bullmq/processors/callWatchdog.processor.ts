// Hangs up WhatsApp calls whose browser tab has gone away (see calling.watchdog.ts).
import { Job, Worker } from "bullmq";

import { log } from "../../shared/logger.js";
import baseRedis from "../../../utils/redisConnection.js";
import { checkCallAlive } from "../../../modules/whatsapp/calling/calling.watchdog.js";
import { armCallWatchdog } from "../queues/callWatchdog.queue.js";

const workerConnection = baseRedis.duplicate();

export const callWatchdogWorker = new Worker(
  "callWatchdog",
  async (job: Job<{ callId: string }>) => {
    const { callId } = job.data;
    const result = await checkCallAlive(callId);
    if (result === "alive") await armCallWatchdog(callId);
    return result;
  },
  { connection: workerConnection, concurrency: 10 },
);

callWatchdogWorker.on("failed", (job, err) => {
  log.error({ err, callId: job?.data?.callId }, "callWatchdog job failed");
});
