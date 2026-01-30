"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Edit2,
  Gift,
  Info,
  Loader2,
  Plus,
  Save,
  Star,
  Tag,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";

import { TemplateType } from "@/types/enums";
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
import { useSubscription } from "@/backend/subscription/subscription.query";
import { useWaTemplates } from "@/backend/whatsapp/whatsapp.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import RateupLoader from "@/components/Loaders/RateupLoader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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

// --- Zod Schemas (Provided by User) ---

export enum LoyaltyRewardStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  EXPIRED = "EXPIRED",
  OUT_OF_STOCK = "OUT_OF_STOCK",
}

export enum LoyaltyRewardType {
  POINT = "POINT",
  COUPON = "COUPON",
  ASSIGNED = "ASSIGNED",
}

const discountFixedValueSchema = z.object({
  amount: z.coerce.number().min(0),
  currency: z.string().default("USD"),
});

const discountPercentageValueSchema = z.object({
  percentage: z.coerce.number().min(0).max(100),
  maxAmount: z.coerce.number().optional().nullable(),
});

const freeItemValueSchema = z.object({
  itemName: z.string(),
  itemSku: z.string().optional().nullable(),
  quantity: z.coerce.number().default(1),
});

const pointValueSchema = z.object({
  points: z.coerce.number().min(1),
});

const couponValueSchema = z.object({
  code: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

const assignedValueSchema = z.object({
  description: z.string(),
  sku: z.string().optional().nullable(),
});

const timeRestrictionsSchema = z.object({
  valid_from: z.string().optional().nullable(), // datetime string
  valid_until: z.string().optional().nullable(), // datetime string
  allowed_days: z.array(z.string()).optional(),
  blackout_dates: z.array(z.string()).optional(),
  // allowed_time_ranges omitted for now as it requires complex UI
});

const quantityRestrictionsSchema = z.object({
  one_time_use: z.boolean().optional(),
  max_redemptions_per_customer: z.coerce.number().optional().nullable(),
  max_redemptions_per_day: z.coerce.number().optional().nullable(),
  max_redemptions_per_week: z.coerce.number().optional().nullable(),
  max_redemptions_per_month: z.coerce.number().optional().nullable(),
});

const spendRequirementsSchema = z.object({
  minimum_spend: z.coerce.number().optional().nullable(),
});

const tierRestrictionsSchema = z.object({
  allowed_tiers: z.array(z.string()).optional(),
});

const cooldownRestrictionsSchema = z.object({
  cooldown_hours: z.coerce.number().optional().nullable(),
});

const inventoryRestrictionsSchema = z.object({
  stock_quantity: z.coerce.number().optional().nullable(),
});

const combinationRulesSchema = z.object({
  cannot_combine_with_other_rewards: z.boolean().optional(),
  cannot_combine_with_promotions: z.boolean().optional(),
  excluded_reward_ids: z.array(z.string()).optional(),
});

const approvalRulesSchema = z.object({
  requires_approval: z.boolean().optional(),
  auto_approve_under_value: z.coerce.number().optional().nullable(),
});

const redemptionRulesSchema = z.object({
  time_restrictions: timeRestrictionsSchema.optional(),
  quantity_restrictions: quantityRestrictionsSchema.optional(),
  spend_requirements: spendRequirementsSchema.optional(),
  tier_restrictions: tierRestrictionsSchema.optional(),
  cooldown: cooldownRestrictionsSchema.optional(),
  inventory: inventoryRestrictionsSchema.optional(),
  combination_rules: combinationRulesSchema.optional(),
  approval_rules: approvalRulesSchema.optional(),
});

export const loyaltyRewardSchema = z.object({
  name: z.string().min(1, "Reward name is required"),
  description: z.string().optional().nullable(),
  rewardType: z.string(), // simplified enum handling for form
  pointsCost: z.coerce.number().min(0),
  rewardValue: z.union([
    discountFixedValueSchema,
    discountPercentageValueSchema,
    freeItemValueSchema,
    pointValueSchema,
    couponValueSchema,
    assignedValueSchema,
  ]),
  status: z.string().default("active"),
  redemptionRules: redemptionRulesSchema.optional(),
  stockQuantity: z.coerce.number().optional().nullable(),
  availableForTiers: z.array(z.string()).optional(),
  waTemplateId: z.string().optional().nullable(),
  // stockRedeemed is backend managed usually, but included in schema
  stockRedeemed: z.coerce.number().default(0).optional(),
});

type LoyaltyRewardFormValues = z.infer<typeof loyaltyRewardSchema>;

// --- Components ---

function RewardForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  rewardCategory = "point",
}: Readonly<{
  initialData?: any;
  onSubmit: (data: LoyaltyRewardFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  rewardCategory?: "point" | "coupon" | "assigned";
}>) {
  const { data: templates, isLoading: templatesLoading } = useWaTemplates();

  const defaultRewardType = rewardCategory ?? "point";

  const form = useForm<LoyaltyRewardFormValues>({
    resolver: zodResolver(loyaltyRewardSchema),
    defaultValues: initialData || {
      name: "",
      description: "",
      rewardType: defaultRewardType,
      pointsCost: 0,
      rewardValue: { amount: 0 },
      status: "active",
      waTemplateId: null,
      stockQuantity: null,
      redemptionRules: {},
    },
  });

  const rewardType = useWatch({ control: form.control, name: "rewardType" });

  // Reset rewardValue when type changes
  useEffect(() => {
    if (initialData) return; // Don't reset on edit load

    // logic to reset defaults if user manually changes type
    if (rewardType === "point") {
      const currentVal = form.getValues("rewardValue");
      if (!("points" in currentVal)) {
        form.setValue("rewardValue", { points: 0 });
      }
    } else if (rewardType === "coupon") {
      const currentVal = form.getValues("rewardValue");
      if (!("code" in currentVal)) {
        form.setValue("rewardValue", { code: "", description: "" });
      }
    } else if (rewardType === "assigned") {
      const currentVal = form.getValues("rewardValue");
      if (!("description" in currentVal)) {
        form.setValue("rewardValue", { description: "", sku: "" });
      }
    }
  }, [rewardType, form, initialData]);

  const loyaltyTemplates = templates?.filter(
    (t) => t.templateType === TemplateType.LOYALTY,
  );

  // Treat 'point' (points), 'coupon' (coupons), and 'assigned' (assigned) all as standard reward forms
  const isRedeemableForm = ["point", "coupon", "assigned"].includes(
    rewardCategory,
  );

  return (
    <Card className="border shadow-sm bg-card">
      <CardContent className="p-6">
        <h2 className="text-xl mb-2">
          {initialData ? "Edit" : "Create"}{" "}
          {rewardCategory === "coupon" ? "Coupon" : "Redeemable"} Reward
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {rewardCategory === "coupon"
            ? "Configure coupon details for customers"
            : rewardCategory === "assigned"
              ? "Configure assigned rewards for specific customers"
              : "Configure points-to-benefits rewards"}
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reward Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        rewardCategory === "coupon"
                          ? "e.g., 20% OFF Coupon"
                          : "e.g., AED 10 Cashback, Free Coffee"
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-20 resize-none"
                      placeholder={
                        rewardCategory === "coupon"
                          ? "Describe the coupon details..."
                          : "Describe what the customer gets..."
                      }
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rewardType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reward Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="point">⭐ Instant Points</SelectItem>
                        <SelectItem value="coupon">🎟️ Coupon Code</SelectItem>
                        <SelectItem value="assigned">
                          🔒 Assigned Reward
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {rewardCategory === "point" && (
                <FormField
                  control={form.control}
                  name="pointsCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Points Cost</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="1000"
                          min="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {rewardType === "point" && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
                        Instant Points Reward
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-400">
                        Customers redeem this to instantly receive points. Set
                        Points Cost to 0 for free points. Points awarded are
                        stored in Reward Value.
                      </p>
                    </div>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="rewardValue.points"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Points to Award</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="100"
                          min="1"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of points customer receives upon redemption
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {rewardType === "coupon" && (
              <div className="space-y-4">
                <div className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-purple-900 dark:text-purple-300 mb-1">
                        Generic Coupon Code
                      </p>
                      <p className="text-xs text-purple-700 dark:text-purple-400">
                        Available to all eligible customers. System generates
                        unique redemption codes upon redemption.
                      </p>
                    </div>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="rewardValue.code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coupon Code/Prefix (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="SAVE20"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional prefix for generated codes
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rewardValue.description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coupon Description</FormLabel>
                      <FormControl>
                        <Textarea
                          className="min-h-20 resize-none"
                          placeholder="Describe what this coupon offers..."
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {rewardType === "assigned" && (
              <div className="space-y-4">
                <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-900 dark:text-orange-300 mb-1">
                        Assigned Reward (VIP/Special)
                      </p>
                      <p className="text-xs text-orange-700 dark:text-orange-400">
                        Only visible to customers who have been specifically
                        assigned this reward. Requires manual assignment through
                        CustomerReward records.
                      </p>
                    </div>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="rewardValue.description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reward Description</FormLabel>
                      <FormControl>
                        <Textarea
                          className="min-h-20 resize-none"
                          placeholder="e.g., Free delivery on next order, Complimentary dessert..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rewardValue.sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU/Reference Code (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="FREE-DELIVERY-001"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Internal reference for tracking
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="pt-4 border-t">
              <h3 className="text-base font-medium mb-3">
                Redemption Rules (Optional)
              </h3>
              <div className="space-y-3">
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Minimum Spend</p>
                      <p className="text-xs text-muted-foreground">
                        Require minimum purchase amount
                      </p>
                    </div>
                    <FormField
                      control={form.control}
                      name="redemptionRules.spend_requirements.minimum_spend"
                      render={({ field }) => (
                        <FormControl>
                          <Input
                            type="number"
                            className="w-24"
                            placeholder="0"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                      )}
                    />
                  </div>
                </div>
                <div className="border rounded-lg p-3">
                  <FormField
                    control={form.control}
                    name="redemptionRules.quantity_restrictions.one_time_use"
                    render={({ field }) => (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">
                            One-time use per customer
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Can only be redeemed once
                          </p>
                        </div>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </div>
                    )}
                  />
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="waTemplateId"
              render={({ field }) => (
                <FormItem className="pt-4 border-t">
                  <FormLabel>
                    WhatsApp Notification Template (Optional)
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loyaltyTemplates?.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t?.data?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 mt-8">
              <Button
                variant="outline"
                className="flex-1"
                type="button"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button className="flex-1" type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                <Plus className="w-4 h-4 mr-2" />
                {initialData ? "Update" : "Create"} Reward
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function RewardCardItem({
  reward,
  onDelete,
  onEdit,
  getRewardIcon,
  getRewardTypeLabel,
  translations,
  deletePending,
}: any) {
  const toggleMutation = useToggleLoyaltyRewardStatusMutation(reward.id);

  return (
    <Card
      className={`border shadow-sm hover:shadow-md transition-all ${
        reward.status !== "active"
          ? "bg-muted/50 border-muted opacity-60"
          : "bg-card"
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Icon and Name */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-2xl shrink-0">
              {getRewardIcon(reward.rewardType)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h4 className="font-semibold text-sm">{reward.name}</h4>
                {reward.rewardType === "point" && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20"
                  >
                    Points
                  </Badge>
                )}
                {reward.rewardType === "coupon" && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20"
                  >
                    Coupon
                  </Badge>
                )}
                {reward.rewardType === "assigned" && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/20"
                  >
                    Assigned
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {reward.description || "No description provided"}
              </p>
            </div>
          </div>

          {/* Stats - Compact */}
          <div className="flex items-center gap-3 shrink-0">
            {reward.rewardType === "point" ? (
              <div className="text-center px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/20">
                <p className="text-xs text-muted-foreground">Points Awarded</p>
                <p className="font-semibold text-sm text-blue-700 dark:text-blue-400">
                  +{reward.rewardValue?.points || 0} pts
                </p>
              </div>
            ) : (
              <div className="text-center px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-xs text-muted-foreground">Points Cost</p>
                <p className="font-semibold text-sm text-primary">
                  {reward.pointsCost} pts
                </p>
              </div>
            )}
            <div className="text-center px-3 py-1.5 bg-green-50 dark:bg-green-500/10 rounded-lg border border-green-200 dark:border-green-500/20">
              <p className="text-xs text-muted-foreground">Redeemed</p>
              <p className="font-semibold text-sm text-green-700 dark:text-green-400">
                {reward.stockRedeemed || 0}
              </p>
            </div>
          </div>

          {/* Status and Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              className={
                reward.status === "active"
                  ? "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20"
                  : "bg-muted text-muted-foreground border"
              }
            >
              {reward.status === "active" ? "Active" : "Inactive"}
            </Badge>
            <Switch
              checked={reward.status === "active"}
              onCheckedChange={() => {
                const newStatus =
                  reward.status === "active" ? "inactive" : "active";
                toggleMutation.mutate({ status: newStatus });
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onEdit(reward.id)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(reward.id)}
              disabled={deletePending}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Additional Details */}
        {(reward.redemptionRules?.spend_requirements?.minimum_spend ||
          reward.stockQuantity) && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-xs text-muted-foreground">
            {reward.redemptionRules?.spend_requirements?.minimum_spend && (
              <span>
                Min spend:{" "}
                {reward.redemptionRules.spend_requirements.minimum_spend}
              </span>
            )}
            {reward.stockQuantity !== null &&
              reward.stockQuantity !== undefined && (
                <span>Stock: {reward.stockQuantity} available</span>
              )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Main Page Component ---

export default function Reward() {
  const router = useRouter();
  const translations = useTranslations();

  const { data: loyaltyProgram } = useLoyaltyProgram();
  const updateLoyaltyProgramMutation = useUpdateLoyaltyProgramMutation(
    loyaltyProgram?.id || "",
  );

  const [referralBonus, setReferralBonus] = useState(0);
  const [refereeBonus, setRefereeBonus] = useState(0);

  useEffect(() => {
    if (loyaltyProgram) {
      setReferralBonus(loyaltyProgram.referralBonus || 0);
      setRefereeBonus(loyaltyProgram.refereeBonus || 0);
    }
  }, [loyaltyProgram]);

  const handleSaveReferralSettings = () => {
    if (loyaltyProgram?.id) {
      updateLoyaltyProgramMutation.mutate({
        referralBonus,
        refereeBonus,
      });
    }
  };

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

  const [rewardsViewMode, setRewardsViewMode] = useState<
    "list" | "create" | "edit"
  >("list");
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [selectedRewardCategory, setSelectedRewardCategory] = useState<
    "point" | "coupon" | "assigned" | "referralprogram"
  >("point");
  const [rewardFormCategory, setRewardFormCategory] = useState<
    "point" | "coupon" | "assigned"
  >("point");

  const createRewardMutation = useCreateLoyaltyRewardMutation(() => {
    setRewardsViewMode("list");
  });

  const updateRewardMutation = useUpdateLoyaltyRewardMutation(
    editingRewardId || "",
    () => {
      setRewardsViewMode("list");
      setEditingRewardId(null);
    },
  );

  const deleteRewardMutation = useDeleteLoyaltyRewardMutation();
  // const toggleStatusMutation = useToggleLoyaltyRewardStatusMutation("temp"); // ID will be passed in mutate

  const { data: editingReward, isLoading: isEditingRewardLoading } =
    useLoyaltyRewardById(editingRewardId || "");

  const handleDeleteReward = (rewardId: string) => {
    if (confirm("Are you sure you want to delete this reward?")) {
      deleteRewardMutation.mutate(rewardId);
    }
  };

  const handleCreateSubmit = (data: LoyaltyRewardFormValues) => {
    createRewardMutation.mutate(data as any);
  };

  const handleUpdateSubmit = (data: LoyaltyRewardFormValues) => {
    if (editingRewardId) {
      updateRewardMutation.mutate(data as any);
    }
  };

  const startEdit = (id: string) => {
    setEditingRewardId(id);
    setRewardsViewMode("edit");
  };

  const getRewardIcon = (rewardType: string) => {
    switch (rewardType) {
      case "point":
        return "⭐";
      case "coupon":
        return "🎟️";
      case "assigned":
        return "🔒";
      default:
        return "🎁";
    }
  };

  const getRewardTypeLabel = (rewardType: string) => {
    switch (rewardType) {
      case "point":
        return "Instant Points";
      case "coupon":
        return "Coupon Code";
      case "assigned":
        return "Assigned Reward";
      default:
        return rewardType;
    }
  };

  // Filter rewards by type
  const filteredRewards = rewards?.filter((r) =>
    ["point", "coupon", "assigned"].includes(r.rewardType),
  );

  const pointRewards =
    filteredRewards?.filter((r) => r.rewardType === "point") || [];
  const couponRewards =
    filteredRewards?.filter((r) => r.rewardType === "coupon") || [];
  const assignedRewards =
    filteredRewards?.filter((r) => r.rewardType === "assigned") || [];

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

  return (
    <div className="space-y-5">
      {rewardsViewMode === "list" && (
        <>
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl mb-1">{translations("Rewards")}</h1>
              <p className="text-sm text-muted-foreground">
                {translations(
                  "Manage instant points, coupons, assigned rewards, and referral program",
                )}
              </p>
            </div>
            {selectedRewardCategory !== "referralprogram" && (
              <Button
                onClick={() => {
                  setRewardFormCategory(selectedRewardCategory);
                  setRewardsViewMode("create");
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                {translations("Create Reward")}
              </Button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 border-b">
            <button
              onClick={() => setSelectedRewardCategory("point")}
              className={`px-4 py-2 text-sm font-medium transition-all border-b-2 ${
                selectedRewardCategory === "point"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                <span>{translations("Instant Points")}</span>
                <Badge variant="outline" className="text-xs">
                  {pointRewards.length}
                </Badge>
              </div>
            </button>
            <button
              onClick={() => setSelectedRewardCategory("coupon")}
              className={`px-4 py-2 text-sm font-medium transition-all border-b-2 ${
                selectedRewardCategory === "coupon"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                <span>{translations("Coupons")}</span>
                <Badge variant="outline" className="text-xs">
                  {couponRewards.length}
                </Badge>
              </div>
            </button>
            <button
              onClick={() => setSelectedRewardCategory("assigned")}
              className={`px-4 py-2 text-sm font-medium transition-all border-b-2 ${
                selectedRewardCategory === "assigned"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4" />
                <span>{translations("Assigned Rewards")}</span>
                <Badge variant="outline" className="text-xs">
                  {assignedRewards.length}
                </Badge>
              </div>
            </button>
            <button
              onClick={() => setSelectedRewardCategory("referralprogram")}
              className={`px-4 py-2 text-sm font-medium transition-all border-b-2 ${
                selectedRewardCategory === "referralprogram"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                <span>{translations("Referral Program")}</span>
                <Badge variant="outline" className="text-xs">
                  Auto
                </Badge>
              </div>
            </button>
          </div>

          {/* Instant Points Rewards Tab */}
          {selectedRewardCategory === "point" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {translations(
                  "Customers can redeem points to instantly receive more points",
                )}
              </p>

              {pointRewards.map((reward: any) => (
                <RewardCardItem
                  key={reward.id}
                  reward={reward}
                  onDelete={handleDeleteReward}
                  onEdit={startEdit}
                  getRewardIcon={getRewardIcon}
                  getRewardTypeLabel={getRewardTypeLabel}
                  translations={translations}
                  deletePending={deleteRewardMutation.isPending}
                />
              ))}
              {pointRewards.length === 0 && (
                <Card className="border-2 border-dashed border-muted">
                  <CardContent className="p-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                      <Star className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h4 className="font-semibold mb-1">
                      {translations("No instant points rewards yet")}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      {translations(
                        "Create rewards where customers spend points to get more points instantly",
                      )}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setRewardFormCategory("point");
                        setRewardsViewMode("create");
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {translations("Create Instant Points Reward")}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Coupons Tab */}
          {selectedRewardCategory === "coupon" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {translations(
                  "Generic coupon codes that customers can redeem with points",
                )}
              </p>

              {couponRewards.map((reward: any) => (
                <RewardCardItem
                  key={reward.id}
                  reward={reward}
                  onDelete={handleDeleteReward}
                  onEdit={startEdit}
                  getRewardIcon={getRewardIcon}
                  getRewardTypeLabel={getRewardTypeLabel}
                  translations={translations}
                  deletePending={deleteRewardMutation.isPending}
                />
              ))}
              {couponRewards.length === 0 && (
                <Card className="border-2 border-dashed border-muted">
                  <CardContent className="p-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                      <Tag className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h4 className="font-semibold mb-1">
                      {translations("No coupon rewards yet")}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      {translations(
                        "Create generic coupon codes that customers can redeem",
                      )}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setRewardFormCategory("coupon");
                        setRewardsViewMode("create");
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {translations("Create Coupon Reward")}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Assigned Rewards Tab */}
          {selectedRewardCategory === "assigned" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {translations(
                  "Special VIP rewards that can only be assigned to specific customers",
                )}
              </p>

              {assignedRewards.map((reward: any) => (
                <RewardCardItem
                  key={reward.id}
                  reward={reward}
                  onDelete={handleDeleteReward}
                  onEdit={startEdit}
                  getRewardIcon={getRewardIcon}
                  getRewardTypeLabel={getRewardTypeLabel}
                  translations={translations}
                  deletePending={deleteRewardMutation.isPending}
                />
              ))}
              {assignedRewards.length === 0 && (
                <Card className="border-2 border-dashed border-muted">
                  <CardContent className="p-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                      <Gift className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h4 className="font-semibold mb-1">
                      {translations("No assigned rewards yet")}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      {translations(
                        "Create exclusive rewards for VIP customers that require manual assignment",
                      )}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setRewardFormCategory("assigned");
                        setRewardsViewMode("create");
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {translations("Create Assigned Reward")}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Referral Program Tab */}
          {selectedRewardCategory === "referralprogram" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {translations(
                  "Automated system to reward customers for inviting friends",
                )}
              </p>

              <Card className="border-2 border-primary shadow-sm bg-linear-to-br from-primary/5 to-background">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                        <UserPlus className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {translations("Referral Program")}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {translations(
                            "Automatically reward referrers and referees",
                          )}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20">
                      {translations("Active")}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-card rounded-lg border-2 p-4">
                      <p className="text-xs text-muted-foreground mb-2">
                        {translations("Referrer Gets")}
                      </p>
                      <div className="flex items-baseline gap-2 mb-1">
                        <Input
                          type="number"
                          value={referralBonus}
                          onChange={(e) =>
                            setReferralBonus(parseFloat(e.target.value) || 0)
                          }
                          className="w-20 h-9 font-semibold text-lg"
                        />
                        <span className="font-semibold text-lg">
                          {translations("points")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {translations("After friend's first purchase")}
                      </p>
                    </div>

                    <div className="bg-card rounded-lg border-2 p-4">
                      <p className="text-xs text-muted-foreground mb-2">
                        {translations("Referee Gets")}
                      </p>
                      <div className="flex items-baseline gap-2 mb-1">
                        <Input
                          type="number"
                          value={refereeBonus}
                          onChange={(e) =>
                            setRefereeBonus(parseFloat(e.target.value) || 0)
                          }
                          className="w-20 h-9 font-semibold text-lg"
                        />
                        <span className="font-semibold text-lg">
                          {translations("points")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {translations("Instant bonus on joining")}
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
                    {translations("Save Referral Settings")}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {translations("How Referral Works")}
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
                        {translations('Customer types "refer"')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {translations("Gets unique referral link via WhatsApp")}
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
                        {translations("Friend joins via link")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {translations("New member gets instant welcome bonus")}
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
                        {translations("Friend makes first purchase")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {translations(
                          "Referrer gets bonus points automatically",
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {rewardsViewMode === "create" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRewardsViewMode("list")}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {translations("Back")}
            </Button>
          </div>

          <RewardForm
            onSubmit={handleCreateSubmit}
            onCancel={() => setRewardsViewMode("list")}
            isSubmitting={createRewardMutation.isPending}
            rewardCategory={rewardFormCategory}
          />
        </div>
      )}

      {rewardsViewMode === "edit" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRewardsViewMode("list");
                setEditingRewardId(null);
              }}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {translations("Back")}
            </Button>
          </div>

          {isEditingRewardLoading ? (
            <RateupLoader />
          ) : (
            <RewardForm
              initialData={editingReward}
              onSubmit={handleUpdateSubmit}
              onCancel={() => {
                setRewardsViewMode("list");
                setEditingRewardId(null);
              }}
              isSubmitting={updateRewardMutation.isPending}
              // rewardCategory="point"
            />
          )}
        </div>
      )}
    </div>
  );
}
