import dayjs from "dayjs";

import type { Prisma } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * The spend a member's tier is judged on.
 *
 * A programme either judges tiers on lifetime spend (`CustomerLoyaltyAccount.totalSpend`,
 * the legacy behaviour) or on purchase spend inside a trailing window of N months, read
 * from the ledger's typed `purchaseAmount` column. The window is one figure for the whole
 * ladder — every tier is measured against the same spend — which is what lets a member
 * move down when it lapses.
 */

/** The instant `windowMonths` ago; purchases at or after it count. */
export function windowStart(windowMonths: number, now: Date = new Date()): Date {
  return dayjs(now).subtract(windowMonths, "month").toDate();
}

/** Only purchases earn towards a tier — signup, referral and manual adjustments do not. */
function purchaseRowsWhere(
  programId: string,
  windowMonths: number,
): Prisma.LoyaltyTransactionWhereInput {
  return {
    programId,
    transactionType: "earn",
    source: "purchase",
    createdAt: { gte: windowStart(windowMonths) },
  };
}

export async function computeQualifyingSpend(
  accountId: string,
  programId: string,
  windowMonths: number | null,
  db: Db = prisma,
): Promise<number> {
  if (windowMonths === null) {
    const account = await db.customerLoyaltyAccount.findUnique({
      where: { id: accountId },
      select: { totalSpend: true },
    });
    return Number(account?.totalSpend ?? 0);
  }

  const sum = await db.loyaltyTransaction.aggregate({
    _sum: { purchaseAmount: true },
    where: { accountId, ...purchaseRowsWhere(programId, windowMonths) },
  });
  return Number(sum._sum.purchaseAmount ?? 0);
}

/** One query for a batch of members; an id with no purchases in the window maps to 0. */
export async function computeQualifyingSpendBatch(
  programId: string,
  accountIds: string[],
  windowMonths: number,
  db: Db = prisma,
): Promise<Map<string, number>> {
  const spend = new Map<string, number>(accountIds.map((id) => [id, 0]));
  if (accountIds.length === 0) return spend;

  const rows = await db.loyaltyTransaction.groupBy({
    by: ["accountId"],
    _sum: { purchaseAmount: true },
    where: { accountId: { in: accountIds }, ...purchaseRowsWhere(programId, windowMonths) },
  });
  for (const row of rows) {
    spend.set(row.accountId, Number(row._sum.purchaseAmount ?? 0));
  }
  return spend;
}

/**
 * The highest tier whose threshold the spend reaches. `tiersDesc` must be ordered highest
 * threshold first — the order the ladder is loaded in everywhere it is read.
 */
export function pickQualifiedTier<T extends { threshold: unknown }>(
  tiersDesc: readonly T[],
  spend: number,
): T | null {
  return tiersDesc.find((tier) => spend >= Number(tier.threshold)) ?? null;
}
