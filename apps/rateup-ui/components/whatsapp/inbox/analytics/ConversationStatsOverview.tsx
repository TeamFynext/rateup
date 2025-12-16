import React, { useMemo } from "react";

import dayjs from "dayjs";
import { Clock, MessageCircle, Target } from "lucide-react";

import { useGetConversationOverView } from "@/backend/conversation/conversation.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progressnew";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTimeToNearestUnitFromSeconds } from "@/utils/dateTime";

import ConversationAccountDistribution from "./ConversationAccountDistribution";
import ConversationQuickStats from "./ConversationQuickStats";
import ConversationResponseTimePatternGraph from "./ConversationResponseTimePatternGraph";
import ConversationTrendsGraph from "./ConversationTrendsGraph";

const ConversationStatsOverview = ({ dateRange }) => {
  const { data, isLoading, error, refetch, isRefetching } =
    useGetConversationOverView({
      dateKey: dateRange.key,
      dateRange: dateRange.range,
    });
  const overviewStats = useMemo(() => {
    return [
      {
        key: "totalConversations",
        label: "Conversations",
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
        label: "Response Time",
        color: {
          border: "border-green-500",
          cardBg: "bg-green-50",
          hoverShadow: "hover:shadow-green-300/50",
          text: "text-green-500",
        },
        icon: Clock,
        suffix: formatTimeToNearestUnitFromSeconds(data?.averageResponseTime)
          ?.suffix,
        progressTotal: 60,
        value:
          formatTimeToNearestUnitFromSeconds(data?.averageResponseTime)
            ?.value ?? "NA",
      },
      {
        key: "resolutionRate",
        label: "Resolution Rate",
        color: {
          border: "border-purple-500",
          cardBg: "bg-purple-50",
          hoverShadow: "hover:shadow-purple-300/50",
          text: "text-purple-500",
        },
        icon: Target,
        suffix: "%",
        progressTotal: 100,
        value: data?.resolutionRate,
      },
    ];
  }, [data]);

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
    <div className="flex flex-col gap-6 my-4">
      <div className="grid grid-cols-3 gap-4">
        {overviewStats.map((stat) => {
          const progressValue = (stat.value / stat.progressTotal) * 100;
          return (
            <Card
              key={stat.key}
              className={`group relative overflow-hidden border ${stat.color.border} hover:shadow-xl ${stat.color.hoverShadow} transition-all duration-300 hover:-translate-y-1`}
            >
              <CardHeader>
                <div
                  className={`p-2 justify-center items-center ${stat.color.cardBg} rounded-md w-fit`}
                >
                  <stat.icon className={`${stat.color.text}`} />
                </div>
              </CardHeader>
              <CardContent className="flex flex-col">
                <span className={`text-sm text-muted-foreground`}>
                  {stat.label}
                </span>
                <span className={`text-3xl font-bold ${stat.color.text}`}>
                  {stat.value}
                  <span className="text-sm text-muted-foreground ml-1">
                    {stat.suffix}
                  </span>
                </span>
              </CardContent>

              <CardFooter>
                <Progress value={progressValue} className="w-full h-[4px]" />
              </CardFooter>
            </Card>
          );
        })}
      </div>
      <div className="grid grid-cols-2 xs:grid-cols-1 gap-4">
        <ConversationTrendsGraph dateRange={dateRange} />
        <ConversationResponseTimePatternGraph dateRange={dateRange} />
        <ConversationAccountDistribution dateRange={dateRange} />
        <ConversationQuickStats />
      </div>
    </div>
  );
};
export default ConversationStatsOverview;
