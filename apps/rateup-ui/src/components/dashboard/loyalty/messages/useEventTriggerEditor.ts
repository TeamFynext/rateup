import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";

import {
  createEventTrigger,
  updateEventTrigger,
  type EventTrigger,
  type LoyaltyEventType,
} from "@/backend/loyalty/eventTriggers.api";
import { useEventTriggers } from "@/backend/loyalty/eventTriggers.query";
import { automationKeys } from "@/backend/whatsapp/automation.keys";
import { getApiErrorMessage } from "@/utils/apiError.ts";

type TriggerPatch = Partial<
  Pick<EventTrigger, "enabled" | "waTemplateId" | "triggerDays" | "rewardId">
>;

/**
 * One trigger per event, saved a field at a time. `LoyaltyEventTrigger` has no unique on
 * [programId, eventType], so the first save of an event creates its row and later saves
 * update it — never a second row racing for the same event.
 */
export function useEventTriggerEditor(programId: string | undefined) {
  const queryClient = useQueryClient();
  const { data: triggers = [], isPending } = useEventTriggers(programId ?? "");

  const byEvent = useMemo(
    () =>
      new Map<LoyaltyEventType, EventTrigger>(
        triggers.map((trigger) => [trigger.eventType, trigger]),
      ),
    [triggers],
  );

  const save = useMutation({
    mutationFn: async ({
      eventType,
      patch,
    }: {
      eventType: LoyaltyEventType;
      patch: TriggerPatch;
    }) => {
      if (!programId) throw new Error("No programme");
      const existing = byEvent.get(eventType);
      if (existing) return updateEventTrigger(existing.id, patch);
      return createEventTrigger({ programId, eventType, enabled: false, ...patch });
    },
    onSuccess: () => {
      if (programId) {
        queryClient.invalidateQueries({ queryKey: automationKeys.eventTriggers(programId) });
      }
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "Could not save the message"));
    },
  });

  return {
    byEvent,
    isPending,
    save,
    isSaving: save.isPending,
    savingEvent: save.variables?.eventType,
  };
}
