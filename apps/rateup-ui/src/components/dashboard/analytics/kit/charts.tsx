import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { deliveryConfig, singleSeriesConfig } from "@/components/common/chartTheme.ts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart.tsx";

/**
 * The section's three chart forms, all on the admin dashboard's rules: horizontal dashed
 * grid only, no tick or axis lines, one ramp hue per chart, the title names the series.
 */

interface SeriesProps {
  data: object[];
  xKey: string;
  yKey: string;
  /** Names the series in the tooltip. */
  label: string;
  formatX?: (value: string) => string;
  /** Formats both the y ticks and the tooltip value. */
  formatY?: (value: number) => string;
}

/** Recharts types the tooltip label as a ReactNode; ours is always the x value. */
const labelOf = (formatX?: (value: string) => string) => (label: unknown) =>
  formatX && typeof label === "string" ? formatX(label) : String(label ?? "");

function tooltipValue(label: string, formatY?: (value: number) => string) {
  return (value: unknown) => (
    <div className="flex w-full items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium tabular-nums text-foreground">
        {formatY ? formatY(Number(value)) : Number(value).toLocaleString()}
      </span>
    </div>
  );
}

/** A shape over time: counts that accumulate, or a level that drifts. */
export function TrendArea({ data, xKey, yKey, label, formatX, formatY }: Readonly<SeriesProps>) {
  return (
    <ChartContainer config={singleSeriesConfig(label)} className="h-60 w-full">
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={formatX}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          allowDecimals={false}
          tickFormatter={formatY}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={labelOf(formatX)}
              formatter={tooltipValue(label, formatY)}
            />
          }
        />
        <Area
          dataKey={yKey}
          name="value"
          type="monotone"
          strokeWidth={2}
          stroke="var(--color-value)"
          fill="var(--color-value)"
          fillOpacity={0.12}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}

/** Discrete per-period counts. */
export function TrendBars({ data, xKey, yKey, label, formatX, formatY }: Readonly<SeriesProps>) {
  return (
    <ChartContainer config={singleSeriesConfig(label)} className="h-60 w-full">
      <BarChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={formatX}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          allowDecimals={false}
          tickFormatter={formatY}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={labelOf(formatX)}
              formatter={tooltipValue(label, formatY)}
            />
          }
        />
        <Bar
          dataKey={yKey}
          name="value"
          fill="var(--color-value)"
          radius={[4, 4, 0, 0]}
          maxBarSize={48}
        />
      </BarChart>
    </ChartContainer>
  );
}

/** Delivered and failed stacked per period, so the bar height is everything sent. */
export function DeliveryBars({
  data,
  xKey,
  labels,
  formatX,
}: Readonly<{
  data: object[];
  xKey: string;
  labels: { delivered: string; failed: string };
  formatX?: (value: string) => string;
}>) {
  return (
    <ChartContainer config={deliveryConfig(labels)} className="h-60 w-full">
      <BarChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={formatX}
        />
        <YAxis tickLine={false} axisLine={false} width={48} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={labelOf(formatX)} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="deliveredMessages"
          stackId="sent"
          fill="var(--color-deliveredMessages)"
          maxBarSize={48}
        />
        <Bar
          dataKey="failedMessages"
          stackId="sent"
          fill="var(--color-failedMessages)"
          radius={[4, 4, 0, 0]}
          maxBarSize={48}
        />
      </BarChart>
    </ChartContainer>
  );
}
