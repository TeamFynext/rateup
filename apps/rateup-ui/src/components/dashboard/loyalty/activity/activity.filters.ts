import { z } from "zod";

import type { TransactionFilter } from "@/backend/loyalty/redemption/redemption.api";

/**
 * Activity is one page over two tables: the ledger, and the approval requests that will
 * write to it. The filter tabs decide which is shown; `pending` is the approvals, the
 * other three are ledger queries.
 */
export const ACTIVITY_FILTERS = ["all", "pending", "earned", "redeemed"] as const;
export type ActivityFilter = (typeof ACTIVITY_FILTERS)[number];

export const PAGE_SIZE = 20;

export const activitySearchSchema = z.object({
  filter: z.enum(ACTIVITY_FILTERS).catch("all"),
  page: z.coerce.number().int().min(1).catch(1),
  customerId: z.string().optional().catch(undefined),
});
export type ActivitySearch = z.infer<typeof activitySearchSchema>;

/** The ledger query for a filter, or null when the filter shows approvals instead. */
export function ledgerQueryFor(search: ActivitySearch): TransactionFilter | null {
  if (search.filter === "pending") return null;
  return {
    page: search.page,
    limit: PAGE_SIZE,
    ...(search.customerId ? { customerId: search.customerId } : {}),
    ...(search.filter === "earned" ? { transactionType: "earn" as const } : {}),
    ...(search.filter === "redeemed" ? { transactionType: "redeem" as const } : {}),
  };
}
