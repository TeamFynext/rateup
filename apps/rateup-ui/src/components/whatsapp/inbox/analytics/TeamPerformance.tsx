import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useGetTeamOverview } from "@/backend/conversation/conversation.query";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import type { AnalyticsDateRange } from "@/types/api.ts";
import { formatTimeToNearestUnitFromSeconds } from "@/utils/dateTime.ts";

/** One row of the team performance table. */
interface TeamPerformanceRow {
  teamId: string;
  teamName: string;
  teamColor?: string;
  teamMembers?: number;
  teamMembersOnline?: number;
  messagesSent?: number;
  assignedConversations?: number;
  averageResponseTime?: number;
}

function TeamPerformance({ dateRange }: { dateRange: AnalyticsDateRange }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: teamsData, isLoading } = useGetTeamOverview({
    dateKey: dateRange.key,
    dateRange: dateRange.range,
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Teams Overview</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {t("Click on any team to view detailed statistics")}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full">
            <thead>
              <tr className="border-b bg-gray-50/50 dark:bg-transparent">
                <th className="text-left p-4 text-sm font-semibold text-gray-600">{t("Team")}</th>
                <th className="hidden sm:table-cell text-left p-4 text-sm font-semibold text-gray-600">
                  {t("Members")}
                </th>
                <th className="text-left p-4 text-sm font-semibold text-gray-600">
                  {t("Messages")}
                </th>
                <th className="hidden md:table-cell text-left p-4 text-sm font-semibold text-gray-600">
                  {t("Avg Response")}
                </th>
                <th className="hidden sm:table-cell text-left p-4 text-sm font-semibold text-gray-600">
                  {t("Active Chats")}
                </th>
                <th className="p-4" />
              </tr>
            </thead>

            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-lg" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </td>
                      <td className="hidden sm:table-cell p-4">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="hidden md:table-cell p-4">
                        <Skeleton className="h-4 w-28" />
                      </td>
                      <td className="hidden sm:table-cell p-4">
                        <Skeleton className="h-6 w-12" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-5 w-5 rounded-full" />
                      </td>
                    </tr>
                  ))
                : teamsData?.map((team: TeamPerformanceRow) => {
                    const averageResponseTime = formatTimeToNearestUnitFromSeconds(
                      team.averageResponseTime,
                    );

                    return (
                      <tr
                        key={team.teamId}
                        className="border-b hover:bg-gray-50/50 dark:hover:bg-gray-900 cursor-pointer group transition-colors"
                        onClick={() =>
                          navigate({
                            to: `/dashboard/analytics/team/${team.teamId}`,
                          })
                        }
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
                              style={{
                                backgroundColor:
                                  team?.teamColor !== "null" ? team.teamColor : "blue",
                              }}
                            >
                              <Users className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-semibold">{team.teamName}</span>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell p-4">
                          <div className="font-semibold">
                            {team.teamMembers} {(team.teamMembers ?? 0) > 1 ? "members" : "member"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {team.teamMembersOnline} {t("online")}
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-primary">{team.messagesSent}</td>
                        <td className="hidden md:table-cell p-4 font-semibold">
                          {averageResponseTime
                            ? `${averageResponseTime.value} ${averageResponseTime.suffix}`
                            : "NA"}
                        </td>
                        <td className="hidden sm:table-cell p-4">
                          <Badge
                            variant="outline"
                            className="bg-rateup-darkblue/10 text-primary border-rateup-darkblue/20"
                          >
                            {team.assignedConversations}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default TeamPerformance;
