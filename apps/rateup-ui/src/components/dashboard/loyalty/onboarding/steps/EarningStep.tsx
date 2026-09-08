import { zodResolver } from "@hookform/resolvers/zod";
import { IconChevronRight, IconPlus, IconTrash } from "@tabler/icons-react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { cn } from "@/lib/utils.ts";
import { numberInputValue } from "@/utils/form.ts";

import { EarnRateField } from "../../earning-rules/parts/EarnRateField.tsx";
import { EarningPreviewFromForm } from "../../giveback/StepGivebackPanels.tsx";
import type { GivebackContext } from "../givebackContext.ts";
import { earningFormSchema, type EarningFormInput, type EarningFormValues } from "../schemas.ts";
import {
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
  onEditAverageOrderValue: () => void;
  onSubmit: (values: EarningFormValues) => void;
  /** Section mode: extra content under the cost panel in the rail. */
  railExtra?: React.ReactNode;
  /** Where the fields this form does not carry (dates, times, tier restriction) are edited. */
  advancedEditorHref?: React.ReactNode;
}

/** Day codes as the API stores them, Monday first. */
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export function EarningStep({
  defaultValues,
  currencySymbol,
  pointsName,
  giveback,
  isSaving,
  mode = "wizard",
  onBack,
  onCancel,
  onEditAverageOrderValue,
  onSubmit,
  railExtra,
  advancedEditorHref,
}: Readonly<EarningStepProps>) {
  const { t } = useTranslation();

  const form = useForm<EarningFormInput, unknown, EarningFormValues>({
    resolver: zodResolver(earningFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "rules" });
  const rulesError = form.formState.errors.rules;

  // The default rule IS the base rate, so a multiplier on it would only be the rate in
  // disguise; it is hidden for that rule and pinned to 1 on the way out.
  const submit = (values: EarningFormValues) =>
    onSubmit({
      ...values,
      rules: values.rules.map((rule) => (rule.isDefault ? { ...rule, multiplier: 1 } : rule)),
    });
  const footer = useStepFooterProps({ mode, isDirty: form.formState.isDirty, onBack, onCancel });

  const addRule = () => {
    const index = fields.length;
    append({
      name: "",
      description: "",
      status: "active",
      pointsPerUnit: giveback.earnRate.pointsPerUnit,
      multiplier: 2,
      bonusPoints: 0,
      allowedDays: [],
      applicableToTiers: [],
      isDefault: false,
      priority: index,
    });
    window.setTimeout(() => form.setFocus(`rules.${index}.name`), 0);
  };

  // What a purchase earns — not what it costs: the giveback percentage needs rewards to
  // value the points against, and those come two steps later.
  const panel = (
    <EarningPreviewFromForm
      control={form.control}
      context={giveback}
      onEditAverageOrderValue={onEditAverageOrderValue}
      {...(mode === "section"
        ? { title: t("What customers earn"), hint: t("Updates as you edit") }
        : {})}
    />
  );

  return (
    <form className="flex flex-col gap-6" onSubmit={form.handleSubmit(submit)}>
      <StepHeader
        title={t("How customers earn points")}
        description={t(
          "The default rule applies to every purchase. An extra rule takes over from it while its conditions match — only one rule ever applies to a sale.",
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
        <div className="flex flex-col gap-3">
          {fields.map((item, index) => {
            const isDefault = Boolean(form.watch(`rules.${index}.isDefault`));
            const status = form.watch(`rules.${index}.status`);
            const off = status === "inactive";

            return (
              <Card key={item.id} className={cn("border-border", off && "bg-muted/40")}>
                <CardContent className="flex flex-col gap-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Controller
                      control={form.control}
                      name={`rules.${index}.name`}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="flex-1">
                          <FieldLabel htmlFor={field.name} className="text-xs">
                            {t("Rule name")}
                          </FieldLabel>
                          <Input id={field.name} className="h-9" {...field} />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <div className="flex shrink-0 items-center gap-2 pt-6">
                      {isDefault ? (
                        <Badge variant="secondary">{t("Default")}</Badge>
                      ) : (
                        <>
                          {off && <Badge variant="outline">{t("Off")}</Badge>}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={t("Remove rule")}
                            onClick={() => remove(index)}
                          >
                            <IconTrash size={16} />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <Controller
                    control={form.control}
                    name={`rules.${index}.pointsPerUnit`}
                    render={({ field, fieldState }) => (
                      <EarnRateField
                        id={field.name}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        currencySymbol={currencySymbol}
                        currencyCode={giveback.currencyCode}
                        pointsName={pointsName}
                        averageOrderValue={giveback.averageOrderValue}
                        label={
                          isDefault
                            ? t("How customers earn")
                            : t("Earn rate while this rule applies")
                        }
                        description={
                          isDefault
                            ? undefined
                            : t("Replaces the default rate, it does not add to it.")
                        }
                        invalid={fieldState.invalid}
                        error={fieldState.error}
                      />
                    )}
                  />

                  <div
                    className={cn("grid gap-4", isDefault ? "sm:grid-cols-1" : "sm:grid-cols-2")}
                  >
                    {!isDefault && (
                      <Controller
                        control={form.control}
                        name={`rules.${index}.multiplier`}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={field.name} className="text-xs">
                              {t("Multiplier")}
                            </FieldLabel>
                            <Input
                              id={field.name}
                              type="number"
                              min={0}
                              step="0.25"
                              className="h-9"
                              {...field}
                              value={numberInputValue(field.value)}
                            />
                            <FieldDescription className="text-xs">
                              {t("On top of the rate above — 2 doubles it.")}
                            </FieldDescription>
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                    )}

                    <Controller
                      control={form.control}
                      name={`rules.${index}.bonusPoints`}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name} className="text-xs">
                            {t("Flat bonus per transaction")}
                          </FieldLabel>
                          <Input
                            id={field.name}
                            type="number"
                            min={0}
                            className="h-9"
                            {...field}
                            value={numberInputValue(field.value)}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  </div>

                  <RuleAdvanced
                    index={index}
                    form={form}
                    isDefault={isDefault}
                    currencySymbol={currencySymbol}
                    advancedEditorHref={advancedEditorHref}
                  />
                </CardContent>
              </Card>
            );
          })}

          {rulesError?.root?.message && (
            <p className="text-xs text-destructive">{rulesError.root.message}</p>
          )}
          {typeof rulesError?.message === "string" && (
            <p className="text-xs text-destructive">{rulesError.message}</p>
          )}

          <Button type="button" variant="outline" className="self-start" onClick={addRule}>
            <IconPlus size={16} />
            {t("Add rule")}
          </Button>
          <FieldDescription className="-mt-2 text-xs">
            {t("Extra rules replace the base rule while their conditions match.")}
          </FieldDescription>
        </div>
      </StepLayout>

      <StepFooter isSaving={isSaving} {...footer} />
    </form>
  );
}

/**
 * The paperwork behind a rule — on/off, days, minimum spend, priority — folded away so the
 * card keeps the one sentence a merchant reads out loud. Fields this form does not carry
 * yet (dates, time ranges, a tier restriction) are one link away in the full editor; the
 * API leaves them exactly as stored when this form saves.
 */
function RuleAdvanced({
  index,
  form,
  isDefault,
  currencySymbol,
  advancedEditorHref,
}: Readonly<{
  index: number;
  form: ReturnType<typeof useForm<EarningFormInput, unknown, EarningFormValues>>;
  isDefault: boolean;
  currencySymbol: string;
  advancedEditorHref?: React.ReactNode;
}>) {
  const { t } = useTranslation();
  const dayLabels: Record<(typeof DAYS)[number], string> = {
    mon: t("M"),
    tue: t("T"),
    wed: t("W"),
    thu: t("T"),
    fri: t("F"),
    sat: t("S"),
    sun: t("S"),
  };

  return (
    <Collapsible>
      <CollapsibleTrigger
        className={cn(
          "group inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground",
          "hover:bg-muted hover:text-foreground data-[panel-open]:bg-primary/10 data-[panel-open]:text-primary",
        )}
      >
        <IconChevronRight
          size={14}
          className="transition-transform group-data-[panel-open]:rotate-90"
        />
        {t("Advanced")}
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-4 pt-4">
        {!isDefault && (
          <Controller
            control={form.control}
            name={`rules.${index}.status`}
            render={({ field }) => (
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{t("Rule is on")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("Switch it off to keep the rule without applying it.")}
                  </p>
                </div>
                <Switch
                  checked={field.value !== "inactive"}
                  onCheckedChange={(on) => field.onChange(on ? "active" : "inactive")}
                />
              </div>
            )}
          />
        )}

        <Controller
          control={form.control}
          name={`rules.${index}.description`}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor={field.name} className="text-xs">
                {t("Description")}
              </FieldLabel>
              <Input
                id={field.name}
                className="h-9"
                placeholder={t("Shown to staff, never to customers")}
                {...field}
                value={field.value ?? ""}
              />
            </Field>
          )}
        />

        {!isDefault && (
          <Controller
            control={form.control}
            name={`rules.${index}.allowedDays`}
            render={({ field }) => {
              const selected = new Set(field.value ?? []);
              return (
                <Field>
                  <FieldLabel className="text-xs">{t("Days it runs")}</FieldLabel>
                  <div className="flex gap-1.5" role="group" aria-label={t("Days it runs")}>
                    {DAYS.map((day) => {
                      const on = selected.has(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          aria-pressed={on}
                          title={day}
                          onClick={() => {
                            const next = new Set(selected);
                            if (on) next.delete(day);
                            else next.add(day);
                            field.onChange(DAYS.filter((d) => next.has(d)));
                          }}
                          className={cn(
                            "flex size-8 items-center justify-center rounded-md border text-xs font-medium",
                            on
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : "border-border bg-muted/40 text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {dayLabels[day]}
                        </button>
                      );
                    })}
                  </div>
                  <FieldDescription className="text-xs">
                    {selected.size === 0 ? t("Every day.") : t("Only on the days selected.")}
                  </FieldDescription>
                </Field>
              );
            }}
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name={`rules.${index}.minPurchaseAmount`}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name} className="text-xs">
                  {t("Minimum spend")}
                </FieldLabel>
                <InputGroup>
                  <InputGroupAddon>{currencySymbol}</InputGroupAddon>
                  <InputGroupInput
                    id={field.name}
                    type="number"
                    min={0}
                    {...field}
                    value={numberInputValue(field.value)}
                  />
                </InputGroup>
                <FieldDescription className="text-xs">
                  {t("Leave empty for no minimum.")}
                </FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {!isDefault && (
            <Controller
              control={form.control}
              name={`rules.${index}.priority`}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name} className="text-xs">
                    {t("Priority")}
                  </FieldLabel>
                  <Input
                    id={field.name}
                    type="number"
                    className="h-9"
                    {...field}
                    value={numberInputValue(field.value)}
                  />
                  <FieldDescription className="text-xs">
                    {t("When two extra rules match, the higher number wins.")}
                  </FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          )}
        </div>

        {advancedEditorHref && (
          <p className="text-xs text-muted-foreground">
            {t("Dates, time windows and tier restrictions:")} {advancedEditorHref}
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
