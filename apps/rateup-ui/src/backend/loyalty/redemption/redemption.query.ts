import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { loyaltyKeys } from "@/backend/loyalty/loyalty.keys";

import type { TransactionFilter } from "./redemption.api";
import {
  approveRedemption,
  getRedemptions,
  getRedemptionsByCustomer,
  getTransactions,
  rejectRedemption,
} from "./redemption.api";

export const useGetRedemptions = (enabled = true) =>
  useQuery({
    queryKey: loyaltyKeys.redemptions(),
    queryFn: () => getRedemptions(),
    enabled: !!enabled,
  });

export const useGetRedemptionsByCustomer = (customerId: string) =>
  useQuery({
    queryKey: loyaltyKeys.redemptionsByCustomer(customerId),
    queryFn: () => getRedemptionsByCustomer(customerId),
    enabled: !!customerId,
  });

export const useGetTransactions = (filters?: TransactionFilter, enabled = true) =>
  useQuery({
    queryKey: loyaltyKeys.transactionsFiltered(filters),
    queryFn: () => getTransactions(filters),
    enabled: !!enabled,
  });

export const useApproveRedemptionMutation = () => {
  const qc = useQueryClient();
  const approveMutation = useMutation({
    mutationFn: approveRedemption,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: loyaltyKeys.redemptions() });
      qc.invalidateQueries({ queryKey: loyaltyKeys.transactions() });
      qc.invalidateQueries({ queryKey: loyaltyKeys.dashboard() });
      toast.success("Redemption approved successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error approving redemption");
    },
  });
  return approveMutation;
};

export const useRejectRedemptionMutation = () => {
  const qc = useQueryClient();
  const rejectMutation = useMutation({
    mutationFn: rejectRedemption,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: loyaltyKeys.redemptions() });
      qc.invalidateQueries({ queryKey: loyaltyKeys.transactions() });
      qc.invalidateQueries({ queryKey: loyaltyKeys.dashboard() });
      toast.success("Redemption rejected successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error rejecting redemption");
    },
  });
  return rejectMutation;
};
