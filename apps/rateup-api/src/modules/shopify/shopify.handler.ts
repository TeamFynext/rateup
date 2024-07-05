import "@shopify/shopify-api/adapters/node";
import { DeliveryMethod, WebhookHandler } from "@shopify/shopify-api";
import {
  deleteShopifySession,
  getShopifySession,
  getShopipfySurveyByEvent,
} from "./shopify.service";
import { ShopifyEvents } from "../../types/enums";
import { sendFlow } from "../whatsapp/flows/flow.service";
import { json } from "stream/consumers";

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
  const webhookRequestBodyJson = JSON.parse(webhookRequestBody);
  console.log("webhookRequestBodyJson", webhookRequestBodyJson);
  const phone = webhookRequestBodyJson?.customer?.phone;
  console.log("phone", phone);

  const surveytoSend = await getShopipfySurveyByEvent(
    session.orgId,
    ShopifyEvents.DRAFT_ORDERS_CREATE,
    session.shop,
  );
  const dbFlowId = surveytoSend.survey.WaFlow.dbFlowId;
  console.log("dbflowid", dbFlowId);
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
  console.log("topic", topic);
  //TODO: on order created
  const webhookRequestBodyJson = JSON.parse(webhookRequestBody);
  console.log("webhookRequestBodyJson", webhookRequestBodyJson);
  const phone = webhookRequestBodyJson?.customer?.phone;
  console.log("phone", phone);

  const surveytoSend = await getShopipfySurveyByEvent(
    session.orgId,
    ShopifyEvents.ORDERS_CREATE,
    session.shop,
  );
  const dbFlowId = surveytoSend.survey.WaFlow.dbFlowId;
  console.log("dbflowid", dbFlowId);
  // if(phone)
  // await sendFlow({ orgId: session.orgId, dbFlowId, phone })
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

export async function orderCancelledHandler(
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

export async function orderFulFilledHandler(
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

export async function orderPaidHandler(
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
  // CARTS_CREATE: [
  //   {
  //     deliveryMethod: DeliveryMethod.Http,
  //     callbackUrl: "/api/shopify/webhooks",
  //     callback: cartCreateHandler,
  //   },
  // ],
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
  // ORDERS_PARTIALLY_FULFILLED
  // VARIANTS_IN_STOCK
  // VARIANTS_OUT_OF_STOCK
  // FULFILLMENT_ORDERS_CANCELLATION_REQUEST_SUBMITTED
  // FULFILLMENT_ORDERS_CANCELLED
};

export default webhookHandlers;
