import { log } from "../../../utils/logger.js";
import { ShopifyEvents } from "../../../types/enums.js";
import { awardPoints } from "../../loyalty/accounts/account.service.js";
import { resolveProgramMember } from "../../loyalty/accounts/memberLookup.js";
import { reversePurchasePoints } from "../../loyalty/accounts/pointsReversal.service.js";
import { getLoyaltyProgramByOrg } from "../../loyalty/program/program.service.js";
import { applyRedemption } from "../../loyalty/redemptions/redemption.service.js";
import { LoyaltyError } from "../../loyalty/loyalty.errors.js";
import { shopifyLoyaltyQueue } from "../../../workers/bullmq/queues/webhook.queue.js";
import type { ShopifyBody } from "./shopify.types.js";

/**
 * Loyalty points for Shopify orders.
 *
 * Lifted out of `shopify.service.ts`, where it was ~140 lines of hand-written Prisma
 * writes inside one swallowing try/catch. The decisions now live in the loyalty module
 * (`awardPoints`, `reversePurchasePoints`, `resolveProgramMember`) and this file is only
 * about getting facts out of a Shopify payload and onto a queue.
 */

export interface ShopifyLoyaltyJobData {
  shop: string;
  topic: ShopifyEvents;
  orgId: string;
  orderId: string;
  phone: string | null;
  email: string | null;
  amount: number | null;
  /** Codes applied at checkout; a RateUp voucher among them is marked used. */
  discountCodes?: string[];
}

export type ShopifyLoyaltyOutcome =
  | "awarded"
  | "duplicate"
  | "reversed"
  | "already_reversed"
  | "no_original"
  | "no_match"
  | "ambiguous_email"
  | "program_off"
  | "no_amount"
  | "ignored";

export interface ShopifyOrderIdentity {
  orderId: string | null;
  /** Raw, un-normalised — the resolver parses it against the programme's country. */
  phone: string | null;
  email: string | null;
}

/** Shopify puts the customer's number in any of five places, depending on how they checked out. */
export function extractOrderIdentity(body: ShopifyBody): ShopifyOrderIdentity {
  const b = body as unknown as Record<string, any>;
  const phone =
    b?.customer?.phone ||
    b?.customer?.default_address?.phone ||
    b?.billing_address?.phone ||
    b?.shipping_address?.phone ||
    b?.phone ||
    null;

  // Email is the one Shopify actually insists on at checkout, and the old bridge ignored
  // it entirely — which is why orders from customers who never gave a phone number
  // silently earned nothing.
  const email = b?.customer?.email || b?.email || b?.contact_email || null;

  return { orderId: b?.id != null ? String(b.id) : null, phone, email };
}

/** The discount codes a customer applied at checkout, as typed. */
export function extractDiscountCodes(body: ShopifyBody): string[] {
  const codes = (body as unknown as { discount_codes?: { code?: unknown }[] | null })
    .discount_codes;
  return (codes ?? [])
    .map((c) => (typeof c?.code === "string" ? c.code.trim() : ""))
    .filter(Boolean);
}

/**
 * Topics on which an order has actually consumed its discount codes. A code is
 * spent when the order is placed, so paid or not; ORDERS_PAID repeats it for a
 * shop that only subscribes to that topic.
 */
const REDEEMING_TOPICS = new Set<string>([ShopifyEvents.ORDERS_CREATE, ShopifyEvents.ORDERS_PAID]);

/**
 * Marks the RateUp vouchers used on this order as used, the same way a cashier's
 * "Mark as used" does. Codes that aren't RateUp vouchers, or were already marked
 * (the other topic got there first), are skipped. Never throws: a voucher problem
 * must not cost the customer their points or retry the whole job.
 */
async function useOrderVouchers(job: ShopifyLoyaltyJobData) {
  if (!REDEEMING_TOPICS.has(job.topic)) return;
  for (const code of job.discountCodes ?? []) {
    try {
      await applyRedemption(
        { redemptionCode: code, appliedBy: "shopify", notes: `Shopify order ${job.orderId}` },
        job.orgId,
      );
      log.info({ shop: job.shop, orderId: job.orderId, code }, "Voucher used at Shopify checkout");
    } catch (e) {
      if (e instanceof LoyaltyError) continue; // not ours, not approved, or already used
      log.error(
        { err: e, shop: job.shop, orderId: job.orderId, code },
        "Could not mark a Shopify-applied voucher as used",
      );
    }
  }
}

/**
 * What the customer actually paid, in the shop's own currency.
 *
 * The previous version read `total_line_items_price_set.presentment_money`, which is wrong
 * twice over: `total_line_items_price` is the price *before* discounts, so a discounted
 * order over-awarded and a 100%-off order earned full points; and `presentment_money` is
 * the buyer's currency, so a store selling internationally awarded points on USD amounts
 * against rules and tier thresholds denominated in its own.
 *
 * Returns null rather than 0 when nothing parses, so the caller can say "we could not read
 * the amount" instead of booking a zero-value purchase.
 */
export function extractPurchaseAmount(body: ShopifyBody): number | null {
  const b = body as unknown as Record<string, any>;
  const candidates = [
    b?.current_subtotal_price_set?.shop_money?.amount,
    b?.subtotal_price_set?.shop_money?.amount,
    b?.current_subtotal_price,
    b?.subtotal_price,
    b?.total_price,
  ];
  for (const c of candidates) {
    if (c === null || c === undefined) continue;
    const n = Number(c);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

/** One key per order, so a redelivery collapses onto the award it already made. */
export const awardKey = (shop: string, orderId: string) => `shopify:${shop}:${orderId}`;
export const reversalKey = (shop: string, orderId: string) => `${awardKey(shop, orderId)}:reversal`;

export async function enqueueShopifyOrderLoyalty(data: ShopifyLoyaltyJobData) {
  await shopifyLoyaltyQueue.add("order-loyalty", data, {
    // BullMQ 6 rejects a custom id containing ":" (unless it splits into exactly
    // three parts), so the separator is "-".
    jobId: `loyalty-${data.shop}-${data.topic}-${data.orderId}`,
    attempts: 5,
    backoff: { type: "exponential", delay: 10_000 },
    removeOnComplete: { count: 5000 },
    removeOnFail: false,
  });
}

/**
 * Award or reverse, for one order event.
 *
 * No try/catch: the worker classifies what comes out of here and decides whether a retry
 * could help. The old version swallowed everything into a log line, so a shop whose points
 * stopped working had nothing to look at.
 */
export async function processShopifyOrderLoyalty(
  job: ShopifyLoyaltyJobData,
): Promise<ShopifyLoyaltyOutcome> {
  const { shop, topic, orgId, orderId } = job;

  // Independent of the points switch below: a voucher is spent whether or not
  // orders earn points.
  await useOrderVouchers(job);

  const program = await getLoyaltyProgramByOrg(orgId);
  if (!program || program.status !== "active" || !program.enableShopifyOrderPoints) {
    return finish(job, "program_off", {});
  }

  const match = await resolveProgramMember({
    programId: program.id,
    orgId,
    defaultCountryCode: program.defaultCountryCode,
    phone: job.phone,
    email: job.email,
  });

  if (match.status === "ambiguous") {
    // Several active members share this address and nothing singles one out. Points are
    // money-equivalent; crediting the wrong person is worse than crediting nobody, and
    // unlike a miss it cannot be spotted later. The shop resolves it by merging contacts.
    return finish(job, "ambiguous_email", { candidates: match.candidateAccountIds.length });
  }
  if (match.status !== "matched") {
    return finish(job, "no_match", { reason: match.reason });
  }

  const account = match.account;

  if (topic === ShopifyEvents.ORDERS_PAID) {
    if (job.amount === null) {
      return finish(job, "no_amount", { accountId: account.id });
    }

    const result = await awardPoints(program.id, account.contactId, job.amount, {
      channel: "shopify",
      orderId,
      notes: "Shopify order auto-points (paid)",
      idempotencyKey: awardKey(shop, orderId),
    });

    return finish(job, result.replayed ? "duplicate" : "awarded", {
      accountId: account.id,
      matchedBy: match.matchedBy,
      points: result.pointsAwarded,
      amount: job.amount,
    });
  }

  if (topic === ShopifyEvents.ORDERS_CANCELLED) {
    const result = await reversePurchasePoints({
      programId: program.id,
      accountId: account.id,
      originalIdempotencyKey: awardKey(shop, orderId),
      orderId,
      idempotencyKey: reversalKey(shop, orderId),
      source: "order_cancelled",
      reason: "Shopify order cancelled",
      orgId,
    });

    return finish(
      job,
      result.status === "reversed"
        ? "reversed"
        : result.status === "already_reversed"
          ? "already_reversed"
          : "no_original",
      { accountId: account.id, matchedBy: match.matchedBy },
    );
  }

  // FULFILLMENT_ORDERS_CANCELLED deliberately does not reverse. It means a *fulfillment
  // request* was cancelled — the warehouse job — not the order, and it is routinely
  // re-fulfilled moments later. Taking points off a customer who paid and kept their goods
  // would be wrong, and nothing here would ever give them back.
  return finish(job, "ignored", {});
}

/** One log line per terminal path, one shape, so "how many paid orders award points?" is answerable. */
function finish(
  job: ShopifyLoyaltyJobData,
  outcome: ShopifyLoyaltyOutcome,
  extra: Record<string, unknown>,
): ShopifyLoyaltyOutcome {
  log.info(
    { shop: job.shop, topic: job.topic, orderId: job.orderId, orgId: job.orgId, outcome, ...extra },
    "Shopify loyalty bridge",
  );
  return outcome;
}
