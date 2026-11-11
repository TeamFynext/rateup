import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useChatAssignStatusStore, useSelectedContactStore } from "@/utils/store";
import { MessagePlatform } from "@/constants/enums";
import { useWaSettings } from "@/api/whatsapp/template/whatsapp.query";
import { WaMessageClosedStatus } from "@/constants/constants";
import { WaMessageAssignStatus } from "@/api/inbox/types";
import { useGetAssignedUserForContact } from "@/api/inbox/messages/message.query";
import { useMessagesStore } from "@/store/inboxStore";
import { findChannelAccount, getContactChannelSource } from "@/utils/chatbox_utils";

/**
 * Which channel and business account a chat replies on, and whether this user may reply.
 * Shared by the composer and the thread (reactions), so both send from the same place.
 */
export function useChatChannel(id: string) {
  const waAssignStatus = useChatAssignStatusStore((state) => state.waAssignStatus);
  const { data: assignedUsers, isLoading: assignmentLoading } = useGetAssignedUserForContact(id);
  const { userId } = useAuth();
  const currentUserAssignment = assignedUsers?.find((entry: any) => entry.assignedUserId == userId);
  const hasAssignedUsers = (assignedUsers?.length ?? 0) > 0;

  const selectedContact = useSelectedContactStore((s) => s.selectedContact);
  // Only this route's contact — the store may still hold the previously opened
  // one, and channel is what decides which business number the reply goes out on.
  const contact = selectedContact?.id === id ? selectedContact : undefined;

  // A chat opened by deep link has no `lastMessage`: `/api/contacts/:id` returns
  // the bare contact row. The loaded thread (newest first) carries the same
  // `sourcePlatform`/`sourceIdentifier`, so it stands in. Without it the reply is
  // sent with an empty phoneId — from the wrong number, or not at all.
  const threadMessages = useMessagesStore((s) => s.messagesByKey.get(`${id}_all`)?.messages);
  const { platform, identifier } = useMemo(
    () =>
      getContactChannelSource({
        lastMessage: contact?.lastMessage,
        messages: threadMessages,
        igsId: contact?.igsId,
        psid: contact?.psid,
      }),
    [contact?.lastMessage, contact?.igsId, contact?.psid, threadMessages],
  );
  const { data: waSettings } = useWaSettings();

  /**
   * The account this conversation runs on. The WhatsApp match used to be
   * `s.phone === sourceIdentifier`, which never holds (`+965…` against `965…`),
   * so the reply went out with no phoneId — on the org's default number, which
   * the customer may never have written to, and Meta answered 131047
   * "Re-engagement message". Instagram, Messenger and webchat address the send by
   * the identifier the thread already recorded.
   */
  const whatsappSettingsPhoneId = useMemo(() => {
    if (platform !== MessagePlatform.WHATSAPP) return identifier ?? "";
    return findChannelAccount(waSettings, platform, identifier)?.phoneId ?? "";
  }, [waSettings, platform, identifier]);

  const isOpen =
    hasAssignedUsers &&
    waAssignStatus !== "UNASSIGNED" &&
    waAssignStatus !== "NEW" &&
    !WaMessageClosedStatus.includes(waAssignStatus as WaMessageAssignStatus);

  return {
    platform,
    whatsappSettingsPhoneId,
    teamId: (currentUserAssignment?.teamId as string | undefined) || null,
    assignmentLoading,
    hasAssignedUsers,
    currentUserAssignment,
    isOpen,
    waAssignStatus,
    /** Closed, resolved, unresolved or spam: not merely unassigned. */
    isClosed: WaMessageClosedStatus.includes(waAssignStatus as WaMessageAssignStatus),
    /** Assigned to this user and not closed: the composer shows, and reactions can be sent. */
    canReply: !assignmentLoading && isOpen && !!currentUserAssignment,
  };
}
