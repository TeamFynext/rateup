import { useTranslation } from "react-i18next";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { LoyaltyDashboardStats } from "@/backend/loyalty/dashboard/dashboard.query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";

import type { ProgramState } from "../program/programState.ts";
import {
  memberGrowthSentence,
  pointsFlowSentence,
  rewardsSentence,
  tierSentence,
} from "./chartSentences.ts";

/** Four charts, each with the one sentence it exists to say. */
export function OverviewCharts({
  programState,
  dashboard,
  pointsName,
}: Readonly<{
  programState: ProgramState;
  dashboard: LoyaltyDashboardStats | undefined;
  pointsName: string;
}>) {
  const { t } = useTranslation();
  const draft = programState === "draft";
  const timeline = dashboard?.timeline ?? [];
  const tiers = (dashboard?.tierDistribution ?? []).filter((tier) => tier.id !== null);
  const tierTotal = tiers.reduce((sum, tier) => sum + tier.value, 0);
  const rewards = dashboard?.popularRewards ?? [];
  const rewardMax = Math.max(1, ...rewards.map((r) => r.redeemed));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartCard
        title={t("Member growth")}
        sentence={
          draft || !dashboard
            ? t("Your first members will appear here.")
            : memberGrowthSentence(t, dashboard)
        }
      >
        {!draft && timeline.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
                labelStyle={{ color: "var(--foreground)" }}
              />
              <Area
                type="monotone"
                dataKey="members"
                name={t("Members")}
                stroke="var(--chart-1)"
                fill="var(--chart-1)"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      <ChartCard
        title={t("{points} issued and redeemed", { points: pointsName })}
        sentence={
          draft || !dashboard
            ? t("Nothing issued yet.")
            : pointsFlowSentence(t, dashboard, pointsName)
        }
      >
        {!draft && timeline.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
                labelStyle={{ color: "var(--foreground)" }}
              />
              <Bar
                dataKey="issued"
                name={t("Issued")}
                fill="var(--chart-1)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="redeemed"
                name={t("Redeemed")}
                fill="var(--chart-2)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      <ChartCard
        title={t("Members by tier")}
        sentence={
          draft || !dashboard
            ? t("Your first members will appear here.")
            : tierSentence(t, dashboard)
        }
      >
        {!draft && tiers.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {tiers.map((tier) => {
              const share = tierTotal ? Math.round((tier.value / tierTotal) * 1000) / 10 : 0;
              return (
                <li key={tier.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-sm">
                    {/* Merchant-chosen hex, so it can only be a dynamic style value. */}
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: tier.color ?? "var(--muted-foreground)" }}
                    />
                    <span className="text-foreground">{tier.name}</span>
                    <span className="ml-auto tabular-nums text-foreground">
                      {tier.value.toLocaleString()}
                    </span>
                    <span className="w-12 text-right tabular-nums text-xs text-muted-foreground">
                      {share}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${share}%`,
                        backgroundColor: tier.color ?? "var(--chart-1)",
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>

      <ChartCard
        title={t("Most redeemed rewards")}
        sentence={draft || !dashboard ? t("Nothing redeemed yet.") : rewardsSentence(t, dashboard)}
      >
        {!draft && rewards.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {rewards.map((reward) => (
              <li key={reward.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="truncate text-foreground">{reward.name}</span>
                  <span className="ml-auto tabular-nums text-foreground">{reward.redeemed}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.round((reward.redeemed / rewardMax) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyChart />
        )}
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  sentence,
  children,
}: Readonly<{ title: string; sentence: string; children: React.ReactNode }>) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription>{sentence}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyChart() {
  return <div className="h-[120px] rounded-lg border border-dashed border-border" aria-hidden />;
}
