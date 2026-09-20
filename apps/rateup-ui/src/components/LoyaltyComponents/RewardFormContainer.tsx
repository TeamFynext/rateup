import { IconArrowLeft, IconPlus } from "@tabler/icons-react";
import type { UseFormReturn } from "react-hook-form";

import type { LoyaltyTier } from "@/backend/loyalty/tier.api";
import type { WaTemplateListEntry } from "@/backend/whatsapp/whatsapp.api";
import type {
  CouponFormValues,
  CouponValues,
  GiftFormValues,
  GiftValues,
  PointRewardFormValues,
  PointRewardValues,
} from "@/components/dashboard/loyalty/rewards/schemas.ts";
import { LoyaltyRewardForm } from "@/components/LoyaltyComponents/LoyaltyRewardForm.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";

interface RewardFormContainerProps {
  category: string;
  onCancel: () => void;
  // Forms
  pointRewardForm: UseFormReturn<PointRewardFormValues, unknown, PointRewardValues>;
  couponForm: UseFormReturn<CouponFormValues, unknown, CouponValues>;
  giftForm: UseFormReturn<GiftFormValues, unknown, GiftValues>;
  // Submit handlers
  onSubmitPointReward: (data: PointRewardValues) => void;
  onSubmitCoupon: (data: CouponValues) => void;
  onSubmitGift: (data: GiftValues) => void;
  // State
  isPending: boolean;
  editingId: string | null;
  rewardTierRestriction: boolean;
  setRewardTierRestriction: (val: boolean) => void;
  minimumSpendEnabled: boolean;
  setMinimumSpendEnabled: (val: boolean) => void;
  timeRestrictionsEnabled: boolean;
  setTimeRestrictionsEnabled: (val: boolean) => void;

  // Data
  loyaltyTiers: LoyaltyTier[] | undefined;
  loyaltyTemplates: WaTemplateListEntry[] | undefined;
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
  minimumSpendEnabled,
  setMinimumSpendEnabled,
  timeRestrictionsEnabled,
  setTimeRestrictionsEnabled,
  loyaltyTiers,
  loyaltyTemplates,
}: Readonly<RewardFormContainerProps>) {
  const getHeaderInfo = () => {
    switch (category) {
      case "point-rewards":
        return {
          title: "Create Point Reward",
          description: "Configure a reward that customers can redeem using their loyalty points",
        };
      case "coupons":
        return {
          title: "Create Coupon",
          description: "Create a coupon code that all users can apply for discounts",
        };
      case "free-gifts":
        return {
          title: "Create Free Gift",
          description: "Set up a personalized gift that can be assigned to customers",
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
          className="text-muted-foreground hover:text-foreground"
        >
          <IconArrowLeft className="w-4 h-4 mr-2" />
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
            minimumSpendEnabled={minimumSpendEnabled}
            setMinimumSpendEnabled={setMinimumSpendEnabled}
            timeRestrictionsEnabled={timeRestrictionsEnabled}
            setTimeRestrictionsEnabled={setTimeRestrictionsEnabled}
            loyaltyTiers={loyaltyTiers}
            loyaltyTemplates={loyaltyTemplates}
          />

          {/* Action Buttons */}
          <div className="flex gap-3 mt-8">
            <Button variant="outline" type="button" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
            {category === "point-rewards" && (
              <Button
                type="submit"
                className="flex-1"
                onClick={pointRewardForm.handleSubmit(onSubmitPointReward)}
                loading={isPending}
              >
                {!isPending && <IconPlus className="w-4 h-4 mr-2" />}
                {editingId ? "Update Reward" : "Create Reward"}
              </Button>
            )}
            {category === "coupons" && (
              <Button
                type="submit"
                className="flex-1"
                onClick={couponForm.handleSubmit(onSubmitCoupon)}
                loading={isPending}
              >
                {!isPending && <IconPlus className="w-4 h-4 mr-2" />}
                {editingId ? "Update Coupon" : "Create Coupon"}
              </Button>
            )}
            {category === "free-gifts" && (
              <Button
                type="submit"
                className="flex-1"
                onClick={giftForm.handleSubmit(onSubmitGift)}
                loading={isPending}
              >
                {!isPending && <IconPlus className="w-4 h-4 mr-2" />}
                {editingId ? "Update Gift" : "Create Free Gift"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
