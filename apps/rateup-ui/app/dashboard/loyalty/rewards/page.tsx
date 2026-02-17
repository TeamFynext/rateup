"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Gift, Loader2, Plus, Save, Tag, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { LoyaltyRewardStatus, TemplateType } from "@/types/enums";
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
import ErrorComponent from "@/components/404/ErrorComponent";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { RewardCard } from "@/components/LoyaltyComponents/RewardCard";
import { RewardFormContainer } from "@/components/LoyaltyComponents/RewardFormContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { couponSchema, giftSchema, pointRewardSchema } from "./schemas";

export default function RewardsPage() {
  // Backend queries
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
  const { data: loyaltyProgram } = useLoyaltyProgram();
  const { data: loyaltyTiers, isLoading: isTiersLoading } = useLoyaltyTiers();
  const { data: templates } = useWaTemplates();

  // Mutations
  const updateLoyaltyProgramMutation = useUpdateLoyaltyProgramMutation(
    loyaltyProgram?.id || "",
  );
  const createRewardMutation = useCreateLoyaltyRewardMutation(() => {
    toast.success("Reward created successfully");
    setRewardsViewMode("list");
    resetForm();
  });
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const updateRewardMutation = useUpdateLoyaltyRewardMutation(
    editingRewardId || "",
    () => {
      toast.success("Reward updated successfully");
      setRewardsViewMode("list");
      setEditingRewardId(null);
      resetForm();
    },
  );
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
  };

  const defaultCouponValues: z.infer<typeof couponSchema> = {
    name: "",
    description: "",
    couponCode: "",
    couponDescription: "",
    stockQuantity: 0,
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
    resolver: zodResolver(pointRewardSchema),
    defaultValues: defaultPointRewardValues,
  });

  const couponForm = useForm<z.infer<typeof couponSchema>>({
    resolver: zodResolver(couponSchema),
    defaultValues: defaultCouponValues,
  });

  const giftForm = useForm<z.infer<typeof giftSchema>>({
    resolver: zodResolver(giftSchema),
    defaultValues: defaultGiftValues,
  });

  const [rewardsViewMode, setRewardsViewMode] = useState("list");
  const [selectedRewardCategory, setSelectedRewardCategory] =
    useState("point-rewards");

  // Form states
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [editingGiftId, setEditingGiftId] = useState<string | null>(null);
  const [rewardFormCategory, setRewardFormCategory] = useState("point-rewards");
  const [rewardTierRestriction, setRewardTierRestriction] = useState(false);

  // Referral settings
  const [referralBonus, setReferralBonus] = useState(0);
  const [refereeBonus, setRefereeBonus] = useState(0);

  // Form field states
  const { data: editingReward } = useLoyaltyRewardById(
    editingRewardId || editingCouponId || editingGiftId || "",
  );

  useEffect(() => {
    if (loyaltyProgram) {
      setReferralBonus(loyaltyProgram.referralBonus || 0);
      setRefereeBonus(loyaltyProgram.refereeBonus || 0);
    }
  }, [loyaltyProgram]);

  useEffect(() => {
    if (editingReward) {
      if (editingReward.rewardType === "point") {
        pointRewardForm.reset({
          name: editingReward.name || "",
          description: editingReward.description || "",
          rewardType: "fixed-discount", // Default as explicit type isn't stored in top level
          pointsCost: editingReward.pointsCost || 0,
          waTemplateId: editingReward.waTemplateId || undefined,
          tierIds: editingReward.availableForTiers || [],
          // Default others to 0/empty as in original code
          cashbackAmount: 0,
          discountPercentage: 0,
          estimatedValue: 0,
          restrictions: "",
        });
      } else if (editingReward.rewardType === "coupon") {
        couponForm.reset({
          name: editingReward.name || "",
          description: editingReward.description || "",
          couponCode: editingReward.rewardValue?.code || "",
          couponDescription: editingReward.rewardValue?.description || "",
          stockQuantity: editingReward.stockQuantity || 0,
          minimumSpend:
            Number(
              editingReward.redemptionRules?.spend_requirements?.minimum_spend,
            ) || 0,
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
      setRewardTierRestriction(
        (editingReward.availableForTiers?.length || 0) > 0,
      );
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
  };

  const handleSaveReferralSettings = () => {
    if (loyaltyProgram?.id) {
      updateLoyaltyProgramMutation.mutate({
        referralBonus,
        refereeBonus,
      });
    }
  };

  const handleDeleteReward = (rewardId: string) => {
    if (confirm("Are you sure you want to delete this reward?")) {
      deleteRewardMutation.mutate(rewardId);
    }
  };

  const onSubmitPointReward = (data: z.infer<typeof pointRewardSchema>) => {
    const payload: any = {
      name: data.name,
      description: data.description,
      rewardType: "point",
      pointsCost: data.pointsCost,
      rewardValue: {
        points: data.pointsCost,
      },
      waTemplateId: data.waTemplateId || undefined,
      availableForTiers: data.tierIds?.length ? data.tierIds : undefined,
      redemptionRules: {},
    };

    if (editingRewardId) {
      updateRewardMutation.mutate(payload);
    } else {
      createRewardMutation.mutate(payload);
    }
  };

  const onSubmitCoupon = (data: z.infer<typeof couponSchema>) => {
    const payload: any = {
      name: data.name,
      description: data.description,
      rewardType: "coupon",
      pointsCost: 0,
      rewardValue: {
        code: data.couponCode,
        description: data.couponDescription,
      },
      stockQuantity: data.stockQuantity,
      waTemplateId: data.waTemplateId || undefined,
      availableForTiers: data.tierIds?.length ? data.tierIds : undefined,
      redemptionRules: {
        spend_requirements: {
          minimum_spend: data.minimumSpend,
        },
      },
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
      availableForTiers: data.tierIds?.length ? data.tierIds : undefined,
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

  const loyaltyTemplates = templates?.filter(
    (t) => t.templateType === TemplateType.LOYALTY,
  );

  // Filter rewards by category
  const rewardsList =
    rewards?.filter((r) => {
      if (selectedRewardCategory === "point-rewards") {
        return r.rewardType === "point";
      }
      return false;
    }) || [];

  const couponsList = rewards?.filter((r) => r.rewardType === "coupon") || [];

  const freeGiftsList =
    rewards?.filter((r) => r.rewardType === "assigned") || [];

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
    <div className="p-6">
      <div className="space-y-5 relative">
        {rewardsViewMode === "list" && (
          <>
            {/* Header */}
            <div>
              <h1 className="text-2xl mb-1">Rewards</h1>
              <p className="text-sm text-muted-foreground">
                Manage all types of rewards - point-based, coupons, and referral
                programs
              </p>
            </div>

            {/* Category Tabs */}
            <Tabs
              value={selectedRewardCategory}
              onValueChange={setSelectedRewardCategory}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 border-b">
                <TabsList className="bg-transparent p-0 h-auto space-x-2">
                  <TabsTrigger
                    value="point-rewards"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 border-transparent px-4 py-2 rounded-none transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      <span>Point Rewards</span>
                      <Badge variant="outline" className="text-xs">
                        {rewardsList.length}
                      </Badge>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="coupons"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 border-transparent px-4 py-2 rounded-none transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4" />
                      <span>Coupons</span>
                      <Badge variant="outline" className="text-xs">
                        {couponsList.length}
                      </Badge>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="free-gifts"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-primary data-[state=active]:text-primary border-b-2 border-transparent px-4 py-2 rounded-none transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4" />
                      <span>Free Gifts</span>
                      <Badge variant="outline" className="text-xs">
                        {freeGiftsList.length}
                      </Badge>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="referral"
                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent px-4 py-2 rounded-none transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      <span>Referral Program</span>
                      <Badge variant="outline" className="text-xs">
                        Auto
                      </Badge>
                    </div>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Point Rewards */}
              <TabsContent value="point-rewards" className="space-y-3 mt-0">
                <div className="flex items-start justify-between">
                  <p className="text-sm text-muted-foreground">
                    Traditional rewards where customers spend points to get
                    benefits
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
                      onEditStart={() => setEditingRewardId(reward.id)}
                      onEditCancel={() => setEditingRewardId(null)}
                      onEditSave={pointRewardForm.handleSubmit(
                        onSubmitPointReward,
                      )}
                      onDelete={() => handleDeleteReward(reward.id)}
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
                    Coupons can be used by all users - No points required for
                    redemption
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
                      onEditStart={() => setEditingCouponId(coupon.id)}
                      onEditCancel={() => setEditingCouponId(null)}
                      onEditSave={couponForm.handleSubmit(onSubmitCoupon)}
                      onDelete={() => handleDeleteReward(coupon.id)}
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
                    Personalized gifts that can be assigned to customers -
                    Individual codes generated automatically
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
                      onEditStart={() => setEditingGiftId(gift.id)}
                      onEditCancel={() => setEditingGiftId(null)}
                      onEditSave={giftForm.handleSubmit(onSubmitGift)}
                      onDelete={() => handleDeleteReward(gift.id)}
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
                      loyaltyTiers={loyaltyTiers}
                      loyaltyTemplates={loyaltyTemplates}
                      getRewardIcon={getRewardIcon}
                    />
                  ))}
                </div>
              </TabsContent>

              {/* Referral Program */}
              <TabsContent value="referral" className="space-y-4 mt-0">
                <p className="text-sm text-muted-foreground">
                  Automated system to reward customers for inviting friends
                </p>

                <Card className="border-2 border-primary shadow-sm bg-accent/20">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                          <UserPlus className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold">Referral Program</h3>
                          <p className="text-xs text-muted-foreground">
                            Automatically reward referrers and referees
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-primary text-primary"
                      >
                        Active
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-card rounded-lg border-2 border-border p-4">
                        <p className="text-xs text-muted-foreground mb-2">
                          Referrer Gets
                        </p>
                        <div className="flex items-baseline gap-2 mb-1">
                          <Input
                            type="number"
                            value={referralBonus}
                            onChange={(e) =>
                              setReferralBonus(
                                Number.parseFloat(e.target.value) || 0,
                              )
                            }
                            className="w-20 h-9 font-semibold text-lg"
                          />
                          <span className="font-semibold text-lg">points</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          After friend's first purchase
                        </p>
                      </div>

                      <div className="bg-card rounded-lg border-2 border-border p-4">
                        <p className="text-xs text-muted-foreground mb-2">
                          Referee Gets
                        </p>
                        <div className="flex items-baseline gap-2 mb-1">
                          <Input
                            type="number"
                            value={refereeBonus}
                            onChange={(e) =>
                              setRefereeBonus(
                                Number.parseFloat(e.target.value) || 0,
                              )
                            }
                            className="w-20 h-9 font-semibold text-lg"
                          />
                          <span className="font-semibold text-lg">points</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Instant bonus on joining
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      className="w-full"
                      onClick={handleSaveReferralSettings}
                      disabled={updateLoyaltyProgramMutation.isPending}
                    >
                      {updateLoyaltyProgramMutation.isPending && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      {!updateLoyaltyProgramMutation.isPending && (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Referral Settings
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      How Referral Works
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          1
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          Customer types "refer"
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Gets unique referral link via WhatsApp
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          2
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          Friend joins via link
                        </p>
                        <p className="text-xs text-muted-foreground">
                          New member gets instant welcome bonus
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          3
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          Friend makes first purchase
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Referrer gets bonus points automatically
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
            isPending={
              createRewardMutation.isPending || updateRewardMutation.isPending
            }
            editingId={editingRewardId || editingCouponId || editingGiftId}
            rewardTierRestriction={rewardTierRestriction}
            setRewardTierRestriction={setRewardTierRestriction}
            loyaltyTiers={loyaltyTiers}
            loyaltyTemplates={loyaltyTemplates}
          />
        )}
      </div>
    </div>
  );
}
