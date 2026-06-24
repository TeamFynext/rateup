import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { EventTriggerInput, EventTriggerUpdateInput } from "./eventTriggers.api";
import {
  createEventTrigger,
  deleteEventTrigger,
  getEventTrigger,
  getEventTriggers,
  updateEventTrigger,
} from "./eventTriggers.api";

export const useEventTriggers = (programId: string) =>
  useQuery({
    queryKey: ["event-triggers", programId],
    queryFn: () => getEventTriggers(programId),
    enabled: !!programId,
  });

const _useEventTrigger = (id: string) =>
  useQuery({
    queryKey: ["event-trigger", id],
    queryFn: () => getEventTrigger(id),
    enabled: !!id,
  });

export const useCreateEventTriggerMutation = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EventTriggerInput) => createEventTrigger(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["event-triggers", variables.programId],
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error?.message || "Error creating event trigger");
    },
  });
};

const _useUpdateEventTriggerMutation = (id: string, programId: string, onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EventTriggerUpdateInput) => updateEventTrigger(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["event-triggers", programId],
      });
      queryClient.invalidateQueries({ queryKey: ["event-trigger", id] });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error?.message || "Error updating event trigger");
    },
  });
};

const _useDeleteEventTriggerMutation = (programId: string, onSuccess?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteEventTrigger(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["event-triggers", programId],
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error?.message || "Error deleting event trigger");
    },
  });
};
