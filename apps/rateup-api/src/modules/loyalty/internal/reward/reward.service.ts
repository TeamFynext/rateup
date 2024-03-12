import { LcReward } from "@prisma/client";
import prisma from "../../../../utils/prisma";
import { CreateRewardInput, UpdateRewardInput } from "./reward.schema";

export async function createLCReward(
  reward: CreateRewardInput,
): Promise<LcReward> {
  return await prisma.lcReward.create({
    data: reward,
  });
}

export async function getLCRewards(orgId: string) {
  return await prisma.lcReward.findMany({
    where: {
      orgId,
    },
  });
}

export async function getLCRewardById(rewardId: string) {
  return await prisma.lcReward.findUnique({
    where: {
      id: rewardId,
    },
  });
}

export async function updateLCReward(
  rewardId: string,
  reward: UpdateRewardInput,
) {
  return await prisma.lcReward.update({
    where: {
      id: rewardId,
    },
    data: reward,
  });
}

export async function deleteLCReward(rewardId: string) {
  return await prisma.lcReward.delete({
    where: {
      id: rewardId,
    },
  });
}
