import React, { useMemo } from "react";

import { Paper, Stack, Title } from "@mantine/core";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface HappyTrendChartProps {
  questionId: string;
  data: Record<string, any[]>;
}

const HappyChart: React.FC<HappyTrendChartProps> = ({ questionId, data }) => {
  const filteredData = useMemo(() => {
    const trendArray = data?.[questionId] || [];
    return trendArray.map((entry) => ({
      date: entry.date,
      percentage: entry.percentage,
      happy: entry.happy,
      total: entry.total,
    }));
  }, [data, questionId]);

  return (
    <Stack w="100%" align="center">
      <Title order={4}>Happy Response Trend</Title>
      <Paper shadow="md" p="md" withBorder w="100%" maw={800}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={filteredData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
            <Tooltip
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <Paper p="sm" shadow="xl" bg="white">
                    <Title order={6}>{label}</Title>
                    <div>Happy: {payload[0].payload.happy}</div>
                    <div>Total: {payload[0].payload.total}</div>
                    <div>Percentage: {payload[0].payload.percentage}%</div>
                  </Paper>
                ) : null
              }
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="percentage"
              stroke="#4ade80"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="Happy %"
            />
          </LineChart>
        </ResponsiveContainer>
      </Paper>
    </Stack>
  );
};

export default HappyChart;
