import { IconBrandWhatsapp } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { WA_INBOX_WEBSOCKET_CONNECTION_STRING } from "@/backend/org/ws/org.ws.api";
import { useContactsStore, useMessagesStore } from "@/components/dashboard/inbox/store.ts";
import { getBrowserId } from "@/lib/browserId.ts";

export const useChatSocket = () => {
  const socketRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const browserId = getBrowserId();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const messageStore = useMessagesStore.getState();
  const { updateContactById, addContactsForFilter } = useContactsStore();
  useEffect(() => {
    if (!browserId) return;

    let ws: WebSocket | null = null;
    let closedByUser = false;

    const connect = () => {
      ws = new WebSocket(`${WA_INBOX_WEBSOCKET_CONNECTION_STRING}/${browserId}`);
      socketRef.current = ws;

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        const selectedContact = useContactsStore.getState().selectedContact;
        switch (data.type) {
          case "inbox":
            const { message, contact: incomingContact } = data.inbox;
            let markUnread = false;
            if (selectedContact?.id === incomingContact?.id) {
              markUnread = true;
            }
            const contactInStore = useContactsStore.getState().contactsById.get(incomingContact.id);
            if (contactInStore) {
              updateContactById(
                incomingContact.id,
                (contact) => ({
                  ...contact,
                  waMessageAssignStatus: incomingContact.waMessageAssignStatus,
                  unReadMessageCount:
                    selectedContact?.id === incomingContact?.id
                      ? 0
                      : (contact.unReadMessageCount ?? 0) + 1,
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
                }),
                markUnread,
              );
            } else {
              addContactsForFilter(
                useContactsStore.getState().currentFilterKey,
                [
                  {
                    ...incomingContact,
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
            }

            for (const key of [
              `${incomingContact?.id}_all`,
              `${incomingContact?.id}_${message.sourceIdentifier}`,
            ]) {
              messageStore.mergeMessages(key, [message]);
            }
            break;
          case "message_status_update":
            if (selectedContact && selectedContact?.id === data?.message_status_update?.contactId) {
              messageStore.updateMessageByMessageId(
                `${selectedContact?.id}_${data.message_status_update.sourceIdentifier}`,
                data?.message_status_update.messageId,
                { stats: data?.message_status_update?.stats },
              );
              messageStore.updateMessageByMessageId(
                `${selectedContact?.id}_all`,
                data?.message_status_update.messageId,
                { stats: data?.message_status_update?.stats },
              );
            }

            break;
          default:
            break;
        }

        // handleWebSocketMessage({
        //   newMessagePayload: data,
        //   queryClient,
        //   userId: user?.userId,
        // });
        handleNotificationWithSound({ message: data, navigate });
      };

      ws.onclose = () => {
        console.log("WebSocket closed");
        if (!closedByUser && retryCountRef.current < 5) {
          retryCountRef.current += 1;
          setTimeout(connect, 1000); // retry after 1s
        }
      };
    };

    connect();

    return () => {
      closedByUser = true;
      ws?.close();
    };
  }, [browserId, queryClient, messageStore]);
};

const handleNotificationWithSound = ({ message, navigate }) => {
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

  toast.info(`You have a new message from ${message.inbox.contact.name}`, {
    id: message.inbox.message.messageId,
    icon: <IconBrandWhatsapp size={18} />,
    action: {
      label: "View",
      onClick: () => {
        navigate({
          to: `${pathnamesMap.inbox}?contactId=${message.inbox.contact.id}`,
        });
      },
    },
  });
  audio.play().catch((e) => {
    console.warn("Audio playback failed:", e);
  });
};
