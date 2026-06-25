import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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

export const useUpdateSurveyTheme = (surveyThemeId: string, surveyId: string) => {
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
      toast.success("Created and applied new theme successfully");
    },
    onError: (error) => {
      // @ts-ignore
      if (err?.response?.data?.message) {
        // @ts-ignore
        toast.error(error?.message || err?.response?.data?.message);
      } else {
        toast.error(error?.message || "Unable to create theme, please try again later.");
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
