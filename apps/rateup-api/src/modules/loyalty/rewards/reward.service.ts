import prisma from "../../../utils/prisma.js";
import { LoyaltyError } from "../loyalty.errors.js";
import { LoyaltyRewardType } from "../../../types/loyalty.js";
import { LoyaltyRewardInput, LoyaltyRewardUpdateInput } from "./reward.schema.js";

/**
 * A stable handle for a reward, derived from its name.
 *
 * External systems configure a till against this, so it must not be a UUID and must not
 * change when someone edits the reward's wording. Uniqueness is per programme, enforced by
 * the database; collisions get a numeric suffix.
 */
export function slugifyRewardName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return slug || "reward";
}

async function uniqueRewardCode(programId: string, preferred: string): Promise<string> {
  const base = slugifyRewardName(preferred);
  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const clash = await prisma.loyaltyReward.findFirst({
      where: { programId, code: candidate },
      select: { id: true },
    });
    if (!clash) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export async function getLoyaltyRewardByCode(programId: string, code: string) {
  return await prisma.loyaltyReward.findFirst({
    where: { programId, code },
  });
}

export async function createLoyaltyReward(data: LoyaltyRewardInput, programId: string) {
  return await prisma.loyaltyReward.create({
    data: {
      programId,
      code: await uniqueRewardCode(programId, data.code || data.name),
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

/**
 * The catalogue a customer can pick from — the WhatsApp "rewards" keyword, the external
 * API and the setup wizard. Review rewards are left out: they cannot be bought with points,
 * only earned by tapping the Google review link after the feedback flow.
 */
export async function getActiveLoyaltyRewards(programId: string) {
  return await prisma.loyaltyReward.findMany({
    where: {
      programId,
      status: "ACTIVE",
      rewardType: { not: LoyaltyRewardType.REVIEW },
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
    throw new LoyaltyError(
      "REWARD_IN_USE",
      "Cannot delete reward with pending redemptions. Complete them first.",
    );
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
