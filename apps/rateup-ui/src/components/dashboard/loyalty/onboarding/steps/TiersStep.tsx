import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { numberInputValue } from "@/utils/form.ts";

import { tiersFormSchema, type TiersFormInput, type TiersFormValues } from "../schemas.ts";
import { StepFooter, StepHeader } from "../StepChrome.tsx";

interface TiersStepProps {
  defaultValues: TiersFormInput;
  currencySymbol: string;
  isSaving: boolean;
  onBack: () => void;
  onSubmit: (values: TiersFormValues) => void;
}

export function TiersStep({
  defaultValues,
  currencySymbol,
  isSaving,
  onBack,
  onSubmit,
}: Readonly<TiersStepProps>) {
  const { t } = useTranslation();

  const form = useForm<TiersFormInput, unknown, TiersFormValues>({
    resolver: zodResolver(tiersFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "tiers" });
  const tiersEnabled = form.watch("tiersEnabled");
  const tiersError = form.formState.errors.tiers;

  return (
    <form className="flex flex-col gap-6" onSubmit={form.handleSubmit(onSubmit)}>
      <StepHeader
        title={t("Tiers")}
        description={t(
          "Customers move up as their total spend grows, and earn faster at each level. Thresholds are total lifetime spend.",
        )}
      />

      <Controller
        control={form.control}
        name="tiersEnabled"
        render={({ field }) => (
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">{t("Use tiers")}</p>
              <p className="text-xs text-muted-foreground">
                {t("Turn this off to run a single flat earning rate for everyone.")}
              </p>
            </div>
            <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
          </div>
        )}
      />

      {tiersEnabled && (
        <div className="flex flex-col gap-3">
          {fields.map((item, index) => (
            <Card key={item.id} className="border-border">
              <CardContent className="grid items-start gap-4 p-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <Controller
                  control={form.control}
                  name={`tiers.${index}.name`}
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
                  name={`tiers.${index}.threshold`}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name} className="text-xs">
                        {t("Spend to reach ({symbol})", { symbol: currencySymbol })}
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

                <Controller
                  control={form.control}
                  name={`tiers.${index}.pointsMultiplier`}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name} className="text-xs">
                        {t("Earns at")}
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

                <div className="flex items-center gap-2 pt-6">
                  <Controller
                    control={form.control}
                    name={`tiers.${index}.color`}
                    render={({ field }) => (
                      <input
                        type="color"
                        aria-label={t("Tier colour")}
                        className="size-9 cursor-pointer rounded border border-border bg-transparent"
                        value={typeof field.value === "string" ? field.value : "#999999"}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("Remove tier")}
                      onClick={() => remove(index)}
                    >
                      <IconTrash size={16} />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Both uniqueness rules mirror LoyaltyTier's constraints; showing them here
              means the user never sees them as a server error. */}
          {tiersError?.root?.message && (
            <p className="text-xs text-destructive">{tiersError.root.message}</p>
          )}
          {typeof tiersError?.message === "string" && (
            <p className="text-xs text-destructive">{tiersError.message}</p>
          )}

          <Button
            type="button"
            variant="outline"
            className="self-start"
            onClick={() =>
              append({
                name: "",
                threshold: 0,
                pointsMultiplier: 1,
                color: "#999999",
                benefitsDescription: "",
              })
            }
          >
            <IconPlus size={16} />
            {t("Add tier")}
          </Button>
        </div>
      )}

      <StepFooter isSaving={isSaving} onBack={onBack} />
    </form>
  );
}
