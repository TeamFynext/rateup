import { log } from "../../../utils/logger.js";
import { awardPoints } from "../../loyalty/accounts/account.service.js";
import { resolveProgramMember } from "../../loyalty/accounts/memberLookup.js";
import { reversePurchasePoints } from "../../loyalty/accounts/pointsReversal.service.js";
import { getLoyaltyProgramByOrg } from "../../loyalty/program/program.service.js";
import { applyRedemption } from "../../loyalty/redemptions/redemption.service.js";
import { LoyaltyError } from "../../loyalty/loyalty.errors.js";
import { shopifyLoyaltyQueue } from "../../../workers/bullmq/queues/webhook.queue.js";
import type { CommerceOrderStatus, CommerceProvider } from "./commerce.types.js";

/**
 * Loyalty for store orders: points on payment (or on completion, for a store
 * whose `awardStatus` says so), reversal on cancellation or
 * refund, and RateUp vouchers marked used when they are applied at checkout.
 *
 * The decisions live in the loyalty module (`awardPoints`,
 * `reversePurchasePoints`, `resolveProgramMember`); this file maps an order's
 * status onto them. Lifted from the Shopify bridge, whose idempotency keys it
 * keeps exactly — `shopify:<shop>:<orderId>` — because the ledger already holds
 * awards under them and a reversal finds its award by that key.
 */

export interface CommerceLoyaltyJobData {
  provider: string;
  storeId: string;
  status: CommerceOrderStatus;
  /** The store's event name; part of the job id so each event is its own job. */
  eventKey: string;
  orgId: string;
  orderId: string;
  phone: string | null;
  email: string | null;
  amount: number | null;
  discountCodes?: string[];
}

export type CommerceLoyaltyOutcome =
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

/** One key per order, so a redelivery collapses onto the award it already made. */
export const commerceAwardKey = (provider: string, storeId: string, orderId: string) =>
  `${provider}:${storeId}:${orderId}`;
export const commerceReversalKey = (provider: string, storeId: string, orderId: string) =>
  `${commerceAwardKey(provider, storeId, orderId)}:reversal`;

/** Statuses on which an order has consumed its discount codes: placed, paid or not. */
const REDEEMING = new Set<CommerceOrderStatus>(["created", "paid"]);

const REVERSAL: Partial<
  Record<CommerceOrderStatus, { source: "order_cancelled" | "order_refunded"; word: string }>
> = {
  cancelled: { source: "order_cancelled", word: "cancelled" },
  refunded: { source: "order_refunded", word: "refunded" },
};

export async function enqueueCommerceOrderLoyalty(data: CommerceLoyaltyJobData) {
  // Still the queue Shopify's worker has always drained: renaming it would strand
  // any job retrying at the moment of the deploy.
  await shopifyLoyaltyQueue.add("order-loyalty", data, {
    // BullMQ 6 rejects a custom id containing ":" (unless it splits into exactly
    // three parts), so the separator is "-".
    jobId: `loyalty-${data.storeId}-${data.eventKey}-${data.orderId}`,
    attempts: 5,
    backoff: { type: "exponential", delay: 10_000 },
    removeOnComplete: { count: 5000 },
    removeOnFail: false,
  });
}

/**
 * Award or reverse, for one order event.
 *
 * No try/catch: the worker classifies what comes out of here and decides
 * whether a retry could help.
 */
export async function processCommerceOrderLoyalty(
  job: CommerceLoyaltyJobData,
  provider: Pick<CommerceProvider, "name" | "label" | "loyaltyEnabled" | "awardStatus">,
): Promise<CommerceLoyaltyOutcome> {
  const { storeId, status, orgId, orderId } = job;

  // Independent of the points switch below: a voucher is spent whether or not
  // orders earn points.
  await useOrderVouchers(job, provider.label);

  const program = await getLoyaltyProgramByOrg(orgId);
  if (
    !program ||
    program.status !== "active" ||
    !provider.loyaltyEnabled(program as unknown as Record<string, unknown>)
  ) {
    return finish(job, provider.label, "program_off", {});
  }

  const match = await resolveProgramMember({
    programId: program.id,
    orgId,
    defaultCountryCode: program.defaultCountryCode,
    phone: job.phone,
    email: job.email,
  });

  if (match.status === "ambiguous") {
    // Several active members share this address and nothing singles one out.
    // Crediting the wrong person is worse than crediting nobody.
    return finish(job, provider.label, "ambiguous_email", {
      candidates: match.candidateAccountIds.length,
    });
  }
  if (match.status !== "matched") {
    return finish(job, provider.label, "no_match", { reason: match.reason });
  }

  const account = match.account;

  const awardStatus = provider.awardStatus ?? "paid";
  if (status === awardStatus) {
    if (job.amount === null) {
      return finish(job, provider.label, "no_amount", { accountId: account.id });
    }

    const result = await awardPoints(program.id, account.contactId, job.amount, {
      channel: provider.name,
      orderId,
      notes: `${provider.label} order auto-points (${awardStatus === "fulfilled" ? "completed" : awardStatus})`,
      idempotencyKey: commerceAwardKey(provider.name, storeId, orderId),
    });

    return finish(job, provider.label, result.replayed ? "duplicate" : "awarded", {
      accountId: account.id,
      matchedBy: match.matchedBy,
      points: result.pointsAwarded,
      amount: job.amount,
    });
  }

  const reversal = REVERSAL[status];
  if (reversal) {
    const result = await reversePurchasePoints({
      programId: program.id,
      accountId: account.id,
      originalIdempotencyKey: commerceAwardKey(provider.name, storeId, orderId),
      orderId,
      idempotencyKey: commerceReversalKey(provider.name, storeId, orderId),
      source: reversal.source,
      reason: `${provider.label} order ${reversal.word}`,
      orgId,
    });

    return finish(
      job,
      provider.label,
      result.status === "reversed"
        ? "reversed"
        : result.status === "already_reversed"
          ? "already_reversed"
          : "no_original",
      { accountId: account.id, matchedBy: match.matchedBy },
    );
  }

  // A cancelled *fulfilment* deliberately does not reverse: it is the warehouse
  // job, routinely re-fulfilled moments later, and the customer paid and kept
  // their goods. Nothing here would ever give the points back.
  return finish(job, provider.label, "ignored", {});
}

/**
 * Marks the RateUp vouchers used on this order as used, the same way a
 * cashier's "Mark as used" does. Never throws: a voucher problem must not cost
 * the customer their points or retry the whole job.
 */
async function useOrderVouchers(job: CommerceLoyaltyJobData, label: string) {
  if (!REDEEMING.has(job.status)) return;
  for (const code of job.discountCodes ?? []) {
    try {
      await applyRedemption(
        { redemptionCode: code, appliedBy: job.provider, notes: `${label} order ${job.orderId}` },
        job.orgId,
      );
      log.info(
        { provider: job.provider, storeId: job.storeId, orderId: job.orderId, code },
        `Voucher used at ${label} checkout`,
      );
    } catch (e) {
      if (e instanceof LoyaltyError) continue; // not ours, not approved, or already used
      log.error(
        { err: e, provider: job.provider, storeId: job.storeId, orderId: job.orderId, code },
        `Could not mark a ${label}-applied voucher as used`,
      );
    }
  }
}

/** One log line per terminal path, one shape, so "how many paid orders award points?" is answerable. */
function finish(
  job: CommerceLoyaltyJobData,
  label: string,
  outcome: CommerceLoyaltyOutcome,
  extra: Record<string, unknown>,
): CommerceLoyaltyOutcome {
  log.info(
    {
      provider: job.provider,
      storeId: job.storeId,
      status: job.status,
      orderId: job.orderId,
      orgId: job.orgId,
      outcome,
      ...extra,
    },
    `${label} loyalty bridge`,
  );
  return outcome;
}
