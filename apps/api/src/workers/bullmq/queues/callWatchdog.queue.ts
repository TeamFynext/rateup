import { Queue } from "bullmq";
import connection from "../../../utils/redisConnection.js";
import { CALL_WATCHDOG_INTERVAL_MS } from "../../../modules/inbox/calls/calling.watchdog.js";

/**
 * Checks that the browser holding a WhatsApp call is still there (see calling.watchdog.ts).
 * One delayed job per look; a call that is still alive re-arms the next one. Jobs carry a
 * time in their id so the re-arm is not swallowed by the job that is running it, and a
 * stray duplicate is harmless — a look at a finished call does nothing.
 */
export const callWatchdogQueue = new Queue("callWatchdog", { connection });

export async function armCallWatchdog(
  callId: string,
  delayMs: number = CALL_WATCHDOG_INTERVAL_MS,
): Promise<void> {
  await callWatchdogQueue.add(
    "check",
    { callId },
    {
      // No ':' — BullMQ rejects custom job ids containing its own key separator.
      jobId: `callwatch-${callId}-${Date.now()}`,
      delay: delayMs,
      removeOnComplete: true,
      removeOnFail: 100,
    },
  );
}
