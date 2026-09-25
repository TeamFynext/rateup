import type { Integration } from "../../../../../generated/prisma/client.js";
import prisma from "../../../../utils/prisma.js";
import { log } from "../../../../utils/logger.js";
import { recordIntegrationSyncActivity } from "../integrationActivity.js";
import { getCachedGetLeadMeta, writeGetLeadId } from "./getlead.service.js";
import { getGetLeadCredential } from "./getlead.types.js";
import { LEADS_PIPELINE_TYPE } from "../../../pipeline/pipelineTypes.js";

/**
 * Applying a status change GetLead pushed to us — the inbound half of the stage
 * mapping, read in reverse.
 *
 * Kept apart from `getlead.webhook.ts`, which is only concerned with proving a
 * delivery is genuine, and from `getlead.service.ts`, which pushes outward.
 */

/** The rendered template, as it arrives inside GetLead's envelope. */
export interface GetLeadDeliveryData {
  event?: string;
  lead_id?: string;
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  status?: string;
  new_status?: string;
}

/**
 * Unwraps GetLead's envelope.
 *
 * A live delivery is `{ event: "lead.automation", data: {...}, timestamp }` —
 * the JSON Template lands under `data`. The fallback to the body itself keeps a
 * hand-made delivery, or a future GetLead that stops wrapping, working rather
 * than depending on the envelope being there.
 */
export function unwrapGetLeadDelivery(body: unknown): GetLeadDeliveryData {
  if (!body || typeof body !== "object") return {};
  const envelope = body as { data?: unknown };
  const inner = envelope.data && typeof envelope.data === "object" ? envelope.data : body;
  return inner as GetLeadDeliveryData;
}

/**
 * Turns the status GetLead named into the board column it maps to.
 *
 * A delivery carries a status *name* ("Qualified leads"), while `stageMappings`
 * hold `getleadStatusId`, so this is name → id → column. Matched
 * case-insensitively; a status renamed in GetLead since the meta cache was
 * filled resolves to nothing, which is a skip rather than a wrong write.
 *
 * Where two columns map to one status the first wins. The array is built in
 * board order, so that is the leftmost — arbitrary, but deterministic, and
 * many-to-one is a mapping an org is entitled to make.
 */
export async function resolveInboundStage(
  integration: Integration,
  orgId: string,
  statusName: string,
) {
  const credential = getGetLeadCredential(integration);
  const mappings = credential.stageMappings ?? [];
  if (mappings.length === 0) return null;

  const meta = await getCachedGetLeadMeta(orgId).catch(() => credential.meta);
  const wanted = statusName.trim().toLowerCase();
  const status = meta?.statuses?.find((s) => s.name.trim().toLowerCase() === wanted);
  if (!status) return null;

  return mappings.find((m) => m.getleadStatusId === status.id)?.stageId ?? null;
}

/**
 * Finds the Rateup lead a delivery is about.
 *
 * By GetLead's own id first: that is what a push stores in `integrationIds`, so
 * it is exact and survives a rename or a changed number. The phone fallback
 * covers a lead created in GetLead that Rateup has met by another route — and
 * is deliberately last, because a shared phone number would match the wrong
 * person where an id cannot.
 *
 * `phone` arrives as `+E.164`; Rateup stores the same digits without the `+`.
 */
/**
 * The digits Rateup stores. GetLead sends `+E.164`; a `Contact.phone` holds the
 * same number with the `+` stripped, so every comparison and every write has to
 * go through here or the two halves silently stop matching.
 */
function normalisePhone(phone?: string) {
  return phone?.replace(/^\+/, "").trim() || null;
}

async function findLeadForDelivery(orgId: string, data: GetLeadDeliveryData) {
  // GetLead maps onto the Leads board only, where a contact has at most one lead.
  const leadInclude = {
    where: { pipeline: { type: LEADS_PIPELINE_TYPE } },
    select: { id: true, stageId: true, contactId: true, pipelineId: true },
  } as const;

  if (data.lead_id) {
    const byContact = await prisma.contact.findFirst({
      where: {
        orgId,
        integrationIds: { path: ["getlead", "lead", "id"], equals: data.lead_id },
      },
      select: { id: true, leads: leadInclude },
    });
    const lead = byContact?.leads?.[0];
    if (lead) return lead;

    const byLead = await prisma.lead.findFirst({
      where: {
        pipeline: { orgId, type: LEADS_PIPELINE_TYPE },
        integrationIds: { path: ["getlead", "lead", "id"], equals: data.lead_id },
      },
      select: leadInclude.select,
    });
    if (byLead) return byLead;
  }

  const phone = normalisePhone(data.phone);
  if (!phone) return null;

  const contact = await prisma.contact.findFirst({
    where: { orgId, phone },
    select: { id: true, leads: leadInclude },
  });
  return contact?.leads?.[0] ?? null;
}

/** Why a delivery changed nothing. Recorded rather than thrown — none is a fault. */
type SkipReason =
  | "UNSUPPORTED_EVENT"
  | "NO_STATUS"
  | "UNMAPPED_STATUS"
  | "LEAD_NOT_FOUND"
  | "ALREADY_THERE"
  | "ALREADY_EXISTS"
  | "NO_NAME";

export type InboundOutcome =
  | { applied: true; leadId: string; stageId: string; created?: true }
  | { applied: false; reason: SkipReason };

/**
 * The column's pipeline, if this org owns it.
 *
 * Belt and braces on tenant isolation. `saveGetLeadSettings` refuses a mapping
 * naming another org's column, so a stored mapping should already be safe — but
 * this guards the writes, and both `moveLead` and `createLead` take a stage id
 * on trust. A mapping written before that check existed must not be able to put
 * a lead on someone else's board.
 *
 * Returns the pipeline too because a creation needs one and the stage is the
 * only thing an inbound delivery gives us to derive it from.
 */
async function ownedStage(stageId: string, orgId: string) {
  const stage = await prisma.pipelineStage.findFirst({
    where: { id: stageId, pipeline: { orgId, type: LEADS_PIPELINE_TYPE } },
    select: { pipelineId: true },
  });
  if (!stage) {
    log.warn("GetLead mapping for org %s names a column it does not own; skipping", orgId);
  }
  return stage;
}

/**
 * Applies a delivery, whichever workflow sent it.
 *
 * One URL serves every GetLead workflow, so `event` in the template body is the
 * only thing that says which trigger fired. A body with no `event` at all is
 * read as a status change: that is what the first templates sent, and the
 * status path is the one that cannot create anything.
 */
export async function applyGetLeadInbound(
  integration: Integration,
  orgId: string,
  body: unknown,
): Promise<InboundOutcome> {
  const data = unwrapGetLeadDelivery(body);

  if (data.event === "lead.created") return createLeadFromInbound(integration, orgId, data);
  if (data.event && data.event !== "lead.status_changed") {
    return { applied: false, reason: "UNSUPPORTED_EVENT" };
  }
  return applyStatusChange(integration, orgId, data);
}

/**
 * Moves a lead the GetLead status change names.
 *
 * The echo is broken by position, not by a flag: a status Rateup itself just
 * pushed resolves to the column the lead already sits in, so `ALREADY_THERE`
 * ends it before any write. That is why this compares stages before moving
 * rather than relying on knowing who started it.
 *
 * `syncIntegrations: false` stops the move being pushed straight back out.
 * Note that flag currently suppresses **every** integration, so a status
 * arriving from GetLead does not reach Zoho — see §9.5 of the plan.
 */
async function applyStatusChange(
  integration: Integration,
  orgId: string,
  data: GetLeadDeliveryData,
): Promise<InboundOutcome> {
  // `new_status` is the more specific of the two; `status` is what a delivery
  // carries when the template omits it. `previous_status` is deliberately
  // unused — a live delivery arrived with it empty on a real transition.
  const statusName = data.new_status?.trim() || data.status?.trim();
  if (!statusName) return { applied: false, reason: "NO_STATUS" };

  const stageId = await resolveInboundStage(integration, orgId, statusName);
  if (!stageId) return { applied: false, reason: "UNMAPPED_STATUS" };

  const lead = await findLeadForDelivery(orgId, data);
  if (!lead) return { applied: false, reason: "LEAD_NOT_FOUND" };
  if (lead.stageId === stageId) return { applied: false, reason: "ALREADY_THERE" };

  if (!(await ownedStage(stageId, orgId))) return { applied: false, reason: "UNMAPPED_STATUS" };

  // Imported here rather than at the top: `lead.service` reaches back into the
  // integrations through its stage fan-out, and an eager edge closes that cycle.
  const { moveLead } = await import("../../../pipeline/pipelineLead/lead.service.js");
  await moveLead(lead.id, stageId, null, false);

  await recordIntegrationSyncActivity(lead.id, "INTEGRATION_RECEIVED", "GetLead", {
    statusName,
    ...(data.lead_id && { externalId: data.lead_id }),
  });

  log.info("Moved lead %s from a GetLead status change (%s)", lead.id, statusName);
  return { applied: true, leadId: lead.id, stageId };
}
/**
 * Opens a lead on the board for one GetLead created there.
 *
 * The column comes from the same `stageMappings` the outbound push uses, read in
 * reverse — a lead arrives carrying a status name, and that status names the
 * column. Nothing else could place it: an inbound delivery says nothing about a
 * pipeline, and guessing "the first one" would put leads on a board at random
 * once an org has more than one. So an unmapped status is a recorded skip, and
 * the fix is a mapping rather than a default.
 *
 * The echo is broken by identity, not position: a lead Rateup pushed *into*
 * GetLead fires that org's "when a lead is created" workflow too, and comes
 * straight back. `findLeadForDelivery` recognises it by the GetLead id the push
 * stored, which is why the id is written below even when nothing else needs it.
 *
 * A contact is made only when the delivery carries a phone number — `Contact`
 * requires one, and a board-only lead is a shape the pipeline already supports.
 * An existing contact on that number is reused rather than duplicated.
 */
async function createLeadFromInbound(
  integration: Integration,
  orgId: string,
  data: GetLeadDeliveryData,
): Promise<InboundOutcome> {
  const statusName = data.status?.trim() || data.new_status?.trim();
  if (!statusName) return { applied: false, reason: "NO_STATUS" };

  const stageId = await resolveInboundStage(integration, orgId, statusName);
  if (!stageId) return { applied: false, reason: "UNMAPPED_STATUS" };

  const stage = await ownedStage(stageId, orgId);
  if (!stage) return { applied: false, reason: "UNMAPPED_STATUS" };

  // Before anything is written: this is both the echo breaker and the guard
  // against GetLead redelivering. Either way the lead is already here.
  const existing = await findLeadForDelivery(orgId, data);
  if (existing) return { applied: false, reason: "ALREADY_EXISTS" };

  const phone = normalisePhone(data.phone);
  // `Lead.name` will not take an empty string, and a lead with no name at all is
  // not worth putting on a board where nobody could tell what it is.
  const name = data.name?.trim() || phone;
  if (!name) return { applied: false, reason: "NO_NAME" };

  const email = data.email?.trim() || null;
  const contactId = phone ? await findOrCreateContact(orgId, name, phone, email, data) : null;

  const { createLead } = await import("../../../pipeline/pipelineLead/lead.service.js");
  const lead = await createLead({
    pipelineId: stage.pipelineId,
    stageId,
    name,
    phone,
    email,
    contactId,
    // `LeadSource` has no value for a CRM, and adding one is a migration this
    // did not need. GetLead's own source is kept on the timeline entry below,
    // which is where someone looking at the lead would go for its provenance.
    source: "MANUAL",
    channel: "NONE",
    userId: null,
    automated: true,
    // Without this the new lead is pushed straight back to GetLead, which is
    // where a create/create loop would start.
    syncIntegrations: false,
  });

  // Written whether the id sits on the contact or the lead: it is what makes the
  // *next* delivery about this lead an exact match instead of a phone guess.
  if (data.lead_id) {
    await writeGetLeadId(
      contactId ? { kind: "contact", id: contactId } : { kind: "lead", id: lead.id },
      data.lead_id,
    );
  }

  await recordIntegrationSyncActivity(lead.id, "INTEGRATION_RECEIVED", "GetLead", {
    inboundCreated: true,
    statusName,
    ...(data.source && { sourceLabel: data.source }),
    ...(data.lead_id && { externalId: data.lead_id }),
  });

  log.info("Opened lead %s from a GetLead lead.created delivery (%s)", lead.id, statusName);
  return { applied: true, leadId: lead.id, stageId, created: true };
}

/**
 * The contact behind a created lead, reused if the number is already known.
 *
 * Matching on phone alone is the same rule the rest of Rateup uses — a number is
 * the identity a contact is keyed on — and reusing beats duplicating: a second
 * contact on one number splits that person's inbox thread in two.
 */
async function findOrCreateContact(
  orgId: string,
  name: string,
  phone: string,
  email: string | null,
  data: GetLeadDeliveryData,
) {
  const existing = await prisma.contact.findFirst({
    where: { orgId, phone },
    select: { id: true },
  });
  if (existing) return existing.id;

  const { createContact } = await import("../../../contact/contact.service.js");
  const contact = await createContact({
    orgId,
    name,
    phone,
    ...(email && { email }),
    // Free text on a contact, unlike `Lead.source`, so it can say where it came from.
    source: data.source?.trim() ? `GetLead / ${data.source.trim()}` : "GetLead",
  });

  return contact.id;
}
