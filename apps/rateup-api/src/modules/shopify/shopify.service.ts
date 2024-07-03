import { FastifyReply, FastifyRequest } from "fastify";
import prisma from "../../utils/prisma";
import shopify from "./shopify.config";
import { Session, SessionParams } from "@shopify/shopify-api";
import { isEmpty } from "lodash";

export async function getShopifyAuthUrl(rawRequest, reply: FastifyReply, shop) {
  console.log(" in getShopifyAuthUrl");
  return await shopify.auth.begin({
    shop: shopify.utils.sanitizeShop(shop, true),
    callbackPath: "/api/shopify/auth/callback",
    isOnline: false,
    rawRequest,
    rawResponse: reply.raw,
  });
}

export async function handleShopifyAuthCallback(request, reply) {
  return await shopify.auth.callback({
    rawRequest: request.raw,
    rawResponse: reply.raw,
  });
}

export async function createShopifySession(session: Session) {
  // TODO: create shopifySession model
  await prisma.shopifySession.upsert({
    where: {
      shop: session.shop,
    },
    update: {
      id: session.id,
      state: session.state,
      isOnline: session.isOnline,
      accessToken: session.accessToken,
      scope: session.scope,
    },
    create: {
      id: session.id,
      shop: session.shop,
      state: session.state,
      isOnline: session.isOnline,
      accessToken: session.accessToken,
      scope: session.scope,
    },
  });
  console.log("session", session);
}

export async function getShopifySession(shop) {
  const session = await prisma.shopifySession.findUnique({
    where: {
      shop,
    },
  });
  return {
    ...session,
    isActive: undefined,
    isScopeChanged: undefined,
    isExpired: undefined,
    toObject: undefined,
    equals: undefined,
    toPropertyArray: undefined,
  };
}

export async function deleteShopifySession(shop) {
  return await prisma.shopifySession.delete({
    where: {
      shop,
    },
  });
}

export async function registerShopifyWebhook(session: Session) {
  console.log("shopify topics", await shopify.webhooks.getTopicsAdded());
  console.log(
    "shopify handlers",
    await shopify.webhooks.getHandlers("ORDERS_CREATE"),
  );
  const response = await shopify.webhooks.register({
    session,
  });
  console.dir(response, { depth: null });
  if (!response || isEmpty(response))
    throw new Error("Error registering webhook");

  for (const hook of Object.keys(response)) {
    if (response[hook].length && !response[hook][0].success) {
      throw new Error(`Error registering webhook with topic ${hook}`);
    }
  }
}
