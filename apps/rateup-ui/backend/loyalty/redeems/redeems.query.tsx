import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "@/utils/notifications";

import {
  getLoyaltyRedeems,
  getRewardByShortCode,
  redeemReward,
  redeemRewardByShortCode,
  updateRedeem,
} from "./redeems.api";

export const useGetLoyaltyRedeems = () => {
  return useQuery({
    queryKey: ["loyaltyRedeems"],
    queryFn: getLoyaltyRedeems,
  });
};

export const useGetRewardByShortCode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: getRewardByShortCode,
    onError: (e: any) => {
      // Don't show toast on query, handle in UI
      console.error(e);
    },
  });
};

export const useRedeemRewardByShortCode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: redeemRewardByShortCode,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyaltyRedeems"] });
      qc.invalidateQueries({ queryKey: ["loyaltyCustomers"] });
      showSuccessToast("Reward redeemed successfully using short code");
    },
    onError: (e: any) => {
      showErrorToast(
        `Redemption failed: ${e?.response?.data?.message ?? "Unknown error"}`,
      );
    },
  });
};

export const useRedeemReward = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: redeemReward,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyaltyRedeems"] });
      qc.invalidateQueries({ queryKey: ["loyaltyCustomers"] });
      qc.invalidateQueries({ queryKey: ["loyaltyDashboardData"] });
      showSuccessToast("Reward redeemed successfully");
    },
    onError: (e: any) => {
      qc.invalidateQueries({ queryKey: ["loyaltyRedeems"] });
      showErrorToast(`Reward redeem failed: ${e?.response?.data ?? ""}`);
    },
  });
};

export const useUpdateRedeem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateRedeem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyaltyRedeems"] });
      qc.invalidateQueries({ queryKey: ["loyaltyCustomers"] });
      qc.invalidateQueries({ queryKey: ["loyaltyDashboardData"] });
      showSuccessToast("Redeem updated successfully");
    },
    onError: (e: any) => {
      qc.invalidateQueries({ queryKey: ["loyaltyRedeems"] });
      showErrorToast(`Redeem updation failed: ${e?.response?.data ?? ""}`);
    },
  });
};
