import { FastifyInstance } from "fastify";
import {
  createShopifySurveyHandler,
  deleteAllWebhookHandler,
  deleteShopifySessionHandler,
  deleteShopifySurveyScheduleHandler,
  getProductsHandler,
  getRegisteredWebhooksHandler,
  getShopifyAuthCallbackHandler,
  getShopifyAuthHandler,
  getShopifySchedulesHandler,
  getShopifySessionHandler,
  getShopifySurveysHandler,
  registerWebhookHandler,
  shopifyWebhooksHandler,
  updateShopifySessionHandler,
  updateShopifySurveyHandler,
} from "./shopify.controller";
import fastifyRawBody from "fastify-raw-body";
import { ShopifyRef } from "./shopify.schema";
import { checkSession } from "../../utils/checkSession";

export async function shopifyRoutes(server: FastifyInstance) {
  await server.register(fastifyRawBody, {
    field: "rawBody",
    global: false,
    encoding: "utf8",
    runFirst: true,
  });

  server.get("/", getShopifyAuthHandler);

  server.get("/auth/callback", getShopifyAuthCallbackHandler);

  server.post(
    "/webhooks",
    {
      config: {
        rawBody: true,
      },
    },
    shopifyWebhooksHandler,
  );

  server.get(
    "/session",
    { preHandler: [checkSession] },
    getShopifySessionHandler,
  );

  server.put(
    "/session/:shop",
    {
      preHandler: [checkSession],
      schema: {
        params: ShopifyRef("byShopParamsSchema"),
      },
    },
    updateShopifySessionHandler,
  );

  server.delete(
    "/session/:shop",
    {
      preHandler: [checkSession],
      schema: {
        params: ShopifyRef("byShopParamsSchema"),
      },
    },
    deleteShopifySessionHandler,
  );

  server.delete(
    "/delete-webhooks/:shop",
    {
      schema: {
        params: ShopifyRef("byShopParamsSchema"),
      },
      preHandler: [checkSession],
    },
    deleteAllWebhookHandler,
  );

  server.get(
    "/products",
    {
      preHandler: [checkSession],
    },
    getProductsHandler,
  );

  server.post(
    "/shopify-survey",
    {
      preHandler: [checkSession],
      schema: {
        body: ShopifyRef("shopifySurveySchema"),
      },
    },
    createShopifySurveyHandler,
  );

  server.put(
    "/shopify-survey/:id",
    {
      preHandler: [checkSession],
      schema: {
        body: ShopifyRef("shopifySurveyUpdateSchema"),
        params: ShopifyRef("byIdParamsSchema"),
      },
    },
    updateShopifySurveyHandler,
  );
  server.get(
    "/shopify-surveys",
    {
      preHandler: [checkSession],
    },
    getShopifySurveysHandler,
  );

  server.get(
    "/shopify-schedules",
    {
      preHandler: [checkSession],
    },
    getShopifySchedulesHandler,
  );

  server.delete(
    "/shopify-survey/:id",
    {
      preHandler: [checkSession],
      schema: {
        params: ShopifyRef("byIdParamsSchema"),
      },
    },
    deleteShopifySurveyScheduleHandler,
  );

  server.get(
    "/registered-webhooks",
    { preHandler: [checkSession] },
    getRegisteredWebhooksHandler,
  );

  server.post(
    "/register-webhooks",
    {
      preHandler: [checkSession],
    },
    registerWebhookHandler,
  );
}
