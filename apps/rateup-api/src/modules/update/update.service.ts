import dayjs from "dayjs";
import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { FreePlanSubscriptionFeatures } from "../subscription/subscription.data.js";
import { subscriptionGates } from "../../utils/canAccess.js";
import { TeamFeature, PlatformType, Prisma } from "../../../generated/prisma/client.js";
import { getNestedProperty } from "../../utils/misc/obj.utils.js";
import type { InboxStatus } from "../../types/enums.js";
import { WaMessageClosedStatus } from "../whatsapp/constants.js";
import { DEFAULT_LOST_REASONS } from "../pipeline/pipeline.service.js";
import type { LeadChannel } from "../../../generated/prisma/client.js";

export async function updateUsageStatsTemplateMessageCount() {
  const subscriptions = await prisma.subscription.findMany();
  for (const subscription of subscriptions) {
    const thisYearCycleStart = dayjs(subscription.renewedAt ?? subscription.createdAt).year(
      dayjs().year(),
    );
    const lastAnnualCycleStart = thisYearCycleStart.isAfter(dayjs())
      ? thisYearCycleStart.subtract(1, "year").toDate()
      : thisYearCycleStart.toDate();
    const monthlyDifference =
      dayjs()
        .startOf("day")
        .diff(dayjs(subscription.renewedAt ?? subscription.createdAt).startOf("day"), "day") % 30;
    const lastMonthlyCycleStart = dayjs().subtract(monthlyDifference, "day").toDate();
    const res = await prisma.$queryRaw<
      {
        templateMessagesCount: number;
        annualTemplateMessageCount: number;
        monthlyTemplateMessageCount: number;
      }[]
    >`SELECT
          COUNT(wm."createdAt")::INTEGER AS "templateMessagesCount",
          COUNT(wm."createdAt") FILTER (
          WHERE wm."createdAt"::DATE >= ${lastAnnualCycleStart})::INTEGER AS "annualTemplateMessageCount",
          COUNT(wm."createdAt") FILTER (
          WHERE wm."createdAt"::DATE >= ${lastMonthlyCycleStart})::INTEGER AS "monthlyTemplateMessageCount"
          FROM "WaMessage" wm
      JOIN "Contact" c ON wm."contactId" = c.id
      WHERE (wm."messageBody"::jsonb)->>'exchangeProcess' = 'send'
      AND (wm."messageBody"::jsonb)->'send'->>'type' = 'template' AND c."orgId"=${subscription.orgId}::uuid;`;
    const usageStats = await prisma.usageStats.findUnique({
      where: {
        orgId: subscription.orgId,
      },
    });
    if (!usageStats) {
      log.trace("usage stats not found for orgId: %s", subscription.orgId);
      continue;
    }
    await prisma.usageStats.update({
      where: {
        orgId: subscription.orgId,
      },
      data: res[0],
    });
  }
}
export async function updateSubscriptionAutomation() {
  const subscriptions = await prisma.subscription.findMany();

  for await (const subscription of subscriptions) {
    const features: LegacySubscriptionFeatures = {
      ...subscription.features,
      whatsapp: {
        ...subscription.features?.whatsapp,
        automation: { count: { max: 10 }, active: true },
      },
    };

    const updatedSubscription = await prisma.subscription.update({
      where: {
        orgId: subscription.orgId,
      },
      data: {
        features,
      },
    });
    log.info(`Updated subscription automation for orgId: ${updatedSubscription.orgId}`);
  }
}

//updating automation trigger and automation for new plans
export async function updateRateupPlanFeature() {
  const rateupPlans = await prisma.rateupPlan.findMany();
  for (const plan of rateupPlans) {
    const feature = plan.features as SubscriptionFeatures;
    const newFeature = {
      ...feature,
      whatsapp: {
        ...feature.whatsapp,
      },
    };

    await prisma.rateupPlan.update({
      where: {
        id: plan.id,
      },
      data: {
        features: newFeature,
      },
    });
  }

  const subscriptions = await prisma.subscription.findMany();
  for (const subscription of subscriptions) {
    const features = subscription.features as SubscriptionFeatures;
    const newFeatures = {
      ...features,
      whatsapp: {
        ...features.whatsapp,
      },
    };

    await prisma.subscription.update({
      where: {
        orgId: subscription.orgId,
      },
      data: {
        features: newFeatures,
      },
    });
  }
}

export async function updateUsageStatsAutomation() {
  const usageStats = await prisma.usageStats.findMany();
  for (const stat of usageStats) {
    const automationCount = await prisma.waAutomatedReply.count({
      where: {
        orgId: stat.orgId,
      },
    });
    await prisma.usageStats.update({
      where: {
        orgId: stat.orgId,
      },
      data: {
        waAutomationCount: automationCount,
      },
    });
  }
}

export async function updatePlanFeatures() {
  const subscriptions = await prisma.subscription.findMany();
  const rateupplans = await prisma.rateupPlan.findMany();

  // `features` here is the *pre-migration* legacy shape (whatsapp.template /
  // whatsapp.automation still nested, before `migrateFeaturesToCurrentSchema`
  // flattened whatsapp down to just `conversation`), so it is read through an open
  // record rather than the current `SubscriptionFeatures` type it predates.
  function getNewFeatures(features: LegacySubscriptionFeatures) {
    return {
      ...features,
      webSurvey: {
        ...features.webSurvey,
        webhook: {
          active: false,
        },
      },
      whatsapp: {
        ...features.whatsapp,
        template: {
          ...features.whatsapp?.template,
          carouselTemplate: {
            active: false,
            count: { max: 1 },
          },
        },
        automation: {
          ...features.whatsapp?.automation,
          leadAdAutomation: {
            active: false,
            count: {
              max: 1,
            },
          },
        },
      },
    } as SubscriptionFeatures;
  }
  for (const sub of subscriptions) {
    const features = { ...(sub.features as SubscriptionFeatures) };
    const newFeatures = getNewFeatures(features);
    await prisma.subscription.update({
      where: {
        orgId: sub.orgId,
      },
      data: {
        features: newFeatures,
      },
    });
  }
  for (const plan of rateupplans) {
    const features = { ...(plan.features as SubscriptionFeatures) };
    const newFeatures = getNewFeatures(features);
    await prisma.rateupPlan.update({
      where: {
        id: plan.id,
      },
      data: {
        features: newFeatures,
      },
    });
  }
}

export async function updateFreePlanExpiry() {
  await prisma.subscription.updateMany({
    where: {
      basePlan: {
        name: "FREE PLAN",
      },
    },
    data: {
      expiresAt: dayjs().add(100, "years").toDate(),
    },
  });
}

// Resets every FREE PLAN subscription's feature set to the current
// FreePlanSubscriptionFeatures defaults (e.g. after the free-plan limits change).
export async function migrateFreePlanFeatures() {
  const result = await prisma.subscription.updateMany({
    where: {
      basePlan: {
        name: "FREE PLAN",
      },
    },
    data: {
      features: FreePlanSubscriptionFeatures as unknown as object,
    },
  });
  return { updated: result.count };
}

// The pooled conversation allowance applied to every non-free plan during the
// legacy → current feature-schema migration.
const MIGRATION_CONVERSATION_MAX = 1_000_000;

// Projects a subscription's (possibly legacy-shaped) feature JSON onto the CURRENT
// schema. It PRESERVES the existing values of features that still exist — team,
// teamMember, webSurvey (and its sub-toggles), reputationManagement, ai — and DROPS
// retired ones (menu, ticket, loyalty, and the old message-based whatsapp.count plus
// the whatsapp sub-features flow/survey/campaign/template/automation). WhatsApp is
// rebuilt around `conversation`, pooled at MIGRATION_CONVERSATION_MAX. Missing keys
// fall back to safe defaults so a partially-shaped record still migrates cleanly.
export function migrateFeaturesToCurrentSchema(
  features: LegacySubscriptionFeatures | null | undefined,
): SubscriptionFeatures {
  const f = features ?? {};
  return {
    team: {
      count: { max: f.team?.count?.max ?? 1 },
      teamMember: {
        count: { max: f.team?.teamMember?.count?.max ?? 1 },
        active: f.team?.teamMember?.active ?? true,
      },
      active: f.team?.active ?? true,
    },
    webSurvey: {
      count: {
        max: f.webSurvey?.count?.max ?? 0,
        monthlyResponseLimit: f.webSurvey?.count?.monthlyResponseLimit ?? 1000,
      },
      active: f.webSurvey?.active ?? false,
      encryption: { active: f.webSurvey?.encryption?.active ?? false },
      googleReview: { active: f.webSurvey?.googleReview?.active ?? false },
      emailNotification: { active: f.webSurvey?.emailNotification?.active ?? false },
      htmlCodePage: { active: f.webSurvey?.htmlCodePage?.active ?? false },
      webhook: { active: f.webSurvey?.webhook?.active ?? false },
    },
    whatsapp: {
      active: f.whatsapp?.active ?? true,
      conversation: {
        active: true,
        count: { max: MIGRATION_CONVERSATION_MAX },
      },
    },
    reputationManagement: {
      count: { max: f.reputationManagement?.count?.max ?? 0 },
      active: f.reputationManagement?.active ?? false,
    },
    ai: {
      count: {
        promptTokens: f.ai?.count?.promptTokens ?? 0,
        completionTokens: f.ai?.count?.completionTokens ?? 0,
      },
      active: f.ai?.active ?? false,
    },
  };
}

// Rewrites EVERY non-free subscription's feature JSON to the current schema, keeping
// each org's own values for the surviving features (see migrateFeaturesToCurrentSchema).
// FREE PLAN is intentionally skipped — it has its own migration (migrateFreePlanFeatures)
// with free-specific limits that this generic "preserve + 1M conversations" pass would
// otherwise overwrite. Done per-row (not updateMany) because every org keeps its values.
export async function migrateNonFreePlanFeatures() {
  const subscriptions = await prisma.subscription.findMany({
    select: { orgId: true, features: true, basePlan: { select: { name: true } } },
  });

  let updated = 0;
  let skipped = 0;
  for (const sub of subscriptions) {
    if (sub.basePlan?.name === "FREE PLAN") {
      skipped++;
      continue;
    }
    const migrated = migrateFeaturesToCurrentSchema(sub.features);
    await prisma.subscription.update({
      where: { orgId: sub.orgId },
      data: { features: migrated as unknown as object },
    });
    updated++;
  }
  return { updated, skipped };
}

export async function backfillWithSQL() {
  console.log("\n🚀 Starting SQL-based backfill...\n");
  try {
    const startTime = Date.now();

    // Step 2: Backfill last message data
    console.log("2️⃣  Backfilling last message data...");
    const lastMessageResult = await prisma.$executeRaw`
      WITH last_messages AS (
        SELECT DISTINCT ON (w."contactId")
          w."contactId",
          w."messageBody",
          w."waCreatedAt",
          w."sourcePlatform"
        FROM "WaMessage" w
        WHERE w."contactId" IS NOT NULL
        ORDER BY w."contactId", w."waCreatedAt" DESC
      )
      UPDATE "Contact" c
      SET 
        "lastMessageBody" = lm."messageBody",
        "lastMessageWaCreatedAt" = lm."waCreatedAt",
        "lastMessagePlatform" = lm."sourcePlatform"
      FROM last_messages lm
      WHERE c.id = lm."contactId"
      AND c."lastMessageBody" IS NULL
    `;
    console.log(`   ✓ Updated ${lastMessageResult} contacts\n`);

    // Step 3: Backfill lastSentMessageTimeStamp
    console.log("3️⃣  Backfilling lastSentMessageTimeStamp...");
    const lastSentResult = await prisma.$executeRaw`
      WITH last_sent AS (
        SELECT DISTINCT ON (w."contactId")
          w."contactId",
          w."waCreatedAt"
        FROM "WaMessage" w
        WHERE w."messageBody"->>'exchangeProcess' = 'send'
        AND w."contactId" IS NOT NULL
        ORDER BY w."contactId", w."waCreatedAt" DESC
      )
      UPDATE "Contact" c
      SET "lastSentMessageTimeStamp" = ls."waCreatedAt"
      FROM last_sent ls
      WHERE c.id = ls."contactId"
      AND c."lastSentMessageTimeStamp" IS NULL
    `;
    console.log(`   ✓ Updated ${lastSentResult} contacts\n`);

    // Step 4: Backfill lastReceivedMetadata
    console.log("4️⃣  Backfilling lastReceivedMetadata...");
    const metadataResult = await prisma.$executeRaw`
      WITH last_received AS (
        SELECT DISTINCT ON (w."contactId")
          w."contactId",
          w."messageBody"->'receive'->'metadata' as metadata
        FROM "WaMessage" w
        WHERE w."messageBody"->>'exchangeProcess' = 'receive'
        AND w."contactId" IS NOT NULL
        ORDER BY w."contactId", w."waCreatedAt" DESC
      )
      UPDATE "Contact" c
      SET "lastReceivedMetadata" = lr.metadata
      FROM last_received lr
      WHERE c.id = lr."contactId"
      AND lr.metadata IS NOT NULL
      AND c."lastReceivedMetadata" IS NULL
    `;
    console.log(`   ✓ Updated ${metadataResult} contacts\n`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ SQL backfill completed in ${duration}s\n`);
  } catch (error) {
    console.error("❌ Error during SQL backfill:", error);
    throw error;
  }
}

export async function migrateWaTemplatePhoneIds() {
  const orgs = await prisma.org.findMany({
    select: { id: true },
  });

  let updatedTemplates = 0;
  let skippedOrgs = 0;

  for (const org of orgs) {
    const firstWhatsappAccount = await prisma.whatsappSettings.findFirst({
      where: {
        orgId: org.id,
        phoneId: {
          not: null,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        phoneId: true,
      },
    });

    if (!firstWhatsappAccount?.phoneId) {
      skippedOrgs++;
      continue;
    }

    const result = await prisma.waTemplate.updateMany({
      where: {
        orgId: org.id,
        whatsappSettingsPhoneId: null,
      },
      data: {
        whatsappSettingsPhoneId: firstWhatsappAccount.phoneId,
      },
    });

    updatedTemplates += result.count;
  }

  return {
    orgsProcessed: orgs.length,
    orgsWithoutWhatsappAccount: skippedOrgs,
    templatesUpdated: updatedTemplates,
  };
}

/**
 * For each team in the given org (or all orgs when orgId is omitted),
 * syncs TeamFeatureAccess rows to match the org's active subscription features.
 *
 * Features with no subscription gate are always enabled.
 * Features whose subscription gate is inactive are removed.
 */
export async function syncTeamFeaturesFromSubscription(orgId?: string) {
  const subscriptions = await prisma.subscription.findMany({
    where: orgId ? { orgId } : undefined,
    select: { orgId: true, features: true },
  });

  const results: { orgId: string; teamsUpdated: number; features: string[] }[] = [];

  for (const sub of subscriptions) {
    const subFeatures = sub.features as SubscriptionFeatures;

    // Determine which TeamFeatures are enabled by this subscription
    const activeFeatures = (Object.keys(subscriptionGates) as TeamFeature[]).filter((feature) => {
      const gate = subscriptionGates[feature];
      if (!gate) return true; // no gate → always enabled
      const gated = getNestedProperty<subscriptionActiveField>(subFeatures, gate);
      return Boolean(gated?.active);
    });

    const teams = await prisma.team.findMany({
      where: { orgId: sub.orgId },
      select: { id: true },
    });

    for (const team of teams) {
      const existing = await prisma.teamFeatureAccess.findMany({
        where: { teamId: team.id },
        select: { id: true, feature: true },
      });

      const desiredSet = new Set(activeFeatures);
      const toDelete = existing.filter((r) => !desiredSet.has(r.feature)).map((r) => r.id);
      const existingSet = new Set(existing.map((r) => r.feature));
      const toCreate = activeFeatures.filter((f) => !existingSet.has(f));

      await prisma.$transaction([
        ...(toDelete.length > 0
          ? [
              prisma.teamFeatureAccess.deleteMany({
                where: { id: { in: toDelete } },
              }),
            ]
          : []),
        ...(toCreate.length > 0
          ? [
              prisma.teamFeatureAccess.createMany({
                data: toCreate.map((feature) => ({ teamId: team.id, feature })),
                skipDuplicates: true,
              }),
            ]
          : []),
      ]);
    }

    results.push({
      orgId: sub.orgId,
      teamsUpdated: teams.length,
      features: activeFeatures,
    });
  }

  return results;
}

/** One row of the inbox recount query; every column is cast to INTEGER in SQL. */
interface InboxStatsRow {
  unassigned_count: number;
  assigned_count: number;
  closed_count: number;
  spam_count: number;
  resolved_count: number;
  unresolved_count: number;
  blocked_count: number;
  total_count: number;
}

export async function recalculateInboxStats(orgId: string) {
  const stats = await prisma.$queryRaw<InboxStatsRow[]>`WITH message_flags AS (
    SELECT
      c.id AS contact_id,
      c."waMessageAssignStatus",
      c."blockedOnWhatsApp",
      c."isSpam",
      c."lastReceivedMessageTimeStamp" IS NOT NULL AS has_receive
    FROM "Contact" c
    WHERE c."orgId" = ${orgId}::uuid
  )
  SELECT
    COUNT(*) FILTER (WHERE mf."waMessageAssignStatus" = 'UNASSIGNED' AND mf.has_receive AND NOT mf."blockedOnWhatsApp")::INTEGER AS unassigned_count,
    COUNT(*) FILTER (WHERE mf."waMessageAssignStatus" = 'ASSIGNED' AND mf.has_receive AND NOT mf."blockedOnWhatsApp")::INTEGER AS assigned_count,
    COUNT(*) FILTER (WHERE mf."waMessageAssignStatus" = 'CLOSED' AND mf.has_receive AND NOT mf."blockedOnWhatsApp")::INTEGER AS closed_count,
    -- Spam is a contact flag now, not a status, so it is counted from the flag.
    COUNT(*) FILTER (WHERE mf."isSpam" AND mf.has_receive AND NOT mf."blockedOnWhatsApp")::INTEGER AS spam_count,
    COUNT(*) FILTER (WHERE mf."waMessageAssignStatus" = 'RESOLVED' AND mf.has_receive AND NOT mf."blockedOnWhatsApp")::INTEGER AS resolved_count,
    COUNT(*) FILTER (WHERE mf."waMessageAssignStatus" = 'UNRESOLVED' AND mf.has_receive AND NOT mf."blockedOnWhatsApp")::INTEGER AS unresolved_count,
    COUNT(*) FILTER (WHERE mf."blockedOnWhatsApp")::INTEGER AS blocked_count,
    COUNT(*) FILTER (WHERE mf.has_receive AND NOT mf."blockedOnWhatsApp")::INTEGER AS total_count
  FROM message_flags mf;`;

  if (!stats || stats.length === 0) return null;

  const data = {
    unassignedCount: stats[0].unassigned_count || 0,
    assignedCount: stats[0].assigned_count || 0,
    closedCount: stats[0].closed_count || 0,
    spamCount: stats[0].spam_count || 0,
    resolvedCount: stats[0].resolved_count || 0,
    unresolvedCount: stats[0].unresolved_count || 0,
    blockedCount: stats[0].blocked_count || 0,
    totalCount: stats[0].total_count || 0,
  };

  return await prisma.inboxStats.upsert({
    where: { orgId },
    update: data,
    create: { orgId, ...data },
  });
}

/**
 * Repairs historical `Contact.waMessageAssignStatus` <-> `Conversation.status`
 * drift. Before the two columns were written in one transaction they could
 * diverge whenever the second write failed; this realigns the survivors.
 *
 * `Contact.waMessageAssignStatus` is the live-inbox source of truth, so it wins:
 * each contact's *latest* conversation is aligned to it. Older conversations are
 * finished records and are never touched.
 *
 * Two cases are deliberately left alone:
 *   - A live contact whose latest conversation is terminal. That is the pending
 *     reopen state: the successor conversation is opened by the next inbound
 *     message, and rewriting the closed one would destroy its `closedAt`.
 *   - Contacts with no conversation at all.
 */
export async function reconcileInboxStatus(apply: boolean) {
  const PAGE_SIZE = 1_000;

  let cursor: string | undefined;
  let scanned = 0;
  let repaired = 0;
  let skippedReopenPending = 0;
  const mismatches: {
    contactId: string;
    conversationId: string;
    from: InboxStatus;
    to: InboxStatus;
  }[] = [];

  for (;;) {
    const contacts = await prisma.contact.findMany({
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        waMessageAssignStatus: true,
        Conversations: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true },
        },
      },
    });
    if (!contacts.length) break;
    cursor = contacts.at(-1)!.id;
    scanned += contacts.length;

    for (const contact of contacts) {
      const latest = contact.Conversations[0];
      if (!latest) continue;
      if (latest.status === contact.waMessageAssignStatus) continue;

      const contactIsLive = !WaMessageClosedStatus.includes(contact.waMessageAssignStatus);
      const conversationIsClosed = WaMessageClosedStatus.includes(latest.status);
      if (contactIsLive && conversationIsClosed) {
        skippedReopenPending++;
        continue;
      }

      mismatches.push({
        contactId: contact.id,
        conversationId: latest.id,
        from: latest.status,
        to: contact.waMessageAssignStatus,
      });

      if (apply) {
        await prisma.conversation.update({
          where: { id: latest.id },
          data: { status: contact.waMessageAssignStatus },
        });
        repaired++;
      }
    }
  }

  return {
    applied: apply,
    scanned,
    mismatched: mismatches.length,
    repaired,
    skippedReopenPending,
    mismatches,
  };
}

/**
 * Fills in the conversations that are MISSING, and nothing else.
 *
 * Targets exactly one population: a contact who is in the inbox, has messages, and
 * has no conversation at all. Everything else is skipped, which makes this safe to
 * run against a production table that is already mostly threaded — it only ever adds
 * the gaps, and it never touches a row the live code owns.
 *
 * Skipped, deliberately:
 *   - Contacts who ALREADY have any conversation. Their orphan messages are left
 *     unlinked. Folding old messages into an existing thread would inflate its
 *     `messageCount` and rewrite counters on a row the live code is actively
 *     maintaining; creating a second historical row would double-count the contact in
 *     the *unfiltered* conversation counters (`getInboxCountsFromConversations` has no
 *     date filter, and `getOverAllQuickStatsOfConversations` / `getConversationOverview`
 *     divide by an unbounded `COUNT(*)`), inflating the inbox tabs and deflating every
 *     dashboard resolution rate. Neither is worth it for pre-threading history.
 *   - Contacts with no inbound message (`lastReceivedMessageTimeStamp IS NULL`). The
 *     inbox universe is gated on exactly this (`recalculateInboxStats`), so a contact
 *     who has only ever RECEIVED outbound campaign/template blasts has never been in
 *     the inbox and must not get a conversation. The live path agrees: an outbound send
 *     to a contact with no conversation stores the message with a null `conversationId`
 *     rather than opening one.
 *
 * The created row is the contact's live conversation, so it takes
 * `Contact.waMessageAssignStatus` (the inbox source of truth, same precedence
 * `reconcileInboxStatus` uses) and `createdAt` = their first message.
 *
 * Assignees come from `WaInboxAssign` in the same transaction. Assignments made before
 * conversations existed never reached `ConversationAssignedUserTeamMap` —
 * `assignWaMessageToUser` writes it under an `if (conversation)` guard that was a no-op
 * back then — so staff/team analytics, which reach Conversation *through* that map,
 * would otherwise never see these contacts. `WaInboxAssign` is current-state-only (no
 * timestamps; revocations are hard deletes), so "who is assigned" is recoverable but
 * "when, and by whom" is not: `lastAssignedAt` is synthesized from the conversation's
 * own `createdAt` (it must be non-null or the analytics `lastAssignedAt <= ...` guards
 * silently drop the row), `lastAssignedBy` is left null, `actionHistory` records the
 * backfill.
 *
 * Not reconstructable, and left null: `closedBy`, `closeReason`, `resolvedAt`,
 * `reopenCount`. `firstRespondedAt` is stamped with wall-clock `new Date()` by the live
 * path, never with message time, so it is derived from the first agent message — the
 * same fallback the analytics CTEs already use.
 *
 * INTERNAL (private note) messages are linked but excluded from `messageCount` and the
 * last-message timestamps, matching `addNewWaMessage`.
 */
/**
 * The population that still needs a conversation: in the inbox, has an unthreaded
 * message, has no thread yet. Shared verbatim by the synchronous HTTP path and the
 * BullMQ backfill worker (see update.backfill.queue.ts) so both scan for the exact
 * same rows.
 */
export const backfillMissingConversationWhere: Prisma.ContactWhereInput = {
  // Has at least one message that was never threaded.
  WaMessage: { some: { conversationId: null } },
  // Has no conversation at all — a contact the live code already threads is left alone.
  Conversations: { none: {} },
  // Is actually in the inbox (has sent us something), not an outbound-only recipient.
  lastReceivedMessageTimeStamp: { not: null },
};

/** An orphan message: written before conversations existed, so never threaded. */
const unthreadedMessageWhere: Prisma.WaMessageWhereInput = { conversationId: null };

/** The exact shape `backfillOneContact` needs — one source of truth for the select. */
export const backfillContactSelect = {
  id: true,
  orgId: true,
  waMessageAssignStatus: true,
  WaMessage: {
    where: unthreadedMessageWhere,
    select: {
      id: true,
      createdAt: true,
      waCreatedAt: true,
      sendBy: true,
      sourcePlatform: true,
    },
  },
  waInboxAssign: { select: { assignedUserId: true, teamId: true } },
} satisfies Prisma.ContactSelect;

export type BackfillContact = Prisma.ContactGetPayload<{ select: typeof backfillContactSelect }>;

/**
 * Creates the one missing conversation for a single contact, links its orphan
 * messages, and copies its assignees — the per-contact unit shared by the HTTP
 * backfill and the queue worker. See `backfillConversationsFromMessages` for the
 * full rationale on every derived field.
 *
 * The whole thing runs in one transaction and re-checks `Conversation` existence
 * *inside* it: a contact scanned as "no conversation" can be threaded by live
 * inbound traffic before this runs, and creating a second conversation would
 * double-count the contact in the unfiltered inbox/dashboard counters. If that
 * race lands, we skip (`created: false`) and leave the live row untouched.
 */
export async function backfillOneContact(
  contact: BackfillContact,
): Promise<{ created: boolean; messagesLinked: number; assigneesBackfilled: number }> {
  const messages = contact.WaMessage;
  if (!messages.length) return { created: false, messagesLinked: 0, assigneesBackfilled: 0 };

  const at = (m: (typeof messages)[number]) => m.waCreatedAt ?? m.createdAt;
  const later = (a: Date | null | undefined, b: Date | null | undefined) =>
    a && b ? (a.getTime() >= b.getTime() ? a : b) : (a ?? b ?? null);
  const maxOf = (list: typeof messages) =>
    list.length ? list.map(at).reduce((a, b) => later(a, b)!) : null;
  const minOf = (list: typeof messages) =>
    list.length ? list.map(at).reduce((a, b) => (a.getTime() <= b.getTime() ? a : b)) : null;

  // INTERNAL notes never move the inbox clock or the message counter.
  const counted = messages.filter((m) => m.sourcePlatform !== PlatformType.INTERNAL);
  const agent = counted.filter((m) => m.sendBy);
  const customer = counted.filter((m) => !m.sendBy);

  const firstAt = minOf(messages)!;
  const lastMessageAt = maxOf(counted);
  const lastAgentMessageAt = maxOf(agent);
  const lastCustomerMessageAt = maxOf(customer);
  const firstAgentMessageAt = minOf(agent);

  const messageIds = messages.map((m) => m.id);
  const assignees = contact.waInboxAssign;
  const status = contact.waMessageAssignStatus;
  const terminal = WaMessageClosedStatus.includes(status);

  return await prisma.$transaction(async (tx) => {
    // Race guard: live inbound traffic may have threaded this contact between the
    // scan (which saw `Conversations: none`) and now. Bail rather than duplicate.
    const already = await tx.conversation.count({ where: { contactId: contact.id } });
    if (already > 0) return { created: false, messagesLinked: 0, assigneesBackfilled: 0 };

    const conversation = await tx.conversation.create({
      data: {
        contactId: contact.id,
        // Must be set: `getInboxCountsFromConversations` filters on Conversation.orgId
        // while every analytics query scopes via JOIN Contact. A null here makes the two disagree.
        orgId: contact.orgId,
        status,
        createdAt: firstAt,
        lastMessageAt,
        lastAgentMessageAt,
        lastCustomerMessageAt,
        firstRespondedAt: firstAgentMessageAt,
        firstRespondedByUserAt: firstAgentMessageAt,
        messageCount: counted.length,
        closedAt: terminal ? (lastMessageAt ?? firstAt) : null,
        assignedAt: assignees.length ? firstAt : null,
      },
      select: { id: true },
    });

    const linked = await tx.waMessage.updateMany({
      where: { id: { in: messageIds }, conversationId: null },
      data: { conversationId: conversation.id },
    });

    if (assignees.length) {
      // `WaInboxAssign` has no record of who performed the assignment, so the actor
      // is unrecoverable on both the column and the history entry.
      const unknownActor: string | null = null;
      await tx.conversationAssignedUserTeamMap.createMany({
        data: assignees.map((a) => ({
          conversationId: conversation.id,
          userId: a.assignedUserId,
          teamId: a.teamId,
          // Non-null or the staff/team analytics `lastAssignedAt <= ...` guards drop the row.
          lastAssignedAt: firstAt,
          lastAssignedBy: unknownActor,
          isAssignedByAutomation: false,
          actionHistory: [
            { action: "assigned", date: firstAt, by: unknownActor, source: "backfill" },
          ],
        })),
        skipDuplicates: true,
      });
    }

    return { created: true, messagesLinked: linked.count, assigneesBackfilled: assignees.length };
  });
}

export async function backfillConversationsFromMessages(apply: boolean) {
  const PAGE_SIZE = 200;
  // The server caps every request at `requestTimeout: 30s` (src/index.ts), so a full
  // backfill cannot land in one call. Work for the budget, then report `done: false`
  // and let the caller re-invoke. Re-running is safe: each pass re-queries for work
  // that is still outstanding, and finished contacts no longer match.
  //
  // For the full production backfill prefer the BullMQ worker
  // (POST /update/backfill-conversations/start) — it keeps a forward-only cursor and
  // runs contacts in parallel, so it does not restart the scan from zero on every call
  // the way this endpoint does.
  const TIME_BUDGET_MS = 20_000;
  const startedAt = Date.now();
  const outOfTime = () => apply && Date.now() - startedAt > TIME_BUDGET_MS;

  const stats = {
    applied: apply,
    scannedContacts: 0,
    conversationsCreated: 0,
    messagesLinked: 0,
    assigneesBackfilled: 0,
    done: true,
  };

  let cursor: string | undefined;
  for (;;) {
    if (outOfTime()) {
      stats.done = false;
      return stats;
    }

    const contacts = await prisma.contact.findMany({
      where: backfillMissingConversationWhere,
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: backfillContactSelect,
    });
    if (!contacts.length) break;
    cursor = contacts.at(-1)!.id;
    stats.scannedContacts += contacts.length;

    for (const contact of contacts) {
      if (!contact.WaMessage.length) continue;

      if (!apply) {
        stats.conversationsCreated++;
        stats.messagesLinked += contact.WaMessage.length;
        stats.assigneesBackfilled += contact.waInboxAssign.length;
        continue;
      }

      const result = await backfillOneContact(contact);
      if (result.created) {
        stats.conversationsCreated++;
        stats.messagesLinked += result.messagesLinked;
        stats.assigneesBackfilled += result.assigneesBackfilled;
      }
    }
  }

  return stats;
}

export async function seedInboxStatsAutomation() {
  const orgs = await prisma.org.findMany({ select: { id: true } });
  let successCount = 0;

  for (const org of orgs) {
    try {
      await recalculateInboxStats(org.id);
      successCount++;
    } catch (error) {
      log.error({ err: error }, `Failed to seed InboxStats for org ${org.id}`);
    }
  }

  return { total: orgs.length, seeded: successCount };
}

// ============================================================
// Pipelines
// ============================================================

/**
 * Wipes every pipeline in every org. Built for clearing the boards created while
 * the feature was being tested, before the real seeding runs.
 *
 * Deliberately blunt and deliberately total: there is no per-org filter, because
 * the point is to get back to a clean slate everywhere at once. Everything hanging
 * off a pipeline cascades with it — stages, leads, and with each lead its notes,
 * activity timeline, tasks, assignees and labels, plus the board's labels, lost
 * reasons and team memberships. `Team.defaultPipelineId` is `SetNull`, so teams
 * survive with the pointer cleared; `autoCreateLeads` is cleared alongside it so a
 * team is not left opted into a board that no longer exists.
 *
 * Contacts are untouched. So are lifecycles.
 *
 * Call with `apply: false` first — the counts it returns are what the apply run
 * will destroy.
 */
export async function deleteAllPipelines(apply: boolean) {
  const [pipelines, stages, leads, orgs, teamsPointingAtOne] = await Promise.all([
    prisma.pipeline.count(),
    prisma.pipelineStage.count(),
    prisma.lead.count(),
    prisma.pipeline.groupBy({ by: ["orgId"] }),
    prisma.team.count({ where: { defaultPipelineId: { not: null } } }),
  ]);

  const stats = {
    applied: apply,
    pipelines,
    stages,
    leads,
    orgs: orgs.length,
    teamsPointingAtOne,
  };

  if (!apply || !pipelines) return stats;

  await prisma.$transaction(async (tx) => {
    // Cleared before the delete rather than left to `SetNull`, so no team is left
    // opted into auto-creating leads on a board that has gone.
    await tx.team.updateMany({
      where: { defaultPipelineId: { not: null } },
      data: { defaultPipelineId: null, autoCreateLeads: false },
    });
    await tx.pipeline.deleteMany({});
  });

  log.warn({ ...stats }, "Deleted every pipeline in every org");
  return stats;
}

/** The board this seeder creates. One per org; `@@unique([orgId, name])` guards it. */
export const SEEDED_PIPELINE_NAME = "Default Pipeline";

/**
 * Column colours, used when a lifecycle has none worth keeping. The org's own
 * lifecycle colours are preferred, but they default to white, and a white dot on
 * a white board is not a colour — so those fall through to here.
 *
 * Mirrors `STAGE_COLOR_CHOICES` in the UI so a seeded board can be recoloured
 * from the settings swatches without introducing a value the picker cannot show.
 */
const SEED_STAGE_COLORS = [
  "#16A34A",
  "#3FA46A",
  "#0E7490",
  "#4C7FBC",
  "#7A2FA8",
  "#D97A0F",
  "#F8951D",
  "#FFB638",
] as const;

const WON_COLOR = "#1C518E";
const LOST_COLOR = "#666864";

/** Board order follows the design's bands: open work, then won, then lost. */
const CATEGORY_RANK = { active: 0, won: 1, lost: 2 } as const;
const CATEGORY_STATUS = { active: "OPEN", won: "WON", lost: "LOST" } as const;

/** White and near-white read as "never picked a colour", not as a choice. */
function usableColor(color: string | null) {
  if (!color) return null;
  const hex = color.trim().toLowerCase();
  return hex === "#fff" || hex === "#ffffff" ? null : color;
}

interface SeedLifecycle {
  name: string;
  ordering: number;
  color: string | null;
  category: keyof typeof CATEGORY_RANK;
}

interface SeedStage {
  name: string;
  order: number;
  color: string;
  probability: number;
  rottingDays: number;
  status: (typeof CATEGORY_STATUS)[keyof typeof CATEGORY_STATUS];
}

/**
 * Turns an org's lifecycle stages into board columns of the same names.
 *
 * Three things it has to fix rather than copy:
 *
 * - **Order.** `Lifecycle.ordering` is only meaningful within a category — real
 *   data has two stages both at `ordering: 0` — so ordering it directly would
 *   interleave Lost among the open columns and leave ties resolved at random.
 *   Columns are sorted by category first and re-indexed from zero.
 * - **Colour.** Lifecycle colours default to `#ffffff`, which is invisible as a
 *   column marker, so those fall back to the palette above.
 * - **Closing columns.** A board with no Won or Lost column cannot close a lead
 *   at all — `closeLead` looks for the first column of that status and finds
 *   none. An org whose lifecycles produce neither gets one appended.
 */
export function stagesFromLifecycles(lifecycles: SeedLifecycle[]) {
  const sorted = [...lifecycles].sort(
    (a, b) =>
      CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category] ||
      a.ordering - b.ordering ||
      a.name.localeCompare(b.name),
  );

  const openCount = sorted.filter((life) => life.category === "active").length;
  let openSeen = 0;

  const stages: SeedStage[] = sorted.map((life, index) => {
    const status = CATEGORY_STATUS[life.category];
    // Open columns get an even ramp across the funnel — one open column sits at
    // 50%, three at 25/50/75 — rather than every column claiming the same odds.
    const probability =
      status === "WON"
        ? 100
        : status === "LOST"
          ? 0
          : Math.round((++openSeen / (openCount + 1)) * 100);

    return {
      name: life.name,
      order: index,
      color:
        usableColor(life.color) ??
        (status === "WON"
          ? WON_COLOR
          : status === "LOST"
            ? LOST_COLOR
            : SEED_STAGE_COLORS[index % SEED_STAGE_COLORS.length]),
      probability,
      // Only open work can rot; a closed lead is not waiting on anyone.
      rottingDays: status === "OPEN" ? 5 : 0,
      status,
    };
  });

  const added = { won: false, lost: false };
  if (!stages.some((stage) => stage.status === "WON")) {
    stages.push({
      name: "Won",
      order: stages.length,
      color: WON_COLOR,
      probability: 100,
      rottingDays: 0,
      status: "WON",
    });
    added.won = true;
  }
  if (!stages.some((stage) => stage.status === "LOST")) {
    stages.push({
      name: "Lost",
      order: stages.length,
      color: LOST_COLOR,
      probability: 0,
      rottingDays: 0,
      status: "LOST",
    });
    added.lost = true;
  }

  return { stages, added };
}

/**
 * Gives every org that has none a "Default Pipeline", with one column per
 * lifecycle stage that org owns — same names, so contacts can later be placed on
 * the column matching the lifecycle they already sit in.
 *
 * Deliberately per-org rather than one shared board: `Lifecycle.orgId` scopes the
 * lookup, so each org's columns come from its own vocabulary. An org with no
 * lifecycles is skipped rather than given a columnless board. An org with no
 * teams is skipped too, because pipeline access *is* team membership — a board
 * with no team attached is one nobody can open.
 *
 * Unlike the version this replaces, it does **not** point teams at the board with
 * auto-add on. That feature was removed with the lifecycle coupling; setting
 * `defaultPipelineId`/`autoCreateLeads` here would only write columns nothing
 * reads.
 *
 * Run with `apply: false` first — the counts come back identical, nothing is
 * written.
 */
export async function seedPipelinesForOrgs(apply: boolean, orgId?: string) {
  const orgs = await prisma.org.findMany({
    where: orgId ? { id: orgId } : undefined,
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  const stats = {
    applied: apply,
    orgsScanned: orgs.length,
    pipelinesCreated: 0,
    stagesCreated: 0,
    wonColumnsAdded: 0,
    lostColumnsAdded: 0,
    skippedHasPipeline: 0,
    skippedNoLifecycles: 0,
    skippedNoTeams: 0,
  };

  for (const org of orgs) {
    if (await prisma.pipeline.count({ where: { orgId: org.id } })) {
      stats.skippedHasPipeline++;
      continue;
    }

    const lifecycles = await prisma.lifecycle.findMany({
      where: { orgId: org.id },
      orderBy: { ordering: "asc" },
      select: { name: true, ordering: true, color: true, category: true },
    });
    if (!lifecycles.length) {
      stats.skippedNoLifecycles++;
      continue;
    }

    const teams = await prisma.team.findMany({ where: { orgId: org.id }, select: { id: true } });
    if (!teams.length) {
      stats.skippedNoTeams++;
      continue;
    }

    const { stages, added } = stagesFromLifecycles(lifecycles);

    stats.pipelinesCreated++;
    stats.stagesCreated += stages.length;
    if (added.won) stats.wonColumnsAdded++;
    if (added.lost) stats.lostColumnsAdded++;
    if (!apply) continue;

    const pipeline = await prisma.pipeline.create({
      data: {
        name: SEEDED_PIPELINE_NAME,
        orgId: org.id,
        order: 0,
        // Every team in the org, so whoever is already working gets the board.
        teams: {
          createMany: { skipDuplicates: true, data: teams.map(({ id }) => ({ teamId: id })) },
        },
        stages: { create: stages },
        lostReasons: { create: DEFAULT_LOST_REASONS.map((label, order) => ({ label, order })) },
      },
      select: { id: true },
    });

    log.info(
      { orgId: org.id, pipelineId: pipeline.id, stages: stages.length, teams: teams.length },
      "Seeded a pipeline for org",
    );
  }

  return stats;
}

/**
 * How long a single call spends placing leads before it hands back with
 * `done: false`. The API drops a request at 30s, so this leaves room for the
 * final batch to finish and the response to serialise.
 */
const PLACE_LEADS_BUDGET_MS = 20_000;
const PLACE_LEADS_BATCH = 500;

/** Contact channels we can name; anything else is a lead with no channel. */
const CHANNEL_BY_SOURCE: Record<string, "WHATSAPP" | "INSTAGRAM" | "MESSENGER"> = {
  whatsapp: "WHATSAPP",
  instagram: "INSTAGRAM",
  messenger: "MESSENGER",
};

/** What the backfill needs off a contact to decide where its lead goes. */
export interface PlaceableContact {
  id: string;
  orgId: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  createdAt: Date;
  lastReceivedMessageTimeStamp: Date | null;
  lastSentMessageTimeStamp: Date | null;
  Lifecycle: { name: string } | null;
}

/** One org's board, reduced to what matching needs. */
export interface PlaceableBoard {
  id: string;
  stages: { id: string; name: string; status: "OPEN" | "WON" | "LOST" }[];
}

/**
 * Decides which column a contact's lead belongs on, or why it gets none.
 *
 * Matching is by **name**, trimmed and case-insensitive, because
 * `seedPipelinesForOrgs` copies lifecycle names verbatim. A lifecycle renamed
 * after seeding no longer matches, and that contact is reported as unmatched
 * rather than dropped on an arbitrary column.
 *
 * The board passed in is the one belonging to the contact's own org — the caller
 * looks it up by `contact.orgId`, so a contact can only ever land on its own
 * org's columns.
 */
export function leadRowForContact(
  contact: PlaceableContact,
  board: PlaceableBoard | undefined,
): Prisma.LeadCreateManyInput | "no-pipeline" | "unmatched" {
  if (!board) return "no-pipeline";

  const wanted = contact.Lifecycle?.name.trim().toLowerCase();
  const stage = board.stages.find((candidate) => candidate.name.trim().toLowerCase() === wanted);
  if (!stage) return "unmatched";

  const known = CHANNEL_BY_SOURCE[contact.source?.trim().toLowerCase() ?? ""];
  const channel: LeadChannel = known ?? "NONE";
  // The board measures rotting from `lastActivityAt`, so a lead that really has
  // sat untouched for months should read that way rather than looking new.
  const lastTouch =
    contact.lastReceivedMessageTimeStamp ?? contact.lastSentMessageTimeStamp ?? contact.createdAt;

  return {
    pipelineId: board.id,
    stageId: stage.id,
    contactId: contact.id,
    name: contact.name ?? "Unnamed contact",
    phone: contact.phone,
    email: contact.email,
    // The contact's channel is the closest thing to where the lead came from;
    // MANUAL would claim someone typed it in, which nobody did.
    source: known ?? "MANUAL",
    channel,
    // Nobody opened this by hand and no team has claimed it yet.
    teamId: null,
    ownerId: null,
    status: stage.status,
    closedAt: stage.status === "OPEN" ? null : lastTouch,
    stageEnteredAt: lastTouch,
    lastActivityAt: lastTouch,
  };
}

/**
 * Puts every classified contact on the board column matching the lifecycle it
 * already sits in — the second half of the migration, after
 * {@link seedPipelinesForOrgs} has created columns of the same names.
 *
 * Matching is **by name**, case-insensitively, because the seeder copies
 * lifecycle names verbatim. A contact whose lifecycle has no column of that name
 * — its lifecycle was renamed after seeding, say — is counted as unmatched and
 * left alone rather than dropped somewhere arbitrary.
 *
 * Only contacts with a lifecycle get a lead. That is the whole rule: a lead is
 * what holds a stage, so a contact with no lifecycle stays off the board, exactly
 * as it has no lifecycle today.
 *
 * **Resumable.** One call works for {@link PLACE_LEADS_BUDGET_MS} and returns
 * `done: false` if contacts remain; the caller keeps calling until it is true.
 * Re-running is safe: the `(contactId, pipelineId)` unique index means an
 * already-placed contact is skipped rather than duplicated.
 *
 * Timestamps come from the contact, not from now, so a lead that has genuinely
 * been sitting untouched for months reads as stalled on the board rather than
 * looking freshly worked.
 */
export async function placeLeadsFromLifecycles(apply: boolean) {
  const started = Date.now();
  const stats = {
    applied: apply,
    done: false,
    scanned: 0,
    placed: 0,
    alreadyOnBoard: 0,
    unmatchedLifecycle: 0,
    skippedNoPipeline: 0,
  };

  // One board per org, with its columns, looked up once rather than per contact.
  const pipelines = await prisma.pipeline.findMany({
    orderBy: { order: "asc" },
    select: { id: true, orgId: true, stages: { select: { id: true, name: true, status: true } } },
  });
  const boardByOrg = new Map<string, (typeof pipelines)[number]>();
  for (const pipeline of pipelines) {
    if (!boardByOrg.has(pipeline.orgId)) boardByOrg.set(pipeline.orgId, pipeline);
  }

  let cursor: string | undefined;

  for (;;) {
    const contacts = await prisma.contact.findMany({
      where: { lifecycleId: { not: null } },
      orderBy: { id: "asc" },
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      take: PLACE_LEADS_BATCH,
      select: {
        id: true,
        orgId: true,
        name: true,
        phone: true,
        email: true,
        source: true,
        createdAt: true,
        lastReceivedMessageTimeStamp: true,
        lastSentMessageTimeStamp: true,
        Lifecycle: { select: { name: true } },
      },
    });
    if (!contacts.length) {
      stats.done = true;
      break;
    }
    cursor = contacts.at(-1)?.id;
    stats.scanned += contacts.length;

    const rows: Prisma.LeadCreateManyInput[] = [];
    const contactIds: string[] = [];

    for (const contact of contacts) {
      const row = leadRowForContact(contact, boardByOrg.get(contact.orgId));
      if (typeof row === "string") {
        if (row === "no-pipeline") stats.skippedNoPipeline++;
        else stats.unmatchedLifecycle++;
        continue;
      }
      contactIds.push(contact.id);
      rows.push(row);
    }

    if (!apply) {
      // Nothing is written, so nothing can be "already on the board" — a dry run
      // reports what a first apply would place.
      const existing = contactIds.length
        ? await prisma.lead.count({ where: { contactId: { in: contactIds } } })
        : 0;
      stats.alreadyOnBoard += existing;
      stats.placed += rows.length - existing;
    } else if (rows.length) {
      // `skipDuplicates` leans on the (contactId, pipelineId) unique index, so a
      // contact already on the board is passed over rather than duplicated.
      const created = await prisma.lead.createManyAndReturn({
        data: rows,
        skipDuplicates: true,
        select: { id: true },
      });
      stats.placed += created.length;
      stats.alreadyOnBoard += rows.length - created.length;

      if (created.length) {
        await prisma.leadActivity.createMany({
          data: created.map((lead) => ({
            leadId: lead.id,
            userId: null,
            type: "CREATED",
            details: { sourceLabel: "MIGRATION", automated: true },
          })),
        });
      }
    }

    if (contacts.length < PLACE_LEADS_BATCH) {
      stats.done = true;
      break;
    }
    if (Date.now() - started > PLACE_LEADS_BUDGET_MS) break;
  }

  return stats;
}

/**
 * A resolved column for one lifecycle, keyed by lifecycle id.
 *
 * Built per org by matching lifecycle names against board column names, which is
 * sound because `seedPipelinesForOrgs` copies those names verbatim.
 */
export type StageLookup = Map<string, { stageId: string; stageName: string }>;

/**
 * Pairs an org's lifecycles with its board columns by name.
 *
 * Also keyed by lower-cased name, so a mapping whose `lifecycleId` points at a
 * lifecycle that has since been deleted can still be resolved from the name it
 * stored alongside it — dangling ids are common here, because these mappings
 * live in JSON that no foreign key protects.
 */
export function buildStageLookup(
  lifecycles: { id: string; name: string }[],
  stages: { id: string; name: string }[],
) {
  const stageByName = new Map(stages.map((stage) => [stage.name.trim().toLowerCase(), stage]));

  const byId: StageLookup = new Map();
  const byName: StageLookup = new Map();

  for (const lifecycle of lifecycles) {
    const key = lifecycle.name.trim().toLowerCase();
    const stage = stageByName.get(key);
    if (!stage) continue;
    const hit = { stageId: stage.id, stageName: stage.name };
    byId.set(lifecycle.id, hit);
    byName.set(key, hit);
  }

  return { byId, byName };
}

/** One stored reference resolved, or the reason it could not be. */
export function resolveStage(
  lookup: { byId: StageLookup; byName: StageLookup },
  lifecycleId?: string | null,
  lifecycleName?: string | null,
) {
  if (lifecycleId) {
    const hit = lookup.byId.get(lifecycleId);
    if (hit) return hit;
  }
  // The id is dangling — the lifecycle was deleted after the mapping was saved.
  // The name stored next to it is the only thing left to go on.
  if (lifecycleName) {
    const hit = lookup.byName.get(lifecycleName.trim().toLowerCase());
    if (hit) return hit;
  }
  return null;
}

interface StoredMapping {
  lifecycleId?: string;
  lifecycleName?: string;
  stageId?: string;
  stageName?: string;
  [key: string]: unknown;
}

/**
 * Writes a `stageId` next to every stored `lifecycleId` — in the Zoho mapping
 * tables and in automation-rule actions.
 *
 * **Additive on purpose, and this is a deliberate exception to "replace, don't
 * dual-write".** That rule is about code surfaces, where the switch happens in
 * one change. Here the data has to move *before* the code that reads it does
 * (plan items 2.5, 2.8, 2.9), so for the window in between both keys must be
 * present or live Zoho syncing and live rules break the moment this runs. The
 * lifecycle keys are stripped in a later pass, once nothing reads them.
 *
 * What it cannot migrate, and why:
 *
 * - **`RuleCondition` (`CONTACT_LIFECYCLE`)** stores the lifecycle id in a plain
 *   `String` column with nowhere to put a second value, and the condition's
 *   `field` has to change to `CONTACT_STAGE` at the same time. That is a code
 *   change, not a data one. The count is reported so the work is visible.
 * - **Rules triggered by `LIFECYCLE_UPDATED`** need a new `TriggerEvent` enum
 *   value before they can move. Also reported, not touched.
 */
export async function mapLifecycleRefsToStages(apply: boolean) {
  const stats = {
    applied: apply,
    orgsWithBoard: 0,
    zohoIntegrations: 0,
    biginMappings: 0,
    biginMapped: 0,
    crmMappings: 0,
    crmMapped: 0,
    ruleActions: 0,
    ruleActionsMapped: 0,
    /** Rows that already name a live column — nothing to do, not a problem. */
    alreadyMapped: 0,
    unresolved: 0,
    /** Reported only — these need a code change, not a data one. */
    ruleConditionsNeedingWork: 0,
    lifecycleTriggeredRules: 0,
  };

  const pipelines = await prisma.pipeline.findMany({
    orderBy: { order: "asc" },
    select: { orgId: true, stages: { select: { id: true, name: true } } },
  });

  const lookupByOrg = new Map<string, ReturnType<typeof buildStageLookup>>();
  for (const pipeline of pipelines) {
    if (lookupByOrg.has(pipeline.orgId)) continue;
    const lifecycles = await prisma.lifecycle.findMany({
      where: { orgId: pipeline.orgId },
      select: { id: true, name: true },
    });
    lookupByOrg.set(pipeline.orgId, buildStageLookup(lifecycles, pipeline.stages));
  }
  stats.orgsWithBoard = lookupByOrg.size;

  /**
   * Stamps `stageId`/`stageName` onto one stored mapping row.
   *
   * A row configured through the current UI already names a column and carries no
   * lifecycle at all. That is finished work, not a failure — counting it as
   * unresolved made a healthy integration look broken and buried the rows that
   * genuinely could not be matched.
   */
  const stamp = (row: StoredMapping, lookup: ReturnType<typeof buildStageLookup>) => {
    if (row.stageId) {
      stats.alreadyMapped++;
      return false;
    }

    const hit = resolveStage(lookup, row.lifecycleId, row.lifecycleName);
    if (!hit) {
      stats.unresolved++;
      return false;
    }
    row.stageId = hit.stageId;
    row.stageName = hit.stageName;
    return true;
  };

  // ---- Zoho -------------------------------------------------------------
  const integrations = await prisma.integration.findMany({
    where: { name: { contains: "zoho", mode: "insensitive" }, orgId: { not: null } },
    select: { id: true, orgId: true, credential: true },
  });

  for (const integration of integrations) {
    const lookup = integration.orgId ? lookupByOrg.get(integration.orgId) : undefined;
    if (!lookup) continue;
    stats.zohoIntegrations++;

    // Cloned so a dry run cannot mutate anything that later gets written.
    const credential = structuredClone(integration.credential) as Record<string, unknown>;
    let touched = false;

    const bigin = (credential.bigin as { pipeline?: { lifecycleStageMappings?: StoredMapping[] } })
      ?.pipeline?.lifecycleStageMappings;
    if (Array.isArray(bigin)) {
      stats.biginMappings += bigin.length;
      for (const row of bigin) {
        if (stamp(row, lookup)) {
          stats.biginMapped++;
          touched = true;
        }
      }
    }

    const crm = (credential.crm as { leadLifecycleMappings?: StoredMapping[] })
      ?.leadLifecycleMappings;
    if (Array.isArray(crm)) {
      stats.crmMappings += crm.length;
      for (const row of crm) {
        if (stamp(row, lookup)) {
          stats.crmMapped++;
          touched = true;
        }
      }
    }

    if (apply && touched) {
      await prisma.integration.update({
        where: { id: integration.id },
        data: { credential: credential as Prisma.InputJsonValue },
      });
    }
  }

  // ---- Automation rule actions ------------------------------------------
  const actions = await prisma.ruleAction.findMany({
    where: { type: "ASSIGN_LIFECYCLE" },
    select: { id: true, value: true, rule: { select: { orgId: true } } },
  });

  for (const action of actions) {
    const lookup = lookupByOrg.get(action.rule.orgId);
    if (!lookup) continue;
    stats.ruleActions++;

    // The value is either a bare lifecycle id from before the pipeline option
    // existed, or an object. Both become an object so there is room for the
    // stage id; `readAssignLifecycleValue` already reads either shape.
    const raw = action.value;
    const row: StoredMapping =
      typeof raw === "string" ? { lifecycleId: raw } : { ...(raw as Record<string, unknown>) };

    if (!stamp(row, lookup)) continue;
    stats.ruleActionsMapped++;

    if (apply) {
      await prisma.ruleAction.update({
        where: { id: action.id },
        data: { value: row as Prisma.InputJsonValue },
      });
    }
  }

  // ---- Reported only -----------------------------------------------------
  stats.ruleConditionsNeedingWork = await prisma.ruleCondition.count({
    where: { field: "CONTACT_LIFECYCLE" },
  });
  stats.lifecycleTriggeredRules = await prisma.rule.count({
    where: { triggerEvent: "LIFECYCLE_UPDATED" },
  });

  return stats;
}

/**
 * Switches rules already written against **Assign Lifecycle** over to
 * **Assign Stage**, so they move the contact's lead instead of setting a
 * lifecycle.
 *
 * **This changes what those rules do, and it is not a reversible click.** The
 * old action wrote the contact record and fanned out to Zoho, Zapier and the
 * Meta Conversions API; the new one writes only the lead. Until those surfaces
 * move (plan items 2.7–2.10), a converted rule stops updating Zoho. The
 * `lifecycleId` it came from is kept in the stored value so a rule can be put
 * back by hand, but nothing here undoes it in bulk.
 *
 * An action whose lifecycle has no column of that name is left as it is and
 * reported. Converting it would mean guessing a column, and a rule that fires on
 * every inbound message is the worst place to guess.
 */
export async function convertAssignLifecycleActions(apply: boolean) {
  const stats = {
    applied: apply,
    actions: 0,
    converted: 0,
    unresolved: 0,
    skippedNoBoard: 0,
    /** Rule names touched, so the operator can go and look at them. */
    rules: [] as string[],
  };

  const actions = await prisma.ruleAction.findMany({
    where: { type: "ASSIGN_LIFECYCLE" },
    select: { id: true, value: true, rule: { select: { name: true, orgId: true } } },
  });
  if (!actions.length) return stats;
  stats.actions = actions.length;

  const lookups = new Map<string, ReturnType<typeof buildStageLookup> | null>();
  const lookupFor = async (orgId: string) => {
    const cached = lookups.get(orgId);
    if (cached !== undefined) return cached;

    const board = await prisma.pipeline.findFirst({
      where: { orgId },
      orderBy: { order: "asc" },
      select: { stages: { select: { id: true, name: true } } },
    });
    if (!board) {
      lookups.set(orgId, null);
      return null;
    }
    const lifecycles = await prisma.lifecycle.findMany({
      where: { orgId },
      select: { id: true, name: true },
    });
    const built = buildStageLookup(lifecycles, board.stages);
    lookups.set(orgId, built);
    return built;
  };

  for (const action of actions) {
    const lookup = await lookupFor(action.rule.orgId);
    if (!lookup) {
      stats.skippedNoBoard++;
      continue;
    }

    const stored =
      typeof action.value === "string"
        ? { lifecycleId: action.value }
        : ((action.value ?? {}) as {
            lifecycleId?: string;
            lifecycleName?: string;
            stageId?: string;
            stageName?: string;
          });

    // The mapping card may already have resolved this one; trust it, and fall
    // back to resolving from the lifecycle if it has not run.
    const hit = stored.stageId
      ? { stageId: stored.stageId, stageName: stored.stageName ?? "" }
      : resolveStage(lookup, stored.lifecycleId, stored.lifecycleName);

    if (!hit) {
      stats.unresolved++;
      continue;
    }

    stats.converted++;
    if (!stats.rules.includes(action.rule.name)) stats.rules.push(action.rule.name);
    if (!apply) continue;

    await prisma.ruleAction.update({
      where: { id: action.id },
      data: {
        type: "ASSIGN_STAGE",
        // The lifecycle it came from is kept so the change can be traced and a
        // rule put back by hand; `readAssignStageValue` reads the stage id off
        // either this shape or a bare string.
        value: {
          stageId: hit.stageId,
          stageName: hit.stageName,
          ...(stored.lifecycleId && { lifecycleId: stored.lifecycleId }),
        } as Prisma.InputJsonValue,
      },
    });
  }

  if (apply && stats.converted) {
    log.warn(
      { converted: stats.converted, rules: stats.rules },
      "Converted Assign Lifecycle rule actions to Assign Stage",
    );
  }

  return stats;
}
