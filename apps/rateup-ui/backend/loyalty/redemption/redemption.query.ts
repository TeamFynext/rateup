import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "../../../utils/notifications";
import {
  approveRedemption,
  getRedemptions,
  getRedemptionsByCustomer,
  getTransactions,
  rejectRedemption,
  TransactionFilter,
} from "./redemption.api";

export const useGetRedemptions = (enabled = true) =>
  useQuery({
    queryKey: ["loyaltyRedemptions"],
    queryFn: () => getRedemptions(),
    enabled: !!enabled,
  });

export const useGetRedemptionsByCustomer = (customerId: string) =>
  useQuery({
    queryKey: ["loyaltyRedemptions", "customer", customerId],
    queryFn: () => getRedemptionsByCustomer(customerId),
    enabled: !!customerId,
  });

export const useGetTransactions = (
  filters?: TransactionFilter,
  enabled = true,
) =>
  useQuery({
    queryKey: ["loyaltyTransactions", filters],
    queryFn: () => getTransactions(filters),
    enabled: !!enabled,
  });

export const useApproveRedemptionMutation = () => {
  const qc = useQueryClient();
  const approveMutation = useMutation({
    mutationFn: approveRedemption,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyaltyRedemptions"] });
      qc.invalidateQueries({ queryKey: ["loyaltyTransactions"] });
      qc.invalidateQueries({ queryKey: ["loyaltyDashboardData"] });
      showSuccessToast("Redemption approved successfully");
    },
    onError: () => {
      showErrorToast("Error approving redemption");
    },
  });
  return approveMutation;
};

export const useRejectRedemptionMutation = () => {
  const qc = useQueryClient();
  const rejectMutation = useMutation({
    mutationFn: rejectRedemption,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyaltyRedemptions"] });
      qc.invalidateQueries({ queryKey: ["loyaltyTransactions"] });
      qc.invalidateQueries({ queryKey: ["loyaltyDashboardData"] });
      showSuccessToast("Redemption rejected successfully");
    },
    onError: () => {
      showErrorToast("Error rejecting redemption");
    },
  });
  return rejectMutation;
};
