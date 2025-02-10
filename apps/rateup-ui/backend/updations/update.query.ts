//For New Migrations and Updations

import { useMutation } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "@/utils/notifications";

import {
  updateGoogleReviewQuestions,
  updateSubscriptionFeature,
  updateThemeTitleSt,
  updateUsageStatsResetDate,
} from "./update.api";

export const useUpdateGoogleReviewQuestions = () => {
  return useMutation({
    mutationFn: updateGoogleReviewQuestions,
    onSuccess: () => {
      showSuccessToast("Updated questions successfully");
    },
  });
};

export const useUpdateThemeTitleSt = () => {
  return useMutation({
    mutationFn: updateThemeTitleSt,
    onSuccess: () => {
      showSuccessToast("Update Success");
    },
    onError: () => {
      showErrorToast("Update Error");
    },
  });
};

export const useUpdateUsageStatsResetDate = () => {
  return useMutation({
    mutationFn: updateUsageStatsResetDate,
    onSuccess: () => {
      showSuccessToast("Update Success");
    },
    onError: () => {
      showErrorToast("Update Error");
    },
  });
};

export const useUpdateSubscription = () => {
  return useMutation({
    mutationFn: updateSubscriptionFeature,
    onSuccess: () => {
      showSuccessToast("Update Success");
    },
    onError: () => {
      showErrorToast("Update Error");
    },
  });
};
