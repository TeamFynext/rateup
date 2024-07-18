import "@shopify/shopify-api/adapters/node";
import { DeliveryMethod, WebhookHandler } from "@shopify/shopify-api";
import {
  createScheduleOnShopifyEvent,
  getShopifySession,
  updateShopifySession,
} from "./shopify.service";
import { ShopifyEvents } from "../../types/enums";
import { log } from "../../utils/logger";

//callbackhandlers only working if added in same file. find out why?
async function draftOrderCreateHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  webhookId: string,
  apiVersion: string,
  context?: any,
) {
  log.info(`handling webhook ${topic} for ${shop} shop`);
  const session = await getShopifySession(shop);
  const webhookRequestBodyJson = JSON.parse(webhookRequestBody);
  const customerPhone =
    webhookRequestBodyJson?.customer?.phone ||
    webhookRequestBodyJson?.customer?.default_address?.phone;
  webhookRequestBodyJson?.billing_address?.phone ||
    webhookRequestBodyJson?.shipping_address?.phone;
  const productIds = webhookRequestBodyJson.line_items?.map(
    (products) => products?.product_id?.toString(),
  );
  if (customerPhone)
    await createScheduleOnShopifyEvent(
      customerPhone,
      ShopifyEvents.DRAFT_ORDERS_CREATE,
      session,
      productIds,
      webhookId,
    );
}

export async function orderCreateHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  webhookId: string,
  apiVersion: string,
  context?: any,
) {
  log.info(`handling webhook ${topic} for ${shop} shop`);
  const session = await getShopifySession(shop);
  const webhookRequestBodyJson = JSON.parse(webhookRequestBody);
  const customerPhone =
    webhookRequestBodyJson?.customer?.phone ||
    webhookRequestBodyJson?.customer?.default_address?.phone;
  webhookRequestBodyJson?.billing_address?.phone ||
    webhookRequestBodyJson?.shipping_address?.phone;
  const productIds = webhookRequestBodyJson.line_items?.map(
    (products) => products?.product_id?.toString(),
  );
  if (customerPhone)
    await createScheduleOnShopifyEvent(
      customerPhone,
      ShopifyEvents.ORDERS_CREATE,
      session,
      productIds,
      webhookId,
    );
}

export async function appUninstalledHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  webhookId: string,
  apiVersion: string,
  context?: any,
) {
  log.info(`handling webhook ${topic} for ${shop} shop`);
  await updateShopifySession(shop, { active: false });
}

export async function orderCancelledHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  webhookId: string,
  apiVersion: string,
  context?: any,
) {
  log.info(`handling webhook ${topic} for ${shop} shop`);
  const session = await getShopifySession(shop);
  const webhookRequestBodyJson = JSON.parse(webhookRequestBody);
  const customerPhone =
    webhookRequestBodyJson?.customer?.phone ||
    webhookRequestBodyJson?.customer?.default_address?.phone;
  webhookRequestBodyJson?.billing_address?.phone ||
    webhookRequestBodyJson?.shipping_address?.phone;
  const productIds = webhookRequestBodyJson.line_items?.map(
    (products) => products?.product_id?.toString(),
  );
  if (customerPhone)
    await createScheduleOnShopifyEvent(
      customerPhone,
      ShopifyEvents.ORDERS_CREATE,
      session,
      productIds,
      webhookId,
    );
}

export async function orderFulFilledHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  webhookId: string,
  apiVersion: string,
  context?: any,
) {
  log.info(`handling webhook ${topic} for ${shop} shop`);
  const session = await getShopifySession(shop);
  const webhookRequestBodyJson = JSON.parse(webhookRequestBody);
  const customerPhone =
    webhookRequestBodyJson?.customer?.phone ||
    webhookRequestBodyJson?.customer?.default_address?.phone;
  webhookRequestBodyJson?.billing_address?.phone ||
    webhookRequestBodyJson?.shipping_address?.phone;
  const productIds = webhookRequestBodyJson.line_items?.map(
    (products) => products?.product_id?.toString(),
  );
  if (customerPhone)
    await createScheduleOnShopifyEvent(
      customerPhone,
      ShopifyEvents.ORDERS_CREATE,
      session,
      productIds,
      webhookId,
    );
}

export async function orderPaidHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  webhookId: string,
  apiVersion: string,
  context?: any,
) {
  log.info(`handling webhook ${topic} for ${shop} shop`);
  const session = await getShopifySession(shop);
  const webhookRequestBodyJson = JSON.parse(webhookRequestBody);
  const customerPhone =
    webhookRequestBodyJson?.customer?.phone ||
    webhookRequestBodyJson?.customer?.default_address?.phone;
  webhookRequestBodyJson?.billing_address?.phone ||
    webhookRequestBodyJson?.shipping_address?.phone;
  const productIds = webhookRequestBodyJson.line_items?.map(
    (products) => products?.product_id?.toString(),
  );
  if (customerPhone)
    await createScheduleOnShopifyEvent(
      customerPhone,
      ShopifyEvents.ORDERS_CREATE,
      session,
      productIds,
      webhookId,
    );
}
export async function orderPartiallyFulfilledHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  webhookId: string,
  apiVersion: string,
  context?: any,
) {
  log.info(`handling webhook ${topic} for ${shop} shop`);
  const session = await getShopifySession(shop);
  const webhookRequestBodyJson = JSON.parse(webhookRequestBody);
  const customerPhone =
    webhookRequestBodyJson?.customer?.phone ||
    webhookRequestBodyJson?.customer?.default_address?.phone;
  webhookRequestBodyJson?.billing_address?.phone ||
    webhookRequestBodyJson?.shipping_address?.phone;
  const productIds = webhookRequestBodyJson.line_items?.map(
    (products) => products?.product_id?.toString(),
  );
  if (customerPhone)
    await createScheduleOnShopifyEvent(
      customerPhone,
      ShopifyEvents.ORDERS_CREATE,
      session,
      productIds,
      webhookId,
    );
}
export async function fulfillmentOrderCancelledHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  webhookId: string,
  apiVersion: string,
  context?: any,
) {
  log.info(`handling webhook ${topic} for ${shop} shop`);
  const session = await getShopifySession(shop);
  const webhookRequestBodyJson = JSON.parse(webhookRequestBody);
}

//callbackroutes
const webhookHandlers: Record<string, WebhookHandler[]> = {
  ORDERS_CREATE: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/api/shopify/webhooks",
      callback: orderCreateHandler,
    },
  ],
  APP_UNINSTALLED: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/api/shopify/webhooks",
      callback: appUninstalledHandler,
    },
  ],
  DRAFT_ORDERS_CREATE: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/api/shopify/webhooks",
      callback: draftOrderCreateHandler,
    },
  ],
  ORDERS_FULFILLED: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/api/shopify/webhooks",
      callback: orderFulFilledHandler,
    },
  ],
  ORDERS_PAID: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/api/shopify/webhooks",
      callback: orderPaidHandler,
    },
  ],
  ORDERS_CANCELLED: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/api/shopify/webhooks",
      callback: orderCancelledHandler,
    },
  ],
  ORDERS_PARTIALLY_FULFILLED: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/api/shopify/webhooks",
      callback: orderPartiallyFulfilledHandler,
    },
  ],
  FULFILLMENT_ORDERS_CANCELLED: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/api/shopify/webhooks",
      callback: fulfillmentOrderCancelledHandler,
    },
  ],

  // VARIANTS_IN_STOCK
  // VARIANTS_OUT_OF_STOCK
  // FULFILLMENT_ORDERS_CANCELLATION_REQUEST_SUBMITTED
};

export default webhookHandlers;
