import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import type { IntegrationProvider } from "../providers/integrationProvider.types.js";
import { INTEGRATION_PROVIDERS } from "../providers/registry.js";
import { markIntegrationHealthy, recordIntegrationFailure } from "./integrationHealth.js";

/**
 * A refresh that fails twice in a row — ninety minutes at the cron's pace — is
 * almost always a revoked grant rather than a network blip, and the org has to
 * reconnect. One failure alone is not worth waking anyone for.
 */
const REFRESH_NOTIFY_AFTER = 2;

/**
 * The scheduled refresh for every provider with a `refreshCredential`: keeps
 * OAuth tokens (and anything the provider renews alongside them, like Zoho's
 * webhook channels) alive for every active integration.
 *
 * Generalises the Zoho-only cron it replaces. Orgs are independent: one failing
 * is recorded against that integration and the sweep moves on.
 */
export async function refreshIntegrationCredentials(
  providers: readonly IntegrationProvider[] = INTEGRATION_PROVIDERS,
) {
  for (const provider of providers) {
    if (!provider.refreshCredential || provider.connection !== "integration") continue;

    const integrations = await prisma.integration.findMany({
      where: { name: provider.name, active: true },
    });

    for (const integration of integrations) {
      try {
        await provider.refreshCredential(integration);
        await markIntegrationHealthy(integration);
      } catch (err) {
        log.error(
          { err, integrationId: integration.id },
          "%s scheduled credential refresh failed",
          provider.label,
        );
        await recordIntegrationFailure(integration, provider.label, err, {
          notifyAfter: REFRESH_NOTIFY_AFTER,
        });
      }
    }
  }
}
