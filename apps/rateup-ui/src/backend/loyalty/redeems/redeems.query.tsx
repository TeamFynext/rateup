import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  getLoyaltyRedeems,
  getRewardByShortCode,
  redeemReward,
  redeemRewardByShortCode,
  updateRedeem,
} from "./redeems.api";

const useGetLoyaltyRedeems = () => {
  return useQuery({
    queryKey: ["loyaltyRedeems"],
    queryFn: getLoyaltyRedeems,
  });
};

const useGetRewardByShortCode = () => {
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
    },
    onError: (error) => {
      toast.error(error?.message || `Redemption failed`);
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
    },
    onError: (error) => {
      qc.invalidateQueries({ queryKey: ["loyaltyRedeems"] });
      toast.error(error?.message || `Reward redeem failed`);
    },
  });
};

const useUpdateRedeem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateRedeem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyaltyRedeems"] });
      qc.invalidateQueries({ queryKey: ["loyaltyCustomers"] });
      qc.invalidateQueries({ queryKey: ["loyaltyDashboardData"] });
      toast.success("Redeem updated successfully");
    },
    onError: (error) => {
      qc.invalidateQueries({ queryKey: ["loyaltyRedeems"] });
      toast.error(error?.message || `Redeem updation failed`);
    },
  });
};
