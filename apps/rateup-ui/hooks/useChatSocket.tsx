import { useEffect, useRef } from "react";
import { useRouter } from "next/router";

import { IconBrandWhatsapp } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";

import { getBrowserId } from "@/lib/utils";
import { WA_INBOX_WEBSOCKET_CONNECTION_STRING } from "@/backend/org/ws/org.ws.api";
import { handleWebSocketMessage } from "@/components/Layout/Layout";
import { showInfoToast } from "@/utils/notifications";

export const useChatSocket = () => {
  const socketRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const browserId = getBrowserId();
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (!browserId) return;

    let ws: WebSocket | null = null;
    let closedByUser = false;

    const connect = () => {
      ws = new WebSocket(
        `${WA_INBOX_WEBSOCKET_CONNECTION_STRING}/${browserId}`,
      );
      socketRef.current = ws;

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWebSocketMessage({
          newMessagePayload: message,
          queryClient,
        });
        handleNotificationWithSound({ message, router });
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
  }, [browserId, queryClient, router]);
};

const handleNotificationWithSound = ({ message, router }) => {
  const pathnamesMap = {
    inbox: "/dashboard/whatsapp/inbox",
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
