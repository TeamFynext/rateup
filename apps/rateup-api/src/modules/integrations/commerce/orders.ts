import { log } from "../../../utils/logger.js";
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
 */
export async function onOrderEvent(store: CommerceStore, order: CommerceOrder) {
  const { provider, storeId, orgId } = store;

  if (order.orderId) {
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
