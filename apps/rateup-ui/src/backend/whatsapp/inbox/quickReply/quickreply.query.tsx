import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createWaQuickReply,
  deleteQuickReplyById,
  getWaQuickReplies,
  updateQuickReplyById,
  updateQuickReplyOrder,
} from "./quickreply.api";

export const useGetWaQuickReplies = () => {
  return useQuery({
    queryFn: getWaQuickReplies,
    queryKey: ["quick-reply"],
  });
};

export const useCreateWaQuickReply = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createWaQuickReply,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quick-reply"] });
    },
    onError: (error) => {
      toast.error(error?.message || "Creation failed");
    },
  });
};

const _useUpdateReplyOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateQuickReplyOrder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quick-reply"] });
    },
    onError: (error) => {
      toast.error(error?.message || "Update failed");
    },
  });
};

export const useUpdateReply = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateQuickReplyById,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quick-reply"] });
    },
    onError: (error) => {
      toast.error(error?.message || "Updation failed");
    },
  });
};

export const useDeleteReply = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteQuickReplyById,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quick-reply"] });
    },
    onError: (error) => {
      toast.error(error?.message || "Deletion failed");
    },
  });
};
