import React from "react";

import { Select } from "@mantine/core";
import {
  IconCalendarEventFilled,
  IconMoodSmile,
  IconStarFilled,
  IconTargetArrow,
  IconUsersGroup,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const OverallResponseGraphWebForm = ({
  data,
  timePeriod,
  setTimePeriod,
  isLoading,
  onRefresh,
}) => {
  if (isLoading) {
    return (
      <div className="w-full h-[400px] animate-pulse bg-gray-100 rounded-xl" />
    );
  }

  return (
    <div className="bg-white p-4 rounded-2xl shadow border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <div className="text-xl font-bold text-[#343A40]">
          Happiness Journey
        </div>
        <div className="flex gap-6">
          <div className="flex items-center gap-0.5">
            <div className="bg-[#004F98] w-2 h-2 rounded-full" />
            <div className="text-[10px] font-semibold">Responses</div>
          </div>
          <div className="flex items-center gap-0.5">
            <div className="bg-[#66BF00] w-2 h-2 rounded-full" />
            <div className="text-[10px] font-semibold">Happiness Index</div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <div className="bg-[#F5F5F5] p-1 rounded-md flex items-center justify-center">
            <IconCalendarEventFilled color="#343A40" stroke={1} size={28} />
          </div>
          <Select
            data={[
              { label: "Hourly", value: "hourly" },
              { label: "Daily", value: "daily" },
              { label: "Weekly", value: "weekly" },
            ]}
            value={timePeriod}
            onChange={(val) => setTimePeriod(val)}
            size="sm"
            radius="md"
            className="w-[120px]"
            placeholder="Select"
            variant="default"
          />
        </div>
      </div>

      <div className="relative w-full h-5 mb-2">
        <div className="absolute left-10 top-5 flex items-center gap-1">
          <div className="bg-[#004F98] w-2 h-2 rounded-full" />
        </div>
        <div className="absolute right-14 top-5 flex items-center gap-1">
          <div className="bg-[#66BF00] w-2 h-2 rounded-full" />
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 20, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="lineColor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#000" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#000" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            fontSize={12}
            tickLine={false}
            height={40}
            interval={0}
          ></XAxis>
          <YAxis
            yAxisId="left"
            orientation="left"
            allowDecimals={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 10]}
            tickLine={false}
            interval={0}
          />
          <Tooltip content={<CustomTooltip timePeriod={timePeriod} />} />
          <Bar
            yAxisId="left"
            dataKey="detractors"
            stackId="a"
            fill="#FF6161"
            barSize={20}
          />
          <Bar
            yAxisId="left"
            dataKey="passives"
            stackId="a"
            fill="#FFC107"
            barSize={20}
          />
          <Bar
            yAxisId="left"
            dataKey="promoters"
            stackId="a"
            fill="#00BF83"
            barSize={20}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="promoters"
            stroke="black"
            strokeWidth={2}
            dot={{ r: 3.5, fill: "black" }}
            activeDot={{ r: 3.5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

const CustomTooltip = ({
  active,
  payload,
  label,
  timePeriod,
}: {
  active?: any;
  payload?: any;
  label?: any;
  timePeriod?: any;
}) => {
  if (active && payload && payload.length) {
    const d =
      payload.find((p: any) => p.dataKey === "date")?.payload ||
      payload[0].payload;

    const labelFormatted =
      timePeriod === "hourly"
        ? `Today ${label}`
        : timePeriod === "weekly"
          ? `Week ${label}`
          : `${dayjs(d?.date).format("MMMM Do")}`;

    const total = d.total ?? 0;
    const promoters = d.promoters ?? 0;
    const passives = d.passives ?? 0;
    const detractors = d.detractors ?? 0;
    const npsScore = d.npsScore ?? 0;
    const averageNPSRating = d.avgNPSRating ?? 0;
    const happinessIndex = d.happinessIndex ?? 0;

    return (
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 px-4 py-3 min-w-[300px] text-[13px] text-gray-800 flex flex-col gap-2 items-stretch justify-between">
        <p className="text-sm font-semibold self-start">{labelFormatted}</p>

        <div className="grid grid-cols-2 gap-y-3 gap-x-6">
          {/* NPS Score */}
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 text-blue-600">
              <IconTargetArrow size={18} className="text-blue-500" />
              <span className="text-gray-700">NPS Score</span>
            </div>
            <div className="text-right font-bold text-blue-600">
              {npsScore > 0 ? `+${npsScore}` : npsScore}
            </div>
          </div>

          {/* Average Rating */}
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 text-blue-600">
              <IconStarFilled size={18} className="text-blue-500" />
              <span className="text-gray-700">Average NPS Rating</span>
            </div>
            <div className="text-right font-bold text-blue-600">
              {averageNPSRating.toFixed(1)}
            </div>
          </div>

          {/* Happiness Index */}
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 text-blue-600">
              <IconMoodSmile size={18} className="text-blue-500" />
              <span className="text-gray-700">Happiness Index</span>
            </div>
            <div className="text-right font-bold text-blue-600">
              {happinessIndex.toFixed(1)}
            </div>
          </div>

          {/* Total Responses */}
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 text-blue-600">
              <IconUsersGroup size={18} className="text-blue-500" />
              <span className="text-gray-700">Total Responses</span>
            </div>
            <div className="text-right font-bold text-blue-600">{total}</div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="flex justify-between gap-4 text-xs pt-3 mt-3 border-t border-dashed border-gray-300">
          <div className="flex items-center gap-1 text-green-600">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-gray-700">Promoters</span>
            <span className="font-semibold text-green-600">
              {((promoters / total) * 100 || 0).toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center gap-1 text-yellow-600">
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="text-gray-700">Passives</span>
            <span className="font-semibold text-yellow-600">
              {((passives / total) * 100 || 0).toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center gap-1 text-red-600">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-gray-700">Detractors</span>
            <span className="font-semibold text-red-500">
              {((detractors / total) * 100 || 0).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default React.memo(OverallResponseGraphWebForm);
