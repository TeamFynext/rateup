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

import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query";
import { PageHeading, SectionHeading } from "@/components/common/page-heading.tsx";
import { SetupRowCard } from "@/components/common/setup-row-card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";

export function ChannelsPage() {
  const navigate = useNavigate();
  const { t: translations } = useTranslation();
  const { data: waSettings, isLoading } = useWaSettings();

  const waConnected = !isLoading && Boolean(waSettings?.length);
  const waCount = waSettings?.length ?? 0;
  const igCount = waSettings?.filter((setting) => setting.ibaId?.length > 0).length ?? 0;
  const fbCount = waSettings?.filter((s) => s.fbPageId && s.fbPageId.length > 0).length ?? 0;

  const open = (channel: "whatsapp" | "facebook" | "instagram") =>
    navigate({ to: "/dashboard/settings/channels/$channel", params: { channel } });

  /** Meta hangs Messenger and Instagram off the WhatsApp connection, so it comes first. */
  const needsWhatsApp = !waConnected && !isLoading;

  /**
   * How many are connected, or what is holding the channel up. `dependent` marks the
   * two channels Meta hangs off WhatsApp — WhatsApp itself is never waiting on itself.
   */
  const statusBadge = (count: number, dependent = false) => {
    if (count > 0) {
      return (
        <Badge className="bg-green-600/10 text-green-700 dark:text-green-500">
          <IconCircleCheck size={12} />
          {translations("{count} connected", { count })}
        </Badge>
      );
    }

    if (dependent && needsWhatsApp) {
      return <Badge variant="secondary">{translations("Waiting on WhatsApp")}</Badge>;
    }

    return null;
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
        <SectionHeading
          title={translations("WhatsApp")}
          hint={translations("Messenger and Instagram hang off this connection")}
        />

        <SetupRowCard
          icon={IconBrandWhatsapp}
          tint="green"
          title={translations("WhatsApp Business")}
          description={translations(
            "Connect your WhatsApp inbox to handle conversations and campaigns.",
          )}
          done={waConnected}
          badges={statusBadge(waCount)}
          action={action(waConnected, "whatsapp", isLoading)}
        />
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading
          title={translations("More channels")}
          hint={translations("Optional — add them in any order, any time")}
        />

        <div className="flex flex-col gap-3">
          <SetupRowCard
            icon={IconBrandFacebook}
            tint="brand"
            title={translations("Facebook Messenger")}
            description={translations(
              "Connect your Facebook Page to manage Messenger conversations and automate replies.",
            )}
            done={fbCount > 0}
            badges={statusBadge(fbCount, true)}
            action={action(fbCount > 0, "facebook", needsWhatsApp || isLoading)}
          />

          <SetupRowCard
            icon={IconBrandInstagram}
            tint="brand"
            title={translations("Instagram Messaging")}
            description={translations(
              "Integrate Instagram DMs to manage customer interactions and automate replies.",
            )}
            done={igCount > 0}
            badges={statusBadge(igCount, true)}
            action={action(igCount > 0, "instagram", needsWhatsApp || isLoading)}
          />
        </div>
      </section>
    </div>
  );
}
