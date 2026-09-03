// Messenger and Instagram are the same screen with different labels: one row per
// WhatsApp channel, showing what is linked to it and offering to link or unlink.
// They were two near-identical files; the differences that remain are in PLATFORMS.

import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconCircleCheck,
  type TablerIcon,
} from "@tabler/icons-react";
import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { WaSettings } from "@/backend/whatsapp/settings/waSettings.api";
import { useUpsertWaSettingsMutation } from "@/backend/whatsapp/settings/waSettings.query";
import { FacebookConfigModal } from "@/components/common/facebook-config-modal.tsx";
import { InstagramConfigModal } from "@/components/common/instagram-config-modal.tsx";
import { SectionHeading } from "@/components/common/page-heading.tsx";
import { SetupRowCard } from "@/components/common/setup-row-card.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useConfirm } from "@/context/confirm-provider.tsx";

type WaSetting = WaSettings[number];

interface PlatformSpec {
  icon: TablerIcon;
  heading: (t: TFunction) => string;
  hint: (t: TFunction) => string;
  /** Shown when there is no WhatsApp channel to hang the asset off. */
  empty: (t: TFunction) => string;
  connectLabel: (t: TFunction) => string;
  changeLabel: (t: TFunction) => string;
  isConnected: (setting: WaSetting) => boolean;
  /** What the row shows about the linked asset. */
  detail: (setting: WaSetting, t: TFunction) => ReactNode;
  /** Cleared on the setting to unlink. */
  clear: Partial<WaSetting>;
  confirm: (t: TFunction) => { title: string; description: string };
  Modal: typeof FacebookConfigModal;
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

const PLATFORMS: Record<"facebook" | "instagram", PlatformSpec> = {
  facebook: {
    icon: IconBrandFacebook,
    heading: (t) => t("Facebook Messenger connections"),
    hint: (t) => t("One Facebook Page per WhatsApp channel"),
    empty: (t) =>
      t("Connect at least one WhatsApp Business account first to enable Facebook Messenger."),
    connectLabel: (t) => t("Connect Page"),
    changeLabel: (t) => t("Change Page"),
    isConnected: (setting) => Boolean(setting.fbPageId?.length),
    detail: (setting, t) => <DetailField label={t("Page")} value={setting.fbUserName} />,
    // Instagram hangs off the Page, so unlinking the Page unlinks it too.
    clear: { fbPageId: "", pageAccessToken: "", ibaId: "", igUserName: "", igDisplayName: "" },
    confirm: (t) => ({
      title: t("Disconnect Facebook Page and Instagram?"),
      description: t(
        "Disconnecting this Facebook Page will also disconnect the linked Instagram account from this channel.",
      ),
    }),
    Modal: FacebookConfigModal,
  },
  instagram: {
    icon: IconBrandInstagram,
    heading: (t) => t("Instagram connections"),
    hint: (t) => t("One Instagram account per WhatsApp channel"),
    empty: (t) => t("Connect at least one WhatsApp Business account first to enable Instagram."),
    connectLabel: (t) => t("Connect account"),
    changeLabel: (t) => t("Change account"),
    isConnected: (setting) => Boolean(setting.ibaId?.length),
    detail: (setting, t) => (
      <span className="flex flex-wrap gap-6">
        <DetailField label={t("Username")} value={setting.igUserName && `@${setting.igUserName}`} />
        <DetailField label={t("Display name")} value={setting.igDisplayName} />
      </span>
    ),
    clear: { ibaId: "", igUserName: "", igDisplayName: "" },
    confirm: (t) => ({
      title: t("Disconnect this Instagram account?"),
      description: t("Instagram DMs will stop arriving in the inbox for this WhatsApp channel."),
    }),
    Modal: InstagramConfigModal,
  },
};

export function MetaConnectionsList({
  platform,
  waSettings,
  isLoading,
}: Readonly<{
  platform: "facebook" | "instagram";
  waSettings: WaSettings | undefined;
  isLoading: boolean;
}>) {
  const spec = PLATFORMS[platform];
  const { t: translations } = useTranslation();
  const confirm = useConfirm();
  const upsertMutation = useUpsertWaSettingsMutation();

  const [selected, setSelected] = useState<WaSetting | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  const openConfig = (setting: WaSetting) => {
    setSelected(setting);
    setConfigOpen(true);
  };

  const disconnect = async (setting: WaSetting) => {
    const { title, description } = spec.confirm(translations);
    const confirmed = await confirm({
      title,
      description,
      confirmText: translations("Disconnect"),
      cancelText: translations("Cancel"),
    });

    if (!confirmed) return;

    upsertMutation.mutate({ ...setting, ...spec.clear });
  };

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading title={spec.heading(translations)} hint={spec.hint(translations)} />

      {isLoading ? (
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : !waSettings?.length ? (
        <Alert>
          <AlertDescription>{spec.empty(translations)}</AlertDescription>
        </Alert>
      ) : (
        <div className="flex flex-col gap-3">
          {waSettings.map((setting) => {
            const connected = spec.isConnected(setting);

            return (
              <SetupRowCard
                key={setting.id || setting.phoneId}
                icon={spec.icon}
                tint="brand"
                title={setting.phoneDisplayName || setting.phone}
                description={`${translations("WhatsApp channel")} · ${setting.wabaId}`}
                done={connected}
                badges={
                  connected ? (
                    <Badge className="bg-green-600/10 text-green-700 dark:text-green-500">
                      <IconCircleCheck size={12} />
                      {translations("Connected")}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">{translations("Not connected")}</Badge>
                  )
                }
                detail={connected ? spec.detail(setting, translations) : null}
                action={
                  <Button
                    variant={connected ? "secondary" : "default"}
                    className="h-10 w-full"
                    onClick={() => openConfig(setting)}
                  >
                    {connected ? spec.changeLabel(translations) : spec.connectLabel(translations)}
                  </Button>
                }
                actionFooter={
                  connected ? (
                    <button
                      type="button"
                      disabled={upsertMutation.isPending}
                      onClick={() => disconnect(setting)}
                      className="cursor-pointer text-xs text-destructive underline-offset-4 hover:underline disabled:opacity-50"
                    >
                      {translations("Disconnect")}
                    </button>
                  ) : null
                }
              />
            );
          })}
        </div>
      )}

      <spec.Modal
        opened={configOpen}
        close={() => setConfigOpen(false)}
        selectedWaSettings={selected}
      />
    </section>
  );
}
