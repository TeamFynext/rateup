import dayjs from "dayjs";
import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { useGetResolvedConversationStats } from "@/backend/conversation/conversation.query";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

const ConversationTrendsGraph = () => {
  const { data, isLoading } = useGetResolvedConversationStats({
    days: 7,
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
    ? data.map((d) => ({ ...d, date: dayjs(d.date).format("ddd") }))
    : [];
  if (isLoading) {
    return <Skeleton className="w-full h-90" />;
  }

  return (
    <Card className="border shadow-sm bg-gradient-to-br from-purple-50/30 to-white">
      <CardHeader className="flex flex-col gap-0 w-full">
        <div className="flex justify-between items-center gap-2 w-full">
          <CardTitle className="flex gap-1 items-center">
            <TrendingUp className="w-5 h-5 text-blue-500 mr-1" />
            Conversation Trends
          </CardTitle>
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            Last 7 days
          </Badge>
        </div>
        <CardDescription className="text-sm">
          Weekly conversation activity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
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
              content={
                <ChartTooltipContent className="text-[16px] gap-3 tracking-tight" />
              }
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
              type="natural"
              fill="url(#fillResolved)"
              fillOpacity={0.4}
              stroke="#10B981"
              stackId="a"
              isAnimationActive={true}
            />
            <Area
              dataKey="totalCount"
              type="natural"
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
