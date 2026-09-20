import { IconFileTypePdf, IconLoader2, IconRefresh } from "@tabler/icons-react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { endFreshAnalytics, requestFreshAnalytics } from "@/backend/analytics/analyticsFilter";
import { analyticsKeys } from "@/backend/org/org.keys";
import { ApiSelector } from "@/components/apiAnalytics/APISelector.tsx";
import { TeamSelector } from "@/components/input/TeamSelector.tsx";
import { Button } from "@/components/ui/button.tsx";
import DateRangeSelector from "@/components/whatsapp/inbox/analytics/DateRangeSelector.tsx";
import { cn } from "@/lib/utils";

import { AnalyticsToolbar } from "./AnalyticsHeader.tsx";
import type { AnalyticsFilters } from "./filters.ts";

const isAnalyticsQuery = (query: { queryKey: readonly unknown[] }) =>
  (analyticsKeys.roots() as readonly unknown[]).includes(query.queryKey[0]);

/**
 * The one set of filters for the whole section. Controls a view cannot honour are
 * hidden rather than shown and ignored, and a view with none says so instead.
 */
export function AnalyticsFilterBar({
  filters,
  onChange,
  show,
  onExportPdf,
  isExporting = false,
}: Readonly<{
  filters: AnalyticsFilters;
  onChange: (filters: AnalyticsFilters) => void;
  show: { dateRange: boolean; team: boolean; channelType: boolean };
  /** Builds a report from the data; absent on views that have nothing to report. */
  onExportPdf?: () => void;
  isExporting?: boolean;
}>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  // One subscription with a predicate, so the spinner covers every analytics query.
  const isFetching = useIsFetching({ predicate: isAnalyticsQuery }) > 0;

  function refresh() {
    // The server caches these numbers for a minute or so; Refresh wants the database's answer.
    requestFreshAnalytics();
    queryClient
      .invalidateQueries({ predicate: isAnalyticsQuery, refetchType: "all" })
      .finally(endFreshAnalytics);
  }

  const hasFilters = show.dateRange || show.team || show.channelType;

  return (
    <AnalyticsToolbar>
      {show.dateRange && (
        <DateRangeSelector
          value={filters.dateRange}
          onChange={(dateRange) => onChange({ ...filters, dateRange })}
        />
      )}
      {show.team && (
        <TeamSelector
          value={filters.teamId}
          onChange={(teamId) => onChange({ ...filters, teamId: teamId || "all" })}
          enableAll
          className="w-full sm:w-48"
        />
      )}
      {show.channelType && (
        <ApiSelector
          value={filters.apiType}
          onChange={(apiType) => onChange({ ...filters, apiType: apiType || "all" })}
          className="w-full sm:w-48"
        />
      )}
      {!hasFilters && (
        <span className="text-sm text-muted-foreground">
          {t("Shows all activity, newest first")}
        </span>
      )}
      <div className="ms-auto flex items-center gap-2">
        <Button variant="ghost" onClick={refresh} disabled={isFetching}>
          <IconRefresh className={cn(isFetching && "animate-spin")} />
          {t("Refresh")}
        </Button>
        {onExportPdf && (
          <Button variant="outline" onClick={onExportPdf} disabled={isExporting}>
            {isExporting ? <IconLoader2 className="animate-spin" /> : <IconFileTypePdf />}
            {isExporting ? t("Preparing report…") : t("PDF report")}
          </Button>
        )}
      </div>
    </AnalyticsToolbar>
  );
}
