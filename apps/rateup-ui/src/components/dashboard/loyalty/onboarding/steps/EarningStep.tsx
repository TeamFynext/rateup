import { zodResolver } from "@hookform/resolvers/zod";
import { IconTrash } from "@tabler/icons-react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { numberInputValue } from "@/utils/form.ts";

import { earningFormSchema, type EarningFormInput, type EarningFormValues } from "../schemas.ts";
import { StepFooter, StepHeader } from "../StepChrome.tsx";

interface EarningStepProps {
  defaultValues: EarningFormInput;
  currencySymbol: string;
  pointsName: string;
  isSaving: boolean;
  onBack: () => void;
  onSubmit: (values: EarningFormValues) => void;
}

export function EarningStep({
  defaultValues,
  currencySymbol,
  pointsName,
  isSaving,
  onBack,
  onSubmit,
}: Readonly<EarningStepProps>) {
  const { t } = useTranslation();

  const form = useForm<EarningFormInput, unknown, EarningFormValues>({
    resolver: zodResolver(earningFormSchema),
    defaultValues,
  });

  const { fields, remove } = useFieldArray({ control: form.control, name: "rules" });
  const rulesError = form.formState.errors.rules;

  return (
    <form className="flex flex-col gap-6" onSubmit={form.handleSubmit(onSubmit)}>
      <StepHeader
        title={t("How customers earn points")}
        description={t(
          "The default rule applies to every purchase. Any extra rule stacks on top when its conditions match.",
        )}
      />

      <div className="flex flex-col gap-3">
        {fields.map((item, index) => (
          <Card key={item.id} className="border-border">
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
                  {form.watch(`rules.${index}.isDefault`) ? (
                    <Badge variant="secondary">{t("Default")}</Badge>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("Remove rule")}
                      onClick={() => remove(index)}
                    >
                      <IconTrash size={16} />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Controller
                  control={form.control}
                  name={`rules.${index}.pointsPerUnit`}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name} className="text-xs">
                        {t("{points} per {symbol}1 spent", {
                          points: pointsName,
                          symbol: currencySymbol,
                        })}
                      </FieldLabel>
                      <Input
                        id={field.name}
                        type="number"
                        min={0}
                        step="0.01"
                        className="h-9"
                        {...field}
                        value={numberInputValue(field.value)}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

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
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

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

              {(form.watch(`rules.${index}.allowedDays`) ?? []).length > 0 && (
                <FieldDescription className="text-xs">
                  {t("Only on: {days}", {
                    days: (form.watch(`rules.${index}.allowedDays`) ?? []).join(", "),
                  })}
                </FieldDescription>
              )}
            </CardContent>
          </Card>
        ))}

        {rulesError?.root?.message && (
          <p className="text-xs text-destructive">{rulesError.root.message}</p>
        )}
        {typeof rulesError?.message === "string" && (
          <p className="text-xs text-destructive">{rulesError.message}</p>
        )}
      </div>

      <StepFooter isSaving={isSaving} onBack={onBack} />
    </form>
  );
}
