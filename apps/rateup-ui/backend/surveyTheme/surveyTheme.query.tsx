import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createNewTheme,
  deleteTheme,
  getAllThemes,
  getSurveyTheme,
  updateSurveyTheme,
} from "./surveyTheme.api";
import { showErrorToast, showSuccessToast } from "../../utils/notifications";
import { AxiosError } from "axios";

export const useSurveyTheme = (surveyThemeId: string) => {
  return useQuery({
    queryKey: ["surveyTheme", surveyThemeId],
    queryFn: () => getSurveyTheme(surveyThemeId),
    enabled: !!surveyThemeId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useAllThemes = () => {
  return useQuery({
    queryKey: ["allThemes"],
    queryFn: getAllThemes,
  });
};

export const useUpdateSurveyTheme = (
  surveyThemeId: string,
  surveyId: string,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSurveyTheme,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["allThemes"],
      });
      queryClient.invalidateQueries({
        queryKey: ["survey", surveyId],
      });
      queryClient.invalidateQueries({
        queryKey: ["surveyTheme", surveyThemeId],
      });
      showSuccessToast("Survey theme updated successfully");
    },
    onError: () => {
      showErrorToast("Something went wrong, Error updating survey theme");
    },
  });
};

export const useCreateNewThemeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createNewTheme,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["allThemes"],
      });
      showSuccessToast("Created new theme successfully");
    },
    onError: (err: AxiosError) => {
      // @ts-ignore
      if (err?.response?.data?.message) {
        // @ts-ignore
        showErrorToast(err?.response?.data?.message);
      } else {
        showErrorToast("Unable to create theme, please try again later.");
      }
    },
  });
};

export const useDeleteThemeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTheme,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["allThemes"],
      });
      showSuccessToast("Deleted theme successfully");
    },
    onError: (err) => {
      showErrorToast("unable to delete theme, please try again later.");
    },
  });
};
