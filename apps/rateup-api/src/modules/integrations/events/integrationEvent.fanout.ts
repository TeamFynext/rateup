import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import type { IntegrationProvider } from "../providers/integrationProvider.types.js";
import { INTEGRATION_PROVIDERS } from "../providers/registry.js";
import type { IntegrationEventJobData, IntegrationEventType } from "./integrationEvent.types.js";

/**
 * Hands one event to every provider that acts on it and that this org has
 * connected and subscribed.
 *
 * The connected integrations are read in one query, so an org with none costs
 * one lookup — where the old per-provider jobs each did their own, whether or
 * not the org had ever connected the provider.
 *
 * Providers are independent: one throwing does not stop the rest. The failures
 * are rethrown together afterwards so the job is recorded as failed. It is not
 * retried — providers only enqueue, and a retry would enqueue the ones that
 * succeeded a second time.
 */
export async function processIntegrationEvent(
  { orgId, event }: IntegrationEventJobData,
  providers: readonly IntegrationProvider[] = INTEGRATION_PROVIDERS,
) {
  const interested = providers.filter((provider) => provider.events.includes(event.type));
  if (!interested.length) return;

  const names = interested.flatMap((provider) =>
    provider.connection === "integration" ? [provider.name] : [],
  );
  const connected = names.length
    ? await prisma.integration.findMany({
        where: { orgId, active: true, name: { in: names } },
      })
    : [];

  const failures: unknown[] = [];
  for (const provider of interested) {
    const integration =
      provider.connection === "integration"
        ? connected.find((row) => row.name === provider.name)
        : null;
    // Not connected is the ordinary case, not a failure.
    if (integration === undefined) continue;
    if (!provider.subscribedEvents(integration).includes(event.type)) continue;

    try {
      await provider.handleEvent(event, { orgId, integration });
    } catch (error) {
      log.error({ err: error }, "Integration provider %s failed on %s", provider.name, event.type);
      failures.push(error);
    }
  }

  if (failures.length) {
    throw new AggregateError(failures, `${failures.length} provider(s) failed on ${event.type}`);
  }
}

/**
 * Every event type at least one of this org's providers would act on — the
 * same tests the fan-out applies, done once up front. For a bulk write that
 * would otherwise queue thousands of events for an org that wants none of them.
 */
export async function subscribedEventTypes(
  orgId: string,
  providers: readonly IntegrationProvider[] = INTEGRATION_PROVIDERS,
): Promise<Set<IntegrationEventType>> {
  const names = providers.flatMap((provider) =>
    provider.connection === "integration" ? [provider.name] : [],
  );
  const connected = names.length
    ? await prisma.integration.findMany({ where: { orgId, active: true, name: { in: names } } })
    : [];

  const wanted = new Set<IntegrationEventType>();
  for (const provider of providers) {
    let events: readonly IntegrationEventType[];
    if (provider.connection === "integration") {
      const integration = connected.find((row) => row.name === provider.name);
      if (!integration) continue;
      events = provider.subscribedEvents(integration);
    } else {
      events = provider.orgSubscribedEvents
        ? await provider.orgSubscribedEvents(orgId)
        : provider.subscribedEvents(null);
    }
    for (const event of events) if (provider.events.includes(event)) wanted.add(event);
  }
  return wanted;
}
