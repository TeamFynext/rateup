import { IconClock, IconPlayerPlay } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { CampaignRetryStrategy, CampaignSendStatus, CampaignSendTrigger } from "@/types/enums.ts";
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
 * The send that has not happened yet — a scheduled first send, or a booked retry.
 *
 * Both are the same question ("what is this campaign about to do, and when"), so
 * they are one card rather than two. What differs is the wording and the two
 * buttons: a campaign scheduled for Friday is sent now or unscheduled, while a
 * booked retry is fired now or called off. The card used to render only for a
 * retry, which left a campaign scheduled days out with nothing on its Overview
 * saying so.
 *
 * Rendered only when there is such a send. A campaign with nothing scheduled
 * should not carry an empty card explaining that nothing is scheduled — the
 * absence is the message, and the attempts table on Analytics holds the history.
 */
export function NextBatchCard({
  send,
  policy,
  recipients,
  eligible,
  onCancel,
  onRetryNow,
  isCancelling,
  isRetrying,
}: Readonly<{
  send: CampaignSend | undefined;
  policy: CampaignRetryPolicy | null | undefined;
  /** The campaign's audience, for a send that has not fanned out yet. */
  recipients: number;
  /** Recipients a retry would pick up right now, or null while unknown. */
  eligible: number | null;
  onCancel: () => void;
  onRetryNow: () => void;
  isCancelling: boolean;
  isRetrying: boolean;
}>) {
  const { t } = useTranslation("campaign.details");
  if (!send?.scheduledFor) return null;

  const isRetry = send.trigger === CampaignSendTrigger.AUTO_RETRY;
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
        {/* A campaign scheduled for later is RUNNING the moment it is booked — the
            fan-out happens up front and the messages carry the delay — so its raw
            status would read "RUNNING" beside a date three weeks out. */}
        <Badge variant="secondary">
          {!isRetry || send.status === CampaignSendStatus.SCHEDULED ? t("Scheduled") : send.status}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4 px-5 py-4.5">
        <Detail
          label={t("Attempt")}
          // Same wording the attempts table and the activity feed use for this
          // row, so one send is not called three different things.
          value={`#${send.attemptNo + 1} · ${
            isRetry ? t("Retry") : send.attemptNo === 0 ? t("Initial send") : t("Scheduled send")
          }`}
        >
          {isRetry
            ? policy
              ? t("{strategy} schedule", {
                  strategy:
                    policy.strategy === CampaignRetryStrategy.SMART ? t("Smart") : t("Fixed"),
                })
              : null
            : t("Set when the campaign was scheduled")}
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
          <span className="text-muted-foreground/70 text-[11.5px]">
            {isRetry ? t("Eligible messages") : t("Recipients")}
          </span>
          {/* `totalTargeted` is decided at fire time, so it is 0 on a send that has
              not run — the cohort it *would* take is the number worth showing. */}
          <span className="font-display text-xl leading-tight font-bold tabular-nums">
            {(send.totalTargeted || (isRetry ? (eligible ?? 0) : recipients)).toLocaleString()}
          </span>
          <span className="text-muted-foreground text-xs">
            {isRetry ? t("failed with a retryable error") : t("in this campaign")}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 px-5 pb-4.5">
        {/* No "send it now" for a scheduled campaign: its messages are already
            queued as delayed jobs and its row holds the campaign's live send lane,
            so a second send is refused outright — and cancelling the schedule first
            is a dequeue that finishes on a worker, not something to race. Cancel
            the schedule, then send; the header's Send button does the second half. */}
        {isRetry ? (
          <>
            {/* Nothing to retry means the API refuses this with "No participants
                with the specified statuses" — a sentence about a status filter,
                said to someone who pressed a button the card had left enabled.
                The card already knows the cohort is empty; it should say so
                instead. `null` is "not loaded yet", not "none". */}
            <Button
              variant="outline"
              size="sm"
              onClick={onRetryNow}
              disabled={isRetrying || eligible === 0}
              title={
                eligible === 0
                  ? t("Nothing to retry — no recipient failed with a retryable error.")
                  : undefined
              }
            >
              <IconPlayerPlay className="size-4" aria-hidden />
              {t("Retry now")}
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={isCancelling}>
              {t("Cancel pending retries")}
            </Button>
            {quiet ? (
              <span className="text-muted-foreground/70 ml-auto text-xs">{quiet}</span>
            ) : null}
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isCancelling}>
            {t("Cancel schedule")}
          </Button>
        )}
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
