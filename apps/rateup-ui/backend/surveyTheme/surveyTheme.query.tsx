import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSurveyTheme, updateSurveyTheme } from "./surveyTheme.api";
import { SurveyTheme } from "../../components/Survey/SurveyTheme/surveyTheme.types";
import { showErrorToast, showSuccessToast } from "../../utils/notifications";

export const useSurveyTheme = (surveyId: string) => {
  return useQuery({
    queryKey: ["surveyTheme", surveyId],
    queryFn: () => getSurveyTheme(surveyId),
    enabled: !!surveyId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useUpdateSurveyTheme = (surveyId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSurveyTheme,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["surveyTheme", surveyId],
      });
      showSuccessToast("Survey theme updated successfully");
    },
    onError: () => {
      showErrorToast("Something went wrong, Error updating survey theme");
    },
  });
};
