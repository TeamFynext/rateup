"use client";

import { useState } from "react";

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
  minPurchaseAmount: z.coerce.number().min(0).nullable().optional(),
  maxPurchaseAmount: z.coerce.number().min(0).nullable().optional(),
  isDefault: z.boolean().default(false),
});

type TierFormValues = z.infer<typeof tierSchema>;
type EarningRuleFormValues = z.infer<typeof earningRuleSchema>;

export default function EarningRulesPage() {
  const t = useTranslations("loyalty.earningRules");
  const [viewMode, setViewMode] = useState<"list" | "create">("list");
  const [editingRule, setEditingRule] = useState<LoyaltyEarningRule | null>(
    null,
  );

  // Fetch tiers from API
  const { data: loyaltyTiers = [], isLoading: tiersLoading } =
    useLoyaltyTiers();

  // Fetch earning rules
  const {
    data: earningRules = [],
    isLoading,
    error,
  } = useLoyaltyEarningRules();

  // Tier mutations
  const createTierMutation = useCreateLoyaltyTierMutation(() => {
    toast.success(t("tierAdded"));
  });

  const updateTierMutation = useUpdateLoyaltyTierMutation("", () => {
    toast.success(t("tierSaved"));
  });

  const deleteTierMutation = useDeleteLoyaltyTierMutation();

  // Mutations
  const createRuleMutation = useCreateLoyaltyEarningRuleMutation(() => {
    setViewMode("list");
    toast.success(t("createSuccess"));
  });

  const updateRuleMutation = useUpdateLoyaltyEarningRuleMutation(
    editingRule?.id || "",
    () => {
      setViewMode("list");
      setEditingRule(null);
      toast.success(t("updateSuccess"));
    },
  );

  const deleteRuleMutation = useDeleteLoyaltyEarningRuleMutation();

  // Earning Rule Form
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
      isDefault: false,
    },
  });

  // Handle form submission
  const handleSubmit = (values: EarningRuleFormValues) => {
    if (editingRule) {
      updateRuleMutation.mutate(values);
    } else {
      createRuleMutation.mutate(values as LoyaltyEarningRuleInput);
    }
  };

  // Handle edit
  const handleEdit = (rule: LoyaltyEarningRule) => {
    setEditingRule(rule);
    ruleForm.reset({
      name: rule.name || "",
      description: rule.description || "",
      priority: rule.priority || 10,
      status: rule.status || "active",
      pointsPerUnit: rule.pointsPerUnit || 1.0,
      multiplier: rule.multiplier || 1.0,
      bonusPoints: rule.bonusPoints || 0,
      minPurchaseAmount: rule.minPurchaseAmount,
      maxPurchaseAmount: rule.maxPurchaseAmount,
      isDefault: rule.isDefault || false,
    });
    setViewMode("create");
  };

  // Handle delete
  const handleDelete = (ruleId: string) => {
    if (confirm(t("deleteConfirm"))) {
      deleteRuleMutation.mutate(ruleId, {
        onSuccess: () => toast.success(t("deleteSuccess")),
      });
    }
  };

  // Handle status toggle
  const handleToggleStatus = (
    ruleId: string,
    currentStatus: string | undefined,
  ) => {
    const newStatus =
      currentStatus === "active" ? "inactive" : ("active" as const);
    const mutation = useToggleLoyaltyEarningRuleStatusMutation(ruleId);
    mutation.mutate(
      { status: newStatus },
      {
        onSuccess: () => toast.success(t("statusUpdated")),
      },
    );
  };

  // Format display values
  const getIcon = (rule: LoyaltyEarningRule) => {
    if (rule.isDefault) return "💰";
    if (rule.allowedDays?.includes("SATURDAY")) return "🌟";
    return "🎁";
  };

  const handleTierDelete = (tierId: string, tierName: string) => {
    if (confirm(t("deleteTierConfirm"))) {
      deleteTierMutation.mutate(tierId, {
        onSuccess: () => toast.success(t("tierDeleted", { name: tierName })),
      });
    }
  };

  const handleAddTier = () => {
    const maxPoints = Math.max(...loyaltyTiers.map((t) => t.threshold), 0);
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
    <div className="space-y-6 p-6">
      {viewMode === "list" && (
        <>
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {t("title")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("description")}
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingRule(null);
                ruleForm.reset({
                  name: "",
                  description: "",
                  priority: 10,
                  status: "active",
                  pointsPerUnit: 1.0,
                  multiplier: 1.0,
                  bonusPoints: 0,
                  isDefault: false,
                });
                setViewMode("create");
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("addRule")}
            </Button>
          </div>

          {/* Tier-Based Earning Rates */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{t("tierBasedRates")}</h3>
                <Badge variant="secondary">
                  {loyaltyTiers.length} {t("tiers")}
                </Badge>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddTier}>
                <Plus className="mr-2 h-4 w-4" />
                {t("addTier")}
              </Button>
            </div>

            <div className="space-y-3">
              {loyaltyTiers
                .sort((a, b) => a.threshold - b.threshold)
                .map((tier, index) => (
                  <TierCard
                    key={tier.id}
                    tier={tier}
                    index={index}
                    onDelete={handleTierDelete}
                    t={t}
                  />
                ))}
            </div>
          </div>

          {/* Additional Earning Rules */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{t("additionalRules")}</h3>
              <Badge variant="secondary">
                {earningRules.filter((r) => !r.isDefault).length} {t("rules")}
              </Badge>
            </div>

            <div className="space-y-3">
              {earningRules
                .filter((rule) => !rule.isDefault)
                .map((rule) => (
                  <Card
                    key={rule.id}
                    className={rule.status === "inactive" ? "opacity-60" : ""}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="shrink-0 text-2xl">
                            {getIcon(rule)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h4 className="mb-0.5 text-sm font-semibold">
                              {rule.name}
                            </h4>
                            <p className="truncate text-xs text-muted-foreground">
                              {rule.description || t("noDescription")}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          {rule.multiplier && rule.multiplier !== 1.0 && (
                            <div className="rounded-lg border bg-purple-50 px-3 py-1.5 text-center">
                              <p className="text-xs text-muted-foreground">
                                {t("multiplier")}
                              </p>
                              <p className="text-sm font-semibold text-purple-700">
                                {rule.multiplier}x
                              </p>
                            </div>
                          )}
                          {rule.bonusPoints && rule.bonusPoints !== 0 && (
                            <div className="rounded-lg border bg-blue-50 px-3 py-1.5 text-center">
                              <p className="text-xs text-muted-foreground">
                                {t("bonus")}
                              </p>
                              <p className="text-sm font-semibold text-primary">
                                +{rule.bonusPoints}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <Badge
                            variant={
                              rule.status === "active" ? "default" : "secondary"
                            }
                          >
                            {rule.status?.charAt(0).toUpperCase() +
                              rule.status?.slice(1)}
                          </Badge>
                          <Switch
                            checked={rule.status === "active"}
                            onCheckedChange={() =>
                              handleToggleStatus(rule.id!, rule.status!)
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(rule)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(rule.id!)}
                            disabled={deleteRuleMutation.isPending}
                          >
                            {deleteRuleMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {(rule.allowedDays?.length ||
                        rule.validFrom ||
                        rule.validUntil) && (
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
                                  ? new Date(
                                      rule.validFrom,
                                    ).toLocaleDateString()
                                  : t("start")}
                                {" - "}
                                {rule.validUntil
                                  ? new Date(
                                      rule.validUntil,
                                    ).toLocaleDateString()
                                  : t("end")}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

              {earningRules.filter((r) => !r.isDefault).length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Plus className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h4 className="mb-1 font-semibold">{t("noRulesYet")}</h4>
                    <p className="mb-4 text-sm text-muted-foreground">
                      {t("noRulesDescription")}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingRule(null);
                        ruleForm.reset({
                          name: "",
                          description: "",
                          priority: 10,
                          status: "active",
                          pointsPerUnit: 1.0,
                          multiplier: 1.0,
                          bonusPoints: 0,
                          isDefault: false,
                        });
                        setViewMode("create");
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {t("createFirstRule")}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}

      {viewMode === "create" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setViewMode("list");
                setEditingRule(null);
                ruleForm.reset();
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("back")}
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              <h2 className="mb-2 text-xl font-semibold">
                {editingRule ? t("editRule") : t("createRule")}
              </h2>
              <p className="mb-6 text-sm text-muted-foreground">
                {t("createRuleDescription")}
              </p>

              <Form {...ruleForm}>
                <form
                  onSubmit={ruleForm.handleSubmit(handleSubmit)}
                  className="space-y-5"
                >
                  <FormField
                    control={ruleForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("ruleName")} *</FormLabel>
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

                  <FormField
                    control={ruleForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
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

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={ruleForm.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("priority")}</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder="10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={ruleForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("status")}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("selectStatus")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">
                                {t("active")}
                              </SelectItem>
                              <SelectItem value="inactive">
                                {t("inactive")}
                              </SelectItem>
                              <SelectItem value="scheduled">
                                {t("scheduled")}
                              </SelectItem>
                              <SelectItem value="expired">
                                {t("expired")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={ruleForm.control}
                      name="multiplier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("multiplier")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.1"
                              min="1"
                              placeholder="1.0"
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
                        <FormItem>
                          <FormLabel>{t("bonusPoints")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="0"
                              placeholder="0"
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

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={ruleForm.control}
                      name="minPurchaseAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("minPurchaseAmount")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              placeholder={t("optional")}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value
                                    ? parseFloat(e.target.value)
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
                      control={ruleForm.control}
                      name="maxPurchaseAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("maxPurchaseAmount")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              placeholder={t("optional")}
                              value={field.value ?? ""}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value
                                    ? parseFloat(e.target.value)
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

                  <div className="mt-8 flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setViewMode("list");
                        setEditingRule(null);
                        ruleForm.reset();
                      }}
                    >
                      {t("cancel")}
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={
                        createRuleMutation.isPending ||
                        updateRuleMutation.isPending
                      }
                    >
                      {createRuleMutation.isPending ||
                      updateRuleMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {editingRule ? t("updating") : t("creating")}
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          {editingRule ? t("updateRule") : t("createRule")}
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

// Separate component for tier card to properly use hooks
function TierCard({
  tier,
  index,
  onDelete,
  t,
}: {
  tier: any;
  index: number;
  onDelete: (id: string, name: string) => void;
  t: any;
}) {
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
    toast.success(t("tierSaved", { name: tier.name }));
  });

  const deleteTierMutation = useDeleteLoyaltyTierMutation();

  const onSubmit = (values: TierFormValues) => {
    updateTierMutation.mutate(values);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <Form {...tierForm}>
          <form onSubmit={tierForm.handleSubmit(onSubmit)}>
            <div className="flex items-start gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: tierForm.watch("color") }}
              >
                <Award className="h-6 w-6 text-white" />
              </div>

              <div className="grid flex-1 grid-cols-4 gap-4">
                <FormField
                  control={tierForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{t("tierName")}</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-9 font-semibold" />
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
                        <Input {...field} type="color" className="h-9" />
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
                      <div className="flex items-center gap-1">
                        <FormControl>
                          <Input
                            {...field}
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
                      <FormLabel className="text-xs">
                        {t("threshold")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          className="h-9"
                          min="0"
                          disabled={tier.threshold === 0}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  disabled={updateTierMutation.isPending}
                >
                  {updateTierMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
                {tier.threshold > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(tier.id, tier.name)}
                    disabled={deleteTierMutation.isPending}
                  >
                    {deleteTierMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                )}
              </div>
            </div>

            {tier.threshold === 0 && (
              <div className="mt-3 border-t pt-3">
                <p className="text-xs text-muted-foreground">
                  <Info className="mr-1 inline h-3 w-3" />
                  {t("baseTierInfo")}
                </p>
              </div>
            )}
            {tier.threshold > 0 && (
              <div className="mt-3 border-t pt-3">
                <p className="text-xs text-muted-foreground">
                  {t("tierReachInfo", {
                    points: tier.threshold.toLocaleString(),
                  })}
                </p>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
