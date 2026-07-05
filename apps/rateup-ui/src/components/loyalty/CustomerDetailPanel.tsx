import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import {
  Calendar,
  Clock,
  Copy,
  Gift,
  Link,
  Loader2,
  Mail,
  Phone,
  Plus,
  Ticket,
  Trophy,
  X,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
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
import { useLoyaltyTiers } from "@/backend/loyalty/tier.query";
import { DataTable } from "@/components/Table/data-table.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { PremiumAvatar } from "@/components/ui/premium-avatar.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils.ts";
import { formatDate } from "@/utils/dateTime.ts";

export interface CustomerPanelCustomer {
  id: string;
  contactId: string;
  name: string;
  phone: string;
  email?: string;
  currentPoints: number;
  lifetimePoints: number;
  currentTier?: { id?: string; name: string; color?: string } | null;
  status?: string;
  referralCode?: string;
  createdAt?: string;
}

interface CustomerDetailPanelProps {
  customer: CustomerPanelCustomer;
  transactions?: any[];
  onClose?: () => void;
  orgId: string;
}

export function CustomerDetailPanel({
  customer,
  transactions,
  onClose,
  orgId,
}: CustomerDetailPanelProps) {
  const { t } = useTranslation();

  // Modal states
  const [issuePointsOpen, setIssuePointsOpen] = useState(false);
  const [assignRewardOpen, setAssignRewardOpen] = useState(false);
  const [claimRewardOpen, setClaimRewardOpen] = useState(false);
  const [claimCouponOpen, setClaimCouponOpen] = useState(false);
  const [redeemCouponOpen, setRedeemCouponOpen] = useState(false);
  const [useRedemptionOpen, setUseRedemptionOpen] = useState(false);

  // Form states
  const [pointsAmount, setPointsAmount] = useState("");
  const [pointsNotes, setPointsNotes] = useState("");
  const [selectedRewardId, setSelectedRewardId] = useState("");
  const [selectedCouponRewardId, setSelectedCouponRewardId] = useState("");
  const [assignRewardNotes, setAssignRewardNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [selectedRedemptionId, setSelectedRedemptionId] = useState("");

  const normalizedPhone = customer.phone.replaceAll("+", "");

  // Fetch rewards data for this customer
  const { data: rewardData } = useCustomerRewardsByPhone(normalizedPhone);
  const { data: tiers } = useLoyaltyTiers();

  const availableRewards = rewardData?.availableRewards || [];
  const issuableRewards = rewardData?.issuableRewards || [];

  const redeemedRewards = rewardData?.redeemedRewards || [];
  const unusedRedemptions = redeemedRewards.filter(
    (r) => r.status === "approved" || r.status === "pending",
  );

  const tierColor =
    customer.currentTier?.color ||
    tiers?.find((tier) => tier.id === customer.currentTier?.id)?.color ||
    "#C0C0C0";

  // Mutations
  const awardPoints = useAwardPointsMutation();
  const redeemRewardMutation = useRedeemReward(normalizedPhone);
  const assignReward = useAssignRewardMutation(() => {
    setAssignRewardOpen(false);
    setSelectedRewardId("");
    setAssignRewardNotes("");
  });
  const redeemRewardByShortCode = useRedeemRewardByShortCode();
  const useRedemption = useUseRedemption(normalizedPhone);

  const handleIssuePoints = async () => {
    if (!customer.contactId || !pointsAmount) {
      toast.error(t("Please enter points amount"));
      return;
    }
    try {
      await awardPoints.mutateAsync({
        contactId: customer.contactId,
        purchaseAmount: Number(pointsAmount),
        notes: pointsNotes,
      });
      toast.success(t("Points issued successfully"));
      setIssuePointsOpen(false);
      setPointsAmount("");
      setPointsNotes("");
    } catch (error) {
      toast.error(error?.message || t("Failed to issue points"));
    }
  };

  const handleClaimReward = async () => {
    if (!selectedRewardId) {
      toast.error(t("Please select a reward"));
      return;
    }
    try {
      await redeemRewardMutation.mutateAsync({
        customerId: customer.id,
        rewardId: selectedRewardId,
      });
      toast.success(t("Reward claimed successfully"));
      setClaimRewardOpen(false);
      setSelectedRewardId("");
    } catch (error) {
      toast.error(error?.message || t("Failed to claim reward"));
    }
  };

  const handleClaimCoupon = async () => {
    if (!selectedCouponRewardId) {
      toast.error(t("Please select a reward"));
      return;
    }

    try {
      const result = await redeemRewardMutation.mutateAsync({
        customerId: customer.id,
        rewardId: selectedCouponRewardId,
      });
      if (result?.redemptionCode) {
        toast.success(
          `${t("Reward claimed successfully")}. ${t("Code:")} ${result.redemptionCode}`,
          {
            duration: Infinity,
            closeButton: true,
          },
        );
      } else {
        toast.success(t("Reward claimed successfully"));
      }
      setClaimCouponOpen(false);
      setSelectedCouponRewardId("");
    } catch (error) {
      toast.error(error?.message || t("Failed to claim reward"));
    }
  };

  const handleAssignReward = async () => {
    if (!selectedRewardId) {
      toast.error(t("Please select a reward"));
      return;
    }
    try {
      await assignReward.mutateAsync({
        customerId: customer.id,
        rewardId: selectedRewardId,
        notes: assignRewardNotes,
      });
      toast.success(t("Reward assigned successfully"));
    } catch (error) {
      toast.error(error?.message || t("Failed to assign reward"));
    }
  };

  const handleRedeemCoupon = async () => {
    if (!couponCode) {
      toast.error(t("Please enter a coupon code"));
      return;
    }
    try {
      const result = await redeemRewardByShortCode.mutateAsync(couponCode);
      const redeemedCode = result?.shortCode || couponCode;
      toast.success(`${t("Reward redeemed successfully")}. ${t("Code:")} ${redeemedCode}`);
      setRedeemCouponOpen(false);
      setCouponCode("");
    } catch (error) {
      toast.error(error?.message || t("Redemption failed"));
    }
  };

  const handleUseRedemption = async () => {
    if (!selectedRedemptionId) {
      toast.error(t("Please select a redemption"));
      return;
    }
    try {
      await useRedemption.mutateAsync({ redemptionId: selectedRedemptionId });
      toast.success(t("Redemption marked as used"));
      setUseRedemptionOpen(false);
      setSelectedRedemptionId("");
    } catch (error) {
      toast.error(error?.message || t("Failed to use redemption"));
    }
  };

  const transactionColumns: ColumnDef<any>[] = [
    {
      accessorKey: "createdAt",
      header: t("Date"),
      cell: ({ row }) => <p className="text-sm">{formatDate(row.getValue("createdAt"))}</p>,
    },
    {
      accessorKey: "transactionType",
      header: t("Type"),
      cell: ({ row }) => (
        <Badge
          className={
            row.getValue("transactionType") === "earn"
              ? "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/10 border border-green-500/20"
              : "bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/10 border border-red-500/20"
          }
        >
          {row.getValue("transactionType")}
        </Badge>
      ),
    },
    {
      accessorKey: "description",
      header: t("Description"),
      cell: ({ row }) => <p className="text-sm">{row.getValue("description")}</p>,
    },
    {
      accessorKey: "points",
      header: () => <div className="text-right">{t("Points")}</div>,
      cell: ({ row }) => {
        const points = row.getValue<number>("points");
        return (
          <div className="text-right">
            <span
              className={`text-sm font-semibold ${
                points >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {points}
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Customer Info Card */}
      <Card>
        <CardContent>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <PremiumAvatar name={customer.name} size="lg" />
              <div>
                <h2 className="text-xl font-semibold">{customer.name}</h2>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    <span>{customer.phone}</span>
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                </div>
                {customer.createdAt && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {t("Joined")} {dayjs(customer.createdAt).format("MMMM D, YYYY")}
                    </span>
                  </div>
                )}
                {customer.referralCode && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                      {customer.referralCode}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hover:bg-primary/10"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(customer.referralCode);
                          toast.success(t("Referral code copied to clipboard!"));
                        } catch {
                          toast.error(t("Failed to copy referral code"));
                        }
                      }}
                      title={t("Copy referral code")}
                    >
                      <Copy className="w-3.5 h-3.5 text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hover:bg-primary/10"
                      onClick={async () => {
                        try {
                          const link = `${import.meta.env.VITE_FRONTEND_URL}/loyalty/${orgId}/register?refer_code=${customer.referralCode}`;
                          await navigator.clipboard.writeText(link);
                          toast.success(t("Referral link copied to clipboard!"));
                        } catch {
                          toast.error(t("Failed to copy referral link"));
                        }
                      }}
                      title={t("Copy referral link")}
                    >
                      <Link className="w-3.5 h-3.5 text-primary" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            {onClose && (
              <Tooltip>
                <TooltipTrigger
                  render={<Button variant="destructive" size="icon-sm" onClick={onClose} />}
                >
                  <X className="w-4 h-4" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("Close customer details")}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4">
            <div className="border rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">{t("Available Points")}</p>
              <p className="text-2xl font-bold text-primary">{customer.currentPoints || 0}</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">{t("Lifetime Points")}</p>
              <p className="text-2xl font-bold">{customer.lifetimePoints || 0}</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">{t("Current Tier")}</p>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tierColor }} />
                <p className="text-lg font-semibold">{customer.currentTier?.name || "N/A"}</p>
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">{t("Status")}</p>
              <Badge
                variant={
                  customer.status === "closed"
                    ? "destructive"
                    : customer.status === "suspended"
                      ? "secondary"
                      : "outline"
                }
                className={cn(
                  "text-xs",
                  customer.status === "active" &&
                    "border-green-500 text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/20",
                  customer.status === "suspended" &&
                    "border-yellow-500 text-yellow-700 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20",
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
          <CardTitle className="text-base">{t("Quick Actions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              className="h-auto py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 justify-start border border-blue-100 flex-1"
              onClick={() => {
                setPointsAmount("");
                setPointsNotes("");
                setIssuePointsOpen(true);
              }}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-9 h-9 bg-[#1873E8] rounded-lg flex items-center justify-center shrink-0">
                  <Plus className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-blue-900">{t("Issue Points")}</p>
                  <p className="text-xs text-blue-600">{t("Add points")}</p>
                </div>
              </div>
            </Button>

            <Button
              className="h-auto py-3 px-4 bg-purple-50 hover:bg-purple-100 text-purple-700 justify-start border border-purple-100 flex-1"
              onClick={() => {
                setSelectedRewardId("");
                setAssignRewardNotes("");
                setAssignRewardOpen(true);
              }}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-9 h-9 bg-purple-500 rounded-lg flex items-center justify-center shrink-0">
                  <Gift className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-purple-900">{t("Issue Reward")}</p>
                  <p className="text-xs text-purple-600">{t("Grant reward")}</p>
                </div>
              </div>
            </Button>

            <Button
              className="h-auto py-3 px-4 bg-amber-50 hover:bg-amber-100 text-amber-700 justify-start border border-amber-100 flex-1"
              onClick={() => {
                setSelectedCouponRewardId("");
                setClaimCouponOpen(true);
              }}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center shrink-0">
                  <Ticket className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-amber-900">{t("Redeem Coupon")}</p>
                  <p className="text-xs text-amber-600">{t("Select Reward")}</p>
                </div>
              </div>
            </Button>

            <Button
              className="h-auto py-3 px-4 bg-orange-50 hover:bg-orange-100 text-orange-700 justify-start border border-orange-100 flex-1"
              onClick={() => {
                setCouponCode("");
                setRedeemCouponOpen(true);
              }}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
                  <Ticket className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-orange-900">{t("Use coupon")}</p>
                  <p className="text-xs text-orange-600">{t("Mark as Used")}</p>
                </div>
              </div>
            </Button>

            <Button
              className="h-auto py-3 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 justify-start border border-indigo-100 flex-1"
              onClick={() => {
                setSelectedRewardId("");
                setClaimRewardOpen(true);
              }}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-9 h-9 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-indigo-900">{t("Redeem Reward")}</p>
                  <p className="text-xs text-indigo-600">{t("Use points")}</p>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Available Rewards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Available Rewards for Customer")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {availableRewards
              .filter((reward) => reward.status === "ACTIVE")
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
                        {reward.description || t("No description")}
                      </p>
                      {reward.rewardType === "coupon" && (
                        <p className="text-xs text-muted-foreground">
                          {t("Code:")} {(reward.rewardValue as any)?.code}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">{reward.pointsCost} pts</p>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {reward.pointsCost > (customer.currentPoints || 0)
                        ? t("Not enough points")
                        : t("Available")}
                    </Badge>
                  </div>
                </div>
              ))}
            {availableRewards.filter((r) => r.status === "ACTIVE").length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Gift className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">{t("No rewards available with current points")}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      {/* Pending Redemptions */}
      {unusedRedemptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Pending Redemptions")}</CardTitle>
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
                      <p className="font-medium text-sm">{redemption.reward?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("Redeemed:")} {new Date(redemption.createdAt).toLocaleDateString()}
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
      {/* Transaction History */}
      {transactions !== undefined && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {t("Transaction History")}
          </h3>
          <DataTable columns={transactionColumns} data={transactions} />
        </div>
      )}
      {/* Issue Points Modal */}
      <Dialog open={issuePointsOpen} onOpenChange={setIssuePointsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Issue Points")}</DialogTitle>
            <DialogDescription>
              Award points to {customer.name} for a purchase or activity.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="points-amount">{t("Purchase Amount")}</Label>
              <Input
                id="points-amount"
                type="number"
                placeholder={t("Enter amount")}
                value={pointsAmount}
                onChange={(e) => setPointsAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t("Points will be calculated based on earning rules")}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="points-notes">{t("Notes (optional)")}</Label>
              <Textarea
                id="points-notes"
                placeholder={t("Add any notes...")}
                value={pointsNotes}
                onChange={(e) => setPointsNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssuePointsOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button onClick={handleIssuePoints} disabled={!pointsAmount || awardPoints.isPending}>
              {awardPoints.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("Issuing...")}
                </>
              ) : (
                t("Issue Points")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Redeem Reward (Claim) Modal */}
      <Dialog open={claimRewardOpen} onOpenChange={setClaimRewardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Redeem Reward")}</DialogTitle>
            <DialogDescription>
              Select a reward for {customer.name} to redeem using their points.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("Select Reward")}</Label>
              <div className="space-y-2 max-h-75 overflow-y-auto">
                {availableRewards
                  .filter(
                    (r) =>
                      r.status === "ACTIVE" &&
                      r.rewardType !== "coupon" &&
                      r.pointsCost <= (customer.currentPoints || 0),
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
                        <p className="text-xs text-muted-foreground">{reward.description}</p>
                      </div>
                      <p className="text-sm font-semibold text-primary">{reward.pointsCost} pts</p>
                    </button>
                  ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClaimRewardOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button
              onClick={handleClaimReward}
              disabled={!selectedRewardId || redeemRewardMutation.isPending}
            >
              {redeemRewardMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("Claiming...")}
                </>
              ) : (
                t("Claim Reward")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Issue Reward Modal */}
      <Dialog open={assignRewardOpen} onOpenChange={setAssignRewardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Issue Reward")}</DialogTitle>
            <DialogDescription>Directly assign a reward to {customer.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("Select Reward")}</Label>
              <div className="space-y-2 max-h-75 overflow-y-auto">
                {issuableRewards.map((reward) => (
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
                        {reward.description || t("No description")}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assign-notes">{t("Notes (optional)")}</Label>
              <Textarea
                id="assign-notes"
                placeholder={t("Add any notes...")}
                value={assignRewardNotes}
                onChange={(e) => setAssignRewardNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignRewardOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button
              onClick={handleAssignReward}
              disabled={!selectedRewardId || assignReward.isPending}
            >
              {assignReward.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("Assigning...")}
                </>
              ) : (
                t("Assign Reward")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Redeem Coupon Modal */}
      <Dialog open={claimCouponOpen} onOpenChange={setClaimCouponOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Redeem Coupon")}</DialogTitle>
            <DialogDescription>{t("Select Reward")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("Select Reward")}</Label>
              <div className="space-y-2 max-h-75 overflow-y-auto">
                {availableRewards
                  .filter((coupon) => coupon.rewardType === "coupon" && coupon.status === "ACTIVE")
                  .map((coupon) => (
                    <button
                      key={coupon.id}
                      onClick={() => setSelectedCouponRewardId(coupon.id)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 border rounded-lg text-left transition-colors",
                        selectedCouponRewardId === coupon.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted",
                      )}
                    >
                      <div>
                        <p className="font-medium text-sm">{coupon.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {coupon.description || t("No description")}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {coupon.rewardValue?.code || t("Coupon Code")}
                      </Badge>
                    </button>
                  ))}
                {availableRewards.filter(
                  (coupon) => coupon.rewardType === "coupon" && coupon.status === "ACTIVE",
                ).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {t("No rewards available with current points")}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClaimCouponOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button
              onClick={handleClaimCoupon}
              disabled={!selectedCouponRewardId || redeemRewardMutation.isPending}
            >
              {redeemRewardMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("Claiming...")}
                </>
              ) : (
                t("Redeem Coupon")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Redeem Coupon Modal */}
      <Dialog open={redeemCouponOpen} onOpenChange={setRedeemCouponOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Use coupon")}</DialogTitle>
            <DialogDescription>Enter a coupon code for {customer.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="coupon-code">{t("Coupon Code")}</Label>
              <Input
                id="coupon-code"
                placeholder={t("Enter coupon code")}
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="uppercase"
              />
              <p className="text-xs text-muted-foreground">
                {t("Enter the coupon code provided by the customer")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRedeemCouponOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button onClick={handleRedeemCoupon} disabled={!couponCode}>
              {t("Mark as Used")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Use Redemption Modal */}
      <Dialog open={useRedemptionOpen} onOpenChange={setUseRedemptionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Use Redemption")}</DialogTitle>
            <DialogDescription>Mark a pending redemption as used.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("Select Redemption")}</Label>
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
                      <p className="font-medium text-sm">{redemption.reward?.name}</p>
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
            <Button variant="outline" onClick={() => setUseRedemptionOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button
              onClick={handleUseRedemption}
              disabled={!selectedRedemptionId || useRedemption.isPending}
            >
              {useRedemption.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("Processing...")}
                </>
              ) : (
                t("Mark as Used")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
