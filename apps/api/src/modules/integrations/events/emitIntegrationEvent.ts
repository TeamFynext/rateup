import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import {
  CONTACT_FIELD_KIND,
  contactFields,
  type PrimaryIdentityRow,
} from "../../contact/identity/contactFields.js";
import type {
  ContactRecord,
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
  const [filled] = await withContactFieldsFilled([event]);
  await integrationTriggerQueue.add(INTEGRATION_EVENT_JOB, {
    orgId,
    event: filled!,
  } satisfies IntegrationEventJobData);
}

/**
 * Many events at once, as one round trip to Redis — for a bulk write such as a
 * contact import. Each is still its own job, fanned out on its own.
 */
export async function emitIntegrationEvents(orgId: string, events: readonly IntegrationEvent[]) {
  if (!events.length) return;
  const filled = await withContactFieldsFilled(events);
  await integrationTriggerQueue.addBulk(
    filled.map((event) => ({
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

/**
 * Every listener reads a contact's `phone`, `email`, `bsuid`, `igsId` and `psid`, which are
 * its primary identities rather than columns. A record emitted straight from a Contact row
 * lacks them: they are added here, from `identities` when the row carries them, otherwise in
 * one query for all the events. Best effort: a failed lookup sends the events as they are.
 */
async function withContactFieldsFilled(
  events: readonly IntegrationEvent[],
): Promise<IntegrationEvent[]> {
  const records = (event: IntegrationEvent): ContactRecord[] =>
    "contact" in event && event.contact && "orgId" in event.contact
      ? [event.contact as ContactRecord, ...("sourceContact" in event ? [event.sourceContact] : [])]
      : [];
  const missing = events.flatMap(records).filter((c) => !("phone" in c) && !c.identities);
  let loaded = new Map<string, PrimaryIdentityRow[]>();
  if (missing.length) {
    try {
      const rows = await prisma.contactIdentity.findMany({
        where: {
          contactId: { in: [...new Set(missing.map((c) => c.id))] },
          isPrimary: true,
          kind: { in: Object.values(CONTACT_FIELD_KIND) },
        },
        select: { contactId: true, kind: true, value: true },
      });
      loaded = Map.groupBy(rows, (row) => row.contactId);
    } catch (err) {
      log.warn({ err }, "Could not load contact identities for an integration event");
      return [...events];
    }
  }

  const fill = (contact: ContactRecord): ContactRecord => {
    if ("phone" in contact) return contact;
    const { identities, ...rest } = contact;
    const rows = Array.isArray(identities)
      ? (identities as (PrimaryIdentityRow & { isPrimary?: boolean })[]).filter(
          (row) => row.isPrimary !== false,
        )
      : (loaded.get(contact.id) ?? []);
    return { ...rest, ...contactFields(rows) } as ContactRecord;
  };
  return events.map((event) => {
    if (!records(event).length) return event;
    const out = { ...event, contact: fill((event as { contact: ContactRecord }).contact) };
    if ("sourceContact" in event) {
      (out as { sourceContact: ContactRecord }).sourceContact = fill(event.sourceContact);
    }
    return out as IntegrationEvent;
  });
}
