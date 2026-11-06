import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/utils/apiError.ts";

import { automationKeys } from "../whatsapp/automation.keys";
import type { LoyaltyEventType } from "./eventTriggers.api";
import { saveReminder, type SaveReminderInput } from "./reminders.api";

/**
 * Saving a reminder's schedule touches only its trigger row, so only the trigger list is
 * swept — unlike saving its words, which also changes the template library and the
 * "awaiting Meta" count.
 */
export function useSaveReminderMutation(programId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventType, ...input }: SaveReminderInput & { eventType: LoyaltyEventType }) =>
      saveReminder(eventType, input),
    onSuccess: () => {
      if (programId) {
        queryClient.invalidateQueries({ queryKey: automationKeys.eventTriggers(programId) });
      }
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Could not save the reminder"));
    },
  });
}
