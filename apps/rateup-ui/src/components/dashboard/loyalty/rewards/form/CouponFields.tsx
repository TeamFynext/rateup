import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { LoyaltyTier } from "@/backend/loyalty/tier.api";
import { DatePicker } from "@/components/ui/date-picker.tsx";
import { Field, FieldError, FieldLabel } from "@/components/ui/field.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { fromDateKey, toDateKey } from "@/utils/dateTime.ts";

import type { CouponFormValues, CouponValues } from "../schemas.ts";
import { ShopifyDiscountCard } from "../ShopifyDiscountCard.tsx";
// Hidden until WooCommerce and HubSpot launch — uncomment to show.
// import { WooDiscountCard } from "../WooDiscountCard.tsx";
import { FormSection, NumberField, TextField, TierRestriction } from "./fields.tsx";

type CouponForm = UseFormReturn<CouponFormValues, unknown, CouponValues>;

export function CouponFields({
  form,
  tiers,
}: Readonly<{ form: CouponForm; tiers: readonly LoyaltyTier[] }>) {
  const { t } = useTranslation();
  const { control, setValue } = form;
  const shopifyEnabled = useWatch({ control, name: "shopifyDiscountEnabled" });
  const wooEnabled = useWatch({ control, name: "wooDiscountEnabled" });
  const validFrom = fromDateKey(useWatch({ control, name: "validFrom" }));

  const discountTypes = [
    { value: "percentage", label: t("Percentage off") },
    { value: "fixed", label: t("Amount off") },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* First, because it decides whether there is one code to type in at all. */}
      <ShopifyDiscountCard
        enabled={!!shopifyEnabled}
        onEnabledChange={(checked) => {
          setValue("shopifyDiscountEnabled", checked, { shouldDirty: true });
          // One store syncs a reward: a redemption holds one store discount.
          if (checked) setValue("wooDiscountEnabled", false, { shouldDirty: true });
        }}
        supported
        inheritsExpiryFrom={t("the coupon's end date")}
      />
      {/* Hidden until WooCommerce and HubSpot launch — uncomment to show.
      <WooDiscountCard
        enabled={!!wooEnabled}
        onEnabledChange={(checked) => {
          setValue("wooDiscountEnabled", checked, { shouldDirty: true });
          if (checked) setValue("shopifyDiscountEnabled", false, { shouldDirty: true });
        }}
        supported
        inheritsExpiryFrom={t("the coupon's end date")}
      />
      */}

      {!shopifyEnabled && !wooEnabled && (
        <TextField
          control={control}
          name="couponCode"
          label={t("Coupon code")}
          description={t("The code customers show or type to use it.")}
          placeholder="SAVE20"
          mono
        />
      )}

      <TextField
        control={control}
        name="name"
        label={t("Name")}
        placeholder={t("e.g. 20% off welcome coupon")}
      />
      <TextField
        control={control}
        name="description"
        label={t("Description")}
        placeholder={t("What the coupon gives")}
        multiline
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="discountType"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>{t("Discount")}</FieldLabel>
              <Select
                name={field.name}
                value={field.value}
                items={discountTypes}
                onValueChange={(value) => field.onChange(value ?? "percentage")}
              >
                <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {discountTypes.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <NumberField control={control} name="discountValue" label={t("Value")} placeholder="20" />
      </div>

      <NumberField
        control={control}
        name="minimumSpend"
        label={t("Minimum bill")}
        description={t("Leave at 0 for no minimum.")}
      />

      <FormSection title={t("Limits")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            control={control}
            name="stockQuantity"
            label={t("Total uses")}
            description={t("How many times it can be used across all customers.")}
            min={1}
            integer
          />
          <NumberField
            control={control}
            name="perUserLimit"
            label={t("Uses per customer")}
            min={1}
            integer
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="validFrom"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>{t("Starts")}</FieldLabel>
                <DatePicker
                  id={field.name}
                  className="w-full"
                  placeholder={t("Straight away")}
                  invalid={fieldState.invalid}
                  value={fromDateKey(field.value)}
                  onChange={(date) => field.onChange(date ? toDateKey(date) : "")}
                  // The picker disallows the future by default — backwards for a promotion.
                  disabled={false}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            control={control}
            name="validTo"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>{t("Ends")}</FieldLabel>
                <DatePicker
                  id={field.name}
                  className="w-full"
                  placeholder={t("No end date")}
                  invalid={fieldState.invalid}
                  value={fromDateKey(field.value)}
                  onChange={(date) => field.onChange(date ? toDateKey(date) : "")}
                  // An end before the start is a coupon nobody can use, and with the Shopify
                  // sync on it is a code that is never created.
                  disabled={validFrom ? { before: validFrom } : false}
                  startMonth={validFrom}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>
      </FormSection>

      <TextField
        control={control}
        name="termsAndConditions"
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
