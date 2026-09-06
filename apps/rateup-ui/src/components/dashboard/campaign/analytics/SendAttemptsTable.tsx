import {
  IconArrowUpRight,
  IconClock,
  IconRefresh,
  IconSparkles,
  IconUser,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils";
import { CampaignSendStatus, CampaignSendTrigger } from "@/types/enums.ts";
import type { CampaignSend } from "@/types/global";

const COLUMNS = "grid-cols-[56px_92px_112px_136px_96px_84px_88px_64px_minmax(140px,1fr)]";

/** "in 19h", or "any moment now" once the scheduled time has passed. */
function countdown(iso: string, t: (key: string, opts?: Record<string, unknown>) => string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return t("any moment now");
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return t("in {minutes}m", { minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 48) return t("in {hours}h", { hours });
  return t("in {days}d", { days: Math.round(hours / 24) });
}

function TriggerCell({ trigger }: Readonly<{ trigger: CampaignSendTrigger }>) {
  const { t } = useTranslation("campaign.analytics");
  const map: Record<CampaignSendTrigger, { icon: ReactNode; label: string }> = {
    [CampaignSendTrigger.MANUAL]: { icon: <IconUser className="size-3.5" />, label: t("Manual") },
    [CampaignSendTrigger.SCHEDULED]: {
      icon: <IconClock className="size-3.5" />,
      label: t("Scheduled"),
    },
    [CampaignSendTrigger.AUTO_RETRY]: {
      icon: <IconRefresh className="size-3.5" />,
      label: t("Automatic"),
    },
    [CampaignSendTrigger.DRIP]: { icon: <IconClock className="size-3.5" />, label: t("Drip") },
  };
  const { icon, label } = map[trigger];
  return (
    <span className="text-secondary-foreground inline-flex items-center gap-1.5">
      <span className="text-muted-foreground/70 shrink-0" aria-hidden>
        {icon}
      </span>
      {label}
    </span>
  );
}

/**
 * One row per send session: the initial send and every retry after it.
 *
 * This is the table the whole `CampaignSend` model exists for. Before it, a
 * resend silently incremented the same lifetime counters as the original, so
 * "this retry re-attempted 302 and 214 landed" was not a question the product
 * could answer at all.
 *
 * A still-scheduled attempt is shown too, dashed and dimmed, because the most
 * useful thing this table can say is often about the send that has not happened
 * yet — and it is the only place to call it off.
 */
export function SendAttemptsTable({
  sends,
  isLoading,
  retriesEnabled,
  onCancelRetries,
  isCancelling,
  onSelectSend,
}: Readonly<{
  sends: CampaignSend[] | undefined;
  isLoading: boolean;
  retriesEnabled: boolean;
  onCancelRetries: () => void;
  isCancelling: boolean;
  onSelectSend?: (send: CampaignSend) => void;
}>) {
  const { t } = useTranslation("campaign.analytics");

  const retries = sends?.filter((send) => send.trigger === CampaignSendTrigger.AUTO_RETRY) ?? [];
  const reattempted = retries.reduce((total, send) => total + send.totalTargeted, 0);
  const recovered = retries.reduce((total, send) => total + send.recovered, 0);

  return (
    <div className="bg-card ring-foreground/10 flex flex-col overflow-hidden rounded-xl shadow-xs ring-1">
      <div className="flex flex-col gap-2.5 px-5 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="font-display text-[15px] font-semibold">{t("Send attempts")}</span>
            <span className="text-muted-foreground text-[12.5px]">
              {t("Every send is numbered. Retries only re-attempt messages Meta limited.")}
            </span>
          </div>
          {retriesEnabled ? <Badge variant="system">{t("Retries on")}</Badge> : null}
        </div>

        {recovered > 0 ? (
          <div className="border-primary/20 bg-accent flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5">
            <IconSparkles className="text-primary size-4 shrink-0" aria-hidden />
            <span className="text-foreground text-[13.5px] font-semibold">
              {t("Retries recovered {count} messages that would otherwise have failed.", {
                count: recovered.toLocaleString(),
              })}
            </span>
            <span className="text-muted-foreground ml-auto shrink-0 text-[12.5px] tabular-nums">
              {t("{percent}% of the {total} eligible", {
                percent: ((recovered / Math.max(reattempted, 1)) * 100).toFixed(1),
                total: reattempted.toLocaleString(),
              })}
            </span>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2 p-5">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : !sends?.length ? (
        <p className="text-muted-foreground p-10 text-center text-[13px]">
          {t("This campaign has not been sent yet.")}
        </p>
      ) : (
        // Scrolls inside its own container so the page never does.
        <div className="mt-3 overflow-x-auto">
          <div className="min-w-[62rem]">
            <div
              className={cn(
                "border-border text-muted-foreground/70 grid items-center gap-3 border-b px-5 pt-1 pb-2 text-[11.5px] font-semibold tracking-wider uppercase",
                COLUMNS,
              )}
            >
              <span>{t("Attempt")}</span>
              <span>{t("Type")}</span>
              <span>{t("Trigger")}</span>
              <span>{t("Started")}</span>
              <span className="text-right">{t("Re-attempted")}</span>
              <span className="text-right">{t("Delivered")}</span>
              <span className="text-right">{t("Recovered")}</span>
              <span className="text-right">{t("Failed")}</span>
              <span className="text-right">{t("Recovery rate")}</span>
            </div>

            {sends.map((send) => {
              const pending = send.status === CampaignSendStatus.SCHEDULED;
              const isRetry = send.trigger === CampaignSendTrigger.AUTO_RETRY;
              return (
                <div
                  key={send.id}
                  onClick={() => (pending ? undefined : onSelectSend?.(send))}
                  className={cn(
                    "grid items-center gap-3 px-5 py-3 text-[13px] tabular-nums",
                    pending
                      ? "border-input bg-muted border-l-[3px] border-dashed"
                      : "border-border/60 border-b border-l-[3px] border-l-transparent",
                    !pending && onSelectSend && "hover:bg-muted/60 cursor-pointer",
                    COLUMNS,
                  )}
                >
                  <span
                    className={cn(
                      "font-mono font-semibold",
                      pending ? "text-muted-foreground" : "text-foreground",
                    )}
                  >
                    #{send.attemptNo + 1}
                  </span>
                  <span className={cn(pending && "text-secondary-foreground")}>
                    {isRetry ? t("Retry") : send.label}
                  </span>
                  <TriggerCell trigger={send.trigger} />

                  <span className="text-secondary-foreground">
                    {send.startedAt ? (
                      new Date(send.startedAt).toLocaleString(undefined, {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    ) : send.scheduledFor ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-foreground font-semibold">
                          {countdown(send.scheduledFor, t)}
                        </span>
                        <span className="text-muted-foreground/70 text-xs">
                          {new Date(send.scheduledFor).toLocaleString(undefined, {
                            day: "numeric",
                            month: "short",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </span>

                  <span className="text-right font-medium">
                    {pending
                      ? t("{count} eligible", { count: send.totalTargeted })
                      : send.totalTargeted.toLocaleString()}
                  </span>
                  <Numeric value={pending ? null : send.totalDelivered} />

                  {/* Recovered is what a retry is *for*, so it is the one number
                      that gets a badge rather than being another column of digits. */}
                  <span className="text-right">
                    {pending || !isRetry || send.recovered === 0 ? (
                      <span className="text-muted-foreground/70">—</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-green-600/10 px-2 py-0.5 font-semibold text-green-700 dark:text-green-500">
                        <IconArrowUpRight className="size-3" aria-hidden />
                        {send.recovered.toLocaleString()}
                      </span>
                    )}
                  </span>

                  <span
                    className={cn(
                      "text-right font-medium",
                      pending
                        ? "text-muted-foreground/70"
                        : send.totalFailed > 0
                          ? "text-destructive"
                          : undefined,
                    )}
                  >
                    {pending ? "—" : send.totalFailed.toLocaleString()}
                  </span>

                  <span className="flex justify-end">
                    {pending ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isCancelling}
                        onClick={(event) => {
                          event.stopPropagation();
                          onCancelRetries();
                        }}
                      >
                        {t("Cancel pending retries")}
                      </Button>
                    ) : send.recoveryRate === null || !isRetry ? (
                      <span className="text-muted-foreground/70">—</span>
                    ) : (
                      <span className="font-semibold">{(send.recoveryRate * 100).toFixed(1)}%</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Numeric({ value }: Readonly<{ value: number | null }>) {
  return (
    <span className={cn("text-right font-medium", value === null && "text-muted-foreground/70")}>
      {value === null ? "—" : value.toLocaleString()}
    </span>
  );
}
