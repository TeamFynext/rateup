import { TriggerEvent } from "../../../generated/prisma/enums.js";
import { FRONTEND_URL } from "../../../utils/constants/constants.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import {
  disarmShopReminders,
  enqueueAdConversion,
  enqueueInvoice,
  enqueueStoreWriteBack,
} from "../../../workers/bullmq/queues/shop.queue.js";
import type { OrderEventStatus } from "../../integrations/events/integrationEvent.types.js";
import { notificationSetting, sendShopMessage, type ShopMessage } from "./notify.js";
import { addressLines } from "./address.js";
import { paramsFor, renderShopBody, type ShopParamValues } from "./messageCatalog.js";
import { formatMoney } from "./money.js";
import { customerReachable } from "./phoneVerify.service.js";
import { toNumber } from "./pricing.js";
import type { ShopOrderEventType } from "./shopEvents.constants.js";
import type { ShopAttribution, ShopNotificationEvent } from "./shop.types.js";
import { inStoreCheckout } from "./checkoutVia.js";
import { contactFields, primaryIdentities } from "../../contacts/identity/contactFields.js";

export type { ShopOrderEventType } from "./shopEvents.constants.js";

export const checkoutUrl = (token: string) => `${FRONTEND_URL}/c/${token}`;
export const storefrontUrl = (slug: string) => `${FRONTEND_URL}/s/${slug}`;

const INTEGRATION_STATUS: Partial<Record<ShopOrderEventType, OrderEventStatus>> = {
  placed: "created",
  paid: "paid",
  shipped: "partially_fulfilled",
  delivered: "fulfilled",
  cancelled: "cancelled",
  refunded: "refunded",
};

type LoadedOrder = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;

function loadOrder(orderId: string) {
  return prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: {
      store: true,
      items: true,
      shipments: { orderBy: { createdAt: "desc" }, take: 1 },
      contact: { select: primaryIdentities },
    },
  });
}

const money = (o: LoadedOrder, n: unknown) => formatMoney(toNumber(n as number), o.currency);
const first = (name: string | null) => (name ? name.split(" ")[0] : "there");

/**
 * Which catalog message an order event becomes, or null when it sends nothing. A placed
 * order is told different things depending on how it is being paid.
 */
export function messageKeyFor(
  o: LoadedOrder,
  type: ShopOrderEventType,
): ShopNotificationEvent | null {
  if (type !== "placed") return type;
  if (o.paymentStatus === "COD_PENDING") return o.store.codConfirm ? "cod_confirm" : "placed";
  if (o.paymentMethod === "bank") return "bank_transfer";
  return null;
}

function bankLines(o: LoadedOrder) {
  const bank = (o.store.bankDetails ?? {}) as Record<string, string | undefined>;
  const details = [
    bank.accountName && `Account name: ${bank.accountName}`,
    bank.accountNumber && `Account number: ${bank.accountNumber}`,
    bank.bankName && `Bank: ${bank.bankName}`,
    bank.routingCode && `Routing / sort code: ${bank.routingCode}`,
  ].filter(Boolean);
  return { details: details.join("\n"), instructions: bank.instructions ?? "" };
}

/** The named values an order's messages draw on, before the catalog orders them. */
function orderValues(o: LoadedOrder, key: ShopNotificationEvent): ShopParamValues {
  const shipment = o.shipments[0];
  const bank = key === "bank_transfer" ? bankLines(o) : null;
  return {
    name: first(o.customerName),
    orderNumber: `#${o.number}`,
    total: money(o, o.total),
    trackingUrl: shipment?.trackingUrl ?? "",
    carrier: shipment?.carrier ?? "",
    cancelReason: o.cancelReason ?? "",
    bankDetails: bank?.details,
    bankInstructions: bank?.instructions,
    storeName: o.store.name,
    orderLink: o.checkoutToken ? checkoutUrl(o.checkoutToken) : "",
    items: o.items
      .map((i) => `${i.quantity} × ${i.title}${i.variantTitle ? ` (${i.variantTitle})` : ""}`)
      .join(", "),
    deliveryAddress: addressLines(o.shippingAddress).join(", "),
  };
}

/** The buttons and links a message carries besides its words. */
function messageExtras(o: LoadedOrder, key: ShopNotificationEvent): Partial<ShopMessage> {
  switch (key) {
    case "cod_confirm": {
      const buttons = [
        { id: `shop_cod_confirm:${o.id}`, title: "Confirm order" },
        { id: `shop_cod_cancel:${o.id}`, title: "Cancel" },
      ];
      const pct = toNumber(o.store.codPrepaidDiscountPct);
      if (pct > 0)
        buttons.splice(1, 0, { id: `shop_cod_prepay:${o.id}`, title: `Pay online, ${pct}% off` });
      return { buttons };
    }
    case "paid":
      return o.checkoutToken
        ? { cta: { label: "View order", url: checkoutUrl(o.checkoutToken) } }
        : {};
    case "shipped": {
      const tracking = o.shipments[0]?.trackingUrl;
      return tracking ? { cta: { label: "Track parcel", url: tracking } } : {};
    }
    default:
      return {};
  }
}

/**
 * What the customer is told for an event: the store's words for that message, or the
 * catalog's. Null means the event sends nothing.
 */
export function customerMessage(
  o: LoadedOrder,
  type: ShopOrderEventType,
): { key: ShopNotificationEvent; message: ShopMessage } | null {
  const key = messageKeyFor(o, type);
  if (!key) return null;
  const params = paramsFor(key, orderValues(o, key));
  const { body } = notificationSetting(o.store.notifications, key);
  return {
    key,
    message: {
      text: renderShopBody(body, params),
      templateParams: params,
      ...messageExtras(o, key),
    },
  };
}

function platformOf(channel: LoadedOrder["channel"]) {
  if (channel === "INSTAGRAM") return "INSTAGRAM" as const;
  if (channel === "MESSENGER") return "FACEBOOK" as const;
  return "WHATSAPP" as const;
}

export async function notifyCustomer(o: LoadedOrder, type: ShopOrderEventType) {
  if (!customerReachable(o)) {
    await prisma.shopOrderEvent.create({
      data: {
        orderId: o.id,
        type: "message_not_sent",
        message: `Customer not messaged (${type.replace(/_/g, " ")}): the number isn't confirmed yet`,
      },
    });
    return;
  }
  const built = customerMessage(o, type);
  if (!built) return;
  const { key, message } = built;
  const setting = notificationSetting(o.store.notifications, key);
  if (!setting.enabled) return;
  const outcome = await sendShopMessage(
    {
      orgId: o.orgId,
      channel: o.channel,
      channelAccountId: o.channelAccountId,
      contactId: o.contactId,
      phone: o.customerPhone,
    },
    message,
    setting.template,
  );
  if (!outcome.sent) {
    const why = {
      no_recipient: "no way to reach the customer",
      window_closed: "the 24-hour window is closed and no template is set for this update",
      disabled: "turned off",
      failed: outcome.detail ?? "the channel refused it",
    }[outcome.reason];
    await prisma.shopOrderEvent.create({
      data: {
        orderId: o.id,
        type: "message_not_sent",
        message: `Customer not messaged (${type.replace(/_/g, " ")}): ${why}`,
      },
    });
  }
}

/**
 * Everything that follows an order changing state. Each part is isolated: a failed message
 * or a down integration never undoes the state change, which the caller already committed.
 */
export async function onShopOrderEvent(orderId: string, type: ShopOrderEventType) {
  const o = await loadOrder(orderId);
  if (!o) return;
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (err) {
      log.warn({ err, orderId, type, step: name }, "Shop order follow-up failed");
    }
  };

  await step("notify", () => notifyCustomer(o, type));

  if (type === "paid" || type === "cancelled") {
    await step("disarm", async () => {
      await disarmShopReminders(o.id, "cart", 5);
      await disarmShopReminders(o.id, "payment", 3);
      await disarmShopReminders(o.id, "cod_expire", 1);
      await disarmShopReminders(o.id, "bank_expire", 1);
    });
  }
  if (type === "placed" || type === "paid") {
    if (
      !inStoreCheckout(o.checkoutVia) &&
      (o.store.mode === "SHOPIFY" || o.store.mode === "WOOCOMMERCE")
    )
      await step("writeback", () => enqueueStoreWriteBack(o.id, type));
  }
  if (type === "paid") {
    await step("loyalty", async () => (await import("./shopLoyalty.js")).earnForOrder(o.id));
    if (o.store.invoiceAutoSend && !inStoreCheckout(o.checkoutVia)) {
      await step("invoice", () => enqueueInvoice(o.id));
    }
    if ((o.attribution as ShopAttribution | null)?.kind === "ctwa_ad") {
      await step("ad_conversion", () => enqueueAdConversion(o.id));
    }
  }
  if (type === "placed" && o.paymentStatus === "COD_PENDING" && o.store.codConfirm) {
    await step("cod_expiry", async () => {
      const { armShopReminder } = await import("../../../workers/bullmq/queues/shop.queue.js");
      await armShopReminder(
        o.id,
        "cod_expire",
        0,
        new Date(Date.now() + o.store.codConfirmHours * 3_600_000),
      );
    });
  }
  if (type === "placed" && o.paymentMethod === "bank" && o.paymentStatus !== "PAID") {
    await step("bank_expiry", async () => {
      const { armShopReminder } = await import("../../../workers/bullmq/queues/shop.queue.js");
      await armShopReminder(
        o.id,
        "bank_expire",
        0,
        new Date(Date.now() + o.store.bankTransferHours * 3_600_000),
      );
    });
  }
  if (type === "delivered") {
    await step("review", async () =>
      (await import("./recovery.service.js")).armReviewRequest(o.id),
    );
  }

  // Raised here for every RateUp order, store checkouts too: the store's echo of an order
  // RateUp created raises nothing (integrations/commerce/orders.ts).
  const status = INTEGRATION_STATUS[type];
  if (status) {
    await step("integrations", async () => {
      const { emitIntegrationEvent } =
        await import("../../integrations/events/emitIntegrationEvent.js");
      await emitIntegrationEvent(o.orgId, {
        type: `order.${status}`,
        order: {
          provider: "rateup",
          storeId: o.storeId,
          orderId: o.id,
          status,
          customer: { phone: o.customerPhone, email: o.customerEmail },
          amount: toNumber(o.total),
          productIds: o.items.map((i) => i.productId).filter((id): id is string => !!id),
        },
      });
    });
  }

  // Automations message the customer too, so an unproven storefront number gets none.
  await step("automation", async () => {
    if (!customerReachable(o)) return;
    const phone = o.customerPhone ?? contactFields(o.contact?.identities).phone ?? null;
    const { checkAndExecuteRuleByTriggerEvent } =
      await import("../../automation/rules/rules.utils.js");
    await checkAndExecuteRuleByTriggerEvent(TriggerEvent.SHOP_ORDER_EVENT, {
      orgId: o.orgId,
      phone,
      contactId: o.contactId ?? undefined,
      shopOrderEvent: type,
      shopProductIds: o.items.map((i) => i.productId).filter((id): id is string => !!id),
      platform: platformOf(o.channel),
    });
  });

  await step("live", async () => {
    const { publisher, WS_CHANNEL } = await import("../../../workers/shared/ws.publisher.js");
    await publisher.publish(
      WS_CHANNEL,
      JSON.stringify({
        orgId: o.orgId,
        roleFilter: "main",
        data: {
          type: "shop_order",
          event: type,
          orderId: o.id,
          number: o.number,
          contactId: o.contactId,
          status: o.status,
          paymentStatus: o.paymentStatus,
          fulfillmentStatus: o.fulfillmentStatus,
        },
      }),
    );
  });
}
