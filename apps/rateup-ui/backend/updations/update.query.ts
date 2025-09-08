//For New Migrations and Updations

import { useMutation } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "@/utils/notifications";

import {
  automationSubscription,
  updateUsageStats,
  updationAutomationTriggerSubscription,
} from "./update.api";

export const useUpdateUsageStats = () => {
  return useMutation({
    mutationFn: updateUsageStats,
    onSuccess: () => {
      showSuccessToast("Update Success");
    },
    onError: () => {
      showErrorToast("Update Error");
    },
  });
};

export const useAutomationSubscription = () => {
  return useMutation({
    mutationFn: automationSubscription,
    onSuccess: () => {
      showSuccessToast("Automation Subscription Updated");
    },
    onError: () => {
      showErrorToast("Automation Subscription Update Failed");
    },
  });
};

export const useUpdateAutomationTriggerSubscription = () => {
  return useMutation({
    mutationFn: updationAutomationTriggerSubscription,
    onSuccess: () => {
      showSuccessToast("Automation Subscription Updated");
    },
    onError: () => {
      showErrorToast("Automation Subscription Update Failed");
    },
  });
};
