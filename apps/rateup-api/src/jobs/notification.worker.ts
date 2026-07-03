import { Worker } from "bullmq";
import baseRedis from "../utils/redisConnection.js";
import { processNotification } from "../modules/notification/notification.service.js";
import { log } from "../utils/logger.js";

const workerConnection = baseRedis.duplicate();

const notificationWorker = new Worker(
  "notificationQueue",
  async (job) => {
    if (!job?.data) {
      log.warn("no data in notification");
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
    connection: workerConnection,
    concurrency: 5,
    removeOnComplete: {
      count: 1,
    },
  },
);

notificationWorker.on("error", (err) => {
  log.error("Notification worker error: %s", err);
});

log.info("Notification system initialized");
