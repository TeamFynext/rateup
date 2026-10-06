import {
  type CheckoutWebhookBody,
  type CustomerRedactBody,
  handleCheckoutDeleted,
  handleCheckoutWebhook,
  redactShopifyCustomer,
  redactShopifyShop,
} from "./shopify.checkouts.service.js";
import { ShopifyEvents } from "../../../types/enums.js";
import dayjs from "dayjs";
import { pauseOrg } from "../../org/org.services.js";
import { notify } from "../../notification/notify.js";
import {
  getShopifyIntegrationByShop,
  updateShopifyIntegrationByShop,
} from "./shopify.credential.js";
import { handleShopifyOrderEvents, handleShopifyRefundEvent } from "./shopify.orders.js";
import {
  type ShopifyAppSubscriptionWebhookPayload,
  handleSubscriptionUpdateFromShopify,
} from "./shopify.billing.js";
import type { ShopifyWebhookJobData } from "./shopify.types.js";

export async function handleWebhook(webhook: ShopifyWebhookJobData) {
  switch (webhook.topic) {
    case ShopifyEvents.APP_SUBSCRIPTIONS_UPDATE:
      // Narrowed by the topic this case matches.
      await handleSubscriptionUpdateFromShopify(
        webhook.shop,
        webhook.body as unknown as ShopifyAppSubscriptionWebhookPayload,
      );
      break;
    case ShopifyEvents.DRAFT_ORDERS_CREATE:
    case ShopifyEvents.ORDERS_CREATE:
    case ShopifyEvents.ORDERS_CANCELLED:
    case ShopifyEvents.ORDERS_PAID:
    case ShopifyEvents.ORDERS_PARTIALLY_FULFILLED:
    case ShopifyEvents.ORDERS_FULFILLED:
    case ShopifyEvents.FULFILLMENT_ORDERS_CANCELLED:
      await handleShopifyOrderEvents(webhook);
      break;
    case ShopifyEvents.REFUNDS_CREATE:
      await handleShopifyRefundEvent(webhook);
      break;
    // Each body is narrowed by the topic its case matches.
    case ShopifyEvents.CHECKOUTS_CREATE:
    case ShopifyEvents.CHECKOUTS_UPDATE:
      await handleCheckoutWebhook(webhook.shop, webhook.body as unknown as CheckoutWebhookBody);
      break;
    case ShopifyEvents.CHECKOUTS_DELETE:
      await handleCheckoutDeleted(webhook.shop, webhook.body);
      break;
    case ShopifyEvents.CUSTOMERS_REDACT:
      await redactShopifyCustomer(webhook.shop, webhook.body as unknown as CustomerRedactBody);
      break;
    case ShopifyEvents.SHOP_REDACT:
      await redactShopifyShop(webhook.shop);
      break;
    case ShopifyEvents.APP_UNINSTALLED:
      await handleShopifyAppUnistalled(webhook);
      break;
  }
}

export async function handleShopifyAppUnistalled(webhook: { shop: string }) {
  const { shop } = webhook;
  const shopifyInfo = await getShopifyIntegrationByShop(shop);
  if (!shopifyInfo) return;
  if (!shopifyInfo.org || !shopifyInfo.orgId) {
    await updateShopifyIntegrationByShop(shop, { active: false });
    return;
  }
  if (dayjs(shopifyInfo.org.createdAt).isBefore(dayjs(shopifyInfo.createdAt))) {
    await updateShopifyIntegrationByShop(shop, { active: false });
    await notify({
      event: "integration.error",
      orgId: shopifyInfo.orgId,
      audience: { kind: "permitted" },
      data: {
        integration: "Shopify",
        error: `The RateUp app was uninstalled from ${shop}. Reinstall it to keep syncing orders.`,
      },
    });
  } else {
    await pauseOrg(shopifyInfo.orgId, { isPaused: true });
  }
}
