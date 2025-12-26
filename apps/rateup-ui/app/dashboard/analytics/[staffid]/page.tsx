"use client";

import { useParams, useRouter } from "next/navigation";

import dayjs from "dayjs";
import {
  ArrowLeft,
  CircleQuestionMark,
  Clock,
  MessageCircle,
  TrendingDown,
  TrendingUp,
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
import CustomTooltip from "@/components/ui/custom/CustomTooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { StaffStatusBadge } from "@/components/whatsapp/inbox/analytics/ConversationStatsAgentPerformance";
import {
  formatTimeToNearestUnitFromSeconds,
  formatToRelativeTime,
} from "@/utils/dateTime";

function page() {
  const { staffid } = useParams();
  const router = useRouter();
  const t = useTranslations();

  const { data: analytics, isLoading } =
    useGetStaffDetailedConversationAnalytics(staffid, {
      days: 7,
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-transparent dark:to-transparent border p-0">
                <CardContent className="p-4 flex flex-col gap-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-transparent">
                      <MessageCircle className="w-6 h-6 text-primary" />
                    </div>

                    {analytics?.userPerformance
                      ?.messagesHandledRateByLastWeek !== undefined &&
                      (analytics.userPerformance
                        .messagesHandledRateByLastWeek >= 0 ? (
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      ) : (
                        <TrendingDown className="w-6 h-6 text-red-600" />
                      ))}
                  </div>

                  <p className="text-xs text-muted-foreground leading-tight">
                    {t("Messages Handled")}
                  </p>

                  <p className="text-2xl font-bold leading-none">
                    {analytics?.userPerformance?.totalMessagesHandled}
                  </p>

                  {analytics?.userPerformance?.messagesHandledRateByLastWeek !==
                    undefined && (
                    <p
                      className={`text-xs leading-tight ${
                        analytics.userPerformance
                          .messagesHandledRateByLastWeek >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {analytics.userPerformance.messagesHandledRateByLastWeek}%
                      {t("vs last week")}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-transparent dark:to-transparent border p-0">
                <CardContent className="p-4 flex flex-col gap-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-transparent">
                      <Clock className="w-6 h-6 text-primary" />
                    </div>

                    {analytics?.userPerformance?.responseTimeRateByLastWeek !==
                      undefined &&
                      (analytics.userPerformance.responseTimeRateByLastWeek <=
                      0 ? (
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      ) : (
                        <TrendingDown className="w-6 h-6 text-red-600" />
                      ))}
                  </div>

                  <p className="text-xs text-muted-foreground leading-tight">
                    {t("Avg Response Time")}
                  </p>

                  <p className="text-2xl font-bold leading-none">
                    {averageResponseTime
                      ? `${averageResponseTime.value} ${averageResponseTime.suffix}`
                      : "NA"}
                  </p>

                  {analytics?.userPerformance?.responseTimeRateByLastWeek !==
                    undefined && (
                    <p
                      className={`text-xs leading-tight ${
                        analytics.userPerformance.responseTimeRateByLastWeek <=
                        0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {Math.abs(
                        analytics.userPerformance.responseTimeRateByLastWeek,
                      )}
                      %
                      {analytics.userPerformance.responseTimeRateByLastWeek <= 0
                        ? ` ${t("faster")}`
                        : ` ${t("slower")}`}{" "}
                      {t("vs last week")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
              <div className="p-4 rounded-lg border bg-gradient-to-br from-blue-50 to-white dark:from-transparent dark:to-transparent">
                <p className="text-xs text-muted-foreground mb-1">
                  {t("Resolution Rate")}
                </p>
                <p className="text-lg font-bold text-primary">
                  {analytics?.metrics?.resolutionRate}%
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-gradient-to-br from-blue-50 to-white dark:from-transparent dark:to-transparent">
                <div className="flex gap-1">
                  <p className="text-xs text-muted-foreground mb-1">
                    {t("First Response")}
                  </p>
                  <CustomTooltip
                    trigger={
                      <CircleQuestionMark className="w-3 h-3 text-muted-foreground" />
                    }
                    content={
                      <span>
                        {t("Responded time compared to first assigned time")}
                      </span>
                    }
                  />
                </div>

                <p className="text-lg font-bold text-primary">
                  {analytics?.metrics?.firstResponseTime
                    ? `${formatTimeToNearestUnitFromSeconds(analytics?.metrics?.firstResponseTime)?.value} ${formatTimeToNearestUnitFromSeconds(analytics?.metrics?.firstResponseTime)?.suffix}`
                    : "NA"}
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-gradient-to-br from-blue-50 to-white dark:from-transparent dark:to-transparent">
                <p className="text-xs text-muted-foreground mb-1">
                  {t("Avg Handling")}
                </p>
                <p className="text-lg font-bold text-primary">
                  {analytics?.metrics?.avgHandlingTime !== null
                    ? `${formatTimeToNearestUnitFromSeconds(analytics?.metrics?.avgHandlingTime)?.value} ${formatTimeToNearestUnitFromSeconds(analytics?.metrics?.avgHandlingTime)?.suffix}`
                    : "NA"}
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-gradient-to-br from-blue-50 to-white dark:from-transparent dark:to-transparent">
                <p className="text-xs text-muted-foreground mb-1">
                  {t("Active Chats")}
                </p>
                <p className="text-lg font-bold text-primary">
                  {analytics?.userPerformance?.totalAssignedConversations}
                </p>
              </div>
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
