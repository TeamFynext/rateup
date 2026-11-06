import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";

import { surveyKeys } from "@/backend/surveys/survey.keys";

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
    queryKey: surveyKeys.theme(surveyThemeId),
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

export const useUpdateSurveyTheme = (surveyThemeId: string, surveyId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSurveyTheme,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["allThemes"],
      });
      queryClient.invalidateQueries({
        queryKey: surveyKeys.detail(surveyId),
      });
      queryClient.invalidateQueries({
        queryKey: surveyKeys.theme(surveyThemeId),
      });
      toast.success("Survey theme updated successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Something went wrong, Error updating survey theme");
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
      toast.success("Renamed theme successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Something went wrong, Error renaming survey theme");
    },
  });
};

export const useCreateNewThemeMutation = (surveyId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createNewTheme,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["allThemes"],
      });
      await queryClient.invalidateQueries({
        queryKey: surveyKeys.detail(surveyId),
      });
      toast.success("Created and applied new theme successfully");
    },
    onError: (error) => {
      const apiMessage = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      toast.error(
        error?.message || apiMessage || "Unable to create theme, please try again later.",
      );
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
      toast.success("Deleted theme successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "unable to delete theme, please try again later.");
    },
  });
};

export const useUpdateAllThemesMutation = () => {
  return useMutation({
    mutationFn: updateAllThemes,
    onSuccess: () => {
      toast.success(
        "No Json changes needed for now, if there is a need for json change check endpoint code",
      );
    },
    onError: (error) => {
      toast.error(error?.message || "Unable to update themes, please try again later.");
    },
  });
};
