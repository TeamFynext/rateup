import prisma from "../../../utils/prisma.js";
import {
  validateRedemption,
  generateRedemptionCode,
} from "../redemptionValidator.js";
import {
  ApplyRedemptionInput,
  RedeemRewardInput,
} from "../accounts/account.schema.js";
import {
  dispatchLoyaltyNotification,
  LOYALTY_WA_COMMANDS,
} from "../loyaltyWaDispatcher.js";

export async function redeemReward(programId: string, data: RedeemRewardInput) {
  // Get customer
  const customer = await prisma.customerLoyaltyAccount.findUnique({
    where: {
      id: data.customerId,
    },
    include: {
      contact: true,
      currentTier: true,
    },
  });

  if (!customer) {
    throw new Error("Customer account not found");
  }

  // Get reward
  const reward = await prisma.loyaltyReward.findUnique({
    where: { id: data.rewardId },
  });

  if (!reward) {
    throw new Error("Reward not found");
  }

  // Check if customer has enough points
  if (customer.currentPoints < reward.pointsCost) {
    throw new Error(
      `Insufficient points. Required: ${reward.pointsCost}, Available: ${customer.currentPoints}`,
    );
  }

  // Validate redemption using validator
  const validation = await validateRedemption(customer.id, data.rewardId, {
    locationId: data.locationId,
  });

  if (!validation.valid) {
    throw new Error(
      `Redemption validation failed: ${validation.violations.join(", ")}`,
    );
  }

  // Check if reward type is 'point' and handle point addition
  if (reward.rewardType === "point") {
    const pointsToAdd = (reward.rewardValue as any)?.points || 0;

    // Credit points transaction
    await prisma.loyaltyTransaction.create({
      data: {
        accountId: customer.id,
        programId,
        transactionType: "earn",
        source: "reward_redemption",
        points: pointsToAdd,
        balanceAfter: customer.currentPoints + pointsToAdd,
        description: `Redeemed point reward: ${reward.name}`,
        metadata: {
          rewardId: reward.id,
          rewardName: reward.name,
          redemptionCode: "INSTANT",
        },
      },
    });

    // Update customer balance
    await prisma.customerLoyaltyAccount.update({
      where: { id: customer.id },
      data: {
        currentPoints: { increment: pointsToAdd },
        // Lifetime points usually track EARNED points, so we should increment it too
        lifetimePoints: { increment: pointsToAdd },
      },
    });

    // For point rewards, we technically don't need a "Redemption" record that sits in "APPROVED" state
    // because it's instantly consumed. But we might want to record it as USED immediately.
    const redemption = await prisma.loyaltyRedemption.create({
      data: {
        accountId: customer.id,
        rewardId: reward.id,
        redemptionCode: "INSTANT_" + Date.now(),
        status: "USED",
        rulesValidatedAt: new Date(),
        rulesValidationPassed: true,
        usedAt: new Date(),
        // transactionId: transaction.id // Ideally link relevant transaction
      },
    });

    if (customer.contact?.phone && customer.contact?.orgId) {
      await dispatchLoyaltyNotification(
        customer.contact.orgId,
        LOYALTY_WA_COMMANDS.POINTS_ISSUED,
        {
          customerPhone: customer.contact.phone,
          customerName: customer.contact.name || "Customer",
          points: pointsToAdd,
          balanceAfter: customer.currentPoints + pointsToAdd,
          reason: `Redeemed point reward: ${reward.name}`,
        },
      );
    }

    return redemption;
  }

  // Generate redemption code
  const redemptionCode = await generateRedemptionCode();

  // Check if reward requires approval
  const requiresApproval =
    reward.redemptionRules?.["approval_rules"]?.["requires_approval"] || false;

  const status = requiresApproval ? "PENDING" : "APPROVED";

  // Deduct points if auto-approved
  if (requiresApproval) {
    // Create placeholder transaction for pending redemptions
    await prisma.loyaltyTransaction.create({
      data: {
        accountId: customer.id,
        programId,
        transactionType: "redeem",
        source: "reward_redemption",
        points: 0, // Pending, no points deducted yet
        balanceAfter: customer.currentPoints,
        description: data.notes,
        metadata: {
          rewardId: reward.id,
          rewardName: reward.name,
          redemptionCode,
          status: "pending_approval",
        },
      },
    });
  } else {
    const transaction = await prisma.loyaltyTransaction.create({
      data: {
        accountId: customer.id,
        programId,
        transactionType: "redeem",
        source: "reward_redemption",
        points: -reward.pointsCost,
        description: data.notes,
        balanceAfter: customer.currentPoints - reward.pointsCost,
        metadata: {
          rewardId: reward.id,
          rewardName: reward.name,
          redemptionCode,
        },
      },
    });

    await prisma.customerLoyaltyAccount.update({
      where: { id: customer.id },
      data: {
        currentPoints: {
          decrement: reward.pointsCost,
        },
      },
    });
    // Create redemption
    await prisma.loyaltyRedemption.create({
      data: {
        accountId: customer.id,
        rewardId: data.rewardId,
        transactionId: transaction.id,
        redemptionCode,
        status,
        usedContext: {
          locationId: data.locationId,
          orderId: data.orderId,
          notes: data.notes,
        },
      },
    });

    if (customer.contact?.phone && customer.contact?.orgId) {
      await dispatchLoyaltyNotification(
        customer.contact.orgId,
        LOYALTY_WA_COMMANDS.REWARD_REDEEMED,
        {
          customerPhone: customer.contact.phone,
          customerName: customer.contact.name || "Customer",
          rewardName: reward.name,
          redemptionCode: redemptionCode,
          points: -reward.pointsCost,
          balanceAfter: customer.currentPoints - reward.pointsCost,
          rewardId: reward.id,
          rewardWaTemplateId: reward.waTemplateId,
        },
      );
    }
  }

  return {
    message: requiresApproval
      ? "Redemption pending approval"
      : "Redemption successful",
  };
}

export async function verifyRedemption(redemptionCode: string) {
  const redemption = await prisma.loyaltyRedemption.findUnique({
    where: { redemptionCode },
    include: {
      reward: true,
      account: {
        include: {
          currentTier: true,
        },
      },
    },
  });

  if (!redemption) {
    throw new Error("Redemption not found");
  }

  return {
    redemption,
    valid: redemption.status === "APPROVED" && !redemption.usedAt,
    account: redemption.account,
    reward: redemption.reward,
  };
}

export async function applyRedemption(data: ApplyRedemptionInput) {
  const redemption = await prisma.loyaltyRedemption.findUnique({
    where: { redemptionCode: data.redemptionCode },
    include: {
      reward: true,
    },
  });

  if (!redemption) {
    throw new Error("Redemption not found");
  }

  if (redemption.status !== "APPROVED") {
    throw new Error("Redemption is not approved");
  }

  if (redemption.usedAt) {
    throw new Error("Redemption already applied");
  }

  // Mark as applied
  const updated = await prisma.loyaltyRedemption.update({
    where: { id: redemption.id },
    data: {
      usedAt: new Date(),
      usedContext: {
        ...(redemption.usedContext as object),
        appliedBy: data.appliedBy,
        applyNotes: data.notes,
      },
    },
    include: {
      account: true,
      reward: true,
    },
  });

  // Update reward stock if applicable
  if (redemption.reward.stockQuantity !== null) {
    await prisma.loyaltyReward.update({
      where: { id: redemption.rewardId },
      data: {
        stockRedeemed: {
          increment: 1,
        },
      },
    });
  }

  return updated;
}

export async function getRedemptionsByCustomer(customerId: string) {
  return await prisma.loyaltyRedemption.findMany({
    where: { accountId: customerId },
    include: {
      reward: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

// Get all transactions with filters
export async function getTransactions(
  programId: string,
  filters: {
    fromDate?: string;
    toDate?: string;
    transactionType?: string;
    source?: string;
    customerId?: string;
    minPoints?: number;
    maxPoints?: number;
    page?: number;
    limit?: number;
  },
) {
  const where: any = { programId };

  if (filters.fromDate || filters.toDate) {
    where.createdAt = {};
    if (filters.fromDate) {
      where.createdAt.gte = new Date(filters.fromDate);
    }
    if (filters.toDate) {
      where.createdAt.lte = new Date(filters.toDate);
    }
  }

  if (filters.transactionType) {
    where.transactionType = filters.transactionType;
  }

  if (filters.source) {
    where.source = filters.source;
  }

  if (filters.customerId) {
    where.accountId = filters.customerId;
  }

  if (filters.minPoints !== undefined || filters.maxPoints !== undefined) {
    where.points = {};
    if (filters.minPoints !== undefined) {
      where.points.gte = filters.minPoints;
    }
    if (filters.maxPoints !== undefined) {
      where.points.lte = filters.maxPoints;
    }
  }

  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    prisma.loyaltyTransaction.findMany({
      where,
      include: {
        account: {
          include: {
            contact: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.loyaltyTransaction.count({ where }),
  ]);

  return {
    transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// Get all transactions for export (no pagination)
export async function getTransactionsForExport(
  programId: string,
  filters: {
    fromDate?: string;
    toDate?: string;
    transactionType?: string;
    source?: string;
    customerId?: string;
    minPoints?: number;
    maxPoints?: number;
  },
) {
  const where: any = { programId };

  if (filters.fromDate || filters.toDate) {
    where.createdAt = {};
    if (filters.fromDate) {
      where.createdAt.gte = new Date(filters.fromDate);
    }
    if (filters.toDate) {
      where.createdAt.lte = new Date(filters.toDate);
    }
  }

  if (filters.transactionType) {
    where.transactionType = filters.transactionType;
  }

  if (filters.source) {
    where.source = filters.source;
  }

  if (filters.customerId) {
    where.accountId = filters.customerId;
  }

  if (filters.minPoints !== undefined || filters.maxPoints !== undefined) {
    where.points = {};
    if (filters.minPoints !== undefined) {
      where.points.gte = filters.minPoints;
    }
    if (filters.maxPoints !== undefined) {
      where.points.lte = filters.maxPoints;
    }
  }

  return await prisma.loyaltyTransaction.findMany({
    where,
    include: {
      account: {
        include: {
          contact: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
