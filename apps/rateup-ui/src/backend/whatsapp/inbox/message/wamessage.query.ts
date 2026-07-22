import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import useContactStore, { useContactsStore } from "@/components/dashboard/inbox/store.ts";
import { MessagePlatform } from "@/types/enums.ts";

import {
  assignInboxToUser,
  blockWhatsAppUser,
  bulkAssignInboxToUser,
  createPrivateMessage,
  exportWaChats,
  exportWaMessageLogs,
  generateInboxResponse,
  getAssignedUserForContact,
  getConversationsByContactId,
  getFilteredContacts,
  getRowKey,
  getInboxAnalytics,
  getInboxUserCount,
  getMessagesByContactId,
  getWaChatMediaFile,
  getWaMessageLogs,
  markWaMessagesAsRead,
  clearConversationMentions,
  sendNewWaMessage,
  setConversationFavorite,
  unblockWhatsAppUser,
  updateConversation,
} from "./wamessage.api";

export const useGetMessagesByContactId = (
  contactId: string,
  selectedPhone: string,
  enabled: boolean,
  conversationId?: string | null,
) => {
  return useInfiniteQuery({
    // conversationId is part of the key so two tickets of the same contact are
    // cached (and fetched) separately.
    queryKey: ["wa-messages", contactId, selectedPhone, conversationId ?? null],
    initialPageParam: "",
    placeholderData: { pages: [], pageParams: [] },
    queryFn: ({ pageParam }) =>
      getMessagesByContactId(contactId, pageParam, selectedPhone, conversationId),
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.nextCursor : undefined),
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

export const useAssignInboxToUer = (_contactId, filterData) => {
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

export const useMarkWaMessagesAsRead = (contactId: string, _filterData) => {
  return useMutation({
    mutationFn: () => markWaMessagesAsRead(contactId),
    onSuccess: () => {},
    onError: (_e) => {},
  });
};

/**
 * Inbox Tickets v2 — star/unstar. `isFavorite` is per-conversation, so this flips
 * only the one ticket row (keyed by conversationId), not the contact's other rows.
 */
export const useToggleFavorite = () => {
  const { filterData } = useContactStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: setConversationFavorite,
    onSuccess: (_res, variables) => {
      const { selectedContact } = useContactsStore.getState();
      useContactsStore.getState().updateContactById(variables.conversationId, (c) => ({
        ...c,
        isFavorite: variables.isFavorite,
      }));
      if (selectedContact?.conversationId === variables.conversationId) {
        useContactsStore.setState({
          selectedContact: { ...selectedContact, isFavorite: variables.isFavorite },
        });
      }
      qc.invalidateQueries({ queryKey: ["contactInboxCount"] });
      qc.invalidateQueries({ queryKey: ["contacts", "filtered", filterData] });
    },
    onError: () => toast.error("Could not update favourite"),
  });
};

/**
 * Inbox Tickets v2 — clear the current user's @mention on a conversation. Flips
 * the row's `mentionCount` to 0, which drops it from the "@Mentions" filter (see
 * `belongsToCurrentFilter`), and refetches the nav count.
 */
export const useClearMention = () => {
  const { filterData } = useContactStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: clearConversationMentions,
    onSuccess: (_res, variables) => {
      const rowKey = variables.conversationId ?? variables.contactId;
      const { selectedContact } = useContactsStore.getState();
      useContactsStore.getState().updateContactById(rowKey, (c) => ({ ...c, mentionCount: 0 }));
      if (selectedContact && getRowKey(selectedContact) === rowKey) {
        useContactsStore.setState({
          selectedContact: { ...selectedContact, mentionCount: 0 },
        });
      }
      qc.invalidateQueries({ queryKey: ["contactInboxCount"] });
      qc.invalidateQueries({ queryKey: ["contacts", "filtered", filterData] });
    },
    onError: () => toast.error("Could not clear mention"),
  });
};

/** Inbox Tickets v2 — edit a ticket's title/description. */
export const useEditConversation = () => {
  const { filterData } = useContactStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      conversationId,
      ...data
    }: {
      conversationId: string;
      subject?: string | null;
      description?: string | null;
    }) => updateConversation(conversationId, data),
    onSuccess: (res: any, variables) => {
      // Prefer what the server actually stored; fall back to what we sent.
      const subject = res?.subject !== undefined ? res.subject : variables.subject;
      const description = res?.description !== undefined ? res.description : variables.description;
      const patch = (c) => ({
        ...c,
        ...(subject !== undefined ? { ticketSubject: subject } : {}),
        ...(description !== undefined ? { ticketDescription: description } : {}),
      });

      const store = useContactsStore.getState();

      // The cached row, when the ticket is in the list. `updateContactById` is a
      // no-op for a ticket that was never paged in — e.g. one reached through the
      // history strip, whose selection is synthesized rather than cached.
      if (store.contactsById.has(variables.conversationId)) {
        store.updateContactById(variables.conversationId, patch);
      }

      // The selected ticket, re-read AFTER the row update so we patch fresh state
      // instead of clobbering it with a snapshot taken before the write.
      const fresh = useContactsStore.getState().selectedContact;
      if (fresh?.conversationId === variables.conversationId) {
        useContactsStore.setState({ selectedContact: patch(fresh) });
      }

      toast.success("Ticket updated");
      qc.invalidateQueries({ queryKey: ["contacts", "filtered", filterData] });
      // The history strip lists sibling tickets by subject, so it has to refresh
      // too — otherwise a renamed ticket keeps its old title there.
      const contactId = fresh?.id ?? store.contactsById.get(variables.conversationId)?.id;
      if (contactId) {
        qc.invalidateQueries({ queryKey: ["conversations", "by-contact", contactId] });
      }
    },
    onError: () => toast.error("Could not update the ticket"),
  });
};

/**
 * Inbox Tickets v2 — every ticket belonging to a contact, newest first.
 * Drives the thread's "previous conversations" strip, which needs the contact's
 * whole ticket history rather than whatever the inbox list happens to have cached.
 */
export const useConversationsByContact = (contactId: string, enabled = true) => {
  return useQuery({
    queryKey: ["conversations", "by-contact", contactId],
    queryFn: () => getConversationsByContactId(contactId),
    enabled: !!contactId && enabled,
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
    onSuccess: (_response) => {
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

interface CreatePrivateMessageVariables {
  data: any;
}

export function useCreatePrivateMessage(contactId) {
  return useMutation({
    mutationFn: ({ data }: CreatePrivateMessageVariables) => createPrivateMessage(contactId, data),
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
      filter.searchQuery,
      filter.pagination?.pageIndex,
      filter.pagination?.pageSize,
    ],
    queryFn: () => getWaMessageLogs(filter),
    placeholderData: keepPreviousData, // don't have empty rows flash while changing pages
  });
}

export const useExportWaMessageLogs = () => {
  return useMutation({
    mutationFn: exportWaMessageLogs,
    onSettled: (data) => {
      const blob = new Blob([data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `message_logs.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Message logs exported successfully", {
        id: "export-logs",
      });
    },
    onError: (error: any) => {
      console.error("Error exporting logs", error);
      toast.error(error?.message || "Error exporting logs", {
        id: "export-logs",
      });
    },
  });
};
