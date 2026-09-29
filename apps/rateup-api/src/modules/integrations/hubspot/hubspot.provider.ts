import { IntegratedApps } from "../../../types/enums.js";
import type { IntegrationProvider } from "../providers/integrationProvider.types.js";
import { getHubSpotAccessToken, HUBSPOT_SCOPES, hubSpotOAuthConfig } from "./hubspot.auth.js";
import { connectHubSpot, disconnectHubSpot } from "./hubspot.connect.js";

/**
 * HubSpot CRM, in the registry. Step 2.1 connects it; the RateUp events it
 * acts on arrive with the contact and deal steps, so `events` is empty for now.
 */
export const hubSpotProvider: IntegrationProvider = {
  name: IntegratedApps.hubspot,
  label: "HubSpot",
  auth: "oauth2",
  connection: "integration",
  events: [],
  subscribedEvents: () => [],
  handleEvent: async () => {},

  oauth: {
    config: hubSpotOAuthConfig,
    scopes: HUBSPOT_SCOPES,
    connect: connectHubSpot,
  },

  // Access tokens are refreshed on use (they outlive no cron interval). The
  // scheduled sweep still refreshes, which is what notices a revoked grant and
  // marks the integration as needing attention.
  async refreshCredential(integration) {
    await getHubSpotAccessToken(integration, { force: true });
  },

  disconnect: disconnectHubSpot,
};
