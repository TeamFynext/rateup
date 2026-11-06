import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Field, FieldDescription, FieldError, FieldTitle } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { TagsInput } from "@/components/ui/tags-input.tsx";

import type { CreateRuleInput } from "./schema.ts";

/** Which click-to-WhatsApp ads a "came from an ad" rule answers; both empty means every ad. */
export function AdReferralOptions() {
  const { t } = useTranslation();
  const { control } = useFormContext<CreateRuleInput>();

  return (
    <div className="space-y-4 bg-card ring-foreground/10 rounded-xl p-4 ring-1">
      <Controller
        control={control}
        name="options.adIds"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldTitle>{t("Ad IDs (optional)")}</FieldTitle>
            <TagsInput
              value={field.value ?? []}
              onValueChange={(ids) => field.onChange(ids.length ? ids : undefined)}
              placeholder="120210000000000001"
              maxTags={50}
            />
            <FieldDescription>
              {t("Find an ad's ID in Ads Manager. Press Enter after each one.")}
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        control={control}
        name="options.adMatch"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldTitle>{t("Or ads whose headline or link contains")}</FieldTitle>
            <Input
              value={field.value ?? ""}
              onChange={(e) => field.onChange(e.target.value || undefined)}
              placeholder={t("summer")}
              maxLength={200}
            />
            <FieldDescription>
              {t(
                "Leave both empty to answer every ad. A rule naming an ad goes before one for every ad.",
              )}
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </div>
  );
}
