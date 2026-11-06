// Fires one abandoned-checkout reminder when its delayed job comes due. Thin on purpose:
// whether it may send at all is decided by the claim in `fireCheckoutReminder`.
import { Job, Worker } from "bullmq";

import { log } from "../../shared/logger.js";
import baseRedis from "../../../utils/redisConnection.js";
import { fireCheckoutReminder } from "../../../modules/integrations/shopify/shopify.checkouts.service.js";

const workerConnection = baseRedis.duplicate();

export const abandonedCheckoutReminderWorker = new Worker(
  "abandonedCheckoutReminder",
  async (job: Job<{ reminderId: string }>) => {
    const { reminderId } = job.data;
    const result = await fireCheckoutReminder(reminderId);
    log.info({ reminderId, result }, "Abandoned checkout reminder reached its due time");
    return result;
  },
  { connection: workerConnection, concurrency: 10 },
);

abandonedCheckoutReminderWorker.on("failed", (job, err) => {
  log.error({ err, reminderId: job?.data?.reminderId }, "abandonedCheckoutReminder job failed");
});
