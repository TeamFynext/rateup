// For New Migrations and Updations

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  migrateWaTemplateToWhatsappPhoneId,
  syncTeamFeatures,
  migrateLoyaltyTierPriority,
  seedInboxStats,
  reconcileInboxStatus,
} from "./update.api";

export const useMigrateWaTemplateToWhatsappPhoneId = () => {
  return useMutation({
    mutationFn: migrateWaTemplateToWhatsappPhoneId,
    onSuccess: () => {
      toast.success("WA template migration completed successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to migrate WA template to WhatsApp phone ID");
    },
  });
};

export const useSyncTeamFeatures = () => {
  return useMutation({
    mutationFn: syncTeamFeatures,
    onSuccess: () => {
      toast.success("Team features synced successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to sync team features");
    },
  });
};

export const useMigrateLoyaltyTierPriority = () => {
  return useMutation({
    mutationFn: migrateLoyaltyTierPriority,
    onSuccess: () => {
      toast.success("Loyalty tier priorities migrated successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to migrate loyalty tier priorities");
    },
  });
};

export const useSeedInboxStats = () => {
  return useMutation({
    mutationFn: seedInboxStats,
    onSuccess: (response: any) => {
      toast.success(response?.data || "Inbox stats seeded successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to seed inbox stats");
    },
  });
};

export const useReconcileInboxStatus = () => {
  return useMutation({
    mutationFn: (apply: boolean) => reconcileInboxStatus(apply),
    onSuccess: ({ data }) => {
      const detail = `Scanned ${data.scanned}, mismatched ${data.mismatched}, skipped ${data.skippedReopenPending} pending reopen.`;
      // A dry run wrote nothing, so it is an info toast rather than a success.
      const notify = data.applied ? toast.success : toast.info;
      notify(data.message, { description: detail, id: "reconcile-inbox-status" });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to reconcile inbox status");
    },
  });
};
