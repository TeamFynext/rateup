/**
 * Removes the per-shop app/uninstalled and app/subscriptions_update webhook
 * subscriptions that the OAuth callback used to create for every shop.
 *
 *   npm run shopify:drop-shop-app-webhooks            # dry run: lists what it would delete
 *   npm run shopify:drop-shop-app-webhooks -- --apply
 *
 * Those topics are now app-level subscriptions in shopify.app.toml. A shop that
 * still has its own subscription as well gets every uninstall and billing event
 * delivered twice, under different webhook ids, so the queue's jobId dedupe
 * doesn't catch it. Run this only after `shopify app deploy` has pushed the TOML,
 * or those shops would miss the events in between.
 *
 * Each shop's token goes through getActiveShopifySession, so this also cycles
 * any legacy non-expiring token it meets. Re-running is safe: a shop with nothing
 * left to delete is skipped.
 *
 * Needs DATABASE_URL, REDIS_URL and the SHOPIFY_* variables in the environment.
 */
import "dotenv/config";

import prisma from "../src/utils/prisma.js";
import connection from "../src/utils/redisConnection.js";
import shopify from "../src/modules/integrations/shopify/shopify.config.js";
import { getActiveShopifySession } from "../src/modules/integrations/shopify/shopify.session.js";
import { deleteWebhookById } from "../src/modules/integrations/shopify/shopify.webhooks.js";
import { IntegratedApps } from "../src/types/enums.js";

const APP_LEVEL_TOPICS = ["APP_UNINSTALLED", "APP_SUBSCRIPTIONS_UPDATE"];

interface SubscriptionsData {
  webhookSubscriptions: { nodes: { id: string; topic: string; uri: string }[] };
}

async function main() {
  if (!shopify)
    throw new Error("SHOPIFY_API_KEY, SHOPIFY_API_SECRET and SHOPIFY_SCOPES must be set");
  const apply = process.argv.includes("--apply");

  const integrations = (await prisma.integration.findMany({
    where: { name: IntegratedApps.shopify, active: true },
  })) as unknown as ShopifyIntegration[];

  let deleted = 0;
  let failed = 0;
  for (const integration of integrations) {
    const shop = integration.credential?.session?.shop;
    if (!shop) continue;
    try {
      const client = new shopify.clients.Graphql({
        session: await getActiveShopifySession(integration),
      });
      const response = await client.request<SubscriptionsData>(
        `query appLevelSubscriptions($topics: [WebhookSubscriptionTopic!]) {
          webhookSubscriptions(first: 50, topics: $topics) {
            nodes {
              id
              topic
              uri
            }
          }
        }`,
        { variables: { topics: APP_LEVEL_TOPICS } },
      );
      for (const subscription of response.data?.webhookSubscriptions.nodes ?? []) {
        console.log(`${apply ? "deleting" : "would delete"} ${shop} ${subscription.topic}`);
        if (apply) {
          await deleteWebhookById(subscription.id, client);
          deleted++;
        }
      }
    } catch (e) {
      failed++;
      console.error(`${shop}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(
    `${integrations.length} shops checked, ${deleted} subscriptions deleted, ${failed} shops failed${apply ? "" : " (dry run: pass --apply to delete)"}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    connection.disconnect();
  });
