import dayjs from "dayjs";
import {
  Clock,
  FileText,
  MessageCircle,
  Minus,
  Star,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { MessagePlatform } from "@/types/enums";
import { useGetStaffDetailedConversationAnalytics } from "@/backend/conversation/conversation.query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreativeAvatar } from "@/components/ui/creative-avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

import { StaffStatusBadge } from "./ConversationStatsAgentPerformance";

const StaffStatsDetailDialog = ({ selectedStaff, opened, setOpened }) => {
  const { data: analytics, isLoading } =
    useGetStaffDetailedConversationAnalytics(selectedStaff?.userId, {
      days: 7,
    });
  const graphdata = analytics
    ? analytics.weeklyMessageStats?.map((a) => ({
        ...a,
        date: dayjs(a.date).format("ddd"),
      }))
    : [];
  if (!selectedStaff) return;
  return (
    <Dialog open={opened} onOpenChange={setOpened}>
      <DialogContent className="max-w-[1587px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-4">
            <CreativeAvatar
              name={selectedStaff.staff.name}
              platform={MessagePlatform.WEBCHAT}
              size="lg"
            />
            <div>
              <h2 className="text-lg">{selectedStaff.staff.name}</h2>
              <p className="text-xs text-muted-foreground">
                {selectedStaff.staff.email}
              </p>
            </div>
            <StaffStatusBadge status={selectedStaff.staff.status} />
          </DialogTitle>
          <DialogDescription className="text-xs">
            Comprehensive performance analytics and detailed metrics for this
            agent
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-[50px]" />
              <Skeleton className="h-[50px]" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Skeleton className="h-[50px]" />
              <Skeleton className="h-[50px]" />
              <Skeleton className="h-[50px]" />
              <Skeleton className="h-[50px]" />
            </div>
            <Skeleton className="h-[120px] w-full" />
            <Skeleton className="h-[120px] w-full" />
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <MessageCircle className="w-5 h-5 text-blue-600" />
                    </div>
                    {selectedStaff.messagesHandledRateByLastWeek &&
                      (selectedStaff.messagesHandledRateByLastWeek > 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-green-600" />
                      ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Messages Handled
                  </p>
                  <p className="text-xl font-bold">
                    {selectedStaff.totalMessagesHandled}
                  </p>
                  {selectedStaff.messagesHandledRateByLastWeek && (
                    <p className="text-[11px] text-green-600 mt-1">
                      {selectedStaff.messagesHandledRateByLastWeek}% vs last
                      week
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-purple-100">
                      <Clock className="w-5 h-5 text-purple-600" />
                    </div>
                    {selectedStaff.responseTimeRateByLastWeek &&
                      (selectedStaff.responseTimeRateByLastWeek > 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-green-600" />
                      ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Avg Response Time
                  </p>
                  <p className="text-xl font-bold">
                    {selectedStaff.averageResponseTime ?? "NA"}
                  </p>
                  {selectedStaff.responseTimeRateByLastWeek && (
                    <p className="text-[11px] text-green-600 mt-1">
                      {selectedStaff.responseTimeRateByLastWeek}%{" "}
                      {selectedStaff.responseTimeRate > 0 ? "faster" : "slower"}{" "}
                      than last week
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg border bg-gradient-to-br from-green-50/50 to-white">
                <p className="text-[11px] text-muted-foreground mb-1">
                  Resolution Rate
                </p>
                <p className="text-lg font-bold text-green-600">
                  {analytics?.metrics?.resolutionRate}%
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-gradient-to-br from-blue-50/50 to-white">
                <p className="text-[11px] text-muted-foreground mb-1">
                  First Response
                </p>
                <p className="text-lg font-bold text-blue-600">
                  {analytics?.metrics?.firstResponseTime ?? "NA"}
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-gradient-to-br from-orange-50/50 to-white">
                <p className="text-[11px] text-muted-foreground mb-1">
                  Avg Handling
                </p>
                <p className="text-lg font-bold text-orange-600">
                  {analytics?.metrics?.avgHandlingTime ?? "NA"}
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-gradient-to-br from-purple-50/50 to-white">
                <p className="text-[11px] text-muted-foreground mb-1">
                  Active Chats
                </p>
                <p className="text-lg font-bold text-purple-600">
                  {selectedStaff.totalAssignedConversations}
                </p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Weekly Performance Trend
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  Messages handled per day
                </p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={graphdata} margin={{ top: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="messageCount"
                      fill="#5275baff"
                      maxBarSize={50}
                      radius={10}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent Conversations</CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  Last 4 customer interactions
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="p-3 text-left text-[11px] font-medium">
                          Customer
                        </th>
                        <th className="p-3 text-left text-[11px] font-medium">
                          Duration
                        </th>
                        <th className="p-3 text-left text-[11px] font-medium">
                          Time
                        </th>
                        <th className="p-3 text-left text-[11px] font-medium">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics?.recentConversations?.map((conv) => (
                        <tr
                          key={conv.id}
                          className="border-b last:border-b-0 hover:bg-muted/20"
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <CreativeAvatar
                                name={conv.customer.name}
                                size="sm"
                                platform={MessagePlatform.WEBCHAT}
                              />
                              <span className="text-xs font-medium">
                                {conv.customer.name}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {conv.duration}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {conv.lastRespondedAt}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                conv.status === "resolved"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-orange-50 text-orange-700 border-orange-200"
                              }`}
                            >
                              {conv.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setOpened(false)}>
                Close
              </Button>
              {/* <Button className="bg-rateup-blue hover:bg-rateup-blue/90">
                    <FileText className="w-4 h-4 mr-2" />
                    Export Full Report
                  </Button> */}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StaffStatsDetailDialog;
