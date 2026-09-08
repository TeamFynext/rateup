import { Toast } from "@/components/common/Notice";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignRewardToCustomer,
  awardPoints,
  getCustomerRewardsByPhone,
  getLoyaltyTiers,
  redeemReward,
  redeemRewardByShortCode,
} from "./loyalty.api";
import { AssignRewardRequest } from "./loyalty.type";

export const useCustomerRewardsByPhone = (phone: string) => {
  return useQuery({
    queryKey: ["loyalty-cashier-customer", phone],
    queryFn: () => getCustomerRewardsByPhone(phone),
    enabled: phone.length >= 10,
    retry: false,
  });
};

export const useLoyaltyTiers = () =>
  useQuery({
    queryKey: ["loyalty-tiers"],
    queryFn: getLoyaltyTiers,
  });

export const useAwardPointsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      contactId: string;
      purchaseAmount: number;
      locationId?: string;
      productCategories?: string[];
      productSkus?: string[];
      paymentMethod?: string;
      channel?: string;
      orderId?: string;
      notes?: string;
    }) => awardPoints(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyCustomers"] });
      queryClient.invalidateQueries({
        queryKey: ["loyaltyCustomerByContact", variables.contactId],
      });
      queryClient.invalidateQueries({ queryKey: ["loyaltyDashboardData"] });
      Toast.show({
        type: "success",
        text1: "Points awarded successfully"
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: `Error awarding points: ${error?.response?.data?.error || error.message}`
      });
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
      Toast.show({
        type: "success",
        text1: "Reward claimed successfully"
      });
    },
    onError: (e: any) => {
      qc.invalidateQueries({ queryKey: ["loyaltyRedeems"] });
      Toast.show({
        type: "error",
        text1: `Reward redeem failed: ${e?.response?.data ?? ""}`
      });
    },
  });
};

export const useAssignRewardMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignRewardRequest) =>
      assignRewardToCustomer(payload),
    onSuccess: (payload) => {
      queryClient.invalidateQueries({
        queryKey: ["loyalty-customer", payload?.data?.customerId],
      });
      queryClient.invalidateQueries({
        queryKey: ["loyalty-customers"],
      });
      onSuccess?.();
      Toast.show({
        type: "success",
        text1: "Reward assigned successfully!"
      });
    },
    onError: (error: any) => {
      console.error("Error assigning reward:", error);
      Toast.show({
        type: "error",
        text1: error?.response?.data?.message || "Failed to assign reward"
      });
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
      Toast.show({
        type: "success",
        text1: "Reward redeemed successfully using short code"
      });
    },
    onError: (e) => {
      Toast.show({
        type: "error",
        text1: `Redemption failed: ${e?.message ?? "Unknown error"}`
      });
    },
  });
};
