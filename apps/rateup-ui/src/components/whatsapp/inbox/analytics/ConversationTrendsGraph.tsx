import dayjs from "dayjs";
import { TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { useGetResolvedConversationStats } from "@/backend/conversation/conversation.query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import type { ChartConfig } from "@/components/ui/chart.tsx";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { formatDate } from "@/utils/dateTime.ts";

const ConversationTrendsGraph = ({ dateRange }) => {
  const { t } = useTranslation();
  const { data, isLoading } = useGetResolvedConversationStats({
    days: 7,
    dateKey: dateRange.key,
    dateRange: dateRange.range,
  });
  const chartConfig = {
    resolvedCount: {
      label: "Resolved",
      color: "var(--chart-1)",
    },
    totalCount: {
      label: "Total",
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig;
  const chartData = data
    ? data.map((d) => ({
        ...d,
        date: ["today", "yesterday", "last7days"].includes(dateRange.key)
          ? dayjs(d.date).format("ddd")
          : formatDate(d.date),
      }))
    : [];
  if (isLoading) {
    return <Skeleton className="w-full h-90" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-0 w-full">
        <div className="flex justify-between items-center gap-2 w-full">
          <CardTitle className="flex gap-1 items-center">
            <TrendingUp className="w-5 h-5 text-primary mr-1" />
            {t("Conversation Trends")}
          </CardTitle>
        </div>
        <CardDescription className="text-sm">{t("Resolved conversation stats")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-60 w-full">
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              top: 20,
              right: 0,
              left: 0,
              bottom: 0,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickLine={true} axisLine={false} />
            <YAxis />
            <ChartTooltip
              cursor={true}
              content={<ChartTooltipContent className="text-[16px] gap-3 tracking-tight" />}
            />
            <defs>
              <linearGradient id="fillResolved" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2E5BFF" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#2E5BFF" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <Area
              dataKey="resolvedCount"
              type="monotone"
              fill="url(#fillResolved)"
              fillOpacity={0.4}
              stroke="#10B981"
              stackId="a"
              isAnimationActive={true}
            />
            <Area
              dataKey="totalCount"
              type="monotone"
              fill="url(#fillTotal)"
              fillOpacity={0.4}
              stroke="#2E5BFF"
              stackId="a"
              isAnimationActive={true}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default ConversationTrendsGraph;
