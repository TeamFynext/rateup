import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  showErrorToast,
  showSuccessToast,
  showWarnToast,
} from "@/utils/notifications";

import {
  assignInboxToUser,
  blockWhatsAppUser,
  exportWaChats,
  getAssignedUserForContact,
  getChatFilterData,
  getFilteredContacts,
  getInboxUserCount,
  getMessagesByContactId,
  getWaChatMediaFile,
  markWaMessagesAsRead,
  sendNewWaMessage,
  unblockWhatsAppUser,
} from "./wamessage.api";

export const useGetMessagesByContactId = (
  contactId: string,
  selectedPhone: string,
) => {
  return useInfiniteQuery({
    queryKey: ["wa-messages", contactId, selectedPhone],
    initialPageParam: "",
    queryFn: ({ pageParam }) =>
      getMessagesByContactId(contactId, pageParam, selectedPhone),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: (data) => ({
      pages: [...data.pages].reverse(),
      pageParams: [...data.pageParams].reverse(),
    }),
    enabled: !!contactId && !!selectedPhone,
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

export const useChatFilterData = () => {
  return useQuery({
    queryKey: ["contacts", "filter-data"],
    queryFn: getChatFilterData,
  });
};

export const useFilteredContacts = (filterData: string) => {
  return useInfiniteQuery({
    queryKey: ["contacts", "filtered", filterData],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getFilteredContacts(filterData, pageParam),
    getNextPageParam: (lastGroup) => lastGroup?.nextOffset,
    placeholderData: { pages: [], pageParams: [] },
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

export const useAssignInboxToUer = (filterData) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: assignInboxToUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignedInboxUser"] });
      qc.invalidateQueries({ queryKey: ["contacts", "filtered", filterData] });
      qc.invalidateQueries({ queryKey: ["contactInboxCount"] });
      qc.invalidateQueries({ queryKey: ["notification"] });
      qc.invalidateQueries({ queryKey: ["notificationCount"] });
      showSuccessToast("Assigned successfully");
    },
    onError: (e) => {
      showWarnToast("Something went wrong" + JSON.stringify(e));
    },
  });
};

export const useGetAssignedUserForContact = (contactId) => {
  return useQuery({
    queryKey: ["assignedInboxUser", contactId],
    queryFn: () => getAssignedUserForContact(contactId),
    enabled: !!contactId,
  });
};

export const useGetInboxUserCount = (enabled: boolean) => {
  return useQuery({
    queryKey: ["contactInboxCount"],
    queryFn: getInboxUserCount,
    enabled,
  });
};

export const useMarkWaMessagesAsRead = (contactId: string, filterData) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markWaMessagesAsRead(contactId),
    onSuccess: () => {},
    onError: (e) => {},
  });
};

export const useBlockWhatsAppUser = (filterData) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: blockWhatsAppUser,
    onSuccess: () => {
      showSuccessToast("User blocked successfully");
      qc.invalidateQueries({ queryKey: ["contacts", "filtered", filterData] });
    },
    onError: (e) => {
      showErrorToast("Unable to block users");
    },
  });
};

export const useUnBlockWhatsAppUser = (filterData) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: unblockWhatsAppUser,
    onSuccess: () => {
      showSuccessToast("User unblocked successfully");
      qc.invalidateQueries({ queryKey: ["contacts", "filtered", filterData] });
    },
    onError: (e) => {
      showErrorToast("Unable to unblock users");
    },
  });
};
