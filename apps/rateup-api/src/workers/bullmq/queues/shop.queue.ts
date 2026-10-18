import { Queue } from "bullmq";
import connection from "../../../utils/redisConnection.js";

/**
 * Background work for shops: publishing products to the Meta catalog, timed reminders on an
 * order (cart, payment, cash-on-delivery confirmation) and back-in-stock fan-out.
 *
 * Rows stay the source of truth. A reminder job only says "look at this order now"; the
 * handler re-reads the order and does nothing if it was paid or cancelled meanwhile.
 */
export const shopQueue = new Queue("shop", { connection });

export type ShopReminderKind = "cart" | "payment" | "cod_expire" | "review";

export interface ShopJobData {
  catalogPublish: { productId: string; removedRetailerIds?: string[] };
  reminder: { orderId: string; kind: ShopReminderKind; step: number };
  backInStock: { variantId: string };
}

// No ':' — BullMQ rejects a custom job id containing its own key separator.
const publishJobId = (productId: string) => `shop-publish-${productId}`;
const reminderJobId = (orderId: string, kind: ShopReminderKind, step: number) =>
  `shop-reminder-${orderId}-${kind}-${step}`;

/**
 * Debounced: an editor saving three times in a row publishes once, a few seconds after the
 * last save. Removed retailer ids are carried over so a variant deleted in an earlier save is
 * still taken off Meta.
 */
export async function enqueueCatalogPublish(productId: string, removedRetailerIds: string[] = []) {
  const jobId = publishJobId(productId);
  const waiting = await shopQueue.getJob(jobId).catch(() => undefined);
  const carried: string[] =
    (waiting?.data as ShopJobData["catalogPublish"] | undefined)?.removedRetailerIds ?? [];
  if (waiting) await waiting.remove().catch(() => {});
  await shopQueue.add(
    "catalogPublish",
    { productId, removedRetailerIds: [...new Set([...carried, ...removedRetailerIds])] },
    {
      jobId,
      delay: 3000,
      attempts: 3,
      backoff: { type: "exponential", delay: 10_000 },
      removeOnComplete: true,
      removeOnFail: 100,
    },
  );
}

export async function armShopReminder(
  orderId: string,
  kind: ShopReminderKind,
  step: number,
  dueAt: Date,
) {
  const jobId = reminderJobId(orderId, kind, step);
  await shopQueue.remove(jobId).catch(() => {});
  await shopQueue.add(
    "reminder",
    { orderId, kind, step },
    {
      jobId,
      delay: Math.max(0, dueAt.getTime() - Date.now()),
      removeOnComplete: true,
      removeOnFail: 100,
    },
  );
}

export async function disarmShopReminders(orderId: string, kind: ShopReminderKind, steps: number) {
  await Promise.all(
    Array.from({ length: steps }, (_, step) =>
      shopQueue.remove(reminderJobId(orderId, kind, step)).catch(() => {}),
    ),
  );
}

export async function enqueueBackInStock(variantId: string) {
  await shopQueue.add(
    "backInStock",
    { variantId },
    { jobId: `shop-bis-${variantId}-${Date.now()}`, removeOnComplete: true, removeOnFail: 100 },
  );
}
