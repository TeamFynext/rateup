import { IconDeviceAudioTape } from "@tabler/icons-react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { showErrorToast } from "@/utils/notifications";

import {
  exportWaChats,
  getChatFilterData,
  getContactsWithLastMessage,
  getFilteredContacts,
  getMessageCount,
  getMessagesByContactId,
  getWaChatMediaFile,
  getWaTickets,
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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: any) => sendNewWaMessage(contactId, message),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["wa-messages", contactId] });
    },
    onError: (error) => {
      console.error("Error sending message", error);
    },
  });
};

export const useContactsWithLastMessage = (enabled) =>
  useInfiniteQuery({
    queryKey: ["contacts", "last-message"],
    queryFn: ({ pageParam }) => getContactsWithLastMessage(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastGroup) => lastGroup?.nextOffset,
    placeholderData: { pages: [], pageParams: [] },
    enabled,
  });

export const useChatFilterData = () => {
  return useQuery({
    queryKey: ["contacts", "filter-data"],
    queryFn: getChatFilterData,
  });
};
type messageCountType = {
  active: number;
  all: number;
};
export const useMessageCount = () => {
  return useQuery<messageCountType, Error>({
    queryKey: ["contacts", "message-count"],
    queryFn: getMessageCount,
  });
};
export const useWaTicktes = () =>
  useInfiniteQuery({
    queryKey: ["waTickets"],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getWaTickets(pageParam),
    getNextPageParam: (lastGroup) => lastGroup?.nextOffset,
    placeholderData: { pages: [], pageParams: [] },
  });

export const useFilteredContacts = (
  filterData: string,
  queryEnabled: boolean,
) => {
  return useInfiniteQuery({
    queryKey: ["contacts", "filtered", filterData],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getFilteredContacts(filterData, pageParam),
    getNextPageParam: (lastGroup) => lastGroup?.nextOffset,
    placeholderData: { pages: [], pageParams: [] },
    enabled: queryEnabled,
  });
};

export const useExportWaChats = () => {
  return useMutation({
    mutationFn: exportWaChats,
    onError: (error) => {
      console.error("Error exporting chats", error);
    },
  });
};

export const useGetMediaFile = () => {
  return useMutation({
    mutationFn: getWaChatMediaFile,
  });
};
