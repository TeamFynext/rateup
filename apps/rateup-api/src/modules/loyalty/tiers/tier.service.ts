import prisma from "../../../utils/prisma.js";
import { LoyaltyTierInput, LoyaltyTierUpdateInput } from "./tier.schema.js";

interface DeleteLoyaltyTierOptions {
  downgradeCustomers?: boolean;
}

export async function createLoyaltyTier(
  data: LoyaltyTierInput,
  programId: string,
) {
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

export async function getLoyaltyTierById(tierId: string) {
  return await prisma.loyaltyTier.findUnique({
    where: { id: tierId },
    include: {
      customers: {
        take: 10,
      },
    },
  });
}

export async function updateLoyaltyTier(
  tierId: string,
  data: LoyaltyTierUpdateInput,
) {
  return await prisma.loyaltyTier.update({
    where: { id: tierId },
    data,
  });
}

export async function deleteLoyaltyTier(
  tierId: string,
  options: DeleteLoyaltyTierOptions = {},
) {
  // Check if there are customers in this tier
  const customers = await prisma.customerLoyaltyAccount.findMany({
    where: { currentTierId: tierId },
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

    // Find the tier to delete
    const tier = await prisma.loyaltyTier.findUnique({
      where: { id: tierId },
      select: { programId: true, priority: true },
    });
    if (!tier) {
      throw new Error("Tier not found.");
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
      where: { currentTierId: tierId },
      data: { currentTierId: previousTier.id },
    });
  }

  return await prisma.loyaltyTier.delete({
    where: { id: tierId },
  });
}
