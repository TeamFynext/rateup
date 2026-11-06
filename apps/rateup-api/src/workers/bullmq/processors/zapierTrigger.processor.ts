// Drains the old `zapierTriggerQueue`. Zapier triggers now go through the
// integration provider (`external/zapier/zapier.deliver.ts`), one job per hook on
// `integrationTriggerQueue`; this worker only hands over jobs a previous deploy
// left here. Remove it, and the queue, once that queue is empty in production.
//
// The job *name* is the trigger key (new_contact_create, contact_updated, …).
import { Job, Worker } from "bullmq";

import { log } from "../../shared/logger.js";
import baseRedis from "../../../utils/redisConnection.js";
import { drainLegacyZapierJob } from "../../../modules/integrations/external/zapier/zapier.deliver.js";

const workerConnection = baseRedis.duplicate();

export const zapierTriggerWorker = new Worker(
  "zapierTriggerQueue",
  async (job: Job<{ orgId: string; data: unknown }>) => {
    const { orgId, data } = job.data;
    await drainLegacyZapierJob(job.name, data, orgId);
  },
  {
    connection: workerConnection,
    removeOnComplete: {
      count: 1,
    },
  },
);

zapierTriggerWorker.on("error", (err) => {
  log.error("Zapier trigger worker error: %s", err);
});

log.info("Zapier trigger worker initialized");
