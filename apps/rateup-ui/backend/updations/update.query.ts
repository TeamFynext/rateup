//For New Migrations and Updations

import { useMutation } from "@tanstack/react-query";

import {
  showErrorToast,
  showLoadingToast,
  showSuccessToast,
} from "@/utils/notifications";

import {
  transferDataToIntegration,
  updateAllSurveys,
  updateDatabase,
  updatePageTypeQuestions,
} from "./update.api";

export const useUpdateSurveyEditorMutation = () => {
  return useMutation({
    mutationFn: updateAllSurveys,
    onSuccess: () => {
      showSuccessToast("Updated Survey structures.");
    },
    onError: (err) => {
      showErrorToast(
        "Unable to update Survey structures, please try again later.",
      );
    },
  });
};

export const useUpdateDatabaseMutation = () => {
  return useMutation({
    mutationFn: updateDatabase,
    onSuccess: () => {
      showSuccessToast("Updated Database.");
    },
    onError: (err) => {
      showErrorToast("Unable to update Database, please try again later.");
    },
  });
};

export const useTransferDataToIntegration = () => {
  return useMutation({
    mutationFn: async ({ app }: { app: string }) => {
      showLoadingToast("Transfering data...", "transfer", true, "", "", false);
      return await transferDataToIntegration(app);
    },
    onSuccess: (data: any) => {
      showSuccessToast(`Success: ${data?.message}`, "transfer", "", true);
    },
    onError: () => {
      showErrorToast("Data transfer failed", "transfer", "", true);
    },
  });
};

export const useUpdatePageTypeQuestions = () => {
  return useMutation({
    mutationFn: updatePageTypeQuestions,
    onSuccess: () => {
      showSuccessToast("Updated questions successfully");
    },
  });
};
