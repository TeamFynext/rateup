import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createChatbot,
  deleteChatbot,
  deleteChatbotResource,
  deleteChatHistory,
  deleteManyChatbotResource,
  deletePublicChatHistory,
  getAllChatbots,
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
      toast.success("Uploaded Successfully", {
        id: "url",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Error in uploading", {
        id: "url",
      });
    },
  });
};

export const useGetChatbotResources = (enabled, chatbotId: string) => {
  return useQuery({
    queryKey: ["chatbotResources", chatbotId],
    queryFn: () => getChatbotResources(chatbotId),
    enabled: enabled && !!chatbotId,
  });
};

export const useDeleteChatborResource = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteChatbotResource,
    onSuccess: () => {
      toast.success("Sources deleted Successfully", {
        id: "source",
      });
      queryClient.invalidateQueries({ queryKey: ["chatbotResources"] });
    },
    onError: (error) => {
      toast.error(error?.message || "Error in deleting source", {
        id: "source",
      });
    },
  });
};
export const useDeleteManyChatborResource = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteManyChatbotResource,
    onSuccess: () => {
      toast.success("Sources deleted Successfully", {
        id: "source",
      });
      queryClient.invalidateQueries({ queryKey: ["chatbotResources"] });
    },
    onError: (error) => {
      toast.error(error?.message || "Error in deleting source", {
        id: "source",
      });
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

export const useGetChatbotDetails = (chatbotId: string | null) => {
  return useQuery({
    queryFn: () => getChatbotDetails(chatbotId),
    queryKey: ["chatbotDetails", chatbotId],
    enabled: !!chatbotId,
    refetchOnMount: true,
  });
};

export const useAllChatbots = (enabled = true) =>
  useQuery({ queryKey: ["all-chatbots"], queryFn: getAllChatbots, enabled });

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
      queryClient.invalidateQueries({ queryKey: ["contacts", "filtered"] });
      toast.success("Chatbot updated");
    },
    onError: (error) => {
      toast.error(error?.message || "Updation Failed");
    },
  });
};

export const useGetUserAiChats = (enabled, chatbotId: string) => {
  return useQuery({
    queryFn: () => getUserAiChats(chatbotId),
    queryKey: ["aiChat", chatbotId],
    enabled: enabled && !!chatbotId,
  });
};

export const useDeleteChatbot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (chatbotId: string) => {
      await deleteChatbot(chatbotId);
      return chatbotId;
    }, // API function for deletion
    onSuccess: (chatbotId: string) => {
      queryClient.invalidateQueries({ queryKey: ["all-chatbots"] });

      queryClient.invalidateQueries({
        queryKey: ["chatbotDetails", chatbotId],
      });

      toast.success("Chatbot deleted successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to delete chatbot");
    },
  });
};
