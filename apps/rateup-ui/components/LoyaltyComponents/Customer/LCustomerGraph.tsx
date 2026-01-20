import React from "react";

import { Group, Stack, Text } from "@mantine/core";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { LoyaltyActionType } from "@/types/enums";
import { LCustomerStats } from "@/app/dashboard/loyalty/customers/[customerId]/page";
import { CustomTooltip } from "@/components/Survey/Result/Charts/QuestionBarChart";
import { stringToColour } from "@/utils/essential";

import { getActionColor } from "../utils";
import { LPointStats } from "./LCustomerPointsView";

function getBarColor(bar) {
  switch (bar) {
    case LoyaltyActionType.CustomerRegistration:
    case LoyaltyActionType.DirectPurchase:
    case LoyaltyActionType.ReferralPurchase:
      return getActionColor(bar);
    default:
      return stringToColour(bar);
  }
}

const LCustomerGraph = ({ title, data, activeStats }) => {
  const bars = Object.keys(data[0] || {}).filter((k) => k !== "date");
  const isPointData = [
    LCustomerStats.PointsEarned,
    LCustomerStats.Referrals,
    LCustomerStats.TotalSpent,
    ...Object.values(LPointStats),
  ].includes(activeStats);
  const total = data.reduce((sum, i) => {
    if (isPointData)
      sum +=
        i[
          activeStats === LCustomerStats.PointsEarned
            ? LPointStats.TotalPoints
            : activeStats
        ];
    else bars.map((b) => (sum += i[b]));
    return sum;
  }, 0);
  return (
    <Stack>
      <Group gap={3}>
        <Text c={"var(--grey-color-6)"} fw={500}>
          {title}
        </Text>
        <Text c="var(--tertiary-color)" fw={800} size="xl">
          {activeStats === LCustomerStats.TotalSpent ? "$" : ""}
          {total}
        </Text>
      </Group>
      <ResponsiveContainer width={"100%"} height={390}>
        <BarChart
          width={600}
          height={300}
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
          maxBarSize={20}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          {bars.map((bar) => (
            <Bar
              dataKey={bar}
              fill={getBarColor(bar)}
              stackId={isPointData ? undefined : "a"}
              key={bar}
              radius={5}
              isAnimationActive
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Stack>
  );
};

export default LCustomerGraph;
