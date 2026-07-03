import { Worker } from "bullmq";
import baseRedis from "../utils/redisConnection.js";
import { log } from "../utils/logger.js";
import { processIntegration } from "../modules/integrations/external/zoho/zoho.service.js";

const workerConnection = baseRedis.duplicate();

const integrationWorker = new Worker(
  "integrationTriggerQueue",
  async (job) => {
    if (!job?.data) {
      log.error("No data found");
      return;
    }
    try {
      await processIntegration(job);
      log.info("Integration queue processing completed successfully");
    } catch (error) {
      log.error("Error processing integration: %s", error);
    }
  },
  {
    connection: workerConnection,
    concurrency: 5,
    removeOnComplete: {
      count: 1,
    },
  },
);

integrationWorker.on("error", (err) => {
  log.error("Integration worker error: %s", err);
});

log.info("Integration system initialized");
