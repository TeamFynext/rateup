// Messenger and Instagram are the same screen with different labels: one row per connected
// channel — each Messenger Page and each Instagram account is its own — with a login of
// its own to add more. None of it needs WhatsApp, and neither platform needs the other.

import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconCircleCheck,
  type TablerIcon,
} from "@tabler/icons-react";
import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { MetaChannel } from "@/backend/meta/metaChannels.api";
import { useDeleteMetaChannelMutation, useMetaChannels } from "@/backend/meta/metaChannels.query";
import {
  ConnectMetaChannelButton,
  type MetaChannelRoute,
} from "@/components/common/connect-meta-channel-button.tsx";
import { SectionHeading } from "@/components/common/page-heading.tsx";
import { SetupRowCard } from "@/components/common/setup-row-card.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";

interface PlatformSpec {
  platform: MetaChannel["platform"];
  icon: TablerIcon;
  heading: (t: TFunction) => string;
  hint: (t: TFunction) => string;
  empty: (t: TFunction) => string;
  title: (channel: MetaChannel) => string;
  description: (channel: MetaChannel, t: TFunction) => string;
  /** What the row shows about the connection. */
  detail: (channel: MetaChannel, t: TFunction) => ReactNode;
  disconnectConfirm: (t: TFunction) => { title: string; description: string };
}

/** A labelled value under the row's description. */
function DetailField({ label, value }: Readonly<{ label: string; value?: string | null }>) {
  if (!value) return null;

  return (
    <span className="flex flex-col">
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </span>
  );
}

const PLATFORMS: Record<MetaChannelRoute, PlatformSpec> = {
  facebook: {
    platform: "FACEBOOK",
    icon: IconBrandFacebook,
    heading: (t) => t("Facebook Messenger connections"),
    hint: (t) => t("Each Page is its own channel — connect as many as you need"),
    empty: (t) => t("No Facebook Page connected yet. Continue with Facebook to pick one."),
    title: (channel) => channel.name ?? channel.accountId,
    description: (channel, t) => `${t("Facebook Page")} · ${channel.accountId}`,
    detail: (channel, t) => <DetailField label={t("Page")} value={channel.name} />,
    disconnectConfirm: (t) => ({
      title: t("Disconnect this Facebook Page?"),
      description: t(
        "Messenger conversations from this Page will stop arriving in the inbox. Other channels are not affected.",
      ),
    }),
  },
  instagram: {
    platform: "INSTAGRAM",
    icon: IconBrandInstagram,
    heading: (t) => t("Instagram connections"),
    hint: (t) => t("Each account is its own channel — connect as many as you need"),
    empty: (t) => t("No Instagram account connected yet. Continue with Facebook to pick one."),
    title: (channel) =>
      channel.username ? `@${channel.username}` : (channel.name ?? channel.accountId),
    description: (channel, t) =>
      channel.pageName
        ? t("Instagram account · linked to {page}", { page: channel.pageName })
        : t("Instagram account"),
    detail: (channel, t) => (
      <span className="flex flex-wrap gap-6">
        <DetailField label={t("Username")} value={channel.username && `@${channel.username}`} />
        <DetailField label={t("Display name")} value={channel.name} />
      </span>
    ),
    disconnectConfirm: (t) => ({
      title: t("Disconnect this Instagram account?"),
      description: t(
        "Instagram DMs and comments from this account will stop arriving in the inbox. Other channels are not affected.",
      ),
    }),
  },
};

export function MetaConnectionsList({ platform }: Readonly<{ platform: MetaChannelRoute }>) {
  const spec = PLATFORMS[platform];
  const { t: translations } = useTranslation();
  const confirm = useConfirm();
  const { data: channels, isLoading } = useMetaChannels(true, spec.platform);
  const deleteMutation = useDeleteMetaChannelMutation();

  const disconnect = async (channel: MetaChannel) => {
    const { title, description } = spec.disconnectConfirm(translations);
    const confirmed = await confirm({
      title,
      description,
      confirmText: translations("Disconnect"),
      cancelText: translations("Cancel"),
    });
    if (!confirmed) return;
    deleteMutation.mutate(channel.id);
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionHeading title={spec.heading(translations)} hint={spec.hint(translations)} />
        <ConnectMetaChannelButton platform={platform} size="medium" />
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : !channels?.length ? (
        <Alert>
          <AlertDescription>{spec.empty(translations)}</AlertDescription>
        </Alert>
      ) : (
        <div className="flex flex-col gap-3">
          {channels.map((channel) => (
            <SetupRowCard
              key={channel.id}
              icon={spec.icon}
              tint="brand"
              title={spec.title(channel)}
              description={spec.description(channel, translations)}
              done
              badges={
                <Badge className="bg-green-600/10 text-green-700 dark:text-green-500">
                  <IconCircleCheck size={12} />
                  {translations("Connected")}
                </Badge>
              }
              detail={spec.detail(channel, translations)}
              action={
                <Button
                  variant="secondary"
                  className="h-10 w-full"
                  disabled={deleteMutation.isPending}
                  onClick={() => disconnect(channel)}
                >
                  {translations("Disconnect")}
                </Button>
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
