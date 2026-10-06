import type { Integration } from "../../../../generated/prisma/client.js";
import { IntegratedApps } from "../../../types/enums.js";
import type { IntegrationProvider } from "../providers/integrationProvider.types.js";
import { getActiveShopifySession, refreshShopifyCredential } from "./shopify.session.js";

const asShopify = (integration: Integration) => integration as unknown as ShopifyIntegration;

/**
 * Shopify, in the registry. Most of it stays on its own paths, because Shopify
 * fixes them rather than RateUp:
 *
 * - Connect starts in Shopify (`shopify.connect.ts`), so there is no `oauth`.
 * - Deliveries come to `/api/public/integrations/shopify/webhooks`, signed with
 *   the app's secret and subscribed app-wide in `shopify.app.toml`, so there is
 *   no `handleInbound` on the shared per-integration receiver.
 * - They run on `webhookQueue` (`shopify.inbound.ts`), deduplicated on Shopify's
 *   webhook id and never retried, because a retry would message the customer
 *   twice. A delivery names a shop, and a shop that is not claimed yet has no
 *   org, so `integrationTriggerQueue` (keyed by org) cannot carry them and there
 *   is no `processJob`.
 *
 * It acts on no RateUp event, so `events` is empty.
 */
export const shopifyProvider: IntegrationProvider = {
  name: IntegratedApps.shopify,
  label: "Shopify",
  auth: "custom",
  connection: "integration",
  events: [],
  subscribedEvents: () => [],
  handleEvent: async () => {},
  refreshCredential: (integration) => refreshShopifyCredential(asShopify(integration)),
  /**
   * Removes the per-shop webhook subscriptions when the shared route deletes
   * the row. Shopify's own `DELETE /integrations/shopify/:shop` still refuses
   * while the app is installed; uninstalling drops the subscriptions anyway.
   */
  disconnect: async (integration) => {
    const shopifyIntegration = asShopify(integration);
    if (!shopifyIntegration.credential?.session) return;
    const { deleteAllWebhooks } = await import("./shopify.webhooks.js");
    await deleteAllWebhooks(await getActiveShopifySession(shopifyIntegration));
  },
};
