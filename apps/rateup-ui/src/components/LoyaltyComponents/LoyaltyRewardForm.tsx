import { Info } from "lucide-react";
import { useId } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";

import type { LoyaltyTier } from "@/backend/loyalty/tier.api";
import type { WaTemplate } from "@/backend/whatsapp/whatsapp.api";
import type {
  CouponFormValues,
  GiftFormValues,
  PointRewardFormValues,
} from "@/components/dashboard/loyalty/rewards/schemas.ts";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";

interface LoyaltyRewardFormProps {
  category: string;
  // Forms
  pointRewardForm: UseFormReturn<PointRewardFormValues>;
  couponForm: UseFormReturn<CouponFormValues>;
  giftForm: UseFormReturn<GiftFormValues>;

  // State
  rewardTierRestriction: boolean;
  setRewardTierRestriction: (val: boolean) => void;
  minimumSpendEnabled: boolean;
  setMinimumSpendEnabled: (val: boolean) => void;
  timeRestrictionsEnabled: boolean;
  setTimeRestrictionsEnabled: (val: boolean) => void;

  // Data
  loyaltyTiers: LoyaltyTier[] | undefined;
  loyaltyTemplates: WaTemplate[] | undefined;
}

/**
 * The numeric fields are `z.coerce.number()`, whose *input* type is `unknown`, so
 * react-hook-form hands their value back unnarrowed. The inputs render it as typed.
 */
const numberInputValue = (value: unknown): string | number =>
  typeof value === "number" || typeof value === "string" ? value : "";

export function LoyaltyRewardForm({
  category,
  pointRewardForm,
  couponForm,
  giftForm,
  rewardTierRestriction,
  setRewardTierRestriction,
  minimumSpendEnabled,
  setMinimumSpendEnabled,
  timeRestrictionsEnabled,
  setTimeRestrictionsEnabled,
  loyaltyTiers,
}: Readonly<LoyaltyRewardFormProps>) {
  const uid = useId();
  const DAYS_OF_WEEK = [
    { label: "Monday", value: "monday" },
    { label: "Tuesday", value: "tuesday" },
    { label: "Wednesday", value: "wednesday" },
    { label: "Thursday", value: "thursday" },
    { label: "Friday", value: "friday" },
    { label: "Saturday", value: "saturday" },
    { label: "Sunday", value: "sunday" },
  ];
  return (
    <div className="space-y-5">
      {/* Point Rewards Form */}
      {category === "point-rewards" && (
        <form className="space-y-5">
          <Controller
            control={pointRewardForm.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Reward Name</FieldLabel>
                <Input
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  // NOTE: the tiers endpoint does not include the program, so this placeholder
                  // has always shown the "INR" fallback.
                  placeholder={"e.g., INR 10 Cashback, Free Coffee, 20% OFF"}
                  {...field}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={pointRewardForm.control}
            name="description"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                <Textarea
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  className="min-h-20 resize-none"
                  placeholder="Describe what the customer gets..."
                  {...field}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={pointRewardForm.control}
              name="rewardType"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Reward Type</FieldLabel>
                  <Select
                    name={field.name}
                    onValueChange={field.onChange}
                    value={field.value}
                    items={[
                      { value: "fixed-discount", label: "💰 Fixed Cashback" },
                      { value: "percentage-discount", label: "📊 Percentage Discount" },
                      { value: "free-item", label: "🎁 Free Item" },
                      { value: "free-service", label: "🚚 Free Service" },
                    ]}
                  >
                    <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed-discount">💰 Fixed Cashback</SelectItem>
                      <SelectItem value="percentage-discount">📊 Percentage Discount</SelectItem>
                      <SelectItem value="free-item">🎁 Free Item</SelectItem>
                      <SelectItem value="free-service">🚚 Free Service</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              control={pointRewardForm.control}
              name="pointsCost"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Points Cost</FieldLabel>
                  <Input
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    type="number"
                    placeholder="1000"
                    min="0"
                    {...field}
                    value={numberInputValue(field.value)}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>

          {pointRewardForm.watch("rewardType") === "fixed-discount" && (
            <Controller
              control={pointRewardForm.control}
              name="cashbackAmount"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Cashback Amount</FieldLabel>
                  <Input
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    type="number"
                    placeholder="10"
                    min="0"
                    {...field}
                    value={numberInputValue(field.value)}
                    onChange={(e) => field.onChange(Number.parseFloat(e.target.value) || 0)}
                  />
                  <FieldDescription>The amount to return to the customer</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          )}

          {pointRewardForm.watch("rewardType") === "percentage-discount" && (
            <Controller
              control={pointRewardForm.control}
              name="discountPercentage"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Discount Percentage (%)</FieldLabel>
                  <Input
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    type="number"
                    placeholder="10"
                    min="0"
                    max="100"
                    {...field}
                    value={numberInputValue(field.value)}
                    onChange={(e) => field.onChange(Number.parseFloat(e.target.value) || 0)}
                  />
                  <FieldDescription>Percentage to discount from the total</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          )}

          {(pointRewardForm.watch("rewardType") === "free-item" ||
            pointRewardForm.watch("rewardType") === "free-service") && (
            <Controller
              control={pointRewardForm.control}
              name="estimatedValue"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Estimated Value</FieldLabel>
                  <Input
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    type="number"
                    placeholder="25"
                    min="0"
                    {...field}
                    value={numberInputValue(field.value)}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                  <FieldDescription>Estimated monetary value of this reward</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          )}

          <Controller
            control={pointRewardForm.control}
            name="restrictions"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Terms and Conditions</FieldLabel>
                <Textarea
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  className="min-h-20 resize-none"
                  placeholder="Enter any terms, conditions, or restrictions for this reward..."
                  {...field}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <div className="pt-4 border-t">
            <h3 className="text-base font-medium mb-3">Redemption Rules (Optional)</h3>
            <div className="space-y-3">
              <div className="border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Minimum Spend</p>
                    <p className="text-xs text-muted-foreground">Require minimum purchase amount</p>
                  </div>
                  <Switch
                    checked={minimumSpendEnabled}
                    onCheckedChange={(checked) => {
                      setMinimumSpendEnabled(checked);
                      if (!checked) pointRewardForm.setValue("minimumSpend", undefined);
                    }}
                    className="data-[state=checked]:bg-[#1873E8]"
                  />
                </div>
                {minimumSpendEnabled && (
                  <Controller
                    control={pointRewardForm.control}
                    name="minimumSpend"
                    render={({ field, fieldState }) => (
                      <Field className="pt-2 border-t" data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name} className="text-xs">
                          Minimum Amount
                        </FieldLabel>
                        <Input
                          id={field.name}
                          aria-invalid={fieldState.invalid}
                          type="number"
                          placeholder="100"
                          min="0"
                          {...field}
                          value={numberInputValue(field.value)}
                          onChange={(e) => field.onChange(Number.parseFloat(e.target.value) || 0)}
                        />
                        <FieldDescription>
                          Customer must spend at least this amount to redeem
                        </FieldDescription>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                )}
              </div>
              <div className="border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Time Restrictions</p>
                    <p className="text-xs text-muted-foreground">Limit by day/time</p>
                  </div>
                  <Switch
                    checked={timeRestrictionsEnabled}
                    onCheckedChange={(checked) => {
                      setTimeRestrictionsEnabled(checked);
                      if (!checked) {
                        pointRewardForm.setValue("availableDays", undefined);
                        pointRewardForm.setValue("timeFrom", undefined);
                        pointRewardForm.setValue("timeTo", undefined);
                      }
                    }}
                    className="data-[state=checked]:bg-[#1873E8]"
                  />
                </div>
                {timeRestrictionsEnabled && (
                  <div className="pt-2 border-t space-y-3">
                    <Controller
                      control={pointRewardForm.control}
                      name="availableDays"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldTitle className="text-xs">Available Days</FieldTitle>
                          <div className="grid grid-cols-2 gap-2">
                            {DAYS_OF_WEEK.map((day) => (
                              <Field
                                key={day.value}
                                orientation="horizontal"
                                className="w-auto gap-2"
                              >
                                <Checkbox
                                  id={`day-${day.value}`}
                                  checked={field.value?.includes(day.value)}
                                  onCheckedChange={(checked) => {
                                    const updated = checked
                                      ? [...(field.value || []), day.value]
                                      : field.value?.filter((d) => d !== day.value) || [];
                                    field.onChange(updated);
                                  }}
                                />
                                <FieldLabel
                                  htmlFor={`day-${day.value}`}
                                  className="text-sm font-normal cursor-pointer"
                                >
                                  {day.label}
                                </FieldLabel>
                              </Field>
                            ))}
                          </div>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Controller
                        control={pointRewardForm.control}
                        name="timeFrom"
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={field.name} className="text-xs">
                              Start Time
                            </FieldLabel>
                            <Input
                              id={field.name}
                              aria-invalid={fieldState.invalid}
                              type="time"
                              {...field}
                            />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                      <Controller
                        control={pointRewardForm.control}
                        name="timeTo"
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor={field.name} className="text-xs">
                              End Time
                            </FieldLabel>
                            <Input
                              id={field.name}
                              aria-invalid={fieldState.invalid}
                              type="time"
                              {...field}
                            />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Tier Requirements</p>
                    <p className="text-xs text-muted-foreground">Restrict to specific tiers</p>
                  </div>
                  <Switch
                    checked={rewardTierRestriction}
                    onCheckedChange={setRewardTierRestriction}
                    className="data-[state=checked]:bg-[#1873E8]"
                  />
                </div>

                {rewardTierRestriction && (
                  <Controller
                    control={pointRewardForm.control}
                    name="tierIds"
                    render={({ field, fieldState }) => (
                      <Field className="pt-2 border-t" data-invalid={fieldState.invalid}>
                        <FieldTitle className="text-xs">Applicable Tiers</FieldTitle>
                        <div className="space-y-2">
                          {loyaltyTiers?.map((tier) => (
                            <Field key={tier.id} orientation="horizontal" className="w-auto gap-2">
                              <Checkbox
                                id={`tier-${tier.id}`}
                                checked={field.value?.includes(tier.id)}
                                onCheckedChange={(checked) => {
                                  const updatedTiers = checked
                                    ? [...(field.value || []), tier.id]
                                    : field.value?.filter((t) => t !== tier.id) || [];
                                  field.onChange(updatedTiers);
                                }}
                              />
                              <FieldLabel
                                htmlFor={`tier-${tier.id}`}
                                className="text-sm flex items-center gap-2 cursor-pointer font-normal"
                              >
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: tier.color }}
                                />
                                <span>{tier.name}</span>
                              </FieldLabel>
                            </Field>
                          ))}
                        </div>
                        <FieldDescription>
                          This reward will only be available to customers in the selected tiers
                        </FieldDescription>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                )}
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Coupon Form */}
      {category === "coupons" && (
        <form className="space-y-5">
          <Controller
            control={couponForm.control}
            name="couponCode"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Coupon Code</FieldLabel>
                <Input
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder="e.g., SAVE20"
                  className="font-mono"
                  {...field}
                />
                <FieldDescription>
                  Unique code customers will use to redeem this coupon
                </FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={couponForm.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Coupon Name</FieldLabel>
                <Input
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder="e.g., 20% Off Welcome Coupon"
                  {...field}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={couponForm.control}
            name="description"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                <Textarea
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  className="min-h-20 resize-none"
                  placeholder="Describe the coupon benefits..."
                  {...field}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={couponForm.control}
              name="discountType"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Discount Type</FieldLabel>
                  <Select
                    name={field.name}
                    onValueChange={field.onChange}
                    value={field.value}
                    items={[
                      { value: "percentage", label: "Percentage (%)" },
                      { value: "fixed", label: "Fixed Amount" },
                    ]}
                  >
                    <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              control={couponForm.control}
              name="discountValue"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Discount Value</FieldLabel>
                  <Input
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    type="number"
                    placeholder="20"
                    min="0"
                    {...field}
                    value={numberInputValue(field.value)}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>

          <Controller
            control={couponForm.control}
            name="minimumSpend"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Minimum Spend</FieldLabel>
                <Input
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  type="number"
                  placeholder="100"
                  min="0"
                  {...field}
                  value={numberInputValue(field.value)}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
                <FieldDescription>Minimum order value required to use this coupon</FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <div className="pt-4 border-t">
            <h3 className="text-base font-medium mb-3">Usage Limits</h3>
            <div className="grid grid-cols-2 gap-4">
              <Controller
                control={couponForm.control}
                name="stockQuantity"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Total Redemptions Allowed</FieldLabel>
                    <Input
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                      type="number"
                      placeholder="500"
                      min="1"
                      {...field}
                      value={numberInputValue(field.value)}
                      onChange={(e) => field.onChange(Number.parseInt(e.target.value) || 0)}
                    />
                    <FieldDescription>
                      Total number of times this coupon can be redeemed
                    </FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={couponForm.control}
                name="perUserLimit"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Per User Limit</FieldLabel>
                    <Input
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                      type="number"
                      placeholder="1"
                      min="1"
                      {...field}
                      value={numberInputValue(field.value)}
                      onChange={(e) => field.onChange(Number.parseInt(e.target.value) || 0)}
                    />
                    <FieldDescription>How many times a single user can redeem</FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-base font-medium mb-3">Validity Period</h3>
            <div className="grid grid-cols-2 gap-4">
              <Controller
                control={couponForm.control}
                name="validFrom"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Valid From</FieldLabel>
                    <Input
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                      type="date"
                      {...field}
                      value={field.value || ""}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={couponForm.control}
                name="validTo"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Valid To</FieldLabel>
                    <Input
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                      type="date"
                      {...field}
                      value={field.value || ""}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
          </div>

          <Controller
            control={couponForm.control}
            name="termsAndConditions"
            render={({ field, fieldState }) => (
              <Field className="pt-4 border-t" data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Terms and Conditions</FieldLabel>
                <Textarea
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  className="min-h-20 resize-none"
                  placeholder="Enter any terms, conditions, or restrictions for this coupon..."
                  {...field}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <div className="pt-4 border-t">
            <h3 className="text-base font-medium mb-3">Tier Restrictions (Optional)</h3>
            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Tier Requirements</p>
                  <p className="text-xs text-muted-foreground">Restrict to specific tiers</p>
                </div>
                <Switch
                  checked={rewardTierRestriction}
                  onCheckedChange={setRewardTierRestriction}
                  className="data-[state=checked]:bg-[#1873E8]"
                />
              </div>

              {rewardTierRestriction && (
                <Controller
                  control={couponForm.control}
                  name="tierIds"
                  render={({ field, fieldState }) => (
                    <Field className="pt-2 border-t" data-invalid={fieldState.invalid}>
                      <FieldTitle className="text-xs">Applicable Tiers</FieldTitle>
                      <div className="space-y-2">
                        {loyaltyTiers?.map((tier) => (
                          <Field key={tier.id} orientation="horizontal" className="w-auto gap-2">
                            <Checkbox
                              id={`coupon-create-tier-${tier.id}`}
                              checked={field.value?.includes(tier.id)}
                              onCheckedChange={(checked) => {
                                const updatedTiers = checked
                                  ? [...(field.value || []), tier.id]
                                  : field.value?.filter((t) => t !== tier.id) || [];
                                field.onChange(updatedTiers);
                              }}
                            />
                            <FieldLabel
                              htmlFor={`coupon-create-tier-${tier.id}`}
                              className="text-sm flex items-center gap-2 cursor-pointer font-normal"
                            >
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: tier.color }}
                              />
                              <span>{tier.name}</span>
                            </FieldLabel>
                          </Field>
                        ))}
                      </div>
                      <FieldDescription>
                        This coupon will only be available to customers in the selected tiers
                      </FieldDescription>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              )}
            </div>
          </div>
        </form>
      )}

      {/* Free Gifts Form */}
      {category === "free-gifts" && (
        <form className="space-y-5">
          <Controller
            control={giftForm.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Gift Name</FieldLabel>
                <Input
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder="e.g., Premium Coffee Mug, Wireless Earbuds"
                  {...field}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={giftForm.control}
            name="description"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                <Textarea
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  className="min-h-20 resize-none"
                  placeholder="Describe the gift item and its features..."
                  {...field}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={giftForm.control}
            name="giftQuantity"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Total Quantity Available</FieldLabel>
                <Input
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  type="number"
                  placeholder="100"
                  min="1"
                  {...field}
                  value={numberInputValue(field.value)}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                />
                <FieldDescription>Total number of gifts available for assignment</FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <div className="pt-4 border-t">
            <h3 className="text-base font-medium mb-3">Code Generation</h3>
            <div className="space-y-3">
              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Auto-Generate Codes</p>
                    <p className="text-xs text-muted-foreground">
                      Generate unique codes for each gift automatically
                    </p>
                  </div>
                  <Switch defaultChecked className="data-[state=checked]:bg-[#1873E8]" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-base font-medium mb-3">Delivery Information (Optional)</h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <FieldLabel htmlFor={`${uid}-shipping-required`} className="text-xs">
                  Shipping Required
                </FieldLabel>
                <Switch
                  id={`${uid}-shipping-required`}
                  className="data-[state=checked]:bg-[#1873E8]"
                />
                <p className="text-xs text-muted-foreground">
                  Enable if physical delivery is required
                </p>
              </div>
            </div>
          </div>

          <Controller
            control={giftForm.control}
            name="restrictions"
            render={({ field, fieldState }) => (
              <Field className="pt-4 border-t" data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Terms and Conditions</FieldLabel>
                <Textarea
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  className="min-h-20 resize-none"
                  placeholder="Enter any terms, conditions, or restrictions for this gift..."
                  {...field}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <div className="pt-4 border-t">
            <h3 className="text-base font-medium mb-3">Tier Restrictions (Optional)</h3>
            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Tier Requirements</p>
                  <p className="text-xs text-muted-foreground">Restrict to specific tiers</p>
                </div>
                <Switch
                  checked={rewardTierRestriction}
                  onCheckedChange={setRewardTierRestriction}
                  className="data-[state=checked]:bg-[#1873E8]"
                />
              </div>

              {rewardTierRestriction && (
                <Controller
                  control={giftForm.control}
                  name="tierIds"
                  render={({ field, fieldState }) => (
                    <Field className="pt-2 border-t" data-invalid={fieldState.invalid}>
                      <FieldTitle className="text-xs">Applicable Tiers</FieldTitle>
                      <div className="space-y-2">
                        {loyaltyTiers?.map((tier) => (
                          <Field key={tier.id} orientation="horizontal" className="w-auto gap-2">
                            <Checkbox
                              id={`gift-create-tier-${tier.id}`}
                              checked={field.value?.includes(tier.id)}
                              onCheckedChange={(checked) => {
                                const updatedTiers = checked
                                  ? [...(field.value || []), tier.id]
                                  : field.value?.filter((t) => t !== tier.id) || [];
                                field.onChange(updatedTiers);
                              }}
                            />
                            <FieldLabel
                              htmlFor={`gift-create-tier-${tier.id}`}
                              className="text-sm flex items-center gap-2 cursor-pointer font-normal"
                            >
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: tier.color }}
                              />
                              <span>{tier.name}</span>
                            </FieldLabel>
                          </Field>
                        ))}
                      </div>
                      <FieldDescription>
                        This gift will only be available to customers in the selected tiers
                      </FieldDescription>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              )}
            </div>
          </div>
        </form>
      )}

      {/* Referral Reward Form */}
      {category === "referral" && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-[#1873E8] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#1873E8] mb-1">
                  Referral System is Automated
                </p>
                <p className="text-xs text-muted-foreground">
                  The referral program is managed automatically. Configure the points in the
                  Referral tab above. You don't need to create individual referral rewards.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
