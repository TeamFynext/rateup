import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import {
  getChatFilterData,
  getContactsWithLastMessage,
  getFilteredContacts,
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
  useInfiniteQuery({
    queryKey: ["contacts", "last-message"],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getContactsWithLastMessage(pageParam),
    getNextPageParam: (_, __, lastPageParam) => lastPageParam + 1,
    placeholderData: { pages: [], pageParams: [] },
  });

export const useChatFilterData = () => {
  return useQuery({
    queryKey: ["contacts", "filter-data"],
    queryFn: getChatFilterData,
  });
};

export const useFilteredContacts = (
  filterData: string,
  queryEnabled: boolean,
) => {
  return useInfiniteQuery({
    queryKey: ["contacts", "filtered", filterData],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getFilteredContacts(filterData, pageParam),
    getNextPageParam: (_, __, lastPageParam) => lastPageParam + 1,
    placeholderData: { pages: [], pageParams: [] },
    enabled: queryEnabled,
  });
};
