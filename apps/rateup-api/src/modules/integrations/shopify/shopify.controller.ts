import { registerWebhookbyTopicInput, ShopParamInput } from "./shopify.schema";
import {
  deleteAllWebhooks,
  deleteShopifyIntegrationByShop,
  getShopifyAuthUrl,
  getShopifyInfo,
  getShopifyIntegrationByShop,
  handleShopifyAuthCallback,
  registerShopifyWebhook,
  registerWebhookByTopic,
  updateShopifyIntegrationByOrgId,
  updateShopifyIntegrationByShop,
} from "./shopify.service";
import { FastifyReply, FastifyRequest } from "fastify";
import shopify from "./shopify.config";

import webhookHandlers, {
  defaultWebhookHandlers,
  mandatoryWebhookHandlers,
  WEBHOOK_API_ROUTE,
} from "./shopify.handler";
import { ShopifyOrderWebhookTopicEventMap } from "./shopify.util";
import { API_URL, FRONTEND_URL } from "../../../utils/constants/constants";
import { log } from "../../../utils/logger";
import {
  createIntegration,
  deleteIntegrationByName,
  updateIntegrationByName,
} from "../integrations.service";
import { IntegratedApps } from "../../../types/enums";

export async function getShopifyAuthHandler(
  request: FastifyRequest<{ Querystring: { shop: string } }>,
  reply: FastifyReply,
) {
  try {
    const { shop } = request.query;
    if (!shop) return reply.code(404).send("Shop is missing");
    const shopifyInfo = await getShopifyIntegrationByShop(shop);
    if (
      !shopifyInfo ||
      !shopifyInfo.active ||
      !shopify.config.scopes.equals(shopifyInfo.credential.session.scope)
    ) {
      await getShopifyAuthUrl(request.raw, reply.raw, request.query.shop);
    } else {
      const shop = await shopify.rest.Shop.current({
        session: shopifyInfo.credential.session,
      });
      reply.redirect(`${FRONTEND_URL}`);
    }
  } catch (e) {
    console.error(e);
    if (e.response && e.response.code === 401)
      await getShopifyAuthUrl(request.raw, reply.raw, request.query.shop);
    else {
      reply.redirect(
        `${FRONTEND_URL}/auth/shopify/retry?shop=${request.query.shop}`,
      );
    }
  }
}

export async function getShopifyAuthCallbackHandler(
  request: FastifyRequest<{ Querystring: { shop: string } }>,
  reply: FastifyReply,
) {
  try {
    const callbackResponse = await handleShopifyAuthCallback(request, reply);
    const session = callbackResponse.session;
    const data = {
      name: IntegratedApps.shopify,
      credential: {
        session: {
          id: session.id,
          shop: session.shop,
          state: session.state,
          isOnline: session.isOnline,
          accessToken: session.accessToken,
          scope: session.scope,
        },
        isWebhookRegistered: false,
        shopifySurveys: [],
      },
    };
    const integrationbyshop = await getShopifyIntegrationByShop(session.shop);
    if (integrationbyshop && integrationbyshop?.orgId)
      await updateShopifyIntegrationByOrgId(integrationbyshop?.orgId, {
        credential: data.credential,
        active: true,
      });
    else await createIntegration(data);
    const webhook = new shopify.rest.Webhook({
      session,
    });
    webhook.address = `${API_URL}${WEBHOOK_API_ROUTE}`;
    webhook.format = "json";
    const res = await Promise.all(
      ["app/uninstalled", "app_subscriptions/update"].map(async (topic) => {
        webhook.topic = topic;
        await webhook.save({ update: true });
      }),
    );
    reply.redirect(`${FRONTEND_URL}/auth/shopify?shop=${session.shop}`);
  } catch (e) {
    console.error(e);
    reply.redirect(
      `${FRONTEND_URL}/auth/shopify/retry?shop=${request.query.shop}`,
    );
  }
}

export async function updateShopifyIntegrationByShopHandler(
  request: FastifyRequest<{ Params: ShopParamInput }>,
  reply: FastifyReply,
) {
  try {
    const shop = request.params.shop;
    const orgId = request.user.orgId;
    const integration = await getShopifyInfo(orgId);
    if (integration)
      await deleteIntegrationByName(IntegratedApps.shopify, orgId);
    await updateShopifyIntegrationByShop(shop, { orgId });
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
    const { orgId } = request.user;
    const shopifyInfo = await getShopifyInfo(orgId);
    shopify.webhooks.addHandlers({
      ...defaultWebhookHandlers,
      ...mandatoryWebhookHandlers,
    });
    await registerShopifyWebhook(shopifyInfo?.credential?.session);
    await updateIntegrationByName(orgId, IntegratedApps.shopify, {
      credential: { ...shopifyInfo.credential, isWebhookRegistered: true },
    });
    reply.code(200).send();
  } catch (e) {
    console.error(e);
    reply.code(500).send(e);
  }
}

export async function registerWebhookByTopicHandler(
  request: FastifyRequest<{ Body: registerWebhookbyTopicInput }>,
  reply: FastifyReply,
) {
  try {
    const { topic } = request.body;
    await registerWebhookByTopic(topic, request.user.orgId);
    reply.code(200).send();
  } catch (e) {
    console.error(e);
    reply.code(500).send(e);
  }
}

export async function deleteWebhookByTopicHandler(
  request: FastifyRequest<{ Body: registerWebhookbyTopicInput }>,
  reply: FastifyReply,
) {
  try {
    const shopifyInfo = await getShopifyInfo(request.user.orgId);
    const { topic } = request.body;
    const session = shopifyInfo.credential?.session;
    const webhooks = await shopify.rest.Webhook.all({ session });
    const webhookId = webhooks.data.find(
      (webhook) =>
        webhook.topic ===
        ShopifyOrderWebhookTopicEventMap.find((t) => t.key === topic).value,
    ).id;
    await shopify.rest.Webhook.delete({
      session: session,
      id: webhookId,
    });
    reply.code(200).send();
  } catch (e) {
    console.error(e);
    reply.code(500).send(e);
  }
}

export async function deleteAllWebhookHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const shopifyInfo = await getShopifyInfo(request.user.orgId);
    const session = shopifyInfo.credential.session;
    await deleteAllWebhooks(session);
    await updateShopifyIntegrationByOrgId(orgId, {
      credential: {
        ...shopifyInfo.credential,
        isWebhookRegistered: false,
        shopifySurveys: [],
      },
    });
    reply.code(200).send({ message: "success" });
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
    const allTopics = Object.keys(webhookHandlers);
    if (
      !allTopics.every((topic) =>
        shopify.webhooks.getTopicsAdded().includes(topic),
      )
    )
      shopify.webhooks.addHandlers(webhookHandlers);
    log.info("Processing webhook");
    await shopify.webhooks.process({
      rawBody: request.rawBody as string, // is a string
      rawRequest: request.raw,
      rawResponse: reply.raw,
    });
  } catch (e) {
    console.error(e);
  }
}

export async function getRegisteredWebhooksHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const shopifyInfo = await getShopifyInfo(request.user.orgId);
    const session = shopifyInfo.credential.session;
    const webhooks = await shopify.rest.Webhook.all({ session });
    const formattedWebhooks = webhooks.data.map(
      (webhook) =>
        ShopifyOrderWebhookTopicEventMap.find(
          (topic) => topic.value === webhook.topic,
        )?.key,
    );
    reply.code(200).send(formattedWebhooks);
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
    const shopifyInfo = await getShopifyInfo(request.user.orgId);
    const session = shopifyInfo.credential.session;
    const products = await shopify.rest.Product.all({ session });
    reply.code(200).send(products.data);
  } catch (e) {
    console.error(e);
    reply.code(500).send(e);
  }
}

export async function deleteIntegrationByShopHandler(
  request: FastifyRequest<{ Params: ShopParamInput }>,
  reply: FastifyReply,
) {
  try {
    const integration = await getShopifyIntegrationByShop(request.params.shop);
    try {
      const shop = await shopify.rest.Shop.current({
        session: integration.credential.session,
      });
      if (shop) {
        return reply.code(403).send("App is still installed on Shop");
      }
    } catch (e) {
      log.trace("App is not installed in shop. continue deleting...");
    }
    const res = await deleteShopifyIntegrationByShop(request.params.shop);
    reply.code(200).send(res);
  } catch (e) {
    log.error("error deleting integration %o", e);
    reply.code(500).send(e);
  }
}
