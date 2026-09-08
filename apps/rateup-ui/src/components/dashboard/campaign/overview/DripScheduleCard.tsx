import { IconCheck, IconClock, IconPlayerPause } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import type { DripSchedule, DripStageSchedule } from "@/backend/campaign/campaign.api.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils";

import { Detail, untilLabel } from "./NextBatchCard.tsx";

/** "+2 days at 16:00" — the gap this stage was configured with. */
function delayLabel(stage: DripStageSchedule) {
  const unit = stage.delay === 1 ? stage.delayUnit.replace(/s$/, "") : stage.delayUnit;
  return `+${stage.delay} ${unit}${stage.sendAtTime ? ` · ${stage.sendAtTime}` : ""}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * When a drip's stages go out — the one already sent, and the one coming.
 *
 * The drip counterpart to `NextBatchCard`. A broadcast books a `CampaignSend`
 * carrying a `scheduledFor` that the card reads; a drip books nothing, because
 * `processDripCampaigns` works out each stage's moment as it ticks. So the
 * Overview's "next batch" card was simply absent on every drip.
 *
 * The whole sequence is always listed, not just what is next. A drip whose
 * stages have all gone out has no forecast to show, and a card that rendered
 * only a forecast went blank on exactly the campaigns whose history someone
 * wants — "when did stage 2 actually fire" is the same question one step later.
 *
 * Dates come from the API rather than from `startedAt` plus the delays, because
 * that arithmetic is wrong for anyone who joined late: their clock starts when
 * they were enrolled, not when the campaign was.
 */
export function DripScheduleCard({
  schedule,
  isLoading,
}: Readonly<{ schedule: DripSchedule | undefined; isLoading: boolean }>) {
  const { t } = useTranslation("campaign.details");

  if (isLoading) return <Skeleton className="h-44 w-full rounded-xl" />;
  if (!schedule || schedule.stages.length === 0) return null;

  const { next } = schedule;
  const done = schedule.stages.filter((stage) => stage.pending === 0).length;

  return (
    <div className="bg-card ring-foreground/10 overflow-hidden rounded-xl shadow-xs ring-1">
      <div className="border-border flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <IconClock className="text-muted-foreground size-4" aria-hidden />
          <span className="font-display text-[15px] font-semibold">
            {next ? t("Next stage") : t("Drip schedule")}
          </span>
        </div>
        {!schedule.running ? (
          <Badge variant="secondary">
            <IconPlayerPause aria-hidden />
            {t("Paused")}
          </Badge>
        ) : next?.overdue ? (
          <Badge variant="secondary">{t("Sending")}</Badge>
        ) : next ? (
          <Badge variant="secondary">{t("Scheduled")}</Badge>
        ) : (
          <Badge variant="secondary">
            <IconCheck aria-hidden />
            {t("All stages sent")}
          </Badge>
        )}
      </div>

      {next ? (
        <div className="grid grid-cols-3 gap-4 px-5 py-4.5">
          <Detail
            label={t("Stage")}
            value={t("Stage {number} of {total}", {
              number: next.position,
              total: schedule.stages.length,
            })}
          >
            {next.templateName ?? t("No template")}
          </Detail>
          <Detail
            label={t("Sends")}
            value={
              next.nextDueAt
                ? next.overdue
                  ? t("Due now")
                  : formatDate(next.nextDueAt)
                : t("Not scheduled")
            }
          >
            {/* A paused drip's dates are real but inert, and "in 3 days" beside a
                campaign nobody is going to send would be a lie of omission. */}
            {!schedule.running
              ? t("Resume the campaign to send it")
              : next.nextDueAt && !next.overdue
                ? untilLabel(next.nextDueAt, t)
                : t("On the next check")}
          </Detail>
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground/70 text-[11.5px]">{t("Recipients")}</span>
            <span className="font-display text-xl leading-tight font-bold tabular-nums">
              {next.pending.toLocaleString()}
            </span>
            <span className="text-muted-foreground text-xs">{t("still waiting on it")}</span>
          </div>
        </div>
      ) : (
        <div className="px-5 py-4.5">
          <span className="text-[13px]">
            {t("All {count} stages have gone out. Nothing further is scheduled.", {
              count: schedule.stages.length,
            })}
          </span>
        </div>
      )}

      {/* Every stage, always — the shape of the sequence is the point of a drip,
          and the dates below are what someone came to the card for whether they
          are still ahead or already behind. */}
      <div className="border-border flex flex-col border-t">
        {schedule.stages.map((stage) => {
          const isNext = stage.dripStageId === next?.dripStageId;
          return (
            <div
              key={stage.dripStageId}
              className={cn(
                "flex items-center justify-between gap-3 px-5 py-2.5 text-[12.5px]",
                isNext && "bg-muted/50",
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="text-muted-foreground/70 w-16 shrink-0">
                  {t("Stage {number}", { number: stage.position })}
                </span>
                <span className="truncate font-medium">
                  {stage.templateName ?? t("No template")}
                </span>
                <span className="text-muted-foreground/70 shrink-0 tabular-nums">
                  {delayLabel(stage)}
                </span>
              </span>

              <span className="flex shrink-0 items-center gap-2 tabular-nums">
                {stage.pending > 0 ? (
                  <>
                    <span className="text-muted-foreground/70">
                      {t("{count} waiting", { count: stage.pending.toLocaleString() })}
                    </span>
                    <span className={cn(isNext ? "font-medium" : "text-muted-foreground")}>
                      {stage.nextDueAt
                        ? stage.overdue
                          ? t("Due now")
                          : formatDate(stage.nextDueAt)
                        : t("Not scheduled")}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground/70">
                      {t("{count} sent", { count: stage.sent.toLocaleString() })}
                    </span>
                    {/* A stage with no recipients at all has never run and has no
                        date to show — saying "Sent" there would be a claim. */}
                    <span className="text-muted-foreground">
                      {stage.lastSentAt
                        ? formatDate(stage.lastSentAt)
                        : stage.sent > 0
                          ? t("Sent")
                          : t("No recipients")}
                    </span>
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {done > 0 && next ? (
        <div className="border-border text-muted-foreground/70 border-t px-5 py-2.5 text-xs">
          {t("{done} of {total} stages complete", { done, total: schedule.stages.length })}
        </div>
      ) : null}
    </div>
  );
}
