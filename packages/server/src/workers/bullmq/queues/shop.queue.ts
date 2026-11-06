import { Queue } from "bullmq";
import connection from "../../../utils/redisConnection.js";

/**
 * Background work for shops: publishing products to the Meta catalog, timed reminders on an
 * order (cart, payment, cash-on-delivery confirmation), back-in-stock fan-out, reporting
 * ad-attributed sales to Meta, sending invoices and writing orders back to a followed store.
 *
 * Rows stay the source of truth. A reminder job only says "look at this order now"; the
 * handler re-reads the order and does nothing if it was paid or cancelled meanwhile.
 */
export const shopQueue = new Queue("shop", { connection });

export type ShopReminderKind = "cart" | "payment" | "cod_expire" | "bank_expire" | "review";

export interface ShopJobData {
  catalogPublish: { productId: string; removedRetailerIds?: string[] };
  reminder: { orderId: string; kind: ShopReminderKind; step: number };
  backInStock: { variantId: string };
  adConversion: { orderId: string };
  invoice: { orderId: string };
  storeMirror: { storeId: string };
  writeBack: { orderId: string; phase: StoreWriteBackPhase };
}

export type StoreWriteBackPhase = "placed" | "paid";

/** Five tries over about an hour: a store API that is down for a while still gets the order. */
export const WRITE_BACK_ATTEMPTS = 5;

// No ':' — BullMQ rejects a custom job id containing its own key separator.
const publishJobId = (productId: string) => `shop-publish-${productId}`;
const reminderJobId = (orderId: string, kind: ShopReminderKind, step: number) =>
  `shop-reminder-${orderId}-${kind}-${step}`;

/**
 * Debounced: an editor saving three times in a row publishes once, a few seconds after the
 * last save. Removed retailer ids are carried over so a variant deleted in an earlier save is
 * still taken off Meta. A publish already running cannot be replaced (nor can BullMQ re-add a
 * job id it still holds), so a save made meanwhile follows it under an id of its own.
 */
export async function enqueueCatalogPublish(productId: string, removedRetailerIds: string[] = []) {
  const debounceId = publishJobId(productId);
  let jobId = debounceId;
  let carried: string[] = [];
  const existing = await shopQueue.getJob(debounceId).catch(() => undefined);
  if (existing) {
    const state = await existing.getState().catch(() => "unknown");
    if (state === "delayed" || state === "waiting" || state === "prioritized") {
      carried = (existing.data as ShopJobData["catalogPublish"]).removedRetailerIds ?? [];
    }
    const removed =
      state !== "active" &&
      (await existing.remove().then(
        () => true,
        () => false,
      ));
    if (!removed) {
      jobId = `${debounceId}-${Date.now()}`;
      carried = [];
    }
  }
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

/**
 * One fan-out per variant at a time: the fixed id folds overlapping restocks into one job, and
 * is freed on completion or failure so the next restock queues again. The worker claims each
 * subscriber row before sending, so even overlapping jobs message a person once.
 */
export async function enqueueBackInStock(variantId: string) {
  await shopQueue.add(
    "backInStock",
    { variantId },
    { jobId: `shop-bis-${variantId}`, removeOnComplete: true, removeOnFail: true },
  );
}

/**
 * Copies a RateUp order into the store it follows. Keyed by order and phase, so a replayed
 * event queues it once; retried with backoff because the store's API can be briefly down.
 */
export async function enqueueStoreWriteBack(orderId: string, phase: StoreWriteBackPhase) {
  await shopQueue.add(
    "writeBack",
    { orderId, phase },
    {
      jobId: `shop-writeback-${orderId}-${phase}`,
      attempts: WRITE_BACK_ATTEMPTS,
      backoff: { type: "exponential", delay: 60_000 },
      removeOnComplete: true,
      removeOnFail: 100,
    },
  );
}

/** A paid order an ad click started, reported to Meta's Conversions API once. */
export async function enqueueAdConversion(orderId: string) {
  await shopQueue.add(
    "adConversion",
    { orderId },
    {
      jobId: `shop-capi-${orderId}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 30_000 },
      removeOnComplete: true,
      removeOnFail: 100,
    },
  );
}

/** The invoice for a paid order, sent once; the job id keeps a replayed webhook from queueing it twice. */
export async function enqueueInvoice(orderId: string) {
  await shopQueue.add(
    "invoice",
    { orderId },
    {
      jobId: `shop-invoice-${orderId}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 30_000 },
      removeOnComplete: true,
      removeOnFail: 100,
    },
  );
}

/**
 * Copies a followed Shopify or WooCommerce store's products in again a minute after it says
 * something changed. The fixed id folds a burst of product webhooks into one run, and is
 * freed on completion so the next change schedules another.
 */
export async function enqueueStoreMirror(storeId: string, delayMs = 60_000) {
  await shopQueue.add(
    "storeMirror",
    { storeId },
    {
      jobId: `shop-mirror-${storeId}`,
      delay: delayMs,
      attempts: 3,
      backoff: { type: "exponential", delay: 60_000 },
      removeOnComplete: true,
      removeOnFail: true,
    },
  );
}
