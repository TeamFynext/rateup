import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createWaAutomatedReply,
  deleteWaAutomatedReply,
  getWaAutomatedRepliesById,
  getWaAutomatedRepliesByTeamId,
  updateWaAutomatedReply,
} from "./automatedReply.api";
import { showSuccessToast } from "../../../utils/notifications";

export const useWaAutomatedReplies = (teamId: string) =>
  useQuery({
    queryKey: ["waAutomatedReplies", { teamId }],
    queryFn: () => getWaAutomatedRepliesByTeamId(teamId),
    enabled: !!teamId,
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
      qc.invalidateQueries({
        queryKey: ["waAutomatedReplies", { teamId: data.teamId }],
      });
      showSuccessToast("Automated Reply Created Successfully");
    },
  });
};

export const useDeleteWaAutomatedReplyMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (waAutomatedReplyId: string) =>
      deleteWaAutomatedReply(waAutomatedReplyId),
    onSuccess: (res) => {
      qc.invalidateQueries({
        queryKey: ["waAutomatedReplies", { teamId: res.teamId }],
      });
      qc.invalidateQueries({
        queryKey: ["waAutomatedReply", { waAutomatedReplyId: res.id }],
      });
      showSuccessToast("Automated Reply Deleted Successfully");
    },
  });
};

export const useUpdateWaAutomatedReplyMutation = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: any) => updateWaAutomatedReply(id, data),
    onSuccess: (res) => {
      console.log("res => ", res);
      qc.invalidateQueries({
        queryKey: ["waAutomatedReply", { waAutomatedReplyId: res.id }],
      });
      qc.invalidateQueries({
        queryKey: ["waAutomatedReplies", { teamId: res.teamId }],
      });
      showSuccessToast("Automated Reply Updated Successfully");
    },
  });
};
