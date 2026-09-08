import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  useCampaignAnalytics,
  useCampaignRetryPolicy,
  useCampaignSends,
  useCancelPendingRetriesMutation,
  useSendCampaign,
} from "@/backend/campaign/campaign.query";
import {
  CampaignParticipantStatus,
  CampaignSendStatus,
  CampaignSendTrigger,
  CampaignStatus,
  SentCampaignChoice,
} from "@/types/enums.ts";
import type { Campaign } from "@/types/global";

import { CampaignActivity } from "./CampaignActivity.tsx";
import type { CampaignMetric } from "./CampaignMetrics.tsx";
import { CampaignMetrics } from "./CampaignMetrics.tsx";
import { CampaignSetupCard } from "./CampaignSetupCard.tsx";
import { NextBatchCard } from "./NextBatchCard.tsx";

/**
 * The campaign detail page's Overview tab: the five headline numbers, the
 * attempt that has not run yet, what has happened so far, and how the campaign
 * was set up.
 */
export function CampaignOverviewTab({ campaign }: Readonly<{ campaign: Campaign }>) {
  const { t } = useTranslation("campaign.details");
  const campaignId = campaign.id;

  const sends = useCampaignSends(campaignId);
  const live =
    sends.data?.some((send) =>
      [
        CampaignSendStatus.SCHEDULED,
        CampaignSendStatus.QUEUING,
        CampaignSendStatus.RUNNING,
      ].includes(send.status),
    ) ?? false;

  const analytics = useCampaignAnalytics(campaignId, live);
  const { data: policy } = useCampaignRetryPolicy(campaignId);
  const cancelRetries = useCancelPendingRetriesMutation(campaignId);
  const sendCampaign = useSendCampaign(campaignId, campaign.teamId);

  // The send that has not gone out yet, whichever kind it is.
  //
  // The two kinds are recognised differently, because a scheduled campaign does
  // not sit and wait: `enqueueCampaignMessages` fans it out immediately and puts
  // the delay on each per-message job, so its row is RUNNING with a `startedAt`
  // from weeks before anything is sent. Its own status says nothing about whether
  // it is still upcoming — `scheduledFor` does. A booked retry is the opposite: it
  // stays SCHEDULED until the moment it fires, so its status is the test.
  const pending = sends.data?.find((send) => {
    if (!send.scheduledFor) return false;
    if (send.status === CampaignSendStatus.SCHEDULED) return true;
    if (send.status !== CampaignSendStatus.QUEUING && send.status !== CampaignSendStatus.RUNNING) {
      return false;
    }
    return new Date(send.scheduledFor).getTime() > Date.now();
  });
  const isPendingRetry = pending?.trigger === CampaignSendTrigger.AUTO_RETRY;

  // What a retry would take if it fired now. `totalTargeted` is only written at
  // fire time, so the card would otherwise read "0 eligible" for every booked retry.
  const eligible =
    analytics.data?.failures.reduce((total, row) => total + row.retryableCount, 0) ?? null;

  const metrics = useMemo<CampaignMetric[]>(() => {
    const funnel = analytics.data?.funnel ?? [];
    const at = (key: string) => funnel.find((stage) => stage.key === key);
    const attempted = at("attempted");
    const sent = at("sent");
    const delivered = at("delivered");
    const read = at("read");

    // Where recipients stand now, not how many messages ever failed: `totalFailed`
    // counts one per attempt, so a recipient a retry recovered stays in it forever.
    const attemptedCount = attempted?.count ?? 0;
    const failed = analytics.data?.activeFailed ?? 0;
    const pendingCount = analytics.data?.activePending ?? 0;

    return [
      {
        // Not "Sent": the counter behind it is bumped for every message handed to
        // Meta, a rejected one included, so it is what went out rather than what
        // landed. "Delivered" below is the one that means success.
        label: t("Dispatched"),
        value: sent?.count ?? 0,
        rate: sent?.rateOfPrevious ?? null,
        sub: "of recipients",
        tone: "neutral",
      },
      {
        label: t("Delivered"),
        value: delivered?.count ?? 0,
        rate: delivered?.rateOfPrevious ?? null,
        sub: "of dispatched",
        tone: "good",
      },
      {
        label: t("Read"),
        value: read?.count ?? 0,
        rate: read?.rateOfPrevious ?? null,
        sub: "of delivered",
        tone: "good",
      },
      {
        label: t("Pending"),
        value: pendingCount,
        rate: attemptedCount ? pendingCount / attemptedCount : null,
        sub: "of recipients",
        tone: "neutral",
      },
      {
        label: t("Failed"),
        value: failed,
        rate: attemptedCount ? failed / attemptedCount : null,
        sub: "of recipients",
        tone: "bad",
      },
      // `replied` is folded into the Replies card rather than a sixth tile — the
      // design's row is five wide, and a reply is a conversation, not a delivery
      // state.
    ];
  }, [analytics.data, t]);

  // The schema requires at least one status, and the INACTIVE path ignores them
  // entirely — PENDING is the honest fallback for a send that recorded none.
  const pendingStatuses = (
    pending?.targetStatuses?.length ? pending.targetStatuses : [CampaignParticipantStatus.PENDING]
  ) as CampaignParticipantStatus[];

  const replied = analytics.data?.funnel.find((stage) => stage.key === "replied")?.count ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <CampaignMetrics metrics={metrics} isLoading={analytics.isLoading} />

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-4">
          <NextBatchCard
            send={pending}
            policy={policy}
            recipients={campaign.campaignParticipantsCount ?? 0}
            eligible={eligible}
            isCancelling={cancelRetries.isPending || sendCampaign.isPending}
            isRetrying={sendCampaign.isPending}
            onCancel={() =>
              isPendingRetry
                ? cancelRetries.mutate()
                : // Unscheduling a campaign is the same operation as stopping one:
                  // INACTIVE takes it off the schedule and dequeues what was booked.
                  sendCampaign.mutate({
                    status: CampaignStatus.INACTIVE,
                    statuses: pendingStatuses,
                    sentCampaignChoice: SentCampaignChoice.NOW,
                    type: campaign.type,
                  })
            }
            onRetryNow={() =>
              sendCampaign.mutate({
                statuses: [CampaignParticipantStatus.FAILED],
                sentCampaignChoice: SentCampaignChoice.NOW,
                status: CampaignStatus.ACTIVE,
                type: campaign.type,
              })
            }
          />
          <CampaignActivity sends={sends.data} />
        </div>

        <div className="flex flex-col gap-4">
          <CampaignSetupCard
            campaign={campaign}
            recipients={campaign.campaignParticipantsCount ?? 0}
            policy={policy}
          />
          <div className="bg-card ring-foreground/10 flex flex-col gap-2.5 rounded-xl px-5 py-4.5 shadow-xs ring-1">
            <span className="font-display text-[15px] font-semibold">{t("Replies")}</span>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold tracking-tight tabular-nums">
                {replied.toLocaleString()}
              </span>
              <span className="text-muted-foreground text-[13px]">
                {t("conversations started")}
              </span>
            </div>
            <span className="text-muted-foreground text-[12.5px] leading-relaxed">
              {t("Replies land in the inbox, assigned to the campaign's team.")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
