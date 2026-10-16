import { IconAlertTriangle } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";

import { useChannels } from "@/backend/channels/channels.query";
import type { ChannelOption } from "@/components/input/channelOptions.ts";
import { getChannelOptions } from "@/components/input/channelOptions.ts";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";

import type { Platform } from "../schema.ts";
import { PLATFORMS } from "../schema.ts";

/** Every connected account the rules can run on, and which platform each belongs to. */
export function useRuleAccounts() {
  const { data: channels, isPending } = useChannels();
  return useMemo(() => {
    const accounts = PLATFORMS.flatMap((option) =>
      getChannelOptions(channels, { platform: option.value }),
    );
    const platformOf = new Map<string, string>(
      accounts.map((account) => [account.value, account.platform]),
    );
    return { accounts, platformOf, isPending };
  }, [channels, isPending]);
}

const platformLabel = (platform: Platform) =>
  PLATFORMS.find((option) => option.value === platform)?.label ?? platform;

/**
 * Every account on the rule's channels as a ticked row, grouped by channel, rather than a
 * multi-select reading "2 selected": a channel with nothing ticked never runs, and a row per
 * account makes that impossible to miss.
 */
export function AccountPicker({
  platforms,
  value,
  onChange,
}: Readonly<{
  platforms: readonly Platform[];
  value: string[];
  onChange: (value: string[]) => void;
}>) {
  const { accounts, isPending } = useRuleAccounts();
  const shown = accounts.filter((account) => platforms.some((p) => p === account.platform));
  const onlyAccount = shown.length === 1 ? shown[0].value : undefined;

  // With one account there is nothing to choose, so it is ticked for the author.
  useEffect(() => {
    if (onlyAccount && value.length === 0) onChange([onlyAccount]);
  }, [onlyAccount]);

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((entry) => entry !== id) : [...value, id]);

  if (isPending) {
    return (
      <div className="ring-foreground/10 bg-card flex flex-col rounded-xl ring-1">
        {[0, 1].map((row) => (
          <div key={row} className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {platforms.map((platform) => (
        <AccountGroup
          key={platform}
          label={platforms.length > 1 ? platformLabel(platform) : undefined}
          platform={platform}
          accounts={shown.filter((account) => account.platform === platform)}
          value={value}
          onToggle={toggle}
        />
      ))}
    </div>
  );
}

function AccountGroup({
  label,
  platform,
  accounts,
  value,
  onToggle,
}: Readonly<{
  label?: string;
  platform: Platform;
  accounts: ChannelOption[];
  value: string[];
  onToggle: (id: string) => void;
}>) {
  if (accounts.length === 0) {
    return (
      <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
        <IconAlertTriangle className="text-amber-700 dark:text-amber-500" />
        <AlertDescription className="text-amber-700 dark:text-amber-500">
          No {platformLabel(platform)} account is connected, so there is nothing to listen on.{" "}
          <Link to="/dashboard/settings/channels" className="font-medium underline">
            Connect one
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  const none = !accounts.some((account) => value.includes(account.value));

  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-muted-foreground text-xs font-medium">{label}</span>}
      <div
        className={cn(
          "bg-card ring-foreground/10 flex flex-col overflow-hidden rounded-xl ring-1",
          none && "ring-destructive/60",
        )}
      >
        {accounts.map((account) => {
          const checked = value.includes(account.value);
          return (
            <label
              key={account.value}
              className={cn(
                "flex cursor-pointer items-center gap-3 border-b px-4 py-3 transition-colors last:border-b-0",
                checked ? "bg-primary/5" : "hover:bg-muted",
              )}
            >
              <Checkbox checked={checked} onCheckedChange={() => onToggle(account.value)} />
              <span className="truncate text-sm font-medium tabular-nums">{account.label}</span>
              {account.status === "DISCONNECTED" && (
                <span className="text-destructive ml-auto text-xs">Disconnected</span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
