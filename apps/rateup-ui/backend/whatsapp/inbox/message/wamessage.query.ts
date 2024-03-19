import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMessagesByWaContactId, sendNewWaMessage } from "./wamessage.api";

export const useGetMessagesByWaContactId = (contactId: string) => {
  return useQuery({
    queryKey: ["wa-messages", contactId],
    queryFn: () => getMessagesByWaContactId(contactId),
    enabled: !!contactId,
  });
};

export const useSendNewWaMessage = (contactId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: any) => sendNewWaMessage(contactId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wa-messages", contactId] });
      queryClient.invalidateQueries({ queryKey: ["wa-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["wa-contact", contactId] });
    },
    onError: (error) => {
      console.error("Error sending message", error);
    },
  });
};
