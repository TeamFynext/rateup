// for demo

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "@/utils/notifications";

import { createLCAction, createLCRedeem } from "./loyalty.api";

export const useLCAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLCAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyCustomers"] });
      showSuccessToast("success action");
    },
    onError: () => {
      showErrorToast("Error");
    },
  });
};

export const useLCRedeem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLCRedeem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyRedeems"] });
      showSuccessToast("success redeem");
    },
    onError: (e: any) => {
      showErrorToast(`Error: ${e.response.data.message}`);
    },
  });
};
