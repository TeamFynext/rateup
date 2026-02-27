import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignRewardToCustomer,
  awardPoints,
  getCustomerRewardsByPhone,
  getLoyaltyTiers,
  redeemReward,
} from "./loyalty.api";
import { useToast } from "react-native-toast-notifications";
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
  const toast = useToast();
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
      toast.show("Points awarded successfully", { type: "success" });
    },
    onError: (error: any) => {
      toast.show(
        `Error awarding points: ${error?.response?.data?.error || error.message}`,
        { type: "danger" },
      );
    },
  });
};

export const useRedeemReward = (selectedPhone: string) => {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: redeemReward,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyaltyRedeems"] });
      qc.invalidateQueries({ queryKey: ["loyaltyCustomers"] });
      qc.invalidateQueries({ queryKey: ["loyaltyDashboardData"] });
      qc.invalidateQueries({
        queryKey: ["loyalty-cashier-customer", selectedPhone],
      });
      toast.show("Reward claimed successfully", { type: "success" });
    },
    onError: (e: any) => {
      qc.invalidateQueries({ queryKey: ["loyaltyRedeems"] });
      toast.show(`Reward redeem failed: ${e?.response?.data ?? ""}`, {
        type: "danger",
      });
    },
  });
};

export const useAssignRewardMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  const toast = useToast();
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
      toast.show("Reward assigned successfully!", { type: "success" });
    },
    onError: (error: any) => {
      console.error("Error assigning reward:", error);
      toast.show(error?.response?.data?.message || "Failed to assign reward", {
        type: "danger",
      });
    },
  });
};
