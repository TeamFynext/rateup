import shopify from "./shopify.config";
import { shopifySurveyInput } from "./shopify.schema";
import {
  createShopifySession,
  createShopifySurveySchedule,
  deleteShopifySession,
  getShopifyAuthUrl,
  getShopifySession,
  getShopifySessionByOrgId,
  getShopifySurveysByOrgId,
  handleShopifyAuthCallback,
  registerShopifyWebhook,
} from "./shopify.service";
import { FastifyReply, FastifyRequest } from "fastify";

export async function getShopifyAuthHandler(
  request: FastifyRequest<{ Querystring: { shop: string } }>,
  reply: FastifyReply,
) {
  try {
    const session = await getShopifySession(request.query.shop);
    console.log("session", session);
    if (!session)
      await getShopifyAuthUrl(request.raw, reply, request.query.shop);
    else reply.redirect(process.env.FRONTEND_URL);
  } catch (e) {
    console.error(e);
    reply.code(500).send(e);
  }
}

export async function getShopifyAuthCallbackHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    console.log("in getShopifyAuthCallbackHandler");
    const callbackResponse = await handleShopifyAuthCallback(request, reply);
    console.log("callbackResponse", callbackResponse);
    // You can now use callback.session to make API requests
    await createShopifySession(callbackResponse.session);
    await registerShopifyWebhook(callbackResponse.session);

    //change redirect
    reply.redirect(process.env.FRONTEND_URL);
  } catch (e) {
    console.error(e);
    reply.code(500).send(e);
  }
}

export async function deleteAllWebhookHandler(
  request: FastifyRequest<{ Querystring: { shop: string } }>,
  reply,
) {
  try {
    const session = await getShopifySession(request.query.shop);
    const webhookslist = await shopify.rest.Webhook.all({ session });
    console.log("webhookslist", webhookslist);
    await Promise.all(
      webhookslist.data.map(async (webhook) => {
        const response = await shopify.rest.Webhook.delete({
          session,
          id: webhook.id,
        });
        console.log("response", response);
      }),
    );

    reply.code(200).send();
  } catch (e) {
    console.error(e);
    reply.code(500).send(e);
  }
}

export async function shopifyWebhooksHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    console.log("in shopifyWebhooksHandler");
    await shopify.webhooks.process({
      rawBody: request.rawBody as string, // is a string
      rawRequest: request.raw,
      rawResponse: reply.raw,
    });
  } catch (e) {
    console.error(e);
    reply.code(500).send(e);
  }
}

export async function getProductsHandler(
  request: FastifyRequest<{
    Querystring: { shop: string };
  }>,
  reply: FastifyReply,
) {
  try {
    console.log("in getProductsHandler");

    const session = await getShopifySession(request.query.shop);

    const webhooks = await shopify.rest.Webhook.all({
      session,
    });
    console.log("webhooks", webhooks);
    const products = await shopify.rest.Product.all({ session });

    console.log("products", products);
    reply.code(200).send(webhooks);
  } catch (e) {
    console.error(e);
    reply.code(500).send(e);
  }
}

export async function createShopifySurveyScheduleHandler(
  request: FastifyRequest<{ Body: shopifySurveyInput }>,
  reply: FastifyReply,
) {
  try {
    const orgId = request.user.orgId;
    let shop = request.body.shop;
    if (!shop) {
      const session = await getShopifySessionByOrgId(orgId);
      if (!session) throw new Error("You have n't configured your shop access");
    }
    const res = await createShopifySurveySchedule({
      ...request.body,
      shop,
      orgId,
    });
    reply.code(200).send(res);
  } catch (e) {
    console.error(e);
    reply.code(500).send(e);
  }
}

export async function getShopifySurveyScheduleHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const orgId = request.user.orgId;
    const res = await getShopifySurveysByOrgId(orgId);
    reply.code(200).send(res);
  } catch (e) {
    console.error(e);
    reply.code(500).send(e);
  }
}
