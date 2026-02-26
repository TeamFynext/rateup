"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  CheckCircle2,
  Gift,
  Loader2,
  Plus,
  Search,
  Star,
  Ticket,
  TrendingUp,
  Trophy,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  useClaimReward,
  useCustomerRewardsByPhone,
  useUseRedemption,
} from "@/backend/loyalty/cashier/cashier.query";
import {
  useAssignRewardMutation,
  useAwardPointsMutation,
} from "@/backend/loyalty/customer/customer.query";
import {
  useRedeemReward,
  useRedeemRewardByShortCode,
} from "@/backend/loyalty/redeems/redeems.query";
import { useGetLoyaltyRewards } from "@/backend/loyalty/reward/reward.query";
import { useLoyaltyTiers } from "@/backend/loyalty/tier.query";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function CashierPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [phoneSearch, setPhoneSearch] = useState("");
  const [selectedPhone, setSelectedPhone] = useState("");

  // Modal states
  const [issuePointsOpen, setIssuePointsOpen] = useState(false);
  const [adjustPointsOpen, setAdjustPointsOpen] = useState(false);
  const [claimRewardOpen, setClaimRewardOpen] = useState(false);
  const [assignRewardOpen, setAssignRewardOpen] = useState(false);
  const [redeemCouponOpen, setRedeemCouponOpen] = useState(false);
  const [useRedemptionOpen, setUseRedemptionOpen] = useState(false);

  // Form states
  const [pointsAmount, setPointsAmount] = useState("");
  const [pointsNotes, setPointsNotes] = useState("");
  const [adjustPoints, setAdjustPoints] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [selectedRewardId, setSelectedRewardId] = useState("");
  const [selectedRedemptionId, setSelectedRedemptionId] = useState("");
  const [assignRewardNotes, setAssignRewardNotes] = useState("");

  // Fetch data
  const { data: customerData, isLoading: isLoadingCustomer } =
    useCustomerRewardsByPhone(selectedPhone);
  const { data: allRewards } = useGetLoyaltyRewards();
  const { data: tiers } = useLoyaltyTiers();

  // Mutations
  const awardPoints = useAwardPointsMutation();
  // const claimReward = useClaimReward();
  const redeemRewardMutation = useRedeemReward(selectedPhone);
  const useRedemption = useUseRedemption(selectedPhone);
  const assignReward = useAssignRewardMutation();
  const redeemRewardByShortCode = useRedeemRewardByShortCode();

  const customer = customerData?.customer;
  const availableRewards = customerData?.availableRewards || [];
  const redeemedRewards = customerData?.redeemedRewards || [];
  const issuableRewards = customerData?.issuableRewards || [];

  // Filter unused redemptions
  const unusedRedemptions = useMemo(() => {
    return redeemedRewards.filter(
      (r) => r.status === "approved" || r.status === "pending",
    );
  }, [redeemedRewards]);

  const normalizePhone = (phone: string) => phone.replaceAll("+", "");
  const isPhoneSearchValid = phoneSearch.length >= 10;

  useEffect(() => {
    const phoneFromQuery = searchParams.get("phone") || "";
    setPhoneSearch(phoneFromQuery);
    setSelectedPhone(phoneFromQuery ? normalizePhone(phoneFromQuery) : "");
  }, [searchParams]);

  const updatePhoneQueryParam = (phone: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (phone) {
      params.set("phone", phone);
    } else {
      params.delete("phone");
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const handleSearchCustomer = () => {
    if (!isPhoneSearchValid) {
      return;
    }

    updatePhoneQueryParam(phoneSearch);
    setSelectedPhone(normalizePhone(phoneSearch));
  };

  const handleClearCustomerSearch = () => {
    setSelectedPhone("");
    setPhoneSearch("");
    updatePhoneQueryParam("");
  };

  const handleIssuePoints = async () => {
    if (!customer?.contactId || !pointsAmount) {
      toast.error("Please enter points amount");
      return;
    }

    try {
      await awardPoints.mutateAsync({
        contactId: customer.contactId,
        purchaseAmount: Number(pointsAmount),
        notes: pointsNotes,
      });
      toast.success("Points issued successfully");
      setIssuePointsOpen(false);
      setPointsAmount("");
      setPointsNotes("");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to issue points");
    }
  };

  const handleClaimReward = async () => {
    if (!selectedPhone || !selectedRewardId) {
      toast.error("Please select a reward");
      return;
    }

    try {
      await redeemRewardMutation.mutateAsync({
        customerId: customer?.id || "",
        rewardId: selectedRewardId,
      });
      setClaimRewardOpen(false);
      setSelectedRewardId("");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to claim reward");
    }
  };

  const handleUseRedemption = async () => {
    if (!selectedRedemptionId) {
      toast.error("Please select a redemption");
      return;
    }

    try {
      await useRedemption.mutateAsync({
        redemptionId: selectedRedemptionId,
      });
      toast.success("Redemption marked as used");
      setUseRedemptionOpen(false);
      setSelectedRedemptionId("");
    } catch (error) {
      toast.error(error?.message || "Failed to use redemption");
    }
  };

  const handleAdjustPoints = async () => {
    if (!customer?.contactId || !adjustPoints) {
      toast.error("Please enter points adjustment");
      return;
    }

    const pointsValue = Number(adjustPoints);
    if (Number.isNaN(pointsValue)) {
      toast.error("Invalid points value");
      return;
    }

    try {
      await awardPoints.mutateAsync({
        contactId: customer.contactId,
        purchaseAmount: pointsValue,
        notes: adjustReason || "Manual points adjustment",
      });
      toast.success(
        `Points ${pointsValue > 0 ? "added" : "deducted"} successfully`,
      );
      setAdjustPointsOpen(false);
      setAdjustPoints("");
      setAdjustReason("");
    } catch (error) {
      toast.error(error?.message || "Failed to adjust points");
    }
  };

  const handleAssignReward = async () => {
    if (!customer?.id || !selectedRewardId) {
      toast.error("Please select a reward");
      return;
    }

    try {
      await assignReward.mutateAsync({
        customerId: customer.id,
        rewardId: selectedRewardId,
        notes: assignRewardNotes,
      });
      toast.success("Reward assigned successfully");
      setAssignRewardOpen(false);
      setSelectedRewardId("");
      setAssignRewardNotes("");
    } catch (error) {
      toast.error(error?.message || "Failed to assign reward");
    }
  };

  const handleRedeemCoupon = async () => {
    if (!couponCode) {
      toast.error("Please enter a coupon code");
      return;
    }

    redeemRewardByShortCode.mutate(couponCode);
    setRedeemCouponOpen(false);
    setCouponCode("");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl mb-1">Cashier Portal</h1>
        <p className="text-sm text-muted-foreground">
          Quick customer lookup and transaction processing
        </p>
      </div>

      {/* Search Customer */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="cashier-search">Search Customer by Phone</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <PhoneInput
                  id="cashier-search"
                  placeholder="Enter phone number (e.g., +1234567890)..."
                  className="pl-9"
                  defaultCountry="IN"
                  value={phoneSearch}
                  onChange={(e) => setPhoneSearch(e)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && isPhoneSearchValid) {
                      handleSearchCustomer();
                    }
                  }}
                />
              </div>
              {isPhoneSearchValid && (
                <Button
                  onClick={handleSearchCustomer}
                  className="mt-2 w-full"
                  disabled={isLoadingCustomer}
                >
                  {isLoadingCustomer ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    "Search Customer"
                  )}
                </Button>
              )}
            </div>

            {/* Info message */}
            {phoneSearch && !isPhoneSearchValid && (
              <p className="text-xs text-muted-foreground">
                Please enter at least 10 digits
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected Customer Details */}
      {customer && (
        <div className="space-y-4">
          {/* Customer Info Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">
                      {customer.name || "N/A"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {customer.phone}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {customer.email || "N/A"}
                    </p>
                  </div>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      onClick={handleClearCustomerSearch}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>close customer details</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4">
                <div className="border rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    Available Points
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {customer.currentPoints || 0}
                  </p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    Lifetime Points
                  </p>
                  <p className="text-2xl font-bold">
                    {customer.lifetimePoints || 0}
                  </p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    Current Tier
                  </p>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor:
                          tiers?.find((t) => t.id === customer.currentTier?.id)
                            ?.color || "#C0C0C0",
                      }}
                    />
                    <p className="text-lg font-semibold">
                      {customer.currentTier?.name || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <Badge
                    variant={
                      customer.status === "closed"
                        ? "destructive"
                        : customer.status === "suspended"
                          ? "secondary" // or custom warning variant if exists
                          : "outline" // for active
                    }
                    className={cn(
                      "text-xs",
                      customer.status === "active" &&
                        "border-green-500 text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/20",
                      customer.status === "suspended" &&
                        "border-yellow-500 text-yellow-700 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20",
                      // closed will use destructive variant default styles
                    )}
                  >
                    {customer.status || "active"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Button
                  className="h-auto py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 justify-start border border-blue-100"
                  onClick={() => setIssuePointsOpen(true)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-9 h-9 bg-[#1873E8] rounded-lg flex items-center justify-center shrink-0">
                      <Plus className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-blue-900">
                        Issue Points
                      </p>
                      <p className="text-xs text-blue-600">Add points</p>
                    </div>
                  </div>
                </Button>

                <Button
                  className="h-auto py-3 px-4 bg-purple-50 hover:bg-purple-100 text-purple-700 justify-start border border-purple-100"
                  onClick={() => setAssignRewardOpen(true)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-9 h-9 bg-purple-500 rounded-lg flex items-center justify-center shrink-0">
                      <Gift className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-purple-900">
                        Issue Reward
                      </p>
                      <p className="text-xs text-purple-600">Grant reward</p>
                    </div>
                  </div>
                </Button>

                <Button
                  className="h-auto py-3 px-4 bg-orange-50 hover:bg-orange-100 text-orange-700 justify-start border border-orange-100"
                  onClick={() => setRedeemCouponOpen(true)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
                      <Ticket className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-orange-900">
                        Redeem Coupon
                      </p>
                      <p className="text-xs text-orange-600">Use coupon</p>
                    </div>
                  </div>
                </Button>

                <Button
                  className="h-auto py-3 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 justify-start border border-indigo-100"
                  onClick={() => setClaimRewardOpen(true)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-9 h-9 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0">
                      <Trophy className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-indigo-900">
                        Redeem Reward
                      </p>
                      <p className="text-xs text-indigo-600">Use points</p>
                    </div>
                  </div>
                </Button>

                {/* <Button
                  className="h-auto py-3 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 justify-start border border-emerald-100"
                  onClick={() => setUseRedemptionOpen(true)}
                  disabled={unusedRedemptions.length === 0}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-emerald-900">
                        Redeem Gift
                      </p>
                      <p className="text-xs text-emerald-600">Mark claimed</p>
                    </div>
                  </div>
                </Button> */}
              </div>
            </CardContent>
          </Card>

          {/* Available Rewards */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Available Rewards for Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {availableRewards
                  .filter(
                    (reward) =>
                      reward.status === "ACTIVE" &&
                      reward.pointsCost <= (customer.currentPoints || 0),
                  )
                  .map((reward) => (
                    <div
                      key={reward.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Gift className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{reward.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {reward.description || "No description"}
                          </p>

                          {reward.rewardType === "coupon" && (
                            <p className="text-xs text-muted-foreground">
                              Code:
                              {
                                (
                                  reward.rewardValue as unknown as {
                                    code: string;
                                  }
                                )?.code
                              }
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-primary">
                          {reward.pointsCost} pts
                        </p>
                        <Badge variant="secondary" className="text-xs mt-1">
                          Available
                        </Badge>
                      </div>
                    </div>
                  ))}
                {availableRewards.filter(
                  (reward) =>
                    reward.status === "ACTIVE" &&
                    reward.pointsCost <= (customer.currentPoints || 0),
                ).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Gift className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">
                      No rewards available with current points
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Redeemed/Pending Rewards */}
          {unusedRedemptions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pending Redemptions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {unusedRedemptions.map((redemption) => (
                    <div
                      key={redemption.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                          <Ticket className="w-5 h-5 text-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {redemption.reward?.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Redeemed:{" "}
                            {new Date(
                              redemption.createdAt,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">
                          {redemption.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Modals */}
      {/* Issue Points Modal */}
      <Dialog open={issuePointsOpen} onOpenChange={setIssuePointsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Points</DialogTitle>
            <DialogDescription>
              Award points to {customer?.name || "customer"} for a purchase or
              activity.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="points-amount">Purchase Amount</Label>
              <Input
                id="points-amount"
                type="number"
                placeholder="Enter amount"
                value={pointsAmount}
                onChange={(e) => setPointsAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Points will be calculated based on earning rules
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="points-notes">Notes (optional)</Label>
              <Textarea
                id="points-notes"
                placeholder="Add any notes..."
                value={pointsNotes}
                onChange={(e) => setPointsNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssuePointsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleIssuePoints}
              disabled={awardPoints.isPending}
            >
              {awardPoints.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Issuing...
                </>
              ) : (
                "Issue Points"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Points Modal */}
      <Dialog open={adjustPointsOpen} onOpenChange={setAdjustPointsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Points</DialogTitle>
            <DialogDescription>
              Manually add or deduct points for {customer?.name || "customer"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="adjust-points">Points Amount</Label>
              <Input
                id="adjust-points"
                type="number"
                placeholder="Enter points (positive to add, negative to deduct)"
                value={adjustPoints}
                onChange={(e) => setAdjustPoints(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Use positive numbers to add points, negative to deduct
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjust-reason">Reason</Label>
              <Textarea
                id="adjust-reason"
                placeholder="Reason for adjustment..."
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAdjustPointsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdjustPoints}
              disabled={awardPoints.isPending}
            >
              {awardPoints.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adjusting...
                </>
              ) : (
                "Adjust Points"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Claim Reward Modal */}
      <Dialog open={claimRewardOpen} onOpenChange={setClaimRewardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Claim Reward</DialogTitle>
            <DialogDescription>
              Select a reward for {customer?.name || "customer"} to redeem.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Reward</Label>
              <div className="space-y-2 max-h-75 overflow-y-auto">
                {availableRewards
                  .filter(
                    (r) =>
                      r.status === "ACTIVE" &&
                      r.rewardType !== "coupon" &&
                      r.pointsCost <= (customer?.currentPoints || 0),
                  )
                  .map((reward) => (
                    <button
                      key={reward.id}
                      onClick={() => setSelectedRewardId(reward.id)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 border rounded-lg text-left transition-colors",
                        selectedRewardId === reward.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted",
                      )}
                    >
                      <div>
                        <p className="font-medium text-sm">{reward.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {reward.description}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-primary">
                        {reward.pointsCost} pts
                      </p>
                    </button>
                  ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClaimRewardOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleClaimReward}
              disabled={!selectedRewardId || redeemRewardMutation.isPending}
            >
              {redeemRewardMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Claiming...
                </>
              ) : (
                "Claim Reward"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Reward Modal */}
      <Dialog open={assignRewardOpen} onOpenChange={setAssignRewardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Reward</DialogTitle>
            <DialogDescription>
              Directly assign a reward to {customer?.name || "customer"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Reward</Label>
              <div className="space-y-2 max-h-75 overflow-y-auto">
                {issuableRewards?.map((reward) => (
                  <button
                    key={reward.id}
                    onClick={() => setSelectedRewardId(reward.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 border rounded-lg text-left transition-colors",
                      selectedRewardId === reward.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted",
                    )}
                  >
                    <div>
                      <p className="font-medium text-sm">{reward.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {reward.description || "No description"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assign-notes">Notes (optional)</Label>
              <Textarea
                id="assign-notes"
                placeholder="Add any notes..."
                value={assignRewardNotes}
                onChange={(e) => setAssignRewardNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignRewardOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignReward}
              disabled={!selectedRewardId || assignReward.isPending}
            >
              {assignReward.isPending ? (
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

      {/* Redeem Coupon Modal */}
      <Dialog open={redeemCouponOpen} onOpenChange={setRedeemCouponOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redeem Coupon</DialogTitle>
            <DialogDescription>
              Enter a coupon code for {customer?.name || "customer"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="coupon-code">Coupon Code</Label>
              <Input
                id="coupon-code"
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="uppercase"
              />
              <p className="text-xs text-muted-foreground">
                Enter the coupon code provided by the customer
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRedeemCouponOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleRedeemCoupon} disabled={!couponCode}>
              Redeem Coupon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Use Redemption Modal */}
      <Dialog open={useRedemptionOpen} onOpenChange={setUseRedemptionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use Redemption</DialogTitle>
            <DialogDescription>
              Mark a pending redemption as used.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Redemption</Label>
              <div className="space-y-2 max-h-75 overflow-y-auto">
                {unusedRedemptions.map((redemption) => (
                  <button
                    key={redemption.id}
                    onClick={() => setSelectedRedemptionId(redemption.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 border rounded-lg text-left transition-colors",
                      selectedRedemptionId === redemption.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted",
                    )}
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {redemption.reward?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(redemption.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {redemption.status}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUseRedemptionOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUseRedemption}
              disabled={!selectedRedemptionId || useRedemption.isPending}
            >
              {useRedemption.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Mark as Used"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
