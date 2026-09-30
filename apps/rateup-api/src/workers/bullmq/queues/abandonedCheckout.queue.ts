import { Queue } from "bullmq";
import connection from "../../../utils/redisConnection.js";

/**
 * One delayed job per abandoned-checkout reminder, firing at its `dueAt`.
 *
 * The `ShopifyCheckoutReminder` row is the source of truth; this queue only decides when
 * it is looked at. Firing claims the row conditionally, so a job whose reminder was
 * cancelled or already sent does nothing.
 */
export const abandonedCheckoutReminderQueue = new Queue("abandonedCheckoutReminder", {
  connection,
});

// No ':' — BullMQ rejects a custom job id containing its own key separator.
const reminderJobId = (reminderId: string) => `abandoned-${reminderId}`;

/**
 * Schedules `reminderId` for `dueAt`, replacing any job already waiting for it. BullMQ
 * ignores an add whose job id exists, and a checkout that changed must push its reminder
 * back, so the old job is removed first.
 */
export async function armCheckoutReminder(reminderId: string, dueAt: Date): Promise<void> {
  const jobId = reminderJobId(reminderId);
  await abandonedCheckoutReminderQueue.remove(jobId).catch(() => {});
  await abandonedCheckoutReminderQueue.add(
    "fire",
    { reminderId },
    {
      jobId,
      delay: Math.max(0, dueAt.getTime() - Date.now()),
      removeOnComplete: true,
      removeOnFail: 100,
    },
  );
}

/** Best-effort: a job that survives finds its reminder no longer SCHEDULED and does nothing. */
export async function disarmCheckoutReminder(reminderId: string): Promise<void> {
  await abandonedCheckoutReminderQueue.remove(reminderJobId(reminderId)).catch(() => {});
}

export async function hasCheckoutReminderJob(reminderId: string): Promise<boolean> {
  return Boolean(await abandonedCheckoutReminderQueue.getJob(reminderJobId(reminderId)));
}
