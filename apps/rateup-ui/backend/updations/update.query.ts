//For New Migrations and Updations

import { useMutation } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "@/utils/notifications";

import { updateAllSurveys } from "./update.api";

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
