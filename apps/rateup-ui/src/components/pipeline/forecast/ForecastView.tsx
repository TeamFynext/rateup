import { useTranslation } from "react-i18next";

import { Card } from "@/components/ui/card";

import { buildForecast } from "../pipeline.utils.ts";
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
 */
export function ForecastView({ data, onOpenLead }: Readonly<ForecastViewProps>) {
  const { t } = useTranslation();
  const columns = buildForecast(data.visibleLeads);
  const widest = Math.max(1, ...columns.map((column) => column.expected));

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
              className="flex w-[78vw] max-w-72 shrink-0 snap-start flex-col gap-0 py-0 sm:w-72"
            >
              <div className="border-border border-b p-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-nunito text-foreground text-[15px] font-extrabold">
                    {column.unscheduled ? t("Unscheduled") : column.label}
                  </span>
                  <span className="text-muted-foreground text-[11px]">
                    {t("{total} leads", { total: column.leads.length })}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="font-nunito text-primary text-[28px] leading-none font-black">
                    {column.expected}
                  </span>
                  <span className="text-muted-foreground text-[11px]">
                    {t("expected to convert")}
                  </span>
                </div>
                <StageFill percent={Math.round((column.expected / widest) * 100)} color={null} />
              </div>

              <div className="flex flex-col gap-2 p-2.5">
                {column.leads.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => onOpenLead(lead.id)}
                    className="border-border hover:bg-muted/60 flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors"
                  >
                    <LeadAvatar name={lead.name} channel={lead.channel} />
                    <span className="min-w-0 flex-1">
                      <span className="text-foreground block truncate text-xs font-bold">
                        {lead.name}
                      </span>
                      <span className="text-muted-foreground block truncate text-[10px]">
                        {lead.stage.name}
                      </span>
                    </span>
                    <span className="text-primary text-[11px] font-extrabold">
                      {t("{percent}%", { percent: lead.stage.probability })}
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
