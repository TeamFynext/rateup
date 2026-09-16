import prisma from "../../../utils/prisma.js";
import { LoyaltyEarningRuleInput, LoyaltyEarningRuleUpdateInput } from "./earningRule.schema.js";

export async function createLoyaltyEarningRule(data: LoyaltyEarningRuleInput, programId: string) {
  return await prisma.loyaltyEarningRule.create({
    data: {
      programId,
      name: data.name,
      description: data.description,
      status: data.status,
      priority: data.priority,
      pointsPerUnit: data.pointsPerUnit,
      // The default rule is the base rate itself; a multiplier on it is the rate in disguise.
      multiplier: data.isDefault ? 1 : data.multiplier,
      bonusPoints: data.bonusPoints,
      minPurchaseAmount: data.minPurchaseAmount,
      maxPurchaseAmount: data.maxPurchaseAmount,
      validFrom: data.validFrom,
      validUntil: data.validUntil,
      applicableToTiers: data.applicableToTiers,
      isDefault: data.isDefault,
      conditions: data.conditions || {},
    },
  });
}

export async function getLoyaltyEarningRules(programId: string) {
  return await prisma.loyaltyEarningRule.findMany({
    where: { programId },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
}

export async function getActiveLoyaltyEarningRules(programId: string) {
  const now = new Date();
  return await prisma.loyaltyEarningRule.findMany({
    where: {
      programId,
      status: "active",
      OR: [{ validFrom: null }, { validFrom: { lte: now } }],
      AND: [
        {
          OR: [{ validUntil: null }, { validUntil: { gte: now } }],
        },
      ],
    },
    orderBy: { priority: "desc" },
  });
}

export async function getLoyaltyEarningRuleById(ruleId: string) {
  return await prisma.loyaltyEarningRule.findUnique({
    where: { id: ruleId },
    include: {
      program: true,
    },
  });
}

export async function updateLoyaltyEarningRule(
  ruleId: string,
  data: LoyaltyEarningRuleUpdateInput,
) {
  return await prisma.loyaltyEarningRule.update({
    where: { id: ruleId },
    // The default rule is the base rate itself; a multiplier on it is the rate in disguise.
    data: data.isDefault ? { ...data, multiplier: 1 } : data,
  });
}

export async function deleteLoyaltyEarningRule(ruleId: string) {
  return await prisma.loyaltyEarningRule.delete({
    where: { id: ruleId },
  });
}
