// Fires one loyalty feedback request when its delayed job comes due.
//
// Thin on purpose: whether the row may fire at all — still SCHEDULED, feedback still
// enabled, customer still active — is decided by the claim and re-checks inside
// `fireFeedbackRequest`, so a stale or duplicated job needs no reasoning here.
import { Job, Worker } from "bullmq";

import { log } from "../../shared/logger.js";
import baseRedis from "../../../utils/redisConnection.js";
import { fireFeedbackRequest } from "../../../modules/loyalty/feedback/feedback.sender.js";

const workerConnection = baseRedis.duplicate();

export const loyaltyFeedbackSendWorker = new Worker(
  "loyaltyFeedbackSend",
  async (job: Job<{ requestId: string }>) => {
    const { requestId } = job.data;
    const result = await fireFeedbackRequest(requestId);
    log.info({ requestId, result }, "Loyalty feedback request reached its send time");
    return result;
  },
  { connection: workerConnection, concurrency: 5 },
);

loyaltyFeedbackSendWorker.on("failed", (job, err) => {
  log.error({ err, requestId: job?.data?.requestId }, "loyaltyFeedbackSend job failed");
});
