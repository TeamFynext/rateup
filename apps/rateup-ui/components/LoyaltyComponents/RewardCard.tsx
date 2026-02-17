"use client";

import { Edit2, Save, Trash2, X } from "lucide-react";
import { UseFormReturn } from "react-hook-form";

import { LoyaltyRewardStatus } from "@/types/enums";
import {
  CouponFormValues,
  GiftFormValues,
  PointRewardFormValues,
} from "@/app/dashboard/loyalty/rewards/schemas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { LoyaltyRewardForm } from "./LoyaltyRewardForm";

interface RewardCardProps {
  readonly reward: any; // Type this properly if possible
  readonly category: string;
  readonly isEditing: boolean;
  readonly onEditStart: () => void;
  readonly onEditCancel: () => void;
  readonly onEditSave: () => void; // This might need to trigger form submit
  readonly onDelete: () => void;
  readonly onToggleStatus: (checked: boolean) => void;

  // For Edit Form
  readonly forms: {
    readonly pointRewardForm: UseFormReturn<PointRewardFormValues>;
    readonly couponForm: UseFormReturn<CouponFormValues>;
    readonly giftForm: UseFormReturn<GiftFormValues>;
  };
  readonly rewardTierRestriction: boolean;
  readonly setRewardTierRestriction: (val: boolean) => void;
  readonly loyaltyTiers: any[] | undefined;
  readonly loyaltyTemplates: any[] | undefined;

  // Display Helpers
  readonly getRewardIcon: (type: string) => React.ReactNode;

  readonly isPending?: boolean;
}

export function RewardCard({
  reward,
  category,
  isEditing,
  onEditStart,
  onEditCancel,
  onEditSave,
  onDelete,
  onToggleStatus,
  forms,
  rewardTierRestriction,
  setRewardTierRestriction,
  loyaltyTiers,
  loyaltyTemplates,
  getRewardIcon,
  isPending = false,
}: RewardCardProps) {
  const getCategoryLabel = () => {
    switch (category) {
      case "point-rewards":
        return "Point Reward";
      case "coupons":
        return "Coupon";
      case "free-gifts":
        return "Free Gift";
      default:
        return "Reward";
    }
  };
  const lightGreen = "text-green-700 bg-green-50 border-green-200";
  const lightGray = "text-gray-600 bg-gray-100 border-gray-300";
  const lightBlue = "text-blue-700 bg-blue-50 border-blue-200";

  // Helper to render stats based on category
  const renderStats = () => {
    if (category === "point-rewards") {
      return (
        <>
          <div className={`px-2 py-1 rounded border ${lightBlue}`}>
            <p className="text-xs font-medium text-blue-700">
              {reward.pointsCost || 0} pts
            </p>
          </div>
          <div className={`px-2 py-1 rounded border ${lightGreen}`}>
            <p className="text-xs font-medium text-green-700">
              {reward.stockRedeemed || 0} redeemed
            </p>
          </div>
        </>
      );
    }
    if (category === "coupons") {
      return (
        <div className={`px-2 py-1 rounded border ${lightBlue}`}>
          <p className="text-xs font-medium text-blue-700">
            {reward.stockRedeemed || 0}/{reward.stockQuantity || "∞"}
          </p>
        </div>
      );
    }
    if (category === "free-gifts") {
      return (
        <div className={`px-2 py-1 rounded border ${lightBlue}`}>
          <p className="text-xs font-medium text-blue-700">
            {reward.stockRedeemed || 0}/{reward.stockQuantity || 0}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card
      className={`transition-all p-2 ${
        reward.status === LoyaltyRewardStatus.ACTIVE
          ? "bg-card"
          : "bg-muted/50 opacity-60"
      }`}
    >
      <CardContent className="p-3">
        {isEditing ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">
                Edit {getCategoryLabel()}
              </h4>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onEditCancel}
                  className="h-8"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onClick={onEditSave} className="h-8">
                  <Save className="w-3.5 h-3.5 mr-1" />
                  Save
                </Button>
              </div>
            </div>
            <LoyaltyRewardForm
              category={category}
              pointRewardForm={forms.pointRewardForm}
              couponForm={forms.couponForm}
              giftForm={forms.giftForm}
              rewardTierRestriction={rewardTierRestriction}
              setRewardTierRestriction={setRewardTierRestriction}
              loyaltyTiers={loyaltyTiers}
              loyaltyTemplates={loyaltyTemplates}
            />

            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Enable Reward</Label>
                <Switch
                  checked={reward.status === LoyaltyRewardStatus.ACTIVE}
                  onCheckedChange={onToggleStatus}
                />
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="h-8"
                onClick={onDelete}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Delete Reward
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <span className="text-xl shrink-0">
                {getRewardIcon(reward.rewardType || "")}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="font-medium text-sm leading-tight">
                    {reward.name}
                  </h4>
                  {category === "coupons" && reward.rewardValue?.code && (
                    <Badge variant="outline" className="text-xs font-mono h-5">
                      {reward.rewardValue.code}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {category === "coupons"
                    ? reward.rewardValue?.description ||
                      reward.description ||
                      "No description"
                    : reward.description || "No description"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {renderStats()}

              {reward.availableForTiers &&
                reward.availableForTiers.length > 0 && (
                  <div className="flex items-center gap-1">
                    {reward.availableForTiers
                      .slice(0, 3)
                      .map((tierId: string) => {
                        const tier = loyaltyTiers?.find((t) => t.id === tierId);
                        return tier ? (
                          <div
                            key={tier.id}
                            className="w-4 h-4 rounded-full border border-background shadow-sm"
                            style={{
                              backgroundColor: tier.color,
                            }}
                            title={tier.name}
                          />
                        ) : null;
                      })}
                    {reward.availableForTiers.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{reward.availableForTiers.length - 3}
                      </span>
                    )}
                  </div>
                )}
              <Badge
                variant="secondary"
                className={`text-xs h-5 ${reward.status === LoyaltyRewardStatus.ACTIVE ? lightGreen : lightGray} `}
              >
                {reward.status === LoyaltyRewardStatus.ACTIVE
                  ? "Active"
                  : "Inactive"}
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Switch
                checked={reward.status === LoyaltyRewardStatus.ACTIVE}
                onCheckedChange={onToggleStatus}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onEditStart}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={onDelete}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
