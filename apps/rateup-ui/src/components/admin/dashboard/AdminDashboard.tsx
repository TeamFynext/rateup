import {
  IconAlertTriangle,
  IconBuilding,
  IconCoin,
  IconRefresh,
  IconRepeat,
  IconUsers,
} from "@tabler/icons-react";
import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import type { MonthlyPoint } from "@/backend/admin/admin.api";
import { useAdminOverview } from "@/backend/admin/admin.query";
import { outcomeColor, outcomeConfig, singleSeriesConfig } from "@/components/common/chartTheme.ts";
import { StatTile } from "@/components/common/StatTile.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";

const RANGES = ["6", "12", "24"] as const;

/** en-IN gives the lakh grouping the rest of the billing copy uses. */
const inr = (amount: number) => `₹${Math.round(amount).toLocaleString("en-IN")}`;
const count = (value: number) => value.toLocaleString("en-US");
const monthLabel = (month: string) =>
  new Date(month).toLocaleDateString("en-US", { month: "short", year: "2-digit" });

/**
 * Recharts hands the tooltip label through as a `ReactNode`, since a chart may key on
 * anything. Ours is always the ISO month string, so narrow it rather than widening
 * `monthLabel` to accept what it cannot format.
 */
const tooltipMonthLabel = (label: unknown) =>
  typeof label === "string" ? monthLabel(label) : String(label ?? "");

/** A month-over-month count. One series, so the title names it and no legend is needed. */
function TrendCard({
  title,
  description,
  data,
}: Readonly<{ title: string; description: string; data: MonthlyPoint[] }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={singleSeriesConfig(title)} className="h-48 w-full">
          <AreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={monthLabel}
            />
            <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={tooltipMonthLabel} />} />
            <Area
              dataKey="value"
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
      </CardContent>
    </Card>
  );
}

/** A ranked comparison where the labels are words, so the bars run horizontally. */
function RankedBars({
  title,
  description,
  data,
  categoryKey,
  valueKey,
  categoryWidth,
  colorFor,
}: Readonly<{
  title: string;
  description: string;
  data: Record<string, unknown>[];
  categoryKey: string;
  valueKey: string;
  categoryWidth: number;
  colorFor?: (category: string) => string;
}>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={outcomeConfig} className="h-56 w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" hide allowDecimals={false} />
            {/* The category is on the axis, so a bar's color never carries the meaning. */}
            <YAxis
              dataKey={categoryKey}
              type="category"
              tickLine={false}
              axisLine={false}
              width={categoryWidth}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey={valueKey} name="value" radius={4} fill="var(--color-value)">
              {colorFor &&
                data.map((row) => (
                  <Cell key={String(row[categoryKey])} fill={colorFor(String(row[categoryKey]))} />
                ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

/**
 * The business at a glance.
 *
 * Form follows the job of each figure: totals are stat tiles because a single number has
 * no shape; money and signups are plotted because their shape is the point; plan mix and
 * the busiest accounts are horizontal bars because the labels are words. No pie chart, and
 * no second y-axis anywhere.
 *
 * Organisations and users are drawn as small multiples rather than two lines in one frame.
 * The theme's `--chart-*` tokens are a sequential ramp, and no pair of them clears the
 * categorical checks — see `chartTheme.ts`.
 */
export function AdminDashboard() {
  const [months, setMonths] = useState<string>("12");
  const { data, isPending, isError, refetch, isRefetching } = useAdminOverview(Number(months));

  return (
    <div className="container mx-auto flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
          <p className="text-sm text-muted-foreground">
            Revenue, growth and product usage across every organisation.
          </p>
        </div>

        {/* Filters sit in one row above the charts and drive every one of them. */}
        <div className="flex items-center gap-2">
          <ToggleGroup
            value={[months]}
            onValueChange={(value) => setMonths(value[0] ?? months)}
            variant="outline"
            size="sm"
          >
            {RANGES.map((range) => (
              <ToggleGroupItem key={range} value={range} aria-label={`${range} months`}>
                {range}m
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Button variant="ghost" size="icon-sm" onClick={() => refetch()} disabled={isRefetching}>
            <IconRefresh className={isRefetching ? "animate-spin" : undefined} />
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
      </div>

      {isError ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconAlertTriangle />
            </EmptyMedia>
            <EmptyTitle>The overview could not be loaded</EmptyTitle>
            <EmptyDescription>
              The figures are aggregated on request — try again, or check the API logs.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Organisations"
              value={count(data.totals.orgs)}
              note={`${count(data.planMix.find((p) => /free/i.test(p.plan))?.orgs ?? 0)} on Free`}
              icon={<IconBuilding className="size-4 text-muted-foreground" />}
            />
            <StatTile
              label="Users"
              value={count(data.totals.users)}
              note={`${count(data.totals.activeUsers)} active`}
              icon={<IconUsers className="size-4 text-muted-foreground" />}
            />
            <StatTile
              label="Recurring revenue"
              value={inr(data.totals.mrr)}
              note={`per month · ${inr(data.totals.mrr * 12)} a year`}
              icon={<IconRepeat className="size-4 text-muted-foreground" />}
            />
            <StatTile
              label="Paying accounts"
              value={count(data.totals.paidSubscriptions)}
              note={`${inr(data.totals.arpa)} average each`}
              icon={<IconCoin className="size-4 text-muted-foreground" />}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue collected</CardTitle>
              <CardDescription>
                {inr(data.totals.revenueThisMonth)} this month · {inr(data.totals.revenueAllTime)}
                {""}
                all time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={singleSeriesConfig("Revenue")} className="h-64 w-full">
                <AreaChart data={data.revenue} margin={{ left: 4, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={monthLabel}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    tickFormatter={(value: number) => inr(value)}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={tooltipMonthLabel}
                        formatter={(value) => inr(Number(value))}
                      />
                    }
                  />
                  <Area
                    dataKey="value"
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
            </CardContent>
          </Card>

          {/* Small multiples: same x-axis, same scale rules, one series each. */}
          <div className="grid gap-4 lg:grid-cols-2">
            <TrendCard
              title="New organisations"
              description="Signups per month"
              data={data.signups.orgs}
            />
            <TrendCard
              title="New users"
              description="Signups per month"
              data={data.signups.users}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <RankedBars
              title="Accounts by plan"
              description="Identity is on the axis, so the bars need only one hue"
              data={data.planMix}
              categoryKey="plan"
              valueKey="orgs"
              categoryWidth={110}
            />
            <RankedBars
              title="Checkout outcomes"
              description="Every order ever placed — a broken payment path shows up here first"
              data={data.orderOutcomes}
              categoryKey="status"
              valueKey="orders"
              categoryWidth={110}
              colorFor={outcomeColor}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Product usage</CardTitle>
              <CardDescription>
                Current counters across every organisation — a snapshot, not a trend
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatTile label="Conversations" value={count(data.usage.conversations)} />
              <StatTile label="Form submissions" value={count(data.usage.formSubmissions)} />
              <StatTile label="Messages" value={count(data.usage.messages)} />
              <StatTile label="AI tokens" value={count(data.usage.aiTokens)} />
              <StatTile label="Automations" value={count(data.usage.campaigns)} />
            </CardContent>
          </Card>

          {data.topOrgsByConversations.length > 0 && (
            <RankedBars
              title="Busiest accounts"
              description="Metered conversations this month — who a capacity conversation is about"
              data={data.topOrgsByConversations}
              categoryKey="org"
              valueKey="conversations"
              categoryWidth={160}
            />
          )}
        </>
      )}
    </div>
  );
}
