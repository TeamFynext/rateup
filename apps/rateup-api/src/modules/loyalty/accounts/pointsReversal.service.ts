import type { Prisma } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { LoyaltyEventType } from "../../../types/enums.js";
import { checkAndUpgradeTier } from "../earningRulesEngine.js";
import { dispatchLoyaltyNotification } from "../loyaltyWaDispatcher.js";

/**
 * Taking back the points an order earned, when that order stops being a sale.
 *
 * This exists because the Shopify bridge used to do it by hand, and got four things wrong
 * that are easy to get wrong again:
 *
 * 1. It decremented points but **not `totalSpend`**, so a cancelled order kept counting
 *    towards tier thresholds forever. The member stayed Gold on money they were refunded.
 * 2. It wrote `balanceAfter` from a balance it had read *before* the update, so the figure
 *    was wrong whenever anything else touched the account in between.
 * 3. The account update and the ledger insert were two separate writes, so a crash between
 *    them left the balance and its own audit trail disagreeing.
 * 4. It never re-ran tier evaluation, so nobody ever moved back down.
 *
 * The reversal row carries a negative typed `purchaseAmount`, which is what lets the
 * rolling-window tier query net it off against the original purchase — see
 * `tiers/qualifyingSpend.ts`, where the filter is "rows that carry a purchase amount"
 * rather than "earn rows" for exactly this reason.
 */

export type ReversalSource = "order_cancelled" | "order_refunded" | "manual";

export interface ReversePurchaseInput {
  programId: string;
  accountId: string;
  /** `idempotencyKey` of the earn row being reversed — the precise way to find it. */
  originalIdempotencyKey?: string;
  /** Fallback for rows written before keys existed: the order id in `referenceId`/metadata. */
  orderId?: string;
  /** Key for the reversal row itself, so a redelivered cancellation reverses once. */
  idempotencyKey: string;
  source: ReversalSource;
  reason: string;
  /** Org that owns the account, for the notification. Skipped when absent. */
  orgId?: string;
}

export type ReversalResult =
  | {
      status: "reversed";
      pointsRevoked: number;
      /** Points the original award earned that were already spent and could not be taken back. */
      shortfallPoints: number;
      amountReversed: number;
      balanceAfter: number;
      transactionId: string;
    }
  | { status: "already_reversed"; transactionId: string }
  | { status: "no_original" };

/** The earn row this reversal undoes, by key if we have one and by order id otherwise. */
async function findOriginal(
  tx: Prisma.TransactionClient,
  input: ReversePurchaseInput,
): Promise<{ id: string; points: number; purchaseAmount: unknown; metadata: unknown } | null> {
  if (input.originalIdempotencyKey) {
    const byKey = await tx.loyaltyTransaction.findUnique({
      where: {
        programId_idempotencyKey: {
          programId: input.programId,
          idempotencyKey: input.originalIdempotencyKey,
        },
      },
      select: { id: true, points: true, purchaseAmount: true, metadata: true },
    });
    if (byKey) return byKey;
  }

  if (!input.orderId) return null;

  // Pre-key rows. `referenceId` is indexed; the metadata probe is the older shape and is
  // kept only until those rows age out.
  return await tx.loyaltyTransaction.findFirst({
    where: {
      programId: input.programId,
      accountId: input.accountId,
      transactionType: "earn",
      OR: [
        { referenceId: input.orderId },
        { metadata: { path: ["orderId"], equals: input.orderId } },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, points: true, purchaseAmount: true, metadata: true },
  });
}

export async function reversePurchasePoints(input: ReversePurchaseInput): Promise<ReversalResult> {
  const outcome = await prisma.$transaction(async (tx) => {
    const already = await tx.loyaltyTransaction.findUnique({
      where: {
        programId_idempotencyKey: {
          programId: input.programId,
          idempotencyKey: input.idempotencyKey,
        },
      },
      select: { id: true },
    });
    if (already) {
      return { status: "already_reversed" as const, transactionId: already.id };
    }

    const original = await findOriginal(tx, input);
    if (!original || original.points <= 0) {
      return { status: "no_original" as const };
    }

    // Lock the row before reading the balance we are about to base arithmetic on, so a
    // concurrent award cannot land between the read and the write.
    const locked = await tx.$queryRaw<
      { currentPoints: number; totalSpend: string }[]
    >`SELECT "currentPoints", "totalSpend" FROM "CustomerLoyaltyAccount" WHERE "id" = ${input.accountId}::uuid FOR UPDATE`;
    const current = locked[0];
    if (!current) return { status: "no_original" as const };

    // Clamp rather than allow a negative balance: the member may have already spent these
    // points, and a negative balance breaks redemption arithmetic and reads as a bug on
    // their card. The gap is recorded instead, so the shop can see what happened.
    const pointsRevoked = Math.min(original.points, Number(current.currentPoints));
    const shortfallPoints = original.points - pointsRevoked;

    const meta = (original.metadata ?? {}) as { purchaseAmount?: number };
    const originalAmount = Number(original.purchaseAmount ?? meta.purchaseAmount ?? 0);
    const amountReversed = Math.min(
      Number.isFinite(originalAmount) ? originalAmount : 0,
      Number(current.totalSpend),
    );

    const account = await tx.customerLoyaltyAccount.update({
      where: { id: input.accountId },
      data: {
        currentPoints: { decrement: pointsRevoked },
        lifetimePoints: { decrement: pointsRevoked },
        // The half the hand-written version forgot.
        totalSpend: { decrement: amountReversed },
      },
    });

    const row = await tx.loyaltyTransaction.create({
      data: {
        accountId: input.accountId,
        programId: input.programId,
        transactionType: "adjust",
        // The channel belongs in metadata; `source` is what the spend queries group on.
        source: "purchase_reversal",
        points: -pointsRevoked,
        balanceAfter: account.currentPoints,
        purchaseAmount: -amountReversed,
        idempotencyKey: input.idempotencyKey,
        referenceId: input.orderId ?? null,
        metadata: {
          purchaseAmount: -amountReversed,
          orderId: input.orderId,
          originalTxnId: original.id,
          channel: input.source,
          reason: input.reason,
          shortfallPoints,
        },
      },
    });

    return {
      status: "reversed" as const,
      pointsRevoked,
      shortfallPoints,
      amountReversed,
      balanceAfter: account.currentPoints,
      transactionId: row.id,
      totalSpendAfter: Number(account.totalSpend),
    };
  });

  if (outcome.status !== "reversed") return outcome;

  // Outside the transaction, like `awardPoints`: neither of these should be able to roll
  // the reversal back.
  // Judged on the spend as it stands after the decrement. On a rolling-window programme
  // this is what lets a member move back down; a lifetime ladder deliberately refuses to
  // demote (it cannot tell a reversal from a manual placement) and answers "none".
  const tierResult = await checkAndUpgradeTier(input.accountId, outcome.totalSpendAfter);

  log.info(
    {
      accountId: input.accountId,
      totalSpend: outcome.totalSpendAfter,
      tierDirection: tierResult?.direction ?? "none",
      tier: tierResult?.currentTier?.name ?? null,
    },
    "Tier re-evaluated after a points reversal",
  );

  if (input.orgId) {
    const account = await prisma.customerLoyaltyAccount.findUnique({
      where: { id: input.accountId },
      select: { contact: { select: { name: true, phone: true } } },
    });
    if (account?.contact?.phone) {
      await dispatchLoyaltyNotification(input.orgId, LoyaltyEventType.POINTS_ADJUSTED, {
        customerPhone: account.contact.phone,
        customerName: account.contact.name || "Customer",
        points: -outcome.pointsRevoked,
        balanceAfter: outcome.balanceAfter,
        reason: input.reason,
      });
    }
  }

  const { totalSpendAfter: _ignored, ...result } = outcome;
  return result;
}
