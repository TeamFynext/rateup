import { IconLoader2 } from "@tabler/icons-react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { z } from "zod";

import { AccountSelector } from "@/components/input/AccountSelector.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { CountryDropdown } from "@/components/ui/country-dropdown.tsx";
import { CurrencySelect } from "@/components/ui/currency-select.tsx";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { numberInputValue } from "@/utils/form.ts";

import type { BasicSettingsSchema } from "./schemas.ts";

interface BasicSettingsProps {
  form: UseFormReturn<z.infer<typeof BasicSettingsSchema>>;
  onSave: (data: z.infer<typeof BasicSettingsSchema>) => void;
  isPending: boolean;
  programId: string | null;
}

export function BasicSettings({
  form,
  onSave,
  isPending,
  programId,
}: Readonly<BasicSettingsProps>) {
  const { t } = useTranslation();

  let buttonLabel: string | React.ReactNode;
  if (isPending) {
    buttonLabel = (
      <>
        <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
        {t("Saving")}
      </>
    );
  } else if (programId) {
    buttonLabel = t("Save Changes");
  } else {
    buttonLabel = t("Create Program");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("Basic Settings")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={form.handleSubmit(onSave)} className="space-y-3">
          <Controller
            control={form.control}
            name="programName"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name} className="text-xs">
                  {t("Program Name")}
                </FieldLabel>
                <Input
                  id={field.name}
                  placeholder="e.g., VIP Rewards"
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
            name="pointsCurrency"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name} className="text-xs">
                  {t("Points Currency")}
                </FieldLabel>
                <Input
                  id={field.name}
                  placeholder="Points"
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
            name="moneyCurrency"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name} className="text-xs">
                  {t("Money Currency")}
                </FieldLabel>
                <CurrencySelect
                  name={field.name}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder={t("Select Currency")}
                  currencies="all"
                  variant="default"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="averageOrderValue"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name} className="text-xs">
                  {t("Typical spend in one visit")}
                </FieldLabel>
                <Input
                  id={field.name}
                  type="number"
                  min={0}
                  aria-invalid={fieldState.invalid}
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  value={numberInputValue(field.value)}
                  // Cleared means "never told us", which is a different answer from zero.
                  onChange={(event) =>
                    field.onChange(event.target.value === "" ? null : Number(event.target.value))
                  }
                />
                <FieldDescription className="text-xs">
                  {t(
                    "Used to work out what your rewards cost you as a share of revenue. Leave blank if you would rather not say.",
                  )}
                </FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="defaultCountryCode"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name} className="text-xs">
                  {t("Default Country")}
                </FieldLabel>
                <CountryDropdown
                  placeholder={t("Select Country")}
                  defaultValue={field.value}
                  onChange={(country) => {
                    field.onChange(country.alpha2);
                  }}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="whatsappSettingsId"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name} className="text-xs">
                  {t("WhatsApp Account")}
                </FieldLabel>
                <AccountSelector value={field.value} onChange={field.onChange} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Button size="sm" className="w-full mt-2" type="submit" disabled={isPending}>
            {buttonLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
