import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { LoyaltyTier } from "@/backend/loyalty/tier.api";

import type { GiftFormValues, GiftValues } from "../schemas.ts";
import { NumberField, TextField, TierRestriction } from "./fields.tsx";

type GiftForm = UseFormReturn<GiftFormValues, unknown, GiftValues>;

export function GiftFields({
  form,
  tiers,
}: Readonly<{ form: GiftForm; tiers: readonly LoyaltyTier[] }>) {
  const { t } = useTranslation();
  const { control } = form;

  return (
    <div className="flex flex-col gap-5">
      <TextField
        control={control}
        name="name"
        label={t("Name")}
        placeholder={t("e.g. Coffee mug, Tote bag")}
      />
      <TextField
        control={control}
        name="description"
        label={t("Description")}
        placeholder={t("What the customer gets")}
        multiline
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          control={control}
          name="giftQuantity"
          label={t("How many you have")}
          description={t("Each one handed out gets its own code.")}
          min={1}
          integer
        />
        <NumberField
          control={control}
          name="estimatedValue"
          label={t("What it normally sells for")}
          description={t("Used to show what your program costs you.")}
          placeholder="25"
        />
      </div>
      <TextField
        control={control}
        name="restrictions"
        label={t("Terms and conditions")}
        placeholder={t("Anything the customer should know before using it")}
        multiline
      />
      <Controller
        control={control}
        name="tierIds"
        render={({ field }) => (
          <TierRestriction tiers={tiers} value={field.value} onChange={field.onChange} />
        )}
      />
    </div>
  );
}
