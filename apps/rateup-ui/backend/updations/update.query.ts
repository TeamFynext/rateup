//For New Migrations and Updations

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  automationSubscription,
  migrateAutomationToRules,
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
      toast.success("Update Success");
    },
    onError: (error) => {
      toast.error(error?.message || "Update Error");
    },
  });
};

export const useAutomationSubscription = () => {
  return useMutation({
    mutationFn: automationSubscription,
    onSuccess: () => {
      toast.success("Automation Subscription Updated");
    },
    onError: (error) => {
      toast.error(error?.message || "Automation Subscription Update Failed");
    },
  });
};

export const useUpdateAutomationTriggerSubscription = () => {
  return useMutation({
    mutationFn: updationAutomationTriggerSubscription,
    onSuccess: () => {
      toast.success("Automation Subscription Updated");
    },
    onError: (error) => {
      toast.error(error?.message || "Automation Subscription Update Failed");
    },
  });
};

export const useUpdateAutomationUsageStats = () => {
  return useMutation({
    mutationFn: updationAutomationUsageStats,
    onSuccess: () => {
      toast.success("Automation usage stats Updated");
    },
    onError: (error) => {
      toast.error(error?.message || "Automation usage stats Update Failed");
    },
  });
};

export const useUpdateSubscriptionNewFeat = () => {
  return useMutation({
    mutationFn: updateSubscriptionNewFeat,
    onSuccess: () => {
      toast.success("success");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed");
    },
  });
};

export const useUpdateFreePlanSubscriptionExpiry = () => {
  return useMutation({
    mutationFn: updateFreePlanSubscriptionExpiry,
    onSuccess: () => {
      toast.success("success");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed");
    },
  });
};
export const useUpdateLifecycle = () => {
  return useMutation({
    mutationFn: () => {
      return updateLifecycle();
    },
    onSuccess: () => {
      toast.success("Lifecycle added successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to add lifecycle");
    },
  });
};

export const useUpdateCustomField = () => {
  return useMutation({
    mutationFn: () => {
      return updateCustomField();
    },
    onSuccess: () => {
      toast.success("Custom fields migrated successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to migrate custom fields");
    },
  });
};

export const useUpdateAutomationPhoneId = () => {
  return useMutation({
    mutationFn: () => {
      return updateAutomationPhoneId();
    },
    onSuccess: () => {
      toast.success("Automation phoneId migrated successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to migrate automation phoneId");
    },
  });
};

export const useUpdateBackfillMessageData = () => {
  return useMutation({
    mutationFn: updateBackfillMessageData,
    onSuccess: () => {
      toast.success("Message data backfilled to contact successfully");
    },
    onError: (error) => {
      toast.error(
        error?.message || "Failed to backfill message data to contact",
      );
    },
  });
};

export const useMigrateAutomationToRules = () => {
  return useMutation({
    mutationFn: migrateAutomationToRules,
    onSuccess: () => {
      toast.success("Automation migrated to rules successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to migrate automation to rules");
    },
  });
};
