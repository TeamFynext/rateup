import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import dayjs from "dayjs";
import {
  Activity,
  Award,
  BarChart,
  FileText,
  Filter,
  LineChart,
  RefreshCcw,
  Send,
} from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AuditLogs } from "@/components/dashboard/analytics/audit-log/AuditLogs.tsx";
import { Button } from "@/components/ui/button.tsx";

import { PageHeaderCard } from "./AnalyticsStaticCard.tsx";
import ApiAnalytics from "./ApiAnalytics.tsx";
import ConversationStatsAgentPerformance from "./ConversationStatsAgentPerformance.tsx";
import ConversationStatsOverview from "./ConversationStatsOverview.tsx";
import DateRangeSelector from "./DateRangeSelector.tsx";
import MessageLogs from "./MessageLogs.tsx";
import TeamPerformance from "./TeamPerformance.tsx";

const Analytics = () => {
  const searchParams = useSearch({ strict: false });
  const tab = searchParams.tab ?? "overview";
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState({
    key: "last7days",
    range: [dayjs().subtract(7, "day").toDate(), new Date()],
  });
  const overviewRef = useRef<HTMLDivElement>(null);
  const agentRef = useRef<HTMLDivElement>(null);
  const teamRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const isExportable = ["overview", "agent-performance", "team-performance"].includes(tab);

  const handleExport = async () => {
    const generatePDF = (await import("react-to-pdf")).default;
    try {
      if (tab === "overview" && overviewRef.current) {
        await generatePDF(() => overviewRef.current, {
          filename: `analytics-overview-${dateRange.key}.pdf`,
        });
      } else if (tab === "agent-performance" && agentRef.current) {
        await generatePDF(() => agentRef.current, {
          filename: `analytics-agent-${dateRange.key}.pdf`,
        });
      } else if (tab === "team-performance" && teamRef.current) {
        await generatePDF(() => teamRef.current, {
          filename: `analytics-team-${dateRange.key}.pdf`,
        });
      } else {
        toast.error(t("Export not supported for this tab"));
      }
    } catch (err) {
      console.error(err);
      toast.error(t("Failed to export PDF"));
    }
  };

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
  const headerConfigMap = {
    overview: {
      title: t("Overview"),
      description: t("Real-time overview of your team performance and activities"),
      icon: <BarChart className="w-4 h-4 text-white" />,
    },

    "agent-performance": {
      title: t("Agent Performance"),
      description: t("Track individual agent metrics, response times, and customer satisfaction"),
      icon: <Award className="w-4 h-4 text-white" />,
    },

    "team-performance": {
      title: t("Team Performance"),
      description: t("Monitor team-level statistics, collaboration, and productivity"),
      icon: <Activity className="w-4 h-4 text-white" />,
    },

    "api-analytics": {
      title: t("API Analytics"),
      description: t("Analyze API usage, request patterns, and integration performance"),
      icon: <LineChart className="w-4 h-4 text-white" />,
    },

    "message-logs": {
      title: t("Message Logs"),
      description: t("Complete history of all messages sent via API, Inbox, and Campaigns"),
      icon: <Send className="w-4 h-4 text-white" />,
    },

    "team-activity": {
      title: t("Team Activity"),
      description: t("View detailed activity logs and actions performed by team members"),
      icon: <FileText className="w-4 h-4 text-white" />,
    },
  };
  const headerConfig =
    headerConfigMap[tab as keyof typeof headerConfigMap] || headerConfigMap["overview"];

  return (
    <>
      <div className="p-4 flex flex-col gap-4 w-full">
        <PageHeaderCard
          title={headerConfig.title}
          description={headerConfig.description}
          icon={headerConfig.icon}
          actions={
            <>
              <Button
                variant="ghost"
                className="w-full sm:w-auto justify-center"
                onClick={() => refresh()}
              >
                <RefreshCcw className={`${isFetching ? "animate-spin" : ""} mr-1`} />
                {t("Refresh")}
              </Button>

              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs sm:text-sm text-muted-foreground flex gap-1 items-center">
                  <Filter className="w-3 h-3" />
                  {t("Filter by")}:
                </span>
                <DateRangeSelector value={dateRange} onChange={setDateRange} />
              </div>

              {isExportable && (
                <Button
                  variant="outline"
                  className="w-full sm:w-auto justify-center ml-2"
                  onClick={handleExport}
                >
                  <FileText className="mr-1" />
                  {t("Export")}
                </Button>
              )}
            </>
          }
        />

        <div>
          {tab === "overview" && (
            <div ref={overviewRef}>
              <ConversationStatsOverview dateRange={dateRange} />
            </div>
          )}

          {tab === "agent-performance" && (
            <div ref={agentRef}>
              <ConversationStatsAgentPerformance dateRange={dateRange} />
            </div>
          )}

          {tab === "team-performance" && (
            <div ref={teamRef}>
              <TeamPerformance dateRange={dateRange} />
            </div>
          )}
          {tab === "api-analytics" && <ApiAnalytics dateRange={dateRange} />}
          {tab === "message-logs" && <MessageLogs dateRange={dateRange} />}
          {tab === "team-activity" && <AuditLogs />}
        </div>
      </div>
    </>
  );
};

export default Analytics;
