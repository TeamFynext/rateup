import { Prisma } from "../../../../generated/prisma/client.js";
import type { Contact } from "../../../../generated/prisma/client.js";
import { ContactIdentityKind } from "../../../../generated/prisma/enums.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { HttpError } from "../../../utils/http.js";
import { emitIntegrationEvent } from "../../integrations/events/emitIntegrationEvent.js";
import { sendViaWstoOrgHandler } from "../../org/ws/org.ws.controller.js";
import { WaMessageClosedStatus } from "../../whatsapp/constants.js";
import {
  attachIdentity,
  identitiesFromContact,
  LEGACY_COLUMN,
  syncLegacyColumn,
} from "../identity/identity.service.js";
import { orderedPair, suggestMerge, SUGGESTION_STATUS } from "./suggestions.service.js";
import {
  MERGE_CHOOSABLE_FIELDS,
  type ContactMergeSnapshot,
  type MergeActor,
  type MergeChoosableField,
  type MergeFieldChoices,
  type MergedLoyaltyAccountSnapshot,
} from "./merge.types.js";

/**
 * Merging contact B (source) into contact A (target): one person, one record. Everything
 * B owns moves to A, B is deleted, and a `ContactMerge` row keeps what B was.
 *
 * Rules (rateup/contact-identity-plan.md §3):
 * - identities all move; A keeps its primaries, B's become secondary unless A had none;
 * - messages, tickets, calls, notes, orders… are repointed; two live tickets on one
 *   channel stay two tickets;
 * - labels, audiences, assignees are unioned;
 * - per conflicting field the caller's choice wins, else A's, and B fills A's blanks;
 * - spam / blocked carry over (OR), consent takes the stricter value (AND);
 * - both in one campaign → the further-along participation is kept;
 * - both in one loyalty program → the larger account (higher balance, then older) is kept,
 *   the other is removed and summarised in the snapshot;
 * - both with a lead in one pipeline → A's lead stays, B's is detached (contact cleared).
 */

type Tx = Prisma.TransactionClient;

/** Tables whose rows simply follow the contact. Fixed identifiers — never user input. */
const REPOINT_TABLES = [
  "WaMessage",
  "Conversation",
  "WaCall",
  "InboxNote",
  "InboxMention",
  "AdReferral",
  "InstagramMention",
  "SurveyResponse",
  "ShopOrder",
  "WaCatalogOrder",
  "ShopDiscountRedemption",
  "ShopPhoneVerification",
  "MeteredConversation",
  "ActiveContact",
] as const;

/** How far along a campaign participation got; the further one survives a merge. */
const PARTICIPANT_RANK: Record<string, number> = {
  PENDING: 0,
  FAILED: 1,
  SENT: 2,
  DELIVERED: 3,
  READ: 4,
  RESPONDED: 5,
  REPLIED: 5,
  COMPLETED: 6,
};

const blank = (value: unknown) =>
  value === null || value === undefined || (typeof value === "string" && value.trim() === "");

function fieldValue(contact: Contact, field: MergeChoosableField) {
  return contact[field];
}

function sameValue(a: unknown, b: unknown) {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return a === b;
}

async function loadPair(orgId: string, sourceId: string, targetId: string, db: Tx | typeof prisma) {
  if (sourceId === targetId) throw new HttpError("A contact cannot be merged into itself", 400);
  const [source, target] = await Promise.all([
    db.contact.findFirst({ where: { id: sourceId, orgId } }),
    db.contact.findFirst({ where: { id: targetId, orgId } }),
  ]);
  if (!source || !target) throw new HttpError("Contact not found", 404);
  return { source, target };
}

/* ------------------------------------------------------------------ preview */

/**
 * What a merge would do, for the confirmation dialog: both contacts, every field they
 * disagree on, what gets combined, which loyalty account is kept, and the warnings.
 * Writes nothing.
 */
export async function previewMerge(orgId: string, sourceId: string, targetId: string) {
  const { source, target } = await loadPair(orgId, sourceId, targetId, prisma);
  const ids = [source.id, target.id];

  const conflicts: {
    field: string;
    label: string;
    source: unknown;
    target: unknown;
    type?: string;
  }[] = [];
  for (const field of MERGE_CHOOSABLE_FIELDS) {
    const a = fieldValue(source, field);
    const b = fieldValue(target, field);
    if (!blank(a) && !blank(b) && !sameValue(a, b)) {
      conflicts.push({ field, label: field, source: a, target: b });
    }
  }

  const [customValues, identities, counts, loyalty, campaigns, labels, groups, lifecycles] =
    await Promise.all([
      prisma.contactCustomFieldValue.findMany({
        where: { contactId: { in: ids } },
        include: { field: { select: { id: true, name: true, type: true } } },
      }),
      prisma.contactIdentity.findMany({
        where: { orgId, contactId: { in: ids } },
        include: {
          channel: {
            select: {
              id: true,
              platform: true,
              name: true,
              username: true,
              whatsapp: { select: { businessPortfolioName: true } },
            },
          },
        },
        orderBy: [{ kind: "asc" }, { isPrimary: "desc" }],
      }),
      countOwned(ids),
      prisma.customerLoyaltyAccount.findMany({
        where: { contactId: { in: ids } },
        include: {
          program: { select: { id: true, name: true } },
          currentTier: { select: { name: true } },
        },
      }),
      prisma.campaignParticipant.groupBy({
        by: ["campaignId"],
        where: { contactId: { in: ids } },
        _count: { _all: true },
      }),
      prisma.contactLabelMap.findMany({
        where: { contactId: { in: ids } },
        include: { label: { select: { id: true, name: true, color: true } } },
      }),
      prisma.contactGroupMap.findMany({
        where: { contactId: { in: ids } },
        include: { contactGroup: { select: { id: true, name: true } } },
      }),
      prisma.lifecycle.findMany({
        where: { id: { in: [source.lifecycleId, target.lifecycleId].filter(Boolean) as string[] } },
        select: { id: true, name: true },
      }),
    ]);

  const byField = new Map<
    string,
    { name: string; type: string; source?: string; target?: string }
  >();
  for (const value of customValues) {
    const entry = byField.get(value.fieldId) ?? { name: value.field.name, type: value.field.type };
    if (value.contactId === source.id) entry.source = value.value;
    else entry.target = value.value;
    byField.set(value.fieldId, entry);
  }
  for (const [fieldId, entry] of byField) {
    if (!blank(entry.source) && !blank(entry.target) && entry.source !== entry.target) {
      conflicts.push({
        field: `custom:${fieldId}`,
        label: entry.name,
        type: entry.type,
        source: entry.source,
        target: entry.target,
      });
    }
  }

  const loyaltyOutcome: {
    programId: string;
    programName: string;
    keep: { accountId: string; contactId: string; points: number; tier: string | null };
    remove: { accountId: string; contactId: string; points: number; tier: string | null } | null;
  }[] = [];
  const byProgram = new Map<string, typeof loyalty>();
  for (const account of loyalty) {
    byProgram.set(account.programId, [...(byProgram.get(account.programId) ?? []), account]);
  }
  for (const [programId, accounts] of byProgram) {
    const [keep, remove] = rankLoyaltyAccounts(accounts);
    const card = (a: (typeof accounts)[number]) => ({
      accountId: a.id,
      contactId: a.contactId,
      points: a.currentPoints,
      tier: a.currentTier?.name ?? null,
    });
    loyaltyOutcome.push({
      programId,
      programName: keep.program.name,
      keep: card(keep),
      remove: remove ? card(remove) : null,
    });
  }

  const sharedCampaigns = campaigns.filter((row) => row._count._all > 1).length;
  const uniqueLabels = new Map(labels.map((row) => [row.labelId, row.label]));
  const uniqueGroups = new Map(groups.map((row) => [row.contactGroupId, row.contactGroup]));

  const warnings: string[] = [];
  if (source.isSpam || target.isSpam) warnings.push("SPAM_CARRIES_OVER");
  if (
    source.blockedOnWhatsApp ||
    target.blockedOnWhatsApp ||
    source.igBlockedAt ||
    target.igBlockedAt
  ) {
    warnings.push("BLOCK_CARRIES_OVER");
  }
  if (source.consent !== target.consent) warnings.push("OPT_OUT_CARRIES_OVER");
  if (loyaltyOutcome.some((row) => row.remove)) warnings.push("LOYALTY_ACCOUNT_REMOVED");
  if (sharedCampaigns) warnings.push("SHARED_CAMPAIGNS");

  return {
    source,
    target,
    conflicts,
    identities: identities.map((row) => ({
      ...row,
      side: row.contactId === source.id ? "source" : "target",
    })),
    // Contacts not backfilled yet hold identities only in their columns.
    legacyIdentities: {
      source: identitiesFromContact(source),
      target: identitiesFromContact(target),
    },
    combined: {
      labels: [...uniqueLabels.values()],
      audiences: [...uniqueGroups.values()],
      ...counts,
      sharedCampaigns,
    },
    lifecycles,
    loyalty: loyaltyOutcome,
    warnings,
  };
}

async function countOwned(ids: string[]) {
  const [conversations, messages, orders, campaignParticipations, calls] = await Promise.all([
    prisma.conversation.count({ where: { contactId: { in: ids } } }),
    prisma.waMessage.count({ where: { contactId: { in: ids } } }),
    prisma.shopOrder.count({ where: { contactId: { in: ids } } }),
    prisma.campaignParticipant.count({ where: { contactId: { in: ids } } }),
    prisma.waCall.count({ where: { contactId: { in: ids } } }),
  ]);
  return { conversations, messages, orders, campaignParticipations, calls };
}

/** Larger account first: higher current balance, then lifetime points, then the older one. */
function rankLoyaltyAccounts<
  T extends { currentPoints: number; lifetimePoints: number; createdAt: Date },
>(accounts: T[]): [T, T | undefined] {
  const sorted = [...accounts].sort(
    (a, b) =>
      b.currentPoints - a.currentPoints ||
      b.lifetimePoints - a.lifetimePoints ||
      a.createdAt.getTime() - b.createdAt.getTime(),
  );
  return [sorted[0], sorted[1]];
}

/* -------------------------------------------------------------------- merge */

export interface MergeResult {
  target: Contact;
  mergeId: string;
}

export async function mergeContacts(
  orgId: string,
  sourceId: string,
  targetId: string,
  actor: MergeActor,
  fieldChoices: MergeFieldChoices = {},
): Promise<MergeResult> {
  const { mergeId, source, target } = await prisma.$transaction(
    async (tx) => mergeInTransaction(tx, orgId, sourceId, targetId, actor, fieldChoices),
    { timeout: 120_000, maxWait: 10_000 },
  );

  // After commit: tell integrations, webhooks and every open inbox. None of these may
  // undo a merge that already happened, so failures are only logged.
  await Promise.allSettled([
    emitIntegrationEvent(orgId, { type: "contact.merged", contact: target, sourceContact: source }),
    sendViaWstoOrgHandler(orgId, {
      type: "contact_merged",
      contact_merged: { sourceContactId: source.id, targetContactId: target.id },
    }),
    carrySuggestions(orgId, source.id, target.id, actor.userId),
  ]).then((results) => {
    for (const result of results) {
      if (result.status === "rejected") {
        log.warn({ err: result.reason, orgId, mergeId }, "Post-merge step failed");
      }
    }
  });

  return { target, mergeId };
}

async function mergeInTransaction(
  tx: Tx,
  orgId: string,
  sourceId: string,
  targetId: string,
  actor: MergeActor,
  fieldChoices: MergeFieldChoices,
) {
  // Lock both rows in a fixed order so two merges touching the same pair cannot deadlock.
  const [first, second] = orderedPair(sourceId, targetId);
  await tx.$queryRaw`SELECT id FROM "Contact" WHERE id IN (${first}::uuid, ${second}::uuid) AND "orgId" = ${orgId}::uuid ORDER BY id FOR UPDATE`;
  const { source, target } = await loadPair(orgId, sourceId, targetId, tx);
  const moved: Record<string, number> = {};

  // 1. Identities. Record both sides' column identities first (contacts not backfilled
  //    yet hold them only there), then move the source's.
  for (const side of [target, source]) {
    for (const input of identitiesFromContact(side)) {
      await attachIdentity(orgId, side.id, input, tx);
    }
  }
  const sourceIdentities = await tx.contactIdentity.findMany({
    where: { contactId: source.id },
    select: { kind: true, scope: true, value: true, source: true },
  });
  moved.identities = (
    await tx.contactIdentity.updateMany({
      where: { contactId: source.id },
      data: { contactId: target.id, isPrimary: false },
    })
  ).count;

  // 2. Rows that simply follow the contact.
  for (const table of REPOINT_TABLES) {
    moved[table] = await tx.$executeRaw`
      UPDATE ${Prisma.raw(`"${table}"`)} SET "contactId" = ${target.id}::uuid
      WHERE "contactId" = ${source.id}::uuid`;
  }

  // 3. Unions. The source's own rows go with the contact's cascade.
  moved.labels = await tx.$executeRaw`
    INSERT INTO "ContactLabelMap" ("contactId", "labelId", "createdAt")
    SELECT ${target.id}::uuid, "labelId", "createdAt" FROM "ContactLabelMap"
    WHERE "contactId" = ${source.id}::uuid
    ON CONFLICT DO NOTHING`;
  moved.audiences = await tx.$executeRaw`
    INSERT INTO "ContactGroupMap" ("contactId", "contactGroupId")
    SELECT ${target.id}::uuid, "contactGroupId" FROM "ContactGroupMap"
    WHERE "contactId" = ${source.id}::uuid
    ON CONFLICT DO NOTHING`;
  moved.assignees = await tx.$executeRaw`
    INSERT INTO "WaInboxAssign" ("contactId", "assignedUserId", "teamId")
    SELECT ${target.id}::uuid, "assignedUserId", "teamId" FROM "WaInboxAssign"
    WHERE "contactId" = ${source.id}::uuid
    ON CONFLICT DO NOTHING`;
  moved.stockAlerts = await tx.$executeRaw`
    UPDATE "ShopBackInStockRequest" s SET "contactId" = ${target.id}::uuid
    WHERE s."contactId" = ${source.id}::uuid
      AND NOT EXISTS (
        SELECT 1 FROM "ShopBackInStockRequest" t
        WHERE t."contactId" = ${target.id}::uuid AND t."variantId" = s."variantId")`;

  // 4. Leads: one per pipeline per contact.
  const detached = await tx.$queryRaw<{ id: string }[]>`
    UPDATE "Lead" l SET "contactId" = NULL
    WHERE l."contactId" = ${source.id}::uuid
      AND EXISTS (
        SELECT 1 FROM "Lead" t
        WHERE t."contactId" = ${target.id}::uuid AND t."pipelineId" = l."pipelineId")
    RETURNING l.id`;
  moved.leads = await tx.$executeRaw`
    UPDATE "Lead" SET "contactId" = ${target.id}::uuid WHERE "contactId" = ${source.id}::uuid`;

  // 5. Campaigns: one participation per campaign.
  const droppedCampaignParticipants = await mergeCampaignParticipants(tx, source.id, target.id);
  moved.campaignParticipations = (
    await tx.campaignParticipant.updateMany({
      where: { contactId: source.id },
      data: { contactId: target.id },
    })
  ).count;

  // 6. Loyalty: one account per program.
  const removedLoyaltyAccounts = await mergeLoyaltyAccounts(tx, source.id, target.id);

  // 7. Custom fields: the chosen side per field, else the target, the source fills blanks.
  await mergeCustomFields(tx, source.id, target.id, fieldChoices);

  // 8. Scalars and flags.
  const data: Prisma.ContactUncheckedUpdateInput = {};
  for (const field of MERGE_CHOOSABLE_FIELDS) {
    const a = fieldValue(source, field);
    const b = fieldValue(target, field);
    const pick = fieldChoices[field] === "source" ? a : blank(b) ? a : b;
    if (!sameValue(pick, b)) (data as Record<string, unknown>)[field] = pick;
  }
  const fillBlanks = [
    "source",
    "other",
    "profilePic",
    "followerCount",
    "isIgVerifiedUser",
    "whatsappUserName",
    "lastReceivedMessageTimeStamp",
    "lastSentMessageTimeStamp",
  ] as const;
  for (const field of fillBlanks) {
    // A webchat visitor's id lives in its WEBCHAT identity, which moves with the merge; in the
    // kept contact's `other` it would show as its Location.
    if (field === "other" && source.source === PlatformType.WEBCHAT) continue;
    if (blank(target[field]) && !blank(source[field])) {
      (data as Record<string, unknown>)[field] = source[field];
    }
  }
  if (source.isSpam && !target.isSpam) {
    Object.assign(data, {
      isSpam: true,
      spamMarkedAt: source.spamMarkedAt,
      spamMarkedBy: source.spamMarkedBy,
    });
  }
  if (source.blockedOnWhatsApp) data.blockedOnWhatsApp = true;
  if (source.igBlockedAt && (!target.igBlockedAt || source.igBlockedAt < target.igBlockedAt)) {
    data.igBlockedAt = source.igBlockedAt;
  }
  if (!source.consent) data.consent = false;
  if (
    source.metaAgentThreadOwnerAt &&
    (!target.metaAgentThreadOwnerAt ||
      source.metaAgentThreadOwnerAt > target.metaAgentThreadOwnerAt)
  ) {
    Object.assign(data, {
      metaAgentThreadOwner: source.metaAgentThreadOwner,
      metaAgentThreadOwnerAt: source.metaAgentThreadOwnerAt,
      metaAgentHandoverReason: source.metaAgentHandoverReason,
    });
  }
  // The newest message decides the row's preview and the contact-level inbox status.
  const sourceNewer =
    (source.lastMessageWaCreatedAt?.getTime() ?? 0) >
    (target.lastMessageWaCreatedAt?.getTime() ?? 0);
  if (sourceNewer) {
    Object.assign(data, {
      lastMessageBody: source.lastMessageBody ?? Prisma.DbNull,
      lastMessageWaCreatedAt: source.lastMessageWaCreatedAt,
      lastMessagePlatform: source.lastMessagePlatform,
      lastReceivedMetadata: source.lastReceivedMetadata ?? Prisma.DbNull,
      lastMessageSourceIdentifier: source.lastMessageSourceIdentifier,
    });
  }
  const sourceLive = !WaMessageClosedStatus.includes(source.waMessageAssignStatus);
  const targetLive = !WaMessageClosedStatus.includes(target.waMessageAssignStatus);
  if (sourceLive && (!targetLive || sourceNewer)) {
    data.waMessageAssignStatus = source.waMessageAssignStatus;
  }
  data.integrationIds = {
    ...(source.integrationIds as object | null),
    ...(target.integrationIds as object | null),
  };
  const tags = [
    ...new Set([
      ...(Array.isArray(target.tags) ? target.tags : []),
      ...(Array.isArray(source.tags) ? source.tags : []),
    ]),
  ];
  if (tags.length) data.tags = tags as Prisma.InputJsonValue;

  // 9. Free the source's unique columns, then delete it. Its remaining rows (labels,
  //    audiences, assignees, custom values, the dropped duplicates) go with the cascade.
  await tx.contact.update({
    where: { id: source.id },
    data: { phone: null, bsuid: null, igsId: null, psid: null, external_id: null },
  });
  const snapshot: ContactMergeSnapshot = {
    contact: JSON.parse(JSON.stringify(source)),
    identities: sourceIdentities.map((row) => ({ ...row, source: String(row.source) })),
    fieldChoices,
    moved,
    removedLoyaltyAccounts,
    droppedCampaignParticipants,
    detachedLeadIds: detached.map((row) => row.id),
  };
  await tx.contact.delete({ where: { id: source.id } });

  // 10. The target, its columns re-mirrored from its primary identities.
  await tx.contact.update({ where: { id: target.id }, data });
  for (const kind of Object.keys(LEGACY_COLUMN) as ContactIdentityKind[]) {
    if (kind === ContactIdentityKind.EMAIL && data.email !== undefined) continue;
    await syncLegacyColumn(target.id, kind, tx);
  }
  if (typeof data.email === "string" && data.email) {
    await attachIdentity(
      orgId,
      target.id,
      { kind: ContactIdentityKind.EMAIL, value: data.email, source: "AGENT" },
      tx,
    );
  }
  if (!target.external_id && source.external_id) {
    await tx.contact.update({
      where: { id: target.id },
      data: { external_id: source.external_id },
    });
  }

  const merge = await tx.contactMerge.create({
    data: {
      orgId,
      sourceContactId: source.id,
      targetContactId: target.id,
      mergedBy: actor.userId,
      reason: actor.reason,
      snapshot,
    },
    select: { id: true },
  });

  const merged = await tx.contact.findUniqueOrThrow({ where: { id: target.id } });
  return { mergeId: merge.id, source, target: merged };
}

async function mergeCampaignParticipants(tx: Tx, sourceId: string, targetId: string) {
  const shared = await tx.$queryRaw<
    {
      campaignId: string;
      sourcePid: string;
      sourceStatus: string;
      targetPid: string;
      targetStatus: string;
    }[]
  >`
    SELECT s."campaignId", s.id AS "sourcePid", s.status AS "sourceStatus",
           t.id AS "targetPid", t.status AS "targetStatus"
    FROM "CampaignParticipant" s
    JOIN "CampaignParticipant" t ON t."campaignId" = s."campaignId" AND t."contactId" = ${targetId}::uuid
    WHERE s."contactId" = ${sourceId}::uuid`;
  const dropped: { campaignId: string; status: string }[] = [];
  for (const row of shared) {
    const keepSource =
      (PARTICIPANT_RANK[row.sourceStatus] ?? 0) > (PARTICIPANT_RANK[row.targetStatus] ?? 0);
    const keep = keepSource ? row.sourcePid : row.targetPid;
    const drop = keepSource ? row.targetPid : row.sourcePid;
    // The dropped participation's sent messages stay reportable under the kept one.
    await tx.waMessageCampaginParticipantMap.updateMany({
      where: { campaignParticipantId: drop },
      data: { campaignParticipantId: keep, campaignParticipantDripStageId: null },
    });
    await tx.campaignParticipant.delete({ where: { id: drop } });
    if (keepSource) {
      await tx.campaignParticipant.update({ where: { id: keep }, data: { contactId: targetId } });
    }
    dropped.push({
      campaignId: row.campaignId,
      status: keepSource ? row.targetStatus : row.sourceStatus,
    });
  }
  return dropped;
}

async function mergeLoyaltyAccounts(
  tx: Tx,
  sourceId: string,
  targetId: string,
): Promise<MergedLoyaltyAccountSnapshot[]> {
  const accounts = await tx.customerLoyaltyAccount.findMany({
    where: { contactId: { in: [sourceId, targetId] } },
  });
  const byProgram = new Map<string, typeof accounts>();
  for (const account of accounts) {
    byProgram.set(account.programId, [...(byProgram.get(account.programId) ?? []), account]);
  }
  const removed: MergedLoyaltyAccountSnapshot[] = [];
  for (const group of byProgram.values()) {
    const [keep, remove] = rankLoyaltyAccounts(group);
    if (remove) {
      const [transactionCount, recent] = await Promise.all([
        tx.loyaltyTransaction.count({ where: { accountId: remove.id } }),
        tx.loyaltyTransaction.findMany({
          where: { accountId: remove.id },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: { points: true, transactionType: true, description: true, createdAt: true },
        }),
      ]);
      removed.push({
        accountId: remove.id,
        programId: remove.programId,
        currentPoints: remove.currentPoints,
        lifetimePoints: remove.lifetimePoints,
        totalSpend: remove.totalSpend.toString(),
        currentTierId: remove.currentTierId,
        referralCode: remove.referralCode,
        createdAt: remove.createdAt.toISOString(),
        transactionCount,
        recentTransactions: recent.map((row) => ({
          points: row.points,
          type: row.transactionType,
          description: row.description,
          at: row.createdAt.toISOString(),
        })),
      });
      // Members this account referred stay referred — by the kept account.
      await tx.customerLoyaltyAccount.updateMany({
        where: { referredById: remove.id },
        data: { referredById: keep.id },
      });
      await tx.customerLoyaltyAccount.delete({ where: { id: remove.id } });
    }
    if (keep.contactId !== targetId) {
      await tx.customerLoyaltyAccount.update({
        where: { id: keep.id },
        data: { contactId: targetId },
      });
    }
  }
  return removed;
}

async function mergeCustomFields(
  tx: Tx,
  sourceId: string,
  targetId: string,
  fieldChoices: MergeFieldChoices,
) {
  const values = await tx.contactCustomFieldValue.findMany({
    where: { contactId: { in: [sourceId, targetId] } },
  });
  const targetByField = new Map(
    values.filter((v) => v.contactId === targetId).map((v) => [v.fieldId, v]),
  );
  for (const value of values.filter((v) => v.contactId === sourceId)) {
    const existing = targetByField.get(value.fieldId);
    const preferSource = fieldChoices[`custom:${value.fieldId}`] === "source";
    if (!existing) {
      await tx.contactCustomFieldValue.update({
        where: { id: value.id },
        data: { contactId: targetId },
      });
    } else if ((preferSource || blank(existing.value)) && !blank(value.value)) {
      await tx.contactCustomFieldValue.update({
        where: { id: existing.id },
        data: { value: value.value },
      });
    }
  }
}

/**
 * The source's suggestions now describe the target: the merged pair is closed as MERGED,
 * any other pair is re-raised against the target (a dismissed one stays dismissed).
 */
async function carrySuggestions(
  orgId: string,
  sourceId: string,
  targetId: string,
  userId: string | null,
) {
  const [a, b] = orderedPair(sourceId, targetId);
  await prisma.contactMergeSuggestion.updateMany({
    where: { orgId, contactAId: a, contactBId: b },
    data: { status: SUGGESTION_STATUS.MERGED, resolvedBy: userId, resolvedAt: new Date() },
  });
  const others = await prisma.contactMergeSuggestion.findMany({
    where: {
      orgId,
      status: SUGGESTION_STATUS.PENDING,
      OR: [{ contactAId: sourceId }, { contactBId: sourceId }],
    },
  });
  for (const row of others) {
    const other = row.contactAId === sourceId ? row.contactBId : row.contactAId;
    await prisma.contactMergeSuggestion.delete({ where: { id: row.id } });
    if (other !== targetId) {
      await suggestMerge(orgId, targetId, other, {
        reason: row.reason as Parameters<typeof suggestMerge>[3]["reason"],
        detail: row.detail ?? undefined,
      });
    }
  }
}

/** Merges recorded on a contact, newest first — the contact timeline's "Merged with …". */
export async function listMergesForContact(orgId: string, contactId: string) {
  const rows = await prisma.contactMerge.findMany({
    where: { orgId, targetContactId: contactId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      sourceContactId: true,
      mergedBy: true,
      reason: true,
      createdAt: true,
      snapshot: true,
    },
  });
  const userIds = rows.map((row) => row.mergedBy).filter(Boolean) as string[];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  const names = new Map(users.map((user) => [user.id, user.name]));
  return rows.map((row) => {
    const snapshot = row.snapshot;
    return {
      id: row.id,
      sourceContactId: row.sourceContactId,
      sourceName: (snapshot?.contact?.name as string | null) ?? null,
      mergedBy: row.mergedBy,
      mergedByName: row.mergedBy ? (names.get(row.mergedBy) ?? null) : null,
      reason: row.reason,
      createdAt: row.createdAt,
    };
  });
}
