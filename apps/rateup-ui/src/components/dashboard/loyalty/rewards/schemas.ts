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
});

export const couponSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  couponCode: z.string().min(1, "Coupon code is required"),
  couponDescription: z.string().optional(),
  discountType: z.enum(["percentage", "fixed"]).optional(),
  discountValue: z.coerce.number().min(0).optional(),
  stockQuantity: z.coerce.number().min(0).optional(),
  perUserLimit: z.coerce.number().min(1).optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  termsAndConditions: z.string().optional(),
  minimumSpend: z.coerce.number().min(0).optional(),
  waTemplateId: z.string().optional(),
  tierIds: z.array(z.string()).optional(),
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

export type PointRewardFormValues = z.infer<typeof pointRewardSchema>;
export type CouponFormValues = z.infer<typeof couponSchema>;
export type GiftFormValues = z.infer<typeof giftSchema>;
