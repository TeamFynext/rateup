import "@shopify/shopify-api/adapters/node";
import { DeliveryMethod, WebhookHandler } from "@shopify/shopify-api";
import { log } from "../../../utils/logger.js";
import { webhookQueue } from "../../../workers/bullmq/queues/index.js";
import { updateShopifySessionScope } from "./shopify.session.js";

//callbackhandlers only working if added in same file. find out why?
async function draftOrderCreateHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  webhookId: string,
  _apiVersion?: string,
  _context?: unknown,
) {
  log.info(`handling webhook ${topic} for ${shop} shop`);
  const webhookRequestBodyJson = JSON.parse(webhookRequestBody);
  const webhook = {
    topic,
    webhookId,
    body: webhookRequestBodyJson,
    shop,
  };
  await webhookQueue.add("process-webhook", webhook, { jobId: webhookId });
}

export async function orderCreateHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  webhookId: string,
  _apiVersion?: string,
  _context?: unknown,
) {
  log.info(`handling webhook ${topic} for ${shop} shop`);
  const webhookRequestBodyJson = JSON.parse(webhookRequestBody);
  const webhook = {
    topic,
    webhookId,
    body: webhookRequestBodyJson,
    shop,
  };
  await webhookQueue.add("process-webhook", webhook, { jobId: webhookId });
}

export async function appUninstalledHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  webhookId: string,
  _apiVersion?: string,
  _context?: unknown,
) {
  log.info(`handling webhook ${topic} for ${shop} shop`);
  const webhookRequestBodyJson = JSON.parse(webhookRequestBody);
  const webhook = {
    topic,
    webhookId,
    body: webhookRequestBodyJson,
    shop,
  };
  await webhookQueue.add("process-webhook", webhook, { jobId: webhookId });
}

export async function orderCancelledHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  webhookId: string,
  _apiVersion?: string,
  _context?: unknown,
) {
  log.info(`handling webhook ${topic} for ${shop} shop`);
  const webhookRequestBodyJson = JSON.parse(webhookRequestBody);
  const webhook = {
    topic,
    webhookId,
    body: webhookRequestBodyJson,
    shop,
  };
  await webhookQueue.add("process-webhook", webhook, { jobId: webhookId });
}

export async function orderFulFilledHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  webhookId: string,
  _apiVersion?: string,
  _context?: unknown,
) {
  log.info(`handling webhook ${topic} for ${shop} shop`);
  const webhookRequestBodyJson = JSON.parse(webhookRequestBody);
  const webhook = {
    topic,
    webhookId,
    body: webhookRequestBodyJson,
    shop,
  };
  await webhookQueue.add("process-webhook", webhook, { jobId: webhookId });
}

export async function orderPaidHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  webhookId: string,
  _apiVersion?: string,
  _context?: unknown,
) {
  log.info(`handling webhook ${topic} for ${shop} shop`);
  const webhookRequestBodyJson = JSON.parse(webhookRequestBody);
  const webhook = {
    topic,
    webhookId,
    body: webhookRequestBodyJson,
    shop,
  };
  await webhookQueue.add("process-webhook", webhook, { jobId: webhookId });
}
export async function orderPartiallyFulfilledHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  webhookId: string,
  _apiVersion?: string,
  _context?: unknown,
) {
  log.info(`handling webhook ${topic} for ${shop} shop`);
  const webhookRequestBodyJson = JSON.parse(webhookRequestBody);
  const webhook = {
    topic,
    webhookId,
    body: webhookRequestBodyJson,
    shop,
  };
  await webhookQueue.add("process-webhook", webhook, { jobId: webhookId });
}
export async function fulfillmentOrderCancelledHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  webhookId: string,
  _apiVersion?: string,
  _context?: unknown,
) {
  log.info(`handling webhook ${topic} for ${shop} shop`);
  const webhookRequestBodyJson = JSON.parse(webhookRequestBody);
  const webhook = {
    topic,
    webhookId,
    body: webhookRequestBodyJson,
    shop,
  };
  await webhookQueue.add("process-webhook", webhook, { jobId: webhookId });
}

export async function refundCreateHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  webhookId: string,
  _apiVersion?: string,
  _context?: unknown,
) {
  log.info(`handling webhook ${topic} for ${shop} shop`);
  const webhookRequestBodyJson = JSON.parse(webhookRequestBody);
  const webhook = {
    topic,
    webhookId,
    body: webhookRequestBodyJson,
    shop,
  };
  await webhookQueue.add("process-webhook", webhook, { jobId: webhookId });
}

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

/** Queues the topic for `handleWebhook`, deduped on Shopify's webhook id. */
async function enqueueWebhookHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  webhookId: string,
  _apiVersion?: string,
  _context?: unknown,
) {
  log.info(`handling webhook ${topic} for ${shop} shop`);
  const webhook = { topic, webhookId, body: JSON.parse(webhookRequestBody), shop };
  await webhookQueue.add("process-webhook", webhook, { jobId: webhookId });
}

// The stored abandoned checkouts are this app's customer data to redact.
export const customersRedactHandler = enqueueWebhookHandler;
export const shopRedactRequestHandler = enqueueWebhookHandler;

export async function appSubscriptionUpdateHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  webhookId: string,
  _apiVersion?: string,
  _context?: unknown,
) {
  log.info(`handling webhook ${topic} for ${shop} shop`);
  const webhookRequestBodyJson = JSON.parse(webhookRequestBody);
  const webhook = {
    topic,
    webhookId,
    body: webhookRequestBodyJson,
    shop,
  };
  await webhookQueue.add("process-webhook", webhook, { jobId: webhookId });
}

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
