import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { SaveWebhookInput, WebhookEvent } from "./webhook.api";
import {
  deleteWebhook,
  getWebhook,
  getWebhookSecret,
  rotateWebhookSecret,
  saveWebhook,
  updateWebhookEvents,
} from "./webhook.api";

const QUERY_KEY = ["webhook"];
const SECRET_KEY = ["webhook", "secret"];

export const useWebhook = () =>
  useQuery({
    queryKey: QUERY_KEY,
    queryFn: getWebhook,
  });

export const useSaveWebhookMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SaveWebhookInput) => saveWebhook(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Webhook saved");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to save webhook");
    },
  });
};

export const useUpdateWebhookEventsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (events: WebhookEvent[]) => updateWebhookEvents(events),
    onSuccess: (saved) => {
      queryClient.setQueryData(QUERY_KEY, saved);
    },
    onError: () => {
      toast.error("Failed to update webhook events");
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
};

export const useDeleteWebhookMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.removeQueries({ queryKey: SECRET_KEY });
      toast.success("Webhook deleted");
    },
    onError: () => {
      toast.error("Failed to delete webhook");
    },
  });
};

/** Fetched only once someone asks to see it. */
export const useWebhookSecret = (enabled: boolean) =>
  useQuery({
    queryKey: SECRET_KEY,
    queryFn: getWebhookSecret,
    enabled,
    staleTime: Infinity,
  });

export const useRotateWebhookSecretMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rotateWebhookSecret,
    onSuccess: (data) => {
      queryClient.setQueryData(SECRET_KEY, data);
      toast.success("Signing secret replaced");
    },
    onError: () => {
      toast.error("Failed to replace the signing secret");
    },
  });
};
