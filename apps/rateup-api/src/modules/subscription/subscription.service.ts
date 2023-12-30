import dayjs from "dayjs";
import prisma from "../../utils/prisma";
import { SampleSubscriptionFeatures } from "./subscription.data";
import { updateSubscriptionInput } from "./subscription.schema";

export async function createTrialSubscription(orgId: string, pClient = prisma) {
  await pClient.subscription.create({
    data: {
      orgId,
      features: SampleSubscriptionFeatures as any,
      expiresAt: dayjs().add(7, "day").toDate(),
    },
  });
}

export async function getSubscription(orgId: string) {
  return (await prisma.subscription.findFirst({
    where: {
      orgId,
    },
  })) as unknown as Subscription;
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
