"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { BarChart, Filter, RefreshCcw } from "lucide-react";
import { useExtracted } from "next-intl";

import AuditLogs from "@/app/dashboard/analytics/audit-log/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import ApiAnalytics from "./ApiAnalytics";
import ConversationStatsAgentPerformance from "./ConversationStatsAgentPerformance";
import ConversationStatsOverview from "./ConversationStatsOverview";
import DateRangeSelector from "./DateRangeSelector";
import MessageLogs from "./MessageLogs";
import TeamPerformance from "./TeamPerformance";

const Analytics = () => {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "overview";
  const t = useExtracted();
  const [dateRange, setDateRange] = useState({
    key: "last7days",
    range: [dayjs().subtract(7, "day").toDate(), new Date()],
  });
  const queryClient = useQueryClient();

  function refresh() {
    queries.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  }

  const queries = [
    ["conversationOverview"],
    ["conversationAverageResponseTime"],
    ["ConversationAccountDistribution"],
    ["ConversationQuickStats"],
    ["StaffPerformanceonConversation"],
    ["StaffDetailedConversationAnalytics"],
    ["analyticsapiOverview"],
    ["deliveredfailedtrend"],
    ["templateapioverview"],
    ["teamapioverview"],
    ["wa-message-logs"],
  ];

  const fetchCounts = queries.map((key) => useIsFetching({ queryKey: key }));

  const isFetching = fetchCounts.some((count) => count > 0);

  return (
    <>
      {tab !== "team-activity" && (
        <div className="p-4 flex flex-col gap-4 w-full">
          <Card
            className="flex flex-col gap-4 p-4 w-full shadow-sm border-2
                 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex gap-2 items-center">
              <div className="w-8 h-8 bg-primary rounded-lg items-center justify-center shrink-0 hidden sm:flex">
                <BarChart className="w-4 h-4 text-white" />
              </div>

              <div className="flex flex-col">
                <h2 className="text-base sm:text-lg">{t("Dashboard")}</h2>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  {t(
                    "Real-time overview of your team performance and activities",
                  )}
                </p>
              </div>
            </div>

            <div
              className="flex flex-col gap-3
                  sm:flex-row sm:items-center sm:gap-2"
            >
              <Button
                variant="ghost"
                className="w-full sm:w-auto justify-center"
                onClick={() => refresh()}
              >
                <RefreshCcw
                  className={`${isFetching ? "animate-spin" : ""} mr-1`}
                />
                {t("Refresh")}
              </Button>

              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs sm:text-sm text-muted-foreground flex gap-1 items-center">
                  <Filter className="w-3 h-3" />
                  {t("Filter by")}:
                </span>
                <DateRangeSelector value={dateRange} onChange={setDateRange} />
              </div>
            </div>
          </Card>

          <div>
            {tab === "overview" && (
              <ConversationStatsOverview dateRange={dateRange} />
            )}
            {tab === "agent-performance" && (
              <ConversationStatsAgentPerformance dateRange={dateRange} />
            )}
            {tab === "team-performance" && (
              <TeamPerformance dateRange={dateRange} />
            )}
            {tab === "api-analytics" && <ApiAnalytics dateRange={dateRange} />}
            {tab === "message-logs" && <MessageLogs dateRange={dateRange} />}
          </div>
        </div>
      )}
      {tab === "team-activity" && <AuditLogs />}
    </>
  );
};

export default Analytics;
