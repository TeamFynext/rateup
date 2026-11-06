import { isAxiosError, type AxiosInstance } from "axios";

import type { Integration } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { IntegratedApps } from "../../../types/enums.js";
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
import { hubSpotClientFor } from "./hubspot.auth.js";
import { readHubSpotCredential } from "./hubspot.types.js";

/**
 * RateUp contacts → HubSpot contacts (step 2.2).
 *
 * A job carries only the contact's id and reads the row when it runs, so a create
 * followed by a quick edit pushes the latest values twice — and the second push is
 * skipped, since it hashes the same as the first. Deleting a RateUp contact only
 * forgets the link; the HubSpot contact stays.
 */

export const HUBSPOT_CONTACT_UPSERT = "contact-upsert";

const LINK_TYPE = "contact";

/**
 * HubSpot allows 100 requests per 10 seconds per account. Retrying with a backoff
 * rides out a 429 or a HubSpot outage; the shared worker reports the integration
 * only once the retries are spent.
 */
export const HUBSPOT_JOB_OPTIONS = {
  attempts: 4,
  backoff: { type: "exponential" as const, delay: 10_000 },
};

export interface HubSpotContactJobData {
  contactId: string;
}

/** The HubSpot properties RateUp writes. Only these are hashed, sent and compared. */
export interface HubSpotContactProperties {
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
}

/**
 * A contact as HubSpot properties, or null when it has nothing HubSpot could find
 * it by again: an Instagram or Messenger contact with neither email nor phone would
 * only ever be an empty, unmatchable record.
 *
 * RateUp stores phones as E.164 digits without the `+`; HubSpot gets the `+`.
 */
export function toHubSpotContactProperties(contact: {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}): HubSpotContactProperties | null {
  const email = contact.email?.trim().toLowerCase() || undefined;
  const digits = contact.phone?.replace(/\D/g, "") || undefined;
  if (!email && !digits) return null;

  const name = contact.name?.trim().replace(/\s+/g, " ") ?? "";
  const space = name.indexOf(" ");
  return {
    firstname: (space === -1 ? name : name.slice(0, space)) || undefined,
    lastname: (space === -1 ? "" : name.slice(space + 1)) || undefined,
    email,
    phone: digits ? `+${digits}` : undefined,
  };
}

/** Turns a contact event into a queued push, or forgets the link of a deleted contact. */
export async function handleHubSpotContactEvent(
  event: IntegrationEvent,
  { orgId, integration }: IntegrationEventContext,
) {
  if (!integration) return;
  switch (event.type) {
    case "contact.created":
      return enqueueUpsert(orgId, event.contact.id);
    case "contact.updated":
      // Only name, email and phone reach HubSpot; an inbox status or lifecycle
      // change alone has nothing to send.
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
  const job: ProviderJobData<HubSpotContactJobData> = {
    integrationName: IntegratedApps.hubspot,
    triggerKey: HUBSPOT_CONTACT_UPSERT,
    orgId,
    data: { contactId },
    rateupContactId: contactId,
  };
  await integrationTriggerQueue.add(`hubspot-${HUBSPOT_CONTACT_UPSERT}`, job, HUBSPOT_JOB_OPTIONS);
}

export type HubSpotContactOutcome =
  | "sync_off"
  | "contact_gone"
  | "nothing_to_send"
  | "unchanged"
  | "updated"
  | "linked"
  | "created";

/**
 * Sends one contact to HubSpot: through its link when it has one; otherwise it
 * looks for the person by email, then by phone, links a match, and creates a
 * HubSpot contact only when nothing matches.
 *
 * A match is someone HubSpot already knew, so linking only fills the properties
 * HubSpot has empty. From then on, edits made in RateUp are pushed as they are.
 */
export async function processHubSpotContactJob(
  integration: Integration,
  job: ProviderJobData,
): Promise<HubSpotContactOutcome> {
  if (!readHubSpotCredential(integration.credential)?.syncContacts) return "sync_off";

  const { contactId } = job.data as HubSpotContactJobData;
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { id: true, orgId: true, name: true, email: true, phone: true },
  });
  // Deleted since the job was queued (its link went with the delete event).
  if (!contact || contact.orgId !== integration.orgId) return "contact_gone";

  const properties = toHubSpotContactProperties(contact);
  if (!properties) return "nothing_to_send";

  const key = { integrationId: integration.id, entityType: LINK_TYPE };
  const hash = hashSyncPayload(properties);
  const client = await hubSpotClientFor(integration);

  const link = await findLinkByRateupId(key, contact.id);
  if (link) {
    if (link.lastSyncHash === hash) return "unchanged";
    try {
      await client.patch(`/crm/v3/objects/contacts/${link.externalId}`, { properties });
      await recordLink(key, {
        rateupId: contact.id,
        externalId: link.externalId,
        payload: properties,
      });
      return "updated";
    } catch (error) {
      // Deleted in HubSpot: match or create again, as for a contact never sent.
      if (!(isAxiosError(error) && error.response?.status === 404)) throw error;
      await removeLink(key, contact.id);
    }
  }

  return (await matchOrCreateHubSpotContact(integration, client, contact.id, properties)).outcome;
}

/**
 * The HubSpot contact a RateUp contact is, for a deal to be associated with (step
 * 2.3): the linked one, else a match or a new one, linked. Runs whether or not the
 * contacts switch is on — a deal is only useful with its person on it. Null when
 * the contact has neither email nor phone.
 */
export async function hubSpotContactIdFor(
  integration: Pick<Integration, "id">,
  client: AxiosInstance,
  contact: { id: string; name?: string | null; email?: string | null; phone?: string | null },
): Promise<string | null> {
  const link = await findLinkByRateupId(
    { integrationId: integration.id, entityType: LINK_TYPE },
    contact.id,
  );
  if (link) return link.externalId;
  const properties = toHubSpotContactProperties(contact);
  if (!properties) return null;
  return (await matchOrCreateHubSpotContact(integration, client, contact.id, properties)).id;
}

/** Links someone HubSpot already has, filling only what it has empty, or creates them. */
async function matchOrCreateHubSpotContact(
  integration: Pick<Integration, "id">,
  client: AxiosInstance,
  contactId: string,
  properties: HubSpotContactProperties,
): Promise<{ id: string; outcome: "linked" | "created" }> {
  const key = { integrationId: integration.id, entityType: LINK_TYPE };
  const match = await findHubSpotContact(client, properties);
  if (match) {
    const fill = emptyOnly(properties, match.properties);
    if (Object.keys(fill).length) {
      await client.patch(`/crm/v3/objects/contacts/${match.id}`, { properties: fill });
    }
    await recordLink(key, { rateupId: contactId, externalId: match.id, payload: properties });
    return { id: match.id, outcome: "linked" };
  }

  const created = await createHubSpotContact(client, properties);
  await recordLink(key, { rateupId: contactId, externalId: created.id, payload: properties });
  if (created.existing) {
    log.info(
      { integrationId: integration.id, contactId },
      "HubSpot contact appeared while this one was being sent; linked to it",
    );
    return { id: created.id, outcome: "linked" };
  }
  return { id: created.id, outcome: "created" };
}

interface HubSpotContactRecord {
  id: string;
  properties: Record<string, string | null | undefined>;
}

/** Email first — HubSpot keeps it unique — then the phone number. */
async function findHubSpotContact(
  client: AxiosInstance,
  properties: HubSpotContactProperties,
): Promise<HubSpotContactRecord | null> {
  const searches: [string, string][] = [];
  if (properties.email) searches.push(["email", properties.email]);
  if (properties.phone) searches.push(["phone", properties.phone]);

  for (const [propertyName, value] of searches) {
    const response = await client.post<{ results: HubSpotContactRecord[] }>(
      "/crm/v3/objects/contacts/search",
      {
        filterGroups: [{ filters: [{ propertyName, operator: "EQ", value }] }],
        properties: ["firstname", "lastname", "email", "phone"],
        limit: 1,
      },
    );
    const found = response.data.results?.[0];
    if (found) return found;
  }
  return null;
}

/** HubSpot's answer when the email is taken: "Contact already exists. Existing ID: 123". */
const EXISTING_ID = /Existing ID:\s*(\d+)/i;

/**
 * Creates the contact. Two jobs can race past the search for the same person;
 * HubSpot refuses the second create with a 409 naming the one that won, and that
 * one is linked instead.
 */
export async function createHubSpotContact(
  client: AxiosInstance,
  properties: HubSpotContactProperties,
): Promise<{ id: string; existing: boolean }> {
  try {
    const response = await client.post<{ id: string }>("/crm/v3/objects/contacts", {
      properties,
    });
    return { id: response.data.id, existing: false };
  } catch (error) {
    const existingId =
      isAxiosError(error) && error.response?.status === 409
        ? String((error.response.data as { message?: string })?.message ?? "").match(
            EXISTING_ID,
          )?.[1]
        : undefined;
    if (!existingId) throw error;
    return { id: existingId, existing: true };
  }
}

function emptyOnly(
  ours: HubSpotContactProperties,
  theirs: HubSpotContactRecord["properties"],
): HubSpotContactProperties {
  return Object.fromEntries(
    Object.entries(ours).filter(([name, value]) => value && !theirs[name]?.trim()),
  );
}
