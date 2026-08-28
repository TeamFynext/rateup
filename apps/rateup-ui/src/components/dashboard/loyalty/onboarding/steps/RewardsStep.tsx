import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { numberInputValue } from "@/utils/form.ts";

import { rewardsFormSchema, type RewardsFormInput, type RewardsFormValues } from "../schemas.ts";
import { StepFooter, StepHeader } from "../StepChrome.tsx";

interface RewardsStepProps {
  defaultValues: RewardsFormInput;
  pointsName: string;
  isSaving: boolean;
  onBack: () => void;
  onSubmit: (values: RewardsFormValues) => void;
}

/**
 * Describes a preset's `rewardValue` in words. The wizard keeps the value itself
 * read-only — the full editor on `/dashboard/loyalty/rewards` is where discount caps,
 * stock and redemption rules get changed.
 */
function describeRewardValue(value: Record<string, unknown>): string | null {
  const type = value.type;
  if (type === "discount_percentage" && typeof value.percentage === "number") {
    return `${value.percentage}% off`;
  }
  if (type === "discount_fixed" && typeof value.amount === "number") {
    return `${value.amount} off`;
  }
  if (type === "free_item" && typeof value.item_name === "string") {
    return value.item_name;
  }
  return null;
}

export function RewardsStep({
  defaultValues,
  pointsName,
  isSaving,
  onBack,
  onSubmit,
}: Readonly<RewardsStepProps>) {
  const { t } = useTranslation();

  const form = useForm<RewardsFormInput, unknown, RewardsFormValues>({
    resolver: zodResolver(rewardsFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "rewards" });
  const rewardsError = form.formState.errors.rewards;

  return (
    <form className="flex flex-col gap-6" onSubmit={form.handleSubmit(onSubmit)}>
      <StepHeader
        title={t("Rewards")}
        description={t("What customers can spend their {points} on.", { points: pointsName })}
      />

      <div className="flex flex-col gap-3">
        {fields.map((item, index) => {
          const rewardValue = form.watch(`rewards.${index}.rewardValue`);
          const summary = describeRewardValue(rewardValue ?? {});

          return (
            <Card key={item.id} className="border-border">
              <CardContent className="grid items-start gap-4 p-4 sm:grid-cols-[2fr_1fr_auto]">
                <Controller
                  control={form.control}
                  name={`rewards.${index}.name`}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name} className="text-xs">
                        {t("Reward")}
                      </FieldLabel>
                      <Input id={field.name} className="h-9" {...field} />
                      {summary && <span className="text-xs text-muted-foreground">{summary}</span>}
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name={`rewards.${index}.pointsCost`}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name} className="text-xs">
                        {t("Costs ({points})", { points: pointsName })}
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

                <div className="pt-6">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("Remove reward")}
                    onClick={() => remove(index)}
                  >
                    <IconTrash size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {fields.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            {t(
              "No rewards yet. Customers can still earn points, but they will have nothing to redeem.",
            )}
          </p>
        )}

        {typeof rewardsError?.root?.message === "string" && (
          <p className="text-xs text-destructive">{rewardsError.root.message}</p>
        )}

        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() =>
            append({
              name: "",
              description: "",
              pointsCost: 100,
              rewardType: "point",
              // A percentage discount is the one reward shape that needs no catalogue
              // knowledge, so it is the safe default for a hand-added row.
              rewardValue: { type: "discount_percentage", percentage: 10 },
            })
          }
        >
          <IconPlus size={16} />
          {t("Add reward")}
        </Button>
      </div>

      <StepFooter isSaving={isSaving} onBack={onBack} />
    </form>
  );
}
