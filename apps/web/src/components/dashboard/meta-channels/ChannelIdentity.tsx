// The connected account in the channel header: its name and handle beside the channel's logo,
// whether the connection is healthy, and — with more than one connected — the picker.

import { Button } from "@rateup/ui/components/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@rateup/ui/components/select";
import { IconExternalLink } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import { ToolStatusDot } from "./ChannelOverview.tsx";
import { CHANNELS, type MetaChannel } from "./channels.ts";

export interface ChannelAccountOption {
  id: string;
  /** The account's or Page's name. */
  label: string;
  /** "@handle" for Instagram, nothing for a Page. */
  handle?: string;
  /** The channel's registry status: ACTIVE, or DISCONNECTED when it needs reconnecting. */
  status: string;
  /** Where the account lives on Instagram or Facebook. */
  profileUrl?: string;
}

/** The logo, name and handle of one account. */
function AccountLine({
  channel,
  account,
}: Readonly<{ channel: MetaChannel; account: ChannelAccountOption }>) {
  const { icon: Icon, tile } = CHANNELS[channel];
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span
        aria-hidden
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full text-white",
          tile,
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="flex min-w-0 flex-col text-left leading-tight">
        <span className="truncate text-sm font-medium">{account.label}</span>
        {account.handle ? (
          <span className="truncate text-xs text-muted-foreground">{account.handle}</span>
        ) : null}
      </span>
    </span>
  );
}

/** Connected, or needs attention with the way to fix it. */
function ConnectionStatus({
  channel,
  account,
}: Readonly<{ channel: MetaChannel; account: ChannelAccountOption }>) {
  const { t } = useTranslation();
  if (account.status === "ACTIVE") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-500">
        <ToolStatusDot tone="live" className="size-1.5" />
        {t("Connected")}
      </span>
    );
  }
  return (
    <Link
      to="/dashboard/settings/channels/$channel"
      params={{ channel: CHANNELS[channel].settingsSlug }}
      className="flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:underline dark:text-amber-500"
    >
      <ToolStatusDot tone="warning" className="size-1.5" />
      {t("Needs attention")}
    </Link>
  );
}

export function ChannelIdentity({
  channel,
  accounts,
  selected,
  onSelect,
  accountLabel,
}: Readonly<{
  channel: MetaChannel;
  accounts: readonly ChannelAccountOption[];
  selected: ChannelAccountOption;
  onSelect: (id: string) => void;
  /** The picker's accessible name, e.g. "Instagram account". */
  accountLabel: string;
}>) {
  const { t } = useTranslation();

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border bg-card py-1.5 pr-1.5 pl-3 shadow-xs">
      {accounts.length > 1 ? (
        <Select
          value={selected.id}
          onValueChange={(value) => {
            if (value) onSelect(value);
          }}
          items={accounts.map((a) => ({ value: a.id, label: a.label }))}
        >
          <SelectTrigger
            aria-label={accountLabel}
            className="h-auto min-w-0 border-0 p-0 shadow-none hover:bg-transparent dark:bg-transparent dark:hover:bg-transparent"
          >
            <AccountLine channel={channel} account={selected} />
          </SelectTrigger>
          <SelectContent align="start">
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                <AccountLine channel={channel} account={a} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        // One account is not a choice — name it rather than offer a one-item picker.
        <AccountLine channel={channel} account={selected} />
      )}
      <span aria-hidden className="h-6 w-px shrink-0 bg-border" />
      <ConnectionStatus channel={channel} account={selected} />
      {selected.profileUrl ? (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("Open profile")}
          render={<a href={selected.profileUrl} target="_blank" rel="noreferrer" />}
        >
          <IconExternalLink className="size-4" />
        </Button>
      ) : (
        <span className="w-1" />
      )}
    </div>
  );
}
