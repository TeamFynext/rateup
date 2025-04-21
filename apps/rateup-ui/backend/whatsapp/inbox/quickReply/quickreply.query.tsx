import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createWaQuickReply,
  deleteQuickReplyById,
  getWaQuickReplies,
  updateQuickReplyById,
  updateQuickReplyOrder,
} from "./quickreply.api";

export const useWaQuickReplies = () => {
  const useGetWaQuickReplies = useQuery({
    queryFn: getWaQuickReplies,
    queryKey: ["quick-reply"],
  });

  const qc = useQueryClient();

  const useCreateWaQuickReply = useMutation({
    mutationFn: createWaQuickReply,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quick-reply"] });
    },
    onError: (e) => {
      console.error(e);
    },
  });

  const useUpdateReplyOrder = useMutation({
    mutationFn: updateQuickReplyOrder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quick-reply"] });
    },
    onError: (e) => {
      console.error(e);
    },
  });

  const useUpdateReply = useMutation({
    mutationFn: updateQuickReplyById,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quick-reply"] });
    },
    onError: (e) => {
      console.error(e);
    },
  });

  const useDeleteReply = useMutation({
    mutationFn: deleteQuickReplyById,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quick-reply"] });
    },
    onError: (e) => {
      console.error(e);
    },
  });

  return {
    waQuickReplies: useGetWaQuickReplies,
    createQuickReply: useCreateWaQuickReply,
    updateQuickReplyOrder: useUpdateReplyOrder,
    updateQuickReply: useUpdateReply,
    deleteQuickReplyById: useDeleteReply,
  };
};
