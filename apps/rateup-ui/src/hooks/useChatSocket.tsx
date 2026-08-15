import { IconBrandWhatsapp } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { WA_INBOX_WEBSOCKET_CONNECTION_STRING } from "@/backend/org/ws/org.ws.api";
import { getRowKey } from "@/backend/whatsapp/inbox/message/wamessage.api";
import { getBrowserId } from "@/lib/browserId.ts";
import {
  resolveIncomingRowKey,
  useChatContactCountStore,
  useContactsStore,
  useMessagesStore,
} from "@/store/inbox.store.ts";
import { WaMessageAssignStatus } from "@/types/enums.ts";

export const useChatSocket = () => {
  const socketRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const browserId = getBrowserId();
  const navigate = useNavigate();
  // Held in a ref so the connection effect does not depend on it. Everything
  // else the handler needs is read from `getState()` at event time.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

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
                ...(message.messageBody.exchangeProcess === "receive"
                  ? {
                      lastReceivedMessageTimeStamp: message.waCreatedAt,
                    }
                  : {}),
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
                    ...(message.messageBody.exchangeProcess === "receive"
                      ? {
                          lastReceivedMessageTimeStamp: message.waCreatedAt,
                        }
                      : {}),
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
          default:
            break;
        }

        handleNotificationWithSound({ message: data, navigate: navigateRef.current });
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

/** The inbox-notification slice of the socket payload this handler reads. */
interface ChatSocketMessage {
  type?: string;
  inbox?: {
    contact?: { id?: string; name?: string };
    message?: {
      messageId?: string;
      messageBody?: { exchangeProcess?: string };
    };
  };
}

const handleNotificationWithSound = ({
  message,
  navigate,
}: {
  message: ChatSocketMessage | null | undefined;
  navigate: ReturnType<typeof useNavigate>;
}) => {
  const pathnamesMap = {
    inbox: "/dashboard/inbox",
  };
  if (
    !message ||
    !message.type ||
    message.type !== "inbox" ||
    window.location.pathname === pathnamesMap.inbox ||
    message?.inbox?.message?.messageBody?.exchangeProcess !== "receive"
  )
    return;

  const audio = new Audio("/sounds/noti.wav");

  toast.info(`You have a new message from ${message?.inbox?.contact?.name}`, {
    id: message?.inbox?.message?.messageId,
    icon: <IconBrandWhatsapp size={18} />,
    action: {
      label: "View",
      onClick: () => {
        navigate({
          to: `${pathnamesMap.inbox}?contactId=${message?.inbox?.contact?.id}`,
        });
      },
    },
  });
  audio.play().catch((e) => {
    console.warn("Audio playback failed:", e);
  });
};
