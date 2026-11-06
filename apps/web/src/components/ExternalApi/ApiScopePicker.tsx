import { Checkbox } from "@rateup/ui/components/checkbox";
import { FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@rateup/ui/components/field";
import { useId } from "react";
import { useTranslation } from "react-i18next";

import type { ApiKeyFeature } from "@/backend/apiKeys/apiKeys.api.ts";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";

import { FEATURE_OPTIONS } from "./apiKeyFormat.ts";

/**
 * What a key may use, by partner API feature. Every new key names at least one feature.
 *
 * "Full access" (an empty scope list) survives only on legacy keys minted before scopes
 * existed. It is offered solely as the current state of such a key, so its owner can keep it
 * or narrow it; the API will not create a full-access key or widen a limited one back to it.
 */
export function ApiScopePicker({
  legacyFullAccess = false,
  restricted,
  onRestrictedChange,
  features,
  onFeaturesChange,
}: Readonly<{
  /** The key being edited is a legacy full-access key; shows that as a choice to keep. */
  legacyFullAccess?: boolean;
  /** Ignored unless `legacyFullAccess`; every other key is always limited to features. */
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

  const showFeatures = !legacyFullAccess || restricted;

  return (
    <FieldSet className="gap-3">
      <FieldLegend variant="label">{t("Access")}</FieldLegend>
      {legacyFullAccess && (
        <RadioGroup
          value={restricted ? "restricted" : "full"}
          onValueChange={(value) => onRestrictedChange(value === "restricted")}
          className="gap-2"
        >
          <FieldLabel htmlFor={`${uid}-full`} className="items-center font-normal">
            <RadioGroupItem id={`${uid}-full`} value="full" />
            {t("Full access (legacy)")}
          </FieldLabel>
          <FieldLabel htmlFor={`${uid}-restricted`} className="items-center font-normal">
            <RadioGroupItem id={`${uid}-restricted`} value="restricted" />
            {t("Only selected features")}
          </FieldLabel>
        </RadioGroup>
      )}

      {showFeatures ? (
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
          {t(
            "This key was created before keys were limited by feature, so it can call every endpoint. New keys can't have full access, and once you limit this one it can't go back.",
          )}
        </FieldDescription>
      )}
    </FieldSet>
  );
}
