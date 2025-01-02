import prisma from "../../../../../../../utils/prisma";

export async function getLoyaltyRewardByRewardId(reward_id, orgId) {
  return await prisma.loyaltyReward.findUnique({
    where: {
      reward_id_org_id_unique: {
        reward_id,
        orgId,
      },
    },
  });
}
