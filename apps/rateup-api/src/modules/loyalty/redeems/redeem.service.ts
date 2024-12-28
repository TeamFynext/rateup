import dayjs from "dayjs";
import prisma from "../../../utils/prisma";
import { getLCustomerById } from "../customer/customer.service";
import { getShortUrlId } from "../../../utils/commnUtils";
import { getUniqueRandomAlphaId } from "../../../utils/misc/random.utils";

export enum RedeemStatus {
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  ISSUED = "ISSUED",
  CLAIMED = "CLAIMED",
}

export async function createRedeem(customerId, rewardId) {
  const existingCodes = (
    await prisma.loyaltyRedeem.findMany({
      where: {
        code: {
          not: null,
        },
      },
    })
  ).map((r) => r.code);

  const uniqueCode = getUniqueRandomAlphaId(8, existingCodes);
  const { reward, customer, id } = await prisma.loyaltyRedeem.create({
    data: {
      customerId,
      rewardId,
      status: RedeemStatus.PROCESSING,
      code: uniqueCode,
    },
    include: {
      reward: true,
      customer: true,
    },
  });
  const isExpired = dayjs().isAfter(dayjs(reward.expireAt));
  const isBalance =
    reward.points <= customer.totalEarnedPoints - customer.redeemedPoints;
  const isUsedMax =
    (await getLoyaltyRedeemsByCustomerReward(customerId, rewardId)).length >=
    reward.maxPerUser;
  const redeem = await updateLoyaltyRedeem(id, {
    status:
      isExpired || !isBalance || isUsedMax
        ? RedeemStatus.FAILED
        : RedeemStatus.ISSUED,
  });
  return {
    redeem,
    message: isExpired
      ? "Reward has expired"
      : !isBalance
        ? "Customer do not have enough points"
        : isUsedMax
          ? "Customer has reached reward limit"
          : "",
  };
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
      reward: true,
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
