// Extracted verbatim from `EarningRulesPage.tsx`. Behaviour is unchanged.

import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconAward,
  IconDeviceFloppy,
  IconInfoCircle,
  IconLoader2,
  IconPencil,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { LoyaltyTier, LoyaltyTierInput } from "@/backend/loyalty/tiers.api";
import { useUpdateLoyaltyTierMutation } from "@/backend/loyalty/tiers.query";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";

import { tierSchema } from "./shared.tsx";
import type { TierFormValues } from "./shared.tsx";

export function TierCard({
  tier,
  index,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onDelete,
}: {
  tier: LoyaltyTier;
  index: number;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string, name: string) => void;
}) {
  const { t } = useTranslation();
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
    toast.success(t("{name} tier settings saved", { name: tierForm.getValues("name") }));
  });

  const onSubmit = (values: TierFormValues) => {
    const updatedData: LoyaltyTierInput = {
      name: values.name,
      color: values.color,
      pointsMultiplier: Number(values.pointsMultiplier),
      threshold: Number(values.threshold),
    };
    updateTierMutation.mutate(updatedData, {
      onSuccess: () => onCancelEdit(),
    });
  };

  if (!isEditing) {
    return (
      <Card>
        <CardContent>
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: tier.color }}
            >
              <IconAward className="h-5 w-5 text-background" />
            </div>

            <div className="flex flex-1 items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold leading-tight">{tier.name}</h4>
                  <span className="text-xs text-muted-foreground font-medium">
                    ({index === 0 ? "Base Tier" : `Tier ${index}`})
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {index === 0
                    ? "Base tier - Starting point"
                    : `${tier.threshold.toLocaleString()}+ lifetime points`}
                </p>
              </div>

              {/* `pointsMultiplier` multiplies the base rule's points — the engine computes
                  floor((base x ruleMultiplier + bonus) x tierMultiplier). It is not a
                  points-per-currency rate, so it reads as "x2", never as "2 pts/INR". */}
              <div className="rounded-lg border border-border bg-muted px-3 py-1.5">
                <p className="text-xs text-muted-foreground">{t("Earns at")}</p>
                <p className="text-sm font-semibold text-primary">
                  {t("{multiplier}x the base rate", {
                    multiplier: Number(tier.pointsMultiplier),
                  })}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-primary hover:bg-primary/10"
                onClick={onStartEdit}
              >
                <IconPencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={tierForm.handleSubmit(onSubmit)} className="space-y-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold">Edit Tier</h4>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  tierForm.reset({
                    name: tier.name,
                    color: tier.color,
                    pointsMultiplier: Number(tier.pointsMultiplier),
                    threshold: tier.threshold,
                  });
                  onCancelEdit();
                }}
                className="h-8"
              >
                <IconX className="mr-1 h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8"
                disabled={updateTierMutation.isPending}
              >
                {updateTierMutation.isPending ? (
                  <IconLoader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <IconDeviceFloppy className="mr-1 h-3.5 w-3.5" />
                )}
                Save
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="name"
              control={tierForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name} className="text-xs">
                    {t("Tier Name")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    className="mt-1 h-9 font-semibold"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="color"
              control={tierForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name} className="text-xs">
                    {t("Color")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    type="color"
                    className="mt-1 h-9"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="pointsMultiplier"
              control={tierForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name} className="text-xs">
                    {t("Earns at")}
                  </FieldLabel>
                  <div className="mt-1 flex items-center gap-1">
                    <Input
                      {...field}
                      id={field.name}
                      type="number"
                      aria-invalid={fieldState.invalid}
                      value={field.value as number}
                      className="h-9 font-semibold"
                      min="0"
                      step="0.25"
                    />
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {t("x the base rate")}
                    </span>
                  </div>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="threshold"
              control={tierForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name} className="text-xs">
                    {t("Threshold")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    value={field.value as number}
                    className="mt-1 h-9"
                    min="0"
                    disabled={tier.threshold === 0}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <div className="text-xs text-muted-foreground">
              {tier.threshold === 0 ? (
                <>
                  <IconInfoCircle className="mr-1 inline h-3 w-3" />
                  {t("Base tier - All new customers start here. Cannot be deleted.")}
                </>
              ) : (
                t("Customers reach this tier after earning {points} lifetime points", {
                  points: tier.threshold.toLocaleString(),
                })
              )}
            </div>

            {tier.threshold > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(tier.id, tierForm.getValues("name"))}
              >
                <IconTrash className="mr-1 h-3.5 w-3.5" />
                Delete Tier
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
