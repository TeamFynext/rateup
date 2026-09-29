import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import type { IntegrationEvent, IntegrationEventJobData } from "./integrationEvent.types.js";

/** The job name the integration worker recognises as an event to fan out. */
export const INTEGRATION_EVENT_JOB = "integration-event";

/**
 * Tells every integration something happened. The only thing a call site needs.
 *
 * It enqueues one job. The worker then resolves which providers the org has
 * connected and lets each adapter enqueue its own provider jobs with its own
 * retry options — which is why this is two hops rather than one: a single job
 * doing every provider's API call would re-run Zoho's creates each time GetLead
 * retried a 429.
 */
export async function emitIntegrationEvent(orgId: string, event: IntegrationEvent) {
  await integrationTriggerQueue.add(INTEGRATION_EVENT_JOB, {
    orgId,
    event,
  } satisfies IntegrationEventJobData);
}
