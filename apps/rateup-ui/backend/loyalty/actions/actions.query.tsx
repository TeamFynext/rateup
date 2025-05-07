import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";

import { LoyaltyActionType } from "@/types/enums";
import { showErrorToast, showSuccessToast } from "@/utils/notifications";

import {
  bulkLoyaltyAction,
  createLoyaltyAction,
  deleteLoyaltyActionById,
  getLoyaltyActionById,
  getLoyaltyActions,
  referralLoyaltyAction,
  updateLoyaltyAction,
} from "./actions.api";

export const useGetLoyaltyActions = (enabled = true) => {
  return useQuery({
    queryKey: ["loyaltyActions"],
    queryFn: getLoyaltyActions,
    enabled: !!enabled,
  });
};

export const useGetLoyaltyActionById = (actionId) => {
  return useQuery({
    queryKey: ["loyaltyActions", actionId],
    queryFn: () => getLoyaltyActionById(actionId),
    enabled: !!actionId,
  });
};

export const useCreateLoyaltyAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLoyaltyAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyActions"] });
      queryClient.invalidateQueries({ queryKey: ["loyaltyDashboardData"] });
      showSuccessToast("Loyalty Action created successfully");
    },
    onError: (e: AxiosError) => {
      showErrorToast(
        "Error in creating loyalty action. " + (e?.response?.data ?? ""),
      );
    },
  });
};

export type LoyaltyAction = {
  type?: LoyaltyActionType;
  name?: string;
  points?: number;
  startDate?: Date;
  endDate?: Date;
  waTemplateId?: string;
  isAmountBased?: boolean;
  amount?: number;
  maxPoints?: number;
  refereeWaTemplateId?: string;
  isAmountBasedForReferee?: boolean;
  maxPointsForReferee?: number;
  isExistingUserReferralAllowed?: boolean;
  active?: boolean;
  description?: string;
};

export const useUpdateLoyaltyAction = (actionId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<LoyaltyAction, "type">) =>
      updateLoyaltyAction(data, actionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyActions", actionId] });
      queryClient.invalidateQueries({ queryKey: ["loyaltyActions"] });
      showSuccessToast("Loyalty Action updated successfully");
    },
    onError: (e: AxiosError) => {
      showErrorToast(
        "Error in updating loyalty action. " + (e?.response?.data ?? ""),
      );
    },
  });
};

export const useDeleteLoyaltyAction = (actionId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteLoyaltyActionById(actionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyActions"] });
      queryClient.invalidateQueries({ queryKey: ["loyaltyDashboardData"] });
      showSuccessToast("Loyalty Action deleted successfully");
    },
    onError: (e: any) => {
      showErrorToast(`Deletion Failed: ${e?.response?.data ?? "Try again"}`);
    },
  });
};

export const useReferralLoyaltyAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: referralLoyaltyAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyCustomers"] });
      queryClient.invalidateQueries({ queryKey: ["loyaltyRedeems"] });
      showSuccessToast("Refer successfull");
    },
    onError: (e: any) => {
      showErrorToast(
        `Refer failed: ${e?.response?.data?.message ?? e?.response?.data ?? ""}`,
      );
    },
  });
};

export const useBulkLoyaltyAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkLoyaltyAction,
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyCustomers"] });
      queryClient.invalidateQueries({ queryKey: ["loyaltyRedeems"] });
    },
    onError: (e: any) => {
      showErrorToast(
        `failed: ${e?.response?.data?.message ?? e?.response?.data ?? ""}`,
      );
    },
  });
};
