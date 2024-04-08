import { useMutation, useQuery } from "@tanstack/react-query";
import { getMessagesByWaContactId, sendNewWaMessage } from "./wamessage.api";

export const useGetMessagesByWaContactId = (contactId: string) => {
  return useQuery({
    queryKey: ["wa-messages", contactId],
    queryFn: () => getMessagesByWaContactId(contactId),
    enabled: !!contactId,
  });
};

export const useSendNewWaMessage = (contactId: string) => {
  return useMutation({
    mutationFn: (message: any) => sendNewWaMessage(contactId, message),
    onError: (error) => {
      console.error("Error sending message", error);
    },
  });
};
