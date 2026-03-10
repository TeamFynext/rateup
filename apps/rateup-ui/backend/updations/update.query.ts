//For New Migrations and Updations

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { migrateWaTemplateToWhatsappPhoneId } from "./update.api";

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
