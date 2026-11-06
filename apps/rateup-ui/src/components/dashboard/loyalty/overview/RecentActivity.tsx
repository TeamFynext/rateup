import { IconArrowRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import type { LoyaltyDashboardStats } from "@/backend/loyalty/dashboard/dashboard.query";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { ContactAvatar } from "@/components/ui/contact-avatar.tsx";

import { LOYALTY_PATHS } from "../paths.ts";
import type { ProgramState } from "../program/programState.ts";

export function RecentActivity({
  programState,
  dashboard,
  pointsName,
}: Readonly<{
  programState: ProgramState;
  dashboard: LoyaltyDashboardStats | undefined;
  pointsName: string;
}>) {
  const { t } = useTranslation();
  const rows = programState === "draft" ? [] : (dashboard?.recentActivity ?? []);

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">{t("Recent activity")}</CardTitle>
        <Link
          to={LOYALTY_PATHS.activity}
          search={{ filter: "all", page: 1 }}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("All activity")} <IconArrowRight size={12} />
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col">
        {rows.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {programState === "draft"
              ? t("Every {points} in and out will show here once you activate.", {
                  points: pointsName,
                })
              : t("No activity yet.")}
          </p>
        )}
        {rows.map((activity) => (
          <div
            key={`${activity.createdAt}-${activity.user}-${activity.item}`}
            className="flex items-center justify-between gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50"
          >
            <div className="flex min-w-0 items-center gap-3">
              <ContactAvatar name={activity.user} size="md" className="shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-sm text-foreground">
                  <span className="font-medium">{activity.user}</span> {activity.action}
                  {""}
                  <span className="font-medium">{activity.item}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {dayjs(activity.createdAt).format("DD MMM, h:mm A")}
                </p>
              </div>
            </div>
            {activity.points !== 0 && (
              <Badge
                variant="secondary"
                className={
                  activity.points > 0
                    ? "bg-green-600/10 text-green-700 dark:text-green-500"
                    : "text-destructive"
                }
              >
                {activity.points > 0 ? "+" : ""}
                {activity.points.toLocaleString()} {pointsName}
              </Badge>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
