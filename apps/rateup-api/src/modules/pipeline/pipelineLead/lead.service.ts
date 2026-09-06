import type { LeadChannel, LeadSource } from "../../../../generated/prisma/client.js";
import { Prisma } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import {
  addZapierTriggerToQueue,
  ZapierTriggers,
} from "../../integrations/external/zapier/zapier.service.js";
import { GetLeadTriggers } from "../../integrations/external/getlead/getlead.service.js";
import { addGetLeadSyncToQueue } from "../../integrations/external/getlead/getlead.queue.js";
import { pushCrmLeadStatus, ZohoTriggers } from "../../integrations/external/zoho/zoho.service.js";
import type {
  BulkUpdateLeadsRequestSchema,
  CloseLeadRequestSchema,
  CreateLeadRequestSchema,
  CreateNoteRequestSchema,
  CreateTaskRequestSchema,
  UpdateLeadRequestSchema,
  UpdateTaskRequestSchema,
} from "./lead.schema.js";

/** Everything the board, list, forecast and insights views read off a lead. */
const leadListInclude = {
  assignees: {
    orderBy: { createdAt: "asc" },
    include: { assignee: { select: { id: true, name: true, profilePhoto: true } } },
  },
  owner: { select: { id: true, name: true, profilePhoto: true } },
  team: { select: { id: true, name: true, color: true } },
  contact: { select: { id: true, name: true, phone: true } },
  stage: { select: { id: true, name: true, probability: true, rottingDays: true, status: true } },
  lostReason: { select: { id: true, label: true } },
  labels: { include: { label: true } },
  tasks: {
    where: { completedAt: null },
    orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    take: 1,
  },
} satisfies Prisma.LeadInclude;

/**
 * Where a lead came from, in the vocabulary the inbox already uses.
 *
 * Every inbound message carries a `sourcePlatform: PlatformType`, and
 * `handleWaMessages` stamps it onto the contact as `Contact.source` — lowercased,
 * except WEBCHAT which it writes in caps. So the inbox’s own five platforms reach
 * this table as "whatsapp", "instagram", "facebook", "WEBCHAT" and "internal".
 *
 * The column is plain text, though, and the inbox is not its only writer: the CSV
 * importer, the loyalty program and the survey flow each stamp their own wording
 * ("CSV IMPORT", "loyalty_program", "REF"), as does anything typed into the
 * contact form. That is why contact.service.ts has to filter it
 * case-insensitively, and why every value is normalised before use here.
 */
const CONTACT_SOURCE: Readonly<Record<string, LeadSource>> = {
  // The five the inbox writes. FACEBOOK is Messenger, which is what the board
  // calls it; INTERNAL is a message the org sent itself, so no outside origin.
  whatsapp: "WHATSAPP",
  instagram: "INSTAGRAM",
  facebook: "MESSENGER",
  webchat: "WEBCHAT",
  internal: "MANUAL",
  // Wording other writers, and the contact form, use for the same things.
  messenger: "MESSENGER",
  web_chat: "WEBCHAT",
  survey: "SURVEY",
  referral: "REFERRAL",
  ref: "REFERRAL",
  loyalty: "LOYALTY",
  loyalty_program: "LOYALTY",
  manual: "MANUAL",
};

function contactSourceToLeadSource(raw: string | null | undefined): LeadSource | null {
  if (!raw) return null;
  const key = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return CONTACT_SOURCE[key] ?? null;
}

type RawLead = Prisma.LeadGetPayload<{ include: typeof leadListInclude }>;

/** Flattens the join rows and lifts the single open task to `nextTask`. */
function serialiseLead({ labels, tasks, assignees, ...lead }: RawLead) {
  return {
    ...lead,
    labels: labels.map((l) => l.label),
    assignees: assignees.map((a) => a.assignee),
    nextTask: tasks[0] ?? null,
  };
}

async function replaceAssignees(tx: Prisma.TransactionClient, leadId: string, next: string[]) {
  const before = await tx.leadAssignee.findMany({
    where: { leadId },
    include: { assignee: { select: { id: true, name: true } } },
  });

  const wanted = new Set(next);
  const had = new Set(before.map((row) => row.assigneeId));

  const removed = before.filter((row) => !wanted.has(row.assigneeId));
  const addedIds = next.filter((id) => !had.has(id));
  if (!removed.length && !addedIds.length) return null;

  if (removed.length) {
    await tx.leadAssignee.deleteMany({
      where: { leadId, assigneeId: { in: removed.map((row) => row.assigneeId) } },
    });
  }
  if (addedIds.length) {
    await tx.leadAssignee.createMany({
      data: addedIds.map((assigneeId) => ({ leadId, assigneeId })),
      skipDuplicates: true,
    });
  }

  const added = await tx.user.findMany({
    where: { id: { in: addedIds } },
    select: { name: true },
  });

  return {
    addedNames: added.map((user) => user.name ?? "Someone"),
    removedNames: removed.map((row) => row.assignee.name ?? "Someone"),
  };
}

export async function getLeads(pipelineId: string) {
  const leads = await prisma.lead.findMany({
    where: { pipelineId },
    orderBy: { createdAt: "desc" },
    include: leadListInclude,
  });
  return leads.map(serialiseLead);
}

export async function getLeadById(id: string) {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      ...leadListInclude,
      notes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { id: true, name: true, profilePhoto: true } } },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: { select: { id: true, name: true, profilePhoto: true } } },
      },
    },
  });

  if (!lead) return null;
  const { notes, activities, ...rest } = lead;
  return { ...serialiseLead(rest), notes, activities };
}

export async function getPipelineIdByLeadId(id: string) {
  const lead = await prisma.lead.findUnique({ where: { id }, select: { pipelineId: true } });
  return lead?.pipelineId;
}

export async function getPipelineIdByNoteId(id: string) {
  const note = await prisma.leadNote.findUnique({
    where: { id },
    select: { lead: { select: { pipelineId: true } } },
  });
  return note?.lead.pipelineId;
}

export async function getPipelineIdByTaskId(id: string) {
  const task = await prisma.leadTask.findUnique({
    where: { id },
    select: { lead: { select: { pipelineId: true } } },
  });
  return task?.lead.pipelineId;
}

export async function createLead(
  data: CreateLeadRequestSchema & {
    userId: string | null;
    automated?: boolean;
    /** See {@link setContactStage}. False when an integration opened this lead. */
    syncIntegrations?: boolean;
  },
) {
  const stage = await prisma.pipelineStage.findUniqueOrThrow({
    where: { id: data.stageId },
    select: { status: true },
  });

  // A lead opened against a contact takes that contact’s source. Every caller but
  // the WhatsApp auto-reply hardcodes MANUAL, so the board used to record nothing
  // about where a lead came from.
  //
  // A contact whose source is missing or unrecognised falls back to the caller’s
  // own value, which the schema defaults to MANUAL. So an unknown origin still
  // lands on MANUAL, while the auto-reply — which knows the platform first-hand —
  // keeps the value it passed.
  const contact = data.contactId
    ? await prisma.contact.findUnique({
        where: { id: data.contactId },
        select: { source: true },
      })
    : null;
  const source = contactSourceToLeadSource(contact?.source) ?? data.source;

  const created = await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: {
        pipelineId: data.pipelineId,
        stageId: data.stageId,
        name: data.name,
        company: data.company,
        phone: data.phone,
        email: data.email,
        source,
        channel: data.channel,
        teamId: data.teamId ?? null,
        contactId: data.contactId ?? null,
        ownerId: data.automated ? null : data.userId,
        expectedCloseAt: data.expectedCloseAt ? new Date(data.expectedCloseAt) : null,
        // A lead can be opened straight onto a closing column, so the stage's
        // own status decides rather than a default of OPEN.
        status: stage.status,
        closedAt: stage.status === "OPEN" ? null : new Date(),
        ...(data.labelIds?.length && {
          labels: { createMany: { data: data.labelIds.map((labelId) => ({ labelId })) } },
        }),
        ...(data.assigneeIds?.length && {
          assignees: {
            createMany: { data: data.assigneeIds.map((assigneeId) => ({ assigneeId })) },
          },
        }),
      },
      include: leadListInclude,
    });

    await tx.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: data.userId,
        type: "CREATED",
        details: { sourceLabel: source, ...(data.automated && { automated: true }) },
      },
    });

    return serialiseLead(lead);
  });

  // A lead opening straight onto a mapped column is as much a stage change as a
  // move is, so the CRMs hear about it the same way.
  if (data.syncIntegrations !== false)
    await syncLeadStageToIntegrations(created, GetLeadTriggers.LEAD_CREATE);
  // Opened directly onto a Won column — rare, but it is still the moment it was won.
  if (stage.status === "WON") await reportLeadWon(created);
  // A contact that was not on the board and now sits in a column has changed
  // stage as surely as one that was dragged — from nothing to something.
  await announceStageChange(created);

  return created;
}

export async function updateLead(id: string, data: UpdateLeadRequestSchema, userId: string) {
  return prisma.$transaction(async (tx) => {
    // The join rows are rewritten before the lead is read back, so the returned
    // lead already carries the new assignee list.
    const assigneeChange =
      data.assigneeIds === undefined ? null : await replaceAssignees(tx, id, data.assigneeIds);

    const lead = await tx.lead.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.company !== undefined && { company: data.company }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.source !== undefined && { source: data.source }),
        ...(data.channel !== undefined && { channel: data.channel }),
        ...(data.teamId !== undefined && { teamId: data.teamId }),
        ...(data.contactId !== undefined && { contactId: data.contactId }),
        ...(data.expectedCloseAt !== undefined && {
          expectedCloseAt: data.expectedCloseAt ? new Date(data.expectedCloseAt) : null,
        }),
        ...(data.labelIds !== undefined && {
          labels: {
            deleteMany: {},
            createMany: { data: data.labelIds.map((labelId) => ({ labelId })) },
          },
        }),
      },
      include: leadListInclude,
    });

    if (assigneeChange) {
      await tx.leadActivity.create({
        data: { leadId: id, userId, type: "ASSIGNEES_CHANGED", details: assigneeChange },
      });
    }

    return serialiseLead(lead);
  });
}

export async function moveLead(
  id: string,
  stageId: string,
  userId: string | null,
  syncIntegrations = true,
) {
  const moved = await prisma.$transaction(async (tx) => {
    const before = await tx.lead.findUniqueOrThrow({
      where: { id },
      // The previous status decides whether this move is the moment the lead was
      // won — moving between two Won columns is not a second conversion.
      select: { stageId: true, stage: { select: { name: true, status: true } } },
    });

    // Scoped to the lead's own board, not looked up by id alone.
    //
    // The id arrives from a client, an automation rule or a CRM webhook, and
    // nothing upstream checks it belongs here — `verifyLeadAccess` proves the
    // caller may touch the *lead*, and says nothing about the target column. An
    // unscoped move was a cross-tenant write: `syncLeadStageToIntegrations`
    // derives the org from the *stage's* pipeline, so a lead parked on another
    // org's column fans out to that org's CRM credentials, pushing this lead's
    // name, email and phone into their Zoho and GetLead.
    //
    // Same shape as `closeLead`, which has always scoped its target this way.
    const target = await tx.pipelineStage.findFirstOrThrow({
      where: { id: stageId, pipeline: { leads: { some: { id } } } },
      select: { name: true, status: true },
    });

    const now = new Date();
    const closing = target.status !== "OPEN";
    const lead = await tx.lead.update({
      where: { id },
      data: {
        stageId,
        stageEnteredAt: now,
        lastActivityAt: now,
        // The column decides: landing on a Won or Lost stage closes the lead,
        // and moving back to an open one reopens it.
        status: target.status,
        closedAt: closing ? now : null,
        closedById: closing ? userId : null,
        // A reason only belongs to a lead sitting in a Lost column. Dragging one
        // out — or straight across to Won — drops the reason with it.
        ...(target.status !== "LOST" && { lostReasonId: null }),
      },
      include: leadListInclude,
    });

    await tx.leadActivity.create({
      data: {
        leadId: id,
        userId,
        type: target.status === "OPEN" ? "MOVED" : target.status,
        details: { fromStageName: before.stage.name, toStageName: target.name },
      },
    });

    return {
      ...serialiseLead(lead),
      becameWon: target.status === "WON" && before.stage.status !== "WON",
    };
  });

  // Outside the transaction: an integration being down must not roll back a move
  // the user already saw happen on the board.
  const { becameWon, ...lead } = moved;
  if (syncIntegrations) await syncLeadStageToIntegrations(lead);
  if (becameWon) await reportLeadWon(lead);
  await announceStageChange(lead);

  return lead;
}

/**
 * Everything outside the pipeline that wants to hear a lead changed column.
 *
 * The two listeners are independent and must stay that way: a Zap should still
 * fire for a contact with no phone number, which is the one thing that stops a
 * rule from running.
 */
async function announceStageChange(lead: {
  id: string;
  contactId: string | null;
  stageId: string;
}) {
  await fireStageUpdatedZap(lead);
  await fireStageUpdatedRules(lead);
}

/**
 * Emits Zapier's **Contact Stage Updated** — the board's counterpart to
 * `contact_lifecycle_updated`, which fires from the contact write path and is
 * left exactly as it is. Zaps built on the lifecycle trigger keep working; this
 * is the trigger an org on the board has to build against instead.
 *
 * Keyed on the contact, like every other contact-shaped Zapier trigger: a
 * board-only lead has no contact for the Zap's later steps to look up.
 */
async function fireStageUpdatedZap(lead: {
  id: string;
  contactId: string | null;
  stageId: string;
}) {
  if (!lead.contactId) return;

  try {
    const stage = await prisma.pipelineStage.findUnique({
      where: { id: lead.stageId },
      select: {
        name: true,
        status: true,
        pipelineId: true,
        pipeline: { select: { orgId: true, name: true } },
      },
    });
    if (!stage) return;

    await addZapierTriggerToQueue(
      ZapierTriggers.CONTACT_STAGE_UPDATED,
      {
        [ZapierTriggers.CONTACT_STAGE_UPDATED]: {
          contactId: lead.contactId,
          leadId: lead.id,
          pipelineId: stage.pipelineId,
          pipelineName: stage.pipeline.name,
          stageId: lead.stageId,
          stageName: stage.name,
          stageStatus: stage.status,
        },
      },
      stage.pipeline.orgId,
    );
  } catch (error) {
    // The move is already recorded; a Zap that could not be queued must not undo it.
    console.error("Failed to queue the Contact Stage Updated Zapier trigger", error);
  }
}

/**
 * Runs the automation rules listening for **Stage Updated** — the successor to
 * the contact write path's `LIFECYCLE_UPDATED`.
 *
 * Called from all three writes that can change which column a lead sits in:
 * {@link moveLead}, {@link closeLead} (a drop onto Won or Lost routes there, not
 * through `moveLead`) and {@link createLead} (a contact joining the board).
 *
 * Only a lead with a contact can trigger one: rules are matched by phone and
 * channel, and a board-only lead has neither an inbox thread nor a contact
 * record for a rule to act on.
 *
 * Outside the `syncIntegrations` guard on purpose, the same as
 * {@link reportLeadWon}: that flag stops a change Zoho pushed in from being
 * echoed back out, but a rule should still see a stage that Zoho set.
 *
 * Imported dynamically. `wa_automatedReply.utils` already imports this file for
 * `setContactStage`, so an eager import here closes the cycle — the same edge
 * that broke module loading when the Conversions API service was pulled in.
 */
async function fireStageUpdatedRules(lead: { contactId: string | null; stageId: string }) {
  if (!lead.contactId) return;

  try {
    const contact = await prisma.contact.findUnique({
      where: { id: lead.contactId },
      select: { id: true, orgId: true, phone: true, igsId: true, psid: true },
    });
    if (!contact?.phone) return;

    const { checkAndExecuteRuleByTriggerEvent, resolveContactChannel } =
      await import("../../whatsapp/automatedReply/wa_automatedReply.utils.js");

    const channel = await resolveContactChannel(contact);
    await checkAndExecuteRuleByTriggerEvent("STAGE_UPDATED", {
      orgId: contact.orgId,
      phone: contact.phone,
      ...channel,
    });
  } catch (error) {
    // The move is already recorded; a rule that could not run must not undo it.
    console.error("Failed to run Stage Updated rules for a lead", error);
  }
}

/**
 * Tells the CRMs a lead changed column.
 *
 * This is the outbound half of the Zoho stage mapping: the org's board is now
 * the thing that drives a Bigin deal stage and a CRM lead status, where the
 * contact's lifecycle used to. Both are keyed on the mapping the org configured
 * under "Pipeline Stage Mapping"; a column with no mapping simply syncs nothing.
 *
 * A lead with no contact behind it — one typed straight onto the board — still
 * syncs. It carries its own name, phone and email, which is everything Bigin
 * needs to open a deal and a contact; the only thing missing is somewhere in
 * Rateup to write the resulting ids back to, so `rateupContactId` is omitted and
 * the deal is created fresh each time rather than matched to an existing one.
 *
 * Skipped when the move came *from* an integration — see `syncIntegrations` on
 * {@link moveLead}.
 *
 * Failures are swallowed: a CRM being unreachable must not fail the move that
 * has already been committed and shown on the board.
 */
async function syncLeadStageToIntegrations(
  lead: {
    id: string;
    contactId: string | null;
    stageId: string;
    pipelineId: string;
    name: string;
    email: string | null;
    phone: string | null;
    source: LeadSource;
  },
  /**
   * Which GetLead trigger this is. The push itself is an upsert either way, but
   * the two are separate subscriptions an org can toggle independently, so a
   * lead arriving on the board must not be reported as a stage change.
   */
  getleadTrigger: GetLeadTriggers = GetLeadTriggers.LEAD_UPDATE,
) {
  try {
    const stage = await prisma.pipelineStage.findUnique({
      where: { id: lead.stageId },
      select: { name: true, pipeline: { select: { orgId: true } } },
    });
    if (!stage) return;

    const orgId = stage.pipeline.orgId;

    // The contact is the better source when there is one: it holds the CRM ids,
    // and its details are the ones the rest of the app keeps current.
    const contact = lead.contactId
      ? await prisma.contact.findUnique({
          where: { id: lead.contactId },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            source: true,
            notes: true,
            integrationIds: true,
          },
        })
      : null;

    const integrationIds = contact
      ? (contact.integrationIds as ContactIntegrationIds | null)
      : null;

    // Through the org's mapping, not the column's own name: `Lead_Status` is a
    // Zoho picklist, so a board column named anything the org did not map is a
    // value the CRM rejects.
    if (integrationIds?.zoho?.lead?.id) {
      await pushCrmLeadStatus(
        orgId,
        integrationIds.zoho.lead.id,
        { stageId: lead.stageId, stageName: stage.name },
        {},
        // So the CRM push lands on this lead's timeline. A Zoho-CRM-only org
        // never reaches the Bigin branch, so without this it would see nothing.
        lead.id,
      );
    }

    await integrationTriggerQueue.add("zoho-bigin-deal-update", {
      integrationName: "zoho",
      triggerKey: ZohoTriggers.BIGIN_DEAL_CREATE,
      orgId,
      data: {
        name: contact?.name ?? lead.name,
        source: contact?.source ?? lead.source,
        email: contact?.email ?? lead.email,
        phone: contact?.phone ?? lead.phone,
        notes: contact?.notes ?? null,
        stageId: lead.stageId,
      },
      // The lead is always named. The handler keeps the Bigin ids on the contact
      // when there is one — that is where the lifecycle flow put them and where
      // everything else looks — and falls back to the lead for board-only cards,
      // so either way the same deal is matched and moved rather than recreated.
      rateupLeadId: lead.id,
      ...(contact && { rateupContactId: contact.id }),
    });

    // GetLead is outbound-only and keyed on the same board column, so it rides
    // the same fan-out. It resolves its own status through the org's mapping and
    // pushes nothing when a column is unmapped.
    await addGetLeadSyncToQueue(
      getleadTrigger,
      orgId,
      {
        name: contact?.name ?? lead.name,
        email: contact?.email ?? lead.email,
        phone: contact?.phone ?? lead.phone,
        notes: contact?.notes ?? null,
        stageId: lead.stageId,
        stageName: stage.name,
        // Not pushed to GetLead — only so a phoneless lead's skip names the
        // channel it came from. INSTAGRAM and MESSENGER leads never have one.
        leadSource: lead.source,
      },
      { rateupLeadId: lead.id, ...(contact && { rateupContactId: contact.id }) },
    );
  } catch (error) {
    // The move itself already succeeded; this is best-effort fan-out.
    console.error("Failed to sync lead stage to integrations", error);
  }
}

/**
 * Reports a win to Meta's Conversions API.
 *
 * The board is what decides a win now: a lead landing on a stage whose status is
 * `WON`, where the contact's lifecycle `isWon` flag used to. Fired on the move
 * that *becomes* a win, not on every write while it sits there — Meta counts
 * every event it receives, so a second one is a double-counted conversion.
 *
 * Deliberately outside the `syncIntegrations` guard. That flag exists to stop a
 * change Zoho pushed in from being pushed straight back out; a win is still a win
 * whoever recorded it, and reporting it to Meta cannot loop back here.
 *
 * A lead with no contact still reports: Meta matches on hashed phone and email,
 * both of which the lead carries itself.
 */
async function reportLeadWon(lead: {
  contactId: string | null;
  stageId: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: LeadSource;
}) {
  try {
    const stage = await prisma.pipelineStage.findUnique({
      where: { id: lead.stageId },
      select: { name: true, pipeline: { select: { orgId: true } } },
    });
    if (!stage) return;

    const contact = lead.contactId
      ? await prisma.contact.findUnique({
          where: { id: lead.contactId },
          select: { id: true, name: true, email: true, phone: true, source: true, orgId: true },
        })
      : null;

    // Imported here rather than at the top: the Conversions API service pulls in
    // the WhatsApp settings and Meta client, and `zoho.service` already imports
    // this file — an eager edge widened that cycle enough to break module loading.
    // A win is rare, so paying for the import only when one happens is no loss.
    const { sendWonConversionEvent } =
      await import("../../integrations/meta/conversions.service.js");

    await sendWonConversionEvent(
      contact ?? {
        id: "",
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
        orgId: stage.pipeline.orgId,
      },
      stage.name,
    );
  } catch (error) {
    // The win is already recorded on the board; this is best-effort reporting.
    console.error("Failed to report a won lead to the Conversions API", error);
  }
}

/**
 * The board a contact's stage lives on. One pipeline per org today, so this is
 * simply that one — but every caller goes through here, so lifting
 * `PIPELINE_LIMIT_PER_ORG` later is one function rather than twenty call sites.
 *
 * Returns null when the org has no board. Callers must treat that as "skip",
 * never as an error: an org that has not opened a pipeline must still be able
 * to edit its contacts.
 */
export async function resolvePipelineForContact(orgId: string) {
  const pipeline = await prisma.pipeline.findFirst({
    where: { orgId },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  return pipeline?.id ?? null;
}

/**
 * Puts a contact on a stage, opening a lead if it has none. The single write
 * behind every "assign stage" surface — the contact panel, the contacts table,
 * automation rules and the CRM integrations all land here.
 *
 * Idempotent by design: landing on the stage the lead already sits in returns it
 * untouched and writes no activity row. Integrations call this on every sync, so
 * without that the timeline would fill with moves that never happened.
 *
 * Returns null rather than throwing when the stage does not belong to the board,
 * or the contact is gone — a rule naming a deleted stage should quietly do
 * nothing, not fail the message it was answering.
 */
export async function setContactStage({
  contactId,
  pipelineId,
  stageId,
  source,
  channel,
  userId = null,
  automated = true,
  syncIntegrations = true,
}: {
  contactId: string;
  pipelineId: string;
  stageId: string;
  source: LeadSource;
  channel: LeadChannel;
  userId?: string | null;
  automated?: boolean;
  /**
   * False when the caller *is* an integration. Without it a stage Zoho pushed in
   * would be pushed straight back out, returning as another webhook.
   */
  syncIntegrations?: boolean;
}) {
  const stage = await prisma.pipelineStage.findFirst({
    where: { id: stageId, pipelineId },
    select: { id: true },
  });
  if (!stage) return null;

  const existing = await prisma.lead.findUnique({
    where: { contact_pipeline_unique: { contactId, pipelineId } },
    select: { id: true, stageId: true },
  });

  if (existing) {
    if (existing.stageId === stageId) return null;
    return moveLead(existing.id, stageId, userId, syncIntegrations);
  }

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { name: true, phone: true, email: true },
  });
  if (!contact) return null;

  try {
    return await createLead({
      pipelineId,
      stageId,
      contactId,
      name: contact.name ?? "Unnamed contact",
      phone: contact.phone,
      email: contact.email,
      source,
      channel,
      // Assigning a stage names a board, not a team; whoever picks the lead up
      // sets that.
      teamId: null,
      userId,
      automated,
      syncIntegrations,
    });
  } catch (err) {
    // Two syncs racing on the same contact: the unique index rejected the loser,
    // whose intent was still "put this contact on that stage". Move instead.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const won = await prisma.lead.findUnique({
        where: { contact_pipeline_unique: { contactId, pipelineId } },
        select: { id: true, stageId: true },
      });
      if (!won) throw err;
      return won.stageId === stageId ? null : moveLead(won.id, stageId, userId, syncIntegrations);
    }
    throw err;
  }
}

/**
 * The contacts table's bulk "Assign stage": the same write as {@link setContactStage},
 * once per selected contact.
 *
 * The ids arrive from the client and `setContactStage` takes a contact id on
 * trust, so they are narrowed to the caller's org first — an id belonging to
 * another tenant is silently dropped rather than written. Runs one contact at a
 * time on purpose: each contact is an independent decision (open a lead, move an
 * existing one, or leave it alone) and reusing the single-contact path is what
 * keeps the timeline honest.
 *
 * Returns null when the org has no board, or the stage is not one of its columns.
 */
export async function bulkSetContactStage({
  contactIds,
  orgId,
  stageId,
  userId,
}: {
  contactIds: string[];
  orgId: string;
  stageId: string;
  userId: string | null;
}) {
  const pipelineId = await resolvePipelineForContact(orgId);
  if (!pipelineId) return null;

  const stage = await prisma.pipelineStage.findFirst({
    where: { id: stageId, pipelineId },
    select: { id: true },
  });
  if (!stage) return null;

  const contacts = await prisma.contact.findMany({
    where: { id: { in: contactIds }, orgId },
    select: { id: true },
  });

  let changed = 0;
  for (const contact of contacts) {
    const lead = await setContactStage({
      contactId: contact.id,
      pipelineId,
      stageId,
      source: "MANUAL",
      channel: "NONE",
      userId,
      automated: false,
    });
    // Null is "already on that column" — counted as untouched, not as a failure.
    if (lead) changed += 1;
  }

  return {
    pipelineId,
    requested: contactIds.length,
    matched: contacts.length,
    changed,
    unchanged: contacts.length - changed,
  };
}

/**
 * Takes a contact off the board entirely — the inverse of {@link setContactStage},
 * since a lead is what holds the stage.
 *
 * **This is destructive and cannot be undone.** Every child row cascades: notes,
 * the whole activity timeline, tasks, assignees and labels go with the lead. The
 * confirmation dialog is the only guard, so callers must show it and name what is
 * being lost — {@link countContactStageLoss} returns the figures for that.
 *
 * Only ever called from an explicit human action. An integration whose status
 * maps to nothing, or a rule with no stage set, does nothing at all.
 */
export async function clearContactStage(contactId: string, pipelineId: string) {
  const lead = await prisma.lead.findUnique({
    where: { contact_pipeline_unique: { contactId, pipelineId } },
    select: { id: true },
  });
  if (!lead) return null;

  await prisma.lead.delete({ where: { id: lead.id } });
  return lead.id;
}

/**
 * What clearing this contact's stage would destroy, so the confirmation can say
 * so with real numbers instead of a generic warning. Null when there is no lead
 * and therefore nothing to lose.
 */
export async function countContactStageLoss(contactId: string, pipelineId: string) {
  const lead = await prisma.lead.findUnique({
    where: { contact_pipeline_unique: { contactId, pipelineId } },
    select: {
      id: true,
      stage: { select: { name: true } },
      _count: { select: { notes: true, tasks: true, activities: true, assignees: true } },
    },
  });
  if (!lead) return null;

  return {
    leadId: lead.id,
    stageName: lead.stage.name,
    notes: lead._count.notes,
    tasks: lead._count.tasks,
    activities: lead._count.activities,
    assignees: lead._count.assignees,
  };
}

/**
 * Where a contact currently sits on its org's board, for the inbox panel.
 *
 * Returns the board even when the contact has no lead, because the panel still
 * has to draw every column to offer one. `stageId` null simply means the contact
 * is not on the board yet — the same shape a contact with no lifecycle has today.
 *
 * `loss` rides along so the clear confirmation can name what it would destroy
 * without a second round trip.
 */
export async function getContactStage(contactId: string, orgId: string) {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, orgId },
    select: { id: true },
  });
  if (!contact) return null;

  const pipelineId = await resolvePipelineForContact(orgId);
  if (!pipelineId) return null;

  const lead = await prisma.lead.findUnique({
    where: { contact_pipeline_unique: { contactId, pipelineId } },
    select: {
      id: true,
      stageId: true,
      _count: { select: { notes: true, tasks: true, activities: true, assignees: true } },
    },
  });

  return {
    pipelineId,
    leadId: lead?.id ?? null,
    stageId: lead?.stageId ?? null,
    loss: lead
      ? {
          notes: lead._count.notes,
          tasks: lead._count.tasks,
          activities: lead._count.activities,
          assignees: lead._count.assignees,
        }
      : null,
  };
}

export async function openLeadOnPipelineForContact({
  contactId,
  pipelineId,
  source,
  channel,
  userId = null,
}: {
  contactId: string;
  pipelineId: string;
  source: LeadSource;
  channel: LeadChannel;
  userId?: string | null;
}) {
  // Deliberately *not* `setContactStage`: a rule that fires again on a contact
  // already on the board must leave it where it is, not drag it back to the
  // first column — which for a closed lead would silently reopen it.
  const existing = await prisma.lead.findUnique({
    where: { contact_pipeline_unique: { contactId, pipelineId } },
    select: { id: true },
  });
  if (existing) return null;

  // The board's first open column — the entry point of its funnel. A board made
  // only of closing columns has nowhere to put a new lead.
  const stage = await prisma.pipelineStage.findFirst({
    where: { pipelineId, status: "OPEN" },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  if (!stage) return null;

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { name: true, phone: true, email: true },
  });
  if (!contact) return null;

  return createLead({
    pipelineId,
    stageId: stage.id,
    contactId,
    name: contact.name ?? "Unnamed contact",
    phone: contact.phone,
    email: contact.email,
    source,
    channel,
    // The rule names a board, not a team; whoever picks the lead up sets that.
    teamId: null,
    userId,
    automated: true,
  });
}

export async function closeLead(id: string, data: CloseLeadRequestSchema, userId: string) {
  const closed = await prisma.$transaction(async (tx) => {
    const isWon = data.status === "WON";
    const now = new Date();

    // Same guard as `moveLead`: only the transition counts, so closing an
    // already-won lead again does not report a second conversion.
    const before = await tx.lead.findUniqueOrThrow({
      where: { id },
      select: { status: true, stageId: true },
    });
    const becameWon = isWon && before.status !== "WON";

    // Closing moves the lead into a column that closes it, so the board never
    // shows a won or lost lead sitting in an open column. `stageId` is the
    // column the user actually dropped on; without one, the board's first
    // column of that status stands in.
    const target = data.stageId
      ? await tx.pipelineStage.findFirst({
          where: { id: data.stageId, pipeline: { leads: { some: { id } } } },
          select: { id: true },
        })
      : await tx.pipelineStage.findFirst({
          where: { pipeline: { leads: { some: { id } } }, status: data.status },
          orderBy: { order: "asc" },
          select: { id: true },
        });

    const reason = data.lostReasonId
      ? await tx.pipelineLostReason.findUnique({
          where: { id: data.lostReasonId },
          select: { label: true },
        })
      : null;

    const lead = await tx.lead.update({
      where: { id },
      data: {
        status: data.status,
        closedAt: now,
        closedById: userId,
        lastActivityAt: now,
        lostReasonId: isWon ? null : (data.lostReasonId ?? null),
        // A board with no column of this status keeps the lead where it stalled
        // rather than losing it — closed is still recorded on the lead itself.
        ...(target && { stageId: target.id, stageEnteredAt: now }),
      },
      include: leadListInclude,
    });

    // A closed lead's open tasks are noise on someone's list.
    await tx.leadTask.updateMany({
      where: { leadId: id, completedAt: null },
      data: { completedAt: now },
    });

    await tx.leadActivity.create({
      data: {
        leadId: id,
        userId,
        type: data.status,
        details: {
          ...(reason && { lostReasonLabel: reason.label }),
          ...(data.note && { note: data.note }),
        },
      },
    });

    return { ...serialiseLead(lead), becameWon, fromStageId: before.stageId };
  });

  const { becameWon, fromStageId, ...lead } = closed;

  // Winning or losing moves the lead into a closing column, which is a stage
  // change like any other — the CRM has to hear about it, or a deal dropped onto
  // Won on the board stays open in Bigin.
  if (lead.stageId) await syncLeadStageToIntegrations(lead);
  if (becameWon) await reportLeadWon(lead);
  // Dropping a lead onto Won or Lost on the board routes here rather than
  // through `moveLead`, so without this the one move a user is most likely to
  // build a rule around would be the one move that never fired.
  if (lead.stageId !== fromStageId) await announceStageChange(lead);

  return lead;
}

export async function reopenLead(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.update({
      where: { id },
      data: {
        status: "OPEN",
        closedAt: null,
        closedById: null,
        lostReasonId: null,
        lastActivityAt: new Date(),
      },
      include: leadListInclude,
    });

    await tx.leadActivity.create({ data: { leadId: id, userId, type: "REOPENED" } });
    return serialiseLead(lead);
  });
}

export async function deleteLead(id: string) {
  return prisma.lead.delete({ where: { id } });
}

export async function bulkUpdateLeads(data: BulkUpdateLeadsRequestSchema, userId: string) {
  if (data.stageId) {
    for (const leadId of data.leadIds) {
      await moveLead(leadId, data.stageId, userId);
    }
  }

  if (data.teamId !== undefined) {
    await prisma.lead.updateMany({
      where: { id: { in: data.leadIds } },
      data: { teamId: data.teamId },
    });
  }

  // Reassignment runs per lead so each one records who joined and who left,
  // exactly as a single-lead edit would.
  if (data.assigneeIds !== undefined) {
    for (const leadId of data.leadIds) {
      await prisma.$transaction(async (tx) => {
        const change = await replaceAssignees(tx, leadId, data.assigneeIds ?? []);
        if (change) {
          await tx.leadActivity.create({
            data: { leadId, userId, type: "ASSIGNEES_CHANGED", details: change },
          });
        }
      });
    }
  }

  const leads = await prisma.lead.findMany({
    where: { id: { in: data.leadIds } },
    include: leadListInclude,
  });
  return leads.map(serialiseLead);
}

// ----------------------------------------------------------------------- notes

export async function createNote(leadId: string, data: CreateNoteRequestSchema, userId: string) {
  const [note] = await prisma.$transaction([
    prisma.leadNote.create({
      data: { leadId, text: data.text, authorId: userId },
      include: { author: { select: { id: true, name: true, profilePhoto: true } } },
    }),
    prisma.leadActivity.create({ data: { leadId, userId, type: "NOTE_ADDED" } }),
    prisma.lead.update({ where: { id: leadId }, data: { lastActivityAt: new Date() } }),
  ]);
  return note;
}

export async function deleteNote(id: string) {
  return prisma.leadNote.delete({ where: { id } });
}

// ----------------------------------------------------------------------- tasks

export async function createTask(leadId: string, data: CreateTaskRequestSchema, userId: string) {
  const [task] = await prisma.$transaction([
    prisma.leadTask.create({
      data: {
        leadId,
        type: data.type,
        title: data.title,
        dueAt: data.dueAt ? new Date(data.dueAt) : null,
        assigneeId: data.assigneeId ?? null,
      },
    }),
    prisma.leadActivity.create({
      data: { leadId, userId, type: "TASK_ADDED", details: { taskTitle: data.title } },
    }),
  ]);
  return task;
}

export async function updateTask(id: string, data: UpdateTaskRequestSchema, userId: string) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.leadTask.update({
      where: { id },
      data: {
        ...(data.type !== undefined && { type: data.type }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.dueAt !== undefined && { dueAt: data.dueAt ? new Date(data.dueAt) : null }),
        ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
        ...(data.completed !== undefined && { completedAt: data.completed ? new Date() : null }),
      },
    });

    if (data.completed) {
      await tx.leadActivity.create({
        data: {
          leadId: task.leadId,
          userId,
          type: "TASK_COMPLETED",
          details: { taskTitle: task.title },
        },
      });
      await tx.lead.update({
        where: { id: task.leadId },
        data: { lastActivityAt: new Date() },
      });
    }

    return task;
  });
}

export async function deleteTask(id: string) {
  return prisma.leadTask.delete({ where: { id } });
}
