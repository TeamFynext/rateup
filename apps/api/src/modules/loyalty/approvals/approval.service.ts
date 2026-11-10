import {
  CreateApprovalRequestInput,
  GetApprovalRequestsInput,
  ApproveRequestInput,
  RejectRequestInput,
  CancelRequestInput,
} from "./approval.schema.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { syncRedemptionDiscount } from "../../integrations/commerce/discounts.js";

/** Every approver is handed the row with its account (and contact/tier) already joined. */
const approvalWithAccount = {
  account: {
    include: {
      contact: memberContactInclude,
      currentTier: true,
    },
  },
  redemption: {
    include: {
      reward: true,
    },
  },
  transaction: true,
} satisfies Prisma.ApprovalRequestInclude;

/** The account's contact keeps its old `phone`/`email`/... keys, read from its identities. */
function presentApproval<T extends { account: Parameters<typeof withMemberContact>[0] }>(row: T) {
  return { ...row, account: withMemberContact(row.account) };
}

type ApprovalWithAccount = ReturnType<
  typeof presentApproval<Prisma.ApprovalRequestGetPayload<{ include: typeof approvalWithAccount }>>
>;
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { sendLoyaltyEvent } from "../messaging/send.js";
import { LoyaltyEventType } from "../../../types/enums.js";
import { notify } from "../../settings/notifications/notify.js";
import { announceLoyaltyTransactions } from "../loyalty.webhooks.js";
import { LoyaltyError } from "../loyalty.errors.js";
import { memberContactInclude, withMemberContact } from "../memberContact.js";

/**
 * Create a new approval request
 */
export async function createApprovalRequest(
  data: CreateApprovalRequestInput,
  /**
   * The caller's programme. When given, the account — and any redemption or transaction
   * the request points at — must belong to it, so a request cannot be filed into another
   * org's queue (where one approver's click would credit the points).
   */
  programId?: string,
) {
  try {
    if (programId !== undefined) {
      await assertApprovalTargetsInProgram(data, programId);
    }
    const created = await prisma.approvalRequest.create({
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
            contact: memberContactInclude,
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
    const approval = presentApproval(created);

    log.info(`Created approval request ${approval.id} for account ${data.accountId}`);
    const program = await prisma.loyaltyProgram.findUnique({
      where: { id: approval.account.programId },
      select: { orgId: true },
    });
    if (program) {
      await notify({
        event: "loyalty.approval_requested",
        orgId: program.orgId,
        audience: { kind: "permitted" },
        data: {
          approvalId: approval.id,
          customerName: approval.account.contact.name ?? approval.account.contact.phone ?? "",
          requestType: approval.requestType,
        },
        actorUserId: data.requestedBy,
      });
    }
    return approval;
  } catch (error) {
    log.error({ err: error }, "Error creating approval request:");
    throw error;
  }
}

async function assertApprovalTargetsInProgram(data: CreateApprovalRequestInput, programId: string) {
  const account = await prisma.customerLoyaltyAccount.findFirst({
    where: { id: data.accountId, programId },
    select: { id: true },
  });
  if (!account) throw new LoyaltyError("MEMBER_NOT_FOUND", "Customer account not found");

  if (data.redemptionId) {
    const redemption = await prisma.loyaltyRedemption.findFirst({
      where: { id: data.redemptionId, accountId: data.accountId },
      select: { id: true },
    });
    if (!redemption) throw new LoyaltyError("MEMBER_NOT_FOUND", "Redemption not found");
  }
  if (data.transactionId) {
    const transaction = await prisma.loyaltyTransaction.findFirst({
      where: { id: data.transactionId, accountId: data.accountId },
      select: { id: true },
    });
    if (!transaction) throw new LoyaltyError("MEMBER_NOT_FOUND", "Transaction not found");
  }
}

/**
 * Get approval requests with filters
 */
export async function getApprovalRequests(programId: string, filters: GetApprovalRequestsInput) {
  try {
    const { status, requestType, accountId, fromDate, toDate, page = 1, limit = 20 } = filters;

    const where: Prisma.ApprovalRequestWhereInput = {
      account: {
        programId,
      },
    };

    if (status) {
      where.status = status;
    }

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
              contact: memberContactInclude,
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
        skip: (Math.max(1, page) - 1) * limit,
        take: limit,
      }),
      prisma.approvalRequest.count({ where }),
    ]);

    return {
      approvals: approvals.map(presentApproval),
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
export async function getApprovalRequestById(approvalId: string, programId: string) {
  try {
    const approval = await prisma.approvalRequest.findFirst({
      where: { id: approvalId, account: { programId } },
      include: {
        account: {
          include: {
            contact: memberContactInclude,
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

    return presentApproval(approval);
  } catch (error) {
    log.error({ err: error }, "Error getting approval request:");
    throw error;
  }
}

/**
 * Approve a request - handles all approval types
 */
export async function approveApprovalRequest(data: ApproveRequestInput, programId: string) {
  try {
    const approval = await getApprovalRequestById(data.approvalId, programId);

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
export async function rejectApprovalRequest(data: RejectRequestInput, programId: string) {
  try {
    const approval = await getApprovalRequestById(data.approvalId, programId);

    if (approval.status !== "PENDING") {
      throw new Error(`Approval request is not pending (current status: ${approval.status})`);
    }

    return await prisma.$transaction(async (tx) => {
      // Update approval status
      const updatedApproval = await tx.approvalRequest.update({
        // Only a request still PENDING moves; a concurrent decision makes this throw and
        // rolls the transaction back.
        where: { id: data.approvalId, status: "PENDING" },
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
              contact: memberContactInclude,
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
      return presentApproval(updatedApproval);
    });
  } catch (error) {
    log.error({ err: error }, "Error rejecting request:");
    throw error;
  }
}

/**
 * Cancel an approval request
 */
export async function cancelApprovalRequest(data: CancelRequestInput, programId: string) {
  try {
    const approval = await getApprovalRequestById(data.approvalId, programId);

    if (approval.status !== "PENDING") {
      throw new Error(`Approval request is not pending (current status: ${approval.status})`);
    }

    return await prisma.$transaction(async (tx) => {
      const updatedApproval = await tx.approvalRequest.update({
        // Only a request still PENDING moves; a concurrent decision makes this throw and
        // rolls the transaction back.
        where: { id: data.approvalId, status: "PENDING" },
        data: {
          status: "CANCELLED",
          reviewedBy: data.reviewerId,
          reviewedByName: data.reviewerName,
          reviewedAt: new Date(),
          reviewNotes: data.reason,
        },
        include: {
          account: {
            include: {
              contact: memberContactInclude,
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
      return presentApproval(updatedApproval);
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
async function approveRedemption(approval: ApprovalWithAccount, data: ApproveRequestInput) {
  const approved = await prisma.$transaction(async (tx) => {
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
        transactionType: "redeem",
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

    // 2. Update customer points — only while the balance still covers the cost, so two
    // redemptions approved at once cannot take the balance below zero.
    await tx.customerLoyaltyAccount.update({
      where: { id: approval.accountId, currentPoints: { gte: redemption.reward.pointsCost } },
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
      // The PENDING check that matters: it runs under the row lock, inside the
      // transaction, so a second approval of the same request (double click, two
      // reviewers) throws here and rolls back its ledger row and balance change.
      where: { id: approval.id, status: "PENDING" },
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
            contact: memberContactInclude,
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
      await sendLoyaltyEvent(
        approval.account.contact.orgId,
        LoyaltyEventType.REWARD_REDEEMED,
        { accountId: approval.accountId },
        {
          name: approval.account.contact.name || "Customer",
          rewardName: redemption.reward.name,
          code: redemption.redemptionCode,
          cost: redemption.reward.pointsCost,
        },
        { rewardWaTemplateId: redemption.reward.waTemplateId },
      );
    }

    return presentApproval(updatedApproval);
  });

  // Outside the transaction on purpose: this is an HTTP call to Shopify, and making one
  // while holding a Postgres connection is how a slow shop turns into pool exhaustion.
  // The approval is already committed, so a failure here only leaves the code cashier-only
  // (recorded on the redemption as `storeDiscountError`).
  if (approval.redemptionId) {
    await syncRedemptionDiscount(approval.redemptionId);
  }

  announceApprovedTransaction(approval, approved.transaction);
  return approved;
}

/** The ledger row an approval wrote, to the org's webhook — called once its transaction committed. */
function announceApprovedTransaction(
  approval: ApprovalWithAccount,
  transaction: Parameters<typeof announceLoyaltyTransactions>[1][number],
) {
  void announceLoyaltyTransactions(approval.account?.contact?.orgId, [transaction], {
    phone: approval.account?.contact?.phone ?? null,
    cardCode: approval.account?.cardCode ?? null,
  });
}

/**
 * Approve a points adjustment (add or deduct)
 */
async function approvePointsAdjustment(approval: ApprovalWithAccount, data: ApproveRequestInput) {
  const approved = await prisma.$transaction(async (tx) => {
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
        transactionType: "adjust",
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
        where: { id: approval.accountId, currentPoints: { gte: Math.abs(points) } },
        data: {
          currentPoints: { decrement: Math.abs(points) },
        },
      });
    }

    // 3. Update approval
    const updatedApproval = await tx.approvalRequest.update({
      // The PENDING check that matters: it runs under the row lock, inside the
      // transaction, so a second approval of the same request (double click, two
      // reviewers) throws here and rolls back its ledger row and balance change.
      where: { id: approval.id, status: "PENDING" },
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
            contact: memberContactInclude,
            currentTier: true,
          },
        },
        transaction: true,
      },
    });

    log.info(`Approved points adjustment for account ${approval.accountId}: ${points} points`);

    if (approval.account?.contact?.phone && approval.account?.contact?.orgId) {
      await sendLoyaltyEvent(
        approval.account.contact.orgId,
        LoyaltyEventType.POINTS_ADJUSTED,
        { accountId: approval.accountId },
        {
          name: approval.account.contact.name || "Customer",
          points,
          balance: customer.currentPoints + points,
        },
      );
    }

    return presentApproval(updatedApproval);
  });

  announceApprovedTransaction(approval, approved.transaction);
  return approved;
}

/**
 * Approve a tier override
 */
async function approveTierOverride(approval: ApprovalWithAccount, data: ApproveRequestInput) {
  return await prisma.$transaction(async (tx) => {
    const requestData = approval.requestData;

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
      // The PENDING check that matters: it runs under the row lock, inside the
      // transaction, so a second approval of the same request (double click, two
      // reviewers) throws here and rolls back its ledger row and balance change.
      where: { id: approval.id, status: "PENDING" },
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
            contact: memberContactInclude,
            currentTier: true,
          },
        },
      },
    });

    log.info(
      `Approved tier override for account ${approval.accountId} to tier ${requestData.newTierId}`,
    );

    if (approval.account?.contact?.phone && approval.account?.contact?.orgId) {
      await sendLoyaltyEvent(
        approval.account.contact.orgId,
        LoyaltyEventType.TIER_UPGRADED,
        { accountId: approval.accountId },
        {
          name: approval.account.contact.name || "Customer",
          tier: customer.currentTier?.name || "New Tier",
        },
      );
    }

    return presentApproval(updatedApproval);
  });
}

/**
 * Approve an account suspension
 */
async function approveAccountSuspension(approval: ApprovalWithAccount, data: ApproveRequestInput) {
  return await prisma.$transaction(async (tx) => {
    // Suspend account
    await tx.customerLoyaltyAccount.update({
      where: { id: approval.accountId },
      data: {
        status: "suspended",
      },
    });

    // Update approval
    const updatedApproval = await tx.approvalRequest.update({
      // The PENDING check that matters: it runs under the row lock, inside the
      // transaction, so a second approval of the same request (double click, two
      // reviewers) throws here and rolls back its ledger row and balance change.
      where: { id: approval.id, status: "PENDING" },
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
            contact: memberContactInclude,
            currentTier: true,
          },
        },
      },
    });

    log.info(`Approved account suspension for account ${approval.accountId}`);
    return presentApproval(updatedApproval);
  });
}

/**
 * Approve an account reactivation
 */
async function approveAccountReactivation(
  approval: ApprovalWithAccount,
  data: ApproveRequestInput,
) {
  return await prisma.$transaction(async (tx) => {
    // Reactivate account
    await tx.customerLoyaltyAccount.update({
      where: { id: approval.accountId },
      data: {
        status: "active",
      },
    });

    // Update approval
    const updatedApproval = await tx.approvalRequest.update({
      // The PENDING check that matters: it runs under the row lock, inside the
      // transaction, so a second approval of the same request (double click, two
      // reviewers) throws here and rolls back its ledger row and balance change.
      where: { id: approval.id, status: "PENDING" },
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
            contact: memberContactInclude,
            currentTier: true,
          },
        },
      },
    });

    log.info(`Approved account reactivation for account ${approval.accountId}`);
    return presentApproval(updatedApproval);
  });
}

async function approveBulkOperation(approval: ApprovalWithAccount, _data: ApproveRequestInput) {
  log.warn(
    { approvalId: approval.id },
    "Refused to approve a bulk operation: no processing is implemented behind it",
  );
  throw new Error(
    "Bulk operations cannot be approved: the processing behind them is not implemented.",
  );
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
