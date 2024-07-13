import shopify from "./shopify.config";
import {
  IdParamInput,
  shopifySurveyInput,
  shopifySurveyUpdateInput,
  ShopParamInput,
} from "./shopify.schema";
import {
  createShopifySession,
  createShopifySurveySchedule,
  deleteShopifySurveySchedule,
  getShopifyAuthUrl,
  getShopifySession,
  getShopifySessionByOrgId,
  getShopifySurveysByOrgId,
  handleShopifyAuthCallback,
  registerShopifyWebhook,
  updateShopifySession,
  updateShopifySurveySchedule,
} from "./shopify.service";
import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../utils/logger";

export async function getShopifyAuthHandler(
  request: FastifyRequest<{ Querystring: { shop: string } }>,
  reply: FastifyReply,
) {
  try {
    const session = await getShopifySession(request.query.shop);
    if (!session || !session.active) {
      await getShopifyAuthUrl(request.raw, reply.raw, request.query.shop);
    } else reply.redirect(`${process.env.FRONTEND_URL}/dashboard/settings`);
  } catch (e) {
    console.error(e);
    reply.redirect(
      `${process.env.FRONTEND_URL}/auth/shopify/retry?shop=${request.query.shop}`,
    );
  }
}

export async function getShopifyAuthCallbackHandler(
  request: FastifyRequest<{ Querystring: { shop: string } }>,
  reply: FastifyReply,
) {
  try {
    const callbackResponse = await handleShopifyAuthCallback(request, reply);
    const session = await createShopifySession(callbackResponse.session);
    reply.redirect(
      `${process.env.FRONTEND_URL}/auth/shopify?shop=${session.shop}`,
    );
  } catch (e) {
    console.error(e);
    reply.redirect(
      `${process.env.FRONTEND_URL}/auth/shopify/retry?shop=${request.query.shop}`,
    );
  }
}

export async function updateShopifySessionHandler(
  request: FastifyRequest<{ Params: ShopParamInput }>,
  reply: FastifyReply,
) {
  try {
    const shop = request.params.shop;
    const orgId = request.user.orgId;
    await updateShopifySession(shop, { orgId });
    reply.code(200).send({ message: "success" });
  } catch (e) {
    console.error(e);
    reply.code(500).send(e);
  }
}

export async function registerWebhookHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const session = await getShopifySessionByOrgId(request.user.orgId);
    await registerShopifyWebhook(session);
    await updateShopifySession(session.shop, { isWebhookRegistered: true });
    reply.code(200).send();
  } catch (e) {
    console.error(e);
    reply.code(500).send(e);
  }
}

export async function getShopifySessionHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const session = await getShopifySessionByOrgId(request.user.orgId);
    if (!shopify.config.scopes.equals(session.scope)) {
      await getShopifyAuthUrl(request.raw, reply.raw, session.shop);
    } else reply.code(200).send(session);
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
    await Promise.all(
      webhookslist.data.map(async (webhook) => {
        const response = await shopify.rest.Webhook.delete({
          session,
          id: webhook.id,
        });
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
    log.info("Processing webhook");
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

export async function getRegisteredWebhooksHandler(
  request: FastifyRequest<{ Params: { orgId: string } }>,
  reply: FastifyReply,
) {
  try {
    const session = await getShopifySessionByOrgId(request.user.orgId);
    const webhooks = await shopify.rest.Webhook.all({ session });
    reply.code(200).send(webhooks.data);
  } catch (e) {
    console.error(e);
    reply.code(500).send(e);
  }
}

export async function getProductsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const session = await getShopifySessionByOrgId(request.user.orgId);
    const products = await shopify.rest.Product.all({ session });
    reply.code(200).send(products.data);
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
      else shop = session.shop;
    }
    const res = await createShopifySurveySchedule({
      ...request.body,
      shop,
      orgId,
    });
    reply.code(200).send(res);
  } catch (e) {
    console.error(e);
    if (e.code === "P2002")
      return reply
        .code(500)
        .send({ error: "You already have schedule on this event" });
    reply.code(500).send({ error: e?.message || e });
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

export async function deleteShopifySurveyScheduleHandler(
  request: FastifyRequest<{ Params: IdParamInput }>,
  reply: FastifyReply,
) {
  try {
    const res = await deleteShopifySurveySchedule(request.params.id);
    reply.code(200).send(res);
  } catch (e) {
    console.error(e);
    reply.code(500).send(e);
  }
}

export async function updateShopifySurveyScheduleHandler(
  request: FastifyRequest<{
    Params: IdParamInput;
    Body: shopifySurveyUpdateInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const scheduleId = request.params.id;
    const res = await updateShopifySurveySchedule(scheduleId, request.body);
    reply.code(200).send(res);
  } catch (e) {
    console.error(e);
    reply.code(500).send(e);
  }
}
