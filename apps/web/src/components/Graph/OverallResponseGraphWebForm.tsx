import {
  IconMoodSmile,
  IconStarFilled,
  IconTargetArrow,
  IconUsersGroup,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import React from "react";
import type { ComponentType, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";

import { NPS_COLORS } from "@/components/common/sentimentScale.ts";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from "@/components/ui/chart.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

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
  const { t } = useTranslation();
  // The bars are outcomes (detractor → promoter), so they wear the sentiment scale; the
  // index line is a different measure on its own axis and stays neutral ink.
  const config: ChartConfig = {
    detractors: { label: t("Detractors"), color: NPS_COLORS.detractor },
    passives: { label: t("Passives"), color: NPS_COLORS.passive },
    promoters: { label: t("Promoters"), color: NPS_COLORS.promoter },
    happinessIndex: { label: t("Happiness Index"), color: "var(--foreground)" },
  };
  // A period with no responses has no index, not an index of 0; the line skips it.
  const series = data?.map((d) => (Number(d.total ?? 0) > 0 ? d : { ...d, happinessIndex: null }));

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-base">{t("Happiness Journey")}</CardTitle>
        <CardDescription>
          {t("Responses by sentiment, with the happiness index (0–10) on the right axis.")}
        </CardDescription>
        <CardAction>
          <Select
            items={TIME_PERIODS}
            value={timePeriod}
            onValueChange={(val) => setTimePeriod(val ?? "")}
          >
            <SelectTrigger size="sm" className="w-30" aria-label={t("Time period")}>
              <SelectValue placeholder={t("Select")} />
            </SelectTrigger>
            <SelectContent>
              {TIME_PERIODS.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="min-w-0">
        {isLoading ? (
          <Skeleton className="h-80 w-full" />
        ) : (
          <div className="overflow-x-auto">
            <ChartContainer config={config} className="h-80 w-full min-w-150">
              <ComposedChart data={series} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={16}
                />
                <YAxis
                  yAxisId="left"
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <ChartTooltip content={<CustomTooltip timePeriod={timePeriod} />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  yAxisId="left"
                  dataKey="detractors"
                  stackId="a"
                  fill="var(--color-detractors)"
                  maxBarSize={28}
                />
                <Bar
                  yAxisId="left"
                  dataKey="passives"
                  stackId="a"
                  fill="var(--color-passives)"
                  maxBarSize={28}
                />
                <Bar
                  yAxisId="left"
                  dataKey="promoters"
                  stackId="a"
                  fill="var(--color-promoters)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="happinessIndex"
                  connectNulls
                  stroke="var(--color-happinessIndex)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--color-happinessIndex)" }}
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
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
      <div className="flex min-w-72 flex-col gap-2 rounded-lg border border-border bg-popover px-3 py-2.5 text-xs text-popover-foreground shadow-xl">
        <p className="font-medium">{labelFormatted}</p>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <Metric label="NPS Score" icon={IconTargetArrow} value={npsScore} />
          <Metric
            label="Average NPS Rating"
            icon={IconStarFilled}
            value={averageNPSRating.toFixed(1)}
          />
          <Metric label="Happiness Index" icon={IconMoodSmile} value={happinessIndex.toFixed(1)} />
          <Metric label="Total Responses" icon={IconUsersGroup} value={total} />
        </div>

        <div className="flex flex-wrap justify-between gap-3 border-t border-dashed border-border pt-2">
          <Breakdown
            label="Promoters"
            value={((promoters / total) * 100 || 0).toFixed(0)}
            color={NPS_COLORS.promoter}
          />
          <Breakdown
            label="Passives"
            value={((passives / total) * 100 || 0).toFixed(0)}
            color={NPS_COLORS.passive}
          />
          <Breakdown
            label="Detractors"
            value={((detractors / total) * 100 || 0).toFixed(0)}
            color={NPS_COLORS.detractor}
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
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Icon size={14} />
      <span>{label}</span>
    </div>
    <div className="font-mono font-medium tabular-nums text-foreground">{value}</div>
  </div>
);

const Breakdown = ({ label, value, color }: { label: string; value: ReactNode; color: string }) => (
  <div className="flex items-center gap-1.5">
    <span className="size-2 rounded-[2px]" style={{ backgroundColor: color }} aria-hidden />
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium tabular-nums text-foreground">{value}%</span>
  </div>
);

export default React.memo(OverallResponseGraphWebForm);
