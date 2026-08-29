// Ported from message-dispatcher/src/index.ts.
//
// Delivers a trigger to every Zapier hook subscribed to it. The job *name* is the
// trigger key (new_contact_create, contact_updated, …), not the payload.
import { Job, Worker } from "bullmq";

import { log } from "../../shared/logger.js";
import baseRedis from "../../../utils/redisConnection.js";
import { notifyZapier } from "../../shared/modules/integration/zapier/zapier.service.js";
import { ZapierTriggers } from "../../shared/types/enum.js";

const workerConnection = baseRedis.duplicate();

export const zapierTriggerWorker = new Worker(
  "zapierTriggerQueue",
  async (job: Job) => {
    log.trace("zapierTriggerQueue job data => %o", job.data);
    const { orgId, data } = job.data;
    await notifyZapier(job.name as ZapierTriggers, data, orgId);
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
