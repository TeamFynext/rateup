import { axiosClient } from "../../apiClient";
import { LOYALTY_BASE } from "../base.ts";

const base = LOYALTY_BASE + "/approvals";

// Types matching backend schema
export type ApprovalRequestType =
  | "REWARD_REDEMPTION"
  | "POINTS_ADJUSTMENT"
  | "TIER_OVERRIDE"
  | "ACCOUNT_SUSPENSION"
  | "ACCOUNT_REACTIVATION"
  | "BULK_OPERATION";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "CANCELLED";

type RequestedByType = "CUSTOMER" | "STAFF" | "SYSTEM";

export interface CreateApprovalRequestInput {
  requestType: ApprovalRequestType;
  accountId: string;
  points?: number | null;
  reason: string;
  requestData?: Record<string, unknown>;
  requestedBy?: string | null;
  requestedByType?: RequestedByType;
  requestedByName?: string | null;
  redemptionId?: string | null;
  transactionId?: string | null;
  expiresAt?: string | null;
}

export interface GetApprovalRequestsInput {
  status?: ApprovalStatus;
  requestType?: ApprovalRequestType;
  accountId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface ApproveRequestInput {
  reviewerId: string;
  reviewerName: string;
  notes?: string;
}

export interface RejectRequestInput {
  reviewerId: string;
  reviewerName: string;
  reason: string;
}

export interface CancelRequestInput {
  reason: string;
}

export interface ApprovalRequest {
  id: string;
  requestType: ApprovalRequestType;
  accountId: string;
  customerName?: string;
  points?: number | null;
  reason: string;
  requestData: Record<string, unknown>;
  requestedBy?: string | null;
  requestedByType: RequestedByType;
  requestedByName?: string | null;
  redemptionId?: string | null;
  transactionId?: string | null;
  status: ApprovalStatus;
  reviewerId?: string | null;
  reviewerName?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetApprovalRequestsResponse {
  data: ApprovalRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getApprovalRequests(
  params?: GetApprovalRequestsInput,
): Promise<GetApprovalRequestsResponse> {
  return (await axiosClient.get(base, { params })).data;
}

export async function getApprovalRequestById(approvalId: string): Promise<ApprovalRequest> {
  return (await axiosClient.get(`${base}/${approvalId}`)).data;
}

export async function createApprovalRequest(
  data: CreateApprovalRequestInput,
): Promise<ApprovalRequest> {
  return (await axiosClient.post(base, data)).data;
}

export async function approveApprovalRequest(
  approvalId: string,
  data: ApproveRequestInput,
): Promise<ApprovalRequest> {
  return (await axiosClient.post(`${base}/${approvalId}/approve`, data)).data;
}

export async function rejectApprovalRequest(
  approvalId: string,
  data: RejectRequestInput,
): Promise<ApprovalRequest> {
  return (await axiosClient.post(`${base}/${approvalId}/reject`, data)).data;
}

export async function cancelApprovalRequest(
  approvalId: string,
  data: CancelRequestInput,
): Promise<ApprovalRequest> {
  return (await axiosClient.post(`${base}/${approvalId}/cancel`, data)).data;
}
