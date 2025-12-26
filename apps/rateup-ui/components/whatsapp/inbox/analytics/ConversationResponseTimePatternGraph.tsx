import { Space_Mono } from "next/font/google";

import { Skeleton } from "@mantine/core";
import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import { useGetAverageConversationResponseTimeGraphData } from "@/backend/conversation/conversation.query";
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
import { formatDate, formatToCustomTime } from "@/utils/dateTime";

const ConversationResponseTimePatternGraph = ({ dateRange }) => {
  const t = useTranslations();
  const { data = [], isLoading } =
    useGetAverageConversationResponseTimeGraphData({
      dateKey: dateRange.key,
      dateRange: dateRange.range,
    });
  const chartConfig = {
    averageResponseTime: {
      label: "Average Response Time",
      color: "var(--chart-3)",
    },
  } satisfies ChartConfig;

  const chartData = data.map((d) => ({
    period:
      dateRange.key === "today" || dateRange.key === "yesterday"
        ? formatToCustomTime(d.period)
        : formatDate(d.period),
    averageResponseTime: Math.round(d.averageResponseTime / 60),
  }));

  if (isLoading) {
    return <Skeleton className="w-full h-90" />;
  }

  return (
    <Card className="border shadow-sm bg-gradient-to-br from-purple-50/30 to-white dark:from-transparent dark:to-transparent w-full">
      <CardHeader className="flex flex-col gap-0 w-full">
        <div className="flex justify-between items-center gap-2 w-full">
          <CardTitle className="flex gap-1 items-center">
            <Clock className="w-5 h-5 text-primary mr-1" />
            {t("Response Time Pattern")}
          </CardTitle>
          <Badge
            variant="outline"
            className="bg-orange-50 text-orange-700 border-orange-200"
          >
            {t("Today")}
          </Badge>
        </div>
        <CardDescription className="text-sm">
          {t("Average response time throughout the day")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!chartData.length ? (
          <div className="grid place-content-center py-12 h-full">
            <h3 className="text-lg font-medium text-gray-900">
              {t("No data found for analysis")}
            </h3>
            <p className="text-gray-600 mb-4">
              {t("No responsed conversation found")}
            </p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-60 w-full">
            <LineChart
              accessibilityLayer
              data={chartData}
              margin={{
                top: 20,
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} />
              <YAxis />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    valueFormatter={(value, key) =>
                      key == "averageResponseTime" ? `${value} min(s)` : value
                    }
                  />
                }
              />
              <Line
                dataKey="averageResponseTime"
                type="natural"
                stroke="#FF9500"
                strokeWidth={2}
                dot={{
                  fill: "#FF9500",
                }}
                activeDot={{
                  r: 6,
                }}
              >
                <LabelList
                  position="top"
                  offset={12}
                  className="fill-foreground"
                  fontSize={12}
                />
              </Line>
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default ConversationResponseTimePatternGraph;
