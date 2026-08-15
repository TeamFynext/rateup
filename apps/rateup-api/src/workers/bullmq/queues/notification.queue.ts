import { Queue } from "bullmq";
import connection from "../../../utils/redisConnection.js";
import type { NotificationJobData } from "../../../modules/notification/notification.service.js";

/** In-app notifications plus their accompanying emails. */
export const notificationQueue = new Queue<NotificationJobData>("notificationQueue", {
  connection,
});
