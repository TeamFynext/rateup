import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { TransactionFilter } from "./redemption.api";
import {
  approveRedemption,
  getRedemptions,
  getRedemptionsByCustomer,
  getTransactions,
  rejectRedemption,
} from "./redemption.api";

const useGetRedemptions = (enabled = true) =>
  useQuery({
    queryKey: ["loyaltyRedemptions"],
    queryFn: () => getRedemptions(),
    enabled: !!enabled,
  });

const useGetRedemptionsByCustomer = (customerId: string) =>
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

const useApproveRedemptionMutation = () => {
  const qc = useQueryClient();
  const approveMutation = useMutation({
    mutationFn: approveRedemption,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyaltyRedemptions"] });
      qc.invalidateQueries({ queryKey: ["loyaltyTransactions"] });
      qc.invalidateQueries({ queryKey: ["loyaltyDashboardData"] });
      toast.success("Redemption approved successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error approving redemption");
    },
  });
  return approveMutation;
};

const useRejectRedemptionMutation = () => {
  const qc = useQueryClient();
  const rejectMutation = useMutation({
    mutationFn: rejectRedemption,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyaltyRedemptions"] });
      qc.invalidateQueries({ queryKey: ["loyaltyTransactions"] });
      qc.invalidateQueries({ queryKey: ["loyaltyDashboardData"] });
      toast.success("Redemption rejected successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error rejecting redemption");
    },
  });
  return rejectMutation;
};
