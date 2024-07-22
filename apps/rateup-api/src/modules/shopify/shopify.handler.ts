import "@shopify/shopify-api/adapters/node";
import { DeliveryMethod, WebhookHandler } from "@shopify/shopify-api";
import {
  createScheduleOnShopifyEvent,
  getShopifySchedules,
  getShopifySession,
  updateShopifySession,
} from "./shopify.service";
import { ShopifyEvents } from "../../types/enums";
import { log } from "../../utils/logger";
import shopify from "./shopify.config";

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
  const existingSchedules = await getShopifySchedules(session.orgId);
  if (existingSchedules.find((schedule) => schedule.webhookId === webhookId)) {
    log.trace(`webhook with ${webhookId} already recieved`);
    return;
  }
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
  const existingSchedules = await getShopifySchedules(session.orgId);
  if (existingSchedules.find((schedule) => schedule.webhookId === webhookId)) {
    log.trace(`webhook with ${webhookId} already recieved`);
    return;
  }
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
  const existingSchedules = await getShopifySchedules(session.orgId);
  if (existingSchedules.find((schedule) => schedule.webhookId === webhookId)) {
    log.trace(`webhook with ${webhookId} already recieved`);
    return;
  }
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
  const existingSchedules = await getShopifySchedules(session.orgId);
  if (existingSchedules.find((schedule) => schedule.webhookId === webhookId)) {
    log.trace(`webhook with ${webhookId} already recieved`);
    return;
  }
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
  const existingSchedules = await getShopifySchedules(session.orgId);
  if (existingSchedules.find((schedule) => schedule.webhookId === webhookId)) {
    log.trace(`webhook with ${webhookId} already recieved`);
    return;
  }
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
  const existingSchedules = await getShopifySchedules(session.orgId);
  if (existingSchedules.find((schedule) => schedule.webhookId === webhookId)) {
    log.trace(`webhook with ${webhookId} already recieved`);
    return;
  }
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
  const existingSchedules = await getShopifySchedules(session.orgId);
  if (existingSchedules.find((schedule) => schedule.webhookId === webhookId)) {
    log.trace(`webhook with ${webhookId} already recieved`);
    return;
  }
  const webhookRequestBodyJson = JSON.parse(webhookRequestBody);
  const fulfillmentOrderGId = webhookRequestBodyJson.fulfillment_order.id;
  const gidArray = fulfillmentOrderGId.split("/");
  const fulfillmentOrderId = parseInt(gidArray[gidArray.length - 1]);
  const fulfillmentOrder = await shopify.rest.FulfillmentOrder.find({
    session,
    id: fulfillmentOrderId,
    include_order_reference_fields: true,
  });
  if (!fulfillmentOrder) return;
  const orderDetails = await shopify.rest.Order.find({
    session,
    id: fulfillmentOrder.order_id,
  });
  if (!orderDetails) return;
  const customerPhone =
    orderDetails.customer.phone ||
    orderDetails.customer.default_address.phone ||
    orderDetails.billing_address.phone ||
    orderDetails.shipping_address.phone;
  const productIds = fulfillmentOrder.line_items.map((product) =>
    product.product_id.toString(),
  );
  if (customerPhone)
    await createScheduleOnShopifyEvent(
      customerPhone,
      ShopifyEvents.FULFILLMENT_ORDERS_CANCELLED,
      session,
      productIds,
      webhookId,
    );
}

export async function customersDataRequestHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  webhookId: string,
  apiVersion: string,
  context?: any,
) {
  log.info(`handling webhook ${topic} for ${shop} shop`);
}

export async function customersRedactHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  webhookId: string,
  apiVersion: string,
  context?: any,
) {
  log.info(`handling webhook ${topic} for ${shop} shop`);
}
export async function shopRedactRequestHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  webhookId: string,
  apiVersion: string,
  context?: any,
) {
  log.info(`handling webhook ${topic} for ${shop} shop`);
}

//callbackroutes

export const defaultWebhookHandlers: Record<string, WebhookHandler[]> = {
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
  CUSTOMERS_DATA_REQUEST: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/api/shopify/webhooks",
      callback: customersDataRequestHandler,
    },
  ],
  CUSTOMERS_REDACT: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/api/shopify/webhooks",
      callback: customersRedactHandler,
    },
  ],
  SHOP_REDACT: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/api/shopify/webhooks",
      callback: shopRedactRequestHandler,
    },
  ],
};

const newWebhookHandlers: Record<string, WebhookHandler[]> = {
  // VARIANTS_IN_STOCK
  // VARIANTS_OUT_OF_STOCK
  // FULFILLMENT_ORDERS_CANCELLATION_REQUEST_SUBMITTED
};

const webhookHandlers = { ...defaultWebhookHandlers, ...newWebhookHandlers };

export default webhookHandlers;
