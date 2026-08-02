import { Prisma } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { validateRedemption, generateRedemptionCode } from "../redemptionValidator.js";
import { generateRewardShortCode } from "../../../utils/misc/random.utils.js";
import { ApplyRedemptionInput, RedeemRewardInput } from "../accounts/account.schema.js";
import { dispatchLoyaltyNotification } from "../loyaltyWaDispatcher.js";
import { LoyaltyEventType } from "../../../types/enums.js";

/**
 * A transaction client — what `prisma.$transaction(async (tx) => …)` hands the
 * callback. Everything a redemption writes goes through one of these.
 */
type Tx = Prisma.TransactionClient;

/** The most transactions one export may cover. See issues.txt 20.22. */
const EXPORT_LIMIT = 50_000;

function isRecordNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2025";
}

/**
 * Moves an account's balance by `delta`, but only if it still holds at least
 * `cost` points, and returns the row as it now stands.
 *
 * The guard is the WRITE's own condition rather than a read taken beforehand. It
 * used to be the latter: `customer.currentPoints < reward.pointsCost` was checked
 * at the top of redeemReward and the write underneath was an unconditional
 * `decrement`, with no row lock and no transaction. Two redemptions racing on one
 * account both passed the check and both deducted, so the balance went negative
 * and the reward was issued twice. Postgres will not apply two conflicting
 * updates to one row concurrently, so making the balance part of the condition is
 * what actually settles the race.
 *
 * `update` with a non-unique filter alongside the id raises P2025 when nothing
 * matches, which is the same shape used for the org guards elsewhere in this
 * codebase. Returning the updated row is also what makes `balanceAfter` truthful:
 * it is read from the write's result rather than recomputed from a stale read.
 * See issues.txt 20.17 and 20.15.
 */
async function moveBalance(tx: Tx, accountId: string, cost: number, delta: number) {
  try {
    return await tx.customerLoyaltyAccount.update({
      where: { id: accountId, currentPoints: { gte: cost } },
      data: { currentPoints: { increment: delta } },
    });
  } catch (error) {
    if (isRecordNotFound(error)) {
      throw new Error(`Insufficient points. Required: ${cost}`);
    }
    throw error;
  }
}

export async function redeemReward(programId: string, data: RedeemRewardInput) {
  // Both subjects are resolved WITHIN the caller's program. The program comes from
  // the session in redeemRewardHandler, so this is the org guard: an account id or
  // a reward id belonging to another org reads as absent rather than as forbidden,
  // which is how the rest of the codebase answers the same question.
  // See issues.txt 20.20.
  const customer = await prisma.customerLoyaltyAccount.findFirst({
    where: { id: data.customerId, programId },
    include: {
      contact: true,
      currentTier: true,
    },
  });

  if (!customer) {
    throw new Error("Customer account not found");
  }

  const reward = await prisma.loyaltyReward.findFirst({
    where: { id: data.rewardId, programId },
  });

  if (!reward) {
    throw new Error("Reward not found");
  }

  // Check if customer has enough points (skip for assigned type rewards)
  if (reward.rewardType !== "assigned" && customer.currentPoints < reward.pointsCost) {
    throw new Error(
      `Insufficient points. Required: ${reward.pointsCost}, Available: ${customer.currentPoints}`,
    );
  }

  // Validate redemption using validator
  const validation = await validateRedemption(customer.id, data.rewardId, {
    locationId: data.locationId,
  });

  if (!validation.valid) {
    throw new Error(`Redemption validation failed: ${validation.violations.join(", ")}`);
  }

  // Handle different reward types

  // TYPE 1: POINT REWARDS - Add points instantly and mark as used
  if (reward.rewardType === "point") {
    const pointsToAdd = Number((reward.rewardValue as { points?: number })?.points) || 0;

    // The code used to be `"INSTANT_" + Date.now().toString(36)`: fully
    // predictable, and two point redemptions in the same millisecond collided on a
    // unique column. See issues.txt 20.9.
    const instantRedemptionCode = await generateRedemptionCode();

    const { redemption, balanceAfter } = await prisma.$transaction(async (tx) => {
      // The balance moves first, so the ledger row can record where it landed
      // rather than where it was assumed to land. The old row recorded
      // `currentPoints - pointsCost` while the balance actually moved by
      // `pointsToAdd - pointsCost`, understating by exactly the points the
      // redemption had just granted. See issues.txt 20.15.
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

  // Both branches now write a LoyaltyRedemption, and the customer's assignment is
  // resolved BEFORE anything is deducted. What used to happen:
  //
  //   (a) When the reward required approval, the branch wrote a zero-point ledger
  //       row and nothing else — the LoyaltyRedemption create sat in the `else`.
  //       The function still handed the caller a redemptionCode, but that code
  //       existed nowhere: verifyRedemption answered "Redemption not found",
  //       applyRedemption could not find it, and the approvals queue — which lists
  //       by `account.programId` and joins `redemption` — had no request to act on.
  //       A pending redemption of a regular reward was silently lost.
  //
  //   (b) When it did not, the points were taken and the ledger row written, and
  //       only THEN did it call `customerReward.update({ rewardId_accountId })` —
  //       a row that exists only if the reward had been assigned to that customer
  //       beforehand. For a regular reward that never was, prisma raised P2025
  //       there, leaving the customer charged for a reward they did not receive,
  //       with no redemption record to trace it and nothing to roll it back.
  //
  // The upsert covers both shapes this path is asked to handle: a reward already
  // assigned to the customer (the "assigned" type) and one being taken for the
  // first time. See issues.txt 20.19.
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

/**
 * Counts one unit of a reward's stock against it, if it tracks stock at all.
 *
 * It is called ONCE per redemption, here — at the point the redemption is
 * approved, which is also the point the validator checked the stock. It used to be
 * called a second time by applyRedemption when the cashier presented the code, so
 * every reward that was redeemed and then presented consumed two units and a
 * reward limited to 100 sold out after 50. See issues.txt 20.21.
 */
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

/**
 * The org filter on the three lookups below.
 *
 * A redemption code is a bearer token for a discount, and these lookups used to
 * take one on its own authority: a cashier in any org could verify — and then mark
 * USED — a redemption belonging to any other, consuming that customer's reward and
 * a unit of that org's stock. With the entropy the codes used to carry
 * (issues.txt 20.9) they did not have to be leaked to be found.
 *
 * The path is the same one getRewardByShortCode already scopes through.
 * See issues.txt 20.20.
 */
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
    throw new Error("Redemption not found");
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
    throw new Error("Redemption not found");
  }

  if (redemption.status !== "APPROVED") {
    throw new Error("Redemption is not approved");
  }

  if (redemption.usedAt) {
    throw new Error("Redemption already applied");
  }

  // Stock is NOT touched here. redeemReward already counted this redemption
  // against the reward when it approved it — incrementing again at the till was
  // what made every redeemed-then-presented reward consume two units of stock.
  // See issues.txt 20.21.
  //
  // `usedAt: null` is part of the write's own condition rather than only the read
  // above it, so two cashiers scanning the same short code at the same moment
  // cannot both get past the already-applied check. See issues.txt 20.17.
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
        throw new Error("Redemption already applied");
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

  if (filters.minPoints !== undefined || filters.maxPoints !== undefined) {
    where.points = {};
    if (filters.minPoints !== undefined) {
      where.points.gte = filters.minPoints;
    }
    if (filters.maxPoints !== undefined) {
      where.points.lte = filters.maxPoints;
    }
  }

  // Paging here is ONE-based, deliberately and now explicitly: page 1 is the first
  // page. That is this module's convention in both of its list endpoints, and it
  // is the one its clients already send.
  //
  // What was wrong was not the convention but the silence at this layer.
  // `filters.page || 1` swallowed a page of 0 rather than surfacing it, so a
  // zero-based caller asking for page 0 and page 1 received the SAME first page
  // and could never reach the last one. Over HTTP the schema already refuses
  // anything below 1 (redemption.schema.ts), which is where a client learns it is
  // using the wrong convention; this clamp is the backstop for direct callers.
  // See issues.txt 20.22.
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

  // Bounded. An unfiltered export used to materialise a program's entire ledger —
  // every transaction ever written for every customer — into memory and then into
  // a spreadsheet, which is the same shape as issues.txt 18.20 and 19.6. The cap is
  // deliberately far above any plausible real export and far below "the whole
  // table"; a caller that hits it is told, rather than silently handed a truncated
  // file. See issues.txt 20.22.
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
