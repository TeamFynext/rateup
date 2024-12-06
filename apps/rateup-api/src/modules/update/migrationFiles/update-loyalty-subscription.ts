import prisma from "../../../utils/prisma";

export async function updateLoyaltySubscription() {
  const subscriptions = await prisma.subscription.findMany();

  for (const sub of subscriptions) {
    const existingFeatures = sub?.features as unknown as SubscriptionFeatures;
    const newFeature = {
      ...existingFeatures,
      loyalty: {
        action: { count: { max: 0 }, active: false },
        reward: { count: { max: 0 }, active: false },
        customer: { count: { max: 0 }, active: false },
        active: false,
      },
    };
    await prisma.subscription.update({
      where: {
        orgId: sub.orgId,
      },
      data: {
        features: newFeature,
      },
    });
  }

  const rateupPlans = await prisma.rateupPlan.findMany();

  for (const plan of rateupPlans) {
    const existingFeatures = plan?.features as unknown as SubscriptionFeatures;
    const newFeature = {
      ...existingFeatures,
      loyalty: {
        action: { count: { max: 0 }, active: false },
        reward: { count: { max: 0 }, active: false },
        customer: { count: { max: 0 }, active: false },
        active: false,
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
}
