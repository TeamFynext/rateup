import "@shopify/shopify-api/adapters/node";
import { DeliveryMethod, WebhookHandler } from "@shopify/shopify-api";
import { log } from "../../../utils/logger.js";
import { webhookQueue } from "../../../workers/bullmq/queues/index.js";
import { updateShopifySessionScope } from "./shopify.session.js";

/**
 * The shop a signed body names, when its topic carries one: the app/uninstalled Shop
 * resource (`myshopify_domain`) and the compliance topics (`shop_domain`). Order,
 * checkout and refund bodies do not name the shop.
 */
function shopNamedInBody(body: Record<string, unknown>): string | undefined {
  const named = body.myshopify_domain ?? body.shop_domain;
  return typeof named === "string" ? named : undefined;
}

/**
 * Queues the topic for `handleWebhook`, deduped on Shopify's webhook id.
 *
 * `X-Shopify-Shop-Domain` (our `shop`) sits outside the HMAC, which covers only the
 * body. Where the body names its own shop the two must agree, so a captured signed
 * body cannot be replayed with the header pointed at another shop. Topics whose body
 * names no shop cannot be checked this way; there the webhook id dedup is what stops
 * a replay of the same delivery.
 */
async function enqueueWebhookHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  webhookId: string,
  _apiVersion?: string,
  _context?: unknown,
) {
  log.info(`handling webhook ${topic} for ${shop} shop`);
  const body = JSON.parse(webhookRequestBody) as Record<string, unknown>;
  const named = shopNamedInBody(body);
  if (named !== undefined && named.toLowerCase() !== shop.toLowerCase()) {
    log.warn({ topic, shop, webhookId }, "Shopify webhook whose body names another shop dropped");
    return;
  }
  const webhook = { topic, webhookId, body, shop };
  await webhookQueue.add("process-webhook", webhook, { jobId: webhookId });
}

// Each topic has a name of its own so the handler map reads as a catalogue; all of
// them queue the same way. They live in this file because `webhooks.process` only
// dispatches to callbacks registered from here.
const draftOrderCreateHandler = enqueueWebhookHandler;

export const orderCreateHandler = enqueueWebhookHandler;

export const appUninstalledHandler = enqueueWebhookHandler;

export const orderCancelledHandler = enqueueWebhookHandler;

export const orderFulFilledHandler = enqueueWebhookHandler;

export const orderPaidHandler = enqueueWebhookHandler;
export const orderPartiallyFulfilledHandler = enqueueWebhookHandler;
export const fulfillmentOrderCancelledHandler = enqueueWebhookHandler;

export const refundCreateHandler = enqueueWebhookHandler;

export async function customersDataRequestHandler(
  topic: string,
  shop: string,
  _webhookRequestBody: string,
  _webhookId: string,
  _apiVersion?: string,
  _context?: unknown,
) {
  log.info(`handling webhook ${topic} for ${shop} shop`);
}

// The stored abandoned checkouts are this app's customer data to redact.
export const customersRedactHandler = enqueueWebhookHandler;
export const shopRedactRequestHandler = enqueueWebhookHandler;

export const appSubscriptionUpdateHandler = enqueueWebhookHandler;

export async function appScopesUpdateHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  _webhookId: string,
  _apiVersion?: string,
  _context?: unknown,
) {
  log.info(`handling webhook ${topic} for ${shop} shop`);
  const { current } = JSON.parse(webhookRequestBody) as { current?: string[] };
  if (Array.isArray(current)) await updateShopifySessionScope(shop, current);
}

//callbackroutes
export const WEBHOOK_API_ROUTE = "/api/public/integrations/shopify/webhooks";

/** Per-shop topics, subscribed through the Admin API when the merchant enables them. */
export const defaultWebhookHandlers: Record<string, WebhookHandler[]> = {
  ORDERS_CREATE: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: WEBHOOK_API_ROUTE,
      callback: orderCreateHandler,
    },
  ],
  DRAFT_ORDERS_CREATE: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: WEBHOOK_API_ROUTE,
      callback: draftOrderCreateHandler,
    },
  ],
  ORDERS_FULFILLED: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: WEBHOOK_API_ROUTE,
      callback: orderFulFilledHandler,
    },
  ],
  ORDERS_PAID: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: WEBHOOK_API_ROUTE,
      callback: orderPaidHandler,
    },
  ],
  ORDERS_CANCELLED: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: WEBHOOK_API_ROUTE,
      callback: orderCancelledHandler,
    },
  ],
  ORDERS_PARTIALLY_FULFILLED: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: WEBHOOK_API_ROUTE,
      callback: orderPartiallyFulfilledHandler,
    },
  ],
  FULFILLMENT_ORDERS_CANCELLED: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: WEBHOOK_API_ROUTE,
      callback: fulfillmentOrderCancelledHandler,
    },
  ],
  REFUNDS_CREATE: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: WEBHOOK_API_ROUTE,
      callback: refundCreateHandler,
    },
  ],
  CHECKOUTS_CREATE: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: WEBHOOK_API_ROUTE,
      callback: enqueueWebhookHandler,
    },
  ],
  CHECKOUTS_UPDATE: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: WEBHOOK_API_ROUTE,
      callback: enqueueWebhookHandler,
    },
  ],
  CHECKOUTS_DELETE: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: WEBHOOK_API_ROUTE,
      callback: enqueueWebhookHandler,
    },
  ],
};

/**
 * App-level topics. These are subscribed once for every shop through the
 * [webhooks] section of shopify.app.toml (`shopify app deploy`), not per shop
 * through the Admin API; they are listed here so `webhooks.process` can
 * dispatch them. The compliance topics can only be subscribed that way.
 */
export const mandatoryWebhookHandlers: Record<string, WebhookHandler[]> = {
  APP_SCOPES_UPDATE: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: WEBHOOK_API_ROUTE,
      callback: appScopesUpdateHandler,
    },
  ],
  APP_SUBSCRIPTIONS_UPDATE: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: WEBHOOK_API_ROUTE,
      callback: appSubscriptionUpdateHandler,
    },
  ],
  APP_UNINSTALLED: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: WEBHOOK_API_ROUTE,
      callback: appUninstalledHandler,
    },
  ],
  CUSTOMERS_DATA_REQUEST: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: WEBHOOK_API_ROUTE,
      callback: customersDataRequestHandler,
    },
  ],
  CUSTOMERS_REDACT: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: WEBHOOK_API_ROUTE,
      callback: customersRedactHandler,
    },
  ],
  SHOP_REDACT: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: WEBHOOK_API_ROUTE,
      callback: shopRedactRequestHandler,
    },
  ],
};

const newWebhookHandlers: Record<string, WebhookHandler[]> = {
  // VARIANTS_IN_STOCK
  // VARIANTS_OUT_OF_STOCK
  // FULFILLMENT_ORDERS_CANCELLATION_REQUEST_SUBMITTED
};

const webhookHandlers = {
  ...mandatoryWebhookHandlers,
  ...defaultWebhookHandlers,
  ...newWebhookHandlers,
};

export default webhookHandlers;
