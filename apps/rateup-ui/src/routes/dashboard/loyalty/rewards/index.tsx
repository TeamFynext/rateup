import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Gift,
  Link2,
  Loader2,
  MessageCircle,
  Plus,
  Save,
  ShoppingBag,
  Sparkles,
  Tag,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { z } from "zod";

import {
  useLoyaltyProgram,
  useUpdateLoyaltyProgramMutation,
} from "@/backend/loyalty/program.query";
import {
  useCreateLoyaltyRewardMutation,
  useDeleteLoyaltyRewardMutation,
  useLoyaltyRewardById,
  useLoyaltyRewards,
  useToggleLoyaltyRewardStatusMutation,
  useUpdateLoyaltyRewardMutation,
} from "@/backend/loyalty/reward.query";
import { useLoyaltyTiers } from "@/backend/loyalty/tier.query";
import { useSubscription } from "@/backend/subscription/subscription.query";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import ErrorComponent from "@/components/404/ErrorComponent.tsx";
import InfoButton from "@/components/Button/InfoButton.tsx";
import RateupLoader from "@/components/Loaders/RateupLoader.tsx";
import { RewardCard } from "@/components/LoyaltyComponents/RewardCard.tsx";
import { RewardFormContainer } from "@/components/LoyaltyComponents/RewardFormContainer.tsx";
import ConfirmationModal from "@/components/Modal/ConfirmationModal.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { LoyaltyRewardStatus, TemplateType } from "@/types/enums.ts";
import { docsPath } from "@/utils/constants.ts";

import {
  couponSchema,
  giftSchema,
  pointRewardSchema,
} from "../../../../components/dashboard/loyalty/rewards/schemas.ts";

export const Route = createFileRoute("/dashboard/loyalty/rewards/")({
  component: RewardsPage,
});

function RewardsPage() {
  // Backend queries
  const { data: rewards, isLoading: isRewardsLoading, error: rewardsError } = useLoyaltyRewards();
  const { data: subscription, isLoading: isSubscriptionLoading, refetch } = useSubscription();
  const { data: loyaltyProgram } = useLoyaltyProgram();
  const { data: loyaltyTiers, isLoading: isTiersLoading } = useLoyaltyTiers();
  const { data: templates } = useWaTemplates();

  // Mutations
  const updateLoyaltyProgramMutation = useUpdateLoyaltyProgramMutation(loyaltyProgram?.id || "");
  const createRewardMutation = useCreateLoyaltyRewardMutation(() => {
    setRewardsViewMode("list");
    resetForm();
  });
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [editingGiftId, setEditingGiftId] = useState<string | null>(null);
  const activeEditingRewardId = editingRewardId || editingCouponId || editingGiftId || "";
  const updateRewardMutation = useUpdateLoyaltyRewardMutation(activeEditingRewardId, () => {
    setRewardsViewMode("list");
    setEditingRewardId(null);
    setEditingCouponId(null);
    setEditingGiftId(null);
    resetForm();
  });
  const deleteRewardMutation = useDeleteLoyaltyRewardMutation();
  const toggleRewardStatusMutation = useToggleLoyaltyRewardStatusMutation();

  // Default Values
  const defaultPointRewardValues: z.infer<typeof pointRewardSchema> = {
    name: "",
    description: "",
    rewardType: "fixed-discount",
    pointsCost: 0,
    cashbackAmount: 0,
    discountPercentage: 0,
    estimatedValue: 0,
    restrictions: "",
    waTemplateId: "",
    tierIds: [],
    minimumSpend: undefined,
    availableDays: [],
    timeFrom: undefined,
    timeTo: undefined,
  };

  const defaultCouponValues: z.infer<typeof couponSchema> = {
    name: "",
    description: "",
    couponCode: "",
    couponDescription: "",
    discountType: "percentage",
    discountValue: 0,
    stockQuantity: 0,
    perUserLimit: 1,
    validFrom: "",
    validTo: "",
    termsAndConditions: "",
    minimumSpend: 0,
    waTemplateId: "",
    tierIds: [],
  };

  const defaultGiftValues: z.infer<typeof giftSchema> = {
    name: "",
    description: "",
    giftQuantity: 1,
    estimatedValue: 0,
    restrictions: "",
    waTemplateId: "",
    tierIds: [],
  };

  // Form instances
  const pointRewardForm = useForm<z.infer<typeof pointRewardSchema>>({
    resolver: zodResolver(pointRewardSchema as any),
    defaultValues: defaultPointRewardValues,
  });

  const couponForm = useForm<z.infer<typeof couponSchema>>({
    resolver: zodResolver(couponSchema as any),
    defaultValues: defaultCouponValues,
  });

  const giftForm = useForm<z.infer<typeof giftSchema>>({
    resolver: zodResolver(giftSchema as any),
    defaultValues: defaultGiftValues,
  });

  const [rewardsViewMode, setRewardsViewMode] = useState("list");
  const [selectedRewardCategory, setSelectedRewardCategory] = useState("point-rewards");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteReward, setPendingDeleteReward] = useState<{
    id: string;
    name?: string | null;
  } | null>(null);

  // Form states
  const [rewardFormCategory, setRewardFormCategory] = useState("point-rewards");
  const [rewardTierRestriction, setRewardTierRestriction] = useState(false);
  const [minimumSpendEnabled, setMinimumSpendEnabled] = useState(false);
  const [timeRestrictionsEnabled, setTimeRestrictionsEnabled] = useState(false);

  // Referral settings
  const [referralBonus, setReferralBonus] = useState(0);
  const [referralBonusType, setReferralBonusType] = useState<"points" | "gift">("points");
  const [referralRewardId, setReferralRewardId] = useState<string | undefined>(undefined);
  const [refereeBonus, setRefereeBonus] = useState(0);
  const [refereeBonusType, setRefereeBonusType] = useState<"points" | "gift">("points");
  const [refereeRewardId, setRefereeRewardId] = useState<string | undefined>(undefined);

  // Form field states
  const { data: editingReward } = useLoyaltyRewardById(activeEditingRewardId);
  const { t: translations } = useTranslation();
  const startEditingReward = (id: string, category: "point-rewards" | "coupons" | "free-gifts") => {
    setEditingRewardId(category === "point-rewards" ? id : null);
    setEditingCouponId(category === "coupons" ? id : null);
    setEditingGiftId(category === "free-gifts" ? id : null);
  };

  const cancelEditingReward = (category: "point-rewards" | "coupons" | "free-gifts") => {
    if (category === "point-rewards") {
      setEditingRewardId(null);
    }
    if (category === "coupons") {
      setEditingCouponId(null);
    }
    if (category === "free-gifts") {
      setEditingGiftId(null);
    }
    setRewardTierRestriction(false);
  };

  const resetPointRewardForm = (reward: any) => {
    const pointRewardValue = reward.rewardValue || {};
    const cashbackAmount = Number(pointRewardValue.cashbackAmount || 0);
    const discountPercentage = Number(pointRewardValue.discountPercentage || 0);
    const estimatedValue = Number(pointRewardValue.estimatedValue || 0);
    const termsAndConditions =
      pointRewardValue.termsAndConditions || pointRewardValue.restrictions || "";

    const storedRewardType = pointRewardValue.rewardType;
    let rewardType: z.infer<typeof pointRewardSchema>["rewardType"] = "fixed-discount";

    if (
      storedRewardType === "fixed-discount" ||
      storedRewardType === "percentage-discount" ||
      storedRewardType === "free-item" ||
      storedRewardType === "free-service"
    ) {
      rewardType = storedRewardType;
    } else if (discountPercentage > 0) {
      rewardType = "percentage-discount";
    } else if (estimatedValue > 0) {
      rewardType = "free-item";
    }

    const spendMin = reward.redemptionRules?.spend_requirements?.minimum_spend;
    const timeRestrictions = reward.redemptionRules?.time_restrictions;

    pointRewardForm.reset({
      name: reward.name || "",
      description: reward.description || "",
      rewardType,
      pointsCost: reward.pointsCost || 0,
      waTemplateId: reward.waTemplateId || undefined,
      tierIds: reward.availableForTiers || [],
      cashbackAmount,
      discountPercentage,
      estimatedValue,
      restrictions: termsAndConditions,
      minimumSpend: spendMin ? Number(spendMin) : undefined,
      availableDays: timeRestrictions?.allowed_days || [],
      timeFrom: timeRestrictions?.allowed_time_ranges?.[0]?.start || undefined,
      timeTo: timeRestrictions?.allowed_time_ranges?.[0]?.end || undefined,
    });

    setMinimumSpendEnabled(!!spendMin);
    setTimeRestrictionsEnabled(
      (timeRestrictions?.allowed_days?.length || 0) > 0 ||
        (timeRestrictions?.allowed_time_ranges?.length || 0) > 0,
    );
  };

  useEffect(() => {
    if (loyaltyProgram) {
      setReferralBonus(loyaltyProgram.referralBonus || 0);
      setReferralBonusType(loyaltyProgram.referralBonusType || "points");
      setReferralRewardId(loyaltyProgram.referralRewardId);
      setRefereeBonus(loyaltyProgram.refereeBonus || 0);
      setRefereeBonusType(loyaltyProgram.refereeBonusType || "points");
      setRefereeRewardId(loyaltyProgram.refereeRewardId);
    }
  }, [loyaltyProgram]);

  useEffect(() => {
    if (editingReward) {
      if (editingReward.rewardType === "point") {
        resetPointRewardForm(editingReward);
      } else if (editingReward.rewardType === "coupon") {
        const couponRewardValue = editingReward.rewardValue || {};
        const couponTimeRestrictions = editingReward.redemptionRules?.time_restrictions;
        couponForm.reset({
          name: editingReward.name || "",
          description: editingReward.description || "",
          couponCode: editingReward.rewardValue?.code || "",
          couponDescription: editingReward.rewardValue?.description || "",
          discountType: couponRewardValue.discountType === "fixed" ? "fixed" : "percentage",
          discountValue: Number(couponRewardValue.discountValue || 0),
          stockQuantity: editingReward.stockQuantity || 0,
          perUserLimit:
            Number(
              editingReward.redemptionRules?.quantity_restrictions?.max_redemptions_per_customer,
            ) || 1,
          validFrom: couponTimeRestrictions?.valid_from
            ? String(couponTimeRestrictions.valid_from).slice(0, 10)
            : "",
          validTo: couponTimeRestrictions?.valid_until
            ? String(couponTimeRestrictions.valid_until).slice(0, 10)
            : "",
          termsAndConditions:
            couponRewardValue.termsAndConditions || couponRewardValue.restrictions || "",
          minimumSpend:
            Number(editingReward.redemptionRules?.spend_requirements?.minimum_spend) || 0,
          waTemplateId: editingReward.waTemplateId || undefined,
          tierIds: editingReward.availableForTiers || [],
        });
      } else if (editingReward.rewardType === "assigned") {
        giftForm.reset({
          name: editingReward.name || "",
          description: editingReward.description || "",
          giftQuantity: editingReward.stockQuantity || 1,
          waTemplateId: editingReward.waTemplateId || undefined,
          tierIds: editingReward.availableForTiers || [],
          // Default others
          estimatedValue: 0,
          restrictions: "",
        });
      }
      setRewardTierRestriction((editingReward.availableForTiers?.length || 0) > 0);
    }
  }, [editingReward]);

  const resetForm = () => {
    setEditingRewardId(null);
    setEditingCouponId(null);
    setEditingGiftId(null);
    pointRewardForm.reset(defaultPointRewardValues);
    couponForm.reset(defaultCouponValues);
    giftForm.reset(defaultGiftValues);
    setRewardTierRestriction(false);
    setMinimumSpendEnabled(false);
    setTimeRestrictionsEnabled(false);
  };

  const handleSaveReferralSettings = () => {
    if (loyaltyProgram?.id) {
      updateLoyaltyProgramMutation.mutate({
        referralBonus: referralBonusType === "points" ? referralBonus : 0,
        referralBonusType,
        referralRewardId: referralBonusType === "gift" ? referralRewardId : undefined,
        refereeBonus: refereeBonusType === "points" ? refereeBonus : 0,
        refereeBonusType,
        refereeRewardId: refereeBonusType === "gift" ? refereeRewardId : undefined,
      });
    }
  };

  const handleDeleteReward = (rewardId: string, rewardName?: string | null) => {
    setPendingDeleteReward({ id: rewardId, name: rewardName });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDeleteReward = () => {
    if (!pendingDeleteReward?.id) {
      return;
    }

    deleteRewardMutation.mutate(pendingDeleteReward.id, {
      onSettled: () => {
        setDeleteDialogOpen(false);
        setPendingDeleteReward(null);
      },
    });
  };

  const onSubmitPointReward = (data: z.infer<typeof pointRewardSchema>) => {
    const redemptionRules: Record<string, unknown> = {};

    if (data.minimumSpend !== undefined && data.minimumSpend > 0) {
      redemptionRules.spend_requirements = {
        minimum_spend: data.minimumSpend,
      };
    }

    if ((data.availableDays && data.availableDays.length > 0) || data.timeFrom || data.timeTo) {
      redemptionRules.time_restrictions = {
        ...(data.availableDays?.length ? { allowed_days: data.availableDays } : {}),
        ...(data.timeFrom || data.timeTo
          ? {
              allowed_time_ranges: [
                {
                  start: data.timeFrom || "00:00",
                  end: data.timeTo || "23:59",
                },
              ],
            }
          : {}),
      };
    }

    const payload: any = {
      name: data.name,
      description: data.description,
      rewardType: "point",
      pointsCost: data.pointsCost,
      rewardValue: {
        points: data.pointsCost,
        cashbackAmount: data.cashbackAmount || undefined,
        discountPercentage: data.discountPercentage || undefined,
        estimatedValue: data.estimatedValue || undefined,
        termsAndConditions: data.restrictions || undefined,
        restrictions: data.restrictions || undefined,
        rewardType: data.rewardType,
      },
      waTemplateId: data.waTemplateId || undefined,
      availableForTiers: rewardTierRestriction && data.tierIds?.length ? data.tierIds : [],
      redemptionRules,
    };

    if (editingRewardId) {
      updateRewardMutation.mutate(payload);
    } else {
      createRewardMutation.mutate(payload);
    }
  };

  const onSubmitCoupon = (data: z.infer<typeof couponSchema>) => {
    const redemptionRules: Record<string, unknown> = {};

    if (data.minimumSpend !== undefined && data.minimumSpend > 0) {
      redemptionRules.spend_requirements = {
        minimum_spend: data.minimumSpend,
      };
    }

    if (data.perUserLimit !== undefined && data.perUserLimit > 0) {
      redemptionRules.quantity_restrictions = {
        max_redemptions_per_customer: data.perUserLimit,
      };
    }

    if (data.validFrom || data.validTo) {
      redemptionRules.time_restrictions = {
        ...(data.validFrom ? { valid_from: new Date(data.validFrom).toISOString() } : {}),
        ...(data.validTo ? { valid_until: new Date(data.validTo).toISOString() } : {}),
      };
    }

    const payload: any = {
      name: data.name,
      description: data.description,
      rewardType: "coupon",
      pointsCost: 0,
      rewardValue: {
        code: data.couponCode,
        description: data.couponDescription,
        discountType: data.discountType || undefined,
        discountValue: data.discountValue || undefined,
        termsAndConditions: data.termsAndConditions || undefined,
        restrictions: data.termsAndConditions || undefined,
      },
      stockQuantity: data.stockQuantity,
      waTemplateId: data.waTemplateId || undefined,
      availableForTiers: rewardTierRestriction && data.tierIds?.length ? data.tierIds : [],
      redemptionRules,
    };

    if (editingCouponId) {
      updateRewardMutation.mutate(payload);
    } else {
      createRewardMutation.mutate(payload);
    }
  };

  const onSubmitGift = (data: z.infer<typeof giftSchema>) => {
    const payload: any = {
      name: data.name,
      description: data.description,
      rewardType: "assigned",
      pointsCost: 0,
      rewardValue: {
        description: data.description || "",
      },
      stockQuantity: data.giftQuantity,
      waTemplateId: data.waTemplateId || undefined,
      availableForTiers: rewardTierRestriction && data.tierIds?.length ? data.tierIds : [],
      redemptionRules: {},
    };

    if (editingGiftId) {
      updateRewardMutation.mutate(payload);
    } else {
      createRewardMutation.mutate(payload);
    }
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case "fixed-discount":
        return "💰";
      case "percentage-discount":
        return "📊";
      case "free-item":
      case "free-service":
        return "🎁";
      case "coupon":
        return "🎟️";
      case "free-gift":
        return "🎁";
      default:
        return "🎁";
    }
  };

  const loyaltyTemplates = templates?.filter((t) => t.templateType === TemplateType.LOYALTY);

  // Filter rewards by category
  const rewardsList = rewards?.filter((r) => r.rewardType === "point") || [];

  const couponsList = rewards?.filter((r) => r.rewardType === "coupon") || [];

  const freeGiftsList = rewards?.filter((r) => r.rewardType === "assigned") || [];

  if (isRewardsLoading || isSubscriptionLoading || isTiersLoading) {
    return <RateupLoader />;
  }

  if (rewardsError) {
    console.error(rewardsError);
  }

  if (
    !subscription?.features?.loyalty?.active ||
    !subscription?.features?.loyalty?.reward?.active
  ) {
    return <ErrorComponent refetch={refetch} />;
  }

  return (
    <div className="space-y-5 relative">
      {rewardsViewMode === "list" && (
        <>
          {/* Header */}{" "}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-2xl mb-1">Rewards</h1>
              <p className="text-sm text-muted-foreground">
                Manage all types of rewards - point-based, coupons, and referral programs
              </p>
            </div>
            <InfoButton docUrl={`${docsPath}/loyality/rewards`} />
          </div>
          {/* Category Tabs */}
          <Tabs
            value={selectedRewardCategory}
            onValueChange={setSelectedRewardCategory}
            className="space-y-4"
          >
            <TabsList>
              <TabsTrigger value="point-rewards">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  <span>Point Rewards</span>
                  <Badge variant="outline" className="text-xs">
                    {rewardsList.length}
                  </Badge>
                </div>
              </TabsTrigger>
              <TabsTrigger value="coupons">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4" />
                  <span>Coupons</span>
                  <Badge variant="outline" className="text-xs">
                    {couponsList.length}
                  </Badge>
                </div>
              </TabsTrigger>
              <TabsTrigger value="free-gifts">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4" />
                  <span>Free Gifts</span>
                  <Badge variant="outline" className="text-xs">
                    {freeGiftsList.length}
                  </Badge>
                </div>
              </TabsTrigger>
              <TabsTrigger value="referral">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  <span>Referral Program</span>
                  <Badge variant="outline" className="text-xs">
                    Auto
                  </Badge>
                </div>
              </TabsTrigger>
            </TabsList>

            {/* Point Rewards */}
            <TabsContent value="point-rewards" className="space-y-3 mt-0">
              <div className="flex items-start justify-between">
                <p className="text-sm text-muted-foreground">
                  Traditional rewards where customers spend points to get benefits
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setRewardFormCategory("point-rewards");
                    setRewardsViewMode("create");
                    resetForm();
                  }}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create Reward
                </Button>
              </div>

              <div className="space-y-2">
                {rewardsList.map((reward) => (
                  <RewardCard
                    key={reward.id}
                    reward={reward}
                    category="point-rewards"
                    isEditing={editingRewardId === reward.id}
                    onEditStart={() => startEditingReward(reward.id, "point-rewards")}
                    onEditCancel={() => cancelEditingReward("point-rewards")}
                    onEditSave={pointRewardForm.handleSubmit(onSubmitPointReward)}
                    onDelete={() => handleDeleteReward(reward.id, reward.name)}
                    isPending={deleteRewardMutation.isPending}
                    onToggleStatus={(checked) => {
                      const newStatus = checked
                        ? LoyaltyRewardStatus.ACTIVE
                        : LoyaltyRewardStatus.INACTIVE;
                      toggleRewardStatusMutation.mutate({
                        rewardId: reward.id,
                        status: newStatus,
                      });
                    }}
                    forms={{ pointRewardForm, couponForm, giftForm }}
                    rewardTierRestriction={rewardTierRestriction}
                    setRewardTierRestriction={setRewardTierRestriction}
                    minimumSpendEnabled={minimumSpendEnabled}
                    setMinimumSpendEnabled={setMinimumSpendEnabled}
                    timeRestrictionsEnabled={timeRestrictionsEnabled}
                    setTimeRestrictionsEnabled={setTimeRestrictionsEnabled}
                    loyaltyTiers={loyaltyTiers}
                    loyaltyTemplates={loyaltyTemplates}
                    getRewardIcon={getRewardIcon}
                  />
                ))}
              </div>
            </TabsContent>

            {/* Coupons */}
            <TabsContent value="coupons" className="space-y-3 mt-0">
              <div className="flex items-start justify-between">
                <p className="text-sm text-muted-foreground">
                  Coupons can be used by all users - No points required for redemption
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setRewardFormCategory("coupons");
                    setRewardsViewMode("create");
                    resetForm();
                  }}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create Coupon
                </Button>
              </div>

              <div className="space-y-2">
                {couponsList.map((coupon) => (
                  <RewardCard
                    key={coupon.id}
                    reward={coupon}
                    category="coupons"
                    isEditing={editingCouponId === coupon.id}
                    onEditStart={() => startEditingReward(coupon.id, "coupons")}
                    onEditCancel={() => cancelEditingReward("coupons")}
                    onEditSave={couponForm.handleSubmit(onSubmitCoupon)}
                    onDelete={() => handleDeleteReward(coupon.id, coupon.name)}
                    isPending={deleteRewardMutation.isPending}
                    onToggleStatus={(checked) => {
                      const newStatus = checked
                        ? LoyaltyRewardStatus.ACTIVE
                        : LoyaltyRewardStatus.INACTIVE;
                      toggleRewardStatusMutation.mutate({
                        rewardId: coupon.id,
                        status: newStatus,
                      });
                    }}
                    forms={{ pointRewardForm, couponForm, giftForm }}
                    rewardTierRestriction={rewardTierRestriction}
                    setRewardTierRestriction={setRewardTierRestriction}
                    minimumSpendEnabled={minimumSpendEnabled}
                    setMinimumSpendEnabled={setMinimumSpendEnabled}
                    timeRestrictionsEnabled={timeRestrictionsEnabled}
                    setTimeRestrictionsEnabled={setTimeRestrictionsEnabled}
                    loyaltyTiers={loyaltyTiers}
                    loyaltyTemplates={loyaltyTemplates}
                    getRewardIcon={getRewardIcon}
                  />
                ))}
              </div>
            </TabsContent>

            {/* Free Gifts */}
            <TabsContent value="free-gifts" className="space-y-3 mt-0">
              <div className="flex items-start justify-between">
                <p className="text-sm text-muted-foreground">
                  Personalized gifts that can be assigned to customers - Individual codes generated
                  automatically
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setRewardFormCategory("free-gifts");
                    setRewardsViewMode("create");
                    resetForm();
                  }}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create Gift
                </Button>
              </div>

              <div className="space-y-2">
                {freeGiftsList.map((gift) => (
                  <RewardCard
                    key={gift.id}
                    reward={gift}
                    category="free-gifts"
                    isEditing={editingGiftId === gift.id}
                    onEditStart={() => startEditingReward(gift.id, "free-gifts")}
                    onEditCancel={() => cancelEditingReward("free-gifts")}
                    onEditSave={giftForm.handleSubmit(onSubmitGift)}
                    onDelete={() => handleDeleteReward(gift.id, gift.name)}
                    isPending={deleteRewardMutation.isPending}
                    onToggleStatus={(checked) => {
                      const newStatus = checked
                        ? LoyaltyRewardStatus.ACTIVE
                        : LoyaltyRewardStatus.INACTIVE;
                      toggleRewardStatusMutation.mutate({
                        rewardId: gift.id,
                        status: newStatus,
                      });
                    }}
                    forms={{ pointRewardForm, couponForm, giftForm }}
                    rewardTierRestriction={rewardTierRestriction}
                    setRewardTierRestriction={setRewardTierRestriction}
                    minimumSpendEnabled={minimumSpendEnabled}
                    setMinimumSpendEnabled={setMinimumSpendEnabled}
                    timeRestrictionsEnabled={timeRestrictionsEnabled}
                    setTimeRestrictionsEnabled={setTimeRestrictionsEnabled}
                    loyaltyTiers={loyaltyTiers}
                    loyaltyTemplates={loyaltyTemplates}
                    getRewardIcon={getRewardIcon}
                  />
                ))}
              </div>
            </TabsContent>

            {/* Referral Program */}
            <TabsContent value="referral" className="space-y-5 mt-0">
              {/* Hero banner */}
              <div className="rounded-xl bg-linear-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold">Referral Program</h2>
                      <Badge className="bg-green-500/15 text-green-600 border-green-500/20 text-xs px-2">
                        Live
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Turn customers into ambassadors — automatically reward them for bringing
                      friends
                    </p>
                  </div>
                </div>
                {/* Flow visualization */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-card rounded-lg px-3 py-2 border text-xs font-medium">
                    <MessageCircle className="w-3.5 h-3.5 text-primary" />
                    Customer shares link
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <div className="flex items-center gap-1.5 bg-card rounded-lg px-3 py-2 border text-xs font-medium">
                    <Link2 className="w-3.5 h-3.5 text-blue-500" />
                    Friend joins
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <div className="flex items-center gap-1.5 bg-card rounded-lg px-3 py-2 border text-xs font-medium">
                    <ShoppingBag className="w-3.5 h-3.5 text-orange-500" />
                    First purchase
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <div className="flex items-center gap-1.5 bg-card rounded-lg px-3 py-2 border text-xs font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                    Both get rewarded
                  </div>
                </div>
              </div>

              {/* Reward configuration cards */}
              <div className="grid grid-cols-2 gap-4">
                {/* Referrer */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                        <UserPlus className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold leading-none">
                          Referrer Reward
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          The person who invites
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-md bg-muted/50 border px-3 py-2 text-xs text-muted-foreground">
                      Triggered after friend&apos;s first purchase
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Reward type
                      </p>
                      <Select
                        value={referralBonusType}
                        onValueChange={(v) => setReferralBonusType(v as "points" | "gift")}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="points">Points</SelectItem>
                          <SelectItem value="gift">Free Gift</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {referralBonusType === "points" ? (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Amount
                        </p>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={referralBonus}
                            onChange={(e) =>
                              setReferralBonus(Number.parseFloat(e.target.value) || 0)
                            }
                            className="h-9"
                          />
                          <span className="text-sm font-medium text-muted-foreground shrink-0">
                            pts
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Gift
                        </p>
                        <Select value={referralRewardId ?? ""} onValueChange={setReferralRewardId}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select a gift" />
                          </SelectTrigger>
                          <SelectContent>
                            {freeGiftsList.length === 0 ? (
                              <SelectItem value="" disabled>
                                No free gifts created yet
                              </SelectItem>
                            ) : (
                              freeGiftsList.map((g) => (
                                <SelectItem key={g.id} value={g.id}>
                                  {g.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Referee */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold leading-none">
                          Referee Reward
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">The friend who joins</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-md bg-muted/50 border px-3 py-2 text-xs text-muted-foreground">
                      Triggered instantly on joining
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Reward type
                      </p>
                      <Select
                        value={refereeBonusType}
                        onValueChange={(v) => setRefereeBonusType(v as "points" | "gift")}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="points">Points</SelectItem>
                          <SelectItem value="gift">Free Gift</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {refereeBonusType === "points" ? (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Amount
                        </p>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={refereeBonus}
                            onChange={(e) =>
                              setRefereeBonus(Number.parseFloat(e.target.value) || 0)
                            }
                            className="h-9"
                          />
                          <span className="text-sm font-medium text-muted-foreground shrink-0">
                            pts
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Gift
                        </p>
                        <Select value={refereeRewardId ?? ""} onValueChange={setRefereeRewardId}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select a gift" />
                          </SelectTrigger>
                          <SelectContent>
                            {freeGiftsList.length === 0 ? (
                              <SelectItem value="" disabled>
                                No free gifts created yet
                              </SelectItem>
                            ) : (
                              freeGiftsList.map((g) => (
                                <SelectItem key={g.id} value={g.id}>
                                  {g.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Button
                className="w-full"
                onClick={handleSaveReferralSettings}
                disabled={updateLoyaltyProgramMutation.isPending}
              >
                {updateLoyaltyProgramMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Referral Settings
              </Button>

              {/* How it works - compact 3-column */}
              <div className="rounded-xl border bg-card/50 p-4">
                <p className="text-sm font-medium mb-4">How it works</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <MessageCircle className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-xs font-medium">Customer types &quot;refer&quot;</p>
                    <p className="text-xs text-muted-foreground">
                      Gets unique referral link via WhatsApp
                    </p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <Link2 className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-xs font-medium">Friend joins via link</p>
                    <p className="text-xs text-muted-foreground">
                      New member gets instant welcome bonus
                    </p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <ShoppingBag className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-xs font-medium">Friend makes first purchase</p>
                    <p className="text-xs text-muted-foreground">
                      Referrer gets bonus points automatically
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
      {rewardsViewMode === "create" && (
        <RewardFormContainer
          category={rewardFormCategory}
          onCancel={() => {
            setRewardsViewMode("list");
            resetForm();
          }}
          pointRewardForm={pointRewardForm}
          couponForm={couponForm}
          giftForm={giftForm}
          onSubmitPointReward={onSubmitPointReward}
          onSubmitCoupon={onSubmitCoupon}
          onSubmitGift={onSubmitGift}
          isPending={createRewardMutation.isPending || updateRewardMutation.isPending}
          editingId={editingRewardId || editingCouponId || editingGiftId}
          rewardTierRestriction={rewardTierRestriction}
          setRewardTierRestriction={setRewardTierRestriction}
          minimumSpendEnabled={minimumSpendEnabled}
          setMinimumSpendEnabled={setMinimumSpendEnabled}
          timeRestrictionsEnabled={timeRestrictionsEnabled}
          setTimeRestrictionsEnabled={setTimeRestrictionsEnabled}
          loyaltyTiers={loyaltyTiers}
          loyaltyTemplates={loyaltyTemplates}
        />
      )}
      <ConfirmationModal
        opened={deleteDialogOpen}
        onClose={() => {
          if (deleteRewardMutation.isPending) {
            return;
          }
          setDeleteDialogOpen(false);
        }}
        forDeleteFunctionality
        confirmLabel={translations("Delete")}
        headerTitle={translations("Delete Reward?")}
        onConfirm={() => {
          handleConfirmDeleteReward();
        }}
        headerLabel={translations("Are you sure to delete this reward?")}
        closeLabel={translations("cancel")}
      />
    </div>
  );
}
