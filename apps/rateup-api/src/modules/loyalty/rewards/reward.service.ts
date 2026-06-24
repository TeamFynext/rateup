import prisma from "../../../utils/prisma.js";
import { LoyaltyRewardInput, LoyaltyRewardUpdateInput } from "./reward.schema.js";

export async function createLoyaltyReward(data: LoyaltyRewardInput, programId: string) {
  return await prisma.loyaltyReward.create({
    data: {
      programId,
      name: data.name,
      description: data.description,
      status: data.status,
      pointsCost: data.pointsCost,
      rewardType: data.rewardType,
      rewardValue: data.rewardValue,
      stockQuantity: data.stockQuantity,
      stockRedeemed: data.stockRedeemed,
      availableForTiers: data.availableForTiers,
      redemptionRules: data.redemptionRules || {},
      waTemplateId: data.waTemplateId,
    },
  });
}

export async function getLoyaltyRewards(programId: string) {
  return await prisma.loyaltyReward.findMany({
    where: { programId },
    orderBy: { pointsCost: "asc" },
  });
}

export async function getActiveLoyaltyRewards(programId: string) {
  return await prisma.loyaltyReward.findMany({
    where: {
      programId,
      status: "ACTIVE",
    },
    orderBy: { pointsCost: "asc" },
  });
}

export async function getLoyaltyRewardById(rewardId: string) {
  return await prisma.loyaltyReward.findUnique({
    where: { id: rewardId },
    include: {
      redemptions: {
        take: 10,
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function updateLoyaltyReward(rewardId: string, data: LoyaltyRewardUpdateInput) {
  return await prisma.loyaltyReward.update({
    where: { id: rewardId },
    data,
  });
}

export async function deleteLoyaltyReward(rewardId: string) {
  // Check if there are pending redemptions
  const pendingRedemptions = await prisma.loyaltyRedemption.count({
    where: {
      rewardId,
      status: {
        in: ["PENDING", "APPROVED"],
      },
    },
  });

  if (pendingRedemptions > 0) {
    throw new Error("Cannot delete reward with pending redemptions. Complete them first.");
  }

  return await prisma.loyaltyReward.delete({
    where: { id: rewardId },
  });
}

export async function incrementRewardStock(rewardId: string, amount: number) {
  return await prisma.loyaltyReward.update({
    where: { id: rewardId },
    data: {
      stockRedeemed: {
        increment: amount,
      },
    },
  });
}
