import { ThemeIcon } from "@mantine/core";
import { IconBrandFacebook, IconBrandInstagram, IconBrandWhatsapp } from "@tabler/icons-react";
import { MessageCircle } from "lucide-react";

import { useChatContactCountStore } from "@/components/dashboard/inbox/store.ts";
import { MessagePlatform } from "@/types/enums.ts";

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
        bgColor: "bg-linear-to-br from-purple-600 via-pink-500 to-orange-500",
      };
    case MessagePlatform.WEBCHAT:
      return {
        icon: <MessageCircle className="w-4 h-4 text-white" />,
        bgColor: "bg-blue-600",
      };
    case MessagePlatform.FACEBOOK:
      return {
        icon: <IconBrandFacebook className="w-4 h-4 text-white" />,
        bgColor: "bg-blue-400",
      };
  }
}

function getInboxNavContactCount(tab) {
  const totalCount = useChatContactCountStore.getState().totalCount;
  let count = 0;
  if (tab === "mine") count = totalCount?.assignedToMe;
  return count;
}

const InstagramIcon = ({ size = "xs" }: { size?: string | number }) => {
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

function getRandomHex(size: number): string {
  const bytes = new Uint8Array(size);

  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export function generateInternalMessageId() {
  return "wamid." + Date.now().toString(36) + "-" + getRandomHex(16);
}
