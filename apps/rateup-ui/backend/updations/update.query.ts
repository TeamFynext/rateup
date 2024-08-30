//For New Migrations and Updations

import { useMutation } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "@/utils/notifications";

import { createHubSpotContacts, updateWebSurveyPagesTheme } from "./update.api";

export const useUpdateWebSurveyPagesTheme = () => {
  return useMutation({
    mutationFn: updateWebSurveyPagesTheme,
    onSuccess: () => {
      showSuccessToast("Updated questions successfully");
    },
  });
};

export const useCreateHubSpotContacts = () => {
  return useMutation({
    mutationFn: createHubSpotContacts,
    onSuccess: (data) => {
      showSuccessToast(
        `User emails exported to hub spot successfully: ${data?.message ?? ""}`,
      );
    },
    onError: (e: any) => {
      showErrorToast(
        `Error exporting user contacts: ${e.response?.data?.message ?? ""}`,
      );
    },
  });
};
