import { randomBytes } from "node:crypto";

import type {
  Prisma,
  ShopDiscount,
  ShopDiscountEligibility,
  ShopDiscountType,
} from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import type { DiscountRule, DiscountScope } from "./pricing.js";
import { toNumber } from "./pricing.js";
import { notFound, ShopError } from "./shop.errors.js";

export interface DiscountInput {
  code: string;
  title?: string | null;
  type: ShopDiscountType;
  value?: number | null;
  buyQty?: number | null;
  getQty?: number | null;
  minSubtotal?: number | null;
  appliesTo?: "ALL" | "COLLECTIONS" | "PRODUCTS";
  collectionIds?: string[];
  productIds?: string[];
  eligibility?: ShopDiscountEligibility;
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  startsAt?: Date;
  endsAt?: Date | null;
  active?: boolean;
  source?: string;
}

export const normaliseCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, "");

export function generateCode(prefix = "") {
  return `${normaliseCode(prefix)}${randomBytes(3).toString("hex").toUpperCase()}`;
}

function check(input: DiscountInput) {
  const code = normaliseCode(input.code);
  if (!/^[A-Z0-9_-]{3,32}$/.test(code))
    throw new ShopError("INVALID", "Codes are 3–32 letters, numbers, - or _");
  if (input.type === "PERCENTAGE" && !(input.value! > 0 && input.value! <= 100))
    throw new ShopError("INVALID", "Percent off must be between 1 and 100");
  if (input.type === "FIXED" && !(input.value! > 0))
    throw new ShopError("INVALID", "Enter the amount off");
  if (input.type === "BUY_X_GET_Y" && !(input.buyQty! >= 1 && input.getQty! >= 1))
    throw new ShopError("INVALID", "Enter how many to buy and how many they get");
  if (input.endsAt && input.startsAt && input.endsAt <= input.startsAt)
    throw new ShopError("INVALID", "The end date must be after the start");
  return code;
}

function toData(input: DiscountInput, code: string) {
  return {
    code,
    title: input.title ?? null,
    type: input.type,
    value: input.type === "BUY_X_GET_Y" ? null : (input.value ?? null),
    buyQty: input.type === "BUY_X_GET_Y" ? input.buyQty : null,
    getQty: input.type === "BUY_X_GET_Y" ? input.getQty : null,
    minSubtotal: input.minSubtotal ?? null,
    appliesTo: input.appliesTo ?? "ALL",
    collectionIds: input.collectionIds ?? [],
    productIds: input.productIds ?? [],
    eligibility: input.eligibility ?? "ANYONE",
    usageLimit: input.usageLimit ?? null,
    perCustomerLimit: input.perCustomerLimit ?? null,
    startsAt: input.startsAt ?? new Date(),
    endsAt: input.endsAt ?? null,
    active: input.active ?? true,
    source: input.source ?? "MANUAL",
  };
}

export async function createDiscount(storeId: string, input: DiscountInput) {
  const code = check(input);
  const clash = await prisma.shopDiscount.findUnique({
    where: { storeId_code: { storeId, code } },
  });
  if (clash) throw new ShopError("CONFLICT", "That code already exists");
  return prisma.shopDiscount.create({ data: { ...toData(input, code), storeId } });
}

export async function updateDiscount(storeId: string, id: string, input: DiscountInput) {
  const code = check(input);
  const clash = await prisma.shopDiscount.findFirst({
    where: { storeId, code, NOT: { id } },
    select: { id: true },
  });
  if (clash) throw new ShopError("CONFLICT", "That code already exists");
  const { count } = await prisma.shopDiscount.updateMany({
    where: { id, storeId },
    data: toData(input, code),
  });
  if (!count) throw notFound("Coupon");
  return prisma.shopDiscount.findUniqueOrThrow({ where: { id } });
}

export async function deleteDiscount(storeId: string, id: string) {
  // A code that was used keeps its history; it is switched off instead.
  const used = await prisma.shopDiscountRedemption.count({ where: { discountId: id } });
  if (used) {
    const { count } = await prisma.shopDiscount.updateMany({
      where: { id, storeId },
      data: { active: false },
    });
    if (!count) throw notFound("Coupon");
    return { archived: true };
  }
  const { count } = await prisma.shopDiscount.deleteMany({ where: { id, storeId } });
  if (!count) throw notFound("Coupon");
  return { archived: false };
}

export function discountState(d: ShopDiscount, now = new Date()) {
  if (!d.active) return "OFF" as const;
  if (d.startsAt > now) return "SCHEDULED" as const;
  if (d.endsAt && d.endsAt <= now) return "ENDED" as const;
  if (d.usageLimit !== null && d.usedCount >= d.usageLimit) return "USED_UP" as const;
  if (d.endsAt && d.endsAt.getTime() - now.getTime() < 3 * 86_400_000) return "ENDS_SOON" as const;
  return "ACTIVE" as const;
}

export async function listDiscounts(storeId: string) {
  const discounts = await prisma.shopDiscount.findMany({
    where: { storeId },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
  });
  const revenue = await prisma.shopDiscountRedemption.findMany({
    where: { discountId: { in: discounts.map((d) => d.id) }, order: { paymentStatus: "PAID" } },
    select: { discountId: true, order: { select: { total: true } } },
  });
  const byDiscount = new Map<string, number>();
  for (const r of revenue)
    byDiscount.set(r.discountId, (byDiscount.get(r.discountId) ?? 0) + toNumber(r.order.total));
  return discounts.map((d) => ({
    ...d,
    state: discountState(d),
    revenue: Math.round((byDiscount.get(d.id) ?? 0) * 100) / 100,
  }));
}

export function ruleOf(d: ShopDiscount): { rule: DiscountRule; scope: DiscountScope } {
  const scope: DiscountScope = {
    appliesTo: (d.appliesTo as DiscountScope["appliesTo"]) ?? "ALL",
    collectionIds: d.collectionIds,
    productIds: d.productIds,
  };
  switch (d.type) {
    case "PERCENTAGE":
      return { rule: { type: "PERCENTAGE", value: toNumber(d.value) }, scope };
    case "FIXED":
      return { rule: { type: "FIXED", value: toNumber(d.value) }, scope };
    case "FREE_SHIPPING":
      return {
        rule: { type: "FREE_SHIPPING", cap: d.value === null ? null : toNumber(d.value) },
        scope,
      };
    case "BUY_X_GET_Y":
      return { rule: { type: "BUY_X_GET_Y", buyQty: d.buyQty ?? 1, getQty: d.getQty ?? 1 }, scope };
  }
}

/**
 * Looks a code up for a cart and says whether it applies. Messages are written for the
 * customer, since the hosted checkout and the chat show them as they are.
 */
export async function resolveDiscount(
  storeId: string,
  rawCode: string,
  ctx: { subtotal: number; contactId?: string | null; orderId?: string },
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const code = normaliseCode(rawCode);
  const d = await db.shopDiscount.findUnique({ where: { storeId_code: { storeId, code } } });
  const invalid = (msg: string) => new ShopError("DISCOUNT_INVALID", msg);
  if (!d) throw invalid("That code doesn't exist");
  const state = discountState(d);
  if (state === "OFF" || state === "ENDED") throw invalid("That code has expired");
  if (state === "SCHEDULED") throw invalid("That code isn't active yet");
  if (state === "USED_UP") throw invalid("That code has been fully used");
  if (d.minSubtotal !== null && ctx.subtotal < toNumber(d.minSubtotal))
    throw invalid(`That code needs an order of at least ${toNumber(d.minSubtotal).toFixed(2)}`);

  if (d.eligibility !== "ANYONE" || d.perCustomerLimit !== null) {
    if (!ctx.contactId) throw invalid("Sign in through the chat to use that code");
    if (d.eligibility === "FIRST_ORDER") {
      const previous = await db.shopOrder.count({
        where: {
          storeId,
          contactId: ctx.contactId,
          status: { in: ["OPEN", "COMPLETED"] },
          ...(ctx.orderId ? { NOT: { id: ctx.orderId } } : {}),
        },
      });
      if (previous) throw invalid("That code is for first orders only");
    }
    if (d.eligibility === "LOYALTY_MEMBERS") {
      const member = await db.customerLoyaltyAccount.count({
        where: { contactId: ctx.contactId, status: "active" },
      });
      if (!member) throw invalid("That code is for loyalty members");
    }
    if (d.perCustomerLimit !== null) {
      const used = await db.shopDiscountRedemption.count({
        where: {
          discountId: d.id,
          contactId: ctx.contactId,
          ...(ctx.orderId ? { NOT: { orderId: ctx.orderId } } : {}),
        },
      });
      if (used >= d.perCustomerLimit) throw invalid("You've already used that code");
    }
  }
  return { discount: d, ...ruleOf(d) };
}

/** Records the use when an order is placed. Counted inside the order's transaction. */
export async function redeemDiscount(
  tx: Prisma.TransactionClient,
  discountId: string,
  orderId: string,
  contactId: string | null,
  amount: number,
) {
  const already = await tx.shopDiscountRedemption.findUnique({
    where: { discountId_orderId: { discountId, orderId } },
  });
  if (already) return;
  // Conditional, so the last use of a limited code goes to one order only.
  const discount = await tx.shopDiscount.findUniqueOrThrow({ where: { id: discountId } });
  const { count } = await tx.shopDiscount.updateMany({
    where: {
      id: discountId,
      ...(discount.usageLimit !== null ? { usedCount: { lt: discount.usageLimit } } : {}),
    },
    data: { usedCount: { increment: 1 } },
  });
  if (!count) throw new ShopError("DISCOUNT_INVALID", "That code has just been fully used");
  await tx.shopDiscountRedemption.create({ data: { discountId, orderId, contactId, amount } });
}

export async function releaseDiscount(tx: Prisma.TransactionClient, orderId: string) {
  const rows = await tx.shopDiscountRedemption.findMany({ where: { orderId } });
  for (const r of rows) {
    await tx.shopDiscountRedemption.delete({ where: { id: r.id } });
    await tx.shopDiscount.update({
      where: { id: r.discountId },
      data: { usedCount: { decrement: 1 } },
    });
  }
}
