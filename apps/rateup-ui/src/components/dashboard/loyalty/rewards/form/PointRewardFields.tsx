import { useState } from "react";
import { Controller, useWatch, type Control, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { LoyaltyTier } from "@/backend/loyalty/tier.api";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Field, FieldError, FieldLabel, FieldTitle } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

import { RewardWorthLine } from "../../giveback/RewardWorthLine.tsx";
import { useRewardEconomicsContext } from "../../giveback/useRewardEconomicsContext.ts";
import type { PointRewardFormValues, PointRewardValues } from "../schemas.ts";
import { ShopifyDiscountCard } from "../ShopifyDiscountCard.tsx";
import { FormSection, NumberField, RuleToggle, TextField, TierRestriction } from "./fields.tsx";

type PointForm = UseFormReturn<PointRewardFormValues, unknown, PointRewardValues>;

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export function PointRewardFields({
  form,
  tiers,
  pointsName,
}: Readonly<{ form: PointForm; tiers: readonly LoyaltyTier[]; pointsName: string }>) {
  const { t } = useTranslation();
  const { control, setValue, getValues } = form;
  const kind = useWatch({ control, name: "rewardType" });
  const shopifyEnabled = useWatch({ control, name: "shopifyDiscountEnabled" });
  const shopifyDays = useWatch({ control, name: "shopifyValidForDays" });

  const [spendOn, setSpendOn] = useState(() => !!getValues("minimumSpend"));
  const [timeOn, setTimeOn] = useState(
    () => !!(getValues("availableDays")?.length || getValues("timeFrom") || getValues("timeTo")),
  );

  const subtypes = [
    { value: "fixed-discount", label: t("Cash off") },
    { value: "percentage-discount", label: t("Percentage off") },
    { value: "free-item", label: t("Free item") },
    { value: "free-service", label: t("Free service") },
  ];
  const dayLabels: Record<(typeof DAYS)[number], string> = {
    monday: t("Monday"),
    tuesday: t("Tuesday"),
    wednesday: t("Wednesday"),
    thursday: t("Thursday"),
    friday: t("Friday"),
    saturday: t("Saturday"),
    sunday: t("Sunday"),
  };

  return (
    <div className="flex flex-col gap-5">
      <TextField
        control={control}
        name="name"
        label={t("Name")}
        placeholder={t("e.g. Free coffee, 20% off")}
      />
      <TextField
        control={control}
        name="description"
        label={t("Description")}
        placeholder={t("What the customer gets")}
        multiline
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="rewardType"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>{t("What they get")}</FieldLabel>
              <Select
                name={field.name}
                value={field.value}
                items={subtypes}
                onValueChange={(value) => field.onChange(value ?? "fixed-discount")}
              >
                <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subtypes.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <NumberField
          control={control}
          name="pointsCost"
          label={t("Cost in {points}", { points: pointsName })}
          placeholder="200"
          integer
        />
      </div>

      {kind === "fixed-discount" && (
        <NumberField
          control={control}
          name="cashbackAmount"
          label={t("Amount off")}
          description={t("Taken off the bill when the reward is used.")}
          placeholder="10"
        />
      )}
      {kind === "percentage-discount" && (
        <NumberField
          control={control}
          name="discountPercentage"
          label={t("Percentage off")}
          placeholder="10"
          max={100}
        />
      )}
      {(kind === "free-item" || kind === "free-service") && (
        <NumberField
          control={control}
          name="estimatedValue"
          label={t("What it normally sells for")}
          description={t("Used to show what the reward costs you.")}
          placeholder="25"
        />
      )}

      <PointRewardWorth control={control} />

      <TextField
        control={control}
        name="restrictions"
        label={t("Terms and conditions")}
        placeholder={t("Anything the customer should know before using it")}
        multiline
      />

      <FormSection title={t("Rules (optional)")}>
        <RuleToggle
          title={t("Minimum spend")}
          hint={t("Only usable on a bill of at least this much.")}
          checked={spendOn}
          onCheckedChange={(checked) => {
            setSpendOn(checked);
            if (!checked) setValue("minimumSpend", undefined, { shouldDirty: true });
          }}
        >
          <NumberField control={control} name="minimumSpend" label={t("Minimum bill")} />
        </RuleToggle>

        <RuleToggle
          title={t("Days and times")}
          hint={t("Only usable on certain days or hours.")}
          checked={timeOn}
          onCheckedChange={(checked) => {
            setTimeOn(checked);
            if (!checked) {
              setValue("availableDays", [], { shouldDirty: true });
              setValue("timeFrom", undefined, { shouldDirty: true });
              setValue("timeTo", undefined, { shouldDirty: true });
            }
          }}
        >
          <div className="flex flex-col gap-4">
            <Controller
              control={control}
              name="availableDays"
              render={({ field }) => (
                <Field>
                  <FieldTitle className="text-xs">{t("Days")}</FieldTitle>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {DAYS.map((day) => (
                      <Field key={day} orientation="horizontal" className="w-auto gap-2">
                        <Checkbox
                          id={`day-${day}`}
                          checked={field.value?.includes(day)}
                          onCheckedChange={(checked) =>
                            field.onChange(
                              checked
                                ? [...(field.value ?? []), day]
                                : (field.value ?? []).filter((d) => d !== day),
                            )
                          }
                        />
                        <FieldLabel
                          htmlFor={`day-${day}`}
                          className="cursor-pointer text-sm font-normal"
                        >
                          {dayLabels[day]}
                        </FieldLabel>
                      </Field>
                    ))}
                  </div>
                </Field>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TimeField control={control} name="timeFrom" label={t("From")} />
              <TimeField control={control} name="timeTo" label={t("Until")} />
            </div>
          </div>
        </RuleToggle>

        <ShopifyDiscountCard
          enabled={!!shopifyEnabled}
          onEnabledChange={(checked) =>
            setValue("shopifyDiscountEnabled", checked, { shouldDirty: true })
          }
          validForDays={shopifyDays}
          onValidForDaysChange={(days) =>
            setValue("shopifyValidForDays", days, { shouldDirty: true })
          }
          supported={kind === "fixed-discount" || kind === "percentage-discount"}
        />

        <Controller
          control={control}
          name="tierIds"
          render={({ field }) => (
            <TierRestriction tiers={tiers} value={field.value} onChange={field.onChange} />
          )}
        />
      </FormSection>
    </div>
  );
}

function TimeField({
  control,
  name,
  label,
}: Readonly<{
  control: Control<PointRewardFormValues, unknown, PointRewardValues>;
  name: "timeFrom" | "timeTo";
  label: string;
}>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field>
          <FieldLabel htmlFor={field.name} className="text-xs">
            {label}
          </FieldLabel>
          <Input id={field.name} type="time" {...field} value={field.value ?? ""} />
        </Field>
      )}
    />
  );
}

/**
 * What this reward is worth against its cost, live. Its own component so a keystroke
 * re-renders this line and not the whole form.
 */
function PointRewardWorth({
  control,
}: Readonly<{ control: Control<PointRewardFormValues, unknown, PointRewardValues> }>) {
  const economics = useRewardEconomicsContext();
  const [rewardType, pointsCost, cashbackAmount, discountPercentage, estimatedValue] = useWatch({
    control,
    name: ["rewardType", "pointsCost", "cashbackAmount", "discountPercentage", "estimatedValue"],
  });

  return (
    <RewardWorthLine
      rewardValue={{ rewardType, cashbackAmount, discountPercentage, estimatedValue }}
      pointsCost={Number(pointsCost) || 0}
      earnRate={economics.earnRate}
      averageOrderValue={economics.averageOrderValue}
      currencySymbol={economics.currencySymbol}
      currencyCode={economics.currencyCode}
    />
  );
}
