import type { Integration } from "../../../../generated/prisma/client.js";
import { log } from "../../../utils/logger.js";
import { IntegratedApps } from "../../../types/enums.js";
import type {
  IntegrationProvider,
  ProviderJobData,
} from "../providers/integrationProvider.types.js";
import { removeWooWebhooks } from "./woocommerce.connect.js";
import { handleWooInbound, type WooJobData } from "./woocommerce.inbound.js";
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
      const [{ handleWooOrder }, { onOrderEvent }, { wooCommerceCommerce }] = await Promise.all([
        import("./woocommerce.orders.js"),
        import("../commerce/orders.js"),
        import("./woocommerce.commerce.js"),
      ]);
      await handleWooOrder(integration, data, { provider: wooCommerceCommerce, onOrderEvent });
      return;
    }
    case "customer.created": {
      const { handleWooCustomer } = await import("./woocommerce.customers.js");
      await handleWooCustomer(integration, data);
      return;
    }
    case "product.updated": {
      const { handleWooProductUpdated } = await import("./woocommerce.products.js");
      await handleWooProductUpdated(integration, data);
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
  disconnect: async (integration) => {
    const credential = readWooCredential(integration.credential);
    if (credential) await removeWooWebhooks(credential);
  },
};
