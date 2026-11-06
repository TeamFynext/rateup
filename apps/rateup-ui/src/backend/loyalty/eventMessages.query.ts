import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/utils/apiError.ts";

import { automationKeys } from "../whatsapp/automation.keys";
import { whatsappKeys } from "../whatsapp/whatsapp.keys";
import { saveEventMessage, type SaveEventMessageInput } from "./eventMessages.api";
import type { LoyaltyEventType } from "./eventTriggers.api";
import { loyaltyKeys } from "./loyalty.keys";
import type { EventTemplateResult } from "./onboarding.api";

/**
 * Saving a notification's text changes the template library, the trigger it wires and the
 * "awaiting Meta" count the sidebar shows, so all three caches are swept.
 */
export function useSaveEventMessageMutation(
  programId: string | undefined,
  onSuccess?: (result: EventTemplateResult) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventType,
      ...input
    }: SaveEventMessageInput & { eventType: LoyaltyEventType }) =>
      saveEventMessage(eventType, input),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: whatsappKeys.templates() });
      queryClient.invalidateQueries({ queryKey: loyaltyKeys.onboardingState() });
      if (programId) {
        queryClient.invalidateQueries({ queryKey: automationKeys.eventTriggers(programId) });
      }
      onSuccess?.(result);
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Could not save the message"));
    },
  });
}
