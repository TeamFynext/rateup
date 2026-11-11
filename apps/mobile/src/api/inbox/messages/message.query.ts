import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessagePlatform } from "@/constants/enums";
import {
  assignInboxToUser,
  assignOwner,
  createPrivateMessage,
  getAssignedUserForContact,
  getMessagesByContactId,
  getWaChatMediaFile,
  moderateInstagramContact,
  sendNewWaMessage,
  type InstagramModerationAction,
} from "./message.api";
import { logger } from "@/utils/logger";
import { Toast } from "@/components/common/Notice";
import { useContactsStore } from "@/store/inboxStore";
import { useSelectedContactStore } from "@/utils/store";

/** The API's own words for a refused request (e.g. a closed Instagram window), if any. */
function refusalMessage(error: unknown): string | undefined {
  const response = (error as { response?: { status?: number; data?: unknown } })?.response;
  if (!response?.status || response.status >= 500) return undefined;
  const data = response.data as { message?: unknown } | string | undefined;
  if (typeof data === "string") return data || undefined;
  return typeof data?.message === "string" ? data.message : undefined;
}

/**
 * A chat's messages, scoped to one ticket when `conversationId` is given. The key
 * keeps `["wa-messages", contactId]` as its prefix, so invalidating that still
 * refetches every ticket of the contact.
 */
export const useGetMessagesByContactId = (contactId: string, conversationId?: string | null) => {
  return useInfiniteQuery({
    queryKey: ["wa-messages", contactId, conversationId ?? null],
    initialPageParam: "",
    queryFn: ({ pageParam }) => getMessagesByContactId(contactId, pageParam, conversationId),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
    }),
    enabled: !!contactId,
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
        // Left out when there is none: the API takes a string or nothing, and rejects `null`.
        ...(teamId && { teamId }),
      }),
    // Returned, so the mutation waits for the thread to refetch before the
    // caller's own `mutate` callbacks run — `MessageSendPanel` retires its
    // placeholder there, and by then the stored copy is on screen to replace it.
    onSettled: () => qc.invalidateQueries({ queryKey: ["wa-messages", contactId] }),
    onError: (error) => {
      logger.error("Error sending message", error);
      // A refusal (Instagram block, closed window) never reaches Meta, so no failed
      // bubble arrives to explain it.
      const message = refusalMessage(error);
      if (message) Toast.error(message);
    },
  });
};

const MODERATION_DONE: Record<InstagramModerationAction, string> = {
  block: "Blocked on Instagram",
  unblock: "Unblocked on Instagram",
  spam: "Moved to spam",
};

/** Block / unblock / move to spam on Instagram, patching the row and the open chat. */
export const useModerateInstagramContact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (variables: { contactId: string; action: InstagramModerationAction }) =>
      moderateInstagramContact(variables.contactId, variables.action),
    onSuccess: (res, { contactId, action }) => {
      const patch = { igBlockedAt: res.igBlockedAt, ...(res.isSpam && { isSpam: true }) };
      useContactsStore
        .getState()
        .updateContactById(contactId, (c) => (c ? { ...c, ...patch } : c), false);
      const { selectedContact, setSelectedContact } = useSelectedContactStore.getState();
      if (selectedContact?.id === contactId) setSelectedContact({ ...selectedContact, ...patch });
      if (res.isSpam) qc.invalidateQueries({ queryKey: ["contacts", "filtered"] });
      Toast.success(MODERATION_DONE[action]);
    },
    onError: (error) => Toast.error(refusalMessage(error) ?? "Instagram didn't accept that."),
  });
};

export const useGetMediaFile = () => {
  return useMutation({
    mutationFn: getWaChatMediaFile,
    // The response is the whole media file as an ArrayBuffer, which for a
    // WhatsApp video runs to tens of MB. React Query would otherwise keep it
    // in the mutation cache for the default 5 minutes after the bubble
    // unmounts. Callers additionally reset() once the bytes are on disk.
    gcTime: 0,
  });
};

// `_contactId` is kept in the signature for call-site symmetry with the other
// inbox hooks; the mutation itself takes the id from its own payload.
export const useAssignInboxToUser = (_contactId?: any) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: assignInboxToUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignedInboxUser"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contactInboxCount"] });
      qc.invalidateQueries({ queryKey: ["notification"] });
      qc.invalidateQueries({ queryKey: ["notificationCount"] });
    },
  });
};

export const useAssignOwner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: assignOwner,
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: ["assignedInboxUser"] });
      qc.invalidateQueries({ queryKey: ["assigned-contact", variables.contactId] });
      qc.invalidateQueries({ queryKey: ["wa-messages", variables.contactId] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contactCounts"] });
      qc.invalidateQueries({ queryKey: ["contactInboxCount"] });
      qc.invalidateQueries({ queryKey: ["notification"] });
      qc.invalidateQueries({ queryKey: ["notificationCount"] });
    },
  });
};

export const useGetAssignedUserForContact = (contactId: any) => {
  return useQuery({
    queryKey: ["assignedInboxUser", contactId],
    queryFn: () => getAssignedUserForContact(contactId),
    enabled: !!contactId,
  });
};

export function useCreatePrivateMessage(contactId: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createPrivateMessage(contactId, data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["wa-messages", contactId] });
    },
    onError: (error) => {
      logger.error("Error sending message", error);
    },
  });
}
