import type { TransactionFilter } from "@/backend/loyalty/redemption/redemption.api";
import { oneOf, optionalString, pageNumber } from "@/utils/search.ts";

/**
 * Activity is one page over two tables: the ledger, and the approval requests that will
 * write to it. The filter tabs decide which is shown; `pending` is the approvals, the
 * other three are ledger queries.
 */
export const ACTIVITY_FILTERS = ["all", "pending", "earned", "redeemed"] as const;
export type ActivityFilter = (typeof ACTIVITY_FILTERS)[number];

export const PAGE_SIZE = 20;

export interface ActivitySearch {
  filter: ActivityFilter;
  page: number;
  customerId?: string;
}

export function validateActivitySearch(search: Record<string, unknown>): ActivitySearch {
  return {
    filter: oneOf(ACTIVITY_FILTERS, search.filter) ?? "all",
    page: pageNumber(search.page),
    customerId: optionalString(search.customerId),
  };
}

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
