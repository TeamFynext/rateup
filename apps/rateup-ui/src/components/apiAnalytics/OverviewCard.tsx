import { TrendingDown, TrendingUp } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import { Card, CardContent } from "../ui/card.tsx";

function OverviewCard({
  title,
  value,
  Icon,
  bg,
  iconColor,
  trendLogoRequired,
  trendValue,
}: {
  title: string;
  value: ReactNode;
  Icon: ComponentType<{ className?: string; size?: number }>;
  bg?: string;
  iconColor?: string;
  trendLogoRequired?: boolean;
  trendValue?: number;
}) {
  const isNegative = trendValue < 0;
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-10 h-10 rounded-lg  border flex items-center justify-center ${bg} dark:bg-transparent`}
              >
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl">{value}</p>
          </div>

          {/* Show trend only if required */}
          {trendLogoRequired ? (
            <div
              className={`flex items-center border gap-1 min-w-14 justify-center px-2 py-1 rounded-full text-xs ${
                isNegative
                  ? "bg-red-100 text-red-600 dark:bg-transparent"
                  : "bg-green-100 text-green-600 dark:bg-transparent"
              }`}
            >
              {isNegative ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <TrendingUp className="w-3 h-3" />
              )}
              <span>
                {trendValue > 0 ? "+" : ""}
                {trendValue ?? 0}
              </span>
            </div>
          ) : (
            <div
              className={`flex items-center justify-center min-w-14 gap-1 px-2 py-1 rounded-full text-xs ${bg} ${iconColor} border dark:bg-transparent`}
            >
              <span>{trendValue ?? 0}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default OverviewCard;
