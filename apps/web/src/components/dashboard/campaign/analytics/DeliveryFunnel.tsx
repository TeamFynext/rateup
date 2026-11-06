import { IconCornerDownRight } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import type { CampaignFunnelStage } from "@/types/global";

/** Bars step down the brand ramp, so the funnel reads as one falling sequence. */
const STAGE_BAR = [
  "bg-ru-blue-600",
  "bg-ru-blue-500",
  "bg-ru-blue-400",
  "bg-ru-blue-300",
  "bg-ru-blue-200",
] as const;

const percent = (value: number | null) =>
  value === null ? "—" : `${(value * 100).toFixed(value >= 0.995 || value === 0 ? 0 : 1)}%`;

/**
 * Dispatched → Delivered → Read → Replied, measured against what was attempted.
 *
 * Bars rather than a recharts chart on purpose: a funnel is five values whose
 * only interesting relationship is "what fraction of the row above", and a
 * cartesian chart would add axes, a legend and a tooltip to say less. The
 * drop-off between stages is the number people actually act on, so it gets its
 * own line instead of being left to be inferred from two bar lengths.
 */
export function DeliveryFunnel({
  funnel,
  isLoading,
}: Readonly<{ funnel: CampaignFunnelStage[] | undefined; isLoading: boolean }>) {
  const { t } = useTranslation("campaign.analytics");
  const attempted = funnel?.[0]?.count ?? 0;

  return (
    <div className="bg-card ring-foreground/10 flex flex-col gap-2.5 rounded-xl px-5 pt-4 pb-3.5 shadow-xs ring-1">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-display text-[15px] font-semibold">{t("Delivery funnel")}</span>
          <span className="text-muted-foreground text-[12.5px]">
            {t("All attempts combined · rates against {count} attempted", {
              count: attempted.toLocaleString(),
            })}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2 py-2">
          <Skeleton className="h-6.5 w-full" />
          <Skeleton className="h-6.5 w-full" />
          <Skeleton className="h-6.5 w-full" />
        </div>
      ) : !funnel?.length || attempted === 0 ? (
        <Empty className="py-10">
          <EmptyHeader>
            <EmptyDescription>{t("Nothing has been sent yet.")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-[70px_1fr_132px] items-center gap-x-3">
          {/* Attempted is the base, not a stage: its bar is 100% by definition
              and its "0 dropped off here" says nothing. The number itself is in
              the subtitle, where the rates are already declared against it, and
              every row below still measures against it. */}
          {funnel.slice(1).map((stage, index) => {
            const previous = funnel[index];
            const dropped = previous.count - stage.count;
            return (
              <div key={stage.key} className="contents">
                <span className="text-secondary-foreground flex h-6.5 items-center justify-end text-right text-[12.5px]">
                  {stage.label}
                </span>
                {/* The baseline tick is what makes short bars still legible as
                    "a small share of the row above" rather than as nothing. */}
                <span className="relative flex h-6.5 items-center">
                  <span className="bg-input absolute inset-y-0 left-0 w-px" aria-hidden />
                  <span
                    className={`ml-px block h-4 rounded-r-[3px] ${STAGE_BAR[index] ?? STAGE_BAR.at(-1)}`}
                    style={{ width: `${(stage.rateOfAttempted ?? 0) * 100}%` }}
                  />
                </span>
                <span className="flex h-6.5 items-center justify-between gap-2">
                  <span className="font-display text-sm font-semibold tabular-nums">
                    {stage.count.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground text-[12.5px] tabular-nums">
                    {percent(stage.rateOfAttempted)}
                  </span>
                </span>

                {dropped > 0 ? (
                  <>
                    <span />
                    <span className="text-muted-foreground/70 flex h-3.5 items-center gap-1 truncate pl-2 text-[11px] tabular-nums">
                      <IconCornerDownRight className="size-2.5 shrink-0" aria-hidden />
                      {t("{count} dropped off here", { count: dropped.toLocaleString() })}
                    </span>
                    <span />
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
