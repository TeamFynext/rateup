import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
    onError: (e) => {
      console.error(e);
    },
  });
};

export const useUpdateReplyOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateQuickReplyOrder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quick-reply"] });
    },
    onError: (e) => {
      console.error(e);
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
    onError: (e) => {
      console.error(e);
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
    onError: (e) => {
      console.error(e);
    },
  });
};
