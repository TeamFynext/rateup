"use client";

import { useState } from "react";

import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  Award,
  ChartNoAxesColumnIncreasing,
  Filter,
  RefreshCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import ConversationStatsAgentPerformance from "./ConversationStatsAgentPerformance";
import ConversationStatsOverview from "./ConversationStatsOverview";
import DateRangeSelector from "./DateRangeSelector";

const Analytics = () => {
  const [dateRange, setDateRange] = useState({
    key: "today",
    range: [dayjs().startOf("day").toDate(), new Date()],
  });
  const queryClient = useQueryClient();
  function refresh() {
    queries.map((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    queryClient.invalidateQueries({ queryKey: ["conversationOverview"] });
    queryClient.invalidateQueries({
      queryKey: ["conversationAverageResponseTime"],
    });
    queryClient.invalidateQueries({
      queryKey: ["ConversationAccountDistribution"],
    });
    queryClient.invalidateQueries({ queryKey: ["ConversationQuickStats"] });
    queryClient.invalidateQueries({
      queryKey: ["StaffPerformanceonConversation"],
    });
  }
  const queries = [
    ["conversationOverview"],
    ["conversationAverageResponseTime"],
    ["ConversationAccountDistribution"],
    ["ConversationQuickStats"],
    ["StaffPerformanceonConversation"],
    ["StaffDetailedConversationAnalytics"],
  ];

  const fetchCounts = queries.map((key) => useIsFetching({ queryKey: key }));

  const isFetching = fetchCounts.some((count) => count > 0);

  return (
    <div className="p-4 flex flex-col gap-4 w-full">
      <Card className="flex flex-row p-4 justify-between items-center gap-4 w-full bg-gradient-to-r from-rateup-blue/10 via-rateup-orange/5 to-rateup-blue/10 rounded-lg p-3 border border-rateup-blue/20">
        <div className="flex gap-2 items-center">
          <div className="bg-gradient-to-br from-rateup-blue to-blue-600 items-center justify-center rounded-md p-2 text-white">
            <ChartNoAxesColumnIncreasing />
          </div>
          <div className="flex flex-col">
            <h2 className="text-lg">Inbox Analytics</h2>
            <p className="text-muted-foreground text-sm">
              Real-time overview of your staff performance and activities
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="outline" onClick={() => refresh()}>
            <RefreshCcw className={`${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <div className="flex gap-1">
            <span className="text-sm text-muted-foreground flex gap-1 items-center">
              <Filter className="w-3 h-3" /> Filter by:
            </span>
            <DateRangeSelector value={dateRange} onChange={setDateRange} />
          </div>
        </div>
      </Card>
      <Tabs defaultValue="overview">
        <TabsList className="w-full rounded-2xl">
          <TabsTrigger
            className="data-[state=active]:bg-blue-100 data-[state=active]:border-0 data-[state=active]:text-blue-500 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-xs rounded-l-lg"
            value="overview"
          >
            <ChartNoAxesColumnIncreasing className="mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            className="data-[state=active]:bg-blue-100 data-[state=active]:border-0  data-[state=active]:text-blue-500 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-xs rounded-r-lg"
            value="agent-performance"
          >
            <Award className="mr-1" /> Agent Performance
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <ConversationStatsOverview dateRange={dateRange} />
        </TabsContent>
        <TabsContent value="agent-performance">
          <ConversationStatsAgentPerformance />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
