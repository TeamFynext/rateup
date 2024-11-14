import prisma from "../../../../../../../utils/prisma";

export enum RedeemStatus {
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export async function getLoyaltyRedeems(orgId: string) {
  return await prisma.loyaltyRedeem.findMany({
    where: {
      customer: {
        orgId,
      },
    },
    include: {
      reward: {
        select: {
          name: true,
          points: true,
        },
      },
      customer: {
        select: {
          name: true,
          phone: true,
        },
      },
    },
  });
}
