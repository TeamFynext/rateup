import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconExternalLink,
  IconRadio,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useWaSettings } from "@/backend/whatsapp/settings/waSettings.query.ts";
import { getChannelOptions, type ChannelOption } from "@/components/input/channelOptions.ts";
import { buttonVariants } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import { MessagePlatform, WhatsappSettingsStatus } from "@/types/enums.ts";

import { SettingsEmpty, SettingsPanel } from "./SettingsPanel.tsx";

/**
 * Brand colours, consumed as dynamic `style` values on the channel tile rather
 * than as theme tokens — same treatment the thread header gives them.
 */
const CHANNELS = [
  {
    platform: MessagePlatform.WHATSAPP,
    label: "WhatsApp",
    color: "#25d366",
    icon: IconBrandWhatsapp,
  },
  {
    platform: MessagePlatform.INSTAGRAM,
    label: "Instagram",
    color: "#dd2a7b",
    icon: IconBrandInstagram,
  },
  {
    platform: MessagePlatform.FACEBOOK,
    label: "Messenger",
    color: "#0084ff",
    icon: IconBrandFacebook,
  },
] as const;

/**
 * The accounts the inbox receives on, grouped by channel.
 *
 * Read-only, like the Teams panel: connecting and disconnecting accounts lives at
 * `/dashboard/settings/channels`. What this answers is which accounts the inbox
 * is actually listening to, which is otherwise only visible in a filter dropdown.
 */
export default function ChannelSettings() {
  const { t } = useTranslation();
  const { data: waSettings, isLoading } = useWaSettings();

  const accountsByPlatform = useMemo(() => {
    const all = getChannelOptions(waSettings, { platform: "all" });
    const map = new Map<MessagePlatform, ChannelOption[]>();
    for (const account of all) {
      map.set(account.platform, [...(map.get(account.platform) ?? []), account]);
    }
    return map;
  }, [waSettings]);

  const connectedTotal = [...accountsByPlatform.values()].reduce(
    (total, list) => total + list.length,
    0,
  );

  return (
    <SettingsPanel
      title={t("Channels")}
      description={t("Accounts this inbox receives conversations on.")}
      action={
        <Link
          to="/dashboard/settings/channels"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
        >
          <IconExternalLink className="size-4" />
          {t("Manage channels")}
        </Link>
      }
      className="max-w-3xl"
    >
      {isLoading && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      )}

      {!isLoading && connectedTotal === 0 && (
        <SettingsEmpty
          icon={<IconRadio className="size-7" />}
          message={t("No channels connected yet — connect one to start receiving conversations.")}
        />
      )}

      {!isLoading && connectedTotal > 0 && (
        <div className="flex flex-col gap-4">
          {CHANNELS.map(({ platform, label, color, icon: Icon }) => {
            const accounts = accountsByPlatform.get(platform) ?? [];
            // A channel with nothing connected is noise here, not a call to action:
            // connecting happens on the channels page the header links to.
            if (accounts.length === 0) return null;
            return (
              <div key={platform} className="rounded-xl border border-border bg-card p-4.5">
                <div className="mb-3.5 flex items-center gap-3">
                  <span
                    className="flex size-9.5 shrink-0 items-center justify-center rounded-[10px]"
                    style={{ background: color }}
                  >
                    <Icon className="size-5 text-white" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[15px] font-extrabold text-foreground">{t(label)}</div>
                    <div className="text-[12px] text-muted-foreground">
                      {t("{count} connected accounts", { count: accounts.length })}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {accounts.map((account) => {
                    // Only DISCONNECTED is a real fault signal; legacy rows carry
                    // no status at all and are still receiving.
                    const isLive = account.status !== WhatsappSettingsStatus.DISCONNECTED;
                    return (
                      <div
                        key={`${platform}-${account.value}`}
                        className="flex items-center gap-2.5 rounded-[9px] border border-border px-3 py-2.5"
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            isLive ? "bg-green-600" : "bg-muted-foreground/40",
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
                          {account.label}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                            isLive
                              ? "bg-green-600/10 text-green-600"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {isLive ? t("Connected") : t("Disconnected")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SettingsPanel>
  );
}
