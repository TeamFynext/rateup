import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "@/utils/notifications";

import { getLoyaltyRedeems, redeemReward } from "./redeems.api";

export const useGetLoyaltyRedeems = () => {
  return useQuery({
    queryKey: ["loyaltyRedeems"],
    queryFn: getLoyaltyRedeems,
  });
};

export const useRedeemReward = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: redeemReward,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyaltyRedeems"] });
      qc.invalidateQueries({ queryKey: ["loyaltyCustomers"] });
      showSuccessToast("Reward redeemed successfully");
    },
    onError: (e: any) => {
      qc.invalidateQueries({ queryKey: ["loyaltyRedeems"] });
      showErrorToast(`Reward redeem failed: ${e?.response?.data ?? ""}`);
    },
  });
};
