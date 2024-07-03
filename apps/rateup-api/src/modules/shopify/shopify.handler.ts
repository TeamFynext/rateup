import "@shopify/shopify-api/adapters/node";
import { DeliveryMethod, WebhookHandler } from "@shopify/shopify-api";
import { deleteShopifySession, getShopifySession } from "./shopify.service";

//callbackhandlers only working if added in same file. find out why?
async function draftOrderCreateHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  webhookId: string,
  apiVersion: string,
  context?: any,
) {
  console.log("in OrderCreateHandler");
  const session = await getShopifySession(shop);
  console.log("session", session);
  console.log("topic", topic);
  console.log("webhookId", webhookId);
  console.log("context", context);
  console.log("webhookRequestBody", webhookRequestBody);
  //TODO: on order created
}

export async function orderCreateHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  webhookId: string,
  apiVersion: string,
  context?: any,
) {
  console.log("in OrderCreateHandler");
  const session = await getShopifySession(shop);
  console.log("session", session);
  console.log("topic", topic);
  console.log("webhookId", webhookId);
  console.log("context", context);
  console.log("webhookRequestBody", webhookRequestBody);
  //TODO: on order created
}

export async function appUninstalledHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  webhookId: string,
  apiVersion: string,
  context?: any,
) {
  console.log("in appUninstalledHandler");
  const session = await deleteShopifySession(shop);
  console.log("session", session);
  console.log("topic", topic);
  console.log("webhookId", webhookId);
  console.log("context", context);
  console.log("webhookRequestBody", webhookRequestBody);
  //TODO: on order created
}

export async function cartUpdateHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  webhookId: string,
  apiVersion: string,
  context?: any,
) {
  console.log("in cartUpdateHandler");
  const session = await getShopifySession(shop);
  console.log("session", session);
  console.log("topic", topic);
  console.log("webhookId", webhookId);
  console.log("context", context);
  console.log("webhookRequestBody", webhookRequestBody);
  //TODO: on order created
}

export async function cartCreateHandler(
  topic: string,
  shop: string,
  webhookRequestBody: string,
  webhookId: string,
  apiVersion: string,
  context?: any,
) {
  console.log("in cartCreateHandler");
  const session = await getShopifySession(shop);
  console.log("session", session);
  console.log("topic", topic);
  console.log("webhookId", webhookId);
  console.log("context", context);
  console.log("webhookRequestBody", webhookRequestBody);
  //TODO: on order created
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
  CARTS_CREATE: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/api/shopify/webhooks",
      callback: cartCreateHandler,
    },
  ],
  CARTS_UPDATE: [
    {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/api/shopify/webhooks",
      callback: cartUpdateHandler,
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
};

export default webhookHandlers;
