import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { LiveNotification } from "@/backend/notification/notification.api";
import { notificationKeys } from "@/backend/notification/notification.keys";
import { WA_INBOX_WEBSOCKET_CONNECTION_STRING } from "@/backend/org/ws/org.ws.api";
import { getRowKey } from "@/backend/whatsapp/inbox/message/wamessage.api";
import {
  isNotificationEvent,
  notificationMessage,
} from "@/components/dashboard/settings/notifications/notificationCopy.ts";
import { getBrowserId } from "@/lib/browserId.ts";
import {
  resolveIncomingRowKey,
  useChatContactCountStore,
  useContactsStore,
  useMessagesStore,
} from "@/store/inbox.store.ts";
import { WaMessageAssignStatus } from "@/types/enums.ts";
import { showDesktopNotification } from "@/utils/desktopNotifications";

export const useChatSocket = () => {
  const socketRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const browserId = getBrowserId();
  const navigate = useNavigate();
  // Held in a ref so the connection effect does not depend on it. Everything
  // else the handler needs is read from `getState()` at event time.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const { t } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!browserId) return;

    let ws: WebSocket | null = null;
    let closedByUser = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      ws = new WebSocket(`${WA_INBOX_WEBSOCKET_CONNECTION_STRING}/${browserId}`);
      socketRef.current = ws;

      // Without this the retry budget is spent across the whole life of the
      // page rather than per outage: five idle-timeouts from a proxy over an
      // afternoon and realtime never came back until a reload.
      ws.onopen = () => {
        retryCountRef.current = 0;
      };

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        const contactsStore = useContactsStore.getState();
        const messageStore = useMessagesStore.getState();
        const { updateContactById, addContactsForFilter } = contactsStore;
        const { bumpSectionCounts } = useChatContactCountStore.getState();
        const selectedContact = contactsStore.selectedContact;
        switch (data.type) {
          case "inbox":
            const { message, contact: incomingContact } = data.inbox;
            // The message names its ticket even though the contact payload does
            // not, so the row is resolved from that rather than the contact id.
            const incomingConversationId = message?.conversationId ?? null;
            const existingRowKey = resolveIncomingRowKey(
              useContactsStore.getState().contactsById,
              incomingContact.id,
              incomingConversationId,
            );
            const isOpenInThread =
              !!selectedContact &&
              (existingRowKey
                ? getRowKey(selectedContact) === existingRowKey
                : selectedContact.id === incomingContact.id);
            if (existingRowKey) {
              updateContactById(existingRowKey, (contact) => ({
                ...contact,
                waMessageAssignStatus: incomingContact.waMessageAssignStatus,
                unReadMessageCount: isOpenInThread ? 0 : (contact.unReadMessageCount ?? 0) + 1,
                lastMessage: {
                  messageBody: message.messageBody,
                  sourceIdentifier: message.sourceIdentifier,
                  sourcePlatform: message.sourcePlatform,
                  waCreatedAt: message.waCreatedAt,
                },
                ...conversationClocksFor(message),
              }));
            } else if (
              // Spam is contact-grained and exclusive to the Spam tab: a spam
              // contact's message must not spawn a row in Open/All, and a
              // non-spam contact's must not spawn one in Spam.
              !!incomingContact.isSpam ===
              !!useContactsStore.getState().currentFilterKey?.includes("spam:true")
            ) {
              addContactsForFilter(
                useContactsStore.getState().currentFilterKey!,
                [
                  {
                    ...incomingContact,
                    // Without this the row would be keyed by contact id and would
                    // sit beside the same contact's real ticket rows.
                    conversationId: incomingConversationId ?? incomingContact.conversationId,
                    unReadMessageCount: 1,
                    lastMessage: {
                      messageBody: message.messageBody,
                      sourceIdentifier: message.sourceIdentifier,
                      sourcePlatform: message.sourcePlatform,
                      waCreatedAt: message.waCreatedAt,
                    },
                    ...conversationClocksFor(message),
                    updatedAt: new Date().toISOString(),
                  },
                ],
                true,
              );

              // Optimistically bump the sidebar counts; the next backend fetch
              // (see useGetInboxUserCount) will overwrite this with the authoritative value.
              if (
                [WaMessageAssignStatus.ASSIGNED, WaMessageAssignStatus.UNASSIGNED].includes(
                  incomingContact.waMessageAssignStatus,
                )
              ) {
                bumpSectionCounts({ openCount: 1, allCount: 1 });
              } else if (incomingContact.waMessageAssignStatus === WaMessageAssignStatus.CLOSED) {
                bumpSectionCounts({ closedCount: 1, allCount: 1 });
              } else {
                bumpSectionCounts({ allCount: 1 });
              }
            }

            // Bucket the live message by the row it landed on, so a legacy
            // contact-keyed row and its thread stay on the same key.
            const messageRowKey =
              existingRowKey ?? incomingConversationId ?? getRowKey(incomingContact);
            for (const key of [
              `${messageRowKey}_all`,
              `${messageRowKey}_${message.sourceIdentifier}`,
            ]) {
              messageStore.mergeMessages(key, [message]);
            }
            break;
          case "message_status_update":
            if (selectedContact && selectedContact?.id === data?.message_status_update?.contactId) {
              // Status receipts target the open thread — key by its ticket bucket.
              const statusRowKey =
                data?.message_status_update?.conversationId ?? getRowKey(selectedContact);
              messageStore.updateMessageByMessageId(
                `${statusRowKey}_${data.message_status_update.sourceIdentifier}`,
                data?.message_status_update.messageId,
                { stats: data?.message_status_update?.stats },
              );
              messageStore.updateMessageByMessageId(
                `${statusRowKey}_all`,
                data?.message_status_update.messageId,
                { stats: data?.message_status_update?.stats },
              );
            }

            break;
          case "message_deleted":
            // The message is still in the thread — flagging it is what turns it
            // into the "deleted" placeholder. Deliberately not scoped to the open
            // thread the way a status receipt is: whoever is connected corrects
            // every cached copy, memory and IDB, so the message does not come
            // back intact when that ticket is opened later.
            messageStore.patchMessageEverywhere(data?.message_deleted?.messageId, {
              deletedAt: data?.message_deleted?.deletedAt,
            });

            // The list snippet is a copy of the message body with no id on it, so
            // the row is matched by the message's own timestamp. Anything else and
            // the list would keep quoting text the customer deleted.
            {
              const deletedRowKey =
                data?.message_deleted?.conversationId ?? data?.message_deleted?.contactId;
              if (deletedRowKey && data?.message_deleted?.waCreatedAt) {
                updateContactById(deletedRowKey, (contact) =>
                  contact?.lastMessage?.waCreatedAt === data.message_deleted.waCreatedAt
                    ? {
                        ...contact,
                        lastMessage: {
                          ...contact.lastMessage,
                          deletedAt: data.message_deleted.deletedAt,
                        },
                      }
                    : contact,
                );
              }
            }

            break;
          case "meta_agent_thread":
            // Contact-level: routed to that contact's live ticket, which also
            // refreshes the open header when it is the selected one.
            if (data?.meta_agent_thread?.contactId) {
              updateContactById(data.meta_agent_thread.contactId, (contact) => ({
                ...contact,
                metaAgentThreadOwner: data.meta_agent_thread.owner,
                metaAgentThreadOwnerAt: data.meta_agent_thread.at,
                metaAgentHandoverReason: data.meta_agent_thread.reason,
              }));
            }
            break;
          case "notification":
            if (data?.notification) {
              handleLiveNotification(data.notification, {
                t: tRef.current,
                navigate: navigateRef.current,
                queryClient,
              });
            }
            break;
          default:
            break;
        }
      };

      ws.onclose = () => {
        if (closedByUser || retryCountRef.current >= 5) return;
        retryCountRef.current += 1;
        // Back off rather than hammering a server that is still coming up.
        const delay = Math.min(1000 * 2 ** (retryCountRef.current - 1), 15_000);
        retryTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      closedByUser = true;
      if (retryTimer) clearTimeout(retryTimer);
      ws?.close();
    };
    // `browserId` is the only input to the connection. The handler reads the
    // stores through `getState()` precisely so they stay out of here: this hook
    // sits in a component that re-renders on store activity, and depending on a
    // store's identity — `useMessagesStore.getState()` returns a fresh object
    // after every merge — tore the socket down and rebuilt it on each inbound
    // message, dropping whatever arrived during the gap.
  }, [browserId]);
};

const playSound = () => {
  new Audio("/sounds/noti.wav").play().catch((e) => {
    console.warn("Audio playback failed:", e);
  });
};

/**
 * One of this member's notifications, already filtered by their settings on the server. A
 * desktop notification stands in for the toast while the tab is hidden, where a toast would
 * expire unseen.
 */
function handleLiveNotification(
  notification: LiveNotification,
  {
    t,
    navigate,
    queryClient,
  }: { t: TFunction; navigate: ReturnType<typeof useNavigate>; queryClient: QueryClient },
) {
  if (notification.id) {
    void queryClient.invalidateQueries({ queryKey: notificationKeys.all() });
    void queryClient.invalidateQueries({ queryKey: notificationKeys.count() });
  }
  if (!isNotificationEvent(notification.event)) return;

  const message = notificationMessage(t, notification.event, notification.data);
  const open = () => void navigate({ href: notification.path });
  const isNewMessage = notification.event.startsWith("inbox.message.");
  const onInbox = window.location.pathname.startsWith("/dashboard/inbox");

  const shownOnDesktop =
    notification.desktop &&
    document.visibilityState === "hidden" &&
    showDesktopNotification({
      title: "RateUp",
      body: message,
      tag: notification.id ?? `${notification.event}:${notification.data?.contactId ?? ""}`,
      onClick: open,
    });

  // The inbox shows a new message by itself; a toast on top of it is noise.
  const toasted = !shownOnDesktop && notification.toast && !(isNewMessage && onInbox);
  if (toasted) {
    toast.info(message, {
      id: notification.id ?? undefined,
      action: { label: t("View"), onClick: open },
    });
  }

  if (notification.sound && (shownOnDesktop || toasted)) playSound();
}

/**
 * The row's sort clocks after a live message, bumped the way `createMessage` in rateup-api
 * bumps the conversation: any non-internal message is activity, and an inbound one is also
 * the customer's last message. The list sorts on these, so they must move with the thread.
 */
function conversationClocksFor(message: {
  waCreatedAt: string;
  sourcePlatform?: string | null;
  messageBody?: { exchangeProcess?: string } | null;
}) {
  const exchange = message.messageBody?.exchangeProcess;
  if (message.sourcePlatform === "INTERNAL" || exchange === "privateNote") return {};
  if (exchange !== "receive") return { conversationLastMessageAt: message.waCreatedAt };
  return {
    conversationLastMessageAt: message.waCreatedAt,
    conversationLastCustomerMessageAt: message.waCreatedAt,
    lastReceivedMessageTimeStamp: message.waCreatedAt,
  };
}
