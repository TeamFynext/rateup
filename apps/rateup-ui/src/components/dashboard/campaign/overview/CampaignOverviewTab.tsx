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

  const pending = sends.data?.find((send) => send.status === CampaignSendStatus.SCHEDULED);

  const metrics = useMemo<CampaignMetric[]>(() => {
    const funnel = analytics.data?.funnel ?? [];
    const at = (key: string) => funnel.find((stage) => stage.key === key);
    const attempted = at("attempted");
    const sent = at("sent");
    const delivered = at("delivered");
    const read = at("read");

    return [
      {
        label: t("Recipients"),
        value: attempted?.count ?? 0,
        rate: null,
        sub: "in this campaign",
        tone: "neutral",
      },
      {
        label: t("Sent"),
        value: sent?.count ?? 0,
        rate: sent?.rateOfPrevious ?? null,
        sub: "of recipients",
        tone: "neutral",
      },
      {
        label: t("Delivered"),
        value: delivered?.count ?? 0,
        rate: delivered?.rateOfPrevious ?? null,
        sub: "of sent",
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
        label: t("Failed"),
        value: analytics.data?.totalFailed ?? 0,
        rate: attempted?.count ? (analytics.data?.totalFailed ?? 0) / attempted.count : null,
        sub: "of recipients",
        tone: "bad",
      },
      // `replied` is folded into the Replies card rather than a sixth tile — the
      // design's row is five wide, and a reply is a conversation, not a delivery
      // state.
    ].filter((_, index) => index < 5) as CampaignMetric[];
  }, [analytics.data, t]);

  const replied = analytics.data?.funnel.find((stage) => stage.key === "replied")?.count ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <CampaignMetrics metrics={metrics} isLoading={analytics.isLoading} />

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-4">
          <NextBatchCard
            send={pending}
            policy={policy}
            isCancelling={cancelRetries.isPending}
            isRetrying={sendCampaign.isPending}
            onCancel={() => cancelRetries.mutate()}
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
