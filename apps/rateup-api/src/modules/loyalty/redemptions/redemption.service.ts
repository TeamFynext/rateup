import { Prisma } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { LoyaltyError } from "../loyalty.errors.js";
import { validateRedemption, generateRedemptionCode } from "../redemptionValidator.js";
import { generateRewardShortCode } from "../../../utils/misc/random.utils.js";
import { ApplyRedemptionInput, RedeemRewardInput } from "../accounts/account.schema.js";
import { dispatchLoyaltyNotification } from "../loyaltyWaDispatcher.js";
import { LoyaltyEventType } from "../../../types/enums.js";
import { ASSIGNMENT_ONLY_REWARD_TYPES } from "../../../types/loyalty.js";

/**
 * A transaction client — what `prisma.$transaction(async (tx) => …)` hands the
 * callback. Everything a redemption writes goes through one of these.
 */
type Tx = Prisma.TransactionClient;

const EXPORT_LIMIT = 50_000;

function isRecordNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2025";
}

async function moveBalance(tx: Tx, accountId: string, cost: number, delta: number) {
  try {
    return await tx.customerLoyaltyAccount.update({
      where: { id: accountId, currentPoints: { gte: cost } },
      data: { currentPoints: { increment: delta } },
    });
  } catch (error) {
    if (isRecordNotFound(error)) {
      throw new LoyaltyError("INSUFFICIENT_POINTS", `Insufficient points. Required: ${cost}`, {
        required: cost,
      });
    }
    throw error;
  }
}

export async function redeemReward(programId: string, data: RedeemRewardInput) {
  const customer = await prisma.customerLoyaltyAccount.findFirst({
    where: { id: data.customerId, programId },
    include: {
      contact: true,
      currentTier: true,
    },
  });

  if (!customer) {
    throw new LoyaltyError("MEMBER_NOT_FOUND", "Customer account not found");
  }

  const reward = await prisma.loyaltyReward.findFirst({
    where: { id: data.rewardId, programId },
  });

  if (!reward) {
    throw new LoyaltyError("REWARD_NOT_FOUND", "Reward not found");
  }

  // Check if customer has enough points (skip for rewards that are issued, not bought)
  if (
    !ASSIGNMENT_ONLY_REWARD_TYPES.includes(reward.rewardType) &&
    customer.currentPoints < reward.pointsCost
  ) {
    throw new LoyaltyError(
      "INSUFFICIENT_POINTS",
      `Insufficient points. Required: ${reward.pointsCost}, Available: ${customer.currentPoints}`,
      { required: reward.pointsCost, available: customer.currentPoints },
    );
  }

  // Validate redemption using validator
  const validation = await validateRedemption(customer.id, data.rewardId, {
    locationId: data.locationId,
  });

  if (!validation.valid) {
    // The violations go out as an array too: a caller should not have to split a sentence
    // to find out which rule refused.
    throw new LoyaltyError(
      "REDEMPTION_RULES_VIOLATED",
      `Redemption validation failed: ${validation.violations.join(", ")}`,
      { violations: validation.violations },
    );
  }

  // Handle different reward types

  // TYPE 1: POINT REWARDS - Add points instantly and mark as used
  if (reward.rewardType === "point") {
    const pointsToAdd = Number((reward.rewardValue as { points?: number })?.points) || 0;

    const instantRedemptionCode = await generateRedemptionCode();

    const { redemption, balanceAfter } = await prisma.$transaction(async (tx) => {
      const account = await moveBalance(
        tx,
        customer.id,
        reward.pointsCost,
        pointsToAdd - reward.pointsCost,
      );

      const transaction = await tx.loyaltyTransaction.create({
        data: {
          accountId: customer.id,
          programId,
          transactionType: "redeem",
          source: "reward_redemption",
          points: pointsToAdd - reward.pointsCost,
          balanceAfter: account.currentPoints,
          description: `Redeemed: ${reward.name} (Cost: ${reward.pointsCost})`,
          metadata: {
            rewardId: reward.id,
            rewardName: reward.name,
            redemptionType: "point",
          },
        },
      });

      const created = await tx.loyaltyRedemption.create({
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

      await burnStock(tx, reward);

      return { redemption: created, balanceAfter: account.currentPoints };
    });

    if (customer.contact?.phone && customer.contact?.orgId) {
      await dispatchLoyaltyNotification(customer.contact.orgId, LoyaltyEventType.POINTS_ISSUED, {
        customerPhone: customer.contact.phone,
        customerName: customer.contact.name || "Customer",
        points: pointsToAdd,
        balanceAfter,
        reason: `Redeemed point reward: ${reward.name}`,
      });
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
      reward.redemptionRules?.["approval_rules"]?.["requires_approval"] || false;

    const status = requiresApproval ? "PENDING" : "APPROVED";

    const { redemption, balanceAfter } = await prisma.$transaction(async (tx) => {
      let transaction = null;
      let balance = customer.currentPoints;

      if (!requiresApproval) {
        const account = await moveBalance(tx, customer.id, reward.pointsCost, -reward.pointsCost);
        balance = account.currentPoints;

        transaction = await tx.loyaltyTransaction.create({
          data: {
            accountId: customer.id,
            programId,
            transactionType: "redeem",
            source: "reward_redemption",
            points: -reward.pointsCost,
            balanceAfter: balance,
            description: data.notes || `Redeemed coupon: ${reward.name}`,
            metadata: {
              rewardId: reward.id,
              rewardName: reward.name,
              redemptionCode,
              redemptionType: "coupon",
            },
          },
        });
      }

      // Create redemption record to track usage
      const created = await tx.loyaltyRedemption.create({
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
        await burnStock(tx, reward);
      }

      return { redemption: created, balanceAfter: balance };
    });

    if (!requiresApproval && customer.contact?.phone && customer.contact?.orgId) {
      await dispatchLoyaltyNotification(customer.contact.orgId, LoyaltyEventType.REWARD_REDEEMED, {
        customerPhone: customer.contact.phone,
        customerName: customer.contact.name || "Customer",
        rewardName: reward.name,
        redemptionCode: redemptionCode,
        points: -reward.pointsCost,
        balanceAfter,
        rewardId: reward.id,
        rewardWaTemplateId: reward.waTemplateId,
      });
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
    const exists = await prisma.customerReward.findUnique({
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

  const { redemption, balanceAfter } = await prisma.$transaction(async (tx) => {
    await tx.customerReward.upsert({
      where: {
        rewardId_accountId: {
          rewardId: reward.id,
          accountId: customer.id,
        },
      },
      create: {
        rewardId: reward.id,
        accountId: customer.id,
        shortCode,
        status: requiresApproval ? "ISSUED" : "REDEEMED",
      },
      update: {
        shortCode,
        ...(requiresApproval ? {} : { status: "REDEEMED" as const }),
      },
    });

    let transaction;
    let balance = customer.currentPoints;

    if (requiresApproval) {
      // Pending approval - no points deducted yet
      transaction = await tx.loyaltyTransaction.create({
        data: {
          accountId: customer.id,
          programId,
          transactionType: "redeem",
          source: "reward_redemption",
          points: 0,
          balanceAfter: balance,
          description: data.notes || `Pending: ${reward.name}`,
          metadata: {
            rewardId: reward.id,
            rewardName: reward.name,
            redemptionCode,
            shortCode,
            status: "pending_approval",
            redemptionType: reward.rewardType,
          },
        },
      });
    } else {
      const account = await moveBalance(tx, customer.id, reward.pointsCost, -reward.pointsCost);
      balance = account.currentPoints;

      transaction = await tx.loyaltyTransaction.create({
        data: {
          accountId: customer.id,
          programId,
          transactionType: "redeem",
          source: "reward_redemption",
          points: -reward.pointsCost,
          balanceAfter: balance,
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
    }

    const created = await tx.loyaltyRedemption.create({
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

    if (!requiresApproval) {
      await burnStock(tx, reward);
    }

    return { redemption: created, balanceAfter: balance };
  });

  if (!requiresApproval && customer.contact?.phone && customer.contact?.orgId) {
    await dispatchLoyaltyNotification(customer.contact.orgId, LoyaltyEventType.REWARD_ISSUED, {
      customerPhone: customer.contact.phone,
      customerName: customer.contact.name || "Customer",
      rewardName: reward.name,
      redemptionCode: shortCode,
      points: -reward.pointsCost,
      balanceAfter,
      rewardId: reward.id,
      rewardWaTemplateId: reward.waTemplateId,
    });
  }

  return {
    redemption,
    message: requiresApproval
      ? "Redemption pending approval"
      : `Reward assigned successfully. Short code: ${shortCode}`,
    redemptionCode,
    shortCode,
  };
}

async function burnStock(tx: Tx, reward: { id: string; stockQuantity: number | null }) {
  if (reward.stockQuantity === null) return;

  await tx.loyaltyReward.update({
    where: { id: reward.id },
    data: {
      stockRedeemed: {
        increment: 1,
      },
    },
  });
}

function ownedByOrg(orgId: string) {
  return { account: { program: { orgId } } };
}

export async function verifyRedemption(redemptionCode: string, orgId: string) {
  const redemption = await prisma.loyaltyRedemption.findFirst({
    where: { redemptionCode, ...ownedByOrg(orgId) },
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
    throw new LoyaltyError("VOUCHER_NOT_FOUND", "Redemption not found");
  }

  return {
    redemption,
    valid: redemption.status === "APPROVED" && !redemption.usedAt,
    account: redemption.account,
    reward: redemption.reward,
  };
}

export async function applyRedemption(data: ApplyRedemptionInput, orgId: string) {
  const redemption = await prisma.loyaltyRedemption.findFirst({
    where: { redemptionCode: data.redemptionCode, ...ownedByOrg(orgId) },
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
    throw new LoyaltyError("VOUCHER_NOT_FOUND", "Redemption not found");
  }

  if (redemption.status !== "APPROVED") {
    throw new LoyaltyError("VOUCHER_NOT_APPROVED", "Redemption is not approved");
  }

  if (redemption.usedAt) {
    throw new LoyaltyError("VOUCHER_ALREADY_USED", "Redemption already applied");
  }

  const updated = await prisma.$transaction(async (tx) => {
    let used;
    try {
      used = await tx.loyaltyRedemption.update({
        where: { id: redemption.id, usedAt: null },
        data: {
          status: "USED",
          usedAt: new Date(),
          usedContext: {
            ...redemption.usedContext,
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
    } catch (error) {
      if (isRecordNotFound(error)) {
        throw new LoyaltyError("VOUCHER_ALREADY_USED", "Redemption already applied");
      }
      throw error;
    }

    // For coupon redemptions there is no CustomerReward involved.
    // For regular rewards, mark the assignment REDEEMED.
    if (redemption.reward.rewardType !== "coupon") {
      const shortCode = redemption.usedContext?.shortCode;
      if (shortCode) {
        await tx.customerReward.update({
          where: { shortCode },
          data: {
            status: "REDEEMED",
          },
        });
      }
    }

    return used;
  });

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

export async function getRedemptionsByCustomer(customerId: string, orgId: string) {
  return await prisma.loyaltyRedemption.findMany({
    where: { accountId: customerId, ...ownedByOrg(orgId) },
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
    /** An order number, as stored on the row's `referenceId`. */
    referenceId?: string;
    /**
     * The key a caller sent on a write. Searching by it is how a client that lost the
     * reply finds out whether the write landed, without risking a second one.
     */
    idempotencyKey?: string;
    page?: number;
    limit?: number;
  },
) {
  const where: Prisma.LoyaltyTransactionWhereInput = { programId };

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

  if (filters.referenceId) {
    where.referenceId = filters.referenceId;
  }

  if (filters.idempotencyKey) {
    where.idempotencyKey = filters.idempotencyKey;
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

  const page = Math.max(1, filters.page || 1);
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
  const where: Prisma.LoyaltyTransactionWhereInput = { programId };

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

  const rows = await prisma.loyaltyTransaction.findMany({
    where,
    include: {
      account: {
        include: {
          contact: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: EXPORT_LIMIT + 1,
  });

  if (rows.length > EXPORT_LIMIT) {
    throw new Error(
      `This export covers more than ${EXPORT_LIMIT} transactions. Narrow the date range or filters and try again.`,
    );
  }

  return rows;
}
