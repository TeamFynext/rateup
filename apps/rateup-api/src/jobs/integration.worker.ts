import { Worker } from "bullmq";
import baseRedis from "../utils/redisConnection.js";
import { log } from "../utils/logger.js";
import { processIntegration } from "../modules/integrations/external/zoho/zoho.service.js";

new Worker(
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
    connection: baseRedis,
    removeOnComplete: {
      count: 1,
    },
  },
);

log.info("Integration system initialized");
