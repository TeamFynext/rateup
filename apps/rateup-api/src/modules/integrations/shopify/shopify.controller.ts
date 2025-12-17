import {
  registerWebhookbyTopicInput,
  ShopParamInput,
} from "./shopify.schema.js";
import {
  deleteAllWebhooks,
  deleteShopifyIntegrationByShop,
  deleteWebhookById,
  getManagableWebhooks,
  getShopifyAuthUrl,
  getShopifyInfo,
  getShopifyIntegrationByShop,
  handleShopifyAuthCallback,
  registerShopifyWebhook,
  registerWebhookByTopic,
  sendShopifySurveyCronAction,
  updateShopifyIntegrationByOrgId,
  updateShopifyIntegrationByShop,
} from "./shopify.service.js";
import { FastifyReply, FastifyRequest } from "fastify";
import shopify from "./shopify.config.js";

import webhookHandlers, {
  defaultWebhookHandlers,
  mandatoryWebhookHandlers,
  WEBHOOK_API_ROUTE,
} from "./shopify.handler.js";
import { ShopifyOrderWebhookTopicEventMap } from "./shopify.util.js";
import { API_URL, FRONTEND_URL } from "../../../utils/constants/constants.js";
import { log } from "../../../utils/logger.js";
import {
  createIntegration,
  deleteIntegrationByName,
  updateIntegrationByName,
} from "../integrations.service.js";
import { IntegratedApps } from "../../../types/enums.js";

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
    const res = await Promise.all(
      ["APP_UNINSTALLED", "APP_SUBSCRIPTIONS_UPDATE"].map(async (topic) => {
        await registerWebhookByTopic(topic, session);
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
    if (integration) {
      if (integration.credential.session.shop === shop)
        return reply.code(200).send("success");
      else await deleteIntegrationByName(IntegratedApps.shopify, orgId);
    }
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
    const integration = await getShopifyInfo(request.user.orgId);
    await registerWebhookByTopic(topic, integration.credential.session);
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
    const client = new shopify.clients.Graphql({ session });
    const data = await getManagableWebhooks(client);
    const webhookId = data.find((webhook) => webhook.topic === topic).id;
    const webhook = await deleteWebhookById(webhookId, client);
    reply.code(200).send(webhook);
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
    const client = new shopify.clients.Graphql({ session });
    const data = await getManagableWebhooks(client);
    const webhookslist = data.map((e) => e.topic);
    reply.code(200).send(webhookslist);
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
    const client = new shopify.clients.Graphql({ session });
    let hasNextPage = true;
    let cursor = null;
    const products = [];
    while (hasNextPage) {
      const data = await client.request(
        `query getProducts($cursor: String) {
          products(first: 50, after: $cursor) {
            edges {
              node {
                id
                title
              },
              cursor
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }`,
        { variables: { cursor } },
      );
      hasNextPage = data.data.products.pageInfo.hasNextPage;
      cursor = data.data.products.pageInfo.endCursor;
      products.push(
        ...data.data.products.edges?.map((product) => product?.node),
      );
    }

    reply.code(200).send(products);
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
      const client = new shopify.clients.Graphql({
        session: integration.credential.session,
      });
      const data = await client.request(`query { shop { name }}`);
      if (data.data.shop) {
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

export async function testShopifyCronActionFnHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const res = await sendShopifySurveyCronAction();
    reply.send("success");
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
