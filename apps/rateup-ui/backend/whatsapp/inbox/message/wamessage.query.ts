import { notifications } from "@mantine/notifications";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { MessagePlatform } from "@/types/enums";
import {
  showErrorToast,
  showSuccessToast,
  showWarnToast,
} from "@/utils/notifications";

import {
  assignInboxToUser,
  blockWhatsAppUser,
  exportWaChats,
  generateInboxResponse,
  getAssignedUserForContact,
  getChatFilterData,
  getFilteredContacts,
  getInboxAnalytics,
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
    placeholderData: { pages: [], pageParams: [] },
    queryFn: ({ pageParam }) =>
      getMessagesByContactId(contactId, pageParam, selectedPhone),
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? lastPage.nextCursor : undefined,
    select: (data) => ({
      pages: [...data.pages].reverse(),
      pageParams: [...data.pageParams].reverse(),
    }),
    enabled: !!contactId && !!selectedPhone,
  });
};

export const useSendNewWaMessage = (
  contactId: string,
  whatsappSettingsPhoneId: string,
  platform = MessagePlatform.WHATSAPP,
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: any) =>
      sendNewWaMessage(contactId, {
        ...message,
        whatsappSettingsPhoneId,
        platform,
      }),
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
    onSettled: (data) => {
      const blob = new Blob([data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccessToast(
        "Chats exported successfully",
        "export-chats",
        undefined,
        true,
      );
    },
    onError: (error) => {
      console.error("Error exporting chats", error);
      showErrorToast("Error exporting chats", "export-chats", undefined, true);
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

interface AssignedUserCount {
  userId: string;
  assignCount: number;
  createdAt: string;
  userName: string;
}

interface InboxAnalytics {
  newChatCount: number;
  waMessageCount: number;
  unassignedContactCount: number;
  assignedContactCount: number;
  newContactCount: number;
  closedContactCount: number;
  blockedContactCount: number;
  waInboxAssignedCount: number;
  assignedUserCounts: AssignedUserCount[];
}

export const useGetInboxAnalytics = () => {
  return useQuery<InboxAnalytics>({
    queryKey: ["inboxAnalytics"],
    queryFn: getInboxAnalytics,
  });
};

export function useGenerateInboxResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateInboxResponse,
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: ["wa-messages"],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ["contacts", "filtered"],
        exact: false,
      });

      notifications.update({
        id: "generateWaChat",
        loading: false,
        color: "green",
        title: "Response Generate Success",
        message: "Generate Response successfully",
        autoClose: 3000,
      });
    },
    onError: (error: any) => {
      notifications.update({
        id: "generateWaChat",
        color: "red",
        loading: false,
        title: "Failed Response Generate",
        message: error?.response?.data?.message ?? error?.response?.data,
        autoClose: 3000,
      });
    },
  });
}
