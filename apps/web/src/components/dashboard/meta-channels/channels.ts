import { IconBrandInstagram, IconBrandMessenger, type TablerIcon } from "@tabler/icons-react";

import type { ChatbotChannelParam } from "@/components/dashboard/chatbots/ChatbotsPage.tsx";
import type { PhonePlatform } from "@/components/ui/phone-preview.tsx";
import { AutomationPlatform } from "@/types/platform.ts";

export type MetaChannel = Extract<ChatbotChannelParam, "instagram" | "messenger">;

/** What differs between the two channels that is not copy. */
export const CHANNELS: Record<
  MetaChannel,
  {
    icon: TablerIcon;
    /** The logo's brand fill. */
    tile: string;
    settingsSlug: "instagram" | "facebook";
    platform: AutomationPlatform;
    phone: PhonePlatform;
  }
> = {
  instagram: {
    icon: IconBrandInstagram,
    tile: "bg-linear-to-br from-purple-500 via-pink-500 to-orange-400",
    settingsSlug: "instagram",
    platform: AutomationPlatform.INSTAGRAM,
    phone: "instagram",
  },
  messenger: {
    icon: IconBrandMessenger,
    tile: "bg-linear-to-br from-sky-500 to-blue-600",
    settingsSlug: "facebook",
    platform: AutomationPlatform.FACEBOOK,
    phone: "facebook",
  },
};
