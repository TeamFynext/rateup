import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { MessagePlatform, WaMessageAssignStatus } from "@/types/enums";
import { saveContactsToDB } from "@/app/dashboard/inbox/idb";
import useContactStore, {
  useContactsStore,
  useMessagesStore,
} from "@/app/dashboard/inbox/store";
import { useChatFilterStore } from "@/components/whatsapp/inbox/chatselect/chatFilter";

import {
  assignInboxToUser,
  blockWhatsAppUser,
  bulkAssignInboxToUser,
  createPrivateMessage,
  exportWaChats,
  generateInboxResponse,
  getAssignedUserForContact,
  getChatFilterData,
  getFilteredContacts,
  getInboxAnalytics,
  getInboxUserCount,
  getMessagesByContactId,
  getWaChatMediaFile,
  getWaMessageLogs,
  markWaMessagesAsRead,
  sendNewWaMessage,
  unblockWhatsAppUser,
} from "./wamessage.api";

export const useGetMessagesByContactId = (
  contactId: string,
  selectedPhone: string,
  enabled: boolean,
) => {
  return useInfiniteQuery({
    queryKey: ["wa-messages", contactId, selectedPhone],
    initialPageParam: "",
    placeholderData: { pages: [], pageParams: [] },
    queryFn: ({ pageParam }) =>
      getMessagesByContactId(contactId, pageParam, selectedPhone),
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? lastPage.nextCursor : undefined,
    // select: (data) => ({
    //   pages: [...data.pages].reverse(),
    //   pageParams: [...data.pageParams].reverse(),
    // }),
    enabled: !!contactId && !!selectedPhone && enabled,
  });
};

export const useSendNewWaMessage = (
  contactId: string,
  teamId: string | null,
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
        teamId,
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

export const useFilteredContacts = (filterData: string, isEnabled: boolean) => {
  return useInfiniteQuery({
    queryKey: ["contacts", "filtered", filterData],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getFilteredContacts(filterData, pageParam),
    getNextPageParam: (lastGroup) => lastGroup?.nextOffset,
    placeholderData: { pages: [], pageParams: [] },
    enabled: isEnabled,
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
      toast.success("Chats exported successfully", {
        id: "export-chats",
      });
    },
    onError: (error) => {
      console.error("Error exporting chats", error);
      toast.error(error?.message || "Error exporting chats", {
        id: "export-chats",
      });
    },
  });
};

export const useGetMediaFile = () => {
  return useMutation({
    mutationFn: getWaChatMediaFile,
  });
};

export const useAssignInboxToUer = (contactId, filterData) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: assignInboxToUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignedInboxUser"] });
      qc.invalidateQueries({ queryKey: ["contacts", "filtered", filterData] });
      qc.invalidateQueries({ queryKey: ["contactInboxCount"] });
      qc.invalidateQueries({ queryKey: ["notification"] });
      qc.invalidateQueries({ queryKey: ["notificationCount"] });
      toast.success("Assigned successfully");
    },
    onError: (e) => {
      toast.warning(e?.message || "Something went wrong");
    },
  });
};

export const useBulkAssignInboxToUser = (filterData?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bulkAssignInboxToUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignedInboxUser"] });
      qc.invalidateQueries({
        queryKey: ["contacts", "filtered", filterData],
      });
      qc.invalidateQueries({
        queryKey: ["contactInboxCount"],
      });
      qc.invalidateQueries({
        queryKey: ["notification"],
      });
      qc.invalidateQueries({
        queryKey: ["notificationCount"],
      });
      toast.success("Chats assigned successfully");
    },
    onError: (e: any) => {
      toast.warning(e?.message || "Something went wrong");
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

export const useBlockWhatsAppUser = () => {
  const { filterData } = useContactStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: blockWhatsAppUser,
    onSuccess: () => {
      toast.success("User blocked successfully");
      qc.invalidateQueries({ queryKey: ["contacts", "filtered", filterData] });
    },
    onError: (error) => {
      toast.error(error?.message || "Unable to block users");
    },
  });
};

export const useUnBlockWhatsAppUser = (filterData) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: unblockWhatsAppUser,
    onSuccess: () => {
      toast.success("User unblocked successfully");
      qc.invalidateQueries({ queryKey: ["contacts", "filtered", filterData] });
    },
    onError: (error) => {
      toast.error(error?.message || "Unable to unblock users");
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
      toast.success("Response generated successfully", {
        id: "generateWaChat",
      });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed Response Generate", {
        id: "generateWaChat",
      });
    },
  });
}

type CreatePrivateMessageVariables = {
  data: any;
};

export function useCreatePrivateMessage(contactId) {
  return useMutation({
    mutationFn: ({ data }: CreatePrivateMessageVariables) =>
      createPrivateMessage(contactId, data),
  });
}

export function useWaMessageLogs(filter) {
  return useQuery({
    queryKey: [
      "wa-message-logs",
      filter.dateKey,
      filter.dateRange,
      filter.status,
      filter.source,
      filter.team,
      filter.pagination?.pageIndex,
      filter.pagination?.pageSize,
    ],
    queryFn: () => getWaMessageLogs(filter),
    placeholderData: keepPreviousData, // don't have empty rows flash while changing pages
  });
}
