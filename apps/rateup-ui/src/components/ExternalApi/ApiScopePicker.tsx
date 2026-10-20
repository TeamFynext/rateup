import { useId } from "react";
import { useTranslation } from "react-i18next";

import type { ApiKeyFeature } from "@/backend/apiKeys/apiKeys.api.ts";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field.tsx";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";

import { FEATURE_OPTIONS } from "./apiKeyFormat.ts";

/**
 * What a key may use, by partner API feature. The API reads an empty list as full access, so
 * "Full access" is a mode of its own rather than every box ticked — ticking them all would
 * freeze the key at today's features and silently miss any added later.
 */
export function ApiScopePicker({
  restricted,
  onRestrictedChange,
  features,
  onFeaturesChange,
}: Readonly<{
  restricted: boolean;
  onRestrictedChange: (restricted: boolean) => void;
  features: ReadonlySet<ApiKeyFeature>;
  onFeaturesChange: (features: Set<ApiKeyFeature>) => void;
}>) {
  const { t } = useTranslation();
  const uid = useId();

  const toggle = (feature: ApiKeyFeature) => {
    const next = new Set(features);
    if (next.has(feature)) next.delete(feature);
    else next.add(feature);
    onFeaturesChange(next);
  };

  return (
    <FieldSet className="gap-3">
      <FieldLegend variant="label">{t("Access")}</FieldLegend>
      <RadioGroup
        value={restricted ? "restricted" : "full"}
        onValueChange={(value) => onRestrictedChange(value === "restricted")}
        className="gap-2"
      >
        <FieldLabel htmlFor={`${uid}-full`} className="items-center font-normal">
          <RadioGroupItem id={`${uid}-full`} value="full" />
          {t("Full access")}
        </FieldLabel>
        <FieldLabel htmlFor={`${uid}-restricted`} className="items-center font-normal">
          <RadioGroupItem id={`${uid}-restricted`} value="restricted" />
          {t("Only selected features")}
        </FieldLabel>
      </RadioGroup>

      {restricted ? (
        <div className="flex flex-col gap-2.5 rounded-lg border border-border p-3">
          {FEATURE_OPTIONS.map((option) => {
            const id = `${uid}-${option.value}`;
            return (
              <label key={option.value} htmlFor={id} className="flex items-start gap-2.5 text-sm">
                <Checkbox
                  id={id}
                  className="mt-0.5"
                  checked={features.has(option.value)}
                  onCheckedChange={() => toggle(option.value)}
                />
                <span className="flex min-w-0 flex-col">
                  <span>{t(option.label)}</span>
                  <span className="text-xs text-muted-foreground">{t(option.description)}</span>
                </span>
              </label>
            );
          })}
        </div>
      ) : (
        <FieldDescription>
          {t("The key can call every endpoint, including ones added later.")}
        </FieldDescription>
      )}
    </FieldSet>
  );
}
