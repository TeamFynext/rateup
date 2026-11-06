import prisma from "../../../utils/prisma.js";
import { LoyaltyEarningRuleInput, LoyaltyEarningRuleUpdateInput } from "./earningRule.schema.js";
import { onlyPurchaseRules } from "./triggerRules.js";

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

// The purchase rules only. Rules with a `trigger` (Instagram mentions) have their own
// editor, and everything reading this list — the rule cards, the cashier estimate, the
// giveback maths, the external API — treats each row as a way a purchase earns.
export async function getLoyaltyEarningRules(programId: string) {
  const rules = await prisma.loyaltyEarningRule.findMany({
    where: { programId },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
  return onlyPurchaseRules(rules);
}

export async function getActiveLoyaltyEarningRules(programId: string) {
  const now = new Date();
  const rules = await prisma.loyaltyEarningRule.findMany({
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
  return onlyPurchaseRules(rules);
}

// Every by-id read and write below is pinned to the caller's programme: a rule id from
// another org's programme behaves exactly like one that does not exist.
export async function getLoyaltyEarningRuleById(ruleId: string, programId: string) {
  return await prisma.loyaltyEarningRule.findFirst({
    where: { id: ruleId, programId },
    include: {
      program: true,
    },
  });
}

export async function updateLoyaltyEarningRule(
  ruleId: string,
  programId: string,
  data: LoyaltyEarningRuleUpdateInput,
) {
  return await prisma.loyaltyEarningRule.update({
    where: { id: ruleId, programId },
    // The default rule is the base rate itself; a multiplier on it is the rate in disguise.
    data: data.isDefault ? { ...data, multiplier: 1 } : data,
  });
}

export async function deleteLoyaltyEarningRule(ruleId: string, programId: string) {
  return await prisma.loyaltyEarningRule.delete({
    where: { id: ruleId, programId },
  });
}
