"use client";

import { useMemo, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Award,
  Calendar,
  Clock,
  Edit2,
  Info,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import type {
  LoyaltyEarningRule,
  LoyaltyEarningRuleInput,
} from "@/backend/loyalty/earningRules.api";
import {
  useCreateLoyaltyEarningRuleMutation,
  useDeleteLoyaltyEarningRuleMutation,
  useLoyaltyEarningRules,
  useToggleLoyaltyEarningRuleStatusMutation,
  useUpdateLoyaltyEarningRuleMutation,
} from "@/backend/loyalty/earningRules.query";
import type { LoyaltyTierInput } from "@/backend/loyalty/tiers.api";
import {
  useCreateLoyaltyTierMutation,
  useDeleteLoyaltyTierMutation,
  useLoyaltyTiers,
  useUpdateLoyaltyTierMutation,
} from "@/backend/loyalty/tiers.query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

// Validation schemas
const tierSchema = z.object({
  name: z.string().min(1, "Tier name is required"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
  pointsMultiplier: z.coerce.number().min(0, "Must be a positive number"),
  threshold: z.coerce.number().min(0, "Must be a positive number"),
});

const earningRuleSchema = z.object({
  name: z.string().min(1, "Rule name is required"),
  description: z.string().optional(),
  priority: z.coerce.number().min(0).default(10),
  status: z
    .enum(["active", "inactive", "scheduled", "expired"])
    .default("active"),
  pointsPerUnit: z.coerce.number().min(0).default(1.0),
  multiplier: z.coerce.number().min(0).default(1.0),
  bonusPoints: z.coerce.number().min(0).default(0),
  minPurchaseAmount: z
    .union([z.literal(""), z.null(), z.undefined(), z.coerce.number().min(0)])
    .transform((v) => (v === "" ? null : v)),
  maxPurchaseAmount: z
    .union([z.literal(""), z.null(), z.undefined(), z.coerce.number().min(0)])
    .transform((v) => (v === "" ? null : v)),
  // UI supports these (and backend may accept them); keep permissive for date input values.
  validFrom: z.string().nullable().optional(),
  validUntil: z.string().nullable().optional(),
  isDefault: z.boolean().default(false),
});

type TierFormValues = z.input<typeof tierSchema>;
type EarningRuleFormValues = z.input<typeof earningRuleSchema>;

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  // Accept ISO strings; keep YYYY-MM-DD.
  return value.length >= 10 ? value.slice(0, 10) : value;
}

function formatStatusLabel(status?: string) {
  if (!status) return "Inactive";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getRuleIcon(rule: LoyaltyEarningRule) {
  if (rule.isDefault) return "💰";
  if (rule.allowedDays?.includes("SATURDAY")) return "🌟";
  return "🎁";
}

export default function EarningRulesPage() {
  const t = useTranslations("loyalty.earningRules");

  const [earningRulesViewMode, setEarningRulesViewMode] = useState<
    "list" | "create"
  >("list");

  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Create view (UI-only extras to match design)
  const [ruleIcon, setRuleIcon] = useState("");
  const [ruleType, setRuleType] = useState<
    "" | "multiplier" | "bonus" | "percentage"
  >("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [tierRestrictionEnabled, setTierRestrictionEnabled] = useState(false);
  const [limitedPeriodEnabled, setLimitedPeriodEnabled] = useState(false);
  const [whatsAppTemplate, setWhatsAppTemplate] = useState("");

  // Fetch tiers from API
  const { data: loyaltyTiers = [], isLoading: tiersLoading } =
    useLoyaltyTiers();

  // Fetch earning rules
  const {
    data: earningRules = [],
    isLoading,
    error,
  } = useLoyaltyEarningRules();

  const additionalRules = useMemo(
    () => earningRules.filter((r) => !r.isDefault),
    [earningRules],
  );

  // Tier mutations
  const createTierMutation = useCreateLoyaltyTierMutation(() => {
    toast.success(t("tierAdded"));
  });
  const deleteTierMutation = useDeleteLoyaltyTierMutation();

  // Rule mutations (create + delete only; update/toggle handled per-card)
  const createRuleMutation = useCreateLoyaltyEarningRuleMutation(() => {
    setEarningRulesViewMode("list");
    toast.success(t("createSuccess"));
  });
  const deleteRuleMutation = useDeleteLoyaltyEarningRuleMutation();

  // Earning Rule Form (Create screen)
  const ruleForm = useForm<EarningRuleFormValues>({
    resolver: zodResolver(earningRuleSchema),
    defaultValues: {
      name: "",
      description: "",
      priority: 10,
      status: "active",
      pointsPerUnit: 1.0,
      multiplier: 1.0,
      bonusPoints: 0,
      minPurchaseAmount: null,
      maxPurchaseAmount: null,
      validFrom: null,
      validUntil: null,
      isDefault: false,
    },
  });

  const resetCreateForm = () => {
    ruleForm.reset({
      name: "",
      description: "",
      priority: 10,
      status: "active",
      pointsPerUnit: 1.0,
      multiplier: 1.0,
      bonusPoints: 0,
      minPurchaseAmount: null,
      maxPurchaseAmount: null,
      validFrom: null,
      validUntil: null,
      isDefault: false,
    });
    setRuleIcon("");
    setRuleType("");
    setScheduleEnabled(false);
    setTierRestrictionEnabled(false);
    setLimitedPeriodEnabled(false);
    setWhatsAppTemplate("");
  };

  const handleCreateSubmit = (values: EarningRuleFormValues) => {
    createRuleMutation.mutate(values as LoyaltyEarningRuleInput);
  };

  const handleDeleteRule = (ruleId: string) => {
    if (confirm(t("deleteConfirm"))) {
      deleteRuleMutation.mutate(ruleId, {
        onSuccess: () => toast.success(t("deleteSuccess")),
      });
    }
  };

  const handleTierDelete = (tierId: string, tierName: string) => {
    if (confirm(t("deleteTierConfirm"))) {
      deleteTierMutation.mutate(tierId, {
        onSuccess: () => toast.success(t("tierDeleted", { name: tierName })),
      });
    }
  };

  const handleAddTier = () => {
    const maxPoints = Math.max(
      ...loyaltyTiers.map((tier) => tier.threshold),
      0,
    );
    const newTierData: LoyaltyTierInput = {
      name: t("newTier"),
      color: "#1873E8",
      pointsMultiplier: 10,
      threshold: maxPoints + 1000,
    };

    createTierMutation.mutate(newTierData);
  };

  if (isLoading || tiersLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{t("loadError")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {earningRulesViewMode === "list" && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="mb-1 text-2xl font-semibold">{t("title")}</h1>
              <p className="text-sm text-muted-foreground">
                {t("description")}
              </p>
            </div>

            <Button
              className="bg-[#1873E8] hover:bg-[#1873E8]/90"
              onClick={() => {
                setEditingRuleId(null);
                setEditingTierId(null);
                resetCreateForm();
                setEarningRulesViewMode("create");
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("addRule")}
            </Button>
          </div>

          <div className="space-y-6">
            {/* Tier-Based Earning Rates */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{t("tierBasedRates")}</h3>
                  <Badge variant="outline" className="text-xs">
                    {loyaltyTiers.length} {t("tiers")}
                  </Badge>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#1873E8] text-[#1873E8] hover:bg-blue-50"
                  onClick={handleAddTier}
                  disabled={createTierMutation.isPending}
                >
                  {createTierMutation.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-1.5 h-4 w-4" />
                  )}
                  {t("addTier")}
                </Button>
              </div>

              <div className="space-y-2">
                {loyaltyTiers
                  .slice()
                  .sort((a, b) => a.threshold - b.threshold)
                  .map((tier, index) => (
                    <TierCard
                      key={tier.id}
                      tier={tier}
                      index={index}
                      isEditing={editingTierId === tier.id}
                      onStartEdit={() => {
                        setEditingRuleId(null);
                        setEditingTierId(tier.id);
                      }}
                      onCancelEdit={() => setEditingTierId(null)}
                      onDelete={(id, name) => {
                        handleTierDelete(id, name);
                        setEditingTierId(null);
                      }}
                      t={t}
                    />
                  ))}
              </div>
            </div>

            {/* Additional Earning Rules */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="font-semibold">{t("additionalRules")}</h3>
                <Badge variant="outline" className="text-xs">
                  {additionalRules.length} {t("rules")}
                </Badge>
              </div>

              <div className="space-y-2">
                {additionalRules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    isEditing={editingRuleId === rule.id}
                    onStartEdit={() => {
                      setEditingTierId(null);
                      setEditingRuleId(rule.id || null);
                    }}
                    onCancelEdit={() => setEditingRuleId(null)}
                    onDelete={() => rule.id && handleDeleteRule(rule.id)}
                    isDeleting={deleteRuleMutation.isPending}
                    t={t}
                  />
                ))}

                {additionalRules.length === 0 && (
                  <Card className="border-2 border-dashed border-gray-300">
                    <CardContent className="p-8 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                        <Plus className="h-6 w-6 text-gray-400" />
                      </div>
                      <h4 className="mb-1 font-semibold">{t("noRulesYet")}</h4>
                      <p className="mb-4 text-sm text-muted-foreground">
                        {t("noRulesDescription")}
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          resetCreateForm();
                          setEarningRulesViewMode("create");
                        }}
                        className="border-[#1873E8] text-[#1873E8] hover:bg-blue-50"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {t("createFirstRule")}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {earningRulesViewMode === "create" && (
        <div className="space-y-6">
          {/* Back button */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEarningRulesViewMode("list");
                resetCreateForm();
              }}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("back")}
            </Button>
          </div>

          <Card className="border shadow-sm bg-white">
            <CardContent className="p-6">
              <h2 className="mb-2 text-xl font-semibold">
                Create Additional Earning Rule
              </h2>
              <p className="mb-6 text-sm text-muted-foreground">
                Add bonus earning opportunities like happy hour multipliers,
                birthday bonuses, or weekend specials
              </p>

              <Form {...ruleForm}>
                <form
                  onSubmit={ruleForm.handleSubmit(handleCreateSubmit)}
                  className="space-y-5"
                >
                  {/* Rule Name */}
                  <FormField
                    control={ruleForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>{t("ruleName")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={t("ruleNamePlaceholder")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Description */}
                  <FormField
                    control={ruleForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>{t("description")}</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            className="min-h-20 resize-none"
                            placeholder={t("descriptionPlaceholder")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Icon + Rule Type (UI-only, for design parity) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Icon</Label>
                      <Input
                        value={ruleIcon}
                        onChange={(e) => setRuleIcon(e.target.value)}
                        placeholder="e.g., 🎉, 💰, ⭐, 🎂"
                        maxLength={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rule Type</Label>
                      <Select
                        value={ruleType}
                        onValueChange={(v) => setRuleType(v as typeof ruleType)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="multiplier">
                            Points Multiplier (2x, 3x points)
                          </SelectItem>
                          <SelectItem value="bonus">
                            Fixed Bonus Points
                          </SelectItem>
                          <SelectItem value="percentage">
                            Percentage Bonus
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Multiplier + Bonus Points */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={ruleForm.control}
                      name="multiplier"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel>{t("multiplier")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value as number}
                              type="number"
                              step="0.1"
                              min="1"
                            />
                          </FormControl>
                          <FormDescription>
                            {t("multiplierHint")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={ruleForm.control}
                      name="bonusPoints"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel>{t("bonusPoints")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value as number}
                              type="number"
                              min="0"
                            />
                          </FormControl>
                          <FormDescription>
                            {t("bonusPointsHint")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Optional date range (matches design intent) */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={ruleForm.control}
                      name="validFrom"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel>Valid From</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(e.target.value || null)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={ruleForm.control}
                      name="validUntil"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel>Valid To</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(e.target.value || null)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Schedule Settings (UI-only toggles) */}
                  <div className="space-y-3 border-t pt-4">
                    <h3 className="text-base font-medium">
                      When does this rule apply?
                    </h3>

                    <div className="space-y-3">
                      <div className="space-y-3 rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              Specific Days/Times
                            </p>
                            <p className="text-xs text-muted-foreground">
                              E.g., Weekends, Happy Hours, specific dates
                            </p>
                          </div>
                          <Switch
                            checked={scheduleEnabled}
                            onCheckedChange={setScheduleEnabled}
                            className="data-[state=checked]:bg-[#1873E8]"
                          />
                        </div>
                      </div>

                      <div className="space-y-3 rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              Customer Tier Restriction
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Apply to specific membership tiers only
                            </p>
                          </div>
                          <Switch
                            checked={tierRestrictionEnabled}
                            onCheckedChange={setTierRestrictionEnabled}
                            className="data-[state=checked]:bg-[#1873E8]"
                          />
                        </div>
                      </div>

                      <div className="space-y-3 rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              Limited Time Period
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Set start and end dates for this rule
                            </p>
                          </div>
                          <Switch
                            checked={limitedPeriodEnabled}
                            onCheckedChange={setLimitedPeriodEnabled}
                            className="data-[state=checked]:bg-[#1873E8]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Template (UI-only) */}
                  <div className="space-y-2">
                    <Label>WhatsApp Notification Template (Optional)</Label>
                    <Select
                      value={whatsAppTemplate}
                      onValueChange={setWhatsAppTemplate}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="points_earned">
                          Points Earned Notification
                        </SelectItem>
                        <SelectItem value="bonus_points">
                          Bonus Points Alert
                        </SelectItem>
                        <SelectItem value="multiplier_active">
                          Multiplier Active
                        </SelectItem>
                        <SelectItem value="special_offer">
                          Special Offer Points
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-8 flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setEarningRulesViewMode("list");
                        resetCreateForm();
                      }}
                    >
                      {t("cancel")}
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-[#1873E8] hover:bg-[#1873E8]/90"
                      disabled={createRuleMutation.isPending}
                    >
                      {createRuleMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("creating")}
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          {t("createRule")}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function TierCard({
  tier,
  index,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onDelete,
  t,
}: Readonly<{
  tier: {
    id: string;
    name: string;
    color: string;
    pointsMultiplier: number | string;
    threshold: number;
  };
  index: number;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string, name: string) => void;
  t: any;
}>) {
  const tierForm = useForm<TierFormValues>({
    resolver: zodResolver(tierSchema),
    defaultValues: {
      name: tier.name,
      color: tier.color,
      pointsMultiplier: Number(tier.pointsMultiplier),
      threshold: tier.threshold,
    },
  });

  const updateTierMutation = useUpdateLoyaltyTierMutation(tier.id, () => {
    toast.success(t("tierSaved", { name: tierForm.getValues("name") }));
  });

  const onSubmit = (values: TierFormValues) => {
    const updatedData: LoyaltyTierInput = {
      name: values.name,
      color: values.color,
      pointsMultiplier: Number(values.pointsMultiplier),
      threshold: Number(values.threshold),
    };
    updateTierMutation.mutate(updatedData, {
      onSuccess: () => onCancelEdit(),
    });
  };

  if (!isEditing) {
    return (
      <Card>
        <CardContent>
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: tier.color }}
            >
              <Award className="h-5 w-5 text-background" />
            </div>

            <div className="flex flex-1 items-center gap-4">
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold leading-tight">
                  {tier.name}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {index === 0
                    ? "Base tier - Starting point"
                    : `${tier.threshold.toLocaleString()}+ lifetime points`}
                </p>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5">
                <p className="text-xs text-muted-foreground">
                  {t("earningRate")}
                </p>
                <p className="text-sm font-semibold text-[#1873E8]">
                  {Number(tier.pointsMultiplier)} pts/AED
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-[#1873E8] hover:bg-blue-50"
                onClick={onStartEdit}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Form {...tierForm}>
          <form
            onSubmit={tierForm.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Edit Tier</h4>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    tierForm.reset({
                      name: tier.name,
                      color: tier.color,
                      pointsMultiplier: Number(tier.pointsMultiplier),
                      threshold: tier.threshold,
                    });
                    onCancelEdit();
                  }}
                  className="h-8"
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 bg-[#1873E8] hover:bg-[#1873E8]/90"
                  disabled={updateTierMutation.isPending}
                >
                  {updateTierMutation.isPending ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="mr-1 h-3.5 w-3.5" />
                  )}
                  Save
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={tierForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{t("tierName")}</FormLabel>
                    <FormControl>
                      <Input {...field} className="mt-1 h-9 font-semibold" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={tierForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{t("color")}</FormLabel>
                    <FormControl>
                      <Input {...field} type="color" className="mt-1 h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={tierForm.control}
                name="pointsMultiplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      {t("earningRate")}
                    </FormLabel>
                    <div className="mt-1 flex items-center gap-1">
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value as number}
                          type="number"
                          className="h-9 font-semibold"
                          min="0"
                        />
                      </FormControl>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        pts/AED
                      </span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={tierForm.control}
                name="threshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{t("threshold")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        value={field.value as number}
                        className="mt-1 h-9"
                        min="0"
                        disabled={tier.threshold === 0}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <div className="text-xs text-muted-foreground">
                {tier.threshold === 0 ? (
                  <>
                    <Info className="mr-1 inline h-3 w-3" />
                    {t("baseTierInfo")}
                  </>
                ) : (
                  t("tierReachInfo", {
                    points: tier.threshold.toLocaleString(),
                  })
                )}
              </div>

              {tier.threshold > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-red-600 hover:bg-red-50"
                  onClick={() => onDelete(tier.id, tierForm.getValues("name"))}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Delete Tier
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function RuleCard({
  rule,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onDelete,
  isDeleting,
  t,
}: Readonly<{
  rule: LoyaltyEarningRule;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  t: any;
}>) {
  const ruleForm = useForm<EarningRuleFormValues>({
    resolver: zodResolver(earningRuleSchema),
    defaultValues: {
      name: rule.name || "",
      description: rule.description || "",
      priority: rule.priority || 10,
      status: (rule.status as any) || "inactive",
      pointsPerUnit: rule.pointsPerUnit || 1.0,
      multiplier: rule.multiplier || 1.0,
      bonusPoints: rule.bonusPoints || 0,
      minPurchaseAmount: rule.minPurchaseAmount ?? null,
      maxPurchaseAmount: rule.maxPurchaseAmount ?? null,
      validFrom: toDateInputValue(rule.validFrom),
      validUntil: toDateInputValue(rule.validUntil),
      isDefault: rule.isDefault || false,
    },
  });

  const updateRuleMutation = useUpdateLoyaltyEarningRuleMutation(
    rule.id || "",
    () => {
      toast.success(t("updateSuccess"));
    },
  );

  const toggleStatusMutation = useToggleLoyaltyEarningRuleStatusMutation(
    rule.id || "",
  );

  const isEnabled = rule.status === "active";

  const onSave = (values: EarningRuleFormValues) => {
    updateRuleMutation.mutate(values as LoyaltyEarningRuleInput, {
      onSuccess: () => onCancelEdit(),
    });
  };

  const onToggle = (checked: boolean) => {
    toggleStatusMutation.mutate(
      { status: checked ? "active" : "inactive" },
      { onSuccess: () => toast.success(t("statusUpdated")) },
    );
  };

  if (!isEditing) {
    return (
      <Card>
        <CardContent>
          <div className="flex items-center gap-3">
            {/* Icon and Name */}
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="shrink-0 text-xl">{getRuleIcon(rule)}</span>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-medium leading-tight">
                  {rule.name}
                </h4>
                <p className="truncate text-xs text-muted-foreground">
                  {rule.description || t("noDescription")}
                </p>
              </div>
            </div>

            {/* Compact Stats */}
            <div className="flex shrink-0 items-center gap-2">
              {rule.multiplier && rule.multiplier !== 1.0 && (
                <div className="rounded border border-purple-200 bg-purple-50 px-2 py-1">
                  <p className="text-xs font-medium text-purple-700">
                    {rule.multiplier}x
                  </p>
                </div>
              )}
              {rule.bonusPoints && rule.bonusPoints !== 0 && (
                <div className="rounded border border-blue-200 bg-blue-50 px-2 py-1">
                  <p className="text-xs font-medium text-[#1873E8]">
                    +{rule.bonusPoints}
                  </p>
                </div>
              )}
              <Badge
                className={`text-xs h-5 ${
                  rule.status === "active"
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : rule.status === "scheduled"
                      ? "bg-blue-100 text-blue-700 border border-blue-200"
                      : "bg-gray-100 text-gray-700 border border-gray-200"
                }`}
              >
                {formatStatusLabel(rule.status)}
              </Badge>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-1.5">
              <Switch
                checked={isEnabled}
                onCheckedChange={onToggle}
                className="data-[state=checked]:bg-[#1873E8]"
                disabled={toggleStatusMutation.isPending}
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-[#1873E8] hover:bg-blue-50"
                onClick={onStartEdit}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {(rule.allowedDays?.length || rule.validFrom || rule.validUntil) && (
            <div className="mt-3 flex items-center gap-4 border-t pt-3 text-xs text-muted-foreground">
              {rule.allowedDays && rule.allowedDays.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{rule.allowedDays.join(", ")}</span>
                </div>
              )}
              {(rule.validFrom || rule.validUntil) && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {rule.validFrom
                      ? new Date(rule.validFrom).toLocaleDateString()
                      : t("start")}
                    {" - "}
                    {rule.validUntil
                      ? new Date(rule.validUntil).toLocaleDateString()
                      : t("end")}
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Form {...ruleForm}>
          <form onSubmit={ruleForm.handleSubmit(onSave)} className="space-y-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Edit Rule</h4>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    ruleForm.reset();
                    onCancelEdit();
                  }}
                  className="h-8"
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 bg-[#1873E8] hover:bg-[#1873E8]/90"
                  disabled={updateRuleMutation.isPending}
                >
                  {updateRuleMutation.isPending ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="mr-1 h-3.5 w-3.5" />
                  )}
                  Save
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <FormField
                  control={ruleForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t("ruleName")}</FormLabel>
                      <FormControl>
                        <Input {...field} className="mt-1 h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-2">
                <FormField
                  control={ruleForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        {t("description")}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="mt-1 text-sm"
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={ruleForm.control}
                name="multiplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{t("multiplier")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value as number}
                        type="number"
                        step="0.1"
                        className="mt-1 h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={ruleForm.control}
                name="bonusPoints"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      {t("bonusPoints")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value as number}
                        type="number"
                        className="mt-1 h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={ruleForm.control}
                name="validFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Valid From</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        className="mt-1 h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={ruleForm.control}
                name="validUntil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Valid To</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        className="mt-1 h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Enable Rule</Label>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={onToggle}
                  className="data-[state=checked]:bg-[#1873E8]"
                  disabled={toggleStatusMutation.isPending}
                />
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-red-600 hover:bg-red-50"
                onClick={onDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                )}
                Delete Rule
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
