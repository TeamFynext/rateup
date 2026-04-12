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
import { useExtracted } from "next-intl";
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
import InfoButton from "@/components/Button/InfoButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { docsPath } from "@/utils/constants";

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
  allowedDays: z.array(z.string()).optional(),
  timeFrom: z.string().optional(),
  timeTo: z.string().optional(),
  applicableToTiers: z.array(z.string()).optional(),
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
  const t = useExtracted("loyalty.earningRules");

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
    toast.success(t("New tier added"));
  });
  const deleteTierMutation = useDeleteLoyaltyTierMutation();

  // Rule mutations (create + delete only; update/toggle handled per-card)
  const createRuleMutation = useCreateLoyaltyEarningRuleMutation(() => {
    setEarningRulesViewMode("list");
    toast.success(t("Earning rule created successfully"));
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
      allowedDays: [],
      timeFrom: "",
      timeTo: "",
      applicableToTiers: [],
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
      allowedDays: [],
      timeFrom: "",
      timeTo: "",
      applicableToTiers: [],
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
    const { timeFrom, timeTo, allowedDays, applicableToTiers, ...rest } =
      values;
    const payload = {
      ...rest,
      allowedDays: scheduleEnabled ? (allowedDays ?? []) : [],
      allowedTimeRanges:
        scheduleEnabled && (timeFrom || timeTo)
          ? [{ start: timeFrom || "00:00", end: timeTo || "23:59" }]
          : [],
      applicableToTiers: tierRestrictionEnabled
        ? (applicableToTiers ?? [])
        : [],
      validFrom: limitedPeriodEnabled ? rest.validFrom : null,
      validUntil: limitedPeriodEnabled ? rest.validUntil : null,
    };
    createRuleMutation.mutate(payload as LoyaltyEarningRuleInput);
  };

  const handleDeleteRule = (ruleId: string) => {
    if (confirm(t("Are you sure you want to delete this earning rule?"))) {
      deleteRuleMutation.mutate(ruleId, {
        onSuccess: () => toast.success(t("Earning rule deleted successfully")),
      });
    }
  };

  const handleTierDelete = (tierId: string, tierName: string) => {
    if (confirm(t("deleteTierConfirm"))) {
      deleteTierMutation.mutate(tierId, {
        onSuccess: () =>
          toast.success(t("{name} tier deleted", { name: tierName })),
      });
    }
  };

  const handleAddTier = () => {
    const maxPoints = Math.max(
      ...loyaltyTiers.map((tier) => tier.threshold),
      0,
    );
    const newTierData: LoyaltyTierInput = {
      name: "New Tier " + (loyaltyTiers.length + 1),
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
          <p className="text-sm text-destructive">
            {t("Error loading earning rules")}
          </p>
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
              <h1 className="mb-1 text-2xl font-semibold">
                {t("Point Earning Rules")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t(
                  "Define how customers earn points through purchases and activities",
                )}
              </p>
            </div>
            <div className="flex items-start justify-between gap-2">
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
                {t("Add Rule")}
              </Button>
              <InfoButton docUrl={`${docsPath}/loyality/earningRules`} />
            </div>
          </div>

          <div className="space-y-6">
            {/* Tier-Based Earning Rates */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">
                    {t("Tier-Based Earning Rates")}
                  </h3>
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
                  {t("Add Tier")}
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
                    />
                  ))}
              </div>
            </div>

            {/* Additional Earning Rules */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="font-semibold">
                  {t("Additional Earning Rules")}
                </h3>
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
                  />
                ))}

                {additionalRules.length === 0 && (
                  <Card className="border-2 border-dashed border-gray-300">
                    <CardContent className="p-8 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                        <Plus className="h-6 w-6 text-gray-400" />
                      </div>
                      <h4 className="mb-1 font-semibold">
                        {t("No additional rules yet")}
                      </h4>
                      <p className="mb-4 text-sm text-muted-foreground">
                        {t(
                          "Create bonus rules like happy hour multipliers, birthday bonuses, or weekend specials",
                        )}
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
                        {t("Create Your First Rule")}
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
              {t("Back")}
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
                        <FormLabel>{t("Rule Name")}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={t(
                              "e.g., Happy Hour Bonus, Weekend Multiplier, Birthday Bonus",
                            )}
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
                        <FormLabel>
                          {t(
                            "Define how customers earn points through purchases and activities",
                          )}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            className="min-h-20 resize-none"
                            placeholder={t(
                              "Describe when and how this rule applies...",
                            )}
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
                          <FormLabel>{t("Multiplier")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value as number}
                              step="0.1"
                              min="1"
                            />
                          </FormControl>
                          <FormDescription>
                            {t("e.g., 2.0 = Double points, 1.5 = 50% more")}
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
                          <FormLabel>{t("Bonus Points")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value as number}
                              min="0"
                            />
                          </FormControl>
                          <FormDescription>
                            {t("Additional points on top of standard rate")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Schedule Settings */}
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
                            onCheckedChange={(checked) => {
                              setScheduleEnabled(checked);
                              if (!checked) {
                                ruleForm.setValue("allowedDays", []);
                                ruleForm.setValue("timeFrom", "");
                                ruleForm.setValue("timeTo", "");
                              }
                            }}
                            className="data-[state=checked]:bg-[#1873E8]"
                          />
                        </div>
                        {scheduleEnabled && (
                          <div className="space-y-3 border-t pt-3">
                            <FormField
                              control={ruleForm.control}
                              name="allowedDays"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">
                                    Available Days
                                  </FormLabel>
                                  <div className="grid grid-cols-2 gap-2">
                                    {[
                                      "MONDAY",
                                      "TUESDAY",
                                      "WEDNESDAY",
                                      "THURSDAY",
                                      "FRIDAY",
                                      "SATURDAY",
                                      "SUNDAY",
                                    ].map((day) => (
                                      <div
                                        key={day}
                                        className="flex items-center space-x-2"
                                      >
                                        <Checkbox
                                          id={`create-day-${day}`}
                                          checked={field.value?.includes(day)}
                                          onCheckedChange={(checked) => {
                                            const updated = checked
                                              ? [...(field.value || []), day]
                                              : (field.value || []).filter(
                                                  (d) => d !== day,
                                                );
                                            field.onChange(updated);
                                          }}
                                        />
                                        <Label
                                          htmlFor={`create-day-${day}`}
                                          className="cursor-pointer text-sm font-normal capitalize"
                                        >
                                          {day.charAt(0) +
                                            day.slice(1).toLowerCase()}
                                        </Label>
                                      </div>
                                    ))}
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={ruleForm.control}
                                name="timeFrom"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">
                                      Start Time
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        type="time"
                                        {...field}
                                        value={field.value ?? ""}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={ruleForm.control}
                                name="timeTo"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">
                                      End Time
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        type="time"
                                        {...field}
                                        value={field.value ?? ""}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        )}
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
                            onCheckedChange={(checked) => {
                              setTierRestrictionEnabled(checked);
                              if (!checked)
                                ruleForm.setValue("applicableToTiers", []);
                            }}
                            className="data-[state=checked]:bg-[#1873E8]"
                          />
                        </div>
                        {tierRestrictionEnabled && (
                          <FormField
                            control={ruleForm.control}
                            name="applicableToTiers"
                            render={({ field }) => (
                              <FormItem className="border-t pt-3">
                                <FormLabel className="text-xs">
                                  Applicable Tiers
                                </FormLabel>
                                <div className="space-y-2">
                                  {loyaltyTiers.map((tier) => (
                                    <div
                                      key={tier.id}
                                      className="flex items-center space-x-2"
                                    >
                                      <Checkbox
                                        id={`create-tier-${tier.id}`}
                                        checked={field.value?.includes(tier.id)}
                                        onCheckedChange={(checked) => {
                                          const updated = checked
                                            ? [...(field.value || []), tier.id]
                                            : (field.value || []).filter(
                                                (t) => t !== tier.id,
                                              );
                                          field.onChange(updated);
                                        }}
                                      />
                                      <Label
                                        htmlFor={`create-tier-${tier.id}`}
                                        className="flex cursor-pointer items-center gap-2 text-sm font-normal"
                                      >
                                        <div
                                          className="h-3 w-3 rounded-full"
                                          style={{
                                            backgroundColor: tier.color,
                                          }}
                                        />
                                        {tier.name}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
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
                            onCheckedChange={(checked) => {
                              setLimitedPeriodEnabled(checked);
                              if (!checked) {
                                ruleForm.setValue("validFrom", null);
                                ruleForm.setValue("validUntil", null);
                              }
                            }}
                            className="data-[state=checked]:bg-[#1873E8]"
                          />
                        </div>
                        {limitedPeriodEnabled && (
                          <div className="grid grid-cols-2 gap-4 border-t pt-3">
                            <FormField
                              control={ruleForm.control}
                              name="validFrom"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">
                                    Valid From
                                  </FormLabel>
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
                                <FormItem>
                                  <FormLabel className="text-xs">
                                    Valid To
                                  </FormLabel>
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
                        )}
                      </div>
                    </div>
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
                      {t("Cancel")}
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-[#1873E8] hover:bg-[#1873E8]/90"
                      disabled={createRuleMutation.isPending}
                    >
                      {createRuleMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("Creating...")}
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          {t("Create Earning Rule")}
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
}) {
  const t = useExtracted();
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
    toast.success(
      t("{name} tier settings saved", { name: tierForm.getValues("name") }),
    );
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
                  {t("Earning Rate")}
                </p>
                <p className="text-sm font-semibold text-[#1873E8]">
                  {Number(tier.pointsMultiplier)} pts/
                  {tier.program?.currencyCode}
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
                    <FormLabel className="text-xs">{t("Tier Name")}</FormLabel>
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
                    <FormLabel className="text-xs">{t("Color")}</FormLabel>
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
                      {t("Earning Rate")}
                    </FormLabel>
                    <div className="mt-1 flex items-center gap-1">
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value as number}
                          className="h-9 font-semibold"
                          min="0"
                        />
                      </FormControl>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        pts/{tier?.program?.currencyCode || "currency"}
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
                    <FormLabel className="text-xs">{t("Threshold")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
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
              <div className="px-2 py-1.5 bg-blue-50 rounded border border-blue-200">
                <p className="text-xs text-muted-foreground">
                  Value per point:
                </p>
                <p className="font-semibold text-sm text-[#1873E8]">
                  1 pt ={" "}
                  {(() => {
                    // Use the current form value for pointsMultiplier
                    const points = Number(tierForm.watch("pointsMultiplier"));
                    if (!points || points <= 0) return "-";
                    const currency = 1;
                    return (currency / points).toFixed(3);
                  })()}{" "}
                  {tier?.program?.currencyCode || "currency"}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <div className="text-xs text-muted-foreground">
                {tier.threshold === 0 ? (
                  <>
                    <Info className="mr-1 inline h-3 w-3" />
                    {t(
                      "Base tier - All new customers start here. Cannot be deleted.",
                    )}
                  </>
                ) : (
                  t(
                    "Customers reach this tier after earning {points} lifetime points",
                    {
                      points: tier.threshold.toLocaleString(),
                    },
                  )
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
}: any) {
  const t = useExtracted();
  const { data: loyaltyTiers = [] } = useLoyaltyTiers();
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
      allowedDays: rule.allowedDays || [],
      timeFrom: rule.allowedTimeRanges?.[0]?.start || "",
      timeTo: rule.allowedTimeRanges?.[0]?.end || "",
      applicableToTiers: rule.applicableToTiers || [],
      isDefault: rule.isDefault || false,
    },
  });

  const updateRuleMutation = useUpdateLoyaltyEarningRuleMutation(
    rule.id || "",
    () => {
      toast.success(t("Earning rule updated successfully"));
    },
  );

  const toggleStatusMutation = useToggleLoyaltyEarningRuleStatusMutation(
    rule.id || "",
  );

  const isEnabled = rule.status === "active";
  const [scheduleEnabled, setScheduleEnabled] = useState(
    (rule.allowedDays?.length || 0) > 0 ||
      (rule.allowedTimeRanges?.length || 0) > 0,
  );
  const [tierRestrictionEnabled, setTierRestrictionEnabled] = useState(
    (rule.applicableToTiers?.length || 0) > 0,
  );
  const [limitedPeriodEnabled, setLimitedPeriodEnabled] = useState(
    !!(rule.validFrom || rule.validUntil),
  );

  const onSave = (values: EarningRuleFormValues) => {
    const { timeFrom, timeTo, allowedDays, applicableToTiers, ...rest } =
      values;
    const payload = {
      ...rest,
      allowedDays: scheduleEnabled ? (allowedDays ?? []) : [],
      allowedTimeRanges:
        scheduleEnabled && (timeFrom || timeTo)
          ? [{ start: timeFrom || "00:00", end: timeTo || "23:59" }]
          : [],
      applicableToTiers: tierRestrictionEnabled
        ? (applicableToTiers ?? [])
        : [],
      validFrom: limitedPeriodEnabled ? rest.validFrom : null,
      validUntil: limitedPeriodEnabled ? rest.validUntil : null,
    };
    updateRuleMutation.mutate(payload as LoyaltyEarningRuleInput, {
      onSuccess: () => onCancelEdit(),
    });
  };

  const onToggle = (checked: boolean) => {
    toggleStatusMutation.mutate(
      { status: checked ? "active" : "inactive" },
      { onSuccess: () => toast.success(t("Rule status updated")) },
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
                  {rule.description || t("No description provided")}
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
                      : t("Start")}
                    {" - "}
                    {rule.validUntil
                      ? new Date(rule.validUntil).toLocaleDateString()
                      : t("End")}
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
                      <FormLabel className="text-xs">
                        {t("Rule Name")}
                      </FormLabel>
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
                        {t(
                          "Define how customers earn points through purchases and activities",
                        )}
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
                    <FormLabel className="text-xs">{t("Multiplier")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value as number}
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
                      {t("Bonus Points")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value as number}
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

            <div className="space-y-3 border-t pt-3">
              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Specific Days/Times</p>
                    <p className="text-xs text-muted-foreground">
                      E.g., Weekends, Happy Hours
                    </p>
                  </div>
                  <Switch
                    checked={scheduleEnabled}
                    onCheckedChange={(checked) => {
                      setScheduleEnabled(checked);
                      if (!checked) {
                        ruleForm.setValue("allowedDays", []);
                        ruleForm.setValue("timeFrom", "");
                        ruleForm.setValue("timeTo", "");
                      }
                    }}
                    className="data-[state=checked]:bg-[#1873E8]"
                  />
                </div>
                {scheduleEnabled && (
                  <div className="space-y-3 border-t pt-3">
                    <FormField
                      control={ruleForm.control}
                      name="allowedDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">
                            Available Days
                          </FormLabel>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              "MONDAY",
                              "TUESDAY",
                              "WEDNESDAY",
                              "THURSDAY",
                              "FRIDAY",
                              "SATURDAY",
                              "SUNDAY",
                            ].map((day) => (
                              <div
                                key={day}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={`edit-day-${rule.id}-${day}`}
                                  checked={field.value?.includes(day)}
                                  onCheckedChange={(checked) => {
                                    const updated = checked
                                      ? [...(field.value || []), day]
                                      : (field.value || []).filter(
                                          (d) => d !== day,
                                        );
                                    field.onChange(updated);
                                  }}
                                />
                                <Label
                                  htmlFor={`edit-day-${rule.id}-${day}`}
                                  className="cursor-pointer text-xs font-normal capitalize"
                                >
                                  {day.charAt(0) + day.slice(1).toLowerCase()}
                                </Label>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={ruleForm.control}
                        name="timeFrom"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Start Time
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="time"
                                {...field}
                                value={field.value ?? ""}
                                className="mt-1 h-9"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={ruleForm.control}
                        name="timeTo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">End Time</FormLabel>
                            <FormControl>
                              <Input
                                type="time"
                                {...field}
                                value={field.value ?? ""}
                                className="mt-1 h-9"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-lg border p-3">
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
                    onCheckedChange={(checked) => {
                      setTierRestrictionEnabled(checked);
                      if (!checked) ruleForm.setValue("applicableToTiers", []);
                    }}
                    className="data-[state=checked]:bg-[#1873E8]"
                  />
                </div>
                {tierRestrictionEnabled && (
                  <FormField
                    control={ruleForm.control}
                    name="applicableToTiers"
                    render={({ field }) => (
                      <FormItem className="border-t pt-3">
                        <FormLabel className="text-xs">
                          Applicable Tiers
                        </FormLabel>
                        <div className="space-y-2">
                          {loyaltyTiers.map((tier: any) => (
                            <div
                              key={tier.id}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`edit-tier-${rule.id}-${tier.id}`}
                                checked={field.value?.includes(tier.id)}
                                onCheckedChange={(checked) => {
                                  const updated = checked
                                    ? [...(field.value || []), tier.id]
                                    : (field.value || []).filter(
                                        (t) => t !== tier.id,
                                      );
                                  field.onChange(updated);
                                }}
                              />
                              <Label
                                htmlFor={`edit-tier-${rule.id}-${tier.id}`}
                                className="flex cursor-pointer items-center gap-2 text-xs font-normal"
                              >
                                <div
                                  className="h-3 w-3 rounded-full"
                                  style={{ backgroundColor: tier.color }}
                                />
                                {tier.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Limited Time Period</p>
                    <p className="text-xs text-muted-foreground">
                      Set start and end dates for this rule
                    </p>
                  </div>
                  <Switch
                    checked={limitedPeriodEnabled}
                    onCheckedChange={(checked) => {
                      setLimitedPeriodEnabled(checked);
                      if (!checked) {
                        ruleForm.setValue("validFrom", null);
                        ruleForm.setValue("validUntil", null);
                      }
                    }}
                    className="data-[state=checked]:bg-[#1873E8]"
                  />
                </div>
                {limitedPeriodEnabled && (
                  <div className="grid grid-cols-2 gap-3 border-t pt-3">
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
                              onChange={(e) =>
                                field.onChange(e.target.value || null)
                              }
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
                              onChange={(e) =>
                                field.onChange(e.target.value || null)
                              }
                              className="mt-1 h-9"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
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
