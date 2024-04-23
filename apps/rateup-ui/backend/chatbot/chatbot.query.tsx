import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createChatbot,
  deleteChatbotResource,
  deleteChatHistory,
  deleteManyChatbotResource,
  deletePublicChatHistory,
  getChatbotDetails,
  getChatbotPublicPageStatus,
  getChatbotResources,
  sendChatbotMessage,
  sendPublicChatbotMessage,
  updateChatbot,
  uploadSourceForEmbed,
} from "./chatbot.api";
import { showErrorToast, showSuccessToast } from "../../utils/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";

export const useChatMutation = () => {
  return useMutation({
    mutationFn: sendChatbotMessage,
    onSuccess: (data) => {},
    onError: (error) => {},
  });
};

export const useUploadSourceForEmbed = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadSourceForEmbed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbotResources"] });
      showSuccessToast("Uploaded Successfully", "url", <IconCheck />);
    },
    onError: (e) => {
      showErrorToast("Error in uploading", "url", <IconX />);
    },
  });
};

export const useGetChatbotResources = () => {
  return useQuery({
    queryKey: ["chatbotResources"],
    queryFn: getChatbotResources,
  });
};

export const useDeleteChatborResource = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteChatbotResource,
    onSuccess: () => {
      showSuccessToast(
        "Sources deleted Successfully",
        "source",
        <IconCheck />,
        true,
      );
      queryClient.invalidateQueries({ queryKey: ["chatbotResources"] });
    },
    onError: () => {
      showErrorToast("Error in deleting source", "source", <IconX />, true);
    },
  });
};
export const useDeleteManyChatborResource = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteManyChatbotResource,
    onSuccess: () => {
      showSuccessToast(
        "Sources deleted Successfully",
        "source",
        <IconCheck />,
        true,
      );
      queryClient.invalidateQueries({ queryKey: ["chatbotResources"] });
    },
    onError: () => {
      showErrorToast("Error in deleting source", "source", <IconX />, true);
    },
  });
};

export const useDeleteChatHistory = () => {
  return useMutation({
    mutationFn: deleteChatHistory,
  });
};

export const useDeletePublicChatHistory = () => {
  return useMutation({
    mutationFn: deletePublicChatHistory,
  });
};

export const usePublicChatMutation = () => {
  return useMutation({
    mutationFn: sendPublicChatbotMessage,
    onSuccess: (data) => {},
    onError: (error) => {},
  });
};

export const useGetChatbotPublicPageStatus = (chatbotId: string) => {
  return useQuery({
    queryFn: () => getChatbotPublicPageStatus(chatbotId),
    queryKey: ["chatbotPublicPageStatus", chatbotId],
    enabled: !!chatbotId,
  });
};

export const useGetChatbotDetails = () => {
  return useQuery({
    queryFn: getChatbotDetails,
    queryKey: ["chatbotDetails"],
  });
};

export const useCreateChatbot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createChatbot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbotDetails"] });
    },
  });
};

export const useUpdateChatbot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateChatbot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbotDetails"] });
    },
  });
};
