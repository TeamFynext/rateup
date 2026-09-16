import { zodResolver } from "@hookform/resolvers/zod";
import { IconCoins } from "@tabler/icons-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import { Input } from "@/components/ui/input.tsx";
import { numberInputValue } from "@/utils/form.ts";

import { EarnRateField } from "../../earning-rules/parts/EarnRateField.tsx";
import { toFiniteNumber } from "../../giveback/calculateGiveback.ts";
import { EarningPreviewFromForm } from "../../giveback/StepGivebackPanels.tsx";
import type { GivebackContext } from "../givebackContext.ts";
import { earningFormSchema, type EarningFormInput, type EarningFormValues } from "../schemas.ts";
import {
  SectionHeading,
  StepFooter,
  StepHeader,
  StepLayout,
  useStepFooterProps,
  type StepMode,
} from "../StepChrome.tsx";

interface EarningStepProps {
  defaultValues: EarningFormInput;
  currencySymbol: string;
  pointsName: string;
  giveback: GivebackContext;
  isSaving: boolean;
  mode?: StepMode;
  onBack?: () => void;
  onCancel?: () => void;
  onSubmit: (values: EarningFormValues) => void;
  /** Section mode: extra content under the cost panel in the rail. */
  railExtra?: React.ReactNode;
  /** Where extra rules (weekends, minimum spend, time windows) are edited. */
  advancedEditorHref?: React.ReactNode;
}

/**
 * One rule: how many points a purchase earns. The form still carries every stored rule
 * in `rules[]` — only the default one is shown — so a save re-sends the others exactly
 * as they were. That is what keeps the Program page's `deleteMissing: true` harmless.
 */
export function EarningStep({
  defaultValues,
  currencySymbol,
  pointsName,
  giveback,
  isSaving,
  mode = "wizard",
  onBack,
  onCancel,
  onSubmit,
  railExtra,
  advancedEditorHref,
}: Readonly<EarningStepProps>) {
  const { t } = useTranslation();

  const form = useForm<EarningFormInput, unknown, EarningFormValues>({
    resolver: zodResolver(earningFormSchema),
    defaultValues,
  });

  const defaultIndex = Math.max(
    defaultValues.rules.findIndex((rule) => rule.isDefault),
    0,
  );
  const extras = defaultValues.rules.length - 1;
  const [showAov, setShowAov] = useState(
    defaultValues.averageOrderValue === null || defaultValues.averageOrderValue === undefined,
  );

  // The rate field and the cost panel say "earn 10 Beans"; follow what is being typed.
  const watchedPointsName = useWatch({ control: form.control, name: "currencyName" });
  const livePointsName = String(watchedPointsName ?? "").trim() || pointsName;

  const watchedAov = useWatch({ control: form.control, name: "averageOrderValue" });
  const liveAov =
    watchedAov === null || watchedAov === undefined || watchedAov === ""
      ? null
      : toFiniteNumber(watchedAov);
  const previewContext: GivebackContext = {
    ...giveback,
    averageOrderValue: liveAov,
    pointsName: livePointsName,
  };

  // The default rule IS the base rate, so a multiplier on it would only be the rate in
  // disguise; it is pinned to 1 on the way out.
  const submit = (values: EarningFormValues) =>
    onSubmit({
      ...values,
      rules: values.rules.map((rule) => (rule.isDefault ? { ...rule, multiplier: 1 } : rule)),
    });
  const footer = useStepFooterProps({ mode, isDirty: form.formState.isDirty, onBack, onCancel });

  const panel = (
    <EarningPreviewFromForm
      control={form.control}
      context={previewContext}
      onEditAverageOrderValue={() => setShowAov(true)}
      {...(mode === "section"
        ? { title: t("What customers earn"), hint: t("Updates as you edit") }
        : {})}
    />
  );

  return (
    <form className="flex flex-col gap-6" onSubmit={form.handleSubmit(submit)}>
      <StepHeader
        icon={<IconCoins />}
        tone="blue"
        title={t("How customers earn")}
        description={t(
          "One rule for every purchase. Keep it simple to start — bonus days and minimum spends can come later.",
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
        <Card className="border-border">
          <CardContent className="flex flex-col gap-5 p-4 sm:p-5">
            <SectionHeading
              icon={<IconCoins />}
              tone="blue"
              title={t("Every purchase")}
              description={t("Say it the way you would to a customer: spend this, earn that.")}
              action={
                extras > 0 ? (
                  <Badge variant="outline" className="shrink-0">
                    {t("{count} extra rules kept", { count: extras })}
                  </Badge>
                ) : undefined
              }
            />

            <Controller
              control={form.control}
              name="currencyName"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="max-w-xs">
                  <FieldLabel htmlFor={field.name} className="text-xs">
                    {t("What you call your points")}
                  </FieldLabel>
                  <Input
                    id={field.name}
                    className="h-9"
                    aria-invalid={fieldState.invalid}
                    placeholder={t("Points")}
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
              name={`rules.${defaultIndex}.pointsPerUnit`}
              render={({ field, fieldState }) => (
                <EarnRateField
                  id={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  currencySymbol={currencySymbol}
                  currencyCode={giveback.currencyCode}
                  pointsName={livePointsName}
                  averageOrderValue={liveAov}
                  invalid={fieldState.invalid}
                  error={fieldState.error}
                />
              )}
            />

            {showAov && (
              <Controller
                control={form.control}
                name="averageOrderValue"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="max-w-xs">
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
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={numberInputValue(field.value)}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    </InputGroup>
                    <FieldDescription className="text-xs">
                      {t(
                        "Roughly what one customer spends. It only drives the examples and the cost estimate — a rough figure is fine.",
                      )}
                    </FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            )}

            {extras > 0 && advancedEditorHref && (
              <p className="text-xs text-muted-foreground">
                {t("Weekend bonuses, minimum spends and time windows:")} {advancedEditorHref}
              </p>
            )}
          </CardContent>
        </Card>
      </StepLayout>

      <StepFooter isSaving={isSaving} {...footer} />
    </form>
  );
}
