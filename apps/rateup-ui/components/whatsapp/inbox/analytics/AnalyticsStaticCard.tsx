import { ReactNode } from "react";

import { TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface AnalyticsStatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trendValue?: number;
  trendPositiveWhen?: "increase" | "decrease";
  trendSuffix?: string;
}
export function AnalyticsStatCard({
  icon,
  label,
  value,
  trendValue,
  trendPositiveWhen = "increase",
  trendSuffix,
}: AnalyticsStatCardProps) {
  const isPositive =
    trendValue !== undefined &&
    (trendPositiveWhen === "increase" ? trendValue >= 0 : trendValue <= 0);

  return (
    <Card className="border p-0">
      <CardContent className="p-4 flex flex-col gap-1">
        <div className="flex items-center justify-between mb-1">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-transparent">
            {icon}
          </div>

          {trendValue !== undefined &&
            (isPositive ? (
              <TrendingUp className="w-6 h-6 text-green-600" />
            ) : (
              <TrendingDown className="w-6 h-6 text-red-600" />
            ))}
        </div>

        <p className="text-xs text-muted-foreground leading-tight">{label}</p>

        <p className="text-2xl font-bold leading-none">{value ?? "NA"}</p>

        {trendValue !== undefined && (
          <p
            className={`text-xs leading-tight ${
              isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            {Math.abs(trendValue)}%{trendSuffix && ` ${trendSuffix}`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
