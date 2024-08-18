//For New Migrations and Updations

import { useMutation } from "@tanstack/react-query";

import { showSuccessToast } from "@/utils/notifications";

import { updatePageTypeQuestions } from "./update.api";

export const useUpdatePageTypeQuestions = () => {
  return useMutation({
    mutationFn: updatePageTypeQuestions,
    onSuccess: () => {
      showSuccessToast("Updated questions successfully");
    },
  });
};
