import dayjs from "dayjs";
import prisma from "../../utils/prisma";
import { log } from "../../utils/logger";

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
