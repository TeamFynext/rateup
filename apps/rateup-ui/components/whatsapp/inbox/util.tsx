import { ThemeIcon } from "@mantine/core";
import { IconBrandInstagram, IconBrandWhatsapp } from "@tabler/icons-react";
import { MessageCircle } from "lucide-react";

import { MessagePlatform } from "@/types/enums";
import { useChatContactCountStore } from "@/app/dashboard/inbox/store";

export function getSoucePlatformIconAndColor(sourcePlatform) {
  switch (sourcePlatform) {
    case MessagePlatform.WHATSAPP:
      return {
        icon: <IconBrandWhatsapp className="w-4 h-4 text-white" />,
        bgColor: "bg-green-600",
      };
    case MessagePlatform.INSTAGRAM:
      return {
        icon: <IconBrandInstagram className="w-4 h-4 text-white" />,
        bgColor: "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500",
      };
    case MessagePlatform.WEBCHAT:
      return {
        icon: <MessageCircle className="w-4 h-4 text-white" />,
        bgColor: "bg-blue-600",
      };
  }
}

export function getInboxNavContactCount(tab) {
  const totalCount = useChatContactCountStore.getState().totalCount;
  let count = 0;
  if (tab === "mine") count = totalCount?.assignedToMe;
  return count;
}

export const InstagramIcon = ({ size = "xs" }: { size?: string | number }) => {
  return (
    <ThemeIcon
      variant="gradient"
      size={size}
      gradient={{ from: "#f09433", to: "#bc1888", deg: 45 }}
    >
      <IconBrandInstagram />
    </ThemeIcon>
  );
};
