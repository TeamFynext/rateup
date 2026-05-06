import dayjs from "dayjs";
import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { subscriptionGates } from "../../utils/canAccess.js";
import { TeamFeature } from "../../../generated/prisma/client.js";
import { getNestedProperty } from "../../utils/misc/obj.utils.js";

export async function updateUsageStatsTemplateMessageCount() {
  const subscriptions = await prisma.subscription.findMany();
  for (const subscription of subscriptions) {
    const thisYearCycleStart = dayjs(
      subscription.renewedAt ?? subscription.createdAt,
    ).year(dayjs().year());
    const lastAnnualCycleStart = thisYearCycleStart.isAfter(dayjs())
      ? thisYearCycleStart.subtract(1, "year").toDate()
      : thisYearCycleStart.toDate();
    const monthlyDifference =
      dayjs()
        .startOf("day")
        .diff(
          dayjs(subscription.renewedAt ?? subscription.createdAt).startOf(
            "day",
          ),
          "day",
        ) % 30;
    const lastMonthlyCycleStart = dayjs()
      .subtract(monthlyDifference, "day")
      .toDate();
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
    log.info(
      `Updated subscription automation for orgId: ${updatedSubscription.orgId}`,
    );
  }
}

//updating automation trigger and automation for new plans
export async function updateRateupPlanFeature() {
  const rateupPlans = await prisma.rateupPlan.findMany();
  for (const plan of rateupPlans) {
    const feature = plan.features as SubscriptionFeatures;
    if (
      feature.whatsapp.automation &&
      feature.whatsapp.automation.automationTrigger
    ) {
      continue;
    }
    const newFeature = {
      ...feature,
      whatsapp: {
        ...feature.whatsapp,
        automation: {
          active: true,
          count: {
            max: 1,
          },
          automationTrigger: {
            active: true,
            count: {
              max: 1000,
            },
          },
        },
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
        automation: {
          ...features.whatsapp.automation,
          automationTrigger: {
            active: true,
            count: {
              max: 1000,
            },
          },
        },
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

  const results: { orgId: string; teamsUpdated: number; features: string[] }[] =
    [];

  for (const sub of subscriptions) {
    const subFeatures = sub.features as SubscriptionFeatures;

    // Determine which TeamFeatures are enabled by this subscription
    const activeFeatures = (
      Object.keys(subscriptionGates) as TeamFeature[]
    ).filter((feature) => {
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
      const toDelete = existing
        .filter((r) => !desiredSet.has(r.feature))
        .map((r) => r.id);
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
