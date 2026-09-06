import { IconClock, IconPlayerPlay } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { CampaignRetryStrategy, CampaignSendStatus } from "@/types/enums.ts";
import type { CampaignRetryPolicy, CampaignSend } from "@/types/global";

/** "in 19h" — the number people read off this card. */
function untilLabel(iso: string, t: (k: string, o?: Record<string, unknown>) => string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return t("any moment now");
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return t("in {minutes}m", { minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 48) return t("in {hours}h", { hours });
  return t("in {days}d", { days: Math.round(hours / 24) });
}

/**
 * The attempt that has not happened yet.
 *
 * Rendered only when there is one. A campaign with nothing scheduled should not
 * carry an empty card explaining that nothing is scheduled — the absence is the
 * message, and the attempts table on Analytics is where the history lives.
 */
export function NextBatchCard({
  send,
  policy,
  onCancel,
  onRetryNow,
  isCancelling,
  isRetrying,
}: Readonly<{
  send: CampaignSend | undefined;
  policy: CampaignRetryPolicy | null | undefined;
  onCancel: () => void;
  onRetryNow: () => void;
  isCancelling: boolean;
  isRetrying: boolean;
}>) {
  const { t } = useTranslation("campaign.details");
  if (!send?.scheduledFor) return null;

  const scheduledFor = new Date(send.scheduledFor);
  const quiet =
    policy?.quietHoursStart && policy?.quietHoursEnd
      ? t("Retries never run {start} – {end}", {
          start: policy.quietHoursStart,
          end: policy.quietHoursEnd,
        })
      : null;

  return (
    <div className="bg-card ring-foreground/10 overflow-hidden rounded-xl shadow-xs ring-1">
      <div className="border-border flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <IconClock className="text-muted-foreground size-4" aria-hidden />
          <span className="font-display text-[15px] font-semibold">{t("Next batch")}</span>
        </div>
        <Badge variant="secondary">
          {send.status === CampaignSendStatus.SCHEDULED ? t("Scheduled") : send.status}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4 px-5 py-4.5">
        <Detail label={t("Attempt")} value={`#${send.attemptNo + 1} · ${t("Retry")}`}>
          {policy
            ? t("{strategy} schedule", {
                strategy: policy.strategy === CampaignRetryStrategy.SMART ? t("Smart") : t("Fixed"),
              })
            : null}
        </Detail>
        <Detail
          label={t("Starts")}
          value={scheduledFor.toLocaleString(undefined, {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "numeric",
            minute: "2-digit",
          })}
        >
          {untilLabel(send.scheduledFor, t)}
        </Detail>
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground/70 text-[11.5px]">{t("Eligible messages")}</span>
          <span className="font-display text-xl leading-tight font-bold tabular-nums">
            {send.totalTargeted.toLocaleString()}
          </span>
          <span className="text-muted-foreground text-xs">{t("still limited by Meta")}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 px-5 pb-4.5">
        <Button variant="outline" size="sm" onClick={onRetryNow} disabled={isRetrying}>
          <IconPlayerPlay className="size-4" aria-hidden />
          {t("Retry now")}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isCancelling}>
          {t("Cancel pending retries")}
        </Button>
        {quiet ? <span className="text-muted-foreground/70 ml-auto text-xs">{quiet}</span> : null}
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  children,
}: Readonly<{ label: string; value: string; children?: React.ReactNode }>) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-muted-foreground/70 text-[11.5px]">{label}</span>
      <span className="truncate text-sm font-semibold">{value}</span>
      {children ? <span className="text-muted-foreground truncate text-xs">{children}</span> : null}
    </div>
  );
}
