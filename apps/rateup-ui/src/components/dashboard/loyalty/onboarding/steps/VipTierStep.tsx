import { zodResolver } from "@hookform/resolvers/zod";
import { IconCrown, IconPlus, IconTrash, IconUser } from "@tabler/icons-react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { SavedOnboardingData } from "@/backend/loyalty/onboarding.api";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { numberInputValue } from "@/utils/form.ts";

import { readableTextOn } from "../brand.ts";
import { BrandColorField } from "../parts/BrandColorField.tsx";
import { VipLadderPreview } from "../parts/VipLadderPreview.tsx";
import { newUpperTier } from "../programDefaults.ts";
import {
  UPPER_TIERS_MAX,
  VIP_WINDOW_MAX_MONTHS,
  vipTierFormSchema,
  type VipTierFormInput,
  type VipTierFormValues,
} from "../schemas.ts";
import {
  SectionHeading,
  StepFooter,
  StepHeader,
  StepLayout,
  useStepFooterProps,
  type StepMode,
} from "../StepChrome.tsx";

/** Tier colours a merchant can pick from — the same brand-safe set, amber first for VIP. */
const TIER_SWATCHES = [
  "#f8951d",
  "#db7a0b",
  "#0f2540",
  "#1c518e",
  "#2e68a8",
  "#5a8cc6",
  "#1fa85b",
  "#434a55",
] as const;

interface VipTierStepProps {
  defaultValues: VipTierFormInput;
  currencySymbol: string;
  currencyCode: string;
  isSaving: boolean;
  mode?: StepMode;
  onBack?: () => void;
  onCancel?: () => void;
  onSubmit: (values: VipTierFormValues) => void;
  railExtra?: React.ReactNode;
  /** Members per tier, keyed by tier id — shown so removing a tier is an informed act. */
  memberCounts?: ReadonlyMap<string, number>;
  /**
   * Section mode: the ladder as stored. With more than three rungs this form would delete
   * tiers on save, so it steps aside and shows them read-only instead.
   */
  savedTiers?: SavedOnboardingData["tiers"];
  /** Where a ladder with more than three tiers is edited. */
  advancedEditorHref?: React.ReactNode;
}

/**
 * Up to two tiers above the base — three in all. Each upper tier gets perks and, if the
 * merchant wants, a faster earn rate (1× by default); the top one gates the VIP-only
 * rewards. Thresholds are spend within a trailing window — "spend ₹5,000 in 6 months" — or
 * lifetime spend when the slider sits at 0. Saving re-places every member on the new
 * ladder, so a raised threshold demotes and a lowered one promotes.
 */
export function VipTierStep({
  defaultValues,
  currencySymbol,
  currencyCode,
  isSaving,
  mode = "wizard",
  onBack,
  onCancel,
  onSubmit,
  railExtra,
  memberCounts,
  savedTiers = [],
  advancedEditorHref,
}: Readonly<VipTierStepProps>) {
  const { t } = useTranslation();

  const form = useForm<VipTierFormInput, unknown, VipTierFormValues>({
    resolver: zodResolver(vipTierFormSchema),
    defaultValues,
  });

  const tiersEnabled = form.watch("tiersEnabled");
  const baseColour = form.watch("base.color");
  const footer = useStepFooterProps({ mode, isDirty: form.formState.isDirty, onBack, onCancel });

  const upper = useFieldArray({ control: form.control, name: "upper", keyName: "fieldKey" });
  const watchedUpper = useWatch({ control: form.control, name: "upper" });
  const canAdd = upper.fields.length < UPPER_TIERS_MAX;
  const canRemove = upper.fields.length > 1;
  const addTier = () => {
    const thresholds = (watchedUpper ?? []).map((tier) => Number(tier?.threshold) || 0);
    upper.append(newUpperTier(Math.max(0, ...thresholds), upper.fields.length));
  };

  /** The slider's value read back as a sentence — 0 is lifetime, not "0 months". */
  const windowLabel = (months: number) =>
    months === 0
      ? t("Lifetime spend")
      : months === 1
        ? t("Within 1 month")
        : t("Within {count} months", { count: months });

  const tooManyTiers = mode === "section" && savedTiers.length > UPPER_TIERS_MAX + 1;
  const members = (id: string | undefined) => (id ? memberCounts?.get(id) : undefined);

  const panel = (
    <VipLadderPreview
      control={form.control}
      currencySymbol={currencySymbol}
      currencyCode={currencyCode}
      {...(mode === "section" ? { hint: t("Updates as you edit") } : {})}
    />
  );

  if (tooManyTiers) {
    return (
      <div className="flex flex-col gap-6">
        <StepHeader
          icon={<IconCrown />}
          tone="amber"
          title={t("Tiers")}
          description={t(
            "This programme runs more than three tiers, so it is edited in the full editor.",
          )}
        />
        <Card className="border-border">
          <CardContent className="flex flex-col gap-3 p-4">
            {[...savedTiers]
              .sort((a, b) => Number(a.threshold) - Number(b.threshold))
              .map((tier) => (
                <div key={tier.id} className="flex items-center gap-3 text-sm">
                  <span
                    aria-hidden
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: tier.color }}
                  />
                  <span className="font-medium text-foreground">{tier.name}</span>
                  <span className="text-muted-foreground">
                    {t("from {amount}", { amount: `${currencySymbol}${Number(tier.threshold)}` })}
                  </span>
                  {members(tier.id) !== undefined && (
                    <Badge variant="outline" className="ml-auto">
                      {t("{count} members", { count: members(tier.id) })}
                    </Badge>
                  )}
                </div>
              ))}
            {advancedEditorHref && (
              <p className="text-xs text-muted-foreground">{advancedEditorHref}</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={form.handleSubmit(onSubmit)}>
      <StepHeader
        icon={<IconCrown />}
        tone="amber"
        title={t("Tiers")}
        description={t(
          "Everyone joins as a Member. Your best customers climb by spending enough in a set time, unlocking perks and VIP-only rewards — up to three tiers in all.",
        )}
      />

      <StepLayout
        mode={mode}
        aside={
          <>
            {panel}
            {railExtra}
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Controller
            control={form.control}
            name="tiersEnabled"
            render={({ field }) => (
              <Card className="border-border">
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("Offer tiers")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("Off, and everyone is simply a Member earning the same rate.")}
                    </p>
                  </div>
                  <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
                </CardContent>
              </Card>
            )}
          />

          {/* ── Base tier: fixed, only the name and colour are editable ── */}
          <Card className="border-border bg-muted/30">
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-full"
                style={{
                  backgroundColor: typeof baseColour === "string" ? baseColour : "#5a8cc6",
                  color: readableTextOn(typeof baseColour === "string" ? baseColour : "#5a8cc6"),
                }}
              >
                <IconUser size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <Controller
                  control={form.control}
                  name="base.name"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="max-w-xs">
                      <FieldLabel htmlFor={field.name} className="text-xs">
                        {t("Everyone starts as")}
                      </FieldLabel>
                      <Input id={field.name} className="h-8 bg-background" {...field} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>
              <Controller
                control={form.control}
                name="base.color"
                render={({ field }) => (
                  <BrandColorField
                    id={field.name}
                    label={t("Colour")}
                    compact
                    swatches={TIER_SWATCHES}
                    value={String(field.value ?? "")}
                    onChange={field.onChange}
                  />
                )}
              />
              {members(defaultValues.base.id) !== undefined && (
                <p className="w-full text-xs text-muted-foreground">
                  {t("{count} members sit in this tier.", {
                    count: members(defaultValues.base.id),
                  })}
                </p>
              )}
            </CardContent>
          </Card>

          {/* ── Tiers above the base ── */}
          {tiersEnabled &&
            upper.fields.map((row, index) => {
              const savedId = watchedUpper?.[index]?.id;
              const count = members(typeof savedId === "string" ? savedId : undefined);
              return (
                <Card
                  key={row.fieldKey}
                  className="border-ru-amber-200 dark:border-ru-amber-700/40"
                >
                  <CardContent className="flex flex-col gap-5 p-4 sm:p-5">
                    <SectionHeading
                      icon={<IconCrown />}
                      tone="amber"
                      title={t("Tier {n}", { n: index + 2 })}
                      description={
                        index === upper.fields.length - 1
                          ? t(
                              "The top tier: perks, VIP-only rewards, and a faster rate if you want one.",
                            )
                          : t("Perks and, if you want, a faster earn rate.")
                      }
                      action={
                        <div className="flex items-center gap-2">
                          {count !== undefined && (
                            <Badge variant="outline">{t("{count} members", { count })}</Badge>
                          )}
                          {canRemove && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={t("Remove this tier")}
                              title={
                                count
                                  ? t("Members are re-placed by their spend when you save.")
                                  : undefined
                              }
                              onClick={() => upper.remove(index)}
                            >
                              <IconTrash size={16} />
                            </Button>
                          )}
                        </div>
                      }
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Controller
                        control={form.control}
                        name={`upper.${index}.name`}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={field.name} className="text-xs">
                              {t("Tier name")}
                            </FieldLabel>
                            <Input id={field.name} className="h-9" {...field} />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />

                      <Controller
                        control={form.control}
                        name={`upper.${index}.color`}
                        render={({ field, fieldState }) => (
                          <BrandColorField
                            id={field.name}
                            label={t("Colour")}
                            compact
                            swatches={TIER_SWATCHES}
                            value={String(field.value ?? "")}
                            onChange={field.onChange}
                            invalid={fieldState.invalid}
                            error={fieldState.error}
                          />
                        )}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Controller
                        control={form.control}
                        name={`upper.${index}.threshold`}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={field.name} className="text-xs">
                              {t("Spend to reach it")}
                            </FieldLabel>
                            <InputGroup data-invalid={fieldState.invalid}>
                              <InputGroupAddon>{currencySymbol}</InputGroupAddon>
                              <InputGroupInput
                                id={field.name}
                                type="number"
                                min={1}
                                step="1"
                                aria-invalid={fieldState.invalid}
                                {...field}
                                value={numberInputValue(field.value)}
                              />
                            </InputGroup>
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />

                      <Controller
                        control={form.control}
                        name={`upper.${index}.pointsMultiplier`}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={field.name} className="text-xs">
                              {t("Points multiplier")}
                            </FieldLabel>
                            <InputGroup data-invalid={fieldState.invalid}>
                              <InputGroupInput
                                id={field.name}
                                type="number"
                                min={1}
                                max={10}
                                step="any"
                                aria-invalid={fieldState.invalid}
                                {...field}
                                value={numberInputValue(field.value)}
                              />
                              <InputGroupAddon align="inline-end">×</InputGroupAddon>
                            </InputGroup>
                            <FieldDescription className="text-xs">
                              {t(
                                "1 = the same rate as everyone; 1.5 = half again on every purchase.",
                              )}
                            </FieldDescription>
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                    </div>

                    <Controller
                      control={form.control}
                      name={`upper.${index}.benefitsDescription`}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name} className="text-xs">
                            {t("Perks")}
                          </FieldLabel>
                          <Textarea
                            id={field.name}
                            rows={3}
                            placeholder={t(
                              "Priority booking, birthday double points, a free dessert on us…",
                            )}
                            aria-invalid={fieldState.invalid}
                            {...field}
                            value={field.value ?? ""}
                          />
                          <FieldDescription className="text-xs">
                            {t(
                              "One per line. Shown to customers when they reach this tier and on the join page.",
                            )}
                          </FieldDescription>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  </CardContent>
                </Card>
              );
            })}

          {tiersEnabled && (
            <div className="flex flex-col gap-3">
              {canAdd ? (
                <Button type="button" variant="outline" className="self-start" onClick={addTier}>
                  <IconPlus size={16} />
                  {t("Add a tier above")}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t("Three tiers is the most this programme can run.")}
                </p>
              )}
              {form.formState.errors.upper?.root && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.upper.root.message}
                </p>
              )}
              {typeof form.formState.errors.upper?.message === "string" && (
                <p className="text-xs text-destructive">{form.formState.errors.upper.message}</p>
              )}
            </div>
          )}

          {/* ── The window: one for the whole ladder ── */}
          {tiersEnabled && (
            <Card className="border-border">
              <CardContent className="p-4 sm:p-5">
                <Controller
                  control={form.control}
                  name="qualificationWindowMonths"
                  render={({ field, fieldState }) => {
                    const months = typeof field.value === "number" ? field.value : 12;
                    return (
                      <Field data-invalid={fieldState.invalid}>
                        <div className="flex items-baseline justify-between gap-3">
                          <FieldLabel htmlFor={field.name} className="text-xs">
                            {t("Spend counted within")}
                          </FieldLabel>
                          <span className="text-sm font-medium text-foreground">
                            {windowLabel(months)}
                          </span>
                        </div>
                        <Slider
                          id={field.name}
                          name={field.name}
                          min={0}
                          max={VIP_WINDOW_MAX_MONTHS}
                          step={1}
                          value={[months]}
                          onValueChange={(value) =>
                            field.onChange(Array.isArray(value) ? value[0] : value)
                          }
                          onBlur={field.onBlur}
                          aria-label={t("Months of spend that count towards a tier")}
                          className="py-2"
                        />
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>{t("Lifetime")}</span>
                          <span>{t("{count} months", { count: VIP_WINDOW_MAX_MONTHS })}</span>
                        </div>
                        <FieldDescription className="text-xs">
                          {months === 0
                            ? t(
                                "All spend ever counts. Once a customer reaches a tier, they keep it.",
                              )
                            : t(
                                "Rolling: only the last {count} months of spend count, checked nightly — so a tier has to be kept up.",
                                { count: months },
                              )}
                        </FieldDescription>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    );
                  }}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </StepLayout>

      <StepFooter isSaving={isSaving} {...footer} />
    </form>
  );
}
