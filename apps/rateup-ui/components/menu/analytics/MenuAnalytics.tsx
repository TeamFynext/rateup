"use client";

import Link from "next/link";

import { useExtracted } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { useGetSurveyStatsBySurveyTeamMapId } from "../../../backend/surveys/surveys.query";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../../ui/chart";
import { Progress } from "../../ui/progress";
import { Skeleton } from "../../ui/skeleton";

type MenuAnalyticsProps = {
  readonly surveyTeamMapId?: string;
  readonly visited?: number;
  readonly surveyId?: string;
  readonly subscription?: unknown;
};

const MenuAnalytics = ({
  surveyTeamMapId,
  visited,
  surveyId,
  subscription,
}: Readonly<MenuAnalyticsProps>) => {
  const translations = useExtracted();
  const { data: surveyStats, isPending } =
    useGetSurveyStatsBySurveyTeamMapId(surveyTeamMapId);

  if (isPending && !!surveyTeamMapId) {
    return (
      <div className="flex flex-col gap-6 px-6 py-6">
        <Skeleton className="h-6 w-40" />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-36 w-full rounded-xl lg:col-span-1" />
          <Skeleton className="h-36 w-full rounded-xl lg:col-span-2" />
        </div>

        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const visitedCount = visited ?? 0;
  const quotaPercent = Math.min(100, Math.round((visitedCount / 100) * 100));

  const surveyStages = [
    {
      label: translations("Visited"),
      key: "visited",
      count: surveyStats?.visited ?? 0,
    },
    {
      label: translations("Started"),
      key: "started",
      count: surveyStats?.started ?? 0,
    },
    {
      label: translations("Completed"),
      key: "completed",
      count: surveyStats?.completed ?? 0,
    },
  ];

  const startedCount = surveyStages[1].count;
  const completedCount = surveyStages[2].count;
  const completionRate =
    startedCount > 0 ? Math.round((completedCount / startedCount) * 100) : 0;
  const showFreeQuota = !subscription;

  const funnelChartConfig = {
    visited: {
      label: translations("Visited"),
      color: "var(--chart-1)",
    },
    started: {
      label: translations("Started"),
      color: "var(--chart-2)",
    },
    completed: {
      label: translations("Completed"),
      color: "var(--chart-3)",
    },
  } satisfies ChartConfig;

  return (
    <div className="flex flex-col gap-6 px-6 py-6">
      <h2 className="text-lg font-semibold">{translations("Menu Insights")}</h2>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-primary/20 bg-primary/5 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {translations("Total Menu Visits")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-4xl font-black text-primary">{visitedCount}</p>
            <p className="text-sm text-muted-foreground">
              {translations("all-time visitors")}
            </p>
          </CardContent>
        </Card>

        {showFreeQuota ? (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {translations("Your Free Quota")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={quotaPercent} className="h-2" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {translations("Used")}
                </span>
                <span className="font-semibold text-primary">
                  {quotaPercent}%
                </span>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {surveyTeamMapId ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>{translations("Survey Insights")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {translations("Performance across survey stages")}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link
                href={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/dashboard/surveys/${surveyId}?tab=Result`}
              >
                {translations("More Info")}
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {surveyStages.map(({ key, count, label }) => (
                <Card key={key}>
                  <CardContent className="flex items-center justify-between py-5">
                    <div>
                      <p className="text-2xl font-bold">{count}</p>
                      <Badge variant="secondary" className="mt-1">
                        {label}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardContent className="pt-6">
                  <ChartContainer
                    config={funnelChartConfig}
                    className="h-56 w-full"
                  >
                    <BarChart accessibilityLayer data={surveyStages}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="count"
                        radius={8}
                        fill="var(--color-visited)"
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {translations("Completion Rate")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-4xl font-black text-primary">
                    {completionRate}%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {translations("completed from started")}
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default MenuAnalytics;
