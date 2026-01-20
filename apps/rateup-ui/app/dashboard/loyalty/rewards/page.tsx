"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Badge, Edit2, Loader2, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";

import { TemplateType } from "@/types/enums";
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
import NothingFound from "@/components/NothingFound/NothingFound";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Separator } from "@/components/ui/separator";
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
  DISCOUNT_FIXED = "DISCOUNT_FIXED",
  DISCOUNT_PERCENTAGE = "DISCOUNT_PERCENTAGE",
  FREE_ITEM = "FREE_ITEM",
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
}: {
  initialData?: any;
  onSubmit: (data: LoyaltyRewardFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const translations = useTranslations();
  const { data: templates, isLoading: templatesLoading } = useWaTemplates();

  const form = useForm<LoyaltyRewardFormValues>({
    resolver: zodResolver(loyaltyRewardSchema),
    defaultValues: initialData || {
      name: "",
      description: "",
      rewardType: "discount_fixed",
      pointsCost: 0,
      rewardValue: { amount: 0, currency: "USD" },
      status: "active",
      waTemplateId: "",
      stockQuantity: null,
      redemptionRules: {},
    },
  });

  const rewardType = useWatch({ control: form.control, name: "rewardType" });

  // Reset rewardValue when type changes
  useEffect(() => {
    if (initialData) return; // Don't reset on edit load

    const currentType = form.getValues("rewardType");
    // logic to reset defaults if user manually changes type
    if (rewardType === "discount_fixed") {
      const currentVal = form.getValues("rewardValue");
      if (!("amount" in currentVal)) {
        form.setValue("rewardValue", { amount: 0, currency: "USD" });
      }
    } else if (rewardType === "discount_percentage") {
      const currentVal = form.getValues("rewardValue");
      if (!("percentage" in currentVal)) {
        // @ts-ignore
        form.setValue("rewardValue", { percentage: 0, maxAmount: null });
      }
    } else if (rewardType === "free_item") {
      const currentVal = form.getValues("rewardValue");
      if (!("itemName" in currentVal)) {
        // @ts-ignore
        form.setValue("rewardValue", {
          itemName: "",
          itemSku: "",
          quantity: 1,
        });
      }
    }
  }, [rewardType, form, initialData]);

  const loyaltyTemplates = templates?.filter(
    (t) => t.templateType === TemplateType.LOYALTY,
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reward Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. $10 Off Coupon" {...field} />
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
                      placeholder="Reward details..."
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="waTemplateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp Template</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template" />
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
                  <FormDescription>
                    {`Dynamic variable {{1}} - ${translations("customer name")}, {{2}} - ${translations("current redeemed points")}`}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pointsCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points Cost</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="out_of_stock">
                          Out of Stock
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reward Value</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="rewardType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reward Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="discount_fixed">
                        Fixed Discount
                      </SelectItem>
                      <SelectItem value="discount_percentage">
                        Percentage Discount
                      </SelectItem>
                      <SelectItem value="free_item">Free Item</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {rewardType === "discount_fixed" && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rewardValue.amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rewardValue.currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {rewardType === "discount_percentage" && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rewardValue.percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Percentage (%)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rewardValue.maxAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Discount Amount (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
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

            {rewardType === "free_item" && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="rewardValue.itemName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="rewardValue.itemSku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="rewardValue.quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Redemption Rules & Restrictions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="redemptionRules.spend_requirements.minimum_spend"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Spend Requirement</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value || ""}
                        placeholder="No minimum"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stockQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Global Stock Limit</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value || ""}
                        placeholder="Unlimited"
                      />
                    </FormControl>
                    <FormDescription>
                      Total number of times this reward can be redeemed
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />
            <h4 className="font-medium text-sm">Quantity Limits</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="redemptionRules.quantity_restrictions.one_time_use"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>One-time use per customer</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="redemptionRules.quantity_restrictions.max_redemptions_per_customer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Per Customer</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value || ""}
                        placeholder="Unlimited"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />
            <h4 className="font-medium text-sm">Time Validity</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="redemptionRules.time_restrictions.valid_from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid From</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={
                          field.value
                            ? new Date(field.value).toISOString().split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? new Date(e.target.value).toISOString()
                              : null,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="redemptionRules.time_restrictions.valid_until"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid Until</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={
                          field.value
                            ? new Date(field.value).toISOString().split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? new Date(e.target.value).toISOString()
                              : null,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Reward
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Sub-component for individual card to safely use hooks
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
      className={`${reward.status === "inactive" ? "bg-muted/30" : "bg-card"}`}
    >
      <CardContent className="p-5">
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
                onCheckedChange={() => {
                  const newStatus =
                    reward.status === "active" ? "inactive" : "active";
                  toggleMutation.mutate({ status: newStatus });
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(reward.id)}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(reward.id)}
                disabled={deletePending}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{getRewardIcon(reward.rewardType)}</span>
            <h3 className="font-semibold">{reward.name}</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {reward.description || "No description provided"}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-xs text-muted-foreground mb-1">Points Cost</p>
            <p className="font-semibold text-[#1873E8]">
              {reward.pointsCost} pts
            </p>
          </div>

          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
            <p className="text-xs text-muted-foreground mb-1">Type</p>
            <p className="font-semibold text-purple-700">
              {getRewardTypeLabel(reward.rewardType)}
            </p>
          </div>

          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <p className="text-xs text-muted-foreground mb-1">Redeemed</p>
            <p className="font-semibold text-green-700">
              {reward.stockRedeemed || 0}
            </p>
          </div>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          {reward.stockQuantity !== null &&
            reward.stockQuantity !== undefined && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Stock:</span>
                <span>{reward.stockQuantity} available</span>
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Main Page Component ---

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

  const [rewardsViewMode, setRewardsViewMode] = useState<
    "list" | "create" | "edit"
  >("list");
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);

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

  const getRewardTypeLabel = (rewardType: string) => {
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

  return (
    <div className="space-y-5">
      {rewardsViewMode === "list" && (
        <>
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
            {rewards?.map((reward: any) => (
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
            {(!rewards || rewards.length === 0) && (
              <NothingFound text="No rewards found" />
            )}
          </div>
        </>
      )}

      {rewardsViewMode === "create" && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRewardsViewMode("list")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-semibold">Create Reward</h1>
          </div>
          <RewardForm
            onSubmit={handleCreateSubmit}
            onCancel={() => setRewardsViewMode("list")}
            isSubmitting={createRewardMutation.isPending}
          />
        </>
      )}

      {rewardsViewMode === "edit" && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setRewardsViewMode("list");
                setEditingRewardId(null);
              }}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-semibold">Edit Reward</h1>
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
            />
          )}
        </>
      )}
    </div>
  );
}
