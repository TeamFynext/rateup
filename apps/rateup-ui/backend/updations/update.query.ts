//For New Migrations and Updations

import { useMutation } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "@/utils/notifications";

import {
  automationSubscription,
  updateAutomationPhoneId,
  updateBackfillMessageData,
  updateCustomField,
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

export const useUpdateCustomField = () => {
  return useMutation({
    mutationFn: () => {
      return updateCustomField();
    },
    onSuccess: () => {
      showSuccessToast("Custom fields migrated successfully");
    },
    onError: () => {
      showErrorToast("Failed to migrate custom fields");
    },
  });
};

export const useUpdateAutomationPhoneId = () => {
  return useMutation({
    mutationFn: () => {
      return updateAutomationPhoneId();
    },
    onSuccess: () => {
      showSuccessToast("Automation phoneId migrated successfully");
    },
    onError: () => {
      showErrorToast("Failed to migrate automation phoneId");
    },
  });
};

export const useUpdateBackfillMessageData = () => {
  return useMutation({
    mutationFn: updateBackfillMessageData,
    onSuccess: () => {
      showSuccessToast("Message data backfilled to contact successfully");
    },
    onError: (e: any) => {
      showErrorToast(
        e?.response?.data || "Failed to backfill message data to contact",
      );
    },
  });
};
