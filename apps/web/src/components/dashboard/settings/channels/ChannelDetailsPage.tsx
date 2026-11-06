import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { BackLink } from "@/components/common/back-link.tsx";
import { PageHeading } from "@/components/common/page-heading.tsx";

import { MetaConnectionsList } from "./components/meta-connections-list.tsx";
import { WhatsAppSettingsDetail } from "./components/whatsapp-settings-detail";

/** Title and one-liner per channel, so the page names what you opened. */
const CHANNELS = {
  whatsapp: {
    title: "WhatsApp Business",
    description: "The number your conversations, campaigns and loyalty replies run on.",
  },
  facebook: {
    title: "Facebook Messenger",
    description: "Page messages join the same queue, with the same auto-replies and rules.",
  },
  instagram: {
    title: "Instagram Messaging",
    description: "Story replies and DMs land in the same inbox as your other channels.",
  },
} as const;

type ChannelKey = keyof typeof CHANNELS;

const isChannel = (value?: string): value is ChannelKey => Boolean(value && value in CHANNELS);

export function ChannelDetailsPage() {
  const params = useParams({ strict: false });
  const { t: translations } = useTranslation();
  const { data: waSettings, isLoading } = useWaSettings();

  const channel = params?.channel;

  const backLink = <BackLink to="/dashboard/settings/channels" label={translations("Channels")} />;

  if (!isChannel(channel)) {
    return (
      <div className="mx-auto flex max-w-265 flex-col gap-6.5">
        <PageHeading
          title={translations("Channel not found")}
          description={translations(
            "That channel does not exist, or is not available on your plan.",
          )}
          actions={backLink}
        />
      </div>
    );
  }

  const { title, description } = CHANNELS[channel];

  return (
    <div className="mx-auto flex max-w-265 flex-col gap-6.5">
      <PageHeading
        title={translations(title)}
        description={translations(description)}
        actions={backLink}
      />

      {channel === "whatsapp" && (
        <WhatsAppSettingsDetail waSettings={waSettings} isLoading={isLoading} />
      )}
      {(channel === "instagram" || channel === "facebook") && (
        <MetaConnectionsList platform={channel} />
      )}
    </div>
  );
}
