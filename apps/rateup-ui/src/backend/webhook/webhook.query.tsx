import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { SaveWebhookInput } from "./webhook.api";
import { deleteWebhook, getWebhook, saveWebhook } from "./webhook.api";

const QUERY_KEY = ["webhook"];

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

export const useDeleteWebhookMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Webhook deleted");
    },
    onError: () => {
      toast.error("Failed to delete webhook");
    },
  });
};
