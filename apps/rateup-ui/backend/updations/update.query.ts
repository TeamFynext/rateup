//For New Migrations and Updations

import { useMutation } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "@/utils/notifications";

import {
  automationSubscription,
  updateUsageStats,
  updationAutomationTriggerSubscription,
  updationAutomationUsageStats,
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

export const useUpdateAutomationUsageStats = () => {
  return useMutation({
    mutationFn: updationAutomationUsageStats,
    onSuccess: () => {
      showSuccessToast("Automation usage stats Updated");
    },
    onError: () => {
      showErrorToast("Automation usage stats Update Failed");
    },
  });
};
