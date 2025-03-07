import { IconCheck, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast, showSuccessToast } from "../../utils/notifications";
import {
  createChatbot,
  deleteChatbotResource,
  deleteChatHistory,
  deleteManyChatbotResource,
  deletePublicChatHistory,
  getChatbotDetails,
  getChatbotPublicPageStatus,
  getChatbotResources,
  getUserAiChats,
  sendChatbotMessage,
  sendPublicChatbotMessage,
  updateChatbot,
  uploadSourceForEmbed,
} from "./chatbot.api";

export const useChatMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendChatbotMessage,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["aiChat"] });
    },
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteChatHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aiChat"] });
    },
  });
};

export const useDeletePublicChatHistory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePublicChatHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aiChat"] });
    },
  });
};

export const usePublicChatMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendPublicChatbotMessage,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["aiChat"] });
    },
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
      showSuccessToast("Chatbot updated");
    },
    onError: () => {
      showErrorToast("Updation Failed");
    },
  });
};

export const useGetUserAiChats = () => {
  return useQuery({
    queryFn: getUserAiChats,
    queryKey: ["aiChat"],
  });
};
