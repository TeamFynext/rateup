import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "../../utils";
import { showErrorToast, showSuccessToast } from "../../utils/notifications";
import {
  createLoyaltyEarningRule,
  deleteLoyaltyEarningRule,
  getLoyaltyEarningRuleById,
  getLoyaltyEarningRules,
  LoyaltyEarningRuleInput,
  LoyaltyEarningRuleUpdateInput,
  updateLoyaltyEarningRule,
} from "./earningRules.api";

/**
 * Hook to fetch all loyalty earning rules
 */
export const useLoyaltyEarningRules = () =>
  useQuery({
    queryKey: ["loyalty-earning-rules"],
    queryFn: getLoyaltyEarningRules,
  });

/**
 * Hook to fetch a single loyalty earning rule by ID
 */
export const useLoyaltyEarningRuleById = (ruleId: string) =>
  useQuery({
    enabled: !!ruleId,
    queryKey: ["loyalty-earning-rule", ruleId],
    queryFn: () => getLoyaltyEarningRuleById(ruleId),
  });

/**
 * Hook to create a new loyalty earning rule
 */
export const useCreateLoyaltyEarningRuleMutation = (
  onSuccess?: () => void,
  onError?: () => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ruleData: LoyaltyEarningRuleInput) =>
      createLoyaltyEarningRule(ruleData),
    onSuccess: () => {
      showSuccessToast("Earning rule created successfully");
      queryClient.invalidateQueries({ queryKey: ["loyalty-earning-rules"] });
      onSuccess?.();
    },
    onError: (error: any) => {
      showErrorToast(
        getErrorMessage(error?.response, "Error creating earning rule!"),
      );
      onError?.();
    },
  });
};

/**
 * Hook to update an existing loyalty earning rule
 */
export const useUpdateLoyaltyEarningRuleMutation = (
  ruleId: string,
  onSuccess?: () => void,
  onError?: () => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ruleData: LoyaltyEarningRuleUpdateInput) =>
      updateLoyaltyEarningRule(ruleId, ruleData),
    onSuccess: () => {
      showSuccessToast("Earning rule updated successfully");
      queryClient.invalidateQueries({ queryKey: ["loyalty-earning-rules"] });
      queryClient.invalidateQueries({
        queryKey: ["loyalty-earning-rule", ruleId],
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      showErrorToast(
        getErrorMessage(error?.response, "Error updating earning rule!"),
      );
      onError?.();
    },
  });
};

/**
 * Hook to delete a loyalty earning rule
 */
export const useDeleteLoyaltyEarningRuleMutation = (
  onSuccess?: () => void,
  onError?: () => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ruleId: string) => deleteLoyaltyEarningRule(ruleId),
    onSuccess: () => {
      showSuccessToast(
        "Earning rule deleted successfully",
        "earning-rule-delete",
        null,
        true,
      );
      queryClient.invalidateQueries({ queryKey: ["loyalty-earning-rules"] });
      onSuccess?.();
    },
    onError: (error: any) => {
      showErrorToast(
        getErrorMessage(error?.response, "Error deleting earning rule!"),
        "earning-rule-delete",
        null,
        true,
      );
      onError?.();
    },
  });
};

/**
 * Hook to toggle earning rule status (active/inactive)
 */
export const useToggleLoyaltyEarningRuleStatusMutation = (
  ruleId: string,
  onSuccess?: () => void,
  onError?: () => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      status,
    }: {
      status: "active" | "inactive" | "scheduled" | "expired";
    }) => updateLoyaltyEarningRule(ruleId, { status }),
    onSuccess: () => {
      showSuccessToast("Earning rule status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["loyalty-earning-rules"] });
      queryClient.invalidateQueries({
        queryKey: ["loyalty-earning-rule", ruleId],
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      showErrorToast(
        getErrorMessage(error?.response, "Error updating rule status!"),
      );
      onError?.();
    },
  });
};
