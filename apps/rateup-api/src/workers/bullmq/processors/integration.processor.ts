import { Worker } from "bullmq";
import baseRedis from "../../../utils/redisConnection.js";
import { log } from "../../../utils/logger.js";
import { processIntegration } from "../../../modules/integrations/external/integrationDispatch.js";

const workerConnection = baseRedis.duplicate();

export const integrationWorker = new Worker(
  "integrationTriggerQueue",
  async (job) => {
    if (!job?.data) {
      log.error("No data found");
      return;
    }
    // Deliberately not caught here. This used to swallow every failure, which
    // marked a job that never reached the CRM as completed and made retries
    // impossible. Letting it throw is what allows a provider to opt into
    // retries by enqueueing with `attempts`/`backoff` — GetLead needs that to
    // honour a 429. Providers that enqueue without those options keep exactly
    // one attempt, as before; the only change for them is that a failure is now
    // recorded as a failed job instead of being lost to a log line.
    await processIntegration(job);
    log.debug("Integration queue processing completed successfully");
  },
  {
    connection: workerConnection,
    concurrency: 5,
    removeOnComplete: {
      count: 1,
    },
    // Failures are kept now that they are no longer swallowed, so bound them —
    // otherwise a persistently broken integration grows the failed set forever.
    removeOnFail: {
      count: 100,
    },
  },
);

integrationWorker.on("failed", (job, err) => {
  log.error(
    "Integration job %s (%s) failed: %s",
    job?.id,
    job?.data?.integrationName ?? "unknown",
    err,
  );
});

integrationWorker.on("error", (err) => {
  log.error("Integration worker error: %s", err);
});

log.info("Integration system initialized");
