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
  const waAccountSettings = await prisma.waAccountSettings.findMany({});

  for (const setting of waAccountSettings) {
    let newContactTags = (setting.contactTags as any).map((tag) => ({
      name: tag,
      color: "#3B82F6",
    }));
    let newContactGroupTags = (setting.contactGroupTags as any).map((tag) => ({
      name: tag,
      color: "#3bf68c",
    }));
    await prisma.waAccountSettings.update({
      where: {
        orgId: setting.orgId,
      },
      data: {
        contactTags: newContactTags,
        contactGroupTags: newContactGroupTags,
      },
    });
  }

  log.info("Completed updating all contacts' tag format");
}
