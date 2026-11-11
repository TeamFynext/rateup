import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { Toast } from "@/components/common/Notice";
import { useContactsStore } from "@/store/inboxStore";
import { useChatAssignStatusStore, useSelectedContactStore } from "@/utils/store";
import { generateInternalMessageId } from "@/utils/chatbox_utils";
import { WaMessageAssignStatus, type ContactLabel } from "@/api/inbox/types";
import {
  clearMentions,
  deleteConversation,
  getAdReferrals,
  getContactConversations,
  getContactStage,
  getConversationTags,
  getPipelineStages,
  getPipelines,
  removeContactFromBoard,
  reopenTicket,
  setContactLabels,
  setContactSpam,
  setContactStage,
  setConversationTags,
  setWhatsAppBlocked,
  updateConversation,
  type PipelineStage,
  type TagOption,
} from "./tickets.api";

/**
 * Hooks for ticket management. After a change the inbox row (contacts store, which the
 * list reads) and the open chat (selected contact) are patched straight away, then the
 * server's copies are refetched.
 */

// ---------- Patching the cached rows ----------

/** One ticket's row, and the open chat if it shows that ticket. */
function patchTicket(contactId: string, conversationId: string | null | undefined, patch: object) {
  useContactsStore
    .getState()
    .updateContactById(
      conversationId ?? contactId,
      (c: any) => (c ? { ...c, ...patch } : c),
      false,
      conversationId,
    );
  const { selectedContact, setSelectedContact } = useSelectedContactStore.getState();
  if (
    selectedContact?.id === contactId &&
    (!conversationId ||
      !selectedContact.conversationId ||
      selectedContact.conversationId === conversationId)
  ) {
    setSelectedContact({ ...selectedContact, ...patch });
  }
}

/** Every row of the contact (labels, spam, block and stage belong to the customer). */
function patchContact(contactId: string, patch: object) {
  useContactsStore.getState().patchContactRows(contactId, patch);
  const { selectedContact, setSelectedContact } = useSelectedContactStore.getState();
  if (selectedContact?.id === contactId) setSelectedContact({ ...selectedContact, ...patch });
}

function refreshInbox(qc: QueryClient, contactId: string) {
  qc.invalidateQueries({ queryKey: ["contacts", "filtered"] });
  qc.invalidateQueries({ queryKey: ["contactCounts"] });
  qc.invalidateQueries({ queryKey: ["assignedInboxUser", contactId] });
  qc.invalidateQueries({ queryKey: ["assigned-contact", contactId] });
  qc.invalidateQueries({ queryKey: ["wa-messages", contactId] });
  qc.invalidateQueries({ queryKey: ["contact-by-id", contactId] });
}

/** The API's message, or a fallback. 403s get a plain permissions message. */
function errorText(err: any, fallback: string) {
  if (err?.response?.status === 403) return "You don't have permission to do that.";
  const msg = err?.response?.data?.message;
  return typeof msg === "string" && msg ? msg : fallback;
}

// ---------- Conversation tags ----------

export const useConversationTags = (enabled = true) =>
  useQuery({ queryKey: ["conversationTags"], queryFn: getConversationTags, enabled });

export const useSetConversationTags = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { contactId: string; conversationId: string; tagIds: string[] }) =>
      setConversationTags(v.conversationId, v.tagIds),
    onSuccess: (tags: TagOption[], v) => {
      patchTicket(v.contactId, v.conversationId, { conversationTags: tags });
      qc.invalidateQueries({ queryKey: ["conversationTags"] });
    },
    onError: (err) => Toast.error(errorText(err, "Couldn't update the tags.")),
  });
};

// ---------- Contact labels ----------

export const useSetContactLabels = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { contactId: string; labels: ContactLabel[] }) =>
      setContactLabels(
        v.contactId,
        v.labels.map((l) => l.id),
      ),
    onSuccess: (_res, v) => {
      patchContact(v.contactId, { contactLabels: v.labels });
      qc.invalidateQueries({ queryKey: ["contact-by-id", v.contactId] });
      qc.invalidateQueries({ queryKey: ["contacts", "filtered"] });
    },
    onError: (err) => Toast.error(errorText(err, "Couldn't update the labels.")),
  });
};

// ---------- Reopen ----------

export const useReopenTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { contactId: string; conversationId?: string | null }) =>
      reopenTicket(v.contactId, {
        conversationId: v.conversationId ?? undefined,
        messageId: generateInternalMessageId(),
      }),
    onSuccess: (res, v) => {
      // The server opens a successor ticket (a closed one is never revived): follow it.
      const status = res.assignees?.length
        ? WaMessageAssignStatus.ASSIGNED
        : WaMessageAssignStatus.UNASSIGNED;
      const { selectedContact, setSelectedContact } = useSelectedContactStore.getState();
      if (selectedContact?.id === v.contactId) {
        setSelectedContact({
          ...selectedContact,
          ...(res.conversation && {
            conversationId: res.conversation.id,
            ticketNumber: res.conversation.number,
            conversationStatus: res.conversation.status,
          }),
          waMessageAssignStatus: status,
          closedAt: null,
          ticketClosedAt: null,
          closedUser: null,
          resolutionResult: null,
          unReadMessageCount: 0,
        });
      }
      useChatAssignStatusStore.getState().setWaAssignStatus(status);
      refreshInbox(qc, v.contactId);
      Toast.success("Ticket reopened");
    },
    onError: (err) => Toast.error(errorText(err, "Couldn't reopen the ticket.")),
  });
};

// ---------- Spam ----------

export const useSetContactSpam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { contactId: string; isSpam: boolean }) =>
      setContactSpam({ ...v, messageId: generateInternalMessageId() }),
    onSuccess: (_res, v) => {
      // Marking closes every open ticket and drops the assignees; unmarking only
      // clears the flag (the tickets stay closed).
      patchContact(
        v.contactId,
        v.isSpam
          ? {
              isSpam: true,
              waMessageAssignStatus: WaMessageAssignStatus.CLOSED,
              conversationStatus: WaMessageAssignStatus.CLOSED,
              assignedUsers: [],
            }
          : { isSpam: false },
      );
      if (v.isSpam)
        useChatAssignStatusStore.getState().setWaAssignStatus(WaMessageAssignStatus.CLOSED);
      refreshInbox(qc, v.contactId);
      Toast.success(v.isSpam ? "Marked as spam" : "Removed from spam");
    },
    onError: (err) => Toast.error(errorText(err, "Couldn't update spam.")),
  });
};

// ---------- Block on WhatsApp ----------

export const useSetWhatsAppBlocked = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { contactId: string; address: string; blocked: boolean }) =>
      setWhatsAppBlocked([v.address], v.blocked),
    onSuccess: (_res, v) => {
      patchContact(v.contactId, { blockedOnWhatsApp: v.blocked });
      qc.invalidateQueries({ queryKey: ["contacts", "filtered"] });
      Toast.success(v.blocked ? "Blocked on WhatsApp" : "Unblocked on WhatsApp");
    },
    onError: (err, v) =>
      Toast.error(
        errorText(
          err,
          v.blocked ? "Couldn't block this contact." : "Couldn't unblock this contact.",
        ),
      ),
  });
};

// ---------- Mentions ----------

export const useClearMentions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { contactId: string; conversationId?: string | null }) =>
      clearMentions(v.contactId, v.conversationId),
    onSuccess: (_res, v) => {
      patchTicket(v.contactId, v.conversationId, { mentionCount: 0 });
      qc.invalidateQueries({ queryKey: ["contactCounts"] });
    },
  });
};

// ---------- The contact's tickets ----------

export const useContactConversations = (contactId: string, enabled = true) =>
  useQuery({
    queryKey: ["conversations", "by-contact", contactId],
    queryFn: () => getContactConversations(contactId),
    enabled: !!contactId && enabled,
  });

export const useUpdateConversation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: {
      contactId: string;
      conversationId: string;
      subject: string | null;
      description: string | null;
    }) => updateConversation(v.conversationId, { subject: v.subject, description: v.description }),
    onSuccess: (_res, v) => {
      patchTicket(v.contactId, v.conversationId, {
        ticketSubject: v.subject,
        ticketDescription: v.description,
      });
      qc.invalidateQueries({ queryKey: ["conversations", "by-contact", v.contactId] });
      Toast.success("Ticket updated");
    },
    onError: (err) => Toast.error(errorText(err, "Couldn't update the ticket.")),
  });
};

export const useDeleteConversation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { contactId: string; conversationId: string }) =>
      deleteConversation(v.conversationId),
    onSuccess: async (_res, v) => {
      await useContactsStore.getState().deleteContactsByIds([v.conversationId]);
      refreshInbox(qc, v.contactId);
      qc.invalidateQueries({ queryKey: ["conversations", "by-contact", v.contactId] });
      Toast.success("Conversation deleted");
    },
    onError: (err) => Toast.error(errorText(err, "Couldn't delete the conversation.")),
  });
};

// ---------- Ad referrals ----------

export const useAdReferrals = (contactId: string) =>
  useQuery({
    queryKey: ["inbox", "ad-referrals", contactId],
    queryFn: () => getAdReferrals(contactId),
    enabled: !!contactId,
    staleTime: 60_000,
  });

// ---------- Lead stage ----------

/** The org's leads board and its stages; `null` when there is no leads board. */
export const useLeadBoard = (enabled: boolean) => {
  const pipelines = useQuery({ queryKey: ["pipeline", "list"], queryFn: getPipelines, enabled });
  const board = pipelines.data?.find((p) => p.type === "LEADS") ?? null;
  const stages = useQuery({
    queryKey: ["pipeline", "stages", board?.id],
    queryFn: () => getPipelineStages(board!.id),
    enabled: enabled && !!board,
  });
  return { board, stages: stages.data ?? [], isLoading: pipelines.isLoading || stages.isLoading };
};

export const useContactStage = (contactId: string, enabled: boolean) =>
  useQuery({
    queryKey: ["pipeline", "contact-stage", contactId],
    queryFn: () => getContactStage(contactId),
    enabled: enabled && !!contactId,
  });

export const useSetContactStage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { contactId: string; stage: PipelineStage }) =>
      setContactStage(v.contactId, v.stage.id),
    onSuccess: (_res, v) => {
      patchContact(v.contactId, { stageName: v.stage.name, stageColor: v.stage.color ?? null });
      qc.invalidateQueries({ queryKey: ["pipeline", "contact-stage", v.contactId] });
    },
    onError: (err) => Toast.error(errorText(err, "Couldn't change the stage.")),
  });
};

export const useRemoveFromBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { contactId: string }) => removeContactFromBoard(v.contactId),
    onSuccess: (_res, v) => {
      patchContact(v.contactId, { stageName: null, stageColor: null });
      qc.invalidateQueries({ queryKey: ["pipeline", "contact-stage", v.contactId] });
      Toast.success("Removed from the board");
    },
    onError: (err) => Toast.error(errorText(err, "Couldn't remove from the board.")),
  });
};
