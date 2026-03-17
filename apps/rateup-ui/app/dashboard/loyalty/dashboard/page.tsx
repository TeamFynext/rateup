"use client";

import { useState } from "react";

import { format } from "date-fns";
import {
  Award,
  Clock,
  Gift,
  Loader2,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useLoyaltyDashboardData } from "@/backend/loyalty/dashboard/dashboard.api";
import InfoButton from "@/components/Button/InfoButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { docsPath } from "@/utils/constants";

import { LoyaltyOnboarding } from "./LoyaltyOnboarding";

export default function LoyaltyPrograms() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Queries
  const { data: dashboardData, isLoading: isLoadingDashboard } =
    useLoyaltyDashboardData();

  const isFirstTimeUser = false; // !isLoadingDashboard && !dashboardData?.programExists;

  // Time filter state
  const [timeFilter, setTimeFilter] = useState("7days");

  // Analytics data - Points Activity
  const pointsActivityData =
    dashboardData?.analytics?.pointsEarnedVsRedeemed || [];

  // Customer Growth data
  const customerGrowthData =
    dashboardData?.analytics?.customerGrowthOverTime?.map((d) => ({
      date: d.date,
      customers: d.totalCustomers,
    })) || [];

  // Customer Tier Distribution
  const colors = ["#CD7F32", "#94A3B8", "#EAB308", "#CBD5E1"];
  const tierDistributionData =
    dashboardData?.tierBreakdown?.map((t, index) => ({
      name: t.name,
      value: t.count,
      percentage: dashboardData.summary?.totalCustomers
        ? Math.round((t.count / dashboardData.summary.totalCustomers) * 100)
        : 0,
      color: colors[index % colors.length],
    })) || [];

  // Most Popular Rewards
  const popularRewardsData =
    dashboardData?.popularRewards?.map((r) => ({
      name: r.name,
      redemptions: r.count,
    })) || [];

  // Handle onboarding completion
  const handleOnboardingComplete = () => {
    // setIsFirstTimeUser(false); // Removed as it is computed
    setShowOnboarding(false);
    window.location.reload();
  };

  // Show onboarding when user clicks setup button or if program doesn't exist
  if (isFirstTimeUser || showOnboarding) {
    if (isLoadingDashboard) {
      return (
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    return <LoyaltyOnboarding onComplete={handleOnboardingComplete} />;
  }
  const dateLabelFormatter = (date) => format(date, "dd/MM/yyyy");

  return (
    <div className="flex h-full">
      {/* Main Content Area */}
      <div className="flex-1 overflow-auto ">
        <div className="space-y-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl mb-1">Loyalty Overview</h1>
                <p className="text-sm text-muted-foreground">
                  Track performance and customer engagement
                </p>
              </div>
              <InfoButton docUrl={`${docsPath}/loyality`} />
            </div>

            {/* Setup Banner for First Time Users */}
            {isFirstTimeUser && (
              <Card className="border-2 border-[#1873E8]  bg-linear-to-br from-blue-50 to-white overflow-hidden">
                <CardContent>
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-[#1873E8] to-[#FF9500] flex items-center justify-center shrink-0">
                      <Gift className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl mb-2">
                        Welcome to Loyalty Programs! 🎉
                      </h2>
                      <p className="text-muted-foreground mb-6 max-w-2xl">
                        Build customer loyalty and drive repeat purchases with a
                        customized rewards program. Set up earning rules, tiers,
                        and rewards in just a few minutes to start engaging your
                        customers.
                      </p>
                      <div className="flex items-center gap-4">
                        <Button
                          onClick={() => setShowOnboarding(true)}
                          size="lg"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Set Up Loyalty Program
                        </Button>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>Takes about 5 minutes</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Feature highlights */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-6 border-t border-gray-200">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#1873E8]/10 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-4 h-4 text-[#1873E8]" />
                      </div>
                      <div>
                        <p className="font-medium text-sm mb-1">
                          Earning Rules
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Define how customers earn points
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#1873E8]/10 flex items-center justify-center shrink-0">
                        <Award className="w-4 h-4 text-[#1873E8]" />
                      </div>
                      <div>
                        <p className="font-medium text-sm mb-1">
                          Customer Tiers
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Reward your most loyal customers
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#1873E8]/10 flex items-center justify-center shrink-0">
                        <Gift className="w-4 h-4 text-[#1873E8]" />
                      </div>
                      <div>
                        <p className="font-medium text-sm mb-1">
                          Rewards Catalog
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Create attractive redemption options
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Performance Metrics */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#1873E8]" />
                <h3 className="text-sm font-semibold">Performance Metrics</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Customers */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5 text-[#1873E8]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-muted-foreground">
                            Total Customers
                          </p>
                          <div className="flex items-center gap-1 text-green-600 text-xs">
                            <TrendingUp className="w-3 h-3" />
                            <span className="font-semibold">+12.5%</span>
                          </div>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <p className="text-2xl font-semibold">
                            {dashboardData?.summary?.totalCustomers || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Points Issued */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                        <Award className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-muted-foreground">
                            Points Issued
                          </p>
                          <div className="flex items-center gap-1 text-green-600 text-xs">
                            <TrendingUp className="w-3 h-3" />
                            <span className="font-semibold">+8.2%</span>
                          </div>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <p className="text-2xl font-semibold">
                            {dashboardData?.summary?.pointsIssued || 0}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            pts
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Redemptions */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                        <Gift className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-muted-foreground">
                            Points Redeemed
                          </p>
                          <div className="flex items-center gap-1 text-green-600 text-xs">
                            {/* <TrendingUp className="w-3 h-3" />
                            <span className="font-semibold">+5%</span> */}
                          </div>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <p className="text-2xl font-semibold">
                            {dashboardData?.summary?.pointsRedeemed || 0}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            pts
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Analytics Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#1873E8]" />
                  <h3 className="text-sm font-semibold">Analytics</h3>
                </div>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="w-45 border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7days">Last 7 days</SelectItem>
                    <SelectItem value="30days">Last 30 days</SelectItem>
                    <SelectItem value="3months">Last 3 months</SelectItem>
                    <SelectItem value="6months">Last 6 months</SelectItem>
                    <SelectItem value="1year">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Points Activity Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Points Activity</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Points earned vs redeemed over time
                  </p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={pointsActivityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#666", fontSize: 12 }}
                        tickFormatter={dateLabelFormatter}
                      />
                      <YAxis tick={{ fill: "#666", fontSize: 12 }} />
                      <Tooltip labelFormatter={dateLabelFormatter} />
                      <Legend />
                      <Bar
                        dataKey="earned"
                        fill="#10b981"
                        name="Points Earned"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="redeemed"
                        fill="#8b5cf6"
                        name="Points Redeemed"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Customer Growth - Full Width */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Growth</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Total customers over time
                  </p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={customerGrowthData}>
                      <defs>
                        <linearGradient
                          id="colorCustomers"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#1873E8"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#1873E8"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#666", fontSize: 12 }}
                        tickFormatter={dateLabelFormatter}
                      />
                      <YAxis tick={{ fill: "#666", fontSize: 12 }} />
                      <Tooltip labelFormatter={dateLabelFormatter} />
                      <Area
                        type="monotone"
                        dataKey="customers"
                        stroke="#1873E8"
                        strokeWidth={2}
                        fill="url(#colorCustomers)"
                        name="Total Customers"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Customer Tier Distribution & Most Popular Rewards Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Customer Tier Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Tier Distribution</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Breakdown of customers by tier level
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {tierDistributionData.map((tier, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: tier.color }}
                              />
                              <span className="font-medium text-gray-700">
                                {tier.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-muted-foreground">
                                {tier.value} members
                              </span>
                              <span className="font-semibold min-w-12 text-right">
                                {tier.percentage}%
                              </span>
                            </div>
                          </div>
                          <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                              style={{
                                backgroundColor: tier.color,
                                width: `${tier.percentage}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Most Popular Rewards */}
                <Card>
                  <CardHeader>
                    <CardTitle>Most Popular Rewards</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Top redeemed rewards
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={popularRewardsData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          type="number"
                          tick={{ fill: "#666", fontSize: 12 }}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          tick={{ fill: "#666", fontSize: 12 }}
                          width={120}
                        />
                        <Tooltip labelFormatter={dateLabelFormatter} />
                        <Bar
                          dataKey="redemptions"
                          fill="#1873E8"
                          name="Redemptions"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
