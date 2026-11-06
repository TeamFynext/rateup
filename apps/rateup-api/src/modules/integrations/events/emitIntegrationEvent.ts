import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import type {
  IntegrationEvent,
  IntegrationEventJobData,
  SurveyResponseSnapshot,
} from "./integrationEvent.types.js";

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

/**
 * Many events at once, as one round trip to Redis — for a bulk write such as a
 * contact import. Each is still its own job, fanned out on its own.
 */
export async function emitIntegrationEvents(orgId: string, events: readonly IntegrationEvent[]) {
  if (!events.length) return;
  await integrationTriggerQueue.addBulk(
    events.map((event) => ({
      name: INTEGRATION_EVENT_JOB,
      data: { orgId, event } satisfies IntegrationEventJobData,
    })),
  );
}

/**
 * `survey.response_submitted`, from wherever a response is filed. An anonymous
 * response is announced too: Zapier forwards every response, and the CRMs skip
 * one with no contact.
 */
export async function emitSurveyResponseSubmitted(
  orgId: string | null | undefined,
  response: { id: string; contactId: string | null; platform: string; createdAt: Date },
) {
  if (!orgId) return;
  const snapshot: SurveyResponseSnapshot = {
    id: response.id,
    contactId: response.contactId,
    platform: response.platform,
    createdAt: response.createdAt.toISOString(),
  };
  await emitIntegrationEvent(orgId, { type: "survey.response_submitted", response: snapshot });
}
