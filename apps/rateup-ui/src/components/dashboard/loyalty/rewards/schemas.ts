import { z } from "zod";

export const pointRewardSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  rewardType: z.enum(["fixed-discount", "percentage-discount", "free-item", "free-service"]),
  pointsCost: z.coerce.number().min(0, "Points must be 0 or greater"),
  cashbackAmount: z.coerce.number().optional(),
  discountPercentage: z.coerce.number().min(0).max(100).optional(),
  estimatedValue: z.coerce.number().min(0).optional(),
  restrictions: z.string().optional(),
  waTemplateId: z.string().optional(),
  tierIds: z.array(z.string()).optional(),
  minimumSpend: z.coerce.number().min(0).optional(),
  availableDays: z.array(z.string()).optional(),
  timeFrom: z.string().optional(),
  timeTo: z.string().optional(),
  /** Mirror each redemption code into the connected Shopify store as a discount code. */
  shopifyDiscountEnabled: z.boolean().optional(),
  /** Days the Shopify code stays valid from issue. Blank = no expiry. */
  shopifyValidForDays: z.coerce.number().int().min(1).optional(),
});

const couponBaseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  /**
   * The one code every customer types. A Shopify-synced coupon has none: each redemption gets
   * its own generated code, so the field is hidden and not required — see the refinement below.
   */
  couponCode: z.string().optional(),
  couponDescription: z.string().optional(),
  discountType: z.enum(["percentage", "fixed"]).optional(),
  discountValue: z.coerce.number().min(0).optional(),
  /**
   * Zero is not "unlimited", it is "out of stock": `validateStock` refuses a redemption as soon
   * as `stockRedeemed >= stockQuantity`, so a coupon saved with 0 can never be redeemed by
   * anyone. One is the smallest coupon that actually works.
   */
  stockQuantity: z.coerce.number().min(1, "Allow at least one redemption").optional(),
  perUserLimit: z.coerce.number().min(1).optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  termsAndConditions: z.string().optional(),
  minimumSpend: z.coerce.number().min(0).optional(),
  waTemplateId: z.string().optional(),
  tierIds: z.array(z.string()).optional(),
  /**
   * No `shopifyValidForDays` here on purpose: a coupon already states when it stops working,
   * in Valid To, and the Shopify code is built to end with it.
   */
  shopifyDiscountEnabled: z.boolean().optional(),
});

export const couponSchema = couponBaseSchema.superRefine((value, ctx) => {
  if (!value.shopifyDiscountEnabled && !value.couponCode?.trim()) {
    ctx.addIssue({
      code: "custom",
      path: ["couponCode"],
      message: "Coupon code is required",
    });
  }
});

export const giftSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  giftQuantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  estimatedValue: z.coerce.number().min(0).optional(),
  restrictions: z.string().optional(),
  waTemplateId: z.string().optional(),
  tierIds: z.array(z.string()).optional(),
});

/**
 * The forms hold what the inputs produce (`z.input`): the numeric fields are
 * coerced on submit, so the parsed output type differs.
 */
export type PointRewardFormValues = z.input<typeof pointRewardSchema>;
export type CouponFormValues = z.input<typeof couponSchema>;
export type GiftFormValues = z.input<typeof giftSchema>;

/** The parsed values a submit handler receives. */
export type PointRewardValues = z.output<typeof pointRewardSchema>;
export type CouponValues = z.output<typeof couponSchema>;
export type GiftValues = z.output<typeof giftSchema>;
