import type { Integration } from "../../../generated/prisma/client.js";
import { log } from "../../../utils/logger.js";
import { IntegratedApps } from "../../../types/enums.js";
import type {
  IntegrationProvider,
  ProviderJobData,
} from "../providers/integrationProvider.types.js";
import { removeWooWebhooks, syncWooWebhooks } from "./woocommerce.connect.js";
import { handleWooInbound, type WooJobData } from "./woocommerce.inbound.js";
import {
  DISCONNECTED_PLUGIN_DATA,
  pushWooPluginData,
  syncWooPluginConnection,
} from "./woocommerce.plugin.js";
import { readWooCredential } from "./woocommerce.types.js";

/**
 * Runs one queued delivery. Orders go through the commerce layer; customers
 * become contacts when the admin has switched that on; product changes reach
 * the WhatsApp catalog items imported from them.
 *
 * Each path is loaded on use: they reach the commerce layer, Redis, contacts
 * and the automation engine, none of which the registry importing this module needs.
 */
async function processWooJob(integration: Integration, job: ProviderJobData) {
  const { triggerKey, data } = job as WooJobData;

  switch (triggerKey) {
    case "order.created":
    case "order.updated": {
      const [
        { handleWooOrderOptIn },
        { handleWooOrder },
        { onOrderEvent },
        { wooCommerceCommerce },
      ] = await Promise.all([
        import("./woocommerce.optin.js"),
        import("./woocommerce.orders.js"),
        import("../commerce/orders.js"),
        import("./woocommerce.commerce.js"),
      ]);
      // First, so the order's own messages reach a contact that already has its name.
      await handleWooOrderOptIn(integration, data);
      await handleWooOrder(integration, data, { provider: wooCommerceCommerce, onOrderEvent });
      return;
    }
    case "customer.created": {
      const { handleWooCustomer } = await import("./woocommerce.customers.js");
      await handleWooCustomer(integration, data);
      return;
    }
    case "product.updated":
    case "product.created":
    case "product.deleted": {
      if (triggerKey === "product.updated") {
        const { handleWooProductUpdated } = await import("./woocommerce.products.js");
        await handleWooProductUpdated(integration, data);
      }
      // A shop that follows this store copies its products in again shortly after.
      if (integration.orgId) {
        const { scheduleStoreMirror } = await import("../../commerce/shop/storeSync.service.js");
        await scheduleStoreMirror(integration.orgId, "woocommerce");
      }
      return;
    }
    default:
      log.info(
        { integrationId: integration.id, topic: triggerKey, deliveryId: data.deliveryId },
        "WooCommerce delivery received",
      );
  }
}

/**
 * WooCommerce, in the registry. It only listens to the store — it acts on no
 * RateUp event — so `events` is empty and the fan-out never visits it; its work
 * arrives through `handleInbound` and runs in `processJob`.
 */
export const wooCommerceProvider: IntegrationProvider = {
  name: IntegratedApps.woocommerce,
  label: "WooCommerce",
  auth: "custom",
  connection: "integration",
  events: [],
  subscribedEvents: () => [],
  handleEvent: async () => {},
  handleInbound: handleWooInbound,
  processJob: processWooJob,
  // The keys never expire; the scheduled sweep is for the webhooks. WooCommerce
  // disables one after five failed deliveries (an API outage is enough) and
  // never turns it back on, so the sweep replaces any that are disabled, paused
  // or gone. A store that stops answering fails here, which the health alert shows.
  // It also brings the RateUp plugin up to date, for one installed after the connect.
  refreshCredential: async (integration) => {
    await syncWooWebhooks(integration);
    await syncWooPluginConnection(integration);
  },
  disconnect: async (integration) => {
    const credential = readWooCredential(integration.credential);
    if (!credential) return;
    await removeWooWebhooks(credential);
    // While the credential is still at hand (the integration row is deleted next),
    // the plugin goes back to offering "Connect to RateUp".
    await pushWooPluginData(credential, DISCONNECTED_PLUGIN_DATA);
  },
};
