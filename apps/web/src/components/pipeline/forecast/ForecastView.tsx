import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import { usePipelineForecastQuery } from "@/backend/pipeline/pipeline.query.tsx";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { StageFill } from "../shared/atoms.tsx";
import { LeadAvatar } from "../shared/LeadAvatar.tsx";
import type { PipelineData } from "../usePipelineData.ts";

interface ForecastViewProps {
  data: PipelineData;
  onOpenLead: (leadId: string) => void;
}

/**
 * Open leads bucketed by the month they are expected to close. The headline
 * number is the probability-weighted count, not the raw one — five leads at 20%
 * are one expected win, and the column says so.
 *
 * The buckets are counted on the server over every open lead, and each carries a
 * sample of its leads rather than all of them: a forecast is a reading of the
 * months ahead, so the count is the answer and the cards are the evidence.
 */
export function ForecastView({ data, onOpenLead }: Readonly<ForecastViewProps>) {
  const { t } = useTranslation();
  const { data: buckets, isPending } = usePipelineForecastQuery(data.pipeline?.id);
  const columns = buckets ?? [];
  const widest = Math.max(1, ...columns.map((column) => column.expected));

  if (isPending) {
    return (
      <div className="flex min-h-0 flex-1 gap-3.5 overflow-hidden p-4 sm:p-6">
        {[0, 1, 2].map((column) => (
          <Skeleton key={column} className="h-96 w-72.5 shrink-0 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 snap-x snap-mandatory overflow-auto p-4 sm:snap-none sm:p-6">
      <p className="text-muted-foreground mb-4 text-[13px]">
        {t(
          "Open leads grouped by expected close month. Expected conversions weight each lead by its stage probability.",
        )}
      </p>

      {columns.length === 0 ? (
        <Card className="text-muted-foreground p-10 text-center text-sm">
          {t("No open leads to forecast yet.")}
        </Card>
      ) : (
        <div className="flex items-start gap-3.5 pb-2">
          {columns.map((column) => (
            <Card
              key={column.key}
              className="flex w-[78vw] max-w-72.5 shrink-0 snap-start flex-col gap-0 py-0 sm:w-72.5"
            >
              <div className="border-border border-b px-3.75 py-3.5">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-foreground text-[15px] font-semibold">
                    {column.unscheduled
                      ? t("Unscheduled")
                      : dayjs(`${column.key}-01`).format("MMM YYYY")}
                  </span>
                  <span className="text-muted-foreground text-[11px]">
                    {t("{total} leads", { total: column.count })}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="font-display text-primary text-[28px] leading-none font-bold tracking-[-0.02em]">
                    {column.expected}
                  </span>
                  <span className="text-muted-foreground text-[11px]">
                    {t("expected to convert")}
                  </span>
                </div>
                <StageFill
                  percent={Math.round((column.expected / widest) * 100)}
                  color={null}
                  className="mt-2.5 h-1.5"
                />
              </div>

              <div className="flex flex-col gap-2 p-2.5">
                {column.leads.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => onOpenLead(lead.id)}
                    className="border-border hover:border-foreground/20 flex items-center gap-2.25 rounded-lg border px-2.5 py-2.25 text-left transition-all hover:shadow-xs"
                  >
                    <LeadAvatar name={lead.name} source={lead.source} />
                    <span className="min-w-0 flex-1">
                      <span className="text-foreground block truncate text-xs font-bold">
                        {lead.name}
                      </span>
                      <span className="text-muted-foreground block truncate text-[10px]">
                        {lead.stage.name}
                      </span>
                    </span>
                    <span className="text-primary text-[11px] font-bold">
                      {t("{percent}%", { percent: lead.stage.probability })}
                    </span>
                  </button>
                ))}

                {/* The bucket carries a sample, so a busy month says how much of
                    itself is not on screen rather than looking complete. */}
                {column.count > column.leads.length ? (
                  <span className="text-muted-foreground px-1 py-1 text-center text-[11px]">
                    {t("+{more} more", { more: column.count - column.leads.length })}
                  </span>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
