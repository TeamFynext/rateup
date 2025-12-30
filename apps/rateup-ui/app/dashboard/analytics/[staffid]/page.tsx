"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Clock2,
  MessageCircle,
  RefreshCcw,
  ThumbsUp,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { MessagePlatform, WaMessageAssignStatus } from "@/types/enums";
import { useGetStaffDetailedConversationAnalytics } from "@/backend/conversation/conversation.query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreativeAvatar } from "@/components/ui/creative-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsStatCard } from "@/components/whatsapp/inbox/analytics/AnalyticsStaticCard";
import { StaffStatusBadge } from "@/components/whatsapp/inbox/analytics/ConversationStatsAgentPerformance";
import { DateSelector } from "@/components/whatsapp/inbox/analytics/DateRangeSelector";
import {
  formatTimeToNearestUnitFromSeconds,
  formatToRelativeTime,
} from "@/utils/dateTime";

function page() {
  const { staffid } = useParams();
  const [day, setDay] = useState(7);
  const router = useRouter();
  const t = useTranslations();
  const queryClient = useQueryClient();
  const { data: analytics, isLoading } =
    useGetStaffDetailedConversationAnalytics(staffid, {
      days: day,
    });
  const graphdata = analytics
    ? analytics.weeklyMessageStats?.map((a) => ({
        ...a,
        date: dayjs(a.date).format("ddd"),
      }))
    : [];
  const averageResponseTime = formatTimeToNearestUnitFromSeconds(
    analytics?.userPerformance?.averageResponseTime,
  );

  const refresh = () => {
    queryClient.invalidateQueries({
      queryKey: ["StaffDetailedConversationAnalytics", staffid, { days: day }],
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {isLoading ? (
        <Card className="border shadow-sm p-0">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4 flex-wrap">
                {/* Back Button Skeleton */}
                <Skeleton className="h-9 w-28 rounded-md" />

                {/* Divider */}
                <div className="hidden md:block h-8 w-px bg-gray-200" />

                {/* Avatar Skeleton */}
                <Skeleton className="h-12 w-12 rounded-full" />

                {/* Text Skeleton */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>

                {/* Status Badge Skeleton */}
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border shadow-sm p-0">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* Left Section */}
              <div className="flex flex-wrap items-center gap-3 md:gap-4">
                {/* Back Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.back()}
                  className="shrink-0"
                >
                  <ArrowLeft className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">
                    {t("Back to Agents")}
                  </span>
                </Button>

                {/* Divider */}
                <div className="hidden md:block h-8 w-px bg-gray-200" />

                {/* Avatar */}
                <CreativeAvatar
                  name={analytics?.userPerformance?.name}
                  platform={MessagePlatform.WEBCHAT}
                  size="lg"
                />

                {/* Name + Email */}
                <div className="min-w-0">
                  <h2 className="text-base md:text-lg font-medium truncate">
                    {analytics?.userPerformance?.name}
                  </h2>
                  <p className="text-xs text-muted-foreground truncate">
                    {analytics?.userPerformance?.email}
                  </p>
                </div>

                {/* Status */}
                <StaffStatusBadge status={analytics?.userPerformance?.status} />
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={refresh}
                  className="flex items-center justify-center gap-1"
                >
                  <RefreshCcw />
                  <span>{t("Refresh")}</span>
                </Button>
                <DateSelector days={day} setDays={setDay} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <div>
        {isLoading ? (
          <div className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-[50px]" />
              <Skeleton className="h-[50px]" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Skeleton className="h-[50px]" />
              <Skeleton className="h-[50px]" />
              <Skeleton className="h-[50px]" />
              <Skeleton className="h-[50px]" />
            </div>
            <Skeleton className="h-[120px] w-full" />
            <Skeleton className="h-[120px] w-full" />
          </div>
        ) : (
          <div className="space-y-6 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <AnalyticsStatCard
                icon={<MessageCircle className="w-6 h-6 text-primary" />}
                label={t("Messages Handled")}
                value={analytics?.userPerformance?.totalMessagesHandled}
                trendValue={
                  analytics?.userPerformance?.messagesHandledRateByLastWeek
                }
                trendSuffix={t("vs last week")}
              />

              <AnalyticsStatCard
                icon={<Clock className="w-6 h-6 text-primary" />}
                label={t("Avg Response Time")}
                value={
                  averageResponseTime
                    ? `${averageResponseTime.value} ${averageResponseTime.suffix}`
                    : "NA"
                }
                trendValue={
                  analytics?.userPerformance?.responseTimeRateByLastWeek
                }
                trendPositiveWhen="decrease"
                trendSuffix={
                  analytics?.userPerformance?.responseTimeRateByLastWeek <= 0
                    ? t("faster vs last week")
                    : t("slower vs last week")
                }
              />

              <AnalyticsStatCard
                icon={<ThumbsUp className="w-6 h-6 text-primary" />}
                label={t("Resolution Rate")}
                value={
                  analytics?.metrics?.resolutionRate != null
                    ? `${analytics.metrics.resolutionRate.toFixed(1)}%`
                    : "0%"
                }
                trendValue={
                  analytics?.userPerformance?.resolutionRateByLastWeek
                }
                trendSuffix={t("vs last week")}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className=" border p-0">
                <CardContent className="p-4 flex flex-col gap-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-transparent">
                      <Clock2 className="w-6 h-6 text-primary" />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-tight">
                    {t("First Response")}
                  </p>

                  <p className="text-2xl font-bold leading-none">
                    {analytics?.metrics?.firstResponseTime
                      ? `${formatTimeToNearestUnitFromSeconds(analytics?.metrics?.firstResponseTime)?.value} ${formatTimeToNearestUnitFromSeconds(analytics?.metrics?.firstResponseTime)?.suffix}`
                      : "NA"}
                  </p>
                  <p className="text-xs text-muted-foreground leading-tight">
                    {t("Average time to first reply")}
                  </p>
                </CardContent>
              </Card>
              <Card className=" border p-0">
                <CardContent className="p-4 flex flex-col gap-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-transparent">
                      <ArrowLeft className="w-6 h-6 text-orange-500" />
                    </div>
                    <div className="px-2 py-1 text-xs rounded-lg bg-orange-100 dark:bg-transparent text-orange-500 border border-orange-300">
                      OUT
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-tight">
                    {t("Chats Transferred")}
                  </p>

                  <p className="text-2xl font-bold leading-none text-orange-500">
                    {analytics?.userPerformance?.conversationsTransferred}
                  </p>
                  <p className="text-xs text-muted-foreground leading-tight">
                    {t("Transferred to other agents")}
                  </p>
                </CardContent>
              </Card>
              <Card className=" border p-0">
                <CardContent className="p-4 flex flex-col gap-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-transparent">
                      <ArrowRight className="w-6 h-6 text-green-500" />
                    </div>
                    <div className="px-2 py-1 text-xs border border-green-300 rounded-lg bg-green-100 dark:bg-transparent text-green-500">
                      IN
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-tight">
                    {t("Chats Received")}
                  </p>

                  <p className="text-2xl font-bold leading-none text-green-500">
                    {analytics?.userPerformance?.conversationsRecieved}
                  </p>
                  <p className="text-xs text-muted-foreground leading-tight">
                    {t("Received from other agents")}
                  </p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="text-base">
                    {t("Weekly Performance Trend")}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {t("Messages handled per day")}
                  </p>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={graphdata} margin={{ top: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="messageCount"
                      fill="#1873E8"
                      radius={[8, 8, 0, 0]}
                      barSize={60}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="text-base">{t("Recent Conversations")}</span>
                  <p className="text-xs text-muted-foreground">
                    {t("Last 4 customer interactions")}
                  </p>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="p-3 text-left text-[11px] font-medium">
                          {t("Customer")}
                        </th>
                        <th className="p-3 text-left text-[11px] font-medium">
                          {t("Duration")}
                        </th>
                        <th className="p-3 text-left text-[11px] font-medium">
                          {t("Time")}
                        </th>
                        <th className="p-3 text-left text-[11px] font-medium">
                          {t("Status")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {!analytics?.recentConversations?.length && (
                        <tr>
                          <td colSpan={4} className="text-center py-3">
                            {t("No conversation found")}
                          </td>
                        </tr>
                      )}
                      {analytics?.recentConversations?.map((conv) => (
                        <tr
                          key={conv.id}
                          className="border-b last:border-b-0 hover:bg-muted/20"
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <CreativeAvatar
                                name={conv.customer.name}
                                size="sm"
                                platform={MessagePlatform.WEBCHAT}
                              />
                              <span className="text-xs font-medium">
                                {conv.customer.name}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {conv.duration !== null
                              ? `${formatTimeToNearestUnitFromSeconds(conv.duration).value} ${formatTimeToNearestUnitFromSeconds(conv.duration).suffix}`
                              : "NA"}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {conv.lastRespondedAt
                              ? formatToRelativeTime(conv.lastRespondedAt, true)
                              : t("Not responded yet")}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                conv.status === WaMessageAssignStatus.CLOSED ||
                                conv.status === WaMessageAssignStatus.RESOLVED
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-orange-50 text-orange-700 border-orange-200"
                              }`}
                            >
                              {conv.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default page;
