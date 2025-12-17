import { useMemo } from "react";

import {
  ArrowRight,
  CheckCircle2,
  Eye,
  MessageSquare,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

import { useGetConversationQuickStats } from "@/backend/conversation/conversation.query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ConversationQuickStats = () => {
  const { data, isLoading } = useGetConversationQuickStats();
  const quickStats = useMemo(
    () => [
      {
        key: "activeConversations",
        label: "Active Now",
        icon: Eye,
        rightSection: () => (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]"
          >
            LIVE
          </Badge>
        ),
        count: data?.activeConversations ?? "NA",
        color: {
          borderColor: "border-blue-200",
          bgColor: "bg-blue-100",
          textColor: "text-blue-700",
        },
      },
      {
        key: "resolvedToday",
        label: "Resolved Today",
        icon: CheckCircle2,
        rightSection: () =>
          data?.reolvedRateDifference ? (
            <div className="flex items-center gap-1 text-xs text-green-600">
              {data?.reolvedRateDifference < 0 ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <TrendingUp className="w-3 h-3" />
              )}
              <span className="font-semibold">
                {data?.reolvedRateDifference ?? "NA"}%
              </span>
            </div>
          ) : null,
        count: data?.resolvedToday ?? "NA",
        color: {
          borderColor: "border-green-200",
          bgColor: "bg-green-100",
          textColor: "text-green-700",
        },
      },
      {
        key: "pendingConversations",
        label: "Pending",
        icon: MessageSquare,
        rightSection: () => (
          <Badge
            variant="outline"
            className="bg-orange-50 text-orange-700 border-orange-200 text-[10px]"
          >
            URGENT
          </Badge>
        ),
        count: data?.pendingConversations ?? "NA",
        color: {
          borderColor: "border-orange-200",
          bgColor: "bg-orange-100",
          textColor: "text-orange-700",
        },
      },
      {
        key: "staffOnline",
        label: "Agents Online",
        icon: Users,
        rightSection: () => (
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        ),
        count: data?.totalStaff
          ? `${data?.staffOnline}/${data?.totalStaff}`
          : "NA",
        color: {
          borderColor: "border-purple-200",
          bgColor: "bg-purple-100",
          textColor: "text-purple-700",
        },
      },
    ],
    [data],
  );
  return (
    <Card className="border shadow-sm bg-gradient-to-br from-blue-50/30 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm">Quick Stats</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time overview
              </p>
            </div>
          </div>
          {/* <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs hover:bg-blue-100"
          >
            View All
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button> */}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {quickStats.map((stat) => (
          <div
            key={stat.key}
            className={`flex items-center justify-between p-3 rounded-lg border bg-white hover:shadow-md hover:${stat.color.borderColor} transition-all`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 ${stat.color.bgColor} rounded-lg flex items-center justify-center`}
              >
                <stat.icon className={`w-4 h-4 ${stat.color.textColor}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                {isLoading ? (
                  <Skeleton className="w-15 h-[10px] mt-2" />
                ) : (
                  <p className="text-md font-semibold">{stat.count}</p>
                )}
              </div>
            </div>
            {<stat.rightSection />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ConversationQuickStats;
