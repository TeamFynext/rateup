import { ReactNode } from "react";

import { TrendingDown, TrendingUp } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <Card className=" p-0">
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

type PageHeaderCardProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  actions?: ReactNode;
};

export function PageHeaderCard({
  title,
  description,
  icon,
  actions,
}: PageHeaderCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 items-center">
          {icon && (
            <div className="w-8 h-8 bg-primary rounded-lg items-center justify-center shrink-0 hidden sm:flex">
              {icon}
            </div>
          )}
          <div className="flex flex-col">
            <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {description}
            </CardDescription>
          </div>
        </div>

        {actions && (
          <CardContent className="flex flex-col gap-3 p-0 sm:flex-row sm:items-center sm:gap-2">
            {actions}
          </CardContent>
        )}
      </CardHeader>
    </Card>
  );
}
