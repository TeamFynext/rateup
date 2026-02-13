import { useState } from "react";

import dayjs from "dayjs";
import isToday from "dayjs/plugin/isToday";
import { CheckCircle2, Send, XCircle, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  useGetApiAnlayticsOverview,
  useGetDeliveredFailedTrend,
  useGetTeamApiOverview,
  useGetTemplateOverview,
} from "@/backend/apiAnalytics/apianalytics.query";
import { ApiSelector } from "@/components/apiAnalytics/APISelector";
import ChartOverview, {
  DailyTrend,
} from "@/components/apiAnalytics/ChartOverview";
import OverviewCard from "@/components/apiAnalytics/OverviewCard";
import TeamOverview from "@/components/apiAnalytics/TeamOverview";
import TemplateOverview from "@/components/apiAnalytics/TemplateOverview";
import { TeamSelector } from "@/components/input/TeamSelector";
import { Skeleton } from "@/components/ui/skeleton";

dayjs.extend(isToday);

const formatTime = (time) => {
  const d = dayjs(time);

  if (d.isToday()) {
    return d.format("hh:mm A");
  } else {
    return d.format("DD MMM, hh:mm A");
  }
};

function ApiAnalytics({ dateRange }) {
  const t = useTranslations("apianalytics");
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [granularity, setGranularity] = useState("hour");
  const [apiType, setApiType] = useState("all");
  const { data: teamData, isLoading: isTeamDataLoading } =
    useGetTeamApiOverview({
      dateKey: dateRange.key,
      dateRange: dateRange.range,
      apiType: apiType,
    });
  const { data, isLoading } = useGetApiAnlayticsOverview({
    dateKey: dateRange.key,
    dateRange: dateRange.range,
    teamId: selectedTeamId,
    apiType: apiType,
  });
  const { data: trend, isLoading: isTrendLoading } = useGetDeliveredFailedTrend(
    {
      dateKey: dateRange.key,
      dateRange: dateRange.range,
      teamId: selectedTeamId,
      granularity: granularity,
      apiType: apiType,
    },
  );

  const { data: templates, isLoading: isTemplateLoading } =
    useGetTemplateOverview({
      dateKey: dateRange.key,
      dateRange: dateRange.range,
      teamId: selectedTeamId,
      apiType: apiType,
    });

  const localTrend = trend?.trend.map((item) => ({
    ...item,
    time: formatTime(item.time),
  }));

  const localWeekTrend = trend?.weekTrend.map((item) => ({
    ...item,
    day: dayjs(item.time).format("ddd, DD MMM"),
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl">{t("WhatsApp Messages Analytics")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("Detailed analytics of WhatsApp messages sent")}
          </p>
        </div>
        <div className="flex md:flex-col lg:flex-row items-center justify-center gap-4 lg:min-w-md">
          <ApiSelector
            value={apiType}
            onChange={(value) => setApiType(value)}
            className="w-full"
          />
          <TeamSelector
            value={selectedTeamId}
            onChange={(teamId) => setSelectedTeamId(teamId)}
            enableAll={true}
            className="w-full"
          />
        </div>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="border rounded-lg p-4 shadow-sm space-y-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <OverviewCard
            value={data?.totalMessages ?? 0}
            title={t("Total Messages Sent")}
            bg={"bg-blue-50"}
            iconColor={"text-blue-500"}
            Icon={Send}
            trendLogoRequired={true}
            trendValue={data?.totalMessagesChange}
          />
          <OverviewCard
            value={data?.deliveredMessages ?? 0}
            title={t("Successful Delivery")}
            bg={"bg-green-50"}
            iconColor={"text-green-500"}
            Icon={CheckCircle2}
            trendLogoRequired={false}
            trendValue={data?.deliveredPercentage}
          />
          <OverviewCard
            value={data?.failedMessages ?? 0}
            title={t("Failed Messages")}
            bg={"bg-red-50"}
            iconColor={"text-red-500"}
            Icon={XCircle}
            trendLogoRequired={false}
            trendValue={data?.failedPercentage}
          />
          <OverviewCard
            value={
              data?.avgDeliveryTimeSeconds
                ? `${data?.avgDeliveryTimeSeconds}s`
                : "NA"
            }
            title={t("Avg Delivery Time")}
            bg={"bg-purple-50"}
            iconColor={"text-purple-500"}
            Icon={Zap}
            trendLogoRequired={true}
            trendValue={data?.averageDeliveryTimeChange}
          />
        </div>
      )}

      <ChartOverview messageTrendData={localTrend} isLoading={isTrendLoading} />
      <DailyTrend
        dailyMessageData={localWeekTrend}
        isLoading={isTrendLoading}
      />
      <TemplateOverview
        categoryOverview={templates?.categoryOverview?.byCategory}
        templatePerformance={templates?.templatePerformance}
        isLoading={isTemplateLoading}
      />
      <TeamOverview teamData={teamData} isLoading={isTeamDataLoading} />
    </div>
  );
}

export default ApiAnalytics;
