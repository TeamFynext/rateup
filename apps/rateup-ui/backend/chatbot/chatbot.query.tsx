import { useMutation } from "@tanstack/react-query";
import { sendChatbotMessage, uploadSourceForEmbed } from "./chatbot.api";
import { showErrorToast, showSuccessToast } from "../../utils/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";

export const useChatMutation = () => {
  return useMutation({
    mutationFn: sendChatbotMessage,
    onSuccess: (data) => {},
    onError: (error) => {},
  });
};

export const useUplaodSourceForEmbed = () => {
  return useMutation({
    mutationFn: uploadSourceForEmbed,
    onSuccess: () => {
      showSuccessToast("Uploaded Successfully", "url", <IconCheck />);
    },
    onError: (e) => {
      showErrorToast("Error in uploading", "url", <IconX />);
    },
  });
};
