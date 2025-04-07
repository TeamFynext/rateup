import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "../../../utils/notifications";
import {
  createWaAutomatedReply,
  deleteWaAutomatedReply,
  getAllWaAutomatedReplies,
  getAutomatedRepliesMessageById,
  getWaAutomatedRepliesById,
  getWaAutomatedRepliesByTeamId,
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
    onSuccess: (_, data) => {
      qc.invalidateQueries({ queryKey: ["allWaAutomatedReplies"] });
      showSuccessToast("Automated Reply Created Successfully");
    },
    onError: (error: any) => {
      showErrorToast(error?.response?.data ?? "Error Creating Automated Reply");
    },
  });
};

export const useDeleteWaAutomatedReplyMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (waAutomatedReplyId: string) =>
      deleteWaAutomatedReply(waAutomatedReplyId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["allWaAutomatedReplies"] });
      showSuccessToast("Automated Reply Deleted Successfully");
    },
  });
};

export const useUpdateWaAutomatedReplyMutation = (waAutomatedReplyId) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: any) => updateWaAutomatedReply(id, data),
    onSuccess: (res) => {
      // qc.invalidateQueries({
      //   queryKey: ["waAutomatedReply", { waAutomatedReplyId }],
      // });
      showSuccessToast("Automated Reply Updated Successfully");
    },
    onError: (error: any) => {
      showErrorToast(error?.response?.data ?? "Error Updating Automated Reply");
    },
  });
};
