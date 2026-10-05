// The `/dashboard/settings/channels/` overview. Built from the same `SetupRowCard`
// as the setup guide, so a channel reads the same wherever you meet it.

import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconCircleCheck,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import type { Channel } from "@/backend/channels/channels.api";
import { useChannels } from "@/backend/channels/channels.query";
import { PageHeading, SectionHeading } from "@/components/common/page-heading.tsx";
import { SetupRowCard } from "@/components/common/setup-row-card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";

export function ChannelsPage() {
  const navigate = useNavigate();
  const { t: translations } = useTranslation();
  const { data: channels, isLoading } = useChannels();

  // Every channel is its own registry row; each platform is counted on its own.
  const countOf = (platform: Channel["platform"]) =>
    channels?.filter((channel) => channel.platform === platform).length ?? 0;
  const waCount = countOf("WHATSAPP");
  const igCount = countOf("INSTAGRAM");
  const fbCount = countOf("FACEBOOK");
  const hasChannel = waCount + igCount + fbCount > 0;

  const open = (channel: "whatsapp" | "facebook" | "instagram") =>
    navigate({ to: "/dashboard/settings/channels/$channel", params: { channel } });

  /** How many are connected. */
  const statusBadge = (count: number) => {
    if (count === 0) return null;
    return (
      <Badge className="bg-green-600/10 text-green-700 dark:text-green-500">
        <IconCircleCheck size={12} />
        {translations("{count} connected", { count })}
      </Badge>
    );
  };

  const action = (
    connected: boolean,
    channel: "whatsapp" | "facebook" | "instagram",
    disabled = false,
  ) => (
    <Button
      variant={connected ? "secondary" : "default"}
      className="h-10 w-full"
      disabled={disabled}
      onClick={() => open(channel)}
    >
      {connected ? translations("Configure") : translations("Connect")}
    </Button>
  );

  return (
    <div className="mx-auto flex max-w-265 flex-col gap-6.5">
      <PageHeading
        title={translations("Channels")}
        description={translations(
          "Every channel you connect shares one inbox — the same replies, the same rules.",
        )}
      />

      <section className="flex flex-col gap-3">
        {/* Same rule as the setup guide: any one channel gets an org going. */}
        <SectionHeading
          title={translations("Connect a channel")}
          hint={translations(
            "Connect at least one — every conversation lands in the same inbox, with the same replies and rules",
          )}
          badge={
            isLoading ? null : hasChannel ? (
              <Badge className="bg-green-600/10 text-green-700 dark:text-green-500">
                <IconCircleCheck size={12} />
                {translations("Done")}
              </Badge>
            ) : (
              <Badge variant="system">{translations("Required")}</Badge>
            )
          }
        />

        <div className="flex flex-col gap-3">
          <SetupRowCard
            icon={IconBrandWhatsapp}
            tint="green"
            title={translations("WhatsApp Business")}
            description={translations(
              "Connect your WhatsApp inbox to handle conversations and campaigns.",
            )}
            done={waCount > 0}
            badges={statusBadge(waCount)}
            action={action(waCount > 0, "whatsapp", isLoading)}
          />

          <SetupRowCard
            icon={IconBrandFacebook}
            tint="brand"
            title={translations("Facebook Messenger")}
            description={translations(
              "Connect your Facebook Page to manage Messenger conversations and automate replies.",
            )}
            done={fbCount > 0}
            badges={statusBadge(fbCount)}
            action={action(fbCount > 0, "facebook", isLoading)}
          />

          <SetupRowCard
            icon={IconBrandInstagram}
            tint="brand"
            title={translations("Instagram Messaging")}
            description={translations(
              "Integrate Instagram DMs to manage customer interactions and automate replies.",
            )}
            done={igCount > 0}
            badges={statusBadge(igCount)}
            action={action(igCount > 0, "instagram", isLoading)}
          />
        </div>
      </section>
    </div>
  );
}
