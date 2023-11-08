import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createReviewSuggestion,
  deleteReviewSuggestion,
  getReviewsByTeamId,
  updateReviewSuggestion,
} from "./reviewSuggestion.api";
import { showSuccessToast, showErrorToast } from "../../../utils/notifications";

export const useReviewSuggestions = (enabled: boolean, teamId: string) =>
  useQuery({
    enabled: enabled,
    queryKey: ["reviewSuggestion", teamId],
    queryFn: () => getReviewsByTeamId(teamId),
  });

export const useCreateReviewSuggestionMutation = (
  teamId: string,
  onSuccess = () => {},
  onError = () => {},
) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createReviewSuggestion,
    onSuccess: () => {
      showSuccessToast("Review suggestion created successfully");
      onSuccess();
      queryClient.invalidateQueries({
        queryKey: ["reviewSuggestion", teamId],
      });
    },
    onError: () => {
      showErrorToast("Error creating review suggestion");
      onError();
    },
  });
  return createMutation;
};

export const useUpdateReviewSuggestionMutation = (
  teamId: string,
  onSuccess = () => {},
  onError = () => {},
) => {
  const queryClient = useQueryClient();
  const updateMutation = useMutation({
    mutationFn: updateReviewSuggestion,
    onSuccess: (_data, variables) => {
      showSuccessToast("Review suggestion updated successfully");
      console.log(variables);
      onSuccess();
      queryClient.invalidateQueries({
        queryKey: ["reviewSuggestion", teamId],
      });
    },
    onError: () => {
      showErrorToast("Error updating review suggestion");
      onError();
    },
  });
  return updateMutation;
};

export const useDeleteReviewSuggestionMutation = (
  teamId: string,
  onSuccess = () => {},
  onError = () => {},
  suppressNotifications = false,
) => {
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: deleteReviewSuggestion,
    onSuccess: () => {
      suppressNotifications ||
        showSuccessToast("Review suggestion deleted successfully");
      onSuccess();
      queryClient.invalidateQueries({
        queryKey: ["reviewSuggestion", teamId],
      });
    },
    onError: () => {
      suppressNotifications ||
        showErrorToast("Error deleting review suggestion");
      onError();
    },
  });
  return deleteMutation;
};
