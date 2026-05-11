import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createLoyaltyReward,
  deleteLoyaltyReward,
  getLoyaltyRewardById,
  getLoyaltyRewards,
  LoyaltyRewardInput,
  LoyaltyRewardStatus,
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
      toast.success("Loyalty reward created successfully");
      queryClient.invalidateQueries({ queryKey: ["loyalty-rewards"] });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error?.message || "Error creating loyalty reward!");
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
    onSuccess: (updatedReward) => {
      queryClient.setQueryData(["loyalty-reward", rewardId], updatedReward);
      toast.success("Loyalty reward updated successfully");
      queryClient.invalidateQueries({ queryKey: ["loyalty-rewards"] });
      queryClient.invalidateQueries({ queryKey: ["loyalty-reward", rewardId] });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error?.message || "Error updating loyalty reward!");
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
      toast.success("Loyalty reward deleted successfully", {
        id: "loyalty-reward-delete",
      });
      queryClient.invalidateQueries({ queryKey: ["loyalty-rewards"] });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error?.message || "Error deleting loyalty reward!", {
        id: "loyalty-reward-delete",
      });
      onError?.();
    },
  });
};

/**
 * Hook to toggle reward status
 */
export const useToggleLoyaltyRewardStatusMutation = (
  onSuccess?: () => void,
  onError?: () => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      rewardId,
      status,
    }: {
      rewardId: string;
      status: LoyaltyRewardStatus;
    }) => updateLoyaltyReward(rewardId, { status }),
    onSuccess: (_, variables) => {
      toast.success("Reward status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["loyalty-rewards"] });
      queryClient.invalidateQueries({
        queryKey: ["loyalty-reward", variables.rewardId],
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error?.message || "Error updating reward status!");
      onError?.();
    },
  });
};
