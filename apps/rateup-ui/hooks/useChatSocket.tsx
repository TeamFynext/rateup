"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { IconBrandWhatsapp } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";

import { getBrowserId } from "@/lib/utils";
import {
  useContactsStore,
  useMessagesStore,
} from "@/app/dashboard/inbox/store";
import { WA_INBOX_WEBSOCKET_CONNECTION_STRING } from "@/backend/org/ws/org.ws.api";
import { useMarkWaMessagesAsRead } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { handleWebSocketMessage } from "@/components/Layout/Layout";
import { showInfoToast } from "@/utils/notifications";

export const useChatSocket = () => {
  const socketRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const browserId = getBrowserId();
  const queryClient = useQueryClient();
  const router = useRouter();
  const messageStore = useMessagesStore.getState();
  const { selectedContact, updateContactById } = useContactsStore();
  const markMessageAsRead = useMarkWaMessagesAsRead(selectedContact?.id, null);

  useEffect(() => {
    if (!browserId) return;

    let ws: WebSocket | null = null;
    let closedByUser = false;

    const connect = () => {
      ws = new WebSocket(
        `${WA_INBOX_WEBSOCKET_CONNECTION_STRING}/${browserId}`,
      );
      socketRef.current = ws;

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case "inbox":
            const { message, contact: incomingContact } = data.inbox;
            updateContactById(incomingContact.id, (contact) => ({
              ...contact,
              unReadMessageCount:
                selectedContact?.id === incomingContact?.id
                  ? 0
                  : contact.unReadMessageCount + 1,
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
            if (selectedContact && selectedContact?.id === incomingContact.id) {
              for (const key of [
                `${selectedContact?.id}_all`,
                `${selectedContact?.id}_${message.sourceIdentifier}`,
              ]) {
                messageStore.mergeMessages(key, [message]);
              }
              markMessageAsRead.mutate();
            }
            break;
          case "message_status_update":
            if (
              selectedContact &&
              selectedContact?.id === data?.message_status_update?.contactId
            ) {
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
        handleNotificationWithSound({ message: data, router });
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
  }, [browserId, queryClient, router, messageStore]);
};

const handleNotificationWithSound = ({ message, router }) => {
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

  showInfoToast(
    "Whatsapp Inbox",
    `You have a new message from ${message.inbox.contact.name}`,
    <IconBrandWhatsapp size={18} />,
    () => {
      router.push(
        `${pathnamesMap.inbox}?contactId=${message.inbox.contact.id}`,
      );
    },
    message.inbox.message.messageId,
  );
  audio.play().catch((e) => {
    console.warn("Audio playback failed:", e);
  });
};
