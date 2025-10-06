import { useRouter } from "next/navigation";

import { IconBrandWhatsapp } from "@tabler/icons-react";

import { orgWsMessage } from "../types/global";
import { showInfoToast } from "../utils/notifications";

export function useNotifyWsMessages() {
  const router = useRouter();
  return (message: orgWsMessage) => {
    const audio = new Audio("/sounds/noti.wav");
    const pathnamesMap = {
      inbox: "/dashboard/inbox",
    };

    switch (message.type) {
      case "inbox": {
        if (
          window.location.pathname !== pathnamesMap.inbox &&
          message?.inbox?.message?.messageBody?.exchangeProcess === "receive"
        ) {
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
        }
      }
    }
  };
}
