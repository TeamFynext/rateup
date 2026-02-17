"use client";

import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { UseFormReturn } from "react-hook-form";

import {
  CouponFormValues,
  GiftFormValues,
  PointRewardFormValues,
} from "@/app/dashboard/loyalty/rewards/schemas";
import { LoyaltyRewardForm } from "@/components/LoyaltyComponents/LoyaltyRewardForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface RewardFormContainerProps {
  category: string;
  onCancel: () => void;
  // Forms
  pointRewardForm: UseFormReturn<PointRewardFormValues>;
  couponForm: UseFormReturn<CouponFormValues>;
  giftForm: UseFormReturn<GiftFormValues>;
  // Submit handlers
  onSubmitPointReward: (data: PointRewardFormValues) => void;
  onSubmitCoupon: (data: CouponFormValues) => void;
  onSubmitGift: (data: GiftFormValues) => void;
  // State
  isPending: boolean;
  editingId: string | null;
  rewardTierRestriction: boolean;
  setRewardTierRestriction: (val: boolean) => void;

  // Data
  loyaltyTiers: any[] | undefined;
  loyaltyTemplates: any[] | undefined;
}

export function RewardFormContainer({
  category,
  onCancel,
  pointRewardForm,
  couponForm,
  giftForm,
  onSubmitPointReward,
  onSubmitCoupon,
  onSubmitGift,
  isPending,
  editingId,
  rewardTierRestriction,
  setRewardTierRestriction,
  loyaltyTiers,
  loyaltyTemplates,
}: RewardFormContainerProps) {
  const getHeaderInfo = () => {
    switch (category) {
      case "point-rewards":
        return {
          title: "Create Point Reward",
          description:
            "Configure a reward that customers can redeem using their loyalty points",
        };
      case "coupons":
        return {
          title: "Create Coupon",
          description:
            "Create a coupon code that all users can apply for discounts",
        };
      case "free-gifts":
        return {
          title: "Create Free Gift",
          description:
            "Set up a personalized gift that can be assigned to customers",
        };
      case "referral":
        return {
          title: "Referral Program",
          description: "Referral rewards are managed automatically",
        };
      default:
        return { title: "", description: "" };
    }
  };

  const { title, description } = getHeaderInfo();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl mb-2">{title}</h2>
          <p className="text-sm text-muted-foreground mb-6">{description}</p>

          <LoyaltyRewardForm
            category={category}
            pointRewardForm={pointRewardForm}
            couponForm={couponForm}
            giftForm={giftForm}
            rewardTierRestriction={rewardTierRestriction}
            setRewardTierRestriction={setRewardTierRestriction}
            loyaltyTiers={loyaltyTiers}
            loyaltyTemplates={loyaltyTemplates}
          />

          {/* Action Buttons */}
          <div className="flex gap-3 mt-8">
            <Button
              variant="outline"
              type="button"
              className="flex-1"
              onClick={onCancel}
            >
              Cancel
            </Button>
            {category === "point-rewards" && (
              <Button
                type="submit"
                className="flex-1 bg-[#1873E8] hover:bg-[#1873E8]/90"
                onClick={pointRewardForm.handleSubmit(onSubmitPointReward)}
                disabled={isPending}
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {!isPending && <Plus className="w-4 h-4 mr-2" />}
                {editingId ? "Update Reward" : "Create Reward"}
              </Button>
            )}
            {category === "coupons" && (
              <Button
                type="submit"
                className="flex-1 bg-[#1873E8] hover:bg-[#1873E8]/90"
                onClick={couponForm.handleSubmit(onSubmitCoupon)}
                disabled={isPending}
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {!isPending && <Plus className="w-4 h-4 mr-2" />}
                {editingId ? "Update Coupon" : "Create Coupon"}
              </Button>
            )}
            {category === "free-gifts" && (
              <Button
                type="submit"
                className="flex-1 bg-[#1873E8] hover:bg-[#1873E8]/90"
                onClick={giftForm.handleSubmit(onSubmitGift)}
                disabled={isPending}
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {!isPending && <Plus className="w-4 h-4 mr-2" />}
                {editingId ? "Update Gift" : "Create Free Gift"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
