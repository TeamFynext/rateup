//For New Migrations and Updations

import { useMutation } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "@/utils/notifications";

import {
  updateFreePlanSubscription,
  updateGoogleReviewQuestions,
} from "./update.api";

export const useUpdateGoogleReviewQuestions = () => {
  return useMutation({
    mutationFn: updateGoogleReviewQuestions,
    onSuccess: () => {
      showSuccessToast("Updated questions successfully");
    },
  });
};

export const useUpdateFreePlanSubscription = () => {
  return useMutation({
    mutationFn: updateFreePlanSubscription,
    onSuccess: () => {
      showSuccessToast("Update Success");
    },
    onError: () => {
      showErrorToast("Update Error");
    },
  });
};
