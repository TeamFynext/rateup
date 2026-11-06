import type { Integration } from "../../../generated/prisma/client.js";
import { log } from "../../../utils/logger.js";
import redisConnection from "../../../utils/redisConnection.js";
import type { CommerceOrder, CommerceStore } from "../commerce/commerce.types.js";
import type { WooDeliveryJobData } from "./woocommerce.inbound.js";
import {
  rateupOrderIdOf,
  toCommerceOrder,
  wooCustomer,
  wooTotals,
  type WooOrderPayload,
} from "./woocommerce.mapping.js";
import { readWooCredential } from "./woocommerce.types.js";

const STATUS_TTL_SECONDS = 180 * 24 * 60 * 60;
const statusKey = (integrationId: string, orderId: string) =>
  `woo:order-status:${integrationId}:${orderId}`;

interface SeenStatus {
  status: string;
  modified?: string;
}

/**
 * Whether this delivery moves the order to a status we have not acted on.
 *
 * WooCommerce fires `order.updated` for any edit — a note, an address — and
 * often sends `order.created` and `order.updated` for the same new order within
 * a second. Only a change of status is an event, so the last status acted on is
 * kept per order, and a delivery whose `date_modified` is older than it (a late
 * retry arriving after a newer update) is dropped as stale.
 *
 * Claimed atomically before acting, so two deliveries racing on the same status
 * cannot both act. Returns a release for the caller to call if acting fails, so
 * the retry is not mistaken for a repeat.
 */
export async function claimStatusChange(
  integrationId: string,
  orderId: string,
  status: string,
  modified: string | undefined,
  redis: Pick<typeof redisConnection, "set" | "del"> = redisConnection,
): Promise<(() => Promise<void>) | null> {
  const key = statusKey(integrationId, orderId);
  const next: SeenStatus = { status, ...(modified && { modified }) };
  const previousRaw = (await redis.set(
    key,
    JSON.stringify(next),
    "EX",
    STATUS_TTL_SECONDS,
    "GET",
  )) as string | null;

  const restore = async () => {
    if (previousRaw === null) await redis.del(key);
    else await redis.set(key, previousRaw, "EX", STATUS_TTL_SECONDS);
  };

  if (previousRaw === null) return restore;

  let previous: SeenStatus | null = null;
  try {
    previous = JSON.parse(previousRaw) as SeenStatus;
  } catch {
    return restore;
  }

  const stale = Boolean(previous.modified && modified && modified < previous.modified);
  if (previous.status === status || stale) {
    // Not ours to act on — and not ours to overwrite either.
    await redis.set(key, previousRaw, "EX", STATUS_TTL_SECONDS);
    return null;
  }
  return restore;
}

/** One `order.created` / `order.updated` delivery, through the commerce layer. */
export async function handleWooOrder(
  integration: Integration,
  data: WooDeliveryJobData,
  commerce: {
    provider: CommerceStore["provider"];
    onOrderEvent: (store: CommerceStore, order: CommerceOrder) => Promise<void>;
  },
): Promise<void> {
  const credential = readWooCredential(integration.credential);
  if (!credential || !integration.orgId) return;

  const payload = data.payload as WooOrderPayload;
  const order = toCommerceOrder(payload, credential, data.deliveryId);
  if (!order?.orderId) {
    log.debug(
      { integrationId: integration.id, status: payload.status },
      "WooCommerce order status not handled",
    );
    return;
  }

  const release = await claimStatusChange(
    integration.id,
    order.orderId,
    order.eventKey,
    payload.date_modified_gmt,
  );
  if (!release) return;

  try {
    await syncRateupCheckout(integration.orgId, payload, order);
    await commerce.onOrderEvent(
      {
        provider: commerce.provider,
        storeId: credential.storeUrl,
        orgId: integration.orgId,
        integration,
      },
      order,
    );
  } catch (error) {
    await release();
    throw error;
  }
}

/**
 * An order RateUp created in WooCommerce (a store checkout, or a RateUp order written back):
 * the RateUp order follows it. Paid is WooCommerce's own `date_paid`, since a cash order sits
 * in "processing" unpaid; a failed payment is left alone, as the customer can retry on the
 * same page. Never blocks the rest of the delivery.
 */
async function syncRateupCheckout(orgId: string, payload: WooOrderPayload, order: CommerceOrder) {
  const rateupOrderId = rateupOrderIdOf(payload);
  if (!rateupOrderId) return;
  const settled = payload.status === "processing" || payload.status === "completed";
  const paid = payload.date_paid !== undefined ? Boolean(payload.date_paid) : settled;
  const status = payload.status === "cancelled" ? "cancelled" : paid && settled ? "paid" : null;
  try {
    const { syncOrderFromStore } = await import("../../commerce/shop/externalCheckout.service.js");
    await syncOrderFromStore("woocommerce", orgId, rateupOrderId, {
      status,
      externalOrderId: order.orderId,
      externalName: payload.number ? `#${payload.number}` : null,
      ...(status === "paid" && { totals: wooTotals(payload) }),
      fulfillment: payload.status === "completed" ? "fulfilled" : null,
      refund: payload.status === "refunded" ? "full" : payload.refunds?.length ? "partial" : null,
      ...wooCustomer(payload),
    });
  } catch (err) {
    log.warn({ err, rateupOrderId }, "Could not update the RateUp order from WooCommerce");
  }
}
