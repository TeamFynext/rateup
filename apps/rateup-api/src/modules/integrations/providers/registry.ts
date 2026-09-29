import { getLeadProvider } from "../external/getlead/getlead.provider.js";
import { zapierProvider } from "../external/zapier/zapier.provider.js";
import { zohoProvider } from "../external/zoho/zoho.provider.js";
import { webhookProvider } from "../../webhook/webhook.provider.js";
import { hubSpotProvider } from "../hubspot/hubspot.provider.js";
import { wooCommerceProvider } from "../woocommerce/woocommerce.provider.js";
import type { IntegrationProvider } from "./integrationProvider.types.js";

/**
 * Every integration Rateup can talk to. A new provider is added here and
 * nowhere else.
 *
 * Order is the order the fan-out visits them in. It only matters for tests that
 * read enqueued jobs by position.
 */
export const INTEGRATION_PROVIDERS: readonly IntegrationProvider[] = [
  zapierProvider,
  zohoProvider,
  getLeadProvider,
  webhookProvider,
  wooCommerceProvider,
  hubSpotProvider,
];

export function getIntegrationProvider(name: string): IntegrationProvider | undefined {
  return INTEGRATION_PROVIDERS.find((provider) => provider.name === name);
}
