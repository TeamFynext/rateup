import prisma from "../../../utils/prisma";
import { FreePlanSubscriptionFeatures } from "../../subscription/subscription.data";

export async function updateFreePlanSubscriptionFeatures() {
  const res = await prisma.$transaction(async (prisma) => {
    const freePlan = await prisma.rateupPlan.findFirst({
      where: {
        name: "FREE PLAN",
      },
    });

    const res = await prisma.rateupPlan.update({
      where: {
        id: freePlan.id,
      },
      data: {
        features: FreePlanSubscriptionFeatures,
        description: [
          "2 Surveys",
          "100 Response/Month",
          "100 Messages/Month",
          "1 Team",
          "1 User",
        ],
      },
    });

    await prisma.subscription.updateMany({
      where: {
        basePlanId: res.id,
      },
      data: {
        features: res.features,
      },
    });
  });
}
