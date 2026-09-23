import type { FastifyRequest } from "fastify";
import { z } from "zod";
import { PaymentPlanStatus, PaymentPlanType } from "../../../../generated/prisma/enums.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { syncPaymentPlans } from "../../payment/payment.service.js";
import { syncStripeProducts } from "../../payment/stripe/stripe.service.js";
import { reasonSchema, subscriptionFeaturesSchema } from "../orgs/subscription.schema.js";
import { StaffHttpError } from "../staff.errors.js";
import { recordStaffAction } from "../staffAudit.js";

/*
 * The catalog, written from the console. Three kinds of row: a RateUp tier (what a
 * customer sees and what `applyPlanToOrg` copies features from), the Razorpay plans and
 * Stripe products a tier sells through. Gateway rows come in by sync and are only ever
 * switched on/off or removed here; their prices live at the gateway.
 */

export const reasonBodySchema = z.object({ reason: reasonSchema });
export type ReasonBody = z.infer<typeof reasonBodySchema>;

export const gatewayStatusSchema = z.object({
  status: z.enum(PaymentPlanStatus),
  reason: reasonSchema,
});
export type GatewayStatusInput = z.infer<typeof gatewayStatusSchema>;

const optionalUuid = z.uuid().nullable().optional();
const money = z.number().min(0).max(1_000_000).nullable().optional();

const tierFields = {
  name: z.string().trim().min(1).max(80),
  displayName: z.string().trim().min(1).max(80),
  planType: z.enum(PaymentPlanType),
  badge: z.string().trim().max(40).nullable().optional(),
  description: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  displayWidgetId: z.string().trim().max(120).nullable().optional(),
  features: subscriptionFeaturesSchema.nullable().optional(),
  price: money,
  currency: z.enum(["INR", "USD"]).nullable().optional(),
  monthlyPrice: money,
  yearlyPrice: money,
  usdMonthlyPrice: money,
  usdYearlyPrice: money,
  paymentPlanId: optionalUuid,
  monthlyPaymentPlanId: optionalUuid,
  yearlyPaymentPlanId: optionalUuid,
  usdMonthlyPaymentPlanId: optionalUuid,
  usdYearlyPaymentPlanId: optionalUuid,
  stripeId: optionalUuid,
};

export const tierCreateSchema = z.object({ ...tierFields, reason: reasonSchema });
export type TierCreateInput = z.infer<typeof tierCreateSchema>;

export const tierUpdateSchema = z.object({
  ...Object.fromEntries(
    Object.entries(tierFields).map(([key, schema]) => [key, schema.optional()]),
  ),
  reason: reasonSchema,
}) as z.ZodObject<
  { [K in keyof typeof tierFields]: z.ZodOptional<(typeof tierFields)[K]> } & {
    reason: typeof reasonSchema;
  }
>;
export type TierUpdateInput = z.infer<typeof tierUpdateSchema>;

const GATEWAY_SLOTS = [
  "paymentPlanId",
  "monthlyPaymentPlanId",
  "yearlyPaymentPlanId",
  "usdMonthlyPaymentPlanId",
  "usdYearlyPaymentPlanId",
] as const;

/**
 * Each gateway plan and Stripe product can be sold by one tier only (the columns are
 * unique), so a link another tier already holds is refused with a readable message rather
 * than a constraint error.
 */
async function assertLinksFree(
  input: Partial<Record<(typeof GATEWAY_SLOTS)[number] | "stripeId", string | null | undefined>>,
  exceptTierId?: string,
) {
  const razorpayIds = GATEWAY_SLOTS.map((slot) => input[slot]).filter(
    (id): id is string => typeof id === "string",
  );
  if (new Set(razorpayIds).size !== razorpayIds.length) {
    throw new StaffHttpError(422, "DUPLICATE_LINK", "The same Razorpay plan is linked twice.");
  }
  const not = exceptTierId ? { id: { not: exceptTierId } } : {};
  if (razorpayIds.length) {
    const taken = await prisma.rateupPlan.findFirst({
      where: {
        ...not,
        OR: GATEWAY_SLOTS.map((slot) => ({ [slot]: { in: razorpayIds } })),
      },
      select: { name: true },
    });
    if (taken) {
      throw new StaffHttpError(
        409,
        "LINK_TAKEN",
        `A Razorpay plan chosen here is already sold by “${taken.name}”.`,
      );
    }
  }
  if (input.stripeId) {
    const taken = await prisma.rateupPlan.findFirst({
      where: { ...not, stripeId: input.stripeId },
      select: { name: true },
    });
    if (taken) {
      throw new StaffHttpError(
        409,
        "LINK_TAKEN",
        `That Stripe product is already sold by “${taken.name}”.`,
      );
    }
  }
}

const tierNotFound = () => new StaffHttpError(404, "PLAN_NOT_FOUND", "No such plan.");

export async function createTier(request: FastifyRequest, input: TierCreateInput) {
  const { reason, ...data } = input;
  await assertLinksFree(data);
  return prisma.$transaction(async (tx) => {
    if (data.displayWidgetId) {
      // The widget shows one plan; pointing it here unpoints it elsewhere.
      await tx.rateupPlan.updateMany({
        where: { displayWidgetId: data.displayWidgetId },
        data: { displayWidgetId: null },
      });
    }
    const plan = await tx.rateupPlan.create({
      data: { ...data, features: data.features ?? undefined },
    });
    await recordStaffAction(tx, request, {
      action: "catalog.tier_create",
      reason,
      after: { id: plan.id, name: plan.name, planType: plan.planType },
    });
    return plan;
  });
}

export async function updateTier(request: FastifyRequest, id: string, input: TierUpdateInput) {
  const { reason, ...data } = input;
  const existing = await prisma.rateupPlan.findUnique({ where: { id } });
  if (!existing) throw tierNotFound();
  await assertLinksFree(data, id);
  return prisma.$transaction(async (tx) => {
    if (data.displayWidgetId) {
      await tx.rateupPlan.updateMany({
        where: { displayWidgetId: data.displayWidgetId, id: { not: id } },
        data: { displayWidgetId: null },
      });
    }
    const plan = await tx.rateupPlan.update({
      where: { id },
      data: { ...data, features: data.features === null ? undefined : data.features },
    });
    await recordStaffAction(tx, request, {
      action: "catalog.tier_update",
      reason,
      before: existing,
      after: plan,
    });
    return plan;
  });
}

/**
 * A tier with subscriptions on it cannot go: every org's `basePlanId` points at it, and
 * their features were copied from it. Move them first (each org's Change plan).
 */
export async function deleteTier(request: FastifyRequest, id: string, input: ReasonBody) {
  const existing = await prisma.rateupPlan.findUnique({
    where: { id },
    include: { _count: { select: { Subscription: true, addons: true, orders: true } } },
  });
  if (!existing) throw tierNotFound();
  if (existing._count.Subscription > 0) {
    throw new StaffHttpError(
      409,
      "PLAN_IN_USE",
      `${existing._count.Subscription} organisation(s) are on this plan. Move them first.`,
    );
  }
  if (existing._count.addons > 0 || existing._count.orders > 0) {
    throw new StaffHttpError(
      409,
      "PLAN_HAS_HISTORY",
      "Orders or add-on packs reference this plan; it can be retired but not deleted.",
    );
  }
  return prisma.$transaction(async (tx) => {
    await tx.rateupPlan.delete({ where: { id } });
    const { _count, ...before } = existing;
    await recordStaffAction(tx, request, {
      action: "catalog.tier_delete",
      reason: input.reason,
      before,
    });
    return { deleted: true };
  });
}

export async function syncRazorpay(request: FastifyRequest, input: ReasonBody) {
  const result = await syncPaymentPlans();
  if (!result.success) {
    log.warn({ error: result.error }, "staff: Razorpay sync failed");
    throw new StaffHttpError(502, "GATEWAY_ERROR", "Razorpay did not answer. Try again.");
  }
  await recordStaffAction(prisma, request, {
    action: "catalog.razorpay_sync",
    reason: input.reason,
    after: result.data,
  });
  return result.data;
}

export async function setRazorpayPlanStatus(
  request: FastifyRequest,
  id: string,
  input: GatewayStatusInput,
) {
  const existing = await prisma.paymentPlans.findUnique({ where: { id } });
  if (!existing) throw new StaffHttpError(404, "GATEWAY_PLAN_NOT_FOUND", "No such Razorpay plan.");
  return prisma.$transaction(async (tx) => {
    const plan = await tx.paymentPlans.update({ where: { id }, data: { status: input.status } });
    await recordStaffAction(tx, request, {
      action: "catalog.razorpay_status",
      reason: input.reason,
      before: { planId: existing.planId, name: existing.name, status: existing.status },
      after: { planId: plan.planId, name: plan.name, status: plan.status },
    });
    return plan;
  });
}

/** Only a plan no tier sells and that is not on sale; the next sync would bring it back anyway. */
export async function deleteRazorpayPlan(request: FastifyRequest, id: string, input: ReasonBody) {
  const existing = await prisma.paymentPlans.findUnique({
    where: { id },
    include: {
      RateupPlan: { select: { name: true } },
      monthlyRateupPlan: { select: { name: true } },
      yearlyRateupPlan: { select: { name: true } },
      usdMonthlyRateupPlan: { select: { name: true } },
      usdYearlyRateupPlan: { select: { name: true } },
    },
  });
  if (!existing) throw new StaffHttpError(404, "GATEWAY_PLAN_NOT_FOUND", "No such Razorpay plan.");
  const tier =
    existing.RateupPlan ??
    existing.monthlyRateupPlan ??
    existing.yearlyRateupPlan ??
    existing.usdMonthlyRateupPlan ??
    existing.usdYearlyRateupPlan;
  if (tier) {
    throw new StaffHttpError(
      409,
      "LINKED",
      `“${tier.name}” sells through this plan. Unlink it first.`,
    );
  }
  if (existing.status === PaymentPlanStatus.ACTIVE || existing.status === PaymentPlanStatus.LIVE) {
    throw new StaffHttpError(409, "ON_SALE", "Switch the plan off before removing it.");
  }
  return prisma.$transaction(async (tx) => {
    await tx.paymentPlans.delete({ where: { id } });
    await recordStaffAction(tx, request, {
      action: "catalog.razorpay_delete",
      reason: input.reason,
      before: { planId: existing.planId, name: existing.name, status: existing.status },
    });
    return { deleted: true };
  });
}

export async function syncStripe(request: FastifyRequest, input: ReasonBody) {
  const before = await prisma.stripeProducts.count();
  try {
    await syncStripeProducts();
  } catch (err) {
    log.warn({ err }, "staff: Stripe sync failed");
    throw new StaffHttpError(502, "GATEWAY_ERROR", "Stripe did not answer. Try again.");
  }
  const after = await prisma.stripeProducts.count();
  const summary = { created: after - before, total: after };
  await recordStaffAction(prisma, request, {
    action: "catalog.stripe_sync",
    reason: input.reason,
    after: summary,
  });
  return summary;
}

export async function setStripeProductStatus(
  request: FastifyRequest,
  id: string,
  input: GatewayStatusInput,
) {
  const existing = await prisma.stripeProducts.findUnique({ where: { id } });
  if (!existing) throw new StaffHttpError(404, "PRODUCT_NOT_FOUND", "No such Stripe product.");
  return prisma.$transaction(async (tx) => {
    const product = await tx.stripeProducts.update({
      where: { id },
      data: { status: input.status },
    });
    await recordStaffAction(tx, request, {
      action: "catalog.stripe_status",
      reason: input.reason,
      before: { productId: existing.productId, name: existing.name, status: existing.status },
      after: { productId: product.productId, name: product.name, status: product.status },
    });
    return product;
  });
}

export async function deleteStripeProduct(request: FastifyRequest, id: string, input: ReasonBody) {
  const existing = await prisma.stripeProducts.findUnique({
    where: { id },
    include: { RateupPlan: { select: { name: true } } },
  });
  if (!existing) throw new StaffHttpError(404, "PRODUCT_NOT_FOUND", "No such Stripe product.");
  if (existing.RateupPlan) {
    throw new StaffHttpError(
      409,
      "LINKED",
      `“${existing.RateupPlan.name}” sells through this product. Unlink it first.`,
    );
  }
  if (existing.status === PaymentPlanStatus.ACTIVE || existing.status === PaymentPlanStatus.LIVE) {
    throw new StaffHttpError(409, "ON_SALE", "Switch the product off before removing it.");
  }
  return prisma.$transaction(async (tx) => {
    await tx.stripeProducts.delete({ where: { id } });
    await recordStaffAction(tx, request, {
      action: "catalog.stripe_delete",
      reason: input.reason,
      before: { productId: existing.productId, name: existing.name, status: existing.status },
    });
    return { deleted: true };
  });
}
