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
import { formatMoney } from "./money.js";
import { customerReachable } from "./phoneVerify.service.js";
import { toNumber } from "./pricing.js";
import type { ShopOrderEventType } from "./shopEvents.constants.js";
import type { ShopAttribution, ShopNotificationEvent } from "./shop.types.js";
import { inStoreCheckout } from "./checkoutVia.js";
import { contactFields, primaryIdentities } from "../../contact/identity/contactFields.js";

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

/** Events that message the customer unless the store turned them off. Packed is off by default. */
const DEFAULT_OFF = new Set<ShopNotificationEvent>(["packed"]);

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

/** What the customer is told for each event. Null means nothing is sent. */
export function customerMessage(o: LoadedOrder, type: ShopOrderEventType): ShopMessage | null {
  const n = `#${o.number}`;
  const tracking = o.shipments[0]?.trackingUrl ?? null;
  const params = [first(o.customerName), n, money(o, o.total)];
  switch (type) {
    case "placed": {
      if (o.paymentStatus === "COD_PENDING" && o.store.codConfirm) {
        const buttons = [
          { id: `shop_cod_confirm:${o.id}`, title: "Confirm order" },
          { id: `shop_cod_cancel:${o.id}`, title: "Cancel" },
        ];
        const pct = toNumber(o.store.codPrepaidDiscountPct);
        if (pct > 0)
          buttons.splice(1, 0, { id: `shop_cod_prepay:${o.id}`, title: `Pay online, ${pct}% off` });
        return {
          text: `Hi ${first(o.customerName)}, please confirm your cash on delivery order ${n} for ${money(o, o.total)}. We'll pack it as soon as you confirm.`,
          buttons,
          templateParams: params,
        };
      }
      if (o.paymentStatus === "COD_PENDING") {
        return {
          text: `Order ${n} is confirmed. Please keep ${money(o, o.total)} ready for the delivery.`,
          templateParams: params,
        };
      }
      if (o.paymentMethod === "bank") {
        const bank = (o.store.bankDetails ?? {}) as Record<string, string | undefined>;
        const lines = [
          bank.accountName && `Account name: ${bank.accountName}`,
          bank.accountNumber && `Account number: ${bank.accountNumber}`,
          bank.bankName && `Bank: ${bank.bankName}`,
          bank.routingCode && `Routing / sort code: ${bank.routingCode}`,
        ].filter(Boolean);
        return {
          text: `Order ${n} is reserved. Please transfer ${money(o, o.total)} to:\n${lines.join("\n")}\n\nUse ${n} as the reference.${bank.instructions ? `\n${bank.instructions}` : ""}`,
          templateParams: params,
        };
      }
      return null;
    }
    case "paid":
      return {
        text: `Payment received — thank you! Order ${n} is confirmed and we'll let you know when it ships.`,
        cta: o.checkoutToken
          ? { label: "View order", url: checkoutUrl(o.checkoutToken) }
          : undefined,
        templateParams: params,
      };
    case "cod_confirmed":
      return {
        text: `Thanks! Order ${n} is confirmed. We'll message you when it ships.`,
        templateParams: params,
      };
    case "packed":
      return { text: `Order ${n} is packed and will ship soon.`, templateParams: params };
    case "shipped":
      return {
        text: `Your order ${n} is on its way.${o.shipments[0]?.carrier ? ` Carrier: ${o.shipments[0].carrier}.` : ""}`,
        cta: tracking ? { label: "Track parcel", url: tracking } : undefined,
        templateParams: [...params, tracking ?? ""],
      };
    case "out_for_delivery":
      return { text: `Order ${n} is out for delivery today.`, templateParams: params };
    case "delivered":
      return {
        text: `Order ${n} has been delivered. We hope you love it!`,
        templateParams: params,
      };
    case "delivery_failed":
      return {
        text: `We couldn't deliver order ${n}. Reply here with a good time or address and we'll arrange it.`,
        templateParams: params,
      };
    case "cancelled":
      return {
        text: `Order ${n} has been cancelled.${o.cancelReason ? ` Reason: ${o.cancelReason}.` : ""}`,
        templateParams: params,
      };
    case "refunded":
      return {
        text: `We've refunded order ${n}. It can take a few days to show on your statement.`,
        templateParams: params,
      };
  }
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
  const event = type === "cod_confirmed" ? "paid" : (type as ShopNotificationEvent);
  const setting = notificationSetting(o.store.notifications, event);
  const enabled =
    (o.store.notifications as Record<string, { enabled?: boolean }> | null)?.[event]?.enabled ??
    !DEFAULT_OFF.has(event);
  if (!enabled) return;
  const message = customerMessage(o, type);
  if (!message) return;
  const outcome = await sendShopMessage(
    {
      orgId: o.orgId,
      channel: o.channel,
      channelAccountId: o.channelAccountId,
      contactId: o.contactId,
      phone: o.customerPhone,
    },
    message,
    setting.waTemplateId,
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
      await import("../../whatsapp/automatedReply/wa_automatedReply.utils.js");
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
