import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useCampaignAnalytics,
  useCampaignRetryPolicy,
  useCampaignSendParticipants,
  useCampaignSends,
  useCancelPendingRetriesMutation,
} from "@/backend/campaign/campaign.query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { CampaignParticipantStatus, CampaignSendStatus } from "@/types/enums.ts";
import type { CampaignSend } from "@/types/global";

import { DeliveryFunnel } from "./DeliveryFunnel.tsx";
import { FailureBreakdown } from "./FailureBreakdown.tsx";
import { SendAttemptsTable } from "./SendAttemptsTable.tsx";

/**
 * The campaign detail page's Analytics tab: the delivery funnel, why messages
 * failed, and one row per send attempt.
 */
export function CampaignAnalyticsTab({ campaignId }: Readonly<{ campaignId: string }>) {
  const [drillDown, setDrillDown] = useState<{ send: CampaignSend; failedOnly: boolean } | null>(
    null,
  );

  const sendsQuery = useCampaignSends(campaignId);
  // Polled only while something is actually moving: a finished campaign's
  // numbers do not change, and the detail page can sit open for a long time.
  const live =
    sendsQuery.data?.some((send) =>
      [
        CampaignSendStatus.SCHEDULED,
        CampaignSendStatus.QUEUING,
        CampaignSendStatus.RUNNING,
      ].includes(send.status),
    ) ?? false;

  const sends = useCampaignSends(campaignId, live);
  const analytics = useCampaignAnalytics(campaignId, live);
  const cancelRetries = useCancelPendingRetriesMutation(campaignId);
  const { data: retryPolicy } = useCampaignRetryPolicy(campaignId);

  const latestSend = sends.data?.at(-1);

  return (
    <div className="flex flex-col gap-3.5">
      {/* The design's split: the funnel is five short rows, the breakdown is a
          table, so the breakdown gets the wider column. */}
      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[0.85fr_1.45fr]">
        <DeliveryFunnel funnel={analytics.data?.funnel} isLoading={analytics.isLoading} />
        <FailureBreakdown
          failures={analytics.data?.failures}
          totalFailed={analytics.data?.totalFailed ?? 0}
          isLoading={analytics.isLoading}
          onDrillDown={
            latestSend ? () => setDrillDown({ send: latestSend, failedOnly: true }) : undefined
          }
        />
      </div>

      <SendAttemptsTable
        sends={sends.data}
        isLoading={sends.isLoading}
        retriesEnabled={retryPolicy?.enabled ?? false}
        onCancelRetries={() => cancelRetries.mutate()}
        isCancelling={cancelRetries.isPending}
        onSelectSend={(send) => setDrillDown({ send, failedOnly: false })}
      />

      <SendParticipantsSheet
        campaignId={campaignId}
        drillDown={drillDown}
        onClose={() => setDrillDown(null)}
      />
    </div>
  );
}

/** Who a single attempt reached, and what Meta said about each of them. */
function SendParticipantsSheet({
  campaignId,
  drillDown,
  onClose,
}: Readonly<{
  campaignId: string;
  drillDown: { send: CampaignSend; failedOnly: boolean } | null;
  onClose: () => void;
}>) {
  const { t } = useTranslation("campaign.analytics");
  const { data, isLoading } = useCampaignSendParticipants(
    campaignId,
    drillDown?.send.id ?? null,
    drillDown?.failedOnly ? { status: CampaignParticipantStatus.FAILED } : {},
  );

  return (
    <Sheet open={Boolean(drillDown)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{drillDown?.send.label ?? t("Attempt")}</SheetTitle>
          <SheetDescription>
            {drillDown?.failedOnly
              ? t("Recipients this attempt could not reach.")
              : t("Everyone this attempt went out to.")}
          </SheetDescription>
        </SheetHeader>

        {/* flex-1 min-h-0 is what actually makes this scroll inside the sheet. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !data?.participants.length ? (
            <p className="text-muted-foreground py-8 text-center text-[13px]">
              {t("Nothing to show for this attempt.")}
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {data.participants.map((participant) => (
                <li key={participant.participantId} className="flex flex-col gap-0.5 py-2.5">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-medium">
                      {participant.name || participant.phone || t("Unknown contact")}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-[11.5px]">
                      {participant.status}
                    </span>
                  </span>
                  {participant.errorLabel ? (
                    <span className="text-muted-foreground text-[11.5px]">
                      {participant.errorLabel}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {data && data.total > data.participants.length ? (
            <p className="text-muted-foreground pt-3 text-center text-[11.5px]">
              {t("Showing {shown} of {total}.", {
                shown: data.participants.length,
                total: data.total,
              })}
            </p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
