import { IconExternalLink } from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  FEEDBACK_PERIODS,
  type FeedbackPeriod,
  type FeedbackState,
} from "@/backend/loyalty/feedback.api.ts";
import { useFeedbackResults } from "@/backend/loyalty/feedback.query.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

import { MetricTiles } from "../overview/MetricTiles.tsx";
import { LOYALTY_PATHS } from "../paths.ts";
import type { FeedbackSearch } from "./feedback.search.ts";
import { buildFeedbackMetricTiles } from "./feedbackMetricTiles.ts";
import { FeedbackRequestsTable } from "./FeedbackRequestsTable.tsx";
import { QuestionAveragesCard } from "./QuestionAveragesCard.tsx";

function periodLabel(t: (key: string) => string, key: FeedbackPeriod): string {
  return key === "30d"
    ? t("Last 30 days")
    : key === "90d"
      ? t("Last 90 days")
      : t("Last 12 months");
}

export function FeedbackResultsTab({
  state,
  search,
}: Readonly<{ state: FeedbackState; search: FeedbackSearch }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const period: FeedbackPeriod = search.period ?? "30d";
  // Days are cut in the browser's zone, like the Overview.
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const { data: results, isPending } = useFeedbackResults(period, tz);

  const tiles = useMemo(() => buildFeedbackMetricTiles(t, results?.metrics), [t, results]);
  const periodItems = FEEDBACK_PERIODS.map((key) => ({ value: key, label: periodLabel(t, key) }));

  const setSearch = (next: Partial<FeedbackSearch>) =>
    navigate({ to: LOYALTY_PATHS.feedback, search: { ...search, tab: "results", ...next } });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          value={period}
          items={periodItems}
          onValueChange={(value) =>
            setSearch({
              period: FEEDBACK_PERIODS.find((key) => key === value),
            })
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periodItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.flow && (
          <Button
            variant="outline"
            size="sm"
            render={
              <Link
                to="/dashboard/whatsapp/flows/v2/$dbFlowId"
                params={{ dbFlowId: state.flow.dbFlowId }}
                search={{ tab: "Responses" }}
              />
            }
          >
            <IconExternalLink size={16} />
            {t("Open every response")}
          </Button>
        )}
      </div>

      <MetricTiles tiles={tiles} isLoading={isPending} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <QuestionAveragesCard averages={results?.questionAverages ?? []} />
        <div className="min-w-0">
          <FeedbackRequestsTable search={search} onSearchChange={setSearch} />
        </div>
      </div>
    </div>
  );
}
