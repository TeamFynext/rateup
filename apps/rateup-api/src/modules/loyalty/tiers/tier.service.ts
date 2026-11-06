import prisma from "../../../utils/prisma.js";
import { LoyaltyTierInput, LoyaltyTierUpdateInput } from "./tier.schema.js";

interface DeleteLoyaltyTierOptions {
  downgradeCustomers?: boolean;
}

export async function createLoyaltyTier(data: LoyaltyTierInput, programId: string) {
  const maxPriorityTier = await prisma.loyaltyTier.findFirst({
    where: { programId },
    orderBy: { priority: "desc" },
    select: { priority: true },
  });
  const nextPriority = maxPriorityTier ? maxPriorityTier.priority + 1 : 0;
  return await prisma.loyaltyTier.create({
    data: {
      programId,
      name: data.name,
      priority: nextPriority,
      threshold: data.threshold,
      pointsMultiplier: data.pointsMultiplier,
      color: data.color,
      benefitsDescription: data.benefitsDescription,
    },
  });
}

export async function getLoyaltyTiers(programId: string) {
  return await prisma.loyaltyTier.findMany({
    where: { programId },
    include: {
      program: {
        select: { currencyCode: true },
      },
    },
    orderBy: { threshold: "asc" },
  });
}

// Every by-id read and write below is pinned to the caller's programme: a tier id from
// another org's programme behaves exactly like one that does not exist.
export async function getLoyaltyTierById(tierId: string, programId: string) {
  return await prisma.loyaltyTier.findFirst({
    where: { id: tierId, programId },
    include: {
      customers: {
        take: 10,
      },
    },
  });
}

export async function updateLoyaltyTier(
  tierId: string,
  programId: string,
  data: LoyaltyTierUpdateInput,
) {
  return await prisma.loyaltyTier.update({
    where: { id: tierId, programId },
    data,
  });
}

export async function deleteLoyaltyTier(
  tierId: string,
  programId: string,
  options: DeleteLoyaltyTierOptions = {},
) {
  const tier = await prisma.loyaltyTier.findFirst({
    where: { id: tierId, programId },
    select: { programId: true, priority: true },
  });
  if (!tier) {
    const error = new Error("Tier not found.") as Error & { code: string };
    error.code = "TIER_NOT_FOUND";
    throw error;
  }

  // Check if there are customers in this tier
  const customers = await prisma.customerLoyaltyAccount.findMany({
    where: { currentTierId: tierId, programId },
    select: { id: true },
  });

  const customerCount = customers.length;

  if (customerCount > 0) {
    if (!options.downgradeCustomers) {
      const error = new Error(
        "This tier has customers. Confirm downgrade to previous tier before deleting.",
      ) as Error & {
        code: string;
        customerCount: number;
      };
      error.code = "TIER_HAS_CUSTOMERS";
      error.customerCount = customerCount;
      throw error;
    }

    // Find the previous tier by priority (lower priority number = higher tier)
    const previousTier = await prisma.loyaltyTier.findFirst({
      where: {
        programId: tier.programId,
        priority: { lt: tier.priority },
      },
      orderBy: { priority: "desc" },
    });

    if (!previousTier) {
      const error = new Error(
        "Cannot downgrade customers because no previous tier exists.",
      ) as Error & { code: string };
      error.code = "TIER_DOWNGRADE_TARGET_NOT_FOUND";
      throw error;
    }

    // Move all customers to the previous tier
    await prisma.customerLoyaltyAccount.updateMany({
      where: { currentTierId: tierId, programId },
      data: { currentTierId: previousTier.id },
    });
  }

  return await prisma.loyaltyTier.delete({
    where: { id: tierId, programId },
  });
}
