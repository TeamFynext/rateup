import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import {
  getContactsWithLastMessage,
  getMessagesByContactId as getMessagesByContactId,
  sendNewWaMessage,
} from "./wamessage.api";

export const useGetMessagesByContactId = (contactId: string) => {
  return useInfiniteQuery({
    queryKey: ["wa-messages", contactId],
    initialPageParam: "",
    queryFn: ({ pageParam }) => getMessagesByContactId(contactId, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: (data) => ({
      pages: [...data.pages].reverse(),
      pageParams: [...data.pageParams].reverse(),
    }),
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

export const useContactsWithLastMessage = () =>
  useQuery({
    queryKey: ["contacts", "last-message"],
    queryFn: getContactsWithLastMessage,
  });
