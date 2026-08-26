import { Queue } from "bullmq";
import connection from "../../../utils/redisConnection.js";
import { sendAWSEmail, type EmailParams } from "../../../utils/email/sendAWSEmail.js";
import { log } from "../../../utils/logger.js";
import type { NotificationJobData } from "../../../modules/notification/notification.service.js";

// Retries matter more than they look: `sendAWSEmail` reports failure by returning false, so a
// transient SES throttle used to mean the mail was simply never sent. The processors now
// rethrow, and these attempts are what turn that throw into a redelivery.
const emailJobOptions = {
  attempts: 5,
  backoff: { type: "exponential" as const, delay: 2000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 1000 },
};

/**
 * Bulk lane: in-app notifications, their accompanying emails, and anything fanned out in a
 * loop (weekly reports, subscription alerts). Depth here is unbounded by design — a weekly
 * report run enqueues one job per org.
 */
export const notificationQueue = new Queue<NotificationJobData>("notificationQueue", {
  connection,
  defaultJobOptions: emailJobOptions,
});

/**
 * Retry lane for email a human is actively waiting on with a form open — password reset,
 * email verification, invitations. These are sent inline by `sendTransactionalEmail` below;
 * this queue only carries the ones whose direct send failed.
 *
 * This is a separate queue rather than a `priority` on `notificationQueue` because BullMQ's
 * fetch drains the `wait` list (un-prioritized jobs) with RPOPLPUSH *before* it looks at the
 * prioritized zset — see `fetchNextJob.lua` in bullmq. Priority only orders jobs against other
 * prioritized jobs, so tagging just the reset email would have parked it *behind* every bulk
 * job instead of ahead of it. A separate queue with its own worker also isolates concurrency,
 * so a backed-up weekly-report run cannot occupy every slot.
 *
 * Both queues are consumed by the same `bullmq` service
 * (`processors/notification.processor.ts`).
 */
export const transactionalEmailQueue = new Queue<NotificationJobData>("transactionalEmailQueue", {
  connection,
  defaultJobOptions: emailJobOptions,
});

/**
 * Send an email a user is blocked on, in-process and right now — no queue hop, so the SES
 * call happens while the request is still open and a failure is visible to the caller.
 *
 * The queue above is the fallback, not the default path: if the direct send fails we
 * enqueue the same payload so the worker's `attempts` still retry it, and only rethrow when
 * the enqueue fails too (i.e. the mail really is lost).
 */
export async function sendTransactionalEmail(emailData: EmailParams) {
  const sent = await sendAWSEmail(emailData);
  if (sent) return;

  log.warn({ to: emailData.to }, "Direct transactional send failed; falling back to the queue");
  await transactionalEmailQueue.add("transactionalEmail", { emailData });
}
