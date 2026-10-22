// Shop background work: Meta catalog publishing, order reminders, back-in-stock fan-out,
// ad-attributed sales reported to Meta, invoices, copying in a followed store's products and
// writing RateUp orders back to it.
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
import { reportAdPurchase } from "../../../modules/commerce/shop/adConversion.service.js";
import { sendInvoice } from "../../../modules/commerce/shop/invoice.service.js";
import {
  mirrorStoreById,
  writeBackOrder,
} from "../../../modules/commerce/shop/storeSync.service.js";

const workerConnection = baseRedis.duplicate();

type AnyShopJob =
  | Job<ShopJobData["catalogPublish"], unknown, "catalogPublish">
  | Job<ShopJobData["reminder"], unknown, "reminder">
  | Job<ShopJobData["backInStock"], unknown, "backInStock">
  | Job<ShopJobData["adConversion"], unknown, "adConversion">
  | Job<ShopJobData["invoice"], unknown, "invoice">
  | Job<ShopJobData["storeMirror"], unknown, "storeMirror">
  | Job<ShopJobData["writeBack"], unknown, "writeBack">;

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
      case "adConversion":
        return reportAdPurchase(job.data.orderId);
      case "invoice":
        return sendInvoice(job.data.orderId);
      case "storeMirror":
        return mirrorStoreById(job.data.storeId);
      case "writeBack":
        return writeBackOrder(job.data.orderId, job.data.phase, {
          lastAttempt: job.attemptsMade + 1 >= (job.opts.attempts ?? 1),
        });
    }
  },
  { connection: workerConnection, concurrency: 10 },
);

shopWorker.on("failed", (job, err) => {
  log.error({ err, job: job?.name, data: job?.data }, "shop job failed");
});
