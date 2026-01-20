import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getErrorMessage } from "../../utils";
import { showErrorToast, showSuccessToast } from "../../utils/notifications";
import {
  createLoyaltyReward,
  deleteLoyaltyReward,
  getLoyaltyRewardById,
  getLoyaltyRewards,
  LoyaltyRewardInput,
  LoyaltyRewardUpdateInput,
  updateLoyaltyReward,
} from "./reward.api";

/**
 * Hook to fetch all loyalty rewards
 */
export const useLoyaltyRewards = () =>
  useQuery({
    queryKey: ["loyalty-rewards"],
    queryFn: getLoyaltyRewards,
  });

/**
 * Hook to fetch a single loyalty reward by ID
 */
export const useLoyaltyRewardById = (rewardId: string) =>
  useQuery({
    enabled: !!rewardId,
    queryKey: ["loyalty-reward", rewardId],
    queryFn: () => getLoyaltyRewardById(rewardId),
  });

/**
 * Hook to create a new loyalty reward
 */
export const useCreateLoyaltyRewardMutation = (
  onSuccess?: () => void,
  onError?: () => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rewardData: LoyaltyRewardInput) =>
      createLoyaltyReward(rewardData),
    onSuccess: () => {
      showSuccessToast("Loyalty reward created successfully");
      queryClient.invalidateQueries({ queryKey: ["loyalty-rewards"] });
      onSuccess?.();
    },
    onError: (error: any) => {
      showErrorToast(
        getErrorMessage(error?.response, "Error creating loyalty reward!"),
      );
      onError?.();
    },
  });
};

/**
 * Hook to update an existing loyalty reward
 */
export const useUpdateLoyaltyRewardMutation = (
  rewardId: string,
  onSuccess?: () => void,
  onError?: () => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rewardData: LoyaltyRewardUpdateInput) =>
      updateLoyaltyReward(rewardId, rewardData),
    onSuccess: () => {
      showSuccessToast("Loyalty reward updated successfully");
      queryClient.invalidateQueries({ queryKey: ["loyalty-rewards"] });
      queryClient.invalidateQueries({ queryKey: ["loyalty-reward", rewardId] });
      onSuccess?.();
    },
    onError: (error: any) => {
      showErrorToast(
        getErrorMessage(error?.response, "Error updating loyalty reward!"),
      );
      onError?.();
    },
  });
};

/**
 * Hook to delete a loyalty reward
 */
export const useDeleteLoyaltyRewardMutation = (
  onSuccess?: () => void,
  onError?: () => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rewardId: string) => deleteLoyaltyReward(rewardId),
    onSuccess: () => {
      showSuccessToast(
        "Loyalty reward deleted successfully",
        "loyalty-reward-delete",
        null,
        true,
      );
      queryClient.invalidateQueries({ queryKey: ["loyalty-rewards"] });
      onSuccess?.();
    },
    onError: (error: any) => {
      showErrorToast(
        getErrorMessage(error?.response, "Error deleting loyalty reward!"),
        "loyalty-reward-delete",
        null,
        true,
      );
      onError?.();
    },
  });
};

/**
 * Hook to toggle reward status
 */
export const useToggleLoyaltyRewardStatusMutation = (
  rewardId: string,
  onSuccess?: () => void,
  onError?: () => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      status,
    }: {
      status: "active" | "inactive" | "out_of_stock";
    }) => updateLoyaltyReward(rewardId, { status }),
    onSuccess: () => {
      showSuccessToast("Reward status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["loyalty-rewards"] });
      queryClient.invalidateQueries({ queryKey: ["loyalty-reward", rewardId] });
      onSuccess?.();
    },
    onError: (error: any) => {
      showErrorToast(
        getErrorMessage(error?.response, "Error updating reward status!"),
      );
      onError?.();
    },
  });
};
