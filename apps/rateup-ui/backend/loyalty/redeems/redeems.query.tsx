import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
  return useMutation({
    mutationFn: getRewardByShortCode,
  });
};

export const useRedeemRewardByShortCode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: redeemRewardByShortCode,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyaltyRedeems"] });
      qc.invalidateQueries({ queryKey: ["loyaltyCustomers"] });
      toast.success("Reward redeemed successfully using short code");
    },
    onError: (e) => {
      toast.error(`Redemption failed: ${e?.message ?? "Unknown error"}`);
    },
  });
};

export const useRedeemReward = (selectedPhone: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: redeemReward,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyaltyRedeems"] });
      qc.invalidateQueries({ queryKey: ["loyaltyCustomers"] });
      qc.invalidateQueries({ queryKey: ["loyaltyDashboardData"] });
      qc.invalidateQueries({
        queryKey: ["loyalty-cashier-customer", selectedPhone],
      });
      toast.success("Reward claimed successfully");
    },
    onError: (e) => {
      qc.invalidateQueries({ queryKey: ["loyaltyRedeems"] });
      toast.error(`Reward redeem failed: ${e?.message ?? ""}`);
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
      toast.success("Redeem updated successfully");
    },
    onError: (e) => {
      qc.invalidateQueries({ queryKey: ["loyaltyRedeems"] });
      toast.error(`Redeem updation failed: ${e?.message ?? ""}`);
    },
  });
};
