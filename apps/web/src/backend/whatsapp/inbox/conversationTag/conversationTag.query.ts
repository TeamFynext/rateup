import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/utils/apiError.ts";

import {
  assignTagsToConversation,
  createConversationTag,
  deleteConversationTag,
  getConversationTags,
  updateConversationTag,
  type ConversationTagOption,
  type UpdateConversationTagPayload,
} from "./conversationTag.api.ts";

export const conversationTagKeys = {
  all: () => ["conversationTags"] as const,
};

export const useConversationTags = () =>
  useQuery({
    queryKey: conversationTagKeys.all(),
    queryFn: getConversationTags,
  });

export const useCreateConversationTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createConversationTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationTagKeys.all() });
      toast.success("Tag created", { id: "conversation-tag-create" });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Error creating tag"), {
        id: "conversation-tag-create",
      });
    },
  });
};

export const useUpdateConversationTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tagId, data }: { tagId: string; data: UpdateConversationTagPayload }) =>
      updateConversationTag(tagId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationTagKeys.all() });
      toast.success("Tag updated", { id: "conversation-tag-update" });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Error updating tag"), {
        id: "conversation-tag-update",
      });
    },
  });
};

export const useDeleteConversationTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteConversationTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationTagKeys.all() });
      toast.success("Tag deleted", { id: "conversation-tag-delete" });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Error deleting tag"), {
        id: "conversation-tag-delete",
      });
    },
  });
};

/**
 * Attaching a tag changes the counts the settings list shows, so the tag list is
 * refetched too. The inbox row itself is updated by the caller against the store
 * — the list is a paginated raw-SQL query, not a react-query cache.
 */
export const useAssignConversationTags = () => {
  const queryClient = useQueryClient();
  return useMutation<ConversationTagOption[], Error, { conversationId: string; tagIds: string[] }>({
    mutationFn: ({ conversationId, tagIds }) => assignTagsToConversation(conversationId, tagIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationTagKeys.all() });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Error updating conversation tags"), {
        id: "conversation-tag-assign",
      });
    },
  });
};
