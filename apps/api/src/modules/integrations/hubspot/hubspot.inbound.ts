import { isAxiosError, type AxiosInstance } from "axios";

import type { Integration } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { LEADS_PIPELINE_TYPE } from "../../pipeline/pipelineTypes.js";
import { emitIntegrationEvent } from "../events/emitIntegrationEvent.js";
import type { ProviderJobData } from "../providers/integrationProvider.types.js";
import {
  findLinkByExternalId,
  hashSyncPayload,
  recordLink,
  removeLink,
} from "../shared/entityLink.js";
import { hubSpotClientFor } from "./hubspot.auth.js";
import { toHubSpotContactProperties } from "./hubspot.contacts.js";
import type { HubSpotDealProperties } from "./hubspot.deals.js";
import { readHubSpotCredential, type HubSpotCredential } from "./hubspot.types.js";
import type { HubSpotInboundJobData } from "./hubspot.webhook.js";

/**
 * Applies a change made in HubSpot to RateUp (step 2.4).
 *
 * The webhook only says that a record changed, so the job reads it whole. Edits to
 * linked records follow the outbound switches (two-way); records created in
 * HubSpot are imported only behind their own switches. A record deleted in HubSpot
 * only loses its link — the RateUp side stays.
 *
 * Echoes: an inbound change hashing the same as RateUp's last push is RateUp's own
 * write coming back and is skipped. After applying a change, the link is recorded
 * with the RateUp record's new values, so the outbound push the change triggers
 * finds nothing to send.
 */

const CONTACT = "contact";
const LEAD = "lead";

/** An integration that belongs to an org — every connected HubSpot row does. */
type OrgIntegration = Integration & { orgId: string };

const isUniqueViolation = (error: unknown) => (error as { code?: string } | null)?.code === "P2002";

export type HubSpotInboundOutcome =
  | "ignored"
  | "sync_off"
  | "deleted"
  | "echo"
  | "unchanged"
  | "applied"
  | "rateup_gone"
  | "no_phone"
  | "linked"
  | "created"
  | "other_pipeline"
  | "unmapped";

export async function processHubSpotInboundJob(
  integration: Integration,
  job: ProviderJobData,
): Promise<HubSpotInboundOutcome> {
  const credential = readHubSpotCredential(integration.credential);
  if (!credential || !integration.orgId) return "ignored";
  const owned = integration as OrgIntegration;
  const data = job.data as HubSpotInboundJobData;
  return data.objectType === "contact"
    ? processContact(owned, credential, data)
    : processDeal(owned, credential, data);
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

interface HubSpotPerson {
  name: string | null;
  email: string | null;
  /** E.164 digits, as RateUp stores them — only when HubSpot holds the number with its `+`. */
  phone: string | null;
}

/**
 * A HubSpot contact in RateUp's terms. A number HubSpot holds without a country
 * code (`098765 43210`) cannot be turned into RateUp's international form safely,
 * so it is left out rather than guessed at.
 */
export function fromHubSpotContact(properties: Record<string, string | null | undefined>) {
  const name = [properties.firstname, properties.lastname]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  const rawPhone = properties.phone?.trim() ?? "";
  const digits = rawPhone.startsWith("+") ? rawPhone.replace(/\D/g, "") : "";
  return {
    name: name || null,
    email: properties.email?.trim().toLowerCase() || null,
    phone: digits.length >= 8 ? digits : null,
  } satisfies HubSpotPerson;
}

async function fetchRecord(client: AxiosInstance, path: string, params: Record<string, string>) {
  try {
    const response = await client.get<{
      id: string;
      properties: Record<string, string | null | undefined>;
      associations?: { contacts?: { results?: { id: string }[] } };
    }>(path, { params });
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

const CONTACT_PROPERTIES = { properties: "firstname,lastname,email,phone" };

async function processContact(
  integration: OrgIntegration,
  credential: HubSpotCredential,
  { objectId, created }: HubSpotInboundJobData,
): Promise<HubSpotInboundOutcome> {
  const key = { integrationId: integration.id, entityType: CONTACT };
  const link = await findLinkByExternalId(key, objectId);
  if (link && !credential.syncContacts) return "sync_off";
  if (!link && !(created && credential.importContacts)) return "ignored";

  const client = await hubSpotClientFor(integration);
  const record = await fetchRecord(
    client,
    `/crm/v3/objects/contacts/${objectId}`,
    CONTACT_PROPERTIES,
  );
  if (!record) {
    if (link) await removeLink(key, link.rateupId);
    return link ? "deleted" : "ignored";
  }
  const person = fromHubSpotContact(record.properties);

  if (!link) {
    const outcome = await importHubSpotContact(integration, objectId, person);
    return outcome.outcome;
  }

  const inbound = toHubSpotContactProperties(person);
  if (inbound && link.lastSyncHash === hashSyncPayload(inbound)) return "echo";

  const contact = await prisma.contact.findUnique({
    where: { id: link.rateupId },
    select: { id: true, orgId: true, name: true, email: true, phone: true },
  });
  if (!contact || contact.orgId !== integration.orgId) {
    await removeLink(key, link.rateupId);
    return "rateup_gone";
  }

  // Only what HubSpot actually holds replaces RateUp's value; nothing is cleared.
  const update: { name?: string; email?: string; phone?: string } = {};
  if (person.name && person.name !== contact.name) update.name = person.name;
  if (person.email && person.email !== contact.email?.trim().toLowerCase()) {
    update.email = person.email;
  }
  if (person.phone && person.phone !== contact.phone) {
    const taken = await prisma.contact.findUnique({
      where: { contact_phone_org_id_unique: { phone: person.phone, orgId: contact.orgId } },
      select: { id: true },
    });
    if (taken) {
      log.info(
        { integrationId: integration.id, contactId: contact.id },
        "HubSpot changed a contact's phone to a number another RateUp contact has; phone left as it was",
      );
    } else {
      update.phone = person.phone;
    }
  }

  const current = Object.keys(update).length
    ? await prisma.contact.update({ where: { id: contact.id }, data: update })
    : contact;
  await recordLink(key, {
    rateupId: contact.id,
    externalId: objectId,
    payload: toHubSpotContactProperties(current) ?? undefined,
  });
  if (!Object.keys(update).length) return "unchanged";

  // Other integrations (Zapier, the outgoing webhook) hear about it; HubSpot's own
  // push finds the link's hash already current and sends nothing.
  await emitIntegrationEvent(contact.orgId, {
    type: "contact.updated",
    contact: current as never,
    changed: ["details"],
  });
  return "applied";
}

/**
 * A HubSpot contact RateUp has not met: linked to the RateUp contact with the same
 * phone or email, or created. RateUp contacts are keyed on their phone, so one
 * without a number cannot be created.
 */
export async function importHubSpotContact(
  integration: { id: string; orgId: string },
  objectId: string,
  person: HubSpotPerson,
): Promise<{ outcome: "no_phone" | "linked" | "created"; contactId?: string }> {
  const key = { integrationId: integration.id, entityType: CONTACT };
  const { orgId } = integration;
  const select = { id: true, name: true, email: true, phone: true } as const;

  const existing =
    (person.phone &&
      (await prisma.contact.findUnique({
        where: { contact_phone_org_id_unique: { phone: person.phone, orgId } },
        select,
      }))) ||
    (person.email &&
      (await prisma.contact.findFirst({
        where: { orgId, email: { equals: person.email, mode: "insensitive" } },
        select,
      }))) ||
    null;
  const link = async (contact: { id: string } & HubSpotPerson) => {
    await recordLink(key, {
      rateupId: contact.id,
      externalId: objectId,
      payload: toHubSpotContactProperties(contact) ?? undefined,
    });
  };
  if (existing) {
    await link(existing);
    return { outcome: "linked", contactId: existing.id };
  }
  if (!person.phone) return { outcome: "no_phone" };

  // Loaded on use: contact creation reaches the automation engine and the fan-out.
  const { createContact } = await import("../../contact/contact.service.js");
  try {
    // Quiet, so no per-contact pushes fire before the link exists; the event is
    // emitted below, once HubSpot's own push would find the contact linked.
    const created = await createContact(
      {
        orgId,
        phone: person.phone,
        name: person.name ?? "",
        ...(person.email && { email: person.email }),
        source: "HubSpot",
      },
      undefined,
      { quiet: true },
    );
    await link({ ...person, id: created.id });
    await emitIntegrationEvent(orgId, { type: "contact.created", contact: created as never });
    return { outcome: "created", contactId: created.id };
  } catch (error) {
    // Created a moment ago by something else — a WhatsApp message, a retry.
    if (!isUniqueViolation(error)) throw error;
    const raced = await prisma.contact.findUnique({
      where: { contact_phone_org_id_unique: { phone: person.phone, orgId } },
      select,
    });
    if (!raced) throw error;
    await link(raced);
    return { outcome: "linked", contactId: raced.id };
  }
}

// ---------------------------------------------------------------------------
// Deals
// ---------------------------------------------------------------------------

const DEAL_PARAMS = { properties: "dealname,dealstage,pipeline", associations: "contacts" };

async function processDeal(
  integration: OrgIntegration,
  credential: HubSpotCredential,
  { objectId, created }: HubSpotInboundJobData,
): Promise<HubSpotInboundOutcome> {
  const key = { integrationId: integration.id, entityType: LEAD };
  const link = await findLinkByExternalId(key, objectId);
  if (link && !credential.syncDeals) return "sync_off";
  if (!link && !(created && credential.importDeals)) return "ignored";
  if (!credential.dealPipelineId) return "sync_off";

  const client = await hubSpotClientFor(integration);
  const record = await fetchRecord(client, `/crm/v3/objects/deals/${objectId}`, DEAL_PARAMS);
  if (!record) {
    if (link) await removeLink(key, link.rateupId);
    return link ? "deleted" : "ignored";
  }
  const properties: HubSpotDealProperties = {
    dealname: record.properties.dealname?.trim() ?? "",
    pipeline: record.properties.pipeline ?? "",
    dealstage: record.properties.dealstage ?? "",
  };
  // A deal moved to another pipeline has stages no column maps to.
  if (properties.pipeline !== credential.dealPipelineId) return "other_pipeline";

  if (!link) return importDeal(integration, credential, client, objectId, record, properties);

  if (link.lastSyncHash === hashSyncPayload(properties)) return "echo";

  const lead = await prisma.lead.findUnique({
    where: { id: link.rateupId },
    select: { id: true, name: true, stageId: true, pipeline: { select: { orgId: true } } },
  });
  if (!lead || lead.pipeline.orgId !== integration.orgId) {
    await removeLink(key, link.rateupId);
    return "rateup_gone";
  }

  const column = await columnForStage(
    integration.orgId,
    credential,
    properties.dealstage,
    lead.stageId,
  );
  const rename = properties.dealname && properties.dealname !== lead.name;
  if (rename) {
    await prisma.lead.update({ where: { id: lead.id }, data: { name: properties.dealname } });
  }
  if (column && column !== lead.stageId) {
    const { moveLead } = await import("../../pipeline/pipelineLead/lead.service.js");
    // `false`: an integration made this move, so it is not pushed back to HubSpot.
    await moveLead(lead.id, column, null, false);
  }
  await recordLink(key, { rateupId: lead.id, externalId: objectId, payload: properties });
  return rename || (column && column !== lead.stageId) ? "applied" : "unchanged";
}

/**
 * The Leads board column a HubSpot stage lands a lead in, through the saved mapping
 * read backwards. A lead already in a column mapped to that stage stays put; with
 * several, the first in board order wins.
 */
async function columnForStage(
  orgId: string,
  credential: HubSpotCredential,
  dealstage: string,
  currentColumn?: string,
): Promise<string | null> {
  const mapped = (credential.stageMappings ?? [])
    .filter((mapping) => mapping.hubspotStageId === dealstage)
    .map((mapping) => mapping.stageId);
  if (!mapped.length) return null;
  if (currentColumn && mapped.includes(currentColumn)) return currentColumn;
  const first = await prisma.pipelineStage.findFirst({
    where: { id: { in: mapped }, pipeline: { orgId, type: LEADS_PIPELINE_TYPE } },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  return first?.id ?? null;
}

/** A deal created in HubSpot, opened as a lead on the column its stage maps to. */
async function importDeal(
  integration: OrgIntegration,
  credential: HubSpotCredential,
  client: AxiosInstance,
  objectId: string,
  record: { associations?: { contacts?: { results?: { id: string }[] } } },
  properties: HubSpotDealProperties,
): Promise<HubSpotInboundOutcome> {
  const column = await columnForStage(integration.orgId, credential, properties.dealstage);
  if (!column) return "unmapped";
  const stage = await prisma.pipelineStage.findUnique({
    where: { id: column },
    select: { pipelineId: true },
  });
  if (!stage) return "unmapped";

  // The deal's contact, as a RateUp contact: already linked, or linked/created now
  // — a lead on the board is only useful with its person on it.
  let contact: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null = null;
  const hubSpotContactId = record.associations?.contacts?.results?.[0]?.id;
  if (hubSpotContactId) {
    const contactKey = { integrationId: integration.id, entityType: CONTACT };
    const contactLink = await findLinkByExternalId(contactKey, hubSpotContactId);
    let contactId = contactLink?.rateupId;
    if (!contactId) {
      const person = await fetchRecord(
        client,
        `/crm/v3/objects/contacts/${hubSpotContactId}`,
        CONTACT_PROPERTIES,
      );
      if (person) {
        contactId = (
          await importHubSpotContact(
            integration,
            hubSpotContactId,
            fromHubSpotContact(person.properties),
          )
        ).contactId;
      }
    }
    if (contactId) {
      contact = await prisma.contact.findUnique({
        where: { id: contactId },
        select: { id: true, name: true, email: true, phone: true },
      });
    }
  }

  const name = properties.dealname || contact?.name || contact?.phone || "HubSpot deal";
  const { createLead } = await import("../../pipeline/pipelineLead/lead.service.js");
  const lead = await createLead({
    pipelineId: stage.pipelineId,
    stageId: column,
    name,
    phone: contact?.phone ?? null,
    email: contact?.email ?? null,
    contactId: contact?.id ?? null,
    // `LeadSource` has no value for a CRM (the same as GetLead's inbound leads).
    source: "MANUAL",
    channel: "NONE",
    userId: null,
    automated: true,
    // Not pushed back: HubSpot is where it came from.
    syncIntegrations: false,
  });
  await recordLink(
    { integrationId: integration.id, entityType: LEAD },
    { rateupId: lead.id, externalId: objectId, payload: properties },
  );
  return "created";
}
