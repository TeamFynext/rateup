import { isAxiosError, type AxiosInstance } from "axios";

import type { Integration } from "../../../../generated/prisma/client.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { LEADS_PIPELINE_TYPE } from "../../pipeline/pipelineTypes.js";
import { emitIntegrationEvent } from "../events/emitIntegrationEvent.js";
import type { ProviderJobData } from "../providers/integrationProvider.types.js";
import {
  findLinkByExternalId,
  hashSyncPayload,
  recordLink,
  removeLink,
} from "../shared/entityLink.js";
import { pipedriveClientFor } from "./pipedrive.client.js";
import { getPerson, toPipedrivePersonFields, type PipedrivePerson } from "./pipedrive.contacts.js";
import type { PipedriveDealFields } from "./pipedrive.deals.js";
import { readPipedriveCredential, type PipedriveCredential } from "./pipedrive.types.js";
import type { PipedriveInboundJobData } from "./pipedrive.webhooks.js";

/**
 * Applies a change made in Pipedrive to RateUp (step 5.4), on HubSpot's rules.
 *
 * The delivery only says which record changed; the job reads it whole. Edits to
 * linked records follow the outbound switches (two-way); records created in
 * Pipedrive are imported only behind their own switches. A record deleted in
 * Pipedrive only loses its link — the RateUp side stays.
 *
 * Echoes: an inbound change hashing the same as RateUp's last push is RateUp's own
 * write coming back and is skipped. After applying a change, the link is recorded
 * with the new values, so the outbound push the change triggers sends nothing.
 */

const CONTACT = "contact";
const LEAD = "lead";

/** An integration that belongs to an org — every connected Pipedrive row does. */
type OrgIntegration = Integration & { orgId: string };

const isUniqueViolation = (error: unknown) => (error as { code?: string } | null)?.code === "P2002";

export type PipedriveInboundOutcome =
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

export async function processPipedriveInboundJob(
  integration: Integration,
  job: ProviderJobData,
): Promise<PipedriveInboundOutcome> {
  const credential = readPipedriveCredential(integration.credential);
  if (!credential || !integration.orgId) return "ignored";
  const owned = integration as OrgIntegration;
  const data = job.data as PipedriveInboundJobData;
  return data.object === "person"
    ? processPerson(owned, credential, data)
    : processDeal(owned, credential, data);
}

// ---------------------------------------------------------------------------
// Persons
// ---------------------------------------------------------------------------

interface PipedriveContactValues {
  name: string | null;
  email: string | null;
  /** E.164 digits, as RateUp stores them — only when Pipedrive holds the number with its `+`. */
  phone: string | null;
}

const primaryOf = (values: PipedrivePerson["emails"]) =>
  (values ?? []).find((entry) => entry.primary && entry.value?.trim()) ??
  (values ?? []).find((entry) => entry.value?.trim());

/**
 * A Pipedrive person in RateUp's terms. A number held without a country code
 * cannot be turned into RateUp's international form safely, so it is left out
 * rather than guessed at. A name that is only the email or phone is the stand-in
 * RateUp itself gave a nameless contact, not a name.
 */
export function fromPipedrivePerson(person: PipedrivePerson): PipedriveContactValues {
  const email = primaryOf(person.emails)?.value.trim().toLowerCase() || null;
  const rawPhone = primaryOf(person.phones)?.value.trim() ?? "";
  const digits = rawPhone.startsWith("+") ? rawPhone.replace(/\D/g, "") : "";
  const phone = digits.length >= 8 ? digits : null;
  const name = person.name?.trim().replace(/\s+/g, " ") || null;
  const standIn = name && (name.toLowerCase() === email || name === `+${phone}`);
  return { name: standIn ? null : name, email, phone };
}

async function processPerson(
  integration: OrgIntegration,
  credential: PipedriveCredential,
  { id, created }: PipedriveInboundJobData,
): Promise<PipedriveInboundOutcome> {
  const key = { integrationId: integration.id, entityType: CONTACT };
  const link = await findLinkByExternalId(key, id);
  if (link && !credential.syncContacts) return "sync_off";
  if (!link && !(created && credential.importContacts)) return "ignored";

  const client = await pipedriveClientFor(integration);
  const person = await getPerson(client, id);
  if (!person) {
    if (link) await removeLink(key, link.rateupId);
    return link ? "deleted" : "ignored";
  }
  const values = fromPipedrivePerson(person);

  if (!link) return (await importPipedrivePerson(integration, id, values)).outcome;

  const inbound = toPipedrivePersonFields(values);
  if (inbound && link.lastSyncHash === hashSyncPayload(inbound)) return "echo";

  const contact = await prisma.contact.findUnique({
    where: { id: link.rateupId },
    select: { id: true, orgId: true, name: true, email: true, phone: true },
  });
  if (!contact || contact.orgId !== integration.orgId) {
    await removeLink(key, link.rateupId);
    return "rateup_gone";
  }

  // Only what Pipedrive actually holds replaces RateUp's value; nothing is cleared.
  const update: { name?: string; email?: string; phone?: string } = {};
  if (values.name && values.name !== contact.name) update.name = values.name;
  if (values.email && values.email !== contact.email?.trim().toLowerCase()) {
    update.email = values.email;
  }
  if (values.phone && values.phone !== contact.phone) {
    const taken = await prisma.contact.findUnique({
      where: { contact_phone_org_id_unique: { phone: values.phone, orgId: contact.orgId } },
      select: { id: true },
    });
    if (taken) {
      log.info(
        { integrationId: integration.id, contactId: contact.id },
        "Pipedrive changed a person's phone to a number another RateUp contact has; phone left as it was",
      );
    } else {
      update.phone = values.phone;
    }
  }

  const current = Object.keys(update).length
    ? await prisma.contact.update({ where: { id: contact.id }, data: update })
    : contact;
  await recordLink(key, {
    rateupId: contact.id,
    externalId: id,
    payload: toPipedrivePersonFields(current) ?? undefined,
  });
  if (!Object.keys(update).length) return "unchanged";

  // Other integrations hear about it; Pipedrive's own push finds the link's hash
  // already current and sends nothing.
  await emitIntegrationEvent(contact.orgId, {
    type: "contact.updated",
    contact: current as never,
    changed: ["details"],
  });
  return "applied";
}

/**
 * A Pipedrive person RateUp has not met: linked to the RateUp contact with the same
 * phone or email, or created. RateUp contacts are keyed on their phone, so one
 * without a number cannot be created.
 */
export async function importPipedrivePerson(
  integration: { id: string; orgId: string },
  personId: string,
  values: PipedriveContactValues,
): Promise<{ outcome: "no_phone" | "linked" | "created"; contactId?: string }> {
  const key = { integrationId: integration.id, entityType: CONTACT };
  const { orgId } = integration;
  const select = { id: true, name: true, email: true, phone: true } as const;

  const existing =
    (values.phone &&
      (await prisma.contact.findUnique({
        where: { contact_phone_org_id_unique: { phone: values.phone, orgId } },
        select,
      }))) ||
    (values.email &&
      (await prisma.contact.findFirst({
        where: { orgId, email: { equals: values.email, mode: "insensitive" } },
        select,
      }))) ||
    null;
  const link = async (contact: { id: string } & PipedriveContactValues) => {
    await recordLink(key, {
      rateupId: contact.id,
      externalId: personId,
      payload: toPipedrivePersonFields(contact) ?? undefined,
    });
  };
  if (existing) {
    await link(existing);
    return { outcome: "linked", contactId: existing.id };
  }
  if (!values.phone) return { outcome: "no_phone" };

  // Loaded on use: contact creation reaches the automation engine and the fan-out.
  const { createContact } = await import("../../contact/contact.service.js");
  try {
    // Quiet, so no per-contact pushes fire before the link exists; the event is
    // emitted below, once Pipedrive's own push would find the contact linked.
    const created = await createContact(
      {
        orgId,
        phone: values.phone,
        name: values.name ?? "",
        ...(values.email && { email: values.email }),
        source: "Pipedrive",
      },
      undefined,
      { quiet: true },
    );
    await link({ ...values, id: created.id });
    await emitIntegrationEvent(orgId, { type: "contact.created", contact: created as never });
    return { outcome: "created", contactId: created.id };
  } catch (error) {
    // Created a moment ago by something else — a WhatsApp message, a retry.
    if (!isUniqueViolation(error)) throw error;
    const raced = await prisma.contact.findUnique({
      where: { contact_phone_org_id_unique: { phone: values.phone, orgId } },
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

interface PipedriveDeal {
  id: number;
  title?: string | null;
  pipeline_id?: number | null;
  stage_id?: number | null;
  status?: "open" | "won" | "lost" | "deleted";
  lost_reason?: string | null;
  person_id?: number | null;
  is_deleted?: boolean;
}

async function getDeal(client: AxiosInstance, id: string) {
  try {
    const deal = (await client.get<{ data: PipedriveDeal }>(`/v2/deals/${id}`)).data.data;
    return deal && !deal.is_deleted && deal.status !== "deleted" ? deal : null;
  } catch (error) {
    if (isAxiosError(error) && [404, 410].includes(error.response?.status ?? 0)) return null;
    throw error;
  }
}

/** A deal in the shape RateUp pushes, so an echo of RateUp's own write hashes the same. */
export function fromPipedriveDeal(deal: PipedriveDeal): PipedriveDealFields {
  const status = deal.status === "won" || deal.status === "lost" ? deal.status : "open";
  return {
    title: deal.title?.trim() ?? "",
    pipeline_id: deal.pipeline_id ?? 0,
    ...(status === "open" && deal.stage_id && { stage_id: deal.stage_id }),
    status,
    ...(status === "lost" && deal.lost_reason?.trim() && { lost_reason: deal.lost_reason.trim() }),
  };
}

async function processDeal(
  integration: OrgIntegration,
  credential: PipedriveCredential,
  { id, created }: PipedriveInboundJobData,
): Promise<PipedriveInboundOutcome> {
  const key = { integrationId: integration.id, entityType: LEAD };
  const link = await findLinkByExternalId(key, id);
  if (link && !credential.syncDeals) return "sync_off";
  if (!link && !(created && credential.importDeals)) return "ignored";
  if (!credential.dealPipelineId) return "sync_off";

  const client = await pipedriveClientFor(integration);
  const deal = await getDeal(client, id);
  if (!deal) {
    if (link) await removeLink(key, link.rateupId);
    return link ? "deleted" : "ignored";
  }
  const fields = fromPipedriveDeal(deal);
  // A deal moved to another pipeline has stages no column maps to.
  if (fields.pipeline_id !== credential.dealPipelineId) return "other_pipeline";

  if (!link) return importDeal(integration, credential, client, id, deal, fields);

  if (link.lastSyncHash === hashSyncPayload(fields)) return "echo";

  const lead = await prisma.lead.findUnique({
    where: { id: link.rateupId },
    select: {
      id: true,
      name: true,
      stageId: true,
      lostReasonId: true,
      pipelineId: true,
      pipeline: { select: { orgId: true } },
    },
  });
  if (!lead || lead.pipeline.orgId !== integration.orgId) {
    await removeLink(key, link.rateupId);
    return "rateup_gone";
  }

  const column = await columnForDeal(integration.orgId, credential, fields, lead.stageId);
  const rename = fields.title && fields.title !== lead.name;
  if (rename) await prisma.lead.update({ where: { id: lead.id }, data: { name: fields.title } });
  const move = column && column !== lead.stageId;
  if (move) {
    const { moveLead } = await import("../../pipeline/pipelineLead/lead.service.js");
    // `false`: an integration made this move, so it is not pushed back to Pipedrive.
    await moveLead(lead.id, column, null, false);
  }
  const reasoned = await applyLostReason(lead, fields);
  await recordLink(key, { rateupId: lead.id, externalId: id, payload: fields });
  return rename || move || reasoned ? "applied" : "unchanged";
}

/**
 * The Leads board column a deal lands a lead in. Won and lost deals go to a Won or
 * Lost column; open ones through the saved stage mapping read backwards. A lead
 * already in a fitting column stays put; with several, the first in board order.
 */
async function columnForDeal(
  orgId: string,
  credential: PipedriveCredential,
  fields: PipedriveDealFields,
  currentColumn?: string,
): Promise<string | null> {
  const board = { pipeline: { orgId, type: LEADS_PIPELINE_TYPE } } as const;
  if (fields.status !== "open") {
    const status = fields.status === "won" ? "WON" : "LOST";
    const columns = await prisma.pipelineStage.findMany({
      where: { ...board, status },
      orderBy: { order: "asc" },
      select: { id: true },
    });
    const ids = columns.map((column) => column.id);
    if (currentColumn && ids.includes(currentColumn)) return currentColumn;
    return ids[0] ?? null;
  }

  const mapped = (credential.stageMappings ?? [])
    .filter((mapping) => mapping.pipedriveStageId === fields.stage_id)
    .map((mapping) => mapping.stageId);
  if (!mapped.length) return null;
  if (currentColumn && mapped.includes(currentColumn)) return currentColumn;
  const first = await prisma.pipelineStage.findFirst({
    where: { id: { in: mapped }, ...board, status: "OPEN" },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  return first?.id ?? null;
}

/**
 * A lost deal's reason, onto the lead when the board has a lost reason of the same
 * name. Pipedrive's reasons are free text; one RateUp does not have is left out.
 */
async function applyLostReason(
  lead: { id: string; pipelineId: string; lostReasonId: string | null },
  fields: PipedriveDealFields,
) {
  if (fields.status !== "lost" || !fields.lost_reason) return false;
  const reason = await prisma.pipelineLostReason.findFirst({
    where: {
      pipelineId: lead.pipelineId,
      label: { equals: fields.lost_reason, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (!reason || reason.id === lead.lostReasonId) return false;
  await prisma.lead.update({ where: { id: lead.id }, data: { lostReasonId: reason.id } });
  return true;
}

/** A deal created in Pipedrive, opened as a lead on the column it maps to. */
async function importDeal(
  integration: OrgIntegration,
  credential: PipedriveCredential,
  client: AxiosInstance,
  dealId: string,
  deal: PipedriveDeal,
  fields: PipedriveDealFields,
): Promise<PipedriveInboundOutcome> {
  const column = await columnForDeal(integration.orgId, credential, fields);
  if (!column) return "unmapped";
  const stage = await prisma.pipelineStage.findUnique({
    where: { id: column },
    select: { pipelineId: true },
  });
  if (!stage) return "unmapped";

  // The deal's person, as a RateUp contact: already linked, or linked/created now
  // — a lead on the board is only useful with its person on it.
  let contact: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null = null;
  if (deal.person_id) {
    const personId = String(deal.person_id);
    const contactLink = await findLinkByExternalId(
      { integrationId: integration.id, entityType: CONTACT },
      personId,
    );
    let contactId = contactLink?.rateupId;
    if (!contactId) {
      const person = await getPerson(client, personId);
      if (person) {
        contactId = (
          await importPipedrivePerson(integration, personId, fromPipedrivePerson(person))
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

  const name = fields.title || contact?.name || contact?.phone || "Pipedrive deal";
  const { createLead } = await import("../../pipeline/pipelineLead/lead.service.js");
  const lead = await createLead({
    pipelineId: stage.pipelineId,
    stageId: column,
    name,
    phone: contact?.phone ?? null,
    email: contact?.email ?? null,
    contactId: contact?.id ?? null,
    // `LeadSource` has no value for a CRM (the same as HubSpot's and GetLead's).
    source: "MANUAL",
    channel: "NONE",
    userId: null,
    automated: true,
    // Not pushed back: Pipedrive is where it came from.
    syncIntegrations: false,
  });
  await recordLink(
    { integrationId: integration.id, entityType: LEAD },
    { rateupId: lead.id, externalId: dealId, payload: fields },
  );
  return "created";
}
