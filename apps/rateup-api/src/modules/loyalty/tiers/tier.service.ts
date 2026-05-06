import prisma from "../../../utils/prisma.js";
import { LoyaltyTierInput, LoyaltyTierUpdateInput } from "./tier.schema.js";

export async function createLoyaltyTier(
  data: LoyaltyTierInput,
  programId: string,
) {
  return await prisma.loyaltyTier.create({
    data: {
      programId,
      name: data.name,
      priority: data.priority,
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

export async function deleteLoyaltyTier(tierId: string) {
  // Check if there are customers in this tier
  const customers = await prisma.customerLoyaltyAccount.findMany({
    where: { currentTierId: tierId },
    select: { id: true },
  });

  if (customers.length > 0) {
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
      throw new Error(
        "Cannot delete tier with customers. Move customers to another tier first.",
      );
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
