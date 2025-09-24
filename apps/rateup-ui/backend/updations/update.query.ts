//For New Migrations and Updations

import { useMutation } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "@/utils/notifications";

import {
  automationSubscription,
  updateFreePlanSubscriptionExpiry,
  updateLifecycle,
  updateSubscriptionNewFeat,
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

export const useUpdateSubscriptionNewFeat = () => {
  return useMutation({
    mutationFn: updateSubscriptionNewFeat,
    onSuccess: () => {
      showSuccessToast("success");
    },
    onError: () => {
      showErrorToast("Failed");
    },
  });
};

export const useUpdateFreePlanSubscriptionExpiry = () => {
  return useMutation({
    mutationFn: updateFreePlanSubscriptionExpiry,
    onSuccess: () => {
      showSuccessToast("success");
    },
    onError: () => {
      showErrorToast("Failed");
    },
  });
};
export const useUpdateLifecycle = () => {
  return useMutation({
    mutationFn: () => {
      return updateLifecycle();
    },
    onSuccess: () => {
      showSuccessToast("Lifecycle added successfully");
    },
    onError: () => {
      showErrorToast("Failed to add lifecycle");
    },
  });
};
