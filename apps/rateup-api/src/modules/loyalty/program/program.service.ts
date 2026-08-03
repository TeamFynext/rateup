import prisma from "../../../utils/prisma.js";
import { LoyaltyProgramInput, LoyaltyProgramUpdateInput } from "./program.schema.js";
import { LoyaltyRewardStatus } from "../rewards/reward.schema.js";

export async function createLoyaltyProgram(data: LoyaltyProgramInput, orgId: string) {
  // Check if program already exists
  const existing = await prisma.loyaltyProgram.findUnique({
    where: { orgId },
  });

  if (existing) {
    throw new Error("Loyalty program already exists for this organization");
  }

  return await prisma.loyaltyProgram.create({
    data: {
      orgId,
      name: data.name,
      status: data.status,
      currencyName: data.currencyName,
      currencyCode: data.currencyCode,
      currencySymbol: data.currencySymbol,
      defaultCountryCode: data.defaultCountryCode,
      signupBonus: data.signupBonus,
      referralBonus: data.referralBonus,
      referralBonusType: data.referralBonusType,
      referralRewardId: data.referralRewardId,
      refereeBonus: data.refereeBonus,
      refereeBonusType: data.refereeBonusType,
      refereeRewardId: data.refereeRewardId,
      tiersEnabled: data.tiersEnabled,
      tierResetPeriod: data.tierResetPeriod,
      pointsActivityAlerts: data.pointsActivityAlerts,
      autoApproveAdjustments: data.autoApproveAdjustments,
      emailNotifications: data.emailNotifications,
      whatsappNotifications: data.whatsappNotifications,
      enableShopifyOrderPoints: data.enableShopifyOrderPoints,
      enablePointsExpiration: data.enablePointsExpiration,
      pointsExpirationMonths: data.pointsExpirationMonths,
      whatsappSettingsId: data.whatsappSettingsId,
      referralMessageTemplate: data.referralMessageTemplate,
    },
    include: {
      tiers: true,
    },
  });
}

export async function getLoyaltyProgramByOrg(orgId: string) {
  return await prisma.loyaltyProgram.findUnique({
    where: { orgId },
    include: {
      tiers: {
        orderBy: { threshold: "asc" },
      },
      earningRules: {
        where: { status: "active" },
        orderBy: { priority: "desc" },
      },
      rewards: {
        where: { status: LoyaltyRewardStatus.ACTIVE },
      },
    },
  });
}

export async function updateLoyaltyProgram(
  programId: string,
  data: LoyaltyProgramUpdateInput,
  orgId: string,
) {
  return await prisma.loyaltyProgram.update({
    where: { id: programId, orgId },
    data,
    include: {
      tiers: true,
    },
  });
}

export async function deleteLoyaltyProgram(
  programId: string,
  orgId: string,
  force: boolean = false,
) {
  // Check if there are any customers
  const customerCount = await prisma.customerLoyaltyAccount.count({
    where: { programId },
  });

  if (customerCount > 0 && !force) {
    throw new Error("Cannot delete program with existing customers. Archive it instead.");
  }

  return await prisma.loyaltyProgram.delete({
    where: { id: programId, orgId },
  });
}

export async function resetProgramPoints(programId: string, orgId: string, actorId?: string) {
  const program = await prisma.loyaltyProgram.findFirst({
    where: { id: programId, orgId },
    select: { id: true },
  });

  if (!program) {
    throw new Error("Loyalty program not found");
  }

  // Find the first (lowest threshold) tier for the program
  const firstTier = await prisma.loyaltyTier.findFirst({
    where: { programId },
    orderBy: { threshold: "asc" },
  });

  const accounts = await prisma.customerLoyaltyAccount.findMany({
    where: { programId },
    select: { id: true, currentPoints: true },
  });

  await prisma.$transaction(async (tx) => {
    const spent = accounts.filter((account) => account.currentPoints !== 0);

    if (spent.length > 0) {
      await tx.loyaltyTransaction.createMany({
        data: spent.map((account) => ({
          accountId: account.id,
          programId,
          transactionType: "adjust",
          source: "program_reset",
          points: -account.currentPoints,
          balanceAfter: 0,
          description: "Programme points reset",
          metadata: { resetBy: actorId ?? null, pointsBefore: account.currentPoints },
        })),
      });
    }

    // Reset all customer points, spend, and tier
    await tx.customerLoyaltyAccount.updateMany({
      where: { programId },
      data: {
        currentPoints: 0,
        lifetimePoints: 0,
        totalSpend: 0,
        currentTierId: firstTier?.id ?? null,
      },
    });
  });
}
