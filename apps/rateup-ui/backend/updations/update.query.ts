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
    onSuccess: () => {
      showSuccessToast("User emails exported to hub spot successfully");
    },
    onError: () => {
      showErrorToast("Error exporting user contacts");
    },
  });
};
