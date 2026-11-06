import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { loyaltyKeys } from "@/backend/loyalty/loyalty.keys";

import type {
  ApproveRequestInput,
  CancelRequestInput,
  CreateApprovalRequestInput,
  GetApprovalRequestsInput,
  RejectRequestInput,
} from "./approval.api";
import {
  approveApprovalRequest,
  cancelApprovalRequest,
  createApprovalRequest,
  getApprovalRequestById,
  getApprovalRequests,
  rejectApprovalRequest,
} from "./approval.api";

export const useGetApprovalRequests = (filters?: GetApprovalRequestsInput) =>
  useQuery({
    queryKey: loyaltyKeys.approvalsFiltered(filters),
    queryFn: () => getApprovalRequests(filters),
  });

/**
 * How many requests are waiting. The list endpoint already counts, so one row is fetched
 * for the total — the Activity tab badge and the Pending filter read the same cache.
 */
export const usePendingApprovalCount = (enabled = true) =>
  useQuery({
    queryKey: loyaltyKeys.approvalsFiltered({ status: "PENDING", limit: 1 }),
    queryFn: () => getApprovalRequests({ status: "PENDING", limit: 1 }),
    enabled,
    staleTime: 60_000,
    select: (response) => response.pagination.total,
  });

export const useGetApprovalRequestById = (approvalId: string) =>
  useQuery({
    queryKey: loyaltyKeys.approval(approvalId),
    queryFn: () => getApprovalRequestById(approvalId),
    enabled: !!approvalId,
  });

export const useCreateApprovalRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateApprovalRequestInput) => createApprovalRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.approvals() });
      toast.success("Approval request created successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error creating approval request");
    },
  });
};

export const useApproveApprovalRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ approvalId, data }: { approvalId: string; data: ApproveRequestInput }) =>
      approveApprovalRequest(approvalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.approvals() });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.redemptions() });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.transactions() });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.dashboard() });
      toast.success("Approval request approved successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error approving approval request");
    },
  });
};

export const useRejectApprovalRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ approvalId, data }: { approvalId: string; data: RejectRequestInput }) =>
      rejectApprovalRequest(approvalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.approvals() });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.redemptions() });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.transactions() });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.dashboard() });
      toast.success("Approval request rejected successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error rejecting approval request");
    },
  });
};

export const useCancelApprovalRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ approvalId, data }: { approvalId: string; data: CancelRequestInput }) =>
      cancelApprovalRequest(approvalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.approvals() });
      toast.success("Approval request cancelled successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error cancelling approval request");
    },
  });
};
