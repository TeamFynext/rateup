import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "../../../utils/notifications";
import {
  createLoyaltyReward,
  deleteReward,
  getLoyaltyRewardById,
  getLoyaltyRewards,
  updateLoyaltyReward,
} from "./reward.api";

export const useGetLoyaltyRewards = () =>
  useQuery({
    queryKey: ["loyaltyRewards"],
    queryFn: () => getLoyaltyRewards(),
  });

export const useGetLoyaltyRewardById = (rewardId: string) =>
  useQuery({
    queryKey: ["loyaltyRewards", rewardId],
    queryFn: () => getLoyaltyRewardById(rewardId),
    enabled: !!rewardId,
  });

export const useCreateLoyaltyRewardMutation = () => {
  const qc = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createLoyaltyReward,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyaltyRewards"] });
      showSuccessToast("Reward created successfully");
    },
    onError: () => {
      showErrorToast("Error creating reward");
    },
  });
  return createMutation;
};

type UpdateReward = {
  name?: string;
  points?: number;
  description?: string;
  tnc?: string;
  maxPerUser?: number;
  waTemplateId?: string;
  expireAt?: Date;
};

export const useUpdateLoyaltyRewardMutation = (rewardId) => {
  const qc = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: (data: UpdateReward) => updateLoyaltyReward(rewardId, data),
    onSuccess: (_, reward) => {
      qc.invalidateQueries({ queryKey: ["loyaltyRewards", rewardId] });
      qc.invalidateQueries({ queryKey: ["loyaltyRewards"] });
      showSuccessToast("Reward updated successfully");
    },
    onError: () => {
      showErrorToast("Error updating reward");
    },
  });
  return updateMutation;
};

export const useDeleteRewardMutation = () => {
  const qc = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: deleteReward,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyaltyRewards"] });
      showSuccessToast("Reward deleted successfully");
    },
    onError: () => {
      showErrorToast("Error deleting reward");
    },
  });
  return deleteMutation;
};
