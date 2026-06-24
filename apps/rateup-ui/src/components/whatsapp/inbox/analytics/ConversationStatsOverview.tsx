import {
  CheckCircle2,
  Clock,
  Eye,
  MessageCircle,
  MessageSquare,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  useGetConversationOverView,
  useGetConversationQuickStats,
} from "@/backend/conversation/conversation.query";
import ErrorComponent from "@/components/404/ErrorComponent.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { formatTimeToNearestUnitFromSeconds } from "@/utils/dateTime.ts";

import ConversationAccountDistribution from "./ConversationAccountDistribution.tsx";
import ConversationResponseTimePatternGraph from "./ConversationResponseTimePatternGraph.tsx";
import ConversationTrendsGraph from "./ConversationTrendsGraph.tsx";

const ConversationStatsOverview = ({ dateRange }) => {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch, isRefetching } = useGetConversationOverView({
    dateKey: dateRange.key,
    dateRange: dateRange.range,
  });
  const { data: quickStats } = useGetConversationQuickStats();
  const overviewStats = useMemo(() => {
    return [
      {
        key: "totalConversations",
        label: t("Conversations"),
        color: {
          border: "border-blue-500",
          cardBg: "bg-blue-50",
          hoverShadow: "hover:shadow-blue-300/50",
          text: "text-blue-500",
        },
        icon: MessageCircle,
        suffix: "",
        progressTotal: 1000,
        value: data?.totalConversations,
      },
      {
        key: "averageResponseTime",
        label: t("Response Time"),
        color: {
          border: "border-green-500",
          cardBg: "bg-green-50",
          hoverShadow: "hover:shadow-green-300/50",
          text: "text-green-500",
        },
        icon: Clock,
        suffix: formatTimeToNearestUnitFromSeconds(data?.averageResponseTime)?.suffix,
        progressTotal: 60,
        value: formatTimeToNearestUnitFromSeconds(data?.averageResponseTime)?.value ?? "NA",
      },
      {
        key: "resolutionRate",
        label: t("Resolution Rate"),
        color: {
          border: "border-purple-500",
          cardBg: "bg-purple-50",
          hoverShadow: "hover:shadow-purple-300/50",
          text: "text-purple-500",
        },
        icon: Target,
        suffix: "%",
        progressTotal: 100,
        value: data?.resolutionRate != null ? Number(data.resolutionRate.toFixed(1)) : 0,
      },
    ];
  }, [data, t]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {overviewStats.map((stat) => (
          <Skeleton className="h-[80px]" key={stat.key} />
        ))}
      </div>
    );
  }
  if (error) {
    return <ErrorComponent refetch={refetch} isRefetching={isRefetching} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            {t("Performance Metrics")}
          </CardTitle>
        </CardHeader>
        <CardContent className="">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {overviewStats.map((metric, index) => {
              return (
                <div
                  key={index}
                  className="p-3 sm:p-4 flex flex-col gap-2 rounded-lg border  transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-blue-50 dark:bg-transparent rounded-lg flex items-center justify-center">
                        <metric.icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <p className="text-xs text-muted-foreground">{metric.label}</p>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <p className="text-xl sm:text-2xl font-bold text-primary">{metric.value}</p>
                    {metric.suffix && (
                      <span className="text-xs text-muted-foreground">{metric.suffix}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            {t("Quick Stats")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex items-center justify-between p-3 rounded-lg border ">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 dark:bg-transparent rounded-lg flex items-center justify-center">
                  <Eye className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("New Conversations")}</p>
                  <p className="text-lg font-semibold">{quickStats?.newConversations ?? "NA"}</p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="bg-blue-50 text-primary border-blue-200 dark:bg-transparent text-[10px]"
              >
                {t("LIVE")}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-green-50 dark:bg-transparent rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("Resolved")}</p>
                  <p className="text-lg font-semibold">{quickStats?.resolved ?? "NA"}</p>
                </div>
              </div>
              {quickStats?.resolvedRateDifference ? (
                <div className="flex items-center gap-1 text-xs">
                  {quickStats?.resolvedRateDifference < 0 ? (
                    <TrendingDown className="w-3 h-3 text-red-600" />
                  ) : (
                    <TrendingUp className="w-3 h-3 text-green-600" />
                  )}
                  <span
                    className={`${quickStats?.resolvedRateDifference < 0 ? "text-red-600" : "text-green-600"}`}
                  >
                    {quickStats?.resolvedRateDifference ?? "NA"}%
                  </span>
                </div>
              ) : (
                ""
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-orange-50 dark:bg-transparent rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("In Progress")}</p>
                  <p className="text-lg font-semibold">
                    {quickStats?.conversationInProgress ?? "NA"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 dark:bg-transparent rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("Agents Online")}</p>
                  <p className="text-lg font-semibold">
                    {quickStats?.totalStaff
                      ? `${quickStats?.staffOnline}/${quickStats?.totalStaff}`
                      : "NA"}
                  </p>
                </div>
              </div>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="flex flex-col gap-4">
        <ConversationTrendsGraph dateRange={dateRange} />
        <ConversationResponseTimePatternGraph dateRange={dateRange} />
        <ConversationAccountDistribution dateRange={dateRange} />
      </div>
    </div>
  );
};
export default ConversationStatsOverview;
