"use client";

import { Info } from "lucide-react";
import { UseFormReturn } from "react-hook-form";

import {
  CouponFormValues,
  GiftFormValues,
  PointRewardFormValues,
} from "@/app/dashboard/loyalty/rewards/schemas";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

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
  loyaltyTiers: any[] | undefined;
  loyaltyTemplates: any[] | undefined;
}

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
  loyaltyTemplates,
}: Readonly<LoyaltyRewardFormProps>) {
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
        <Form {...pointRewardForm}>
          <form className="space-y-5">
            <FormField
              control={pointRewardForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reward Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={`e.g., ${loyaltyTiers?.[0]?.program?.currencyCode || "INR"} 10 Cashback, Free Coffee, 20% OFF`}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={pointRewardForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-20 resize-none"
                      placeholder="Describe what the customer gets..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={pointRewardForm.control}
                name="rewardType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reward Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fixed-discount">
                          💰 Fixed Cashback
                        </SelectItem>
                        <SelectItem value="percentage-discount">
                          📊 Percentage Discount
                        </SelectItem>
                        <SelectItem value="free-item">🎁 Free Item</SelectItem>
                        <SelectItem value="free-service">
                          🚚 Free Service
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={pointRewardForm.control}
                name="pointsCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points Cost</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="1000"
                        min="0"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {pointRewardForm.watch("rewardType") === "fixed-discount" && (
              <FormField
                control={pointRewardForm.control}
                name="cashbackAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cashback Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="10"
                        min="0"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      The amount to return to the customer
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {pointRewardForm.watch("rewardType") === "percentage-discount" && (
              <FormField
                control={pointRewardForm.control}
                name="discountPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Percentage (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="10"
                        min="0"
                        max="100"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Percentage to discount from the total
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {(pointRewardForm.watch("rewardType") === "free-item" ||
              pointRewardForm.watch("rewardType") === "free-service") && (
              <FormField
                control={pointRewardForm.control}
                name="estimatedValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Value</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="25"
                        min="0"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Estimated monetary value of this reward
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={pointRewardForm.control}
              name="restrictions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terms and Conditions</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-20 resize-none"
                      placeholder="Enter any terms, conditions, or restrictions for this reward..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4 border-t">
              <h3 className="text-base font-medium mb-3">
                Redemption Rules (Optional)
              </h3>
              <div className="space-y-3">
                <div className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Minimum Spend</p>
                      <p className="text-xs text-muted-foreground">
                        Require minimum purchase amount
                      </p>
                    </div>
                    <Switch
                      checked={minimumSpendEnabled}
                      onCheckedChange={(checked) => {
                        setMinimumSpendEnabled(checked);
                        if (!checked)
                          pointRewardForm.setValue("minimumSpend", undefined);
                      }}
                      className="data-[state=checked]:bg-[#1873E8]"
                    />
                  </div>
                  {minimumSpendEnabled && (
                    <FormField
                      control={pointRewardForm.control}
                      name="minimumSpend"
                      render={({ field }) => (
                        <FormItem className="pt-2 border-t">
                          <FormLabel className="text-xs">
                            Minimum Amount
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="100"
                              min="0"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  Number.parseFloat(e.target.value) || 0,
                                )
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            Customer must spend at least this amount to redeem
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                <div className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Time Restrictions</p>
                      <p className="text-xs text-muted-foreground">
                        Limit by day/time
                      </p>
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
                      <FormField
                        control={pointRewardForm.control}
                        name="availableDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Available Days
                            </FormLabel>
                            <div className="grid grid-cols-2 gap-2">
                              {DAYS_OF_WEEK.map((day) => (
                                <div
                                  key={day.value}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    id={`day-${day.value}`}
                                    checked={field.value?.includes(day.value)}
                                    onCheckedChange={(checked) => {
                                      const updated = checked
                                        ? [...(field.value || []), day.value]
                                        : field.value?.filter(
                                            (d) => d !== day.value,
                                          ) || [];
                                      field.onChange(updated);
                                    }}
                                  />
                                  <Label
                                    htmlFor={`day-${day.value}`}
                                    className="text-sm font-normal cursor-pointer"
                                  >
                                    {day.label}
                                  </Label>
                                </div>
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={pointRewardForm.control}
                          name="timeFrom"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                Start Time
                              </FormLabel>
                              <FormControl>
                                <Input type="time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={pointRewardForm.control}
                          name="timeTo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                End Time
                              </FormLabel>
                              <FormControl>
                                <Input type="time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
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
                      <p className="text-xs text-muted-foreground">
                        Restrict to specific tiers
                      </p>
                    </div>
                    <Switch
                      checked={rewardTierRestriction}
                      onCheckedChange={setRewardTierRestriction}
                      className="data-[state=checked]:bg-[#1873E8]"
                    />
                  </div>

                  {rewardTierRestriction && (
                    <FormField
                      control={pointRewardForm.control}
                      name="tierIds"
                      render={({ field }) => (
                        <FormItem className="pt-2 border-t">
                          <FormLabel className="text-xs">
                            Applicable Tiers
                          </FormLabel>
                          <div className="space-y-2">
                            {loyaltyTiers?.map((tier) => (
                              <div
                                key={tier.id}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={`tier-${tier.id}`}
                                  checked={field.value?.includes(tier.id)}
                                  onCheckedChange={(checked) => {
                                    const updatedTiers = checked
                                      ? [...(field.value || []), tier.id]
                                      : field.value?.filter(
                                          (t) => t !== tier.id,
                                        ) || [];
                                    field.onChange(updatedTiers);
                                  }}
                                />
                                <Label
                                  htmlFor={`tier-${tier.id}`}
                                  className="text-sm flex items-center gap-2 cursor-pointer font-normal"
                                >
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: tier.color }}
                                  />
                                  <span>{tier.name}</span>
                                </Label>
                              </div>
                            ))}
                          </div>
                          <FormDescription>
                            This reward will only be available to customers in
                            the selected tiers
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>
            </div>
          </form>
        </Form>
      )}

      {/* Coupon Form */}
      {category === "coupons" && (
        <Form {...couponForm}>
          <form className="space-y-5">
            <FormField
              control={couponForm.control}
              name="couponCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coupon Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., SAVE20"
                      className="font-mono"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Unique code customers will use to redeem this coupon
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={couponForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coupon Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 20% Off Welcome Coupon"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={couponForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-20 resize-none"
                      placeholder="Describe the coupon benefits..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                {/* Placeholder for Discount Type Select if needed in schema, assuming simplified for now or missing from provided excerpt logic */}
                <Label>Discount Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Placeholder for Discount Value, not in schema provided earlier but usually needed */}
              <div className="space-y-2">
                <Label>Discount Value</Label>
                <Input type="number" placeholder="20" min="0" />
              </div>
            </div>

            <FormField
              control={couponForm.control}
              name="minimumSpend"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Spend</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="100"
                      min="0"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Minimum order value required to use this coupon
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4 border-t">
              <h3 className="text-base font-medium mb-3">Usage Limits</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={couponForm.control}
                  name="stockQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Redemptions Allowed</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="500"
                          min="1"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Total number of times this coupon can be redeemed
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <Label>Per User Limit</Label>
                  <Input type="number" placeholder="1" min="1" />
                  <p className="text-xs text-muted-foreground">
                    How many times a single user can redeem
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-base font-medium mb-3">Validity Period</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valid From</Label>
                  <Input type="date" />
                </div>
                <div className="space-y-2">
                  <Label>Valid To</Label>
                  <Input type="date" />
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              {/* Restrictions were simple text area in original */}
              <Label>Terms and Conditions</Label>
              <Textarea
                className="min-h-20 resize-none"
                placeholder="Enter any terms, conditions, or restrictions for this coupon..."
              />
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-base font-medium mb-3">
                Tier Restrictions (Optional)
              </h3>
              <div className="border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Tier Requirements</p>
                    <p className="text-xs text-muted-foreground">
                      Restrict to specific tiers
                    </p>
                  </div>
                  <Switch
                    checked={rewardTierRestriction}
                    onCheckedChange={setRewardTierRestriction}
                    className="data-[state=checked]:bg-[#1873E8]"
                  />
                </div>

                {rewardTierRestriction && (
                  <FormField
                    control={couponForm.control}
                    name="tierIds"
                    render={({ field }) => (
                      <FormItem className="pt-2 border-t">
                        <FormLabel className="text-xs">
                          Applicable Tiers
                        </FormLabel>
                        <div className="space-y-2">
                          {loyaltyTiers?.map((tier) => (
                            <div
                              key={tier.id}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`coupon-create-tier-${tier.id}`}
                                checked={field.value?.includes(tier.id)}
                                onCheckedChange={(checked) => {
                                  const updatedTiers = checked
                                    ? [...(field.value || []), tier.id]
                                    : field.value?.filter(
                                        (t) => t !== tier.id,
                                      ) || [];
                                  field.onChange(updatedTiers);
                                }}
                              />
                              <Label
                                htmlFor={`coupon-create-tier-${tier.id}`}
                                className="text-sm flex items-center gap-2 cursor-pointer font-normal"
                              >
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: tier.color }}
                                />
                                <span>{tier.name}</span>
                              </Label>
                            </div>
                          ))}
                        </div>
                        <FormDescription>
                          This coupon will only be available to customers in the
                          selected tiers
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>
          </form>
        </Form>
      )}

      {/* Free Gifts Form */}
      {category === "free-gifts" && (
        <Form {...giftForm}>
          <form className="space-y-5">
            <FormField
              control={giftForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gift Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Premium Coffee Mug, Wireless Earbuds"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={giftForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-20 resize-none"
                      placeholder="Describe the gift item and its features..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={giftForm.control}
              name="giftQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Quantity Available</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="100"
                      min="1"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Total number of gifts available for assignment
                  </FormDescription>
                  <FormMessage />
                </FormItem>
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
                    <Switch
                      defaultChecked
                      className="data-[state=checked]:bg-[#1873E8]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-base font-medium mb-3">
                Delivery Information (Optional)
              </h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Shipping Required</Label>
                  <Switch className="data-[state=checked]:bg-[#1873E8]" />
                  <p className="text-xs text-muted-foreground">
                    Enable if physical delivery is required
                  </p>
                </div>
              </div>
            </div>

            <FormField
              control={giftForm.control}
              name="restrictions"
              render={({ field }) => (
                <FormItem className="pt-4 border-t">
                  <FormLabel>Terms and Conditions</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-20 resize-none"
                      placeholder="Enter any terms, conditions, or restrictions for this gift..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4 border-t">
              <h3 className="text-base font-medium mb-3">
                Tier Restrictions (Optional)
              </h3>
              <div className="border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Tier Requirements</p>
                    <p className="text-xs text-muted-foreground">
                      Restrict to specific tiers
                    </p>
                  </div>
                  <Switch
                    checked={rewardTierRestriction}
                    onCheckedChange={setRewardTierRestriction}
                    className="data-[state=checked]:bg-[#1873E8]"
                  />
                </div>

                {rewardTierRestriction && (
                  <FormField
                    control={giftForm.control}
                    name="tierIds"
                    render={({ field }) => (
                      <FormItem className="pt-2 border-t">
                        <FormLabel className="text-xs">
                          Applicable Tiers
                        </FormLabel>
                        <div className="space-y-2">
                          {loyaltyTiers?.map((tier) => (
                            <div
                              key={tier.id}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`gift-create-tier-${tier.id}`}
                                checked={field.value?.includes(tier.id)}
                                onCheckedChange={(checked) => {
                                  const updatedTiers = checked
                                    ? [...(field.value || []), tier.id]
                                    : field.value?.filter(
                                        (t) => t !== tier.id,
                                      ) || [];
                                  field.onChange(updatedTiers);
                                }}
                              />
                              <Label
                                htmlFor={`gift-create-tier-${tier.id}`}
                                className="text-sm flex items-center gap-2 cursor-pointer font-normal"
                              >
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: tier.color }}
                                />
                                <span>{tier.name}</span>
                              </Label>
                            </div>
                          ))}
                        </div>
                        <FormDescription>
                          This gift will only be available to customers in the
                          selected tiers
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>
          </form>
        </Form>
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
                  The referral program is managed automatically. Configure the
                  points in the Referral tab above. You don't need to create
                  individual referral rewards.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
