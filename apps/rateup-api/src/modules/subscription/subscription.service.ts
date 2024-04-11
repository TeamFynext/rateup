import dayjs from "dayjs";
import prisma from "../../utils/prisma";
import { SampleSubscriptionFeatures } from "./subscription.data";
import { updateSubscriptionInput } from "./subscription.schema";
import { PaymentPlanType } from "@prisma/client";
import { createStats } from "../stats/stats.service";

export async function createTrialSubscription(orgId: string, pClient = prisma) {
  // Check if the RATEUP TRIAL plan exists
  const rateupTrialPlan = await pClient.rateupPlan.findFirst({
    where: {
      name: "RATEUP TRIAL",
    },
  });

  let planId;

  if (rateupTrialPlan) {
    planId = rateupTrialPlan.id;
  } else {
    const newRateupTrialPlan = await pClient.rateupPlan.create({
      data: {
        name: "RATEUP TRIAL",
        displayName: "RATEUP TRIAL",
        planType: PaymentPlanType.BASE,
      },
    });
    planId = newRateupTrialPlan.id;
  }

  await pClient.subscription.create({
    data: {
      orgId,
      basePlanId: planId,
      features: SampleSubscriptionFeatures as any,
      expiresAt: dayjs().add(30, "day").toDate(),
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
        },
      },
      subscriptionRef: true,
    },
  })) as unknown as Subscription;

  //TODO - Resolve the temp solution
  //here is a temp solution for missing features for existing users
  if (!sub.features.ticket) {
    const ticket = {
      count: {
        max: 500,
      },
      active: true,
    };

    sub.features.ticket = ticket;

    let updatedSub = (await prisma.subscription.update({
      where: {
        orgId: sub.orgId,
      },
      data: {
        features: sub.features,
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
          },
        },
        subscriptionRef: true,
      },
    })) as unknown as Subscription;

    return updatedSub;
  }

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
    data: updatedData,
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
