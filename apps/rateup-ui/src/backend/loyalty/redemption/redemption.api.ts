import { axiosClient } from "../../apiClient";
import { LOYALTY_BASE } from "../base.ts";

const base = LOYALTY_BASE + "/redemptions";

export interface ApproveRedemptionInput {
  redemptionId: string;
}

export interface RejectRedemptionInput {
  redemptionId: string;
  reason?: string;
}

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
  export?: "excel" | "csv";
}

export async function getRedemptions() {
  return (await axiosClient.get(base)).data;
}

export async function getRedemptionsByCustomer(customerId: string) {
  return (await axiosClient.get(`${base}/customer/${customerId}`)).data;
}

export async function approveRedemption(data: ApproveRedemptionInput) {
  return (await axiosClient.post(`${base}/approve`, data)).data;
}

export async function rejectRedemption(data: RejectRedemptionInput) {
  return (await axiosClient.post(`${base}/reject`, data)).data;
}

export async function getTransactions(filters?: TransactionFilter) {
  return (await axiosClient.get(`${base}/transactions`, { params: filters })).data;
}
