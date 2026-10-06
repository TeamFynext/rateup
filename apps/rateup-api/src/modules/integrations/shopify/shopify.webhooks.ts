import prisma from "../../../utils/prisma.js";
import shopify from "./shopify.config.js";
import { getActiveShopifySession } from "./shopify.session.js";
import { GraphqlClient, GraphQLClientResponse, Session } from "@shopify/shopify-api";
import { log } from "../../../utils/logger.js";
import { IntegratedApps } from "../../../types/enums.js";
import { ShopifyOrderWebhookTopicEventMap } from "./shopify.util.js";
import { API_URL } from "../../../utils/constants/constants.js";
import { WEBHOOK_API_ROUTE, defaultWebhookHandlers } from "./shopify.handler.js";

/**
 * Subscribes the shop to every per-shop topic it isn't subscribed to yet.
 * App-level topics (uninstall, billing, scopes, compliance) come from
 * shopify.app.toml instead.
 */
export async function registerShopifyWebhook(session: Session) {
  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({ session });
  const existing = await getManagableWebhooks(client);
  // A topic counts as registered only at this deployment's address. One left pointing at
  // an old URL (a rotated dev tunnel, a moved API) is still "subscribed" in Shopify's eyes
  // but delivers nowhere we listen — so it is recreated here and the stale one removed.
  const target = `${API_URL}${WEBHOOK_API_ROUTE}`;
  // Every topic is tried: one the shop's scopes refuse must not block the rest.
  const errors: string[] = [];
  for (const topic of Object.keys(defaultWebhookHandlers)) {
    const forTopic = existing.filter((w) => w.topic === topic);
    try {
      if (!forTopic.some((w) => w.uri === target)) await registerWebhookByTopic(topic, session);
      for (const stale of forTopic.filter((w) => w.uri !== target)) {
        await deleteWebhookById(stale.id, client);
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  if (errors.length) throw new Error(errors.join("; "));
}

/**
 * Daily: subscribes every connected shop to topics added since it installed. Otherwise a
 * new topic reaches only shops whose merchant presses "register webhooks" again.
 */
export async function syncShopifyWebhooks() {
  const integrations = (await prisma.integration.findMany({
    where: { name: IntegratedApps.shopify, active: true },
  })) as unknown as ShopifyIntegration[];
  for (const integration of integrations) {
    if (!integration.credential?.session) continue;
    try {
      await registerShopifyWebhook(await getActiveShopifySession(integration));
    } catch (e) {
      log.error({ err: e, orgId: integration.orgId }, "Shopify webhook sync failed for shop");
    }
  }
}

export async function deleteWebhookById(webhookId: string, client: GraphqlClient) {
  await client.request(
    `mutation webhookSubscriptionDelete($id: ID!) {
      webhookSubscriptionDelete(id: $id) {
        userErrors {
          field
          message
        }
        deletedWebhookSubscriptionId
      }
    }`,
    { variables: { id: webhookId } },
  );
}

export async function deleteAllWebhooks(session: Session) {
  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({ session });
  const webhookslist = await getManagableWebhooks(client);
  await Promise.all(
    webhookslist.map(async (webhook) => {
      await deleteWebhookById(webhook.id, client);
    }),
  );
}

export async function registerWebhookByTopic(topic: string, session: Session) {
  if (!shopify) throw new Error("Shopify integration is not configured");
  const client = new shopify.clients.Graphql({ session });
  const response = await client.request<{
    webhookSubscriptionCreate: { userErrors: { field: string[] | null; message: string }[] };
  }>(
    `mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
  webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
    webhookSubscription {
      id
      topic
      format
      uri
    }
    userErrors {
      field
      message
    }
  }
} `,
    {
      variables: {
        topic,
        webhookSubscription: {
          uri: `${API_URL}${WEBHOOK_API_ROUTE}`,
          format: "JSON",
        },
      },
    },
  );
  // "Address for this topic has already been taken": the shop is already
  // subscribed to this topic at this URL, which is the state we want.
  const userErrors = (response.data?.webhookSubscriptionCreate?.userErrors ?? []).filter(
    (e) => !/already been taken/i.test(e.message),
  );
  if (userErrors.length) {
    throw new Error(
      `Error registering webhook with topic ${topic}: ${userErrors.map((e) => e.message).join("; ")}`,
    );
  }
}

interface ManagableWebhookNode {
  id: string;
  topic: string;
  uri: string;
}

interface WebhookSubscriptionsData {
  webhookSubscriptions: {
    edges: { node: ManagableWebhookNode; cursor: string }[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

export async function getManagableWebhooks(client: GraphqlClient): Promise<ManagableWebhookNode[]> {
  const webhookslist: ManagableWebhookNode[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;
  while (hasNextPage) {
    const response: GraphQLClientResponse<WebhookSubscriptionsData> = await client.request(
      `query getWebhooks($topics: [WebhookSubscriptionTopic!], $cursor: String){
  webhookSubscriptions(first: 50, after: $cursor, topics: $topics,) {
      edges {
        node {
        id
        topic
        uri
      }
      cursor
    }
      pageInfo {
      hasNextPage
      endCursor
    }
  }
} `,
      {
        variables: {
          topics: ShopifyOrderWebhookTopicEventMap.map((t) => t.key),
          cursor,
        },
      },
    );
    if (!response.data) throw new Error("Shopify webhookSubscriptions query returned no data");
    hasNextPage = response.data.webhookSubscriptions.pageInfo.hasNextPage;
    cursor = response.data.webhookSubscriptions.pageInfo.endCursor;
    webhookslist.push(...response.data.webhookSubscriptions.edges.map((e) => e.node));
  }
  return webhookslist;
}
