import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { shouldSkipLocalErrorToast } from "@/backend/apiClient";

import {
  cloneWaAutomatedReply,
  createWaAutomatedReply,
  deleteWaAutomatedReply,
  getAllWaAutomatedReplies,
  getAutomatedRepliesMessageById,
  getWaAutomatedRepliesById,
  getWaAutomatedRepliesByTeamId,
  initiateWaAutomatedReply,
  updateWaAutomatedReply,
} from "./automatedReply.api";

export const useWaAutomatedReplies = (teamId: string) =>
  useQuery({
    queryKey: ["waAutomatedReplies", { teamId }],
    queryFn: () => getWaAutomatedRepliesByTeamId(teamId),
    enabled: !!teamId,
  });

export const useWaAutomatedRepliesMessageById = (id: string) =>
  useQuery({
    queryKey: ["waAutomatedRepliesMessageById", { id }],
    queryFn: () => getAutomatedRepliesMessageById(id),
    enabled: !!id,
  });

export const useAllWaAutomatedReplies = () =>
  useQuery({
    queryKey: ["allWaAutomatedReplies"],
    queryFn: getAllWaAutomatedReplies,
  });

export const useWaAutomatedReplyById = (waAutomatedReplyId: string) =>
  useQuery({
    queryKey: ["waAutomatedReply", { waAutomatedReplyId }],
    queryFn: () => getWaAutomatedRepliesById(waAutomatedReplyId),
    enabled: !!waAutomatedReplyId,
  });

export const useCreateWaAutomatedReplyMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createWaAutomatedReply(data),
    onSuccess: (_, _data) => {
      qc.invalidateQueries({ queryKey: ["allWaAutomatedReplies"] });
      toast.success("Automated Reply Created Successfully");
    },
    onError: (error) => {
      if (!shouldSkipLocalErrorToast(error))
        toast.error(error?.message || "Error Creating Automated Reply");
    },
  });
};

export const useDeleteWaAutomatedReplyMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (waAutomatedReplyId: string) => deleteWaAutomatedReply(waAutomatedReplyId),
    onSuccess: (_res) => {
      qc.invalidateQueries({ queryKey: ["allWaAutomatedReplies"] });
      toast.success("Automated Reply Deleted Successfully");
    },
  });
};

export const useCloneWaAutomatedReplyMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cloneWaAutomatedReply,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allWaAutomatedReplies"] });
      toast.success("Automation cloned");
    },
    onError: (error) => {
      if (!shouldSkipLocalErrorToast(error)) {
        toast.error(error?.message ?? "Error cloning automation");
      }
    },
  });
};

export const useUpdateWaAutomatedReplyMutation = () => {
  return useMutation({
    mutationFn: ({ id, ...data }: any) => updateWaAutomatedReply(id, data),
    onError: (error) => {
      if (!shouldSkipLocalErrorToast(error)) {
        toast.error(error?.message ?? "Error Updating Automated Reply");
      }
    },
  });
};

export const useInitiateWaAutomatedReplyMutation = (waAutomatedReplyId: string) => {
  return useMutation({
    mutationFn: ({ phone }: any) => initiateWaAutomatedReply(waAutomatedReplyId, phone),
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
