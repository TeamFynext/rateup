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
  const customerCount = await prisma.customerLoyaltyAccount.count({
    where: { currentTierId: tierId },
  });

  if (customerCount > 0) {
    throw new Error(
      "Cannot delete tier with customers. Move customers to another tier first.",
    );
  }

  return await prisma.loyaltyTier.delete({
    where: { id: tierId },
  });
}
