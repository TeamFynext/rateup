// Extracted verbatim from the `/dashboard/loyalty/dashboard/` route so the route file carries routing
// config only. Behaviour is unchanged.

import dayjs from "dayjs";
import {
  Award,
  Gift,
  Package,
  Tag,
  Ticket,
  TrendingUp,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useLoyaltyDashboardData } from "@/backend/loyalty/dashboard/dashboard.api";
import InfoButton from "@/components/Button/InfoButton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { PremiumAvatar } from "@/components/ui/premium-avatar.tsx";
import { docsPath } from "@/utils/constants.ts";

function ChangeIndicator({ change }: Readonly<{ change: number | null }>) {
  if (change === null || change === undefined) return null;
  const isPositive = change >= 0;
  return (
    <p
      className={`text-xs mt-1 flex items-center gap-1 ${isPositive ? "text-chart-2" : "text-destructive"}`}
    >
      <TrendingUp className="w-3 h-3" />
      {isPositive ? "+" : ""}
      {change}% from last month
    </p>
  );
}

export function LoyaltyPrograms() {
  const { t } = useTranslation();
  // Queries
  const { data: dashboardData } = useLoyaltyDashboardData();

  // Customer Tier Distribution
  const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];
  const totalTierMembers =
    dashboardData?.tierDistribution?.reduce((sum, tier) => sum + tier.value, 0) ?? 0;
  const tierDistributionData =
    dashboardData?.tierDistribution?.map((tier, index) => ({
      name: tier.name,
      value: tier.value,
      percentage: totalTierMembers ? Math.round((tier.value / totalTierMembers) * 100) : 0,
      fill: colors[index % colors.length],
    })) ?? [];

  // Most Popular Rewards
  const popularRewardsData =
    dashboardData?.popularRewards?.map((r) => ({
      name: r.name,
      redemptions: r.count,
    })) ?? [];

  return (
    <div className="flex h-full">
      {/* Main Content Area */}
      <div className="flex-1 overflow-auto px-1 pb-1 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl mb-1">{t("Overview")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("Loyalty program performance and insights")}
            </p>
          </div>
          <InfoButton docUrl={`${docsPath}/loyality`} />
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t("Total Members")}</p>
                  <p className="text-2xl font-semibold">
                    {dashboardData?.summary?.totalMembers ?? 0}
                  </p>
                  <ChangeIndicator change={dashboardData?.summary?.totalMembersChange ?? null} />
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t("Active This Month")}</p>
                  <p className="text-2xl font-semibold">
                    {dashboardData?.summary?.activeThisMonth ?? 0}
                  </p>
                  <ChangeIndicator change={dashboardData?.summary?.activeThisMonthChange ?? null} />
                </div>
                <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-chart-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t("Points Issued")}</p>
                  <p className="text-2xl font-semibold">
                    {dashboardData?.summary?.pointsIssued ?? 0}
                  </p>
                  <ChangeIndicator change={dashboardData?.summary?.pointsIssuedChange ?? null} />
                </div>
                <div className="w-10 h-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-chart-3" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t("Rewards Redeemed")}</p>
                  <p className="text-2xl font-semibold">
                    {dashboardData?.summary?.rewardsRedeemed ?? 0}
                  </p>
                  <ChangeIndicator change={dashboardData?.summary?.rewardsRedeemedChange ?? null} />
                </div>
                <div className="w-10 h-10 rounded-lg bg-chart-4/10 flex items-center justify-center">
                  <Award className="w-5 h-5 text-chart-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Member Growth Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Member Growth")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={dashboardData?.memberGrowth ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="members"
                    stroke="var(--chart-1)"
                    fill="var(--chart-1)"
                    fillOpacity={0.2}
                    strokeWidth={2}
                    name={t("Total Members")}
                  />
                  <Area
                    type="monotone"
                    dataKey="active"
                    stroke="var(--chart-2)"
                    fill="var(--chart-2)"
                    fillOpacity={0.2}
                    strokeWidth={2}
                    name={t("Active Members")}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Points Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Points Activity")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dashboardData?.pointsActivity ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="issued"
                    fill="var(--chart-3)"
                    name={t("Points Issued")}
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar
                    dataKey="redeemed"
                    fill="var(--chart-4)"
                    name={t("Points Redeemed")}
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tier Distribution and Top Rewards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tier Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Member Distribution by Tier")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={tierDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="value"
                  />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Rewards */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Top Redeemed Rewards")}</CardTitle>
            </CardHeader>
            <CardContent>
              {popularRewardsData
                ?.map((r, i) => ({
                  name: r.name,
                  redeemed: r.redemptions,
                  points: 0,
                  icon: [Tag, Package, Ticket, Gift, Trophy][i % 5],
                }))
                .map((reward) => {
                  const Icon = reward.icon;
                  return (
                    <div
                      key={reward.name}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{reward.name}</p>
                          {reward.points > 0 && (
                            <p className="text-xs text-muted-foreground">{reward.points} points</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{reward.redeemed}</p>
                        <p className="text-xs text-muted-foreground">{t("redeemed")}</p>
                      </div>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Recent Activity")}</CardTitle>
          </CardHeader>
          <CardContent>
            {(dashboardData?.recentActivity ?? []).map((activity) => (
              <div
                key={activity.createdAt}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <PremiumAvatar name={activity.user} size="md" className="shrink-0" />
                  <div>
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{activity.user}</span> {activity.action}{" "}
                      <span className="font-medium">{activity.item}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dayjs(activity.createdAt).format("DD MMM, h:mm A")}
                    </p>
                  </div>
                </div>
                {activity.points !== 0 && (
                  <Badge
                    variant="secondary"
                    className={
                      activity.points > 0
                        ? "bg-chart-2/20 text-chart-2"
                        : "bg-chart-4/20 text-chart-4"
                    }
                  >
                    {activity.points > 0 ? "+" : ""}
                    {activity.points} pts
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
