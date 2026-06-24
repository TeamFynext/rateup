import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { LoyaltyEarningRuleInput, LoyaltyEarningRuleUpdateInput } from "./earningRules.api";
import {
  createLoyaltyEarningRule,
  deleteLoyaltyEarningRule,
  getLoyaltyEarningRuleById,
  getLoyaltyEarningRules,
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
    mutationFn: (ruleData: LoyaltyEarningRuleInput) => createLoyaltyEarningRule(ruleData),
    onSuccess: () => {
      toast.success("Earning rule created successfully");
      queryClient.invalidateQueries({ queryKey: ["loyalty-earning-rules"] });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error?.message || "Error creating earning rule!");
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
      toast.success("Earning rule updated successfully");
      queryClient.invalidateQueries({ queryKey: ["loyalty-earning-rules"] });
      queryClient.invalidateQueries({
        queryKey: ["loyalty-earning-rule", ruleId],
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error?.message || "Error updating earning rule!");
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
      toast.success("Earning rule deleted successfully", {
        id: "earning-rule-delete",
      });
      queryClient.invalidateQueries({ queryKey: ["loyalty-earning-rules"] });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error?.message || "Error deleting earning rule!", {
        id: "earning-rule-delete",
      });
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
    mutationFn: ({ status }: { status: "active" | "inactive" | "scheduled" | "expired" }) =>
      updateLoyaltyEarningRule(ruleId, { status }),
    onSuccess: () => {
      toast.success("Earning rule status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["loyalty-earning-rules"] });
      queryClient.invalidateQueries({
        queryKey: ["loyalty-earning-rule", ruleId],
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error?.message || "Error updating rule status!");
      onError?.();
    },
  });
};
