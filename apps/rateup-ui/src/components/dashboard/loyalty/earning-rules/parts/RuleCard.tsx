// Extracted verbatim from `EarningRulesPage.tsx`. Behaviour is unchanged.

import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, Clock, Edit2, Loader2, Save, Trash2, X } from "lucide-react";
import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type {
  LoyaltyEarningRule,
  LoyaltyEarningRuleInput,
} from "@/backend/loyalty/earningRules.api";
import {
  useToggleLoyaltyEarningRuleStatusMutation,
  useUpdateLoyaltyEarningRuleMutation,
} from "@/backend/loyalty/earningRules.query";
import { useLoyaltyTiers } from "@/backend/loyalty/tiers.query";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Field, FieldError, FieldLabel, FieldTitle } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";

import { earningRuleSchema, formatStatusLabel, getRuleIcon, toDateInputValue } from "./shared.tsx";
import type { EarningRuleFormValues } from "./shared.tsx";

export function RuleCard({
  rule,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onDelete,
  isDeleting,
}: Readonly<{
  rule: LoyaltyEarningRule;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}>) {
  const uid = useId();
  const { t } = useTranslation();
  const { data: loyaltyTiers = [] } = useLoyaltyTiers();
  const ruleForm = useForm<EarningRuleFormValues>({
    resolver: zodResolver(earningRuleSchema),
    defaultValues: {
      name: rule.name || "",
      description: rule.description || "",
      priority: rule.priority || 10,
      status: rule.status || "inactive",
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

  const updateRuleMutation = useUpdateLoyaltyEarningRuleMutation(rule.id || "", () => {
    toast.success(t("Earning rule updated successfully"));
  });

  const toggleStatusMutation = useToggleLoyaltyEarningRuleStatusMutation(rule.id || "");

  const isEnabled = rule.status === "active";
  const [scheduleEnabled, setScheduleEnabled] = useState(
    (rule.allowedDays?.length || 0) > 0 || (rule.allowedTimeRanges?.length || 0) > 0,
  );
  const [tierRestrictionEnabled, setTierRestrictionEnabled] = useState(
    (rule.applicableToTiers?.length || 0) > 0,
  );
  const [limitedPeriodEnabled, setLimitedPeriodEnabled] = useState(
    !!(rule.validFrom || rule.validUntil),
  );

  const onSave = (values: EarningRuleFormValues) => {
    const { timeFrom, timeTo, allowedDays, applicableToTiers, ...rest } = values;
    const payload = {
      ...rest,
      allowedDays: scheduleEnabled ? (allowedDays ?? []) : [],
      allowedTimeRanges:
        scheduleEnabled && (timeFrom || timeTo)
          ? [{ start: timeFrom || "00:00", end: timeTo || "23:59" }]
          : [],
      applicableToTiers: tierRestrictionEnabled ? (applicableToTiers ?? []) : [],
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
                <h4 className="text-sm font-medium leading-tight">{rule.name}</h4>
                <p className="truncate text-xs text-muted-foreground">
                  {rule.description || t("No description provided")}
                </p>
              </div>
            </div>

            {/* Compact Stats */}
            <div className="flex shrink-0 items-center gap-2">
              {rule.multiplier && rule.multiplier !== 1.0 && (
                <div className="rounded border border-purple-200 bg-purple-50 px-2 py-1">
                  <p className="text-xs font-medium text-purple-700">{rule.multiplier}x</p>
                </div>
              )}
              {rule.bonusPoints && rule.bonusPoints !== 0 && (
                <div className="rounded border border-blue-200 bg-blue-50 px-2 py-1">
                  <p className="text-xs font-medium text-[#1873E8]">+{rule.bonusPoints}</p>
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
                    {rule.validFrom ? new Date(rule.validFrom).toLocaleDateString() : t("Start")}
                    {" - "}
                    {rule.validUntil ? new Date(rule.validUntil).toLocaleDateString() : t("End")}
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
              <Controller
                control={ruleForm.control}
                name="name"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name} className="text-xs">
                      {t("Rule Name")}
                    </FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                      className="mt-1 h-9"
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <div className="col-span-2">
              <Controller
                control={ruleForm.control}
                name="description"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name} className="text-xs">
                      {t("Define how customers earn points through purchases and activities")}
                    </FieldLabel>
                    <Textarea
                      {...field}
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                      className="mt-1 text-sm"
                      rows={2}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <Controller
              control={ruleForm.control}
              name="multiplier"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name} className="text-xs">
                    {t("Multiplier")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    value={field.value as number}
                    step="0.1"
                    className="mt-1 h-9"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              control={ruleForm.control}
              name="bonusPoints"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name} className="text-xs">
                    {t("Bonus Points")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    value={field.value as number}
                    className="mt-1 h-9"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              control={ruleForm.control}
              name="validFrom"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name} className="text-xs">
                    Valid From
                  </FieldLabel>
                  <Input
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    type="date"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    className="mt-1 h-9"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              control={ruleForm.control}
              name="validUntil"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name} className="text-xs">
                    Valid To
                  </FieldLabel>
                  <Input
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    type="date"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    className="mt-1 h-9"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>

          <div className="space-y-3 border-t pt-3">
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Specific Days/Times</p>
                  <p className="text-xs text-muted-foreground">E.g., Weekends, Happy Hours</p>
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
                  <Controller
                    control={ruleForm.control}
                    name="allowedDays"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldTitle className="text-xs">Available Days</FieldTitle>
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
                            <Field key={day} orientation="horizontal" className="w-auto gap-2">
                              <Checkbox
                                id={`edit-day-${rule.id}-${day}`}
                                checked={field.value?.includes(day)}
                                onCheckedChange={(checked) => {
                                  const updated = checked
                                    ? [...(field.value || []), day]
                                    : (field.value || []).filter((d) => d !== day);
                                  field.onChange(updated);
                                }}
                              />
                              <FieldLabel
                                htmlFor={`edit-day-${rule.id}-${day}`}
                                className="cursor-pointer text-xs font-normal capitalize"
                              >
                                {day.charAt(0) + day.slice(1).toLowerCase()}
                              </FieldLabel>
                            </Field>
                          ))}
                        </div>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Controller
                      control={ruleForm.control}
                      name="timeFrom"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name} className="text-xs">
                            Start Time
                          </FieldLabel>
                          <Input
                            id={field.name}
                            aria-invalid={fieldState.invalid}
                            type="time"
                            {...field}
                            value={field.value ?? ""}
                            className="mt-1 h-9"
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      control={ruleForm.control}
                      name="timeTo"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name} className="text-xs">
                            End Time
                          </FieldLabel>
                          <Input
                            id={field.name}
                            aria-invalid={fieldState.invalid}
                            type="time"
                            {...field}
                            value={field.value ?? ""}
                            className="mt-1 h-9"
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Customer Tier Restriction</p>
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
                <Controller
                  control={ruleForm.control}
                  name="applicableToTiers"
                  render={({ field, fieldState }) => (
                    <Field className="border-t pt-3" data-invalid={fieldState.invalid}>
                      <FieldTitle className="text-xs">Applicable Tiers</FieldTitle>
                      <div className="space-y-2">
                        {loyaltyTiers.map((tier) => (
                          <Field key={tier.id} orientation="horizontal" className="w-auto gap-2">
                            <Checkbox
                              id={`edit-tier-${rule.id}-${tier.id}`}
                              checked={field.value?.includes(tier.id)}
                              onCheckedChange={(checked) => {
                                const updated = checked
                                  ? [...(field.value || []), tier.id]
                                  : (field.value || []).filter((t) => t !== tier.id);
                                field.onChange(updated);
                              }}
                            />
                            <FieldLabel
                              htmlFor={`edit-tier-${rule.id}-${tier.id}`}
                              className="flex cursor-pointer items-center gap-2 text-xs font-normal"
                            >
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: tier.color }}
                              />
                              {tier.name}
                            </FieldLabel>
                          </Field>
                        ))}
                      </div>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
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
                  <Controller
                    control={ruleForm.control}
                    name="validFrom"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name} className="text-xs">
                          Valid From
                        </FieldLabel>
                        <Input
                          id={field.name}
                          aria-invalid={fieldState.invalid}
                          type="date"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          className="mt-1 h-9"
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                  <Controller
                    control={ruleForm.control}
                    name="validUntil"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name} className="text-xs">
                          Valid To
                        </FieldLabel>
                        <Input
                          id={field.name}
                          aria-invalid={fieldState.invalid}
                          type="date"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          className="mt-1 h-9"
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <div className="flex items-center gap-2">
              <FieldLabel htmlFor={`${uid}-enable-rule`} className="text-xs">
                Enable Rule
              </FieldLabel>
              <Switch
                id={`${uid}-enable-rule`}
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
      </CardContent>
    </Card>
  );
}
