import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getRewards,
  getReward,
  createReward,
  updateReward,
  deleteReward,
} from "./reward.api";
import { showSuccessToast, showErrorToast } from "../../../utils/notifications";

export const useRewards = (enabled: boolean) =>
  useQuery({
    queryKey: ["rewards"],
    queryFn: () => getRewards(),
    enabled,
  });

export const useReward = (rewardId: string) =>
  useQuery({
    queryKey: ["rewards", rewardId],
    queryFn: () => getReward(rewardId),
    enabled: !!rewardId,
  });

export const useCreateRewardMutation = () => {
  const qc = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createReward,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rewards"] });
      showSuccessToast("Reward created successfully");
    },
    onError: () => {
      showErrorToast("Error creating reward");
    },
  });
  return createMutation;
};

export const useUpdateRewardMutation = () => {
  const qc = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: updateReward,
    onSuccess: (_, reward) => {
      qc.invalidateQueries({ queryKey: ["rewards", reward.id] });
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
      qc.invalidateQueries({ queryKey: ["rewards"] });
      showSuccessToast("Reward deleted successfully");
    },
    onError: () => {
      showErrorToast("Error deleting reward");
    },
  });
  return deleteMutation;
};
