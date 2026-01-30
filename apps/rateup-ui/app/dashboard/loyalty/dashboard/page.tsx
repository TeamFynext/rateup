"use client";

import { useState } from "react";

import {
  Award,
  CheckCircle2,
  Clock,
  Gift,
  Loader2,
  Phone,
  Settings,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
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

import { useCustomerRewardsByPhone } from "@/backend/loyalty/cashier/cashier.query";
import {
  useAssignRewardMutation,
  useAwardPointsMutation,
  useGetLoyaltyCustomerByContactId,
} from "@/backend/loyalty/customer/customer.query";
import { useLoyaltyDashboardData } from "@/backend/loyalty/dashboard/dashboard.api";
import { useLoyaltyEarningRules } from "@/backend/loyalty/earningRules.query";
import { useLoyaltyProgram } from "@/backend/loyalty/program.query";
import {
  useGetRewardByShortCode,
  useRedeemReward,
  useRedeemRewardByShortCode,
} from "@/backend/loyalty/redeems/redeems.query";
import { useGetLoyaltyRewards } from "@/backend/loyalty/reward/reward.query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { LoyaltyOnboarding } from "./LoyaltyOnboarding";

export default function LoyaltyPrograms() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [lookupPhone, setLookupPhone] = useState("");

  // Mutations
  const awardPointsMutation = useAwardPointsMutation();
  const redeemRewardMutation = useRedeemReward();
  const assignRewardMutation = useAssignRewardMutation(() => {
    setAssignRewardOpen(false);
    setAssignRewardForm({
      phoneNumber: "",
      reward: "",
      notes: "",
    });
    setLookupPhone("");
  });

  // Queries
  const { data: allRewards } = useGetLoyaltyRewards();
  const { data: dashboardData, isLoading: isLoadingDashboard } =
    useLoyaltyDashboardData();
  const { data: earningRules } = useLoyaltyEarningRules();

  const getRewardByCode = useGetRewardByShortCode();
  const redeemByCode = useRedeemRewardByShortCode();

  const { data: customerData, isLoading: isLoadingCustomer } =
    useCustomerRewardsByPhone(lookupPhone);

  const isFirstTimeUser = !isLoadingDashboard && !dashboardData?.programExists;

  // Time filter state
  const [timeFilter, setTimeFilter] = useState("7days");

  // Dialog states
  const [issuePointsOpen, setIssuePointsOpen] = useState(false);
  const [issueRewardsOpen, setIssueRewardsOpen] = useState(false);
  const [assignRewardOpen, setAssignRewardOpen] = useState(false);
  const [redeemCodeOpen, setRedeemCodeOpen] = useState(false);
  const [redeemAssignedOpen, setRedeemAssignedOpen] = useState(false);
  const [approvalsOpen, setApprovalsOpen] = useState(false);

  // Short Code Redemption State
  const [shortCode, setShortCode] = useState("");
  const [codeReward, setCodeReward] = useState<any>(null);

  // Confirmation dialog states
  const [confirmPointsOpen, setConfirmPointsOpen] = useState(false);
  const [confirmRewardsOpen, setConfirmRewardsOpen] = useState(false);

  // Form data

  const [rewardsForm, setRewardsForm] = useState({
    phoneNumber: "",
    reward: "",
    notes: "",
  });

  const [assignRewardForm, setAssignRewardForm] = useState({
    phoneNumber: "",
    reward: "",
    notes: "",
  });

  const [redeemAssignedForm, setRedeemAssignedForm] = useState({
    phoneNumber: "",
    reward: "",
  });

  // Mock data for confirmation
  const [confirmData, setConfirmData] = useState({
    name: "",
    phoneNumber: "",
    points: 0,
    reward: "",
  });

  // Use real data for point rules if available
  const pointRules = earningRules?.length
    ? earningRules.map((rule) => ({
        id: rule.id || "unknown",
        name: rule.name,
        multiplier: rule.pointsPerUnit || rule.bonusPoints || 0,
        isDefault: rule.isDefault || false,
      }))
    : [
        {
          id: "1",
          name: "Purchase Points (1 INR = 10 Points)",
          multiplier: 10,
          isDefault: true,
        },
        {
          id: "2",
          name: "Birthday Bonus (500 Points)",
          multiplier: 500,
          isDefault: false,
        },
        {
          id: "3",
          name: "Referral Bonus (200 Points)",
          multiplier: 200,
          isDefault: false,
        },
      ];

  const handleCheckCode = () => {
    if (!shortCode) return;
    getRewardByCode.mutate(shortCode, {
      onSuccess: (data) => setCodeReward(data),
      onError: () => {
        setCodeReward(null);
        // Toast is handled in query hook if setup, else add here
      },
    });
  };

  const handleRedeemCode = () => {
    if (!shortCode) return;
    redeemByCode.mutate(shortCode, {
      onSuccess: () => {
        setRedeemCodeOpen(false);
        setShortCode("");
        setCodeReward(null);
      },
    });
  };

  const [pointsForm, setPointsForm] = useState({
    phoneNumber: "",
    pointRule: pointRules?.find((r) => r.isDefault)?.id || "1",
    purchaseAmount: "",
    isDefault: false,
  });
  // All transactions for the transactions page

  // Pending approvals
  const pendingApprovals = [];

  // Filter available rewards based on type
  const availableRewards =
    allRewards?.map((r) => ({
      id: r.id,
      name: r.name,
      points: r.pointsCost,
      type: r.rewardType,
    })) || [];

  const assignableRewards = availableRewards.filter(
    (r) => r.type === "assigned",
  );

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

  // Mock earning rules

  const handleIssuePoints = async () => {
    if (!pointsForm.phoneNumber) return;

    // For purchase rule, use the purchase amount directly
    // For other rules, calculate the fixed points
    const selectedRule = pointRules.find((r) => r.id === pointsForm.pointRule);
    const purchaseAmount = selectedRule?.isDefault
      ? parseFloat(pointsForm.purchaseAmount || "0")
      : selectedRule?.multiplier || 0;

    try {
      // Award points using the mutation
      await awardPointsMutation.mutateAsync({
        contactId: customerData?.customer?.contactId,
        purchaseAmount: purchaseAmount,
        notes: selectedRule?.name || "Points issued from dashboard",
      });

      // Close dialog and reset form
      setIssuePointsOpen(false);
      setPointsForm({
        phoneNumber: "",
        pointRule: "1",
        purchaseAmount: "",
        isDefault: false,
      });
      setLookupPhone("");
    } catch (error) {
      console.error("Error issuing points:", error);
    }
  };

  const handleIssueRewards = async () => {
    if (!customerData?.customer?.contactId || !rewardsForm.reward) return;

    try {
      await redeemRewardMutation.mutateAsync({
        customerId: customerData?.customer?.id,
        rewardId: rewardsForm.reward,
      });

      // Close dialog and reset form
      setIssueRewardsOpen(false);
      setRewardsForm({
        phoneNumber: "",
        reward: "",
        notes: "",
      });
      setLookupPhone("");
    } catch (error) {
      console.error("Error redeeming reward:", error);
    }
  };

  const handleAssignReward = async () => {
    if (!customerData?.customer?.id || !assignRewardForm.reward) return;

    try {
      await assignRewardMutation.mutateAsync({
        rewardId: assignRewardForm.reward,
        notes: assignRewardForm.notes || undefined,
        customerId: customerData?.customer?.id,
      });
    } catch (error) {
      console.error("Error assigning reward:", error);
    }
  };

  const handleRedeemAssigned = async () => {
    if (!customerData?.customer?.contactId || !redeemAssignedForm.reward)
      return;

    try {
      await redeemRewardMutation.mutateAsync({
        customerId: customerData?.customer?.id,
        rewardId: redeemAssignedForm.reward,
      });

      // Close dialog and reset form
      setRedeemAssignedOpen(false);
      setRedeemAssignedForm({
        phoneNumber: "",
        reward: "",
      });
      setLookupPhone("");
    } catch (error) {
      console.error("Error redeeming assigned reward:", error);
    }
  };

  const handlePhoneLookup = () => {
    if (rewardsForm.phoneNumber) {
      setLookupPhone(rewardsForm.phoneNumber?.replaceAll("+", ""));
    }
  };

  const handlePointsPhoneLookup = () => {
    if (pointsForm.phoneNumber) {
      setLookupPhone(pointsForm.phoneNumber?.replaceAll("+", ""));
    }
  };

  const handleAssignPhoneLookup = () => {
    if (assignRewardForm.phoneNumber) {
      setLookupPhone(assignRewardForm.phoneNumber?.replaceAll("+", ""));
    }
  };

  const handleRedeemAssignedPhoneLookup = () => {
    if (redeemAssignedForm.phoneNumber) {
      setLookupPhone(redeemAssignedForm.phoneNumber?.replaceAll("+", ""));
    }
  };

  const handleApprove = (approvalId: string) => {
    // Handle approval logic
    console.log("Approved:", approvalId);
  };

  const handleReject = (approvalId: string) => {
    // Handle rejection logic
    console.log("Rejected:", approvalId);
  };

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
  const countryCode: any = dashboardData?.defaultCountryCode || "IN";

  return (
    <div className="flex h-full">
      {/* Main Content Area */}
      <div className="flex-1 overflow-auto ">
        <div className="space-y-6 p-6">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl mb-1">Loyalty Overview</h1>
              <p className="text-sm text-muted-foreground">
                Track performance and customer engagement
              </p>
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

            {/* Quick Actions */}
            <Card className="gap-2">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Issue Points */}
                  <Button
                    className="h-auto py-3 px-4 bg-[#1873E8] hover:bg-[#1873E8]/90 text-white justify-start"
                    onClick={() => setIssuePointsOpen(true)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                        <Award className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">Issue Points</p>
                        <p className="text-xs text-white/80">
                          Award points to customer
                        </p>
                      </div>
                    </div>
                  </Button>

                  {/* Redeem by Code */}
                  <Button
                    className="h-auto py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white justify-start"
                    onClick={() => {
                      setRedeemCodeOpen(true);
                      setShortCode("");
                      setCodeReward(null);
                    }}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                        <Gift className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">Redeem Code</p>
                        <p className="text-xs text-white/80">
                          Use 6-digit short code
                        </p>
                      </div>
                    </div>
                  </Button>

                  {/* tton>

                  {/* Redeem Reward (Unified) */}
                  <Button
                    className="h-auto py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white justify-start"
                    onClick={() => {
                      setIssueRewardsOpen(true);
                    }}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                        <Gift className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">Redeem Reward</p>
                        <p className="text-xs text-white/80">
                          Redeem points or assigned
                        </p>
                      </div>
                    </div>
                  </Button>

                  {/* Assign Reward */}
                  <Button
                    className="h-auto py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white justify-start"
                    onClick={() => setAssignRewardOpen(true)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                        <Gift className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">Assign Reward</p>
                        <p className="text-xs text-white/80">
                          Assign VIP/Special reward
                        </p>
                      </div>
                    </div>
                  </Button>

                  {/* Pending Approvals */}
                  <button
                    onClick={() => setApprovalsOpen(true)}
                    className="flex items-center justify-between p-3 rounded-lg border border-orange-500/20 bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                        <UserCheck className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-white/80">
                          Pending Approvals
                        </p>
                        <p className="text-lg font-semibold text-white">0</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-white/20 text-white border-white/30 text-[10px]"
                    >
                      ACTION
                    </Badge>
                  </button>
                </div>
              </CardContent>
            </Card>

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
                      />
                      <YAxis tick={{ fill: "#666", fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                        }}
                      />
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
                      />
                      <YAxis tick={{ fill: "#666", fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                        }}
                      />
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
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                          }}
                        />
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

      {/* Issue Points Dialog */}
      <Dialog open={issuePointsOpen} onOpenChange={setIssuePointsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#1873E8]" />
              Issue Points
            </DialogTitle>
            <DialogDescription>
              Award loyalty points to a customer based on their activity
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phone-points">Phone Number</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <PhoneInput
                    international
                    defaultCountry={countryCode}
                    placeholder="Search customer phone..."
                    value={pointsForm.phoneNumber}
                    onChange={(e) => {
                      setPointsForm({
                        ...pointsForm,
                        phoneNumber: e,
                      });
                      setLookupPhone("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handlePointsPhoneLookup();
                      }
                    }}
                    className="bg-background border-input"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handlePointsPhoneLookup}
                  disabled={!pointsForm.phoneNumber || isLoadingCustomer}
                >
                  {isLoadingCustomer ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Lookup"
                  )}
                </Button>
              </div>
            </div>

            {lookupPhone && customerData && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Customer:</span>
                      <span className="text-sm">
                        {customerData.customer?.name || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Current Points:
                      </span>
                      <span className="text-lg font-bold text-[#1873E8]">
                        {customerData.customer?.currentPoints || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Tier:</span>
                      <Badge className="bg-blue-100 text-blue-700">
                        {customerData.customer?.currentTier?.name || "N/A"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {lookupPhone && !customerData && !isLoadingCustomer && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                Customer not found. Please check the phone number.
              </div>
            )}

            {lookupPhone && customerData && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="point-rule">Point Rule</Label>
                  <Select
                    value={pointsForm.pointRule}
                    onValueChange={(value) => {
                      const selectedRule = pointRules.find(
                        (r) => r.id === value,
                      );
                      if (selectedRule) {
                        setPointsForm({
                          ...pointsForm,
                          pointRule: value,
                          isDefault: selectedRule.isDefault || false,
                        });
                      }
                    }}
                  >
                    <SelectTrigger id="point-rule">
                      <SelectValue placeholder="Select a point rule" />
                    </SelectTrigger>
                    <SelectContent>
                      {pointRules.map((rule) => (
                        <SelectItem key={rule.id} value={rule.id}>
                          {rule.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {pointsForm.isDefault && (
                  <div className="space-y-2">
                    <Label htmlFor="purchase-amount">
                      Purchase Amount (UNIT)
                    </Label>
                    <Input
                      id="purchase-amount"
                      type="number"
                      placeholder="0.00"
                      value={pointsForm.purchaseAmount}
                      onChange={(e) =>
                        setPointsForm({
                          ...pointsForm,
                          purchaseAmount: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIssuePointsOpen(false);
                setPointsForm({
                  phoneNumber: "",
                  pointRule: "1",
                  purchaseAmount: "",
                  isDefault: false,
                });
                setLookupPhone("");
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#1873E8] hover:bg-[#1873E8]/90"
              onClick={handleIssuePoints}
              disabled={
                awardPointsMutation.isPending ||
                !pointsForm.phoneNumber ||
                !pointsForm.pointRule ||
                (pointsForm.pointRule === "1" && !pointsForm.purchaseAmount) ||
                !customerData
              }
            >
              {awardPointsMutation.isPending ? "Issuing..." : "Issue Points"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Rewards Dialog (Unified) */}
      <Dialog open={issueRewardsOpen} onOpenChange={setIssueRewardsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-600" />
              Redeem Reward
            </DialogTitle>
            <DialogDescription>
              Redeem points or assigned rewards for a customer
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phone-rewards">Phone Number</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <PhoneInput
                    international
                    defaultCountry={countryCode}
                    placeholder="Search customer phone..."
                    value={rewardsForm.phoneNumber}
                    onChange={(e) => {
                      setRewardsForm({
                        ...rewardsForm,
                        phoneNumber: e,
                        reward: "",
                      });
                      setLookupPhone("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handlePhoneLookup();
                      }
                    }}
                    className="bg-background border-input"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handlePhoneLookup}
                  disabled={!rewardsForm.phoneNumber || isLoadingCustomer}
                >
                  {isLoadingCustomer ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Lookup"
                  )}
                </Button>
              </div>
            </div>

            {lookupPhone && customerData && (
              <Card className="border-purple-200 bg-purple-50/50">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Customer:</span>
                      <span className="text-sm">
                        {customerData.customer?.name || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Available Points:
                      </span>
                      <span className="text-lg font-bold text-purple-600">
                        {customerData.customer?.currentPoints || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Tier:</span>
                      <Badge className="bg-purple-100 text-purple-700">
                        {customerData.customer?.currentTier?.name || "N/A"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {lookupPhone && customerData && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="reward-select">Select Reward</Label>
                  <Select
                    value={rewardsForm.reward}
                    onValueChange={(value) =>
                      setRewardsForm({ ...rewardsForm, reward: value })
                    }
                  >
                    <SelectTrigger id="reward-select">
                      <SelectValue placeholder="Choose a reward" />
                    </SelectTrigger>
                    <SelectContent>
                      {customerData.availableRewards?.map((reward: any) => (
                        <SelectItem key={reward.id} value={reward.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{reward.name}</span>
                            <span className="ml-4 text-xs text-muted-foreground">
                              ({reward.pointsCost} pts)
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                      {(!customerData.availableRewards ||
                        customerData.availableRewards.length === 0) && (
                        <SelectItem value="none" disabled>
                          No redeemable rewards available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {lookupPhone && !customerData && !isLoadingCustomer && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                Customer not found. Please check the phone number.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIssueRewardsOpen(false);
                setRewardsForm({ phoneNumber: "", reward: "", notes: "" });
                setLookupPhone("");
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={handleIssueRewards}
              disabled={
                redeemRewardMutation.isPending ||
                !rewardsForm.phoneNumber ||
                !rewardsForm.reward ||
                !customerData
              }
            >
              {redeemRewardMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Redeeming...
                </>
              ) : (
                "Redeem Reward"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Reward Dialog */}
      <Dialog open={assignRewardOpen} onOpenChange={setAssignRewardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-orange-600" />
              Assign Reward to Customer
            </DialogTitle>
            <DialogDescription>
              Assign a special/VIP reward to a customer without points cost
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phone-assign">Phone Number</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <PhoneInput
                    international
                    defaultCountry={countryCode}
                    placeholder="Search customer phone..."
                    value={assignRewardForm.phoneNumber}
                    onChange={(e) => {
                      setAssignRewardForm({
                        ...assignRewardForm,
                        phoneNumber: e,
                        reward: "",
                      });
                      setLookupPhone("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAssignPhoneLookup();
                      }
                    }}
                    className="bg-background border-input"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleAssignPhoneLookup}
                  disabled={!assignRewardForm.phoneNumber || isLoadingCustomer}
                >
                  {isLoadingCustomer ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Lookup"
                  )}
                </Button>
              </div>
            </div>

            {lookupPhone && customerData && (
              <Card className="border-orange-200 bg-orange-50/50">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Customer:</span>
                      <span className="text-sm">
                        {customerData.customer?.name || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Tier:</span>
                      <Badge className="bg-orange-100 text-orange-700">
                        {customerData.customer?.currentTier?.name || "N/A"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {lookupPhone && !customerData && !isLoadingCustomer && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                Customer not found. Please check the phone number.
              </div>
            )}

            {lookupPhone && customerData && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="reward-assign">Select Assigned Reward</Label>

                  <Select
                    value={assignRewardForm.reward}
                    onValueChange={(value) =>
                      setAssignRewardForm({
                        ...assignRewardForm,
                        reward: value,
                      })
                    }
                  >
                    <SelectTrigger id="reward-assign">
                      <SelectValue placeholder="Choose a reward to assign" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignableRewards.map((reward) => (
                        <SelectItem key={reward.id} value={reward.id}>
                          {reward.name}
                        </SelectItem>
                      ))}
                      {assignableRewards.length === 0 && (
                        <SelectItem value="none" disabled>
                          No assigned rewards available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assign-notes">Notes (Optional)</Label>
                  <Textarea
                    id="assign-notes"
                    placeholder="Add any notes about this assignment..."
                    value={assignRewardForm.notes}
                    onChange={(e) =>
                      setAssignRewardForm({
                        ...assignRewardForm,
                        notes: e.target.value,
                      })
                    }
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAssignRewardOpen(false);
                setAssignRewardForm({
                  phoneNumber: "",
                  reward: "",
                  notes: "",
                });
                setLookupPhone("");
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={handleAssignReward}
              disabled={
                assignRewardMutation.isPending ||
                !assignRewardForm.phoneNumber ||
                !assignRewardForm.reward ||
                !customerData
              }
            >
              {assignRewardMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign Reward"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Redeem Assigned Reward Dialog */}
      <Dialog open={redeemAssignedOpen} onOpenChange={setRedeemAssignedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-purple-600" />
              Redeem Assigned Reward
            </DialogTitle>
            <DialogDescription>
              Redeem a reward that has been assigned to a customer
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phone-redeem-assigned">Phone Number</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <PhoneInput
                    international
                    defaultCountry={countryCode}
                    placeholder="Search customer phone..."
                    value={redeemAssignedForm.phoneNumber}
                    onChange={(e) => {
                      setRedeemAssignedForm({
                        ...redeemAssignedForm,
                        phoneNumber: e,
                        reward: "",
                      });
                      setLookupPhone("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleRedeemAssignedPhoneLookup();
                      }
                    }}
                    className="bg-background border-input"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleRedeemAssignedPhoneLookup}
                  disabled={
                    !redeemAssignedForm.phoneNumber || isLoadingCustomer
                  }
                >
                  {isLoadingCustomer ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Lookup"
                  )}
                </Button>
              </div>
            </div>

            {lookupPhone && customerData && (
              <Card className="border-purple-200 bg-purple-50/50">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Customer:</span>
                      <span className="text-sm">
                        {customerData.customer?.name || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Assigned Rewards:
                      </span>
                      <Badge className="bg-purple-100 text-purple-700">
                        {assignableRewards?.length || 0} available
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {lookupPhone && !customerData && !isLoadingCustomer && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                Customer not found. Please check the phone number.
              </div>
            )}

            {lookupPhone && customerData && (
              <div className="space-y-2">
                <Label htmlFor="reward-redeem-assigned">
                  Select Assigned Reward
                </Label>
                <Select
                  value={redeemAssignedForm.reward}
                  onValueChange={(value) =>
                    setRedeemAssignedForm({
                      ...redeemAssignedForm,
                      reward: value,
                    })
                  }
                >
                  <SelectTrigger id="reward-redeem-assigned">
                    <SelectValue placeholder="Choose a reward to redeem" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableRewards?.map((reward: any) => (
                      <SelectItem key={reward.id} value={reward.id}>
                        {reward.name}
                      </SelectItem>
                    ))}
                    {(!assignableRewards || assignableRewards.length === 0) && (
                      <SelectItem value="none" disabled>
                        No assigned rewards to redeem
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRedeemAssignedOpen(false);
                setRedeemAssignedForm({ phoneNumber: "", reward: "" });
                setLookupPhone("");
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={handleRedeemAssigned}
              disabled={
                redeemRewardMutation.isPending ||
                !redeemAssignedForm.phoneNumber ||
                !redeemAssignedForm.reward ||
                !customerData
              }
            >
              {redeemRewardMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Redeeming...
                </>
              ) : (
                "Redeem Reward"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pending Approvals Dialog */}
      <Dialog open={approvalsOpen} onOpenChange={setApprovalsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-orange-600" />
              Pending Approvals ({pendingApprovals.length})
            </DialogTitle>
            <DialogDescription>
              Review and approve pending points and rewards requests
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
            {pendingApprovals.map((approval) => (
              <Card key={approval.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div>
                        <p className="font-semibold">{approval.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {approval.phone}
                        </p>
                      </div>

                      {approval.type === "points" ? (
                        <Badge className="bg-[#1873E8] hover:bg-[#1873E8]">
                          +{approval.points} Points
                        </Badge>
                      ) : (
                        <Badge className="bg-purple-600 hover:bg-purple-600">
                          {approval.reward}
                        </Badge>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Requested: {approval.date}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleApprove(approval?.id)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleReject(approval?.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog - Points */}
      <Dialog open={confirmPointsOpen} onOpenChange={setConfirmPointsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Confirm Points Issuance
            </DialogTitle>
            <DialogDescription>
              Please confirm the details below
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Customer Name
                </span>
                <span className="font-semibold">{confirmData.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Phone Number
                </span>
                <span className="font-semibold">{confirmData.phoneNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Points to Award
                </span>
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#1873E8]" />
                  <span className="text-xl font-bold text-[#1873E8]">
                    {confirmData.points}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmPointsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                setConfirmPointsOpen(false);
                setPointsForm({
                  phoneNumber: "",
                  pointRule: "",
                  purchaseAmount: "",
                  isDefault: false,
                });
              }}
            >
              Confirm & Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog - Rewards */}
      <Dialog open={confirmRewardsOpen} onOpenChange={setConfirmRewardsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Confirm Reward Issuance
            </DialogTitle>
            <DialogDescription>
              Please confirm the details below
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Customer Name
                </span>
                <span className="font-semibold">{confirmData.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Phone Number
                </span>
                <span className="font-semibold">{confirmData.phoneNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Reward</span>
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-purple-600">
                    {confirmData.reward}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmRewardsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                setConfirmRewardsOpen(false);
                setRewardsForm({ phoneNumber: "", reward: "", notes: "" });
              }}
            >
              Confirm & Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Short Code Redemption Dialog */}
      <Dialog open={redeemCodeOpen} onOpenChange={setRedeemCodeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-indigo-600" />
              Redeem by Short Code
            </DialogTitle>
            <DialogDescription>
              Enter the 6-character code from the customer&apos;s reward card.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter Code (e.g., A1B2C3)"
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="text-center text-lg tracking-widest uppercase font-mono"
              />
              <Button
                onClick={handleCheckCode}
                disabled={getRewardByCode.isPending || shortCode.length < 6}
              >
                {getRewardByCode.isPending ? "Checking..." : "Check"}
              </Button>
            </div>

            {codeReward && (
              <div className="bg-slate-50 p-4 rounded-lg border space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-slate-900">
                      {codeReward.rewardName}
                    </h4>
                    <p className="text-sm text-slate-500">
                      Customer: {codeReward.customerName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {codeReward.customerPhone}
                    </p>
                  </div>
                  <Badge
                    variant={
                      codeReward.status === "issued" ? "secondary" : "outline"
                    }
                  >
                    {codeReward.status?.toUpperCase()}
                  </Badge>
                </div>

                {codeReward.status === "issued" ? (
                  <div className="pt-2">
                    <Button
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                      onClick={handleRedeemCode}
                      disabled={redeemByCode.isPending}
                    >
                      {redeemByCode.isPending
                        ? "Processing..."
                        : "Redeem Reward"}
                    </Button>
                  </div>
                ) : (
                  <div className="pt-2 text-center text-sm text-red-500 font-medium">
                    This code cannot be redeemed (Status: {codeReward.status})
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
