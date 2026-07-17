import dayjs from "dayjs";
import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { FreePlanSubscriptionFeatures } from "../subscription/subscription.data.js";
import { subscriptionGates } from "../../utils/canAccess.js";
import { TeamFeature } from "../../../generated/prisma/client.js";
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
    const res = await prisma.$queryRaw`SELECT 
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
  const subscriptions: any = await prisma.subscription.findMany();

  for await (const subscription of subscriptions) {
    const features = {
      ...subscription?.features,
      whatsapp: {
        ...subscription?.features?.whatsapp,
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

  function getNewFeatures(features) {
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
          ...features.whatsapp.template,
          carouselTemplate: {
            active: false,
            count: { max: 1 },
          },
        },
        automation: {
          ...features.whatsapp.automation,
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
      const gated = getNestedProperty(subFeatures, gate);
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

export async function recalculateInboxStats(orgId: string) {
  const stats: any[] = await prisma.$queryRaw`WITH message_flags AS (
    SELECT
      c.id AS contact_id,
      c."waMessageAssignStatus",
      c."blockedOnWhatsApp",
      c."lastReceivedMessageTimeStamp" IS NOT NULL AS has_receive
    FROM "Contact" c
    WHERE c."orgId" = ${orgId}::uuid
  )
  SELECT
    COUNT(*) FILTER (WHERE mf."waMessageAssignStatus" = 'UNASSIGNED' AND mf.has_receive AND NOT mf."blockedOnWhatsApp")::INTEGER AS unassigned_count,
    COUNT(*) FILTER (WHERE mf."waMessageAssignStatus" = 'ASSIGNED' AND mf.has_receive AND NOT mf."blockedOnWhatsApp")::INTEGER AS assigned_count,
    COUNT(*) FILTER (WHERE mf."waMessageAssignStatus" = 'CLOSED' AND mf.has_receive AND NOT mf."blockedOnWhatsApp")::INTEGER AS closed_count,
    COUNT(*) FILTER (WHERE mf."waMessageAssignStatus" = 'SPAM' AND mf.has_receive AND NOT mf."blockedOnWhatsApp")::INTEGER AS spam_count,
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
