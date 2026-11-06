import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createReviewSuggestions,
  deleteReviewSuggestion,
  getPublicReviewsBySurveyTeamMapId,
  getReviewsByTeamId,
  getReviewsCountByTeamId,
  updateReviewSuggestion,
} from "./reviewSuggestion.api";

export const useReviewSuggestions = (enabled: boolean, teamId: string) =>
  useQuery({
    enabled: enabled,
    queryKey: ["reviewSuggestion", teamId],
    queryFn: () => getReviewsByTeamId(teamId),
  });
export const usePublicReviewSuggestions = (
  enabled: boolean,
  surveyTeamMapId: string,
  language: string,
) =>
  useQuery({
    enabled: !!enabled,
    queryKey: ["reviewSuggestion", surveyTeamMapId],
    queryFn: () => getPublicReviewsBySurveyTeamMapId(surveyTeamMapId, language),
  });
export const useReviewSuggestionsCount = (enabled: boolean, teamId: string) =>
  useQuery({
    enabled: enabled,
    queryKey: ["reviewSuggestion", teamId, "count"],
    queryFn: () => getReviewsCountByTeamId(teamId),
  });
export const useCreateReviewSuggestionsMutation = (teamId: string) => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createReviewSuggestions,
    onSuccess: () => {
      toast.success("Review suggestions created successfully");
      queryClient.invalidateQueries({
        queryKey: ["reviewSuggestion", teamId],
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Error creating review suggestions");
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
      toast.success("Review suggestion updated successfully");
      console.log(variables);
      onSuccess();
      queryClient.invalidateQueries({
        queryKey: ["reviewSuggestion", teamId],
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Error updating review suggestion");
      onError();
    },
  });
  return updateMutation;
};

export const useDeleteReviewSuggestionMutation = (
  teamId: string,
  suppressNotifications = false,
) => {
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: deleteReviewSuggestion,
    onSuccess: () => {
      if (!suppressNotifications) toast.success("Review suggestion deleted successfully");
      queryClient.invalidateQueries({
        queryKey: ["reviewSuggestion", teamId],
      });
    },
    onError: (error) => {
      if (!suppressNotifications) toast.error(error?.message || "Error deleting review suggestion");
    },
  });
  return deleteMutation;
};
