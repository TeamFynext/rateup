// For New Migrations and Updations

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  migrateLoyaltyTierPriority,
  migrateWaTemplateToWhatsappPhoneId,
  syncTeamFeatures,
} from "./update.api";

export const useMigrateWaTemplateToWhatsappPhoneId = () => {
  return useMutation({
    mutationFn: migrateWaTemplateToWhatsappPhoneId,
    onSuccess: () => {
      toast.success("WA template migration completed successfully");
    },
    onError: (error) => {
      toast.error(
        error?.message || "Failed to migrate WA template to WhatsApp phone ID",
      );
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
      toast.error(
        error?.message || "Failed to migrate loyalty tier priorities",
      );
    },
  });
};
