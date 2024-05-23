import { useRouter } from "next/router";
import { orgWsMessage } from "../types/global";
import { showInfoToast } from "../utils/notifications";
import { IconBrandWhatsapp } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { WaMessagePage } from "../backend/whatsapp/inbox/message/wamessage.api";

export function useNotifyWsMessages() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return (message: orgWsMessage) => {
    const audio = new Audio("/sounds/noti.wav");
    const pathnamesMap = {
      inbox: "/dashboard/whatsapp/inbox",
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
          );
          queryClient.invalidateQueries({
            queryKey: ["contacts", "last-message"],
          });
          const currentData: {
            pages: WaMessagePage[];
            pageParams: string[];
          } = queryClient.getQueryData([
            "wa-messages",
            message.inbox.contact.id,
          ]);
          if (currentData) {
            const newData = { ...currentData };
            if (!newData.pages[0].messages.includes(message.inbox.message)) {
              newData.pages[0].messages.push(message.inbox.message);
              queryClient.setQueryData(
                ["wa-messages", message.inbox.contact.id],
                newData,
              );
            }
          }
          audio.play();
        }
      }
    }
  };
}
