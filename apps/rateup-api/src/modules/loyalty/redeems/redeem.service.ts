import prisma from "../../../utils/prisma";
import { getLCustomerById } from "../customer/customer.service";

export enum RedeemStatus {
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export async function createRedeem(customerId, rewardId) {
  const { reward, customer, id } = await prisma.loyaltyRedeem.create({
    data: {
      customerId,
      rewardId,
      status: RedeemStatus.PROCESSING,
    },
    include: {
      reward: true,
      customer: true,
    },
  });
  const isBalance =
    reward.points <= customer.totalEarnedPoints - customer.redeemedPoints;
  const isUsedMax =
    (await getLoyaltyRedeemsByCustomerReward(customerId, rewardId)).length >=
    reward.maxPerUser;
  return await updateLoyaltyRedeem(id, {
    status:
      !isBalance || isUsedMax ? RedeemStatus.FAILED : RedeemStatus.COMPLETED,
  });
}

export async function updateLoyaltyRedeem(id, data) {
  return await prisma.loyaltyRedeem.update({
    where: {
      id,
    },
    data,
    include: {
      reward: true,
    },
  });
}

export async function getLoyaltyRedeems(orgId: string) {
  return await prisma.loyaltyRedeem.findMany({
    where: {
      customer: {
        orgId,
      },
    },
    include: {
      reward: {
        select: {
          name: true,
          points: true,
        },
      },
      customer: {
        select: {
          name: true,
          phone: true,
        },
      },
    },
  });
}

export async function getLoyaltyRedeemsByCustomerReward(
  customerId: string,
  rewardId: string,
) {
  return await prisma.loyaltyRedeem.findMany({
    where: {
      customerId,
      rewardId,
      status: RedeemStatus.COMPLETED,
    },
  });
}
