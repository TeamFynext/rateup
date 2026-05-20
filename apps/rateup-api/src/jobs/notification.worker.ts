import { Worker } from "bullmq";
import baseRedis from "../utils/redisConnection.js";
import { processNotification } from "../modules/notification/notification.service.js";
import { log } from "../utils/logger.js";

new Worker(
  "notificationQueue",
  async (job) => {
    if (!job?.data) {
      console.log("no data in notification");
      return;
    }
    try {
      await processNotification(job);
      log.info("Notification queue processing completed successfully");
    } catch (error) {
      log.error("Error processing notification: %s", error);
    }
  },
  {
    connection: baseRedis,
    removeOnComplete: {
      count: 1,
    },
  },
);

log.info("Notification system initialized");
