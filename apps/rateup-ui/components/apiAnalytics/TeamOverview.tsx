import { Users } from "lucide-react";
import { useExtracted } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Skeleton } from "../ui/skeleton";

function TeamOverview({ teamData, isLoading }) {
  const t = useExtracted("apianalytics");
  const hasData = Array.isArray(teamData) && teamData.length > 0;
  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          {t("Team Performance Breakdown")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <Skeleton className="h-3 w-20 ml-auto" />
                  <Skeleton className="h-5 w-12 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : !hasData ? (
          /* No Data State */
          <div className="h-[200px] flex flex-col items-center justify-center text-sm text-muted-foreground">
            <Users className="w-6 h-6 mb-2 opacity-40" />
            {t("No team data available")}
          </div>
        ) : (
          /* Data List */
          <div className="space-y-3">
            {teamData.map((team) => (
              <div
                key={team.teamId}
                className="flex items-center justify-between p-3 rounded-lg border hover:border-blue-200 hover:bg-blue-50/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: team.teamColor ?? "#1873E8" }}
                  >
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">{team.teamName}</p>
                    <p className="text-sm text-muted-foreground">
                      {team.totalSent} {t("messages sent")}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm hidden sm:block">{t("Success Rate")}</p>
                  <p className="text-lg text-primary">
                    {team?.successPercentage != null
                      ? `${Number(team.successPercentage).toFixed(1)}%`
                      : "NA"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TeamOverview;
