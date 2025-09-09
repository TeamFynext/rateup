import { SubscriptionFeaturePathName } from "../../../types/enums";
import prisma from "../../../utils/prisma";
import {
  decrementStatsCount,
  updateMonthlyStat,
} from "../../stats/stats.service";
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
      expireAt: reward.expireAt?.length ? new Date(reward.expireAt) : undefined,
      maxPerUser: reward.maxPerUser,
      waTemplateId: reward.waTemplateId?.length
        ? reward.waTemplateId
        : undefined,
      orgId,
      rewardType: reward.rewardType,
      rewardValue: reward.rewardValue,
      reward_id: reward.reward_id,
    },
  });
  await updateMonthlyStat(SubscriptionFeaturePathName.LoyaltyReward, orgId);
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
    data: {
      ...data,
      waTemplateId: data.waTemplateId?.length ? data.waTemplateId : undefined,
    },
  });
}

export async function deleteLoyaltyRewardById(id: string, orgId: string) {
  await prisma.loyaltyReward.delete({
    where: {
      id,
    },
  });
  await decrementStatsCount(orgId, "loyaltyRewardCount");
}
