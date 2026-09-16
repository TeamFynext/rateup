import { Queue } from "bullmq";
import connection from "../../../utils/redisConnection.js";

/**
 * One delayed job per loyalty feedback request, firing at its `scheduledFor` — the same
 * shape as campaignRetry.queue.ts, for the same reasons.
 *
 * The `LoyaltyFeedbackRequest` row is the source of truth for *what* is scheduled; this
 * queue only decides *when* the row is looked at. Firing re-reads the row and claims it
 * with a conditional UPDATE (feedback.sender.ts), so a job whose row was cancelled does
 * nothing and two jobs for one row send once. The job id is derived from the request id,
 * so BullMQ collapses a double-arm into one delayed job.
 */
export const loyaltyFeedbackSendQueue = new Queue("loyaltyFeedbackSend", { connection });

// No ':' — BullMQ rejects custom job ids containing its own key separator.
export const loyaltyFeedbackJobId = (requestId: string) => `feedback-${requestId}`;

/**
 * Schedule `requestId` to fire at `scheduledFor`. A time already past becomes a zero
 * delay: the reconciler re-arms rows that came due while the worker was down.
 */
export async function armFeedbackRequest(requestId: string, scheduledFor: Date): Promise<void> {
  await loyaltyFeedbackSendQueue.add(
    "fire",
    { requestId },
    {
      jobId: loyaltyFeedbackJobId(requestId),
      delay: Math.max(0, scheduledFor.getTime() - Date.now()),
      removeOnComplete: true,
      removeOnFail: 100,
    },
  );
}

/**
 * Drop the pending job, best-effort. A cancelled request whose job survives is a no-op
 * when it fires, because the claim requires the row to still be SCHEDULED.
 */
export async function disarmFeedbackRequest(requestId: string): Promise<void> {
  await loyaltyFeedbackSendQueue.remove(loyaltyFeedbackJobId(requestId)).catch(() => {});
}
