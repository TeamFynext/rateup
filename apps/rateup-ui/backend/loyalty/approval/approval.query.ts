import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "../../../utils/notifications";
import {
  approveApprovalRequest,
  ApproveRequestInput,
  cancelApprovalRequest,
  CancelRequestInput,
  createApprovalRequest,
  CreateApprovalRequestInput,
  getApprovalRequestById,
  getApprovalRequests,
  GetApprovalRequestsInput,
  rejectApprovalRequest,
  RejectRequestInput,
} from "./approval.api";

export const useGetApprovalRequests = (filters?: GetApprovalRequestsInput) =>
  useQuery({
    queryKey: ["loyaltyApprovals", filters],
    queryFn: () => getApprovalRequests(filters),
  });

export const useGetApprovalRequestById = (approvalId: string) =>
  useQuery({
    queryKey: ["loyaltyApprovals", approvalId],
    queryFn: () => getApprovalRequestById(approvalId),
    enabled: !!approvalId,
  });

export const useCreateApprovalRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateApprovalRequestInput) =>
      createApprovalRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyApprovals"] });
      showSuccessToast("Approval request created successfully");
    },
    onError: () => {
      showErrorToast("Error creating approval request");
    },
  });
};

export const useApproveApprovalRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      approvalId,
      data,
    }: {
      approvalId: string;
      data: ApproveRequestInput;
    }) => approveApprovalRequest(approvalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyApprovals"] });
      queryClient.invalidateQueries({ queryKey: ["loyaltyRedemptions"] });
      queryClient.invalidateQueries({ queryKey: ["loyaltyTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["loyaltyDashboardData"] });
      showSuccessToast("Approval request approved successfully");
    },
    onError: () => {
      showErrorToast("Error approving approval request");
    },
  });
};

export const useRejectApprovalRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      approvalId,
      data,
    }: {
      approvalId: string;
      data: RejectRequestInput;
    }) => rejectApprovalRequest(approvalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyApprovals"] });
      queryClient.invalidateQueries({ queryKey: ["loyaltyRedemptions"] });
      queryClient.invalidateQueries({ queryKey: ["loyaltyTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["loyaltyDashboardData"] });
      showSuccessToast("Approval request rejected successfully");
    },
    onError: () => {
      showErrorToast("Error rejecting approval request");
    },
  });
};

export const useCancelApprovalRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      approvalId,
      data,
    }: {
      approvalId: string;
      data: CancelRequestInput;
    }) => cancelApprovalRequest(approvalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyApprovals"] });
      showSuccessToast("Approval request cancelled successfully");
    },
    onError: () => {
      showErrorToast("Error cancelling approval request");
    },
  });
};
