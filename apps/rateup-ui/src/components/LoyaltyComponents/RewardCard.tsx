import { IconDeviceFloppy, IconPencil, IconTrash, IconX } from "@tabler/icons-react";
import { useId } from "react";
import type { UseFormReturn } from "react-hook-form";

import type { LoyaltyReward } from "@/backend/loyalty/reward.api";
import type { LoyaltyTier } from "@/backend/loyalty/tier.api";
import type { WaTemplateListEntry } from "@/backend/whatsapp/whatsapp.api";
import { RewardWorthLine } from "@/components/dashboard/loyalty/giveback/RewardWorthLine.tsx";
import { useRewardEconomicsContext } from "@/components/dashboard/loyalty/giveback/useRewardEconomicsContext.ts";
import type {
  CouponFormValues,
  GiftFormValues,
  PointRewardFormValues,
} from "@/components/dashboard/loyalty/rewards/schemas.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { LoyaltyRewardStatus } from "@/types/enums.ts";

import { LoyaltyRewardForm } from "./LoyaltyRewardForm.tsx";

interface RewardCardProps {
  readonly reward: LoyaltyReward;
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
  readonly minimumSpendEnabled: boolean;
  readonly setMinimumSpendEnabled: (val: boolean) => void;
  readonly timeRestrictionsEnabled: boolean;
  readonly setTimeRestrictionsEnabled: (val: boolean) => void;
  readonly loyaltyTiers: LoyaltyTier[] | undefined;
  readonly loyaltyTemplates: WaTemplateListEntry[] | undefined;

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
  minimumSpendEnabled,
  setMinimumSpendEnabled,
  timeRestrictionsEnabled,
  setTimeRestrictionsEnabled,
  loyaltyTiers,
  loyaltyTemplates,
  getRewardIcon,
}: RewardCardProps) {
  const uid = useId();
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
  const lightGreen =
    "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900";
  const lightGray = "text-muted-foreground bg-muted border-border";
  const lightBlue =
    "text-blue-700 dark:text-blue-400 bg-ru-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900";

  // What a point is worth here, so a reward's cost can be shown in money and not only in
  // points. Both queries behind this are cached app-wide, so it adds no request.
  const economics = useRewardEconomicsContext();

  // Helper to render stats based on category
  const renderStats = () => {
    if (category === "point-rewards") {
      return (
        <>
          <div className={`px-2 py-1 rounded border ${lightBlue}`}>
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
              {reward.pointsCost || 0} pts
            </p>
          </div>
          <RewardWorthLine
            rewardValue={reward.rewardValue}
            pointsCost={reward.pointsCost || 0}
            earnRate={economics.earnRate}
            averageOrderValue={economics.averageOrderValue}
            currencySymbol={economics.currencySymbol}
            currencyCode={economics.currencyCode}
            variant="chip"
          />
          <div className={`px-2 py-1 rounded border ${lightGreen}`}>
            <p className="text-xs font-medium text-green-700 dark:text-green-400">
              {reward.stockRedeemed || 0} redeemed
            </p>
          </div>
        </>
      );
    }
    if (category === "coupons") {
      return (
        <div className={`px-2 py-1 rounded border ${lightBlue}`}>
          <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
            {reward.stockRedeemed || 0}/{reward.stockQuantity || "∞"}
          </p>
        </div>
      );
    }
    if (category === "free-gifts") {
      return (
        <div className={`px-2 py-1 rounded border ${lightBlue}`}>
          <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
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
        reward.status === LoyaltyRewardStatus.ACTIVE ? "bg-card" : "bg-muted/50 opacity-60"
      }`}
    >
      <CardContent className="p-3">
        {isEditing ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">Edit {getCategoryLabel()}</h4>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={onEditCancel} className="h-8">
                  <IconX className="w-3.5 h-3.5 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onClick={onEditSave} className="h-8">
                  <IconDeviceFloppy className="w-3.5 h-3.5 mr-1" />
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
              minimumSpendEnabled={minimumSpendEnabled}
              setMinimumSpendEnabled={setMinimumSpendEnabled}
              timeRestrictionsEnabled={timeRestrictionsEnabled}
              setTimeRestrictionsEnabled={setTimeRestrictionsEnabled}
              loyaltyTiers={loyaltyTiers}
              loyaltyTemplates={loyaltyTemplates}
            />

            <div className="flex items-center justify-between pt-3 border-t gap-2">
              <Field orientation="horizontal">
                <FieldLabel htmlFor={`${uid}-enable-reward`} className="text-xs">
                  Enable Reward
                </FieldLabel>
                <Switch
                  id={`${uid}-enable-reward`}
                  checked={reward.status === LoyaltyRewardStatus.ACTIVE}
                  onCheckedChange={onToggleStatus}
                />
              </Field>
              <Button variant="destructive" size="sm" className="h-8" onClick={onDelete}>
                <IconTrash className="w-3.5 h-3.5 mr-1" />
                Delete Reward
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <span className="text-xl shrink-0">
                {/* `getRewardIcon` keys on the *sub*-type (fixed-discount, free-item, …),
                    which lives inside `rewardValue`. `reward.rewardType` is the coarse
                    point/coupon/assigned, so passing it always fell through to the
                    default icon. */}
                {getRewardIcon(reward.rewardValue?.rewardType || reward.rewardType || "")}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="font-medium text-sm leading-tight">{reward.name}</h4>
                  {category === "coupons" && reward.rewardValue?.code && (
                    <Badge variant="outline" className="text-xs font-mono h-5">
                      {reward.rewardValue.code}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {category === "coupons"
                    ? reward.rewardValue?.description || reward.description || "No description"
                    : reward.description || "No description"}
                </p>
                {category === "point-rewards" && (
                  <RewardWorthLine
                    className="mt-0.5 block truncate"
                    rewardValue={reward.rewardValue}
                    pointsCost={reward.pointsCost || 0}
                    earnRate={economics.earnRate}
                    averageOrderValue={economics.averageOrderValue}
                    currencySymbol={economics.currencySymbol}
                    currencyCode={economics.currencyCode}
                  />
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {renderStats()}

              {reward.availableForTiers && reward.availableForTiers.length > 0 && (
                <div className="flex items-center gap-1">
                  {reward.availableForTiers.slice(0, 3).map((tierId: string) => {
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
                {reward.status === LoyaltyRewardStatus.ACTIVE ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Switch
                checked={reward.status === LoyaltyRewardStatus.ACTIVE}
                onCheckedChange={onToggleStatus}
              />
              <Button
                aria-label="Edit"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onEditStart}
              >
                <IconPencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                aria-label="Delete"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                onClick={onDelete}
              >
                <IconTrash className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
