import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { LoyaltyActionType } from "@/types/enums.ts";

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

const _useGetLoyaltyActionById = (actionId) => {
  return useQuery({
    queryKey: ["loyaltyActions", actionId],
    queryFn: () => getLoyaltyActionById(actionId),
    enabled: !!actionId,
  });
};

const _useCreateLoyaltyAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLoyaltyAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyActions"] });
      queryClient.invalidateQueries({ queryKey: ["loyaltyDashboardData"] });
      toast.success("Loyalty Action created successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error in creating loyalty action. " + (error?.message ?? ""));
    },
  });
};

type LoyaltyAction = {
  type?: LoyaltyActionType;
  name?: string;
  points?: number;
  startDate?: string;
  endDate?: string;
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

const _useUpdateLoyaltyAction = (actionId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<LoyaltyAction, "type">) => updateLoyaltyAction(data, actionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyActions", actionId] });
      queryClient.invalidateQueries({ queryKey: ["loyaltyActions"] });
      toast.success("Loyalty Action updated successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Error in updating loyalty action. " + (error?.message ?? ""));
    },
  });
};

const _useDeleteLoyaltyAction = (actionId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteLoyaltyActionById(actionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyActions"] });
      queryClient.invalidateQueries({ queryKey: ["loyaltyDashboardData"] });
      toast.success("Loyalty Action deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || `Deletion Failed`);
    },
  });
};

const _useReferralLoyaltyAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: referralLoyaltyAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyCustomers"] });
      queryClient.invalidateQueries({ queryKey: ["loyaltyRedeems"] });
      toast.success("Refer successfull");
    },
    onError: (error: any) => {
      toast.error(error?.message || `Refer failed`);
    },
  });
};

const _useBulkLoyaltyAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkLoyaltyAction,
    onSuccess: (_res: any) => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyCustomers"] });
      queryClient.invalidateQueries({ queryKey: ["loyaltyRedeems"] });
    },
    onError: (error: any) => {
      toast.error(error?.message || `failed`);
    },
  });
};
