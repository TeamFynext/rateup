import {
  CreateApprovalRequestInput,
  GetApprovalRequestsInput,
  ApproveRequestInput,
  RejectRequestInput,
  CancelRequestInput,
} from "./approval.schema.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { dispatchLoyaltyNotification } from "../loyaltyWaDispatcher.js";
import { LoyaltyEventType } from "../../../types/enums.js";

/**
 * Create a new approval request
 */
export async function createApprovalRequest(data: CreateApprovalRequestInput) {
  try {
    const approval = await prisma.approvalRequest.create({
      data: {
        requestType: data.requestType,
        accountId: data.accountId,
        points: data.points,
        reason: data.reason,
        requestData: data.requestData || {},
        requestedBy: data.requestedBy,
        requestedByType: data.requestedByType || "CUSTOMER",
        requestedByName: data.requestedByName,
        redemptionId: data.redemptionId,
        transactionId: data.transactionId,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
      include: {
        account: {
          include: {
            contact: true,
            currentTier: true,
          },
        },
        redemption: {
          include: {
            reward: true,
          },
        },
        transaction: true,
      },
    });

    log.info(`Created approval request ${approval.id} for account ${data.accountId}`);
    return approval;
  } catch (error) {
    log.error({ err: error }, "Error creating approval request:");
    throw error;
  }
}

/**
 * Get approval requests with filters
 */
export async function getApprovalRequests(programId: string, filters: GetApprovalRequestsInput) {
  try {
    const { requestType, accountId, fromDate, toDate, page = 1, limit = 20 } = filters;

    const where: any = {
      account: {
        programId,
      },
    };

    // if (status) {
    //   where.status = status;
    // }

    if (requestType) {
      where.requestType = requestType;
    }

    if (accountId) {
      where.accountId = accountId;
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = new Date(fromDate);
      }
      if (toDate) {
        where.createdAt.lte = new Date(toDate);
      }
    }

    const [approvals, total] = await Promise.all([
      prisma.approvalRequest.findMany({
        where,
        include: {
          account: {
            include: {
              contact: true,
              currentTier: true,
            },
          },
          redemption: {
            include: {
              reward: true,
            },
          },
          transaction: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.approvalRequest.count({ where }),
    ]);

    return {
      approvals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    log.error({ err: error }, "Error getting approval requests:");
    throw error;
  }
}

/**
 * Get a single approval request by ID
 */
export async function getApprovalRequestById(approvalId: string) {
  try {
    const approval = await prisma.approvalRequest.findUnique({
      where: { id: approvalId },
      include: {
        account: {
          include: {
            contact: true,
            currentTier: true,
          },
        },
        redemption: {
          include: {
            reward: true,
          },
        },
        transaction: true,
      },
    });

    if (!approval) {
      throw new Error("Approval request not found");
    }

    return approval;
  } catch (error) {
    log.error({ err: error }, "Error getting approval request:");
    throw error;
  }
}

/**
 * Approve a request - handles all approval types
 */
export async function approveApprovalRequest(data: ApproveRequestInput) {
  try {
    const approval = await getApprovalRequestById(data.approvalId);

    if (approval.status !== "PENDING") {
      throw new Error(`Approval request is not pending (current status: ${approval.status})`);
    }

    // Check if expired
    if (approval.expiresAt && approval.expiresAt < new Date()) {
      throw new Error("Approval request has expired");
    }

    // Handle based on request type
    switch (approval.requestType) {
      case "REWARD_REDEMPTION":
        return await approveRedemption(approval, data);
      case "POINTS_ADJUSTMENT":
        return await approvePointsAdjustment(approval, data);
      case "TIER_OVERRIDE":
        return await approveTierOverride(approval, data);
      case "ACCOUNT_SUSPENSION":
        return await approveAccountSuspension(approval, data);
      case "ACCOUNT_REACTIVATION":
        return await approveAccountReactivation(approval, data);
      case "BULK_OPERATION":
        return await approveBulkOperation(approval, data);
      default:
        throw new Error(`Unknown approval request type: ${approval.requestType}`);
    }
  } catch (error) {
    console.log("🚀 ~ approveApprovalRequest ~ error:", error);
    log.error({ err: error }, "Error approving request:");
    throw error;
  }
}

/**
 * Reject an approval request
 */
export async function rejectApprovalRequest(data: RejectRequestInput) {
  try {
    const approval = await getApprovalRequestById(data.approvalId);

    if (approval.status !== "PENDING") {
      throw new Error(`Approval request is not pending (current status: ${approval.status})`);
    }

    return await prisma.$transaction(async (tx) => {
      // Update approval status
      const updatedApproval = await tx.approvalRequest.update({
        where: { id: data.approvalId },
        data: {
          status: "REJECTED",
          reviewedBy: data.reviewerId,
          reviewedByName: data.reviewerName,
          reviewedAt: new Date(),
          reviewNotes: data.reason,
        },
        include: {
          account: {
            include: {
              contact: true,
              currentTier: true,
            },
          },
          redemption: {
            include: {
              reward: true,
            },
          },
        },
      });

      // If it's a redemption, update redemption status
      if (approval.redemptionId) {
        await tx.loyaltyRedemption.update({
          where: { id: approval.redemptionId },
          data: {
            status: "REJECTED",
          },
        });
      }

      log.info(`Rejected approval request ${data.approvalId}`);
      return updatedApproval;
    });
  } catch (error) {
    log.error({ err: error }, "Error rejecting request:");
    throw error;
  }
}

/**
 * Cancel an approval request
 */
export async function cancelApprovalRequest(data: CancelRequestInput) {
  try {
    const approval = await getApprovalRequestById(data.approvalId);

    if (approval.status !== "PENDING") {
      throw new Error(`Approval request is not pending (current status: ${approval.status})`);
    }

    return await prisma.$transaction(async (tx) => {
      const updatedApproval = await tx.approvalRequest.update({
        where: { id: data.approvalId },
        data: {
          status: "CANCELLED",
          reviewNotes: data.reason,
        },
        include: {
          account: {
            include: {
              contact: true,
              currentTier: true,
            },
          },
        },
      });

      // If it's a redemption, update redemption status
      if (approval.redemptionId) {
        await tx.loyaltyRedemption.update({
          where: { id: approval.redemptionId },
          data: {
            status: "CANCELLED",
          },
        });
      }

      log.info(`Cancelled approval request ${data.approvalId}`);
      return updatedApproval;
    });
  } catch (error) {
    log.error({ err: error }, "Error cancelling request:");
    throw error;
  }
}

// ============= Private Helper Functions =============

/**
 * Approve a redemption request
 */
async function approveRedemption(approval: any, data: ApproveRequestInput) {
  return await prisma.$transaction(async (tx) => {
    const customer = await tx.customerLoyaltyAccount.findUnique({
      where: { id: approval.accountId },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    const redemption = await tx.loyaltyRedemption.findUnique({
      where: { id: approval.redemptionId! },
      include: { reward: true },
    });

    if (!redemption) {
      throw new Error("Redemption not found");
    }

    // Check if customer has enough points
    if (customer.currentPoints < redemption.reward.pointsCost) {
      throw new Error("Customer does not have enough points");
    }

    // 1. Create transaction
    const transaction = await tx.loyaltyTransaction.create({
      data: {
        account: {
          connect: { id: approval.accountId },
        },
        program: {
          connect: { id: customer.programId },
        },
        transactionType: "REDEEM",
        points: -redemption.reward.pointsCost,
        balanceAfter: customer.currentPoints - redemption.reward.pointsCost,
        source: "redemption",
        description: `Redeemed: ${redemption.reward.name}`,
        referenceId: redemption.id,
        metadata: {
          rewardId: redemption.reward.id,
          rewardName: redemption.reward.name,
          redemptionCode: redemption.redemptionCode,
          approvalId: approval.id,
          approvedBy: data.reviewerId,
          approverName: data.reviewerName,
        },
      },
    });

    // 2. Update customer points
    await tx.customerLoyaltyAccount.update({
      where: { id: approval.accountId },
      data: {
        currentPoints: {
          decrement: redemption.reward.pointsCost,
        },
      },
    });

    // 3. Update redemption status and link transaction
    await tx.loyaltyRedemption.update({
      where: { id: approval.redemptionId! },
      data: {
        status: "APPROVED",
        transactionId: transaction.id,
      },
    });

    // 4. Update approval status
    const updatedApproval = await tx.approvalRequest.update({
      where: { id: approval.id },
      data: {
        status: "APPROVED",
        reviewedBy: data.reviewerId,
        reviewedByName: data.reviewerName,
        reviewedAt: new Date(),
        reviewNotes: data.notes,
        transactionId: transaction.id,
      },
      include: {
        account: {
          include: {
            contact: true,
            currentTier: true,
          },
        },
        redemption: {
          include: {
            reward: true,
          },
        },
        transaction: true,
      },
    });

    log.info(`Approved redemption ${redemption.id}`);

    if (approval.account?.contact?.phone && approval.account?.contact?.orgId) {
      await dispatchLoyaltyNotification(
        approval.account.contact.orgId,
        LoyaltyEventType.REWARD_REDEEMED,
        {
          customerPhone: approval.account.contact.phone,
          customerName: approval.account.contact.name || "Customer",
          rewardName: redemption.reward.name,
          redemptionCode: redemption.redemptionCode,
          points: -redemption.reward.pointsCost,
          balanceAfter: customer.currentPoints - redemption.reward.pointsCost,
          rewardId: redemption.reward.id,
          rewardWaTemplateId: redemption.reward.waTemplateId,
        },
      );
    }

    return updatedApproval;
  });
}

/**
 * Approve a points adjustment (add or deduct)
 */
async function approvePointsAdjustment(approval: any, data: ApproveRequestInput) {
  return await prisma.$transaction(async (tx) => {
    const customer = await tx.customerLoyaltyAccount.findUnique({
      where: { id: approval.accountId },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    const points = approval.points!;
    const isAddition = points > 0;

    // Validate if deduction
    if (!isAddition && customer.currentPoints < Math.abs(points)) {
      throw new Error("Customer does not have enough points");
    }

    // 1. Create transaction
    const transaction = await tx.loyaltyTransaction.create({
      data: {
        account: {
          connect: { id: approval.accountId },
        },
        program: {
          connect: { id: customer.programId },
        },
        transactionType: "ADJUST",
        points: points,
        balanceAfter: customer.currentPoints + points,
        source: "manual_adjustment",
        description: approval.reason,
        referenceId: `APPROVAL-${approval.id}`,
        metadata: {
          approvalId: approval.id,
          approvedBy: data.reviewerId,
          approverName: data.reviewerName,
          requestedBy: approval.requestedBy,
          requestedByName: approval.requestedByName,
          adjustmentType: isAddition ? "addition" : "deduction",
        },
      },
    });

    // 2. Update customer balance
    if (isAddition) {
      await tx.customerLoyaltyAccount.update({
        where: { id: approval.accountId },
        data: {
          currentPoints: { increment: points },
          lifetimePoints: { increment: points },
        },
      });
    } else {
      await tx.customerLoyaltyAccount.update({
        where: { id: approval.accountId },
        data: {
          currentPoints: { decrement: Math.abs(points) },
        },
      });
    }

    // 3. Update approval
    const updatedApproval = await tx.approvalRequest.update({
      where: { id: approval.id },
      data: {
        status: "APPROVED",
        reviewedBy: data.reviewerId,
        reviewedByName: data.reviewerName,
        reviewedAt: new Date(),
        reviewNotes: data.notes,
        transactionId: transaction.id,
      },
      include: {
        account: {
          include: {
            contact: true,
            currentTier: true,
          },
        },
        transaction: true,
      },
    });

    log.info(`Approved points adjustment for account ${approval.accountId}: ${points} points`);

    if (approval.account?.contact?.phone && approval.account?.contact?.orgId) {
      await dispatchLoyaltyNotification(
        approval.account.contact.orgId,
        LoyaltyEventType.POINTS_ADJUSTED,
        {
          customerPhone: approval.account.contact.phone,
          customerName: approval.account.contact.name || "Customer",
          points: points,
          balanceAfter: customer.currentPoints + points,
          reason: approval.reason,
        },
      );
    }

    return updatedApproval;
  });
}

/**
 * Approve a tier override
 */
async function approveTierOverride(approval: any, data: ApproveRequestInput) {
  return await prisma.$transaction(async (tx) => {
    const requestData = approval.requestData as any;

    // Update customer tier
    const customer = await tx.customerLoyaltyAccount.update({
      where: { id: approval.accountId },
      data: {
        currentTierId: requestData.newTierId,
      },
      include: {
        currentTier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Update approval
    const updatedApproval = await tx.approvalRequest.update({
      where: { id: approval.id },
      data: {
        status: "APPROVED",
        reviewedBy: data.reviewerId,
        reviewedByName: data.reviewerName,
        reviewedAt: new Date(),
        reviewNotes: data.notes,
      },
      include: {
        account: {
          include: {
            contact: true,
            currentTier: true,
          },
        },
      },
    });

    log.info(
      `Approved tier override for account ${approval.accountId} to tier ${requestData.newTierId}`,
    );

    if (approval.account?.contact?.phone && approval.account?.contact?.orgId) {
      await dispatchLoyaltyNotification(
        approval.account.contact.orgId,
        LoyaltyEventType.TIER_UPGRADED,
        {
          customerPhone: approval.account.contact.phone,
          customerName: approval.account.contact.name || "Customer",
          newTier: requestData.newTierId,
          oldTier: customer.currentTier?.name || undefined,
          lifetimePoints: customer.lifetimePoints,
        },
      );
    }

    return updatedApproval;
  });
}

/**
 * Approve an account suspension
 */
async function approveAccountSuspension(approval: any, data: ApproveRequestInput) {
  return await prisma.$transaction(async (tx) => {
    // Suspend account
    await tx.customerLoyaltyAccount.update({
      where: { id: approval.accountId },
      data: {
        status: "SUSPENDED",
      },
    });

    // Update approval
    const updatedApproval = await tx.approvalRequest.update({
      where: { id: approval.id },
      data: {
        status: "APPROVED",
        reviewedBy: data.reviewerId,
        reviewedByName: data.reviewerName,
        reviewedAt: new Date(),
        reviewNotes: data.notes,
      },
      include: {
        account: {
          include: {
            contact: true,
            currentTier: true,
          },
        },
      },
    });

    log.info(`Approved account suspension for account ${approval.accountId}`);
    return updatedApproval;
  });
}

/**
 * Approve an account reactivation
 */
async function approveAccountReactivation(approval: any, data: ApproveRequestInput) {
  return await prisma.$transaction(async (tx) => {
    // Reactivate account
    await tx.customerLoyaltyAccount.update({
      where: { id: approval.accountId },
      data: {
        status: "ACTIVE",
      },
    });

    // Update approval
    const updatedApproval = await tx.approvalRequest.update({
      where: { id: approval.id },
      data: {
        status: "APPROVED",
        reviewedBy: data.reviewerId,
        reviewedByName: data.reviewerName,
        reviewedAt: new Date(),
        reviewNotes: data.notes,
      },
      include: {
        account: {
          include: {
            contact: true,
            currentTier: true,
          },
        },
      },
    });

    log.info(`Approved account reactivation for account ${approval.accountId}`);
    return updatedApproval;
  });
}

/**
 * Approve a bulk operation
 */
async function approveBulkOperation(approval: any, data: ApproveRequestInput) {
  // For bulk operations, just mark as approved
  // The actual bulk processing would be triggered separately
  return await prisma.$transaction(async (tx) => {
    const updatedApproval = await tx.approvalRequest.update({
      where: { id: approval.id },
      data: {
        status: "APPROVED",
        reviewedBy: data.reviewerId,
        reviewedByName: data.reviewerName,
        reviewedAt: new Date(),
        reviewNotes: data.notes,
      },
      include: {
        account: {
          include: {
            contact: true,
            currentTier: true,
          },
        },
      },
    });

    log.info(`Approved bulk operation for account ${approval.accountId}`);
    return updatedApproval;
  });
}

/**
 * Auto-expire pending approval requests
 */
export async function expirePendingRequests() {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Find expired pending requests
      const expiredRequests = await tx.approvalRequest.findMany({
        where: {
          status: "PENDING",
          expiresAt: {
            lte: new Date(),
          },
        },
      });

      // Update them to expired
      await tx.approvalRequest.updateMany({
        where: {
          id: {
            in: expiredRequests.map((r) => r.id),
          },
        },
        data: {
          status: "EXPIRED",
        },
      });

      // Update associated redemptions
      const redemptionIds = expiredRequests
        .filter((r) => r.redemptionId)
        .map((r) => r.redemptionId!);

      if (redemptionIds.length > 0) {
        await tx.loyaltyRedemption.updateMany({
          where: {
            id: {
              in: redemptionIds,
            },
          },
          data: {
            status: "EXPIRED",
          },
        });
      }

      return { expired: expiredRequests.length };
    });

    if (result.expired > 0) {
      log.info(`Expired ${result.expired} pending approval requests`);
    }

    return result;
  } catch (error) {
    log.error({ err: error }, "Error expiring pending requests:");
    throw error;
  }
}
