import prisma from "../../../utils/prisma.js";
import {
  validateRedemption,
  generateRedemptionCode,
} from "../redemptionValidator.js";
import {
  ApplyRedemptionInput,
  RedeemRewardInput,
} from "../accounts/account.schema.js";
import { dispatchLoyaltyNotification } from "../loyaltyWaDispatcher.js";
import { LoyaltyEventType } from "../../../types/enums.js";

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

  // Check if customer has enough points (skip for assigned type rewards)
  if (
    reward.rewardType !== "assigned" &&
    customer.currentPoints < reward.pointsCost
  ) {
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

  // Handle different reward types

  // TYPE 1: POINT REWARDS - Add points instantly and mark as used
  if (reward.rewardType === "point") {
    const pointsToAdd = (reward.rewardValue as any)?.points || 0;

    // Deduct redemption cost
    const transaction = await prisma.loyaltyTransaction.create({
      data: {
        accountId: customer.id,
        programId,
        transactionType: "redeem",
        source: "reward_redemption",
        points: -reward.pointsCost,
        balanceAfter: customer.currentPoints - reward.pointsCost,
        description: `Redeemed: ${reward.name} (Cost: ${reward.pointsCost})`,
        metadata: {
          rewardId: reward.id,
          rewardName: reward.name,
          redemptionType: "point",
        },
      },
    });

    // Credit bonus points
    await prisma.loyaltyTransaction.create({
      data: {
        accountId: customer.id,
        programId,
        transactionType: "earn",
        source: "reward_redemption",
        points: pointsToAdd,
        balanceAfter: customer.currentPoints - reward.pointsCost + pointsToAdd,
        description: `Bonus points from reward: ${reward.name}`,
        metadata: {
          rewardId: reward.id,
          rewardName: reward.name,
          redemptionType: "point",
        },
      },
    });

    // Update customer balance
    await prisma.customerLoyaltyAccount.update({
      where: { id: customer.id },
      data: {
        currentPoints: {
          increment: pointsToAdd - reward.pointsCost,
        },
      },
    });

    const instantRedemptionCode =
      "INSTANT_" + Date.now().toString(36).toUpperCase();

    const redemption = await prisma.loyaltyRedemption.create({
      data: {
        accountId: customer.id,
        rewardId: reward.id,
        transactionId: transaction.id,
        redemptionCode: instantRedemptionCode,
        status: "USED",
        rulesValidatedAt: new Date(),
        rulesValidationPassed: true,
        usedAt: new Date(),
        usedContext: {
          locationId: data.locationId,
          orderId: data.orderId,
          notes: data.notes,
          redemptionType: "point",
        },
      },
    });

    // Update stock
    if (reward.stockQuantity !== null) {
      await prisma.loyaltyReward.update({
        where: { id: reward.id },
        data: {
          stockRedeemed: {
            increment: 1,
          },
        },
      });
    }

    if (customer.contact?.phone && customer.contact?.orgId) {
      await dispatchLoyaltyNotification(
        customer.contact.orgId,
        LoyaltyEventType.POINTS_ISSUED,
        {
          customerPhone: customer.contact.phone,
          customerName: customer.contact.name || "Customer",
          points: pointsToAdd,
          balanceAfter:
            customer.currentPoints - reward.pointsCost + pointsToAdd,
          reason: `Redeemed point reward: ${reward.name}`,
        },
      );
    }

    return {
      redemption,
      message: "Points added successfully",
      redemptionCode: instantRedemptionCode,
    };
  }

  // TYPE 2: COUPON REWARDS - Create redemption record only (no assignment)
  if (reward.rewardType === "coupon") {
    const redemptionCode = await generateRedemptionCode();
    const requiresApproval =
      reward.redemptionRules?.["approval_rules"]?.["requires_approval"] ||
      false;

    const status = requiresApproval ? "PENDING" : "APPROVED";

    let transaction;
    if (!requiresApproval) {
      // Deduct points for coupon
      transaction = await prisma.loyaltyTransaction.create({
        data: {
          accountId: customer.id,
          programId,
          transactionType: "redeem",
          source: "reward_redemption",
          points: -reward.pointsCost,
          balanceAfter: customer.currentPoints - reward.pointsCost,
          description: data.notes || `Redeemed coupon: ${reward.name}`,
          metadata: {
            rewardId: reward.id,
            rewardName: reward.name,
            redemptionCode,
            redemptionType: "coupon",
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
    }

    // Create redemption record to track usage
    const redemption = await prisma.loyaltyRedemption.create({
      data: {
        accountId: customer.id,
        rewardId: data.rewardId,
        transactionId: transaction?.id,
        redemptionCode,
        status,
        rulesValidatedAt: new Date(),
        rulesValidationPassed: true,
        usedContext: {
          locationId: data.locationId,
          orderId: data.orderId,
          notes: data.notes,
          redemptionType: "coupon",
        },
      },
    });

    if (!requiresApproval) {
      // Update stock
      if (reward.stockQuantity !== null) {
        await prisma.loyaltyReward.update({
          where: { id: reward.id },
          data: {
            stockRedeemed: {
              increment: 1,
            },
          },
        });
      }

      if (customer.contact?.phone && customer.contact?.orgId) {
        await dispatchLoyaltyNotification(
          customer.contact.orgId,
          LoyaltyEventType.REWARD_REDEEMED,
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
      redemption,
      message: requiresApproval
        ? "Redemption pending approval"
        : "Coupon redeemed successfully. Use redemption code at cashier.",
      redemptionCode,
    };
  }

  // TYPE 3: REGULAR REWARDS (including assigned type) - Redeem with points, assign to user, then cashier redeems
  // Generate unique short code for assignment
  let shortCode = generateRewardShortCode();
  let unique = false;
  while (!unique) {
    const exists = await (prisma as any).customerReward.findUnique({
      where: { shortCode },
    });
    if (exists) {
      shortCode = generateRewardShortCode();
    } else {
      unique = true;
    }
  }

  const redemptionCode = await generateRedemptionCode();
  const requiresApproval =
    reward.redemptionRules?.["approval_rules"]?.["requires_approval"] || false;

  const status = requiresApproval ? "PENDING" : "APPROVED";

  let transaction = null;
  if (requiresApproval) {
    // Pending approval - no points deducted yet
    transaction = await prisma.loyaltyTransaction.create({
      data: {
        accountId: customer.id,
        programId,
        transactionType: "redeem",
        source: "reward_redemption",
        points: 0,
        balanceAfter: customer.currentPoints,
        description: data.notes || `Pending: ${reward.name}`,
        metadata: {
          rewardId: reward.id,
          rewardName: reward.name,
          redemptionCode,
          status: "pending_approval",
          redemptionType: reward.rewardType,
        },
      },
    });
  } else {
    // Deduct points
    transaction = await prisma.loyaltyTransaction.create({
      data: {
        accountId: customer.id,
        programId,
        transactionType: "redeem",
        source: "reward_redemption",
        points: -reward.pointsCost,
        balanceAfter: customer.currentPoints - reward.pointsCost,
        description: data.notes || `Redeemed: ${reward.name}`,
        metadata: {
          rewardId: reward.id,
          rewardName: reward.name,
          redemptionCode,
          shortCode,
          redemptionType: reward.rewardType,
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

    await prisma.customerReward.update({
      where: {
        rewardId_accountId: {
          rewardId: reward.id,
          accountId: customer.id,
        },
      },
      data: {
        shortCode,
        status: "REDEEMED",
      },
    });

    // Create redemption record
    await prisma.loyaltyRedemption.create({
      data: {
        accountId: customer.id,
        rewardId: data.rewardId,
        transactionId: transaction.id,
        redemptionCode,
        status,
        rulesValidatedAt: new Date(),
        rulesValidationPassed: true,
        usedContext: {
          locationId: data.locationId,
          orderId: data.orderId,
          notes: data.notes,
          shortCode,
          redemptionType: reward.rewardType,
        },
      },
    });

    // Update stock
    if (reward.stockQuantity !== null) {
      await prisma.loyaltyReward.update({
        where: { id: reward.id },
        data: {
          stockRedeemed: {
            increment: 1,
          },
        },
      });
    }

    if (customer.contact?.phone && customer.contact?.orgId) {
      await dispatchLoyaltyNotification(
        customer.contact.orgId,
        LoyaltyEventType.REWARD_ISSUED,
        {
          customerPhone: customer.contact.phone,
          customerName: customer.contact.name || "Customer",
          rewardName: reward.name,
          redemptionCode: shortCode,
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
      : `Reward assigned successfully. Short code: ${shortCode}`,
    redemptionCode: requiresApproval ? redemptionCode : undefined,
    shortCode: requiresApproval ? undefined : shortCode,
  };
}

// Helper function to generate short code
function generateRewardShortCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
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
      account: {
        include: {
          contact: true,
        },
      },
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

  // Mark as used
  const updated = await prisma.loyaltyRedemption.update({
    where: { id: redemption.id },
    data: {
      status: "USED",
      usedAt: new Date(),
      usedContext: {
        ...(redemption.usedContext as object),
        appliedBy: data.appliedBy,
        applyNotes: data.notes,
        appliedAt: new Date().toISOString(),
      },
    },
    include: {
      account: {
        include: {
          contact: true,
        },
      },
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

  // For coupon redemptions, just update stock (no CustomerReward involved)
  // For regular rewards, update the CustomerReward status to REDEEMED
  if (redemption.reward.rewardType !== "coupon") {
    const shortCode = (redemption.usedContext as any)?.shortCode;
    if (shortCode) {
      await (prisma as any).customerReward.update({
        where: { shortCode },
        data: {
          status: "REDEEMED",
        },
      });
    }
  }

  // Send notification
  if (updated.account.contact?.phone && updated.account.contact?.orgId) {
    await dispatchLoyaltyNotification(
      updated.account.contact.orgId,
      LoyaltyEventType.REWARD_REDEEMED,
      {
        customerPhone: updated.account.contact.phone,
        customerName: updated.account.contact.name || "Customer",
        rewardName: updated.reward.name,
        redemptionCode: data.redemptionCode,
        rewardId: updated.reward.id,
        rewardWaTemplateId: updated.reward.waTemplateId,
      },
    );
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
