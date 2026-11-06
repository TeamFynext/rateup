import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { loyaltyKeys } from "@/backend/loyalty/loyalty.keys";

import {
  getLoyaltyRedeems,
  getRewardByShortCode,
  redeemReward,
  redeemRewardByShortCode,
  updateRedeem,
} from "./redeems.api";

export const useGetLoyaltyRedeems = () => {
  return useQuery({
    queryKey: loyaltyKeys.redeems(),
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
      qc.invalidateQueries({ queryKey: loyaltyKeys.redeems() });
      qc.invalidateQueries({ queryKey: loyaltyKeys.customers() });
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
      qc.invalidateQueries({ queryKey: loyaltyKeys.redeems() });
      qc.invalidateQueries({ queryKey: loyaltyKeys.customers() });
      qc.invalidateQueries({ queryKey: loyaltyKeys.dashboard() });
      qc.invalidateQueries({
        queryKey: loyaltyKeys.cashierCustomer(selectedPhone),
      });
    },
    onError: (error) => {
      qc.invalidateQueries({ queryKey: loyaltyKeys.redeems() });
      toast.error(error?.message || `Reward redeem failed`);
    },
  });
};

export const useUpdateRedeem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateRedeem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: loyaltyKeys.redeems() });
      qc.invalidateQueries({ queryKey: loyaltyKeys.customers() });
      qc.invalidateQueries({ queryKey: loyaltyKeys.dashboard() });
      toast.success("Redeem updated successfully");
    },
    onError: (error) => {
      qc.invalidateQueries({ queryKey: loyaltyKeys.redeems() });
      toast.error(error?.message || `Redeem updation failed`);
    },
  });
};
