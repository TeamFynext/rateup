import type { Prisma } from "../../generated/prisma/client.js";
import prisma from "../../utils/prisma.js";
import { currentPeriodStart, isSamePeriod, periodKey } from "./billingPeriod.js";

/**
 * Counts one placed shop order against the month, returning the month's total so far.
 *
 * Takes the placement's transaction so a placement refused after counting rolls the count
 * back with it; the upsert's row lock also serialises concurrent placements, so the total
 * each one sees is exact. Call it last in the transaction: every message send updates the
 * same UsageStats row, and the lock is held until commit.
 */
export async function countPlacedOrder(
  tx: Prisma.TransactionClient,
  orgId: string,
  at: Date = new Date(),
): Promise<number> {
  const period = periodKey(currentPeriodStart(at));
  // A counter left over from last month restarts at 1 instead of adding to it.
  const [usage] = await tx.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "UsageStats" ("orgId", "updatedAt", "shopOrdersCount", "shopOrdersPeriodStart")
    VALUES (${orgId}::uuid, now(), 1, ${period}::date)
    ON CONFLICT ("orgId") DO UPDATE SET
      "shopOrdersCount" = CASE
        WHEN "UsageStats"."shopOrdersPeriodStart" = ${period}::date
          THEN "UsageStats"."shopOrdersCount" + 1
        ELSE 1
      END,
      "shopOrdersPeriodStart" = ${period}::date,
      "updatedAt" = now()
    RETURNING "shopOrdersCount" AS count
  `;
  return usage.count;
}

/** Shop orders placed this calendar month. */
export async function shopOrdersThisMonth(orgId: string): Promise<number> {
  const usage = await prisma.usageStats.findUnique({
    where: { orgId },
    select: { shopOrdersCount: true, shopOrdersPeriodStart: true },
  });
  return isSamePeriod(usage?.shopOrdersPeriodStart, currentPeriodStart())
    ? (usage?.shopOrdersCount ?? 0)
    : 0;
}
