"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  Badge,
  Edit2,
  Loader2,
  Mail,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Label } from "recharts";

import {
  useCreateLoyaltyRewardMutation,
  useDeleteLoyaltyRewardMutation,
  useLoyaltyRewards,
  useToggleLoyaltyRewardStatusMutation,
} from "@/backend/loyalty/reward.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { RateupButtonBlue } from "@/components/Button/RateupButtons";
import { ContainedSelection } from "@/components/input/ContainedInput/ContainedInput";
import NothingFound from "@/components/NothingFound/NothingFound";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { useGetLoyaltyRewards } from "../../../../backend/loyalty/reward/reward.query";
import RateupLoader from "../../../../components/Loaders/RateupLoader";
import { RewardCard } from "../../../../components/LoyaltyComponents/Rewards/RewardCard";

enum rewardSortData {
  defaultPointsOrder = "Default Points Order",
  highToLowPoints = "Hight to Low Points",
  lowToHighPoints = "Low to High Points",
}

export default function Reward() {
  const router = useRouter();
  const translations = useTranslations();

  const {
    data: rewards,
    isLoading: isRewardsLoading,
    error: rewardsError,
  } = useLoyaltyRewards();

  const {
    data: subscription,
    isLoading: isSubscriptionLoading,
    refetch,
  } = useSubscription();

  const createRewardMutation = useCreateLoyaltyRewardMutation(() => {
    setRewardsViewMode("list");
  });
  const deleteRewardMutation = useDeleteLoyaltyRewardMutation();

  const [selectedOrder, setSelectedOrder] = useState(
    rewardSortData.defaultPointsOrder,
  );
  const [rewardsViewMode, setRewardsViewMode] = useState<"list" | "create">(
    "list",
  );
  if (isRewardsLoading || isSubscriptionLoading) {
    return <RateupLoader />;
  }

  if (rewardsError) {
    console.error(rewardsError);
  }

  if (
    !subscription?.features?.loyalty?.active ||
    !subscription?.features?.loyalty?.reward?.active
  )
    return <ErrorComponent refetch={refetch} />;

  // const rewardsCopy = [...rewards];

  // const sortedRewards =
  //   selectedOrder === rewardSortData.defaultPointsOrder
  //     ? rewards
  //     : rewardsCopy?.sort((a, b) =>
  //         selectedOrder === rewardSortData.highToLowPoints
  //           ? b.points - a.points
  //           : a.points - b.points,
  //       );

  const handleDeleteReward = (rewardId: string) => {
    if (confirm("Are you sure you want to delete this reward?")) {
      deleteRewardMutation.mutate(rewardId);
    }
  };

  const handleToggleStatus = (rewardId: string, currentStatus: string) => {
    const newStatus =
      currentStatus === "active" ? "inactive" : ("active" as const);
    const toggleMutation = useToggleLoyaltyRewardStatusMutation(rewardId);
    toggleMutation.mutate({ status: newStatus });
  };

  const getRewardIcon = (rewardType: string) => {
    switch (rewardType) {
      case "discount_fixed":
        return "💰";
      case "discount_percentage":
        return "💰";
      case "free_item":
        return "🎁";
      default:
        return "🎁";
    }
  };

  const getRewardType = (rewardType: string) => {
    switch (rewardType) {
      case "discount_fixed":
        return "Fixed Discount";
      case "discount_percentage":
        return "Percentage Discount";
      case "free_item":
        return "Free Item";
      default:
        return rewardType;
    }
  };

  const rewardsList = rewards || [];
  return (
    <div className="space-y-5">
      {rewardsViewMode === "list" && (
        <>
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl mb-1">{translations("Rewards")}</h1>
              <p className="text-sm text-muted-foreground">
                {translations("Manage loyalty program rewards")}
              </p>
            </div>
            <Button onClick={() => setRewardsViewMode("create")}>
              <Plus className="w-4 h-4 mr-2" />
              {translations("Create Reward")}
            </Button>
          </div>

          <div className="space-y-4">
            {/* Rewards Cards */}
            {rewardsList.map((reward) => (
              <Card
                key={reward.id}
                className={` ${
                  reward.status === "inactive" ? "bg-muted/30" : "bg-card"
                }`}
              >
                <CardContent className="p-5">
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Badge
                        className={
                          reward.status === "active"
                            ? "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/10 border border-green-500/20"
                            : "bg-gray-500/10 text-gray-700 dark:text-gray-400 hover:bg-gray-500/10 border border-gray-500/20"
                        }
                      >
                        {translations(reward.status || "active")}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {reward.status === "active"
                            ? translations("Active")
                            : translations("Inactive")}
                        </span>
                        <Switch
                          checked={reward.status === "active"}
                          onCheckedChange={() =>
                            handleToggleStatus(
                              reward.id,
                              reward.status || "active",
                            )
                          }
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(
                              `/dashboard/loyalty/rewards/${reward.id}`,
                            )
                          }
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteReward(reward.id)}
                          disabled={deleteRewardMutation.isPending}
                        >
                          {deleteRewardMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Reward Name and Description */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">
                        {getRewardIcon(reward.rewardType)}
                      </span>
                      <h3 className="font-semibold">{reward.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {reward.description || "No description provided"}
                    </p>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {/* Points Cost */}
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <p className="text-xs text-muted-foreground mb-1">
                        Points Cost
                      </p>
                      <p className="font-semibold text-[#1873E8]">
                        {reward.pointsCost} pts
                      </p>
                    </div>

                    {/* Reward Type */}
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                      <p className="text-xs text-muted-foreground mb-1">Type</p>
                      <p className="font-semibold text-purple-700">
                        {getRewardType(reward.rewardType)}
                      </p>
                    </div>

                    {/* Stock Redeemed */}
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <p className="text-xs text-muted-foreground mb-1">
                        Redeemed
                      </p>
                      <p className="font-semibold text-green-700">
                        {reward.stockRedeemed || 0}
                      </p>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {reward.stockQuantity && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Stock:</span>
                        <span>{reward.stockQuantity} available</span>
                      </div>
                    )}

                    {reward.redemptionRules?.spend_requirements
                      ?.minimum_spend && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Minimum Spend:</span>
                        <span>
                          AED{" "}
                          {
                            reward.redemptionRules.spend_requirements
                              .minimum_spend
                          }
                        </span>
                      </div>
                    )}

                    {reward.availableForTiers &&
                      reward.availableForTiers.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Available for:</span>
                          <span>{reward.availableForTiers.join(", ")}</span>
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {rewardsViewMode === "create" && (
        <div className="space-y-6">
          {/* Back button and header */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRewardsViewMode("list")}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl mb-6">Create New Reward</h2>

              <div className="space-y-5">
                {/* Reward Name */}
                <div className="space-y-2">
                  <Label>Reward Name</Label>
                  <Input placeholder="e.g., 10% OFF, Free Coffee" />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    className="min-h-[100px]"
                    placeholder="Describe what the customer gets..."
                  />
                </div>

                {/* Reward Type and Points Cost Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Reward Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed-cashback">
                          💰 Fixed Cashback (10% OFF)
                        </SelectItem>
                        <SelectItem value="free-item">🎁 Free Item</SelectItem>
                        <SelectItem value="free-service">
                          🚚 Free Service
                        </SelectItem>
                        <SelectItem value="discount">
                          🎟️ Discount Voucher
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Points Cost</Label>
                    <Input type="number" placeholder="0" />
                  </div>
                </div>

                {/* Cashback Amount */}
                <div className="space-y-2">
                  <Label>Cashback Amount (AED)</Label>
                  <Input type="number" placeholder="10" />
                </div>

                {/* WhatsApp Template */}
                <div className="space-y-2">
                  <Label>WhatsApp Template</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select WhatsApp template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cashback_redeemed">
                        Cashback Reward Redeemed
                      </SelectItem>
                      <SelectItem value="free_item">
                        Free Item Confirmation
                      </SelectItem>
                      <SelectItem value="free_delivery">
                        Free Delivery Activated
                      </SelectItem>
                      <SelectItem value="discount_voucher">
                        Discount Voucher Issued
                      </SelectItem>
                      <SelectItem value="reward_unlocked">
                        Reward Unlocked
                      </SelectItem>
                      <SelectItem value="redemption_success">
                        Redemption Success
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Template sent when customer redeems this reward
                  </p>
                </div>

                {/* Redemption Rules (Optional) */}
                <div className="pt-4">
                  <h3 className="text-base font-medium mb-4">
                    Redemption Rules (Optional)
                  </h3>

                  <div className="space-y-4">
                    {/* Minimum Spend Requirement */}
                    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            Minimum Spend Requirement
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Require a minimum purchase amount
                          </p>
                        </div>
                        <Switch className="data-[state=checked]:bg-[#1873E8]" />
                      </div>
                    </div>

                    {/* Time Restrictions */}
                    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Time Restrictions</p>
                          <p className="text-sm text-muted-foreground">
                            Limit redemption by day/time
                          </p>
                        </div>
                        <Switch className="data-[state=checked]:bg-[#1873E8]" />
                      </div>
                    </div>

                    {/* One-Time Use Only */}
                    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">One-Time Use Only</p>
                          <p className="text-sm text-muted-foreground">
                            Customer can only redeem once
                          </p>
                        </div>
                        <Switch className="data-[state=checked]:bg-[#1873E8]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-8">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setRewardsViewMode("list")}
                >
                  Cancel
                </Button>
                <Button className="flex-1 bg-gray-600 hover:bg-gray-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Reward
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
