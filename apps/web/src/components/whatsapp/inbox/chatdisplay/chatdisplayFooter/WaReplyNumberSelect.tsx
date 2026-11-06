import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@rateup/ui/components/select";
import { Skeleton } from "@rateup/ui/components/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@rateup/ui/components/tooltip";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { Channel } from "@/backend/channels/channels.api";
import type { WhatsappReach } from "@/backend/channels/whatsappReach.api";
import { cn } from "@/lib/utils.ts";
import { groupByBusiness, spansSeveralBusinesses } from "@/utils/whatsapp/businesses.ts";

interface NumberOption {
  /** The number's Meta phone number id — what the composer sends from. */
  value: string;
  label: string;
  disconnected: boolean;
  businessId: string | null;
  businessName: string | null;
  /** Why this number cannot message the customer; absent when it can. */
  unreachable?: string;
}

/**
 * The WhatsApp number a reply leaves from. Numbers that cannot reach this customer — a
 * customer known only by a business-scoped user ID (BSUID) is reachable from numbers of
 * that business alone — are greyed out and say why; once the org spans several
 * businesses the numbers are grouped under each.
 */
export function WaReplyNumberSelect({
  value,
  onChange,
  channels,
  reach,
  loading,
  className,
}: Readonly<{
  value: string;
  onChange: (phoneId: string) => void;
  /** The org's WhatsApp channels. */
  channels: Channel[] | undefined;
  /** Reach per number for this contact; undefined while it loads (nothing is greyed out). */
  reach: WhatsappReach[] | undefined;
  loading: boolean;
  className?: string;
}>) {
  const { t: translations } = useTranslation();

  const options = useMemo<NumberOption[]>(() => {
    const byPhoneId = new Map((reach ?? []).map((row) => [row.phoneId, row]));
    // The businesses that can reach the customer, to name in "only from …".
    const reachableBusinesses = [
      ...new Set(
        (reach ?? [])
          .filter((row) => row.reachable && row.businessName)
          .map((row) => row.businessName),
      ),
    ].join(", ");
    return (channels ?? [])
      .filter((channel) => channel.platform === "WHATSAPP")
      .map((channel) => {
        const row = byPhoneId.get(channel.accountId);
        let unreachable: string | undefined;
        if (row && !row.reachable) {
          unreachable =
            row.reason === "NO_WHATSAPP"
              ? translations("No WhatsApp number or WhatsApp ID for this customer")
              : reachableBusinesses
                ? translations("This customer can only be messaged from {business}", {
                    business: reachableBusinesses,
                  })
                : translations("This customer can only be messaged from another business");
        }
        return {
          value: channel.accountId,
          label: channel.name || channel.address || channel.accountId,
          disconnected: channel.status === "DISCONNECTED",
          businessId: channel.whatsapp?.businessPortfolioId ?? null,
          businessName: channel.whatsapp?.businessPortfolioName ?? null,
          unreachable,
        };
      });
  }, [channels, reach, translations]);

  const groups = groupByBusiness(options, (option) => ({
    id: option.businessId,
    name: option.businessName,
  }));
  const grouped = spansSeveralBusinesses(groups);

  if (loading) {
    return (
      <div className={cn("flex h-9 items-center rounded-md border px-3", className)}>
        <Skeleton className="h-4 w-20" />
      </div>
    );
  }

  const renderOption = (option: NumberOption) => {
    const item = (
      <SelectItem
        value={option.value}
        key={option.value}
        disabled={option.disconnected || Boolean(option.unreachable)}
        className="w-full"
      >
        <span className="flex w-full items-center justify-between gap-2">
          <span className="truncate">{option.label}</span>
          {option.disconnected && (
            <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
              {translations("Disconnected")}
            </span>
          )}
        </span>
      </SelectItem>
    );
    if (!option.unreachable) return item;
    // A disabled item takes no pointer events, so the wrapper carries the tooltip.
    return (
      <Tooltip key={option.value}>
        <TooltipTrigger render={<div className="w-full" />}>{item}</TooltipTrigger>
        <TooltipContent side="left" className="max-w-60">
          {option.unreachable}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <Select
      value={value || null}
      onValueChange={(next) => onChange(next ?? "")}
      items={options.map(({ value: optionValue, label }) => ({ value: optionValue, label }))}
    >
      <SelectTrigger
        aria-label={translations("Reply from")}
        className={cn(
          "h-9 cursor-pointer !text-xs text-muted-foreground hover:bg-accent",
          className,
        )}
      >
        <SelectValue placeholder={translations("Select Account")} />
      </SelectTrigger>
      <SelectContent>
        {grouped
          ? groups.map((group, index) => (
              <SelectGroup key={group.id ?? group.name ?? "unknown"}>
                {index > 0 && <SelectSeparator />}
                <SelectLabel>
                  {group.name ?? translations("Business not identified yet")}
                </SelectLabel>
                {group.items.map(renderOption)}
              </SelectGroup>
            ))
          : options.map(renderOption)}
      </SelectContent>
    </Select>
  );
}
