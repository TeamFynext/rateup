import { useRouter } from "next/navigation";

import { IconBrandWhatsapp } from "@tabler/icons-react";
import { toast } from "sonner";

import { orgWsMessage } from "../types/global";

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
          toast.info(`New message from ${message.inbox.contact.name}`, {
            icon: <IconBrandWhatsapp size={18} />,
            action: {
              label: "View",
              onClick: () => {
                router.push(
                  `${pathnamesMap.inbox}?contactId=${message.inbox.contact.id}`,
                );
              },
            },
          });
          audio.play().catch((e) => {
            console.warn("Audio playback failed:", e);
          });
        }
      }
    }
  };
}
