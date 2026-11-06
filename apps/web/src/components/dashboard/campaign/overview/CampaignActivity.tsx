import { IconActivity } from "@tabler/icons-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { CampaignSendStatus, CampaignSendTrigger } from "@/types/enums.ts";
import type { CampaignSend } from "@/types/global";

interface ActivityEntry {
  at: Date;
  dot: string;
  title: string;
  detail: string;
}

/**
 * What has happened to this campaign, newest first.
 *
 * Built from the `CampaignSend` rows rather than an event log, because the sends
 * already *are* the log: each one records when it started, when it finished, and
 * what it achieved. A separate audit table would be a second source of truth to
 * keep in step.
 */
export function CampaignActivity({ sends }: Readonly<{ sends: CampaignSend[] | undefined }>) {
  const { t } = useTranslation("campaign.details");

  const entries = useMemo<ActivityEntry[]>(() => {
    const out: ActivityEntry[] = [];
    for (const send of sends ?? []) {
      // The server names the send — by what asked for it, and numbering retries
      // per cycle. Rebuilding the label here from `attemptNo` is what made a
      // resumed schedule read "Retry 1" in this feed while the attempts table
      // called it something else.
      const label = send.label;
      const scheduledAhead =
        send.scheduledFor &&
        send.trigger !== CampaignSendTrigger.AUTO_RETRY &&
        new Date(send.scheduledFor).getTime() > Date.now();

      // A scheduled campaign fans out the moment it is booked and delays each
      // message, so `startedAt` is stamped weeks before anything is sent. Saying
      // "started" then is wrong; what happened is that it was scheduled.
      if (scheduledAhead && send.scheduledFor) {
        out.push({
          at: new Date(send.startedAt ?? send.scheduledFor),
          dot: "bg-primary/40",
          title: t("{label} scheduled", { label }),
          detail: t("{count} recipients queued for {when}", {
            count: send.totalTargeted.toLocaleString(),
            when: new Date(send.scheduledFor).toLocaleString(undefined, {
              day: "numeric",
              month: "short",
              hour: "numeric",
              minute: "2-digit",
            }),
          }),
        });
      } else if (send.startedAt) {
        out.push({
          at: new Date(send.startedAt),
          dot: "bg-primary",
          title: t("{label} started", { label }),
          detail: t("{count} recipients queued", {
            count: send.totalTargeted.toLocaleString(),
          }),
        });
      }
      if (send.completedAt && send.status === CampaignSendStatus.COMPLETED) {
        out.push({
          at: new Date(send.completedAt),
          dot: send.totalFailed > 0 ? "bg-amber-500" : "bg-green-600",
          title: t("{label} finished", { label }),
          detail:
            send.totalFailed > 0
              ? t("{sent} sent · {failed} failed", {
                  sent: (send.totalSent - send.totalFailed).toLocaleString(),
                  failed: send.totalFailed.toLocaleString(),
                })
              : t("{sent} sent", { sent: send.totalSent.toLocaleString() }),
        });
      }
      if (send.status === CampaignSendStatus.CANCELLED && send.completedAt) {
        out.push({
          at: new Date(send.completedAt),
          dot: "bg-muted-foreground",
          title: t("{label} cancelled", { label }),
          detail: send.note ?? "",
        });
      }
      if (send.status === CampaignSendStatus.SCHEDULED && send.scheduledFor) {
        out.push({
          at: new Date(send.scheduledFor),
          dot: "bg-primary/40",
          title: t("{label} scheduled", { label }),
          detail: send.note ?? "",
        });
      }
    }
    return out.sort((a, b) => b.at.getTime() - a.at.getTime());
  }, [sends, t]);

  return (
    <div className="bg-card ring-foreground/10 overflow-hidden rounded-xl shadow-xs ring-1">
      <div className="border-border flex items-center gap-2 border-b px-5 py-4">
        <IconActivity className="text-muted-foreground size-4" aria-hidden />
        <span className="font-display text-[15px] font-semibold">{t("Activity")}</span>
      </div>
      {/* Capped and scrolled rather than left to grow: every send, retry and pause
          adds entries for the life of the campaign, and the card sits beside the
          Setup panel — an unbounded list pushed the whole column past the fold.
          A plain div carries both the cap and the overflow; `ScrollArea` needs a
          definite height and would just overflow inside this auto-height card. */}
      <div className="flex max-h-88 flex-col overflow-y-auto overscroll-contain px-5 pt-2 pb-3.5">
        {entries.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-[13px]">
            {t("Nothing has happened yet.")}
          </p>
        ) : (
          entries.map((entry, index) => (
            <div
              key={`${entry.title}-${entry.at.toISOString()}-${index}`}
              className="grid grid-cols-[110px_14px_1fr] items-start gap-3 py-2.5"
            >
              <span className="text-muted-foreground pt-px text-[12.5px] tabular-nums">
                {entry.at.toLocaleString(undefined, {
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
              <span className="flex h-full flex-col items-center">
                <span className={cn("mt-1.5 size-2 rounded-full", entry.dot)} aria-hidden />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-[13.5px] font-medium">{entry.title}</span>
                {entry.detail ? (
                  <span className="text-muted-foreground text-[12.5px]">{entry.detail}</span>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
