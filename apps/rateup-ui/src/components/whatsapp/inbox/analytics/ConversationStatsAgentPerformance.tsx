import { useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useGetStaffPerformanceonConversation } from "@/backend/conversation/conversation.query";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { CreativeAvatar } from "@/components/ui/creative-avatar.tsx";
import { MessagePlatform } from "@/types/enums.ts";
import { formatTimeToNearestUnitFromSeconds } from "@/utils/dateTime.ts";

export const StaffStatusBadge = ({ status }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
      case "available":
        return {
          bgDark: "bg-green-500",
          bgLight: "bg-green-50",
          textColor: "text-green-700",
          borderColor: "border-green-200",
        };
      case "busy":
        return {
          bgDark: "bg-orange-500",
          bgLight: "bg-orange-50",
          textColor: "text-orange-700",
          borderColor: "border-orange-200",
        };
      case "away":
        return {
          bgDark: "bg-yellow-500",
          bgLight: "bg-yellow-50",
          textColor: "text-yellow-700",
          borderColor: "border-yellow-200",
        };
      case "offline":
        return {
          bgDark: "bg-gray-400",
          bgLight: "bg-gray-50",
          textColor: "text-gray-700",
          borderColor: "border-gray-200",
        };
      default:
        return {
          bgDark: "bg-gray-400",
          bgLight: "bg-gray-50",
          textColor: "text-gray-700",
          borderColor: "border-gray-200",
        };
    }
  };
  const color = getStatusColor(status);
  return (
    <Badge
      variant="outline"
      className={`capitalize ${color.bgLight} ${color.textColor} ${color.borderColor}`}
    >
      <div className={`w-2 h-2 rounded-full mr-1.5 ${color.bgDark}`} />
      {status}
    </Badge>
  );
};

const ConversationStatsAgentPerformance = ({ dateRange }) => {
  const { t } = useTranslation();
  const { data = [], isLoading } = useGetStaffPerformanceonConversation({
    dateKey: dateRange.key,
    dateRange: dateRange.range,
  });

  const navigate = useNavigate();
  if (isLoading) {
    return <RateupLoader />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("Agent Performance Metrics")}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t("Detailed performance breakdown for each team member")}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="p-4 text-left font-medium text-sm">{t("Agent")}</th>
                  <th className="p-4 text-center font-medium text-sm">{t("Status")}</th>
                  <th className="p-4 text-center font-medium text-sm">{t("Messages")}</th>
                  <th className="p-4 text-center font-medium text-sm">{t("Avg Response Time")}</th>
                  <th className="p-4 text-center font-medium text-sm">{t("Active Chats")}</th>
                  <th className="p-4 text-center font-medium text-sm">{t("Resolved")}</th>
                  <th className="p-4 text-center font-medium text-sm"></th>
                </tr>
              </thead>
              <tbody>
                {data?.length === 0 && (
                  <tr>
                    <td colSpan={5}>{t("No staff found")}</td>
                  </tr>
                )}
                {data.map((staff) => {
                  const averageResponseTime = formatTimeToNearestUnitFromSeconds(
                    staff.averageResponseTime,
                  );
                  return (
                    <tr
                      key={staff.staff.userId}
                      className="border-b last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => {
                        navigate({
                          to: `/dashboard/analytics/${staff?.staff?.userId}`,
                        });
                      }}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <CreativeAvatar
                            name={staff.staff.name}
                            platform={MessagePlatform.WEBCHAT}
                            size="sm"
                          />
                          <div>
                            <div className="font-medium">{staff.staff.name}</div>
                            <div className="text-xs text-muted-foreground">{staff.staff.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <StaffStatusBadge status={staff.staff.status} />
                      </td>
                      <td className="p-4 text-center font-semibold">
                        {staff.totalMessagesHandled}
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-sm">
                          {averageResponseTime
                            ? `${averageResponseTime.value} ${averageResponseTime.suffix}`
                            : "No response found"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <Badge
                          variant="outline"
                          className="bg-purple-50 text-purple-700 border-purple-200"
                        >
                          {staff.totalAssignedConversations}
                        </Badge>
                      </td>
                      <td className="p-4 text-center">
                        <Badge
                          variant="outline"
                          className="bg-purple-50 text-purple-700 border-purple-200"
                        >
                          {staff.totalClosedConversations}
                        </Badge>
                      </td>
                      <td>
                        <ArrowRight className="opacity-40" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConversationStatsAgentPerformance;
