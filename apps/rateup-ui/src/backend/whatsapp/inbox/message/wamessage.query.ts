import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { contactKeys } from "@/backend/campaign/contacts/contacts.keys";
import { notificationKeys } from "@/backend/notification/notification.keys";
import { whatsappKeys } from "@/backend/whatsapp/whatsapp.keys";
import useContactStore, { useContactsStore } from "@/store/inbox.store.ts";
import type { ContactWithUpdatedAt } from "@/store/inbox.store.ts";
import type { NewPendingMessage } from "@/store/pendingMessages.ts";
import { usePendingSend } from "@/store/pendingMessages.ts";
import type { RequestPayload, RequestPayloadFields } from "@/types/api.ts";
import { MessagePlatform, WaMessageAssignStatus } from "@/types/enums.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";

import type { AssignInboxResult } from "./wamessage.api";
import type { WaMessageLogFilter } from "./wamessage.api";
import {
  assignInboxToUser,
  blockWhatsAppUser,
  bulkAssignInboxToUser,
  createPrivateMessage,
  deleteConversation,
  deleteConversations,
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
  reopenConversation,
  sendNewWaMessage,
  setContactSpam,
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
    queryKey: whatsappKeys.messagesByConversation(contactId, selectedPhone, conversationId ?? null),
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
  contactId: string | undefined,
  teamId: string | null | undefined,
  whatsappSettingsPhoneId: string | undefined,
  platform = MessagePlatform.WHATSAPP,
  rowKey?: string,
) => {
  const qc = useQueryClient();
  const pending = usePendingSend(rowKey, contactId);
  return useMutation({
    // `pending` is the card to draw while the send is in flight; it is destructured
    // off here so it never reaches the request body.
    mutationFn: ({
      pending: _pending,
      ...message
    }: RequestPayloadFields & { pending?: NewPendingMessage }) =>
      sendNewWaMessage(contactId ?? "", {
        ...message,
        whatsappSettingsPhoneId,
        platform,
        teamId,
      }),
    onMutate: (variables) => ({ pendingId: pending.begin(variables.pending) }),
    // Invalidates the thread itself, then takes the pending card back down.
    onSuccess: (_data, _variables, context) => pending.settle(context?.pendingId),
    onError: (error, _variables, context) => {
      console.error("Error sending message", error);
      pending.rollback(context?.pendingId);
      qc.invalidateQueries({ queryKey: whatsappKeys.messagesByContact(contactId) });
      // The composer clears itself and its pending bubble on settle, so without this
      // a failed send looks exactly like a successful one that has not echoed yet.
      toast.error(getApiErrorMessage(error, "Could not send the message"));
    },
  });
};

export const useFilteredContacts = (filterData: string, isEnabled: boolean) => {
  return useInfiniteQuery({
    queryKey: contactKeys.filteredBy(filterData),
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

/**
 * Assigning a *closed* ticket does not reopen it — the API leaves the finished
 * record alone (its closedAt and resolution timings are frozen) and opens a
 * successor ticket to carry the new engagement. The open thread therefore has to
 * follow the assignment onto that successor; staying on the closed ticket is why
 * its "This chat has been closed… Assign it to start the conversation again"
 * banner survived the assign that was supposed to dismiss it.
 */
function followAssignmentToItsTicket(result: AssignInboxResult, contactId: string) {
  const conversation = result?.conversation;
  const { selectedContact, setSelectedContact } = useContactsStore.getState();
  if (!conversation || !selectedContact || selectedContact.id !== contactId) return;
  // Same ticket — the call site's own optimistic update covers it.
  if (getRowKey(selectedContact) === conversation.id) return;

  setSelectedContact({
    ...selectedContact,
    conversationId: conversation.id,
    ticketNumber: conversation.number,
    conversationStatus: conversation.status,
    waMessageAssignStatus: WaMessageAssignStatus.ASSIGNED,
    // The successor starts clean: none of the closed ticket's outcome carries over.
    closedAt: null,
    ticketClosedAt: null,
    closedUser: null,
    resolutionResult: null,
    unReadMessageCount: 0,
    updatedAt: new Date().toISOString(),
  });
}

export const useAssignInboxToUer = (_contactId: string, filterData: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: assignInboxToUser,
    onSuccess: (result, variables) => {
      // Runs before the caller's own onSuccess, so their `updateContactById`
      // lands on the ticket the assignment actually went to.
      followAssignmentToItsTicket(result, variables.contactId);
      qc.invalidateQueries({ queryKey: whatsappKeys.assignedInboxUser() });
      qc.invalidateQueries({ queryKey: contactKeys.filteredBy(filterData) });
      qc.invalidateQueries({ queryKey: contactKeys.inboxCount() });
      qc.invalidateQueries({ queryKey: notificationKeys.all() });
      qc.invalidateQueries({ queryKey: notificationKeys.count() });
      toast.success("Assigned successfully");
    },
    onError: (e) => {
      toast.warning(e?.message || "Something went wrong");
    },
  });
};

/**
 * Reopen a closed ticket, keeping whoever was on it. The API answers with the
 * successor ticket, and the thread follows it exactly as it does for an assign —
 * the closed ticket itself stays closed, with its history intact.
 */
export const useReopenConversation = (filterData?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reopenConversation,
    onSuccess: (result, variables) => {
      followAssignmentToItsTicket(result, variables.contactId);
      qc.invalidateQueries({ queryKey: whatsappKeys.assignedInboxUser() });
      qc.invalidateQueries({ queryKey: contactKeys.filteredBy(filterData) });
      qc.invalidateQueries({ queryKey: contactKeys.inboxCount() });
      qc.invalidateQueries({ queryKey: whatsappKeys.messagesByContact(variables.contactId) });
      toast.success("Ticket reopened");
    },
    onError: (e) => {
      toast.warning(e?.message || "Could not reopen the ticket");
    },
  });
};

export const useBulkAssignInboxToUser = (filterData?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bulkAssignInboxToUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: whatsappKeys.assignedInboxUser() });
      qc.invalidateQueries({
        queryKey: contactKeys.filteredBy(filterData),
      });
      qc.invalidateQueries({
        queryKey: contactKeys.inboxCount(),
      });
      qc.invalidateQueries({
        queryKey: notificationKeys.all(),
      });
      qc.invalidateQueries({
        queryKey: notificationKeys.count(),
      });
      toast.success("Chats assigned successfully");
    },
    onError: (e) => {
      toast.warning(e?.message || "Something went wrong");
    },
  });
};

export const useGetAssignedUserForContact = (contactId: string) => {
  return useQuery({
    queryKey: whatsappKeys.assignedInboxUserByContact(contactId),
    queryFn: () => getAssignedUserForContact(contactId),
    enabled: !!contactId,
  });
};

export const useGetInboxUserCount = (enabled: boolean) => {
  return useQuery({
    queryKey: contactKeys.inboxCount(),
    queryFn: getInboxUserCount,
    enabled,
  });
};

export const useMarkWaMessagesAsRead = (contactId: string, _filterData?: string) => {
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
      qc.invalidateQueries({ queryKey: contactKeys.inboxCount() });
      qc.invalidateQueries({ queryKey: contactKeys.filteredBy(filterData) });
    },
    onError: () => toast.error("Could not update favourite"),
  });
};

/**
 * Inbox Tickets v2 — delete one ticket for good.
 *
 * Ticket-grained like `useToggleFavorite`: only the deleted row leaves the list,
 * even when the contact has others. The thread it was showing is dropped too —
 * its messages went with the ticket — so a selection pointing at that row is
 * cleared rather than left on a thread the server no longer has.
 */
export const useDeleteConversation = () => {
  const { filterData } = useContactStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (variables: { conversationId: string; contactId: string }) =>
      deleteConversation(variables.conversationId),
    onSuccess: (_res, variables) => {
      const { selectedContact, deleteContactsByIds } = useContactsStore.getState();
      if (selectedContact && getRowKey(selectedContact) === variables.conversationId) {
        useContactsStore.getState().setSelectedContact(null);
      }
      // The store is keyed by ticket, so the conversation id *is* the row key.
      void deleteContactsByIds([variables.conversationId]);
      qc.invalidateQueries({ queryKey: contactKeys.filteredBy(filterData) });
      qc.invalidateQueries({ queryKey: contactKeys.inboxCount() });
      qc.invalidateQueries({ queryKey: whatsappKeys.messagesByContact(variables.contactId) });
      qc.invalidateQueries({ queryKey: ["conversations", "by-contact", variables.contactId] });
      toast.success("Conversation deleted");
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e, "Could not delete the conversation"));
    },
  });
};

/**
 * Delete every selected ticket in one request.
 *
 * The list's selection is ticket-keyed, so these ids are row keys and the rows
 * leave the list as they are. Only what the server reports as deleted is removed:
 * a selection can hold a ticket somebody else already deleted, and the response —
 * not the request — says what actually went.
 */
export const useDeleteConversations = () => {
  const { filterData } = useContactStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationIds: string[]) => deleteConversations(conversationIds),
    onSuccess: (res) => {
      const { selectedContact, deleteContactsByIds } = useContactsStore.getState();
      const deleted = new Set(res.conversationIds);
      if (selectedContact && deleted.has(getRowKey(selectedContact))) {
        useContactsStore.getState().setSelectedContact(null);
      }
      void deleteContactsByIds(res.conversationIds);
      qc.invalidateQueries({ queryKey: contactKeys.filteredBy(filterData) });
      qc.invalidateQueries({ queryKey: contactKeys.inboxCount() });
      for (const contactId of res.contactIds) {
        qc.invalidateQueries({ queryKey: whatsappKeys.messagesByContact(contactId) });
        qc.invalidateQueries({ queryKey: ["conversations", "by-contact", contactId] });
      }
      toast.success(
        res.deletedConversations === 1
          ? "Conversation deleted"
          : `${res.deletedConversations} conversations deleted`,
      );
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e, "Could not delete the conversations"));
    },
  });
};

/**
 * Mark a contact as spam, or take them back out of it.
 *
 * The counterpart to `useToggleFavorite`, and deliberately the opposite grain:
 * spam belongs to the contact, so **every** row of that contact flips, not just
 * the open ticket. Marking also closes those tickets — that is what the server
 * does — and `belongsToCurrentFilter` then drops them from whichever tab is on
 * screen (out of every tab when marked, out of Spam when unmarked).
 */
export const useSetContactSpam = () => {
  const { filterData } = useContactStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: setContactSpam,
    onSuccess: (_res, variables) => {
      const { contactsById, updateContactById } = useContactsStore.getState();
      const rowKeys = [...contactsById.entries()]
        .filter(([, row]) => row.id === variables.contactId)
        .map(([key]) => key);
      for (const rowKey of rowKeys) {
        updateContactById(rowKey, (c) => ({
          ...c,
          isSpam: variables.isSpam,
          ...(variables.isSpam
            ? {
                conversationStatus: WaMessageAssignStatus.CLOSED,
                waMessageAssignStatus: WaMessageAssignStatus.CLOSED,
                closedAt: c.closedAt ?? new Date().toISOString(),
                assignedUsers: [],
              }
            : {}),
        }));
      }
      qc.invalidateQueries({ queryKey: contactKeys.inboxCount() });
      qc.invalidateQueries({ queryKey: contactKeys.filteredBy(filterData) });
      toast.success(variables.isSpam ? "Contact marked as spam" : "Contact removed from spam");
    },
    onError: () => toast.error("Could not update spam"),
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
      qc.invalidateQueries({ queryKey: contactKeys.inboxCount() });
      qc.invalidateQueries({ queryKey: contactKeys.filteredBy(filterData) });
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
    onSuccess: (res, variables) => {
      // Prefer what the server actually stored; fall back to what we sent.
      const subject = res?.subject !== undefined ? res.subject : variables.subject;
      const description = res?.description !== undefined ? res.description : variables.description;
      const patch = (c: ContactWithUpdatedAt): ContactWithUpdatedAt => ({
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
      qc.invalidateQueries({ queryKey: contactKeys.filteredBy(filterData) });
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
      qc.invalidateQueries({ queryKey: contactKeys.filteredBy(filterData) });
    },
    onError: (error) => {
      toast.error(error?.message || "Unable to block users");
    },
  });
};

export const useUnBlockWhatsAppUser = (filterData: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: unblockWhatsAppUser,
    onSuccess: () => {
      toast.success("User unblocked successfully");
      qc.invalidateQueries({ queryKey: contactKeys.filteredBy(filterData) });
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
        queryKey: whatsappKeys.messages(),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: contactKeys.filtered(),
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
  data: RequestPayload;
}

export function useCreatePrivateMessage(contactId: string) {
  return useMutation({
    mutationFn: ({ data }: CreatePrivateMessageVariables) => createPrivateMessage(contactId, data),
  });
}

export function useWaMessageLogs(filter: WaMessageLogFilter) {
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
    onError: (error) => {
      console.error("Error exporting logs", error);
      toast.error(error?.message || "Error exporting logs", {
        id: "export-logs",
      });
    },
  });
};
