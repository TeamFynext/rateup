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
      // LoyaltyRewardStatus.ACTIVE, which is "ACTIVE". This filter used to read
      // `status: "active"` in lower case, and rewards are written with the enum —
      // so `program.rewards` came back EMPTY for every org, always, and every
      // caller of this function that read the relation saw nothing with no way to
      // tell that from a program with no rewards. The earningRules include on the
      // line above uses the lower-case value the earning-rule schema actually
      // writes, so only one of the two was wrong, which is why it went unnoticed.
      // See issues.txt 20.29.
      rewards: {
        where: { status: LoyaltyRewardStatus.ACTIVE },
      },
    },
  });
}

/**
 * `orgId` is part of the where clause.
 *
 * The program id used to come from the path and the session org was never
 * consulted, so one org could rewrite another's program settings — including its
 * signup and referral bonuses, which decide what points get minted. Same family as
 * issues.txt 20.18; the pinning test for it lives with the program controller.
 */
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

/**
 * Zeroes every account in a program, and writes a reversing ledger entry for each
 * one so the destruction is on the record.
 *
 * This used to be a single `updateMany` setting currentPoints, lifetimePoints and
 * totalSpend to zero for every customer — no LoyaltyTransaction rows, no record of
 * who ran it, and no notification to the customers whose balances vanished. For a
 * points programme with real liability attached, "reset everyone to zero" is
 * exactly the operation that needs a trail, and replaying the ledger afterwards
 * could not account for the missing points at all.
 *
 * `actorId` is stamped on every row it writes. The reversal is per account and the
 * whole thing is one transaction, so a partial reset cannot leave some balances
 * zeroed and unexplained. See issues.txt 20.30.
 */
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
