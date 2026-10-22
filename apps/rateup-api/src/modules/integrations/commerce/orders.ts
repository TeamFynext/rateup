import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { emitIntegrationEvent } from "../events/emitIntegrationEvent.js";
import type { CommerceOrder, CommerceStore } from "./commerce.types.js";
import { enqueueCommerceOrderLoyalty } from "./loyalty.js";
import { scheduleOrderSurvey } from "./surveys.js";

/**
 * Everything that happens when a store reports an order event, in one place:
 * loyalty, the `order.*` integration event, the WhatsApp survey and the
 * store's own automation.
 *
 * Loyalty and the integration event come first, and deliberately before the
 * phone check: loyalty can identify a customer by email, and an order is news
 * to integrations whether or not it carries a number. Both are queue writes,
 * so they cost the messaging paths nothing, and a throw further down can no
 * longer swallow them.
 *
 * An order RateUp created in the store (a store checkout or a written-back order) already
 * messaged the customer, ran automations and raised `order.*` from RateUp's own order, so its
 * echo here only earns a store checkout's loyalty.
 */
export async function onOrderEvent(
  store: CommerceStore,
  order: CommerceOrder & { rateupOrderId?: string | null },
) {
  const { provider, storeId, orgId } = store;
  const rateupOwned =
    order.rateupWriteBack || !!order.rateupOrderId || (await createdByRateup(store, order));

  if (order.orderId && !order.rateupWriteBack) {
    await enqueueCommerceOrderLoyalty({
      provider: provider.name,
      storeId,
      status: order.status,
      eventKey: order.eventKey,
      orgId,
      orderId: order.orderId,
      phone: order.customer.phone,
      email: order.customer.email,
      amount: order.amount,
      discountCodes: order.discountCodes,
    });
  }

  if (rateupOwned) return;

  await emitIntegrationEvent(orgId, {
    type: `order.${order.status}`,
    order: {
      provider: provider.name,
      storeId,
      orderId: order.orderId,
      status: order.status,
      customer: order.customer,
      amount: order.amount,
      productIds: order.productIds,
    },
  });

  const phone = order.customer.phone;
  if (!phone) {
    // The survey and automation paths genuinely need a number — there is nowhere
    // to send a WhatsApp message without one. Logged at info: "this order reached
    // nobody" is something a shop needs to be able to find.
    log.info(
      {
        provider: provider.name,
        storeId,
        event: order.eventKey,
        orderId: order.orderId,
        hasEmail: Boolean(order.customer.email),
      },
      `${provider.label} order carries no phone number; WhatsApp survey and automation paths skipped`,
    );
    return;
  }

  await scheduleOrderSurvey(store, order, phone);
  await provider.runOrderAutomation?.(store, order, phone);
}

/** The store order is the copy of a RateUp order (matched by the id RateUp recorded for it). */
async function createdByRateup(store: CommerceStore, order: CommerceOrder) {
  if (!order.orderId) return false;
  try {
    const found = await prisma.shopOrder.findFirst({
      where: {
        orgId: store.orgId,
        externalProvider: store.provider.name,
        externalId: order.orderId,
      },
      select: { id: true },
    });
    return Boolean(found);
  } catch (err) {
    log.warn({ err, orderId: order.orderId }, "Could not check whether RateUp created this order");
    return false;
  }
}
