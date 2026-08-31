import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { LoyaltyPreset, LoyaltyPresetKey } from "@/backend/loyalty/onboarding.api";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { CurrencySelect } from "@/components/ui/currency-select.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import { Input } from "@/components/ui/input.tsx";
import { cn } from "@/lib/utils.ts";
import { numberInputValue } from "@/utils/form.ts";

import { basicsFormSchema, type BasicsFormInput, type BasicsFormValues } from "../schemas.ts";

interface BusinessTypeStepProps {
  presets: LoyaltyPreset[];
  selectedKey: LoyaltyPresetKey;
  onSelectPreset: (key: LoyaltyPresetKey) => void;
  defaultValues: BasicsFormInput;
  isSaving: boolean;
  onSubmit: (values: BasicsFormValues) => void;
}

export function BusinessTypeStep({
  presets,
  selectedKey,
  onSelectPreset,
  defaultValues,
  isSaving,
  onSubmit,
}: Readonly<BusinessTypeStepProps>) {
  const { t } = useTranslation();

  const form = useForm<BasicsFormInput, unknown, BasicsFormValues>({
    resolver: zodResolver(basicsFormSchema),
    defaultValues,
  });

  // The symbol lives in its own field (kept in step with the code by the currency select
  // above), so the prefix on the spend input has to follow it rather than the code.
  const currencySymbol = useWatch({ control: form.control, name: "currencySymbol" });

  const { reset } = form;

  // Switching packs replaces the suggested values. `reset` rather than an effect that
  // copies query data into state: the pack is the source of truth until the user edits.
  useEffect(() => {
    reset(defaultValues);
  }, [reset, selectedKey]);

  return (
    <form className="flex flex-col gap-8" onSubmit={form.handleSubmit(onSubmit)}>
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {t("What kind of business is this?")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(
              "We'll suggest points, tiers, rewards and messages that suit it. You can change every one of them.",
            )}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {presets.map((preset) => {
            const isSelected = preset.key === selectedKey;

            return (
              <Card
                key={preset.key}
                className={cn(
                  "cursor-pointer border transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40",
                )}
              >
                <CardContent className="p-0">
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onSelectPreset(preset.key)}
                    className="flex h-full w-full flex-col gap-1 p-4 text-left"
                  >
                    <span className="text-sm font-semibold text-foreground">{t(preset.label)}</span>
                    <span className="text-xs leading-relaxed text-muted-foreground">
                      {t(preset.description)}
                    </span>
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("Program basics")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("What customers will see, and what they get for signing up.")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name} className="text-xs">
                  {t("Program name")}
                </FieldLabel>
                <Input
                  id={field.name}
                  className="h-9"
                  aria-invalid={fieldState.invalid}
                  {...field}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="currencyName"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name} className="text-xs">
                  {t("What you call your points")}
                </FieldLabel>
                <Input
                  id={field.name}
                  className="h-9"
                  aria-invalid={fieldState.invalid}
                  {...field}
                />
                <FieldDescription className="text-xs">
                  {t('e.g. "Points", "Stars", "Beans"')}
                </FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="currencyCode"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name} className="text-xs">
                  {t("Currency")}
                </FieldLabel>
                <CurrencySelect
                  name={field.name}
                  value={field.value}
                  onValueChange={field.onChange}
                  // The symbol is a separate column, so it has to be kept in step with
                  // the code rather than derived at render time.
                  onCurrencySelect={(currency) =>
                    form.setValue("currencySymbol", currency.symbol ?? currency.code)
                  }
                  placeholder={t("Select currency")}
                  currencies="all"
                />
                <FieldDescription className="text-xs">
                  {t(
                    "Tier thresholds and reward costs below are in this currency — they are not converted if you change it.",
                  )}
                </FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="averageOrderValue"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name} className="text-xs">
                  {t("Typical spend in one visit")}
                </FieldLabel>
                <InputGroup data-invalid={fieldState.invalid}>
                  <InputGroupAddon>{currencySymbol}</InputGroupAddon>
                  <InputGroupInput
                    id={field.name}
                    type="number"
                    min={0}
                    step="1"
                    aria-invalid={fieldState.invalid}
                    {...field}
                    value={numberInputValue(field.value)}
                  />
                </InputGroup>
                <FieldDescription className="text-xs">
                  {t(
                    "Roughly what one customer spends. We use it to show what your program gives back as a share of revenue — a rough figure is fine.",
                  )}
                </FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <BonusField control={form.control} name="signupBonus" label={t("Points for joining")} />
          <BonusField
            control={form.control}
            name="referralBonus"
            label={t("Points for referring a friend")}
          />
          <BonusField
            control={form.control}
            name="refereeBonus"
            label={t("Points for the friend who joins")}
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? t("Saving…") : t("Continue")}
        </Button>
      </div>
    </form>
  );
}

/**
 * The three bonus inputs differ only by field. Mapping over them inline widens `name` to
 * a union, which erases the per-field value type — hence a component with one concrete
 * name per call site.
 */
function BonusField({
  control,
  name,
  label,
}: Readonly<{
  control: Control<BasicsFormInput>;
  name: "signupBonus" | "referralBonus" | "refereeBonus";
  label: string;
}>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={field.name} className="text-xs">
            {label}
          </FieldLabel>
          <Input
            id={field.name}
            type="number"
            min={0}
            className="h-9"
            aria-invalid={fieldState.invalid}
            {...field}
            value={numberInputValue(field.value)}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
