import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
    queryKey: ["loyaltyApprovals", filters],
    queryFn: () => getApprovalRequests(filters),
  });

const useGetApprovalRequestById = (approvalId: string) =>
  useQuery({
    queryKey: ["loyaltyApprovals", approvalId],
    queryFn: () => getApprovalRequestById(approvalId),
    enabled: !!approvalId,
  });

const useCreateApprovalRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateApprovalRequestInput) => createApprovalRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyApprovals"] });
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
      queryClient.invalidateQueries({ queryKey: ["loyaltyApprovals"] });
      queryClient.invalidateQueries({ queryKey: ["loyaltyRedemptions"] });
      queryClient.invalidateQueries({ queryKey: ["loyaltyTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["loyaltyDashboardData"] });
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
      queryClient.invalidateQueries({ queryKey: ["loyaltyApprovals"] });
      queryClient.invalidateQueries({ queryKey: ["loyaltyRedemptions"] });
      queryClient.invalidateQueries({ queryKey: ["loyaltyTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["loyaltyDashboardData"] });
      toast.success("Approval request rejected successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error rejecting approval request");
    },
  });
};

const useCancelApprovalRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ approvalId, data }: { approvalId: string; data: CancelRequestInput }) =>
      cancelApprovalRequest(approvalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyApprovals"] });
      toast.success("Approval request cancelled successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error cancelling approval request");
    },
  });
};
