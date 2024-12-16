import prisma from "../../../utils/prisma";
import { loyaltyRewardInput, lRewardUpdateInput } from "./rewards.schema";

export async function createLoyaltyReward(
  reward: loyaltyRewardInput,
  orgId: string,
) {
  await prisma.loyaltyReward.create({
    data: {
      name: reward.name,
      points: reward.points,
      description: reward.description,
      tnc: reward.tnc,
      expireAt: reward.expireAt,
      maxPerUser: reward.maxPerUser,
      waTemplateId: reward.waTemplateId,
      orgId,
    },
  });
}

export async function getLoyaltyRewards(orgId: string) {
  return await prisma.loyaltyReward.findMany({
    where: {
      orgId,
    },
  });
}

export async function getLoyaltyRewardById(id: string) {
  return await prisma.loyaltyReward.findUnique({
    where: {
      id,
    },
  });
}

export async function updateLoyaltyRewardById(
  data: lRewardUpdateInput,
  id: string,
) {
  return await prisma.loyaltyReward.update({
    where: {
      id,
    },
    data,
  });
}

export async function deleteLoyaltyRewardById(id: string) {
  return await prisma.loyaltyReward.delete({
    where: {
      id,
    },
  });
}
