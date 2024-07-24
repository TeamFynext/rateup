//For New Migrations and Updations

import { showErrorToast, showSuccessToast } from "@/utils/notifications";
import { useMutation } from "@tanstack/react-query";

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
