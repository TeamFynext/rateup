import dayjs from "dayjs";
import prisma from "../../../utils/prisma";

export async function updateUsageStatsReset() {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      basePlan: {
        paymentPlan: null,
      },
    },
  });

  for (const subscription of subscriptions) {
    const difference =
      dayjs().diff(
        dayjs(subscription.renewedAt ?? subscription.createdAt),
        "D",
      ) % 30;
    const lastMonthlyResettedDate = dayjs().subtract(difference, "D").toDate();

    await prisma.usageStats.update({
      where: {
        orgId: subscription.orgId,
      },
      data: {
        lastMonthlyResettedDate,
      },
    });
  }
}
