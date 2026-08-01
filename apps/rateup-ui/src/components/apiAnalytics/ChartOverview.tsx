import { IconActivity, IconChartBar } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.tsx";
import { Skeleton } from "../ui/skeleton.tsx";

function ChartOverview({
  messageTrendData,
  isLoading,
}: {
  messageTrendData: Array<Record<string, unknown>> | undefined;
  isLoading: boolean;
}) {
  const { t } = useTranslation("apianalytics");
  const hasData = Array.isArray(messageTrendData) && messageTrendData.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <IconActivity className="w-4 h-4 text-primary" />
          {t("Message Delivery Trend (24h)")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-[220px] w-full rounded-md" />
            <div className="flex gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ) : !hasData ? (
          /* No Data State */
          <div className="h-[280px] flex flex-col items-center justify-center text-sm text-muted-foreground">
            <IconActivity className="w-6 h-6 mb-2 opacity-40" />
            {t("No data available for the last 24 hours")}
          </div>
        ) : (
          /* Chart */
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={messageTrendData}>
              <defs>
                <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />

              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />

              <Area
                type="monotone"
                dataKey="deliveredMessages"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#colorSuccess)"
                name="Success"
              />

              <Area
                type="monotone"
                dataKey="failedMessages"
                stroke="#EF4444"
                strokeWidth={2}
                fill="url(#colorFailed)"
                name="Failed"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export default ChartOverview;

export function DailyTrend({
  dailyMessageData,
  isLoading,
}: {
  dailyMessageData: Array<Record<string, unknown>> | undefined;
  isLoading: boolean;
}) {
  const { t } = useTranslation("apianalytics");
  const hasData = Array.isArray(dailyMessageData) && dailyMessageData.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <IconChartBar className="w-4 h-4 text-primary" />
          {t("Daily Message Volume")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-[220px] w-full rounded-md" />
            <div className="flex gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ) : !hasData ? (
          /* No Data State */
          <div className="h-[280px] flex flex-col items-center justify-center text-sm text-muted-foreground">
            <IconChartBar className="w-6 h-6 mb-2 opacity-40" />
            {t("No data available")}
          </div>
        ) : (
          /* Chart */
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dailyMessageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#9CA3AF" />

              <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />

              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />

              <Bar
                dataKey="deliveredMessages"
                fill="#1873E8"
                radius={[4, 4, 0, 0]}
                name="Success"
              />

              <Bar dataKey="failedMessages" fill="#EF4444" radius={[4, 4, 0, 0]} name="Failed" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
