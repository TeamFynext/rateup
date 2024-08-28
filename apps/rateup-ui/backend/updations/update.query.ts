//For New Migrations and Updations

import { useMutation } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "@/utils/notifications";

import { createHubSpotContacts, updatePageTypeQuestions } from "./update.api";

export const useUpdatePageTypeQuestions = () => {
  return useMutation({
    mutationFn: updatePageTypeQuestions,
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
