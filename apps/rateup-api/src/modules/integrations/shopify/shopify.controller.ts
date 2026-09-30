import { AttributionQuery, registerWebhookbyTopicInput, ShopParamInput } from "./shopify.schema.js";
import { getShopifyAttribution } from "./shopify.attribution.service.js";
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
  updateShopifyIntegrationByOrgId,
  claimUnownedShopifyIntegration,
  getFulfillmentOrders,
  createShopifyFulfillment,
} from "./shopify.service.js";
import { FastifyReply, FastifyRequest } from "fastify";
import shopify from "./shopify.config.js";
import { getActiveShopifySession, saveShopifySession, toStoredSession } from "./shopify.session.js";
import { HttpResponseError, type GraphQLClientResponse } from "@shopify/shopify-api";

import webhookHandlers from "./shopify.handler.js";
import { FRONTEND_URL } from "../../../utils/constants/constants.js";
import { log } from "../../../utils/logger.js";
import { createIntegration, updateIntegrationByName } from "../integrations.service.js";
import { IntegratedApps } from "../../../types/enums.js";
import { errorMessage } from "../../../utils/commonUtils.js";

export async function getShopifyAuthHandler(
  request: FastifyRequest<{ Querystring: { shop: string } }>,
  reply: FastifyReply,
) {
  try {
    if (!shopify) throw new Error("Shopify integration is not configured");
    const { shop } = request.query;
    if (!shop) return reply.code(404).send("Shop is missing");
    const shopifyInfo = await getShopifyIntegrationByShop(shop);
    // Scopes are granted by Shopify managed installation (shopify.app.toml) and
    // reported through app/scopes_update, so a scope change no longer needs a
    // fresh OAuth round-trip; only a missing or disconnected integration does.
    if (!shopifyInfo || !shopifyInfo.active) {
      await getShopifyAuthUrl(request.raw, reply.raw, request.query.shop);
    } else {
      reply.redirect(`${FRONTEND_URL}`);
    }
  } catch (e) {
    console.error(e);
    if (e instanceof HttpResponseError && e.response.code === 401)
      await getShopifyAuthUrl(request.raw, reply.raw, request.query.shop);
    else {
      reply.redirect(`${FRONTEND_URL}/auth/shopify/retry?shop=${request.query.shop}`);
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
    // A freshly connected shop has no surveys configured yet.
    const shopifySurveys: ShopifySurvey[] = [];
    const data = {
      name: IntegratedApps.shopify,
      credential: {
        session: toStoredSession(session),
        isWebhookRegistered: false,
        shopifySurveys,
      },
    };
    const integrationbyshop = await getShopifyIntegrationByShop(session.shop);
    if (integrationbyshop && integrationbyshop?.orgId) {
      await updateShopifyIntegrationByOrgId(integrationbyshop?.orgId, {
        credential: data.credential,
        active: true,
      });
      // The credential update above never touches the session; only this does.
      await saveShopifySession(integrationbyshop.id, session);
    } else await createIntegration(data);
    // app/uninstalled and app/subscriptions_update are app-level subscriptions
    // in shopify.app.toml, so nothing is registered per shop here.
    reply.redirect(`${FRONTEND_URL}/auth/shopify?shop=${session.shop}`);
  } catch (e) {
    console.error(e);
    reply.redirect(`${FRONTEND_URL}/auth/shopify/retry?shop=${request.query.shop}`);
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
      if (integration.credential.session.shop === shop) return reply.code(200).send("success");
      // The org already has a different store connected. This used to delete that
      // row and then claim the named shop regardless of who owned it; refusing is
      // the safe order, since a failed claim can no longer drop a working
      // connection. Disconnecting is an explicit action.
      return reply
        .code(409)
        .send({ message: "Disconnect the current Shopify store before linking another" });
    }
    const claimed = await claimUnownedShopifyIntegration(shop, orgId);
    if (!claimed.count) {
      return reply.code(409).send({ message: "This store is already linked to an organisation" });
    }
    reply.code(200).send({ message: "success" });
  } catch (e) {
    console.error(e);
    return reply.code(500).send({ error: errorMessage(e) });
  }
}

export async function registerWebhookHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    if (!shopify) throw new Error("Shopify integration is not configured");
    const { orgId } = request.user;
    const shopifyInfo = await getShopifyInfo(orgId);
    await registerShopifyWebhook(await getActiveShopifySession(shopifyInfo));
    await updateIntegrationByName(orgId, IntegratedApps.shopify, {
      credential: { ...shopifyInfo.credential, isWebhookRegistered: true },
    });
    reply.code(200).send();
  } catch (e) {
    console.error(e);
    return reply.code(500).send({ error: errorMessage(e) });
  }
}

export async function registerWebhookByTopicHandler(
  request: FastifyRequest<{ Body: registerWebhookbyTopicInput }>,
  reply: FastifyReply,
) {
  try {
    const { topic } = request.body;
    const integration = await getShopifyInfo(request.user.orgId);
    await registerWebhookByTopic(topic, await getActiveShopifySession(integration));
    reply.code(200).send();
  } catch (e) {
    console.error(e);
    return reply.code(500).send({ error: errorMessage(e) });
  }
}

export async function deleteWebhookByTopicHandler(
  request: FastifyRequest<{ Body: registerWebhookbyTopicInput }>,
  reply: FastifyReply,
) {
  try {
    if (!shopify) throw new Error("Shopify integration is not configured");
    const shopifyInfo = await getShopifyInfo(request.user.orgId);
    const { topic } = request.body;
    const session = await getActiveShopifySession(shopifyInfo);
    const client = new shopify.clients.Graphql({ session });
    const data = await getManagableWebhooks(client);
    const matchedWebhook = data.find((webhook) => webhook.topic === topic);
    if (!matchedWebhook) throw new Error(`No registered webhook found for topic ${topic}`);
    const webhook = await deleteWebhookById(matchedWebhook.id, client);
    reply.code(200).send(webhook);
  } catch (e) {
    console.error(e);
    return reply.code(500).send({ error: errorMessage(e) });
  }
}

export async function deleteAllWebhookHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { orgId } = request.user;
    const shopifyInfo = await getShopifyInfo(request.user.orgId);
    const session = await getActiveShopifySession(shopifyInfo);
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
    return reply.code(500).send({ error: errorMessage(e) });
  }
}

export async function shopifyWebhooksHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    if (!shopify) throw new Error("Shopify integration is not configured");
    // `shopify` is a module-level import (not a local const), so TS narrowing
    // from the guard above doesn't persist inside the nested `.every()`
    // closure below — bind to a local const first.
    const shopifyClient = shopify;
    const allTopics = Object.keys(webhookHandlers);
    if (!allTopics.every((topic) => shopifyClient.webhooks.getTopicsAdded().includes(topic)))
      shopifyClient.webhooks.addHandlers(webhookHandlers);
    log.info("Processing webhook");
    await shopifyClient.webhooks.process({
      rawBody: request.rawBody as string, // is a string
      rawRequest: request.raw,
      rawResponse: reply.raw,
    });
  } catch (e) {
    console.error(e);
  }
}

export async function getRegisteredWebhooksHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    if (!shopify) throw new Error("Shopify integration is not configured");
    const shopifyInfo = await getShopifyInfo(request.user.orgId);
    const session = await getActiveShopifySession(shopifyInfo);
    const client = new shopify.clients.Graphql({ session });
    const data = await getManagableWebhooks(client);
    const webhookslist = data.map((e) => e.topic);
    reply.code(200).send(webhookslist);
  } catch (e) {
    console.error(e);
    return reply.code(500).send({ error: errorMessage(e) });
  }
}

interface ShopifyProductNode {
  id: string;
  title: string;
}

interface ShopifyProductsData {
  products: {
    edges: { node: ShopifyProductNode; cursor: string }[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

/** What the org's cart reminders sent, recovered and earned in a period. */
export async function getAttributionHandler(
  request: FastifyRequest<{ Querystring: AttributionQuery }>,
  reply: FastifyReply,
) {
  const { from, to } = request.query;
  reply.send({ data: await getShopifyAttribution(request.user.orgId, from, to) });
}

export async function getProductsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    if (!shopify) throw new Error("Shopify integration is not configured");
    const shopifyInfo = await getShopifyInfo(request.user.orgId);
    const session = await getActiveShopifySession(shopifyInfo);
    const client = new shopify.clients.Graphql({ session });
    let hasNextPage = true;
    let cursor: string | null = null;
    const products: ShopifyProductNode[] = [];
    while (hasNextPage) {
      const data: GraphQLClientResponse<ShopifyProductsData> = await client.request(
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
      if (!data.data) throw new Error("Shopify products query returned no data");
      hasNextPage = data.data.products.pageInfo.hasNextPage;
      cursor = data.data.products.pageInfo.endCursor;
      products.push(...data.data.products.edges.map((edge) => edge.node));
    }

    reply.code(200).send(products);
  } catch (e) {
    console.error(e);
    return reply.code(500).send({ error: errorMessage(e) });
  }
}

export async function deleteIntegrationByShopHandler(
  request: FastifyRequest<{ Params: ShopParamInput }>,
  reply: FastifyReply,
) {
  try {
    if (!shopify) throw new Error("Shopify integration is not configured");
    const integration = await getShopifyIntegrationByShop(request.params.shop);
    try {
      const client = new shopify.clients.Graphql({
        session: await getActiveShopifySession(integration),
      });
      const data = await client.request<{ shop: { name: string } | null }>(
        `query { shop { name }}`,
      );
      if (data.data?.shop) {
        return reply.code(403).send("App is still installed on Shop");
      }
    } catch {
      log.trace("App is not installed in shop. continue deleting...");
    }
    const res = await deleteShopifyIntegrationByShop(request.params.shop);
    reply.code(200).send(res);
  } catch (e) {
    log.error({ err: e }, "error deleting integration");
    return reply.code(500).send({ error: errorMessage(e) });
  }
}

export async function getFulfillmentOrdersHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const { id } = request.params;
    const fulfillmentOrders = await getFulfillmentOrders(orgId, id);
    reply.code(200).send(fulfillmentOrders);
  } catch (e) {
    log.error({ err: e }, "Error fetching fulfillment orders");
    reply.code(500).send({ error: errorMessage(e) || "Failed to fetch fulfillment orders" });
  }
}

export async function createFulfillmentHandler(
  request: FastifyRequest<{
    Body: {
      lineItemsByFulfillmentOrder: {
        fulfillmentOrderId: string;
        fulfillmentOrderLineItems?: {
          id: string;
          quantity: number;
        }[];
      }[];
      trackingInfo?: {
        company?: string;
        number?: string;
        url?: string;
      };
      notifyCustomer?: boolean;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const fulfillment = await createShopifyFulfillment(orgId, request.body);
    reply.code(200).send(fulfillment);
  } catch (e) {
    log.error({ err: e }, "Error creating Shopify fulfillment");
    reply.code(500).send({ error: errorMessage(e) || "Failed to create fulfillment" });
  }
}
