import "@shopify/shopify-api/adapters/node";
import { DeliveryMethod, WebhookHandler } from "@shopify/shopify-api";
import { log } from "../../../utils/logger.js";
import { webhookQueue } from "../../../utils/redisConnection.js";

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

export async function customersRedactHandler(
  topic: string,
  shop: string,
  _webhookRequestBody: string,
  _webhookId: string,
  _apiVersion?: string,
  _context?: unknown,
) {
  log.info(`handling webhook ${topic} for ${shop} shop`);
}
export async function shopRedactRequestHandler(
  topic: string,
  shop: string,
  _webhookRequestBody: string,
  _webhookId: string,
  _apiVersion?: string,
  _context?: unknown,
) {
  log.info(`handling webhook ${topic} for ${shop} shop`);
}

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

//callbackroutes
export const WEBHOOK_API_ROUTE = "/api/public/integrations/shopify/webhooks";

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
};

export const mandatoryWebhookHandlers: Record<string, WebhookHandler[]> = {
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
