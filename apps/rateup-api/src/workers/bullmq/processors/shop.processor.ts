// Shop background work: Meta catalog publishing, order reminders and back-in-stock fan-out.
// Each handler re-reads its rows, so a job that fires late or twice does the right thing.
import { Job, Worker } from "bullmq";

import { log } from "../../shared/logger.js";
import baseRedis from "../../../utils/redisConnection.js";
import type { ShopJobData } from "../queues/shop.queue.js";
import { publishProductToMeta } from "../../../modules/commerce/shop/catalogPublish.service.js";
import {
  fireShopReminder,
  runBackInStock,
} from "../../../modules/commerce/shop/recovery.service.js";

const workerConnection = baseRedis.duplicate();

type AnyShopJob =
  | Job<ShopJobData["catalogPublish"], unknown, "catalogPublish">
  | Job<ShopJobData["reminder"], unknown, "reminder">
  | Job<ShopJobData["backInStock"], unknown, "backInStock">;

export const shopWorker = new Worker(
  "shop",
  async (job: AnyShopJob) => {
    switch (job.name) {
      case "catalogPublish":
        return publishProductToMeta(job.data.productId, job.data.removedRetailerIds ?? []);
      case "reminder":
        return fireShopReminder(job.data.orderId, job.data.kind, job.data.step);
      case "backInStock":
        return runBackInStock(job.data.variantId);
    }
  },
  { connection: workerConnection, concurrency: 10 },
);

shopWorker.on("failed", (job, err) => {
  log.error({ err, job: job?.name, data: job?.data }, "shop job failed");
});
