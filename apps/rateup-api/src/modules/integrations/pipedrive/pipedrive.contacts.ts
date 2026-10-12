import { isAxiosError, type AxiosInstance } from "axios";

import type { Integration } from "../../../../generated/prisma/client.js";
import { IntegratedApps } from "../../../types/enums.js";
import prisma from "../../../utils/prisma.js";
import redisConnection from "../../../utils/redisConnection.js";
import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import type { IntegrationEvent } from "../events/integrationEvent.types.js";
import type {
  IntegrationEventContext,
  ProviderJobData,
} from "../providers/integrationProvider.types.js";
import {
  findLinkByRateupId,
  hashSyncPayload,
  recordLink,
  removeLink,
} from "../shared/entityLink.js";
import { pipedriveClientFor } from "./pipedrive.client.js";
import { readPipedriveCredential } from "./pipedrive.types.js";

/**
 * RateUp contacts → Pipedrive persons (step 5.2), on the rules HubSpot's follow:
 * behind the `syncContacts` switch, a match by email then phone is linked rather
 * than duplicated, and deleting a RateUp contact only forgets the link.
 *
 * A job carries only the contact's id and reads the row when it runs; a push that
 * hashes the same as the last is skipped.
 */

export const PIPEDRIVE_CONTACT_UPSERT = "contact-upsert";

const LINK_TYPE = "contact";

/**
 * Pipedrive meters each company by a daily token budget plus burst limits, and
 * answers 429 past either. The backoff rides that out; the shared worker reports
 * the integration only once the retries are spent.
 */
export const PIPEDRIVE_JOB_OPTIONS = {
  attempts: 4,
  backoff: { type: "exponential" as const, delay: 10_000 },
};

export interface PipedriveContactJobData {
  contactId: string;
}

/** What RateUp writes to a person. Only this is hashed and compared. */
export interface PipedrivePersonFields {
  name: string;
  email?: string;
  phone?: string;
}

/**
 * A contact as person fields, or null when it has nothing Pipedrive could find it
 * by again (neither email nor phone). Pipedrive requires a name, so a contact
 * without one is named by its email or phone.
 *
 * RateUp stores phones as E.164 digits without the `+`; Pipedrive gets the `+`.
 */
export function toPipedrivePersonFields(contact: {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}): PipedrivePersonFields | null {
  const email = contact.email?.trim().toLowerCase() || undefined;
  const digits = contact.phone?.replace(/\D/g, "") || undefined;
  if (!email && !digits) return null;
  const phone = digits ? `+${digits}` : undefined;
  const name = contact.name?.trim().replace(/\s+/g, " ") || email || phone || "";
  return { name, email, phone };
}

/** Turns a contact event into a queued push, or forgets the link of a deleted contact. */
export async function handlePipedriveContactEvent(
  event: IntegrationEvent,
  { orgId, integration }: IntegrationEventContext,
) {
  if (!integration) return;
  switch (event.type) {
    case "contact.created":
      return enqueueUpsert(orgId, event.contact.id);
    case "contact.updated":
      // Only name, email and phone reach Pipedrive.
      if (event.changed.includes("details")) return enqueueUpsert(orgId, event.contact.id);
      return;
    case "contact.deleted":
      await removeLink({ integrationId: integration.id, entityType: LINK_TYPE }, event.contact.id);
      return;
    default:
      return;
  }
}

async function enqueueUpsert(orgId: string, contactId: string) {
  const job: ProviderJobData<PipedriveContactJobData> = {
    integrationName: IntegratedApps.pipedrive,
    triggerKey: PIPEDRIVE_CONTACT_UPSERT,
    orgId,
    data: { contactId },
    rateupContactId: contactId,
  };
  await integrationTriggerQueue.add(
    `pipedrive-${PIPEDRIVE_CONTACT_UPSERT}`,
    job,
    PIPEDRIVE_JOB_OPTIONS,
  );
}

export type PipedriveContactOutcome =
  | "sync_off"
  | "contact_gone"
  | "nothing_to_send"
  | "unchanged"
  | "updated"
  | "linked"
  | "created";

/** Thrown when another job holds the contact; the queue retries it after the backoff. */
export class PipedriveContactBusyError extends Error {
  constructor() {
    super("Another Pipedrive push for this contact is running");
  }
}

const LOCK_TTL_MS = 60_000;

/**
 * Pipedrive does not keep emails unique, so two jobs racing past the search for the
 * same contact (a create followed by a quick edit) would both create a person. One
 * job per contact at a time, across workers; the other waits for its retry.
 */
export async function withContactLock<T>(
  integrationId: string,
  contactId: string,
  run: () => Promise<T>,
  redis: Pick<typeof redisConnection, "set" | "del"> = redisConnection,
): Promise<T> {
  const key = `pipedrive:contact-lock:${integrationId}:${contactId}`;
  const acquired = await redis.set(key, "1", "PX", LOCK_TTL_MS, "NX");
  if (acquired !== "OK") throw new PipedriveContactBusyError();
  try {
    return await run();
  } finally {
    await redis.del(key);
  }
}

/**
 * Sends one contact to Pipedrive: through its link when it has one; otherwise it
 * looks for the person by email, then by phone, links a match, and creates a
 * person only when nothing matches.
 */
export async function processPipedriveContactJob(
  integration: Integration,
  job: ProviderJobData,
): Promise<PipedriveContactOutcome> {
  if (!readPipedriveCredential(integration.credential)?.syncContacts) return "sync_off";

  const { contactId } = job.data as PipedriveContactJobData;
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { id: true, orgId: true, name: true, email: true, phone: true },
  });
  // Deleted since the job was queued (its link went with the delete event).
  if (!contact || contact.orgId !== integration.orgId) return "contact_gone";

  const fields = toPipedrivePersonFields(contact);
  if (!fields) return "nothing_to_send";

  return withContactLock(integration.id, contact.id, async () => {
    const key = { integrationId: integration.id, entityType: LINK_TYPE };
    const client = await pipedriveClientFor(integration);

    const link = await findLinkByRateupId(key, contact.id);
    if (link) {
      if (link.lastSyncHash === hashSyncPayload(fields)) return "unchanged";
      const person = await getPerson(client, link.externalId);
      if (person) {
        await client.patch(`/v2/persons/${person.id}`, editedPerson(fields, person));
        await recordLink(key, {
          rateupId: contact.id,
          externalId: link.externalId,
          payload: fields,
        });
        return "updated";
      }
      // Deleted in Pipedrive: match or create again, as for a contact never sent.
      await removeLink(key, contact.id);
    }

    return (await matchOrCreatePerson(integration, client, contact.id, fields)).outcome;
  });
}

/**
 * The person a RateUp contact is, for a deal to be on (step 5.3): the linked one,
 * else a match or a new one, linked. Runs whether or not the contacts switch is on.
 * Null when the contact has neither email nor phone.
 */
export async function pipedrivePersonIdFor(
  integration: Pick<Integration, "id">,
  client: AxiosInstance,
  contact: { id: string; name?: string | null; email?: string | null; phone?: string | null },
): Promise<number | null> {
  const link = await findLinkByRateupId(
    { integrationId: integration.id, entityType: LINK_TYPE },
    contact.id,
  );
  if (link) return Number(link.externalId);
  const fields = toPipedrivePersonFields(contact);
  if (!fields) return null;
  return withContactLock(
    integration.id,
    contact.id,
    async () => (await matchOrCreatePerson(integration, client, contact.id, fields)).id,
  );
}

/** Links someone Pipedrive already has, filling only what it has empty, or creates them. */
async function matchOrCreatePerson(
  integration: Pick<Integration, "id">,
  client: AxiosInstance,
  contactId: string,
  fields: PipedrivePersonFields,
): Promise<{ id: number; outcome: "linked" | "created" }> {
  const key = { integrationId: integration.id, entityType: LINK_TYPE };
  const matchId = await findPersonId(client, fields);
  const match = matchId === null ? null : await getPerson(client, matchId);
  if (match) {
    const fill = emptyOnly(fields, match);
    if (Object.keys(fill).length) await client.patch(`/v2/persons/${match.id}`, fill);
    await recordLink(key, { rateupId: contactId, externalId: String(match.id), payload: fields });
    return { id: match.id, outcome: "linked" };
  }

  const response = await client.post<{ data: { id: number } }>("/v2/persons", {
    name: fields.name,
    ...(fields.email && { emails: [{ value: fields.email, primary: true, label: "work" }] }),
    ...(fields.phone && { phones: [{ value: fields.phone, primary: true, label: "mobile" }] }),
  });
  const id = response.data.data.id;
  await recordLink(key, { rateupId: contactId, externalId: String(id), payload: fields });
  return { id, outcome: "created" };
}

interface PipedriveValue {
  value: string;
  primary?: boolean;
  label?: string;
}

export interface PipedrivePerson {
  id: number;
  name?: string | null;
  emails?: PipedriveValue[] | null;
  phones?: PipedriveValue[] | null;
  is_deleted?: boolean;
}

/** The person, or null once it is deleted in Pipedrive (kept there 30 days, flagged). */
export async function getPerson(client: AxiosInstance, id: string | number) {
  try {
    const response = await client.get<{ data: PipedrivePerson }>(`/v2/persons/${id}`);
    const person = response.data.data;
    return person && !person.is_deleted ? person : null;
  } catch (error) {
    if (isAxiosError(error) && [404, 410].includes(error.response?.status ?? 0)) return null;
    throw error;
  }
}

/**
 * Email first, then the phone number, each an exact match. A search costs far more
 * of the daily budget than a read, so it runs only for contacts not yet linked.
 * Pipedrive matches the phone as typed: one saved as "+91 98765 43210" is missed.
 */
async function findPersonId(
  client: AxiosInstance,
  fields: PipedrivePersonFields,
): Promise<number | null> {
  const searches: ["email" | "phone", string][] = [];
  if (fields.email) searches.push(["email", fields.email]);
  if (fields.phone) searches.push(["phone", fields.phone]);

  for (const [field, term] of searches) {
    const response = await client.get<{ data?: { items?: { item: { id: number } }[] } }>(
      "/v2/persons/search",
      { params: { term, fields: field, exact_match: true, limit: 1 } },
    );
    const found = response.data.data?.items?.[0]?.item;
    if (found) return found.id;
  }
  return null;
}

/**
 * A linked person's edit: RateUp's name, and its email and phone as the primary
 * ones. The person's other emails and phones, added in Pipedrive, stay.
 */
export function editedPerson(fields: PipedrivePersonFields, person: PipedrivePerson) {
  return {
    name: fields.name,
    ...(fields.email && { emails: withPrimary(person.emails, fields.email, "work") }),
    ...(fields.phone && { phones: withPrimary(person.phones, fields.phone, "mobile") }),
  };
}

function withPrimary(current: PipedriveValue[] | null | undefined, value: string, label: string) {
  const others = (current ?? [])
    .filter((entry) => entry.value?.trim().toLowerCase() !== value.toLowerCase())
    .map(({ value: other, label: otherLabel }) => ({
      value: other,
      primary: false,
      label: otherLabel ?? "other",
    }));
  return [{ value, primary: true, label }, ...others];
}

/** A match is someone Pipedrive already knew: only what it has empty is filled. */
function emptyOnly(fields: PipedrivePersonFields, person: PipedrivePerson) {
  const hasAny = (values?: PipedriveValue[] | null) =>
    (values ?? []).some((entry) => entry.value?.trim());
  return {
    ...(fields.email &&
      !hasAny(person.emails) && {
        emails: [{ value: fields.email, primary: true, label: "work" }],
      }),
    ...(fields.phone &&
      !hasAny(person.phones) && {
        phones: [{ value: fields.phone, primary: true, label: "mobile" }],
      }),
  };
}
