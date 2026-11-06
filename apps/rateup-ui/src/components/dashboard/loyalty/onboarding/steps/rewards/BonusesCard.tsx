import { IconUsers } from "@tabler/icons-react";
import { Controller, type Control } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Card, CardContent } from "@/components/ui/card.tsx";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { numberInputValue } from "@/utils/form.ts";

import type { RewardsFormInput } from "../../schemas.ts";
import { SectionHeading } from "../../StepChrome.tsx";

/**
 * Joining and referring are rewards paid for a behaviour rather than for spend. They are
 * edited here, beside the rewards they share a budget with.
 */
export function BonusesCard({ control }: Readonly<{ control: Control<RewardsFormInput> }>) {
  const { t } = useTranslation();
  return (
    <Card className="border-border bg-muted/30">
      <CardContent className="flex flex-col gap-4 p-4">
        <SectionHeading
          icon={<IconUsers />}
          tone="blue"
          title={t("Points for joining and referring")}
          description={t(
            "Given out for signing up and for bringing a friend. Set any of them to 0 to switch it off.",
          )}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <BonusField control={control} name="signupBonus" label={t("Points for joining")} />
          <BonusField
            control={control}
            name="referralBonus"
            label={t("Points for referring a friend")}
          />
          <BonusField
            control={control}
            name="refereeBonus"
            label={t("Points for the friend who joins")}
          />
        </div>
      </CardContent>
    </Card>
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
  control: Control<RewardsFormInput>;
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
            className="h-9 bg-background"
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
