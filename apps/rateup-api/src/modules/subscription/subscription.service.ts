import dayjs from "dayjs";
import prisma from "../../utils/prisma";
import { FreePlanSubscriptionFeatures } from "./subscription.data";
import { updateSubscriptionInput } from "./subscription.schema";
import { PaymentPlanType } from "@prisma/client";
import { createStats } from "../stats/stats.service";
import { SubscriptionFeaturePathName } from "../../types/enums";
import { getNestedProperty } from "../../utils/misc/obj.utils";

export async function createFreePlanSubscription(
  orgId: string,
  pClient = prisma,
) {
  // Check if the FREE PLAN plan exists  -- was earlier RATEUP TRIAL
  const rateupFreePlan = await pClient.rateupPlan.findFirst({
    where: {
      name: "FREE PLAN",
    },
  });

  let planId;
  let freePlanDescription = [
    "1 Survey",
    "50 Response/Month",
    "1 Menu",
    "50 Views/Month",
    "1 Team",
    "1 User",
  ];

  if (rateupFreePlan) {
    planId = rateupFreePlan.id;
  } else {
    const newRateupFreePlan = await pClient.rateupPlan.create({
      data: {
        name: "FREE PLAN",
        displayName: "FREE PLAN",
        planType: PaymentPlanType.BASE,
        description: freePlanDescription,
      },
    });
    planId = newRateupFreePlan.id;
  }

  await pClient.subscription.create({
    data: {
      orgId,
      basePlanId: planId,
      features: FreePlanSubscriptionFeatures as any,
      expiresAt: dayjs().add(100, "day").toDate(),
    },
  });
}

export async function getSubscription(orgId: string) {
  let sub = (await prisma.subscription.findFirst({
    where: {
      orgId,
    },
    select: {
      orgId: true,
      features: true,
      renewedAt: true,
      expiresAt: true,
      createdAt: true,
      basePlan: {
        select: {
          id: true,
          name: true,
          paymentPlan: {
            select: {
              period: true,
              amount: true,
            },
          },
          stripeProduct: {
            select: {
              interval: true,
              amount: true,
            },
          },
          displayName: true,
        },
      },
      subscriptionRef: true,
    },
  })) as unknown as Subscription;

  //check if usageStats record exists & update
  if (orgId) await createStats(orgId);

  return sub;
}

export async function getAllSubscriptions() {
  return await prisma.subscription.findMany({
    include: {
      org: {
        select: {
          name: true,
          id: true,
        },
      },
      basePlan: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function updateSubscription(
  orgId: string,
  updatedData: updateSubscriptionInput,
) {
  return await prisma.subscription.update({
    where: {
      orgId,
    },
    data: { ...updatedData, lastLimitAlertSentAt: null },
  });
}

export async function deleteSubscriptions(orgIds: Array<string>) {
  return await prisma.subscription.deleteMany({
    where: {
      orgId: {
        in: orgIds,
      },
    },
  });
}

export async function hasFeature(
  orgId: string,
  featurePath: SubscriptionFeaturePathName,
) {
  const subscription = await prisma.subscription.findUnique({
    where: {
      orgId: orgId,
    },
  });
  if (!subscription || typeof subscription.features !== "object") return false;
  console.log(getNestedProperty(subscription.features, featurePath));
  return getNestedProperty(subscription.features, featurePath).active;
}
