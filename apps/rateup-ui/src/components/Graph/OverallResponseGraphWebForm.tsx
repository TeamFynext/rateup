import {
  IconCalendarEventFilled,
  IconMoodSmile,
  IconStarFilled,
  IconTargetArrow,
  IconUsersGroup,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import React from "react";
import type { ComponentType, ReactNode } from "react";
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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

const TIME_PERIODS = [
  { label: "Hourly", value: "hourly" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
];

const OverallResponseGraphWebForm = ({
  data,
  timePeriod,
  setTimePeriod,
  isLoading,
}: {
  data: Array<Record<string, unknown>> | undefined;
  timePeriod: string;
  setTimePeriod: (period: string) => void;
  isLoading: boolean;
}) => {
  if (isLoading) {
    return <div className="w-full h-100 animate-pulse bg-gray-100 rounded-xl" />;
  }

  return (
    <div className="bg-white p-4 rounded-2xl shadow border border-gray-200 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
        <div className="text-xl font-bold text-gray-800">Happiness Journey</div>

        {/* Legends */}
        <div className="flex flex-wrap gap-4 items-center text-xs font-medium">
          <div className="flex items-center gap-1">
            <div className="bg-[#004F98] w-2 h-2 rounded-full" />
            <span>Responses</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="bg-[#66BF00] w-2 h-2 rounded-full" />
            <span>Happiness Index</span>
          </div>
        </div>

        {/* Time Selector */}
        <div className="flex items-center gap-2">
          <div className="bg-gray-100 p-1 rounded-md flex items-center justify-center">
            <IconCalendarEventFilled color="#343A40" stroke={1} size={28} />
          </div>
          <Select
            items={TIME_PERIODS}
            value={timePeriod}
            onValueChange={(val) => setTimePeriod(val ?? "")}
          >
            <SelectTrigger size="sm" className="w-30">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {TIME_PERIODS.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chart */}
      <div className="overflow-x-auto">
        <ResponsiveContainer minWidth={600} height={400}>
          <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="lineColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#000" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#000" stopOpacity={0.1} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" fontSize={12} tickLine={false} height={40} interval={0} />
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
            <Bar yAxisId="left" dataKey="detractors" stackId="a" fill="#FF6161" barSize={20} />
            <Bar yAxisId="left" dataKey="passives" stackId="a" fill="#FFC107" barSize={20} />
            <Bar yAxisId="left" dataKey="promoters" stackId="a" fill="#00BF83" barSize={20} />
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
    </div>
  );
};

/**
 * One point of the happiness-journey series. Recharts hands the tooltip the raw datum it was
 * given, so these are the fields `data` carries; every one is read defensively because the
 * series is assembled per time period.
 */
interface HappinessDatum {
  date?: string;
  total?: number;
  promoters?: number;
  passives?: number;
  detractors?: number;
  npsScore?: number;
  avgNPSRating?: number;
  happinessIndex?: number;
}

/**
 * `active`/`payload`/`label` are injected by recharts' `<Tooltip content={...} />`, which is why
 * they are optional here — only `timePeriod` is passed at the call site.
 */
const CustomTooltip = ({
  active,
  payload,
  label,
  timePeriod,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; payload: HappinessDatum }>;
  label?: string | number;
  timePeriod?: string;
}) => {
  if (active && payload && payload.length) {
    const d = payload.find((p) => p.dataKey === "date")?.payload || payload[0].payload;

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
    const npsScore = Math.round(d.npsScore ?? 0);
    const averageNPSRating = d.avgNPSRating ?? 0;
    const happinessIndex = d.happinessIndex ?? 0;

    return (
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 px-4 py-3 min-w-[300px] text-[13px] text-gray-800 flex flex-col gap-2">
        <p className="text-sm font-semibold">{labelFormatted}</p>

        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
          <Metric label="NPS Score" icon={IconTargetArrow} value={npsScore} />
          <Metric
            label="Average NPS Rating"
            icon={IconStarFilled}
            value={averageNPSRating.toFixed(1)}
          />
          <Metric label="Happiness Index" icon={IconMoodSmile} value={happinessIndex.toFixed(1)} />
          <Metric label="Total Responses" icon={IconUsersGroup} value={total} />
        </div>

        <div className="flex flex-wrap justify-between gap-4 text-xs pt-3 mt-3 border-t border-dashed border-gray-300">
          <Breakdown
            label="Promoters"
            value={((promoters / total) * 100 || 0).toFixed(0)}
            color="green"
          />
          <Breakdown
            label="Passives"
            value={((passives / total) * 100 || 0).toFixed(0)}
            color="yellow"
          />
          <Breakdown
            label="Detractors"
            value={((detractors / total) * 100 || 0).toFixed(0)}
            color="red"
          />
        </div>
      </div>
    );
  }

  return null;
};

const Metric = ({
  label,
  icon: Icon,
  value,
}: {
  label: string;
  icon: ComponentType<{ className?: string; size?: number }>;
  value: ReactNode;
}) => (
  <div className="flex justify-between items-center gap-2">
    <div className="flex items-center gap-2 text-blue-600">
      <Icon size={18} className="text-blue-500" />
      <span className="text-gray-700">{label}</span>
    </div>
    <div className="font-bold text-blue-600 text-sm">{value}</div>
  </div>
);

const Breakdown = ({
  label,
  value,
  color,
}: {
  label: string;
  value: ReactNode;
  color: "green" | "yellow" | "red";
}) => {
  const colorMap = {
    green: "text-green-600 bg-green-500",
    yellow: "text-yellow-600 bg-yellow-400",
    red: "text-destructive bg-destructive",
  };
  return (
    <div className={`flex items-center gap-1 ${colorMap[color].split(" ")[0]}`}>
      <div className={`w-2 h-2 rounded-full ${colorMap[color].split(" ")[1]}`} />
      <span className="text-gray-700">{label}</span>
      <span className={`font-semibold ${colorMap[color].split(" ")[0]}`}>{value}%</span>
    </div>
  );
};

export default React.memo(OverallResponseGraphWebForm);
