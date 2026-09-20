import { IconLoader2 } from "@tabler/icons-react";
import { useId } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { z } from "zod";

import { useUpdateLoyaltyProgramMutation } from "@/backend/loyalty/program.query";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Switch } from "@/components/ui/switch.tsx";

import type { ExpirationSettingsSchema } from "./schemas.ts";

type ExpirationSettings = z.infer<typeof ExpirationSettingsSchema>;

interface PointsExpirationSettingsProps {
  form: UseFormReturn<ExpirationSettings>;
  /** `null` until the program exists, which is also when the card is disabled. */
  programId: string | null;
  disabled?: boolean;
}

export function PointsExpirationSettings({
  form,
  programId,
  disabled = false,
}: Readonly<PointsExpirationSettingsProps>) {
  const uid = useId();
  const { t } = useTranslation();

  const { mutate, isPending } = useUpdateLoyaltyProgramMutation(programId ?? "");

  const onSave = (data: ExpirationSettings) => {
    if (!programId) return;
    mutate(
      { enablePointsExpiration: data.enabled, pointsExpirationMonths: data.months },
      { onSuccess: () => form.reset(data) },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("Points Expiration")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={form.handleSubmit(onSave)} className="space-y-3">
          <Controller
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <Field orientation="horizontal" className="p-2.5 border rounded-lg">
                <FieldContent>
                  <FieldLabel htmlFor={`${uid}-field`} className="text-sm font-medium">
                    {t("Enable Expiration")}
                  </FieldLabel>
                  <FieldDescription className="text-xs text-muted-foreground">
                    {t("Points expire after period")}
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id={`${uid}-field`}
                  checked={field.value}
                  onCheckedChange={disabled ? undefined : field.onChange}
                  disabled={disabled}
                />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="months"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`${uid}-field-2`} className="text-xs">
                  {t("Expiration Period")}
                </FieldLabel>
                <Select
                  value={field.value.toString()}
                  onValueChange={
                    disabled ? undefined : (val) => field.onChange(Number.parseInt(val ?? ""))
                  }
                  disabled={disabled}
                  items={[
                    { value: "3", label: t("3 months") },
                    { value: "6", label: t("6 months") },
                    { value: "12", label: t("12 months") },
                    { value: "24", label: t("24 months") },
                  ]}
                >
                  <SelectTrigger
                    id={`${uid}-field-2`}
                    className="h-9"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">{t("3 months")}</SelectItem>
                    <SelectItem value="6">{t("6 months")}</SelectItem>
                    <SelectItem value="12">{t("12 months")}</SelectItem>
                    <SelectItem value="24">{t("24 months")}</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <div className="flex justify-end">
            <Button size="sm" type="submit" disabled={isPending || disabled}>
              {isPending ? (
                <>
                  <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("Saving")}
                </>
              ) : (
                t("Save Changes")
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
