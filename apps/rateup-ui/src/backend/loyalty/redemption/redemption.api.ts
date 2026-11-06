import { axiosClient } from "../../apiClient";
import { LOYALTY_BASE } from "../base.ts";

const base = LOYALTY_BASE + "/redemptions";

export interface TransactionFilter {
  fromDate?: string;
  toDate?: string;
  transactionType?: "earn" | "redeem" | "adjust" | "expire" | "refund";
  source?: string;
  customerId?: string;
  minPoints?: number;
  maxPoints?: number;
  page?: number;
  limit?: number;
}

/** One ledger row, with the customer it belongs to. */
export interface LoyaltyLedgerRow {
  id: string;
  accountId: string;
  transactionType: string;
  points: number;
  balanceAfter: number;
  source: string;
  description: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  account?: { id: string; contact?: { id: string; name: string | null; phone: string } | null };
  reward?: { id: string; name: string } | null;
}

export interface TransactionsResponse {
  transactions: LoyaltyLedgerRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface VerifyRedemptionResponse {
  valid: boolean;
  redemption: {
    id: string;
    redemptionCode: string;
    status: string;
    usedAt: string | null;
    expiresAt: string | null;
    createdAt: string;
  } | null;
  account?: { id: string; contact?: { name: string | null; phone: string } | null } | null;
  reward?: { id: string; name: string; pointsCost: number; rewardType: string } | null;
  message?: string;
}

export async function getRedemptionsByCustomer(customerId: string) {
  return (await axiosClient.get(`${base}/customer/${customerId}`)).data;
}

/**
 * The ledger. Returns `[]` (not the object) when the org has no programme, so callers
 * guard `data?.transactions`.
 */
export async function getTransactions(filters?: TransactionFilter): Promise<TransactionsResponse> {
  const data = (await axiosClient.get(`${base}/transactions`, { params: filters })).data;
  if (Array.isArray(data)) {
    return { transactions: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  }
  return data;
}

/** Streams a file; the caller hands the blob to `downloadBlob`. */
export async function exportTransactions(
  filters: Omit<TransactionFilter, "page" | "limit">,
  format: "csv" | "excel",
): Promise<Blob> {
  return (
    await axiosClient.get(`${base}/transactions`, {
      params: { ...filters, export: format },
      responseType: "blob",
    })
  ).data;
}

/** Looks a redemption code up before it is applied — what it is, whom it belongs to, whether it is still good. */
export async function verifyRedemption(redemptionCode: string): Promise<VerifyRedemptionResponse> {
  return (await axiosClient.post(`${base}/verify`, { redemptionCode })).data;
}

/** Marks an approved redemption used. `appliedBy` defaults to the signed-in user server-side. */
export async function applyRedemption(data: { redemptionCode: string; notes?: string }) {
  return (await axiosClient.post(`${base}/apply`, data)).data;
}
