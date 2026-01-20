import prisma from "../../../utils/prisma.js";
import {
  LoyaltyProgramInput,
  LoyaltyProgramUpdateInput,
} from "./program.schema.js";

export async function createLoyaltyProgram(
  data: LoyaltyProgramInput,
  orgId: string,
) {
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
      signupBonus: data.signupBonus,
      referralBonus: data.referralBonus,
      refereeBonus: data.refereeBonus,
      tiersEnabled: data.tiersEnabled,
      tierResetPeriod: data.tierResetPeriod,
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
        where: { status: "active" },
      },
    },
  });
}

export async function updateLoyaltyProgram(
  programId: string,
  data: LoyaltyProgramUpdateInput,
) {
  return await prisma.loyaltyProgram.update({
    where: { id: programId },
    data,
    include: {
      tiers: true,
    },
  });
}

export async function deleteLoyaltyProgram(programId: string) {
  // Check if there are any customers
  const customerCount = await prisma.customerLoyaltyAccount.count({
    where: { programId },
  });

  if (customerCount > 0) {
    throw new Error(
      "Cannot delete program with existing customers. Archive it instead.",
    );
  }

  return await prisma.loyaltyProgram.delete({
    where: { id: programId },
  });
}
