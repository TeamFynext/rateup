import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { shouldSkipLocalErrorToast } from "@/backend/apiClient";
import { automationKeys } from "@/backend/whatsapp/automation.keys";
import type { RequestPayload, RequestPayloadFields } from "@/types/api.ts";

import {
  createWaAutomatedReply,
  getAllWaAutomatedReplies,
  getWaAutomatedRepliesById,
  initiateWaAutomatedReply,
  updateWaAutomatedReply,
} from "./automatedReply.api";

export const useAllWaAutomatedReplies = () =>
  useQuery({
    queryKey: ["allWaAutomatedReplies"],
    queryFn: getAllWaAutomatedReplies,
  });

export const useWaAutomatedReplyById = (waAutomatedReplyId: string) =>
  useQuery({
    queryKey: automationKeys.waAutomatedReply({ waAutomatedReplyId }),
    queryFn: () => getWaAutomatedRepliesById(waAutomatedReplyId),
    enabled: !!waAutomatedReplyId,
  });

export const useCreateWaAutomatedReplyMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RequestPayload) => createWaAutomatedReply(data),
    onSuccess: (_, _data) => {
      qc.invalidateQueries({ queryKey: ["allWaAutomatedReplies"] });
      toast.success("Automated Reply created");
    },
    onError: (error) => {
      if (!shouldSkipLocalErrorToast(error))
        toast.error(error?.message || "Error Creating Automated Reply");
    },
  });
};

export const useUpdateWaAutomatedReplyMutation = () => {
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & RequestPayloadFields) =>
      updateWaAutomatedReply(id, data),
    onError: (error) => {
      if (!shouldSkipLocalErrorToast(error)) {
        toast.error(error?.message ?? "Error Updating Automated Reply");
      }
    },
  });
};

export const useInitiateWaAutomatedReplyMutation = (waAutomatedReplyId: string) => {
  return useMutation({
    mutationFn: ({ phone }: { phone: string }) =>
      initiateWaAutomatedReply(waAutomatedReplyId, phone),
    onSuccess: (_res) => {
      toast.success("Automation initiated Successfully");
    },
    onError: (error) => {
      if (!shouldSkipLocalErrorToast(error)) {
        toast.error(error?.message ?? "Error initiating Automated Reply");
      }
    },
  });
};
