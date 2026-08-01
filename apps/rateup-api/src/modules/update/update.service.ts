import dayjs from "dayjs";
import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { FreePlanSubscriptionFeatures } from "../subscription/subscription.data.js";
import { subscriptionGates } from "../../utils/canAccess.js";
import { TeamFeature, PlatformType, Prisma } from "../../../generated/prisma/client.js";
import { getNestedProperty } from "../../utils/misc/obj.utils.js";
import type { InboxStatus } from "../../types/enums.js";
import { WaMessageClosedStatus } from "../whatsapp/constants.js";

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
