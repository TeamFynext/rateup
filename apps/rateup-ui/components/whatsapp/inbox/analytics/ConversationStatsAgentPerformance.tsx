import { useState } from "react";

import { FileText, Star } from "lucide-react";

import { MessagePlatform } from "@/types/enums";
import { useGetStaffPerformanceonConversation } from "@/backend/conversation/conversation.query";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreativeAvatar } from "@/components/ui/creative-avatar";
import { formatTimeToNearestUnitFromSeconds } from "@/utils/dateTime";

import StaffStatsDetailDialog from "./StaffStatsDetailDialog";

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
  console.log("status", status);
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

const ConversationStatsAgentPerformance = () => {
  const { data = [], isLoading } = useGetStaffPerformanceonConversation();
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showStaffDialog, setShowStaffDialog] = useState(false);
  if (isLoading) {
    return <RateupLoader />;
  }

  console.log("data", data);
  return (
    <div className="space-y-6">
      <Card className="border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Agent Performance Metrics</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Detailed performance breakdown for each team member
              </p>
            </div>
            {/* <Button variant="outline" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Export Report
                </Button> */}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="p-4 text-left font-medium text-sm">Agent</th>
                  <th className="p-4 text-center font-medium text-sm">
                    Status
                  </th>
                  <th className="p-4 text-center font-medium text-sm">
                    Messages
                  </th>
                  <th className="p-4 text-center font-medium text-sm">
                    Avg Response Time
                  </th>
                  <th className="p-4 text-center font-medium text-sm">
                    Active Chats
                  </th>
                  <th className="p-4 text-center font-medium text-sm">
                    Resolved Chats
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((staff) => {
                  console.log("staff", staff);
                  const averageResponseTime =
                    formatTimeToNearestUnitFromSeconds(
                      staff.averageResponseTime,
                    );
                  return (
                    <tr
                      key={staff.staff.userId}
                      className="border-b last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedStaff(staff);
                        setShowStaffDialog(true);
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
                            <div className="font-medium">
                              {staff.staff.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {staff.staff.email}
                            </div>
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <StaffStatsDetailDialog
        opened={showStaffDialog}
        setOpened={setShowStaffDialog}
        selectedStaff={selectedStaff}
      />
    </div>
  );
};

export default ConversationStatsAgentPerformance;
