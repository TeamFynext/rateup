"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Clock,
  FileText,
  MessageCircle,
  RefreshCcw,
  Target,
  Users,
} from "lucide-react";
import { useExtracted } from "next-intl";
import { usePDF } from "react-to-pdf";

import { MessagePlatform } from "@/types/enums";
import { useGetTeamDetailedMetrics } from "@/backend/conversation/conversation.query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreativeAvatar } from "@/components/ui/creative-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { StaffStatusBadge } from "@/components/whatsapp/inbox/analytics/ConversationStatsAgentPerformance";
import { DateSelector } from "@/components/whatsapp/inbox/analytics/DateRangeSelector";
import { formatTimeToNearestUnitFromSeconds } from "@/utils/dateTime";

function page() {
  const t = useExtracted();
  const [day, setDay] = useState(7);
  const queryClient = useQueryClient();
  const { teamid } = useParams();
  const router = useRouter();
  const { toPDF, targetRef } = usePDF({
    filename: `analytics-team-${teamid}-${day}d.pdf`,
  });
  const { data, isLoading } = useGetTeamDetailedMetrics(teamid, {
    days: day,
  });
  const averageResponsesTime = formatTimeToNearestUnitFromSeconds(
    data?.averageResponseTime,
  );
  const textColor = (value) => {
    if (value > 0) return "text-green-500";
    return "text-red-500";
  };

  const refresh = () => {
    queryClient.invalidateQueries({
      queryKey: ["teamdetailedmetrics", teamid, { days: day }],
    });
  };
  return (
    <div ref={targetRef} className="space-y-6">
      <Card className=" p-0">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  router.push("/dashboard/analytics?tab=team-performance");
                }}
                className="gap-2"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                {t("Back to Teams")}
              </Button>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md"
                  style={{
                    backgroundColor:
                      data?.teamColor === "null" ? "blue" : data?.teamColor,
                  }}
                >
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">{data?.teamName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {data?.teamMembers} {t("members")} ·{" "}
                    {data?.teamMembersOnline} {t("online")}
                  </p>
                </div>
              </div>
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
              <Button
                variant="outline"
                onClick={() => toPDF()}
                className="flex items-center justify-center gap-1"
              >
                <FileText />
                <span>{t("Export")}</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Team Statistics */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Skeleton className="w-5 h-5 rounded" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-8 w-32 mb-3" />
                <Skeleton className="h-4 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-primary" />
                <p className="text-sm text-muted-foreground">
                  {t("Avg Response Time")}
                </p>
              </div>
              <p className="text-2xl font-semibold">
                {averageResponsesTime
                  ? `${averageResponsesTime.value} ${averageResponsesTime.suffix}`
                  : "NA"}
              </p>
              <p
                className={`text-xs mt-1 ${textColor(data?.averageResponseTimeComparedToLastWeek)}`}
              >
                {Math.floor(data?.averageResponseTimeComparedToLastWeek) ?? 0}%{" "}
                {t("vs last week")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                <p className="text-sm text-muted-foreground">
                  {t("Active Chats")}
                </p>
              </div>
              <p className="text-2xl font-semibold">{data?.activeChats}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("Currently handling")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Target className="w-5 h-5 text-primary" />
                <p className="text-sm text-muted-foreground">
                  {t("Resolution Rate")}
                </p>
              </div>
              <p className="text-2xl font-semibold">
                {Math.floor(data?.resolutionRate)}%
              </p>
              <p
                className={`text-xs text-green-600 mt-1 ${textColor(data?.resolutionRateComparedToLastWeek)}`}
              >
                {Math.floor(data?.resolutionRateComparedToLastWeek)}%{" "}
                {t("vs last week")}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Team Members Grid */}
      {isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("Team Members")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t("Performance of individual team members")}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-5 rounded-xl border">
                  <div className="flex items-center gap-3 mb-4">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-12" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("Team Members")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t("Performance of individual team members")}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.members?.map((agent) => {
                const averageResponseTime = formatTimeToNearestUnitFromSeconds(
                  agent.averageResponseTime,
                );
                return (
                  <div
                    key={agent.userId}
                    className="p-5 rounded-xl border hover:scale-[1.02] cursor-pointer transition-all duration-300"
                    onClick={() =>
                      router.push(`/dashboard/analytics/${agent.userId}`)
                    }
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <CreativeAvatar
                        name={agent.name}
                        platform={MessagePlatform.WEBCHAT}
                        size="sm"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium">{agent.name}</h4>

                        <div className={`w-1.5 h-1.5 rounded-full mr-1.5`} />
                        <StaffStatusBadge status={agent?.onlineStatus} />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t("Messages")}
                        </span>
                        <span className="font-semibold">
                          {agent.messagesHandled}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t("Response Time")}
                        </span>
                        <span className="font-semibold">
                          {averageResponseTime
                            ? `${averageResponseTime.value} ${averageResponseTime.suffix}`
                            : "NA"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t("Active Chats")}
                        </span>
                        <Badge variant="outline" className="text-primary">
                          {agent.staffActiveChats}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default page;
