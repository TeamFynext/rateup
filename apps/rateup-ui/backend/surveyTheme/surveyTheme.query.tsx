import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";

import { showErrorToast, showSuccessToast } from "../../utils/notifications";
import {
  createNewTheme,
  deleteTheme,
  getAllThemes,
  getSurveyTheme,
  renameSurveyTheme,
  updateAllThemes,
  updateSurveyTheme,
} from "./surveyTheme.api";

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

export const useRenameSurveyThemeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: renameSurveyTheme,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["allThemes"],
      });
      showSuccessToast("Renamed theme successfully");
    },
    onError: () => {
      showErrorToast("Something went wrong, Error renaming survey theme");
    },
  });
};

export const useCreateNewThemeMutation = (surveyId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createNewTheme,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["allThemes"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["survey", surveyId],
      });
      showSuccessToast("Created and applied new theme successfully");
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

export const useUpdateAllThemesMutation = () => {
  return useMutation({
    mutationFn: updateAllThemes,
    onSuccess: () => {
      showSuccessToast(
        "No Json changes needed for now, if there is a need for json change check endpoint code",
      );
    },
    onError: (err) => {
      showErrorToast("Unable to update themes, please try again later.");
    },
  });
};
